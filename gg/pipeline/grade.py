"""
gg.pipeline.grade — settle published picks into pick_results.

Three jobs, in order:
  1. fetch final scores (The Odds API /scores) and store them on games
  2. grade every published, un-graded pick whose game is final
  3. write one pick_results row per pick (the public ledger reads these)

Integrity rules, all enforced here rather than by convention:
  * TRACKING_START — nothing before NFL 2026 Week 6 is ever graded. Weeks
    1-5 were a testing phase and are not part of the record.
  * A pick logged AFTER kickoff is never graded (it was not a pre-game call).
  * Only status='published' picks count; skipped rows are not bets.
  * Flat 1-unit stake at the published odds. Kelly size is shown separately.
  * A loss needs a post-mortem (database constraint). The one written here
    is templated from stored numbers and tagged [auto]; it states the miss,
    it does not invent a reason. Edit it later with real analysis.
  * Closing line/odds are "last snapshot captured before kickoff", which is
    only as close to the close as the odds ingest cadence allows.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

import requests

from gg.pipeline.load import get_connection
from gg.pipeline.model.nfl import SIGMA
from gg.pipeline.odds_client import SOURCE, SPORT_KEY, _api_key, _base_url

# (season, week) of the first pick that counts toward the public record.
TRACKING_START = (2026, 6)


# ── pure grading math ────────────────────────────────────────────────────────


def grade_spread(bet_team_is_home: bool, spread: float, home_score: int, away_score: int) -> str:
    """'win' | 'loss' | 'push' for a spread bet.

    `spread` is the line on the bet team (KC -3.5 -> -3.5). The bet covers
    when (bet margin + spread) > 0.
    """
    bet, opp = (home_score, away_score) if bet_team_is_home else (away_score, home_score)
    result = (bet - opp) + spread
    if result > 0:
        return "win"
    if result < 0:
        return "loss"
    return "push"


def profit_units(outcome: str, odds: int) -> float:
    """Units won/lost on a flat 1-unit stake at American `odds`."""
    if outcome == "win":
        return round(odds / 100 if odds > 0 else 100 / abs(odds), 3)
    if outcome == "loss":
        return -1.0
    return 0.0  # push, void


def build_post_mortem(
    *, pick: str, bet_team: str, bet_team_is_home: bool, spread: float,
    home_score: int, away_score: int, edge_pts: float | None,
) -> str:
    bet, opp = (home_score, away_score) if bet_team_is_home else (away_score, home_score)
    margin = bet - opp
    text = f"[auto] {pick} lost. {bet_team} finished {margin:+d} (needed to beat {-spread:+.1f})."
    if edge_pts is not None:
        text += (
            f" Model expected {bet_team} {edge_pts:+.1f}; actual {margin:+d}; "
            f"miss {margin - edge_pts:+.1f} pts (one sigma = {SIGMA:.1f}). "
            "Templated from stored numbers; editorial analysis not yet added."
        )
    return text


def parse_completed(event: dict) -> tuple[str, int, int] | None:
    """(external_id, home_score, away_score) for a finished Odds API score
    event, else None. Scores are matched to teams by NAME, never by list
    position."""
    if not event.get("completed") or not event.get("scores"):
        return None
    by_name = {s["name"]: s["score"] for s in event["scores"]}
    try:
        return event["id"], int(by_name[event["home_team"]]), int(by_name[event["away_team"]])
    except (KeyError, TypeError, ValueError):
        return None


# ── I/O ──────────────────────────────────────────────────────────────────────


def fetch_scores(days_from: int = 3) -> list[dict]:
    """The Odds API scores for games in the last `days_from` days (max 3).
    Raises on a non-200; never fabricates a score."""
    resp = requests.get(
        f"{_base_url()}/sports/{SPORT_KEY}/scores/",
        params={"apiKey": _api_key(), "daysFrom": days_from, "dateFormat": "iso"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def record_scores(conn, events: list[dict]) -> int:
    updated = 0
    with conn.cursor() as cur:
        for event in events:
            parsed = parse_completed(event)
            if parsed is None:
                continue
            external_id, home, away = parsed
            cur.execute(
                """
                update public.games
                   set home_score = %s, away_score = %s, status = 'final',
                       completed_at = coalesce(completed_at, now())
                 where external_id = %s and home_score is null;
                """,
                (home, away, external_id),
            )
            updated += cur.rowcount
    return updated


_PENDING_SQL = """
select p.id, p.pick, p.odds, p.components, p.logged_at, p.game,
       g.id as game_id, g.season, g.week, g.game_time, g.home_score, g.away_score,
       g.home_team_id, g.away_team_id
from public.picks_daily p
join public.games g on g.id = p.game_id
left join public.pick_results r on r.pick_id = p.id
where p.status = 'published'
  and p.sport = 'NFL'
  and r.id is null
  and g.home_score is not null
  and (g.season > %(season)s or (g.season = %(season)s and g.week >= %(week)s))
order by g.game_time;
"""

_CLOSING_SQL = """
select o.line, o.price
from public.odds_snapshots o
join public.external_ids x
  on x.source = %(source)s and x.entity_type = 'team' and x.source_id = o.side
where o.game_id = %(game_id)s and o.market = 'spreads'
  and x.entity_id = %(team_id)s and o.captured_at <= %(kickoff)s
order by o.captured_at desc
limit 1;
"""

_INSERT_RESULT_SQL = """
insert into public.pick_results
  (pick_id, outcome, units, closing_odds, closing_line, final_score, post_mortem)
values
  (%(pick_id)s, %(outcome)s, %(units)s, %(closing_odds)s, %(closing_line)s,
   %(final_score)s, %(post_mortem)s)
on conflict (pick_id) do nothing
returning id;
"""


@dataclass
class GradeResult:
    scores_recorded: int = 0
    graded: list = field(default_factory=list)
    skipped: list = field(default_factory=list)
    needs_review: list = field(default_factory=list)  # losses carrying an [auto] post-mortem


def grade_pending(conn, *, tracking_start: tuple[int, int] = TRACKING_START) -> GradeResult:
    import psycopg2.extras

    result = GradeResult()
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(_PENDING_SQL, {"season": tracking_start[0], "week": tracking_start[1]})
        rows = cur.fetchall()

    for row in rows:
        label = f"{row['pick']} ({row['game']})"
        if row["logged_at"] > row["game_time"]:
            result.skipped.append(f"{label}: logged after kickoff, not a pre-game pick")
            continue

        comp = row["components"] if isinstance(row["components"], dict) else json.loads(row["components"])
        is_home = bool(comp["bet_team_is_home"])
        spread = float(comp["spread"])
        outcome = grade_spread(is_home, spread, row["home_score"], row["away_score"])

        team_id = row["home_team_id"] if is_home else row["away_team_id"]
        with conn.cursor() as cur:
            cur.execute(_CLOSING_SQL, {
                "source": SOURCE, "game_id": row["game_id"], "team_id": team_id, "kickoff": row["game_time"],
            })
            closing = cur.fetchone()

        post_mortem = None
        if outcome == "loss":
            post_mortem = build_post_mortem(
                pick=row["pick"], bet_team=comp["bet_team"], bet_team_is_home=is_home, spread=spread,
                home_score=row["home_score"], away_score=row["away_score"], edge_pts=comp.get("edge_pts"),
            )

        params = {
            "pick_id": row["id"],
            "outcome": outcome,
            "units": profit_units(outcome, int(row["odds"])),
            "closing_odds": int(closing[1]) if closing else None,
            "closing_line": float(closing[0]) if closing and closing[0] is not None else None,
            "final_score": f"{row['home_score']}-{row['away_score']} (home-away)",
            "post_mortem": post_mortem,
        }
        with conn.cursor() as cur:
            cur.execute(_INSERT_RESULT_SQL, params)
            inserted = cur.fetchone() is not None
        if inserted:
            result.graded.append(f"{label}: {outcome} {params['units']:+.3f}u")
            if outcome == "loss":
                result.needs_review.append(label)
    return result


def run_grade(
    *, dry_run: bool = False, days_from: int = 3, tracking_start: tuple[int, int] = TRACKING_START,
) -> GradeResult:
    events = fetch_scores(days_from)
    conn = get_connection()
    try:
        scores = record_scores(conn, events)
        result = grade_pending(conn, tracking_start=tracking_start)
        result.scores_recorded = scores
        if dry_run:
            conn.rollback()
        else:
            conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
