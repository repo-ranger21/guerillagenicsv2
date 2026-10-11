"""
gg.pipeline.run — run_for_date() / run_for_week(), the orchestrator.

The functions the CLI (gg.cli) and the API (api/routes/pipeline.py) call
— same code path either way, so what's tested at 11pm Saturday is what
runs at 9am Sunday. Always returns a PipelineResult, never None.

Step 6 (the original hardcoded-SEA vertical slice) is DONE — this
version replaces it. The market is no longer hardcoded: every game now
reads its real spread from gg.pipeline.load.load_latest_odds_snapshot(),
fed by gg.pipeline.odds_client.ingest_week(). A game with no odds
snapshot yet is a skip with a reason, same as a game with no team
features — never a fabricated line.

Side selection is market-neutral: this module does not assume which
team to bet. It evaluates the home team's probability of covering the
actual home-perspective market line, derives the away side as its
complement, and prefers whichever side has the higher EVI — the same
question gate.py's own docstring frames as "does the model disagree
with the market, and in which direction." gate.py (MAX_DISAGREEMENT_PTS,
MAX_KELLY_PCT, MIN_EVI_PCT — all backtest-derived, see that module's
docstring) makes the publish/skip call; run.py's only job is assembling
the inputs and writing whatever gate.py decides.
"""

from __future__ import annotations

import subprocess
from dataclasses import asdict, dataclass, field
from datetime import date as date_type, datetime, timezone
from pathlib import Path

from gg.pipeline.load import (
    GameForDate,
    get_connection,
    load_games_for_date,
    load_games_for_week,
    load_latest_odds_snapshot,
    load_latest_team_features,
)
from gg.pipeline.model import gate as gate_module
from gg.pipeline.model.nfl import HFA, N, SIGMA, cover_probabilities, simulate_margin
from gg.pipeline.model.shared import evi, kelly
from gg.pipeline.snapshot import build_published_snapshot, build_skipped_snapshot
from gg.pipeline.write import upsert_pick

REPO_ROOT = Path(__file__).resolve().parents[2]

MODEL_VERSION = "nfl-spread-0.2.0"  # bumped: real odds + gate.py replace the Step 6 hardcoded market

# Manually confirmed, non-model-inferred starter changes for the CURRENT week only.
# Added by hand when the news is public and confirmed (a season-long starter is
# ruled OUT and a specific backup is confirmed starting) — never auto-detected,
# since no real starter/injury-report data source is wired into this pipeline.
# This is ANNOTATION ONLY: it appends a flag string to the published/skipped
# snapshot's `flags` field. It does NOT touch model_margin, EVI, Kelly sizing,
# or gate.py's decision — none of that math changes.
#
# Context for the flag (see shared/betting_vectors.json -> "qb_replacement"):
# teams starting a confirmed backup for an established starter (>=8 starts)
# underperformed the closing spread by a mean of -1.28 pts (SE 0.65, n=345,
# p=0.039, seasons 2021-2024) even after the market had already priced the
# change in. Real signal, marginal significance, not wired into scoring.
#
# Clear this dict at the start of each week.
KNOWN_QB_CHANGES: dict[str, str] = {
    # 2026wk4: Baker Mayfield (thumb) out 3+ weeks, rookie Jalon Daniels confirmed starting.
    # See shared/betting_vectors.json -> qb_replacement for the reference distribution
    # (mean -1.28 pts, SE 0.65, n=345). Annotation only, does not touch model_margin.
    "TB": "qb_change:daniels_for_mayfield(2026wk4)",
}


def _with_known_qb_flags(game: GameForDate, flags: tuple[str, ...]) -> tuple[str, ...]:
    extra = tuple(
        KNOWN_QB_CHANGES[abbr]
        for abbr in (game.home_abbreviation, game.away_abbreviation)
        if abbr in KNOWN_QB_CHANGES
    )
    return tuple(flags) + extra


@dataclass
class PipelineResult:
    run_id: int
    evaluated: int
    published: int
    skipped: int
    errors: list = field(default_factory=list)
    snapshots: list = field(default_factory=list)


def _get_git_sha() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=5, check=True,
        )
        return result.stdout.strip()
    except Exception:
        return None  # metadata nicety, not worth failing the run over


def _open_model_run(conn, model_version: str, git_sha: str | None, sport: str) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "insert into public.model_runs (model_version, git_sha, sport) values (%s, %s, %s) returning id;",
            (model_version, git_sha, sport),
        )
        run_id = cur.fetchone()[0]
    conn.commit()
    return run_id


def _close_model_run(conn, run_id: int, games_evaluated: int, picks_published: int, picks_skipped: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update public.model_runs
            set games_evaluated = %s, picks_published = %s, picks_skipped = %s
            where id = %s;
            """,
            (games_evaluated, picks_published, picks_skipped, run_id),
        )
    conn.commit()


def _evaluate_game(conn, game: GameForDate, game_date: date_type, evaluated_at: datetime, dry_run: bool, model_run_id: int) -> tuple[dict, str]:
    """One game -> (write_result_dict, 'published'|'skipped'). Shared by
    run_for_date and run_for_week so there is exactly one evaluation path,
    not two copies that can drift."""
    label = f"{game.away_abbreviation}@{game.home_abbreviation}"

    home_features = load_latest_team_features(conn, game.home_team_id, as_of_cutoff=game.game_time)
    away_features = load_latest_team_features(conn, game.away_team_id, as_of_cutoff=game.game_time)

    if home_features is None or away_features is None:
        missing = game.home_abbreviation if home_features is None else game.away_abbreviation
        snap = build_skipped_snapshot(
            game=game, game_date=game_date, logged_at=evaluated_at,
            bet_team=game.home_abbreviation, spread=0.0, odds=-110,
            status="skipped_missing_data",
            skip_reason=f"no nfl_team_features row for {missing} as of {game.game_time.isoformat()}",
        )
        result = upsert_pick(conn, snap, model_run_id, dry_run)
        return {**asdict(snap), **result}, "skipped"

    odds_rows = load_latest_odds_snapshot(conn, game.game_id, market="spreads")
    home_row = next((r for r in odds_rows if r.side == game.home_full_name), None)
    away_row = next((r for r in odds_rows if r.side == game.away_full_name), None)

    if home_row is None or away_row is None or home_row.line is None:
        snap = build_skipped_snapshot(
            game=game, game_date=game_date, logged_at=evaluated_at,
            bet_team=game.home_abbreviation, spread=0.0, odds=-110,
            status="skipped_missing_data",
            skip_reason=f"no spreads odds_snapshot for game_id={game.game_id} — run odds_client.ingest_week first",
        )
        result = upsert_pick(conn, snap, model_run_id, dry_run)
        return {**asdict(snap), **result}, "skipped"

    home_line = float(home_row.line)
    home_price = home_row.price
    away_price = away_row.price
    book = home_row.book
    odds_age_minutes = max(0.0, (evaluated_at - home_row.captured_at).total_seconds() / 60.0)

    bet_rating = float(home_features.rating_pts_per_game)
    opp_rating = float(away_features.rating_pts_per_game)
    model_margin_home = (bet_rating - opp_rating) + HFA

    margins = simulate_margin(model_margin_home, SIGMA, N, seed=game.game_id)
    home_win, push, home_loss = cover_probabilities(margins, home_line)
    away_win, away_loss = home_loss, home_win  # complements — push is shared, see model docstring

    home_evi = evi(home_win, push, home_loss, home_price)
    away_evi = evi(away_win, push, away_loss, away_price)

    if home_evi >= away_evi:
        bet_team, opp_team = game.home_abbreviation, game.away_abbreviation
        bet_team_is_home = True
        win, loss, price = home_win, home_loss, home_price
        spread = home_line
        chosen_evi = home_evi
    else:
        bet_team, opp_team = game.away_abbreviation, game.home_abbreviation
        bet_team_is_home = False
        win, loss, price = away_win, away_loss, away_price
        spread = -home_line
        chosen_evi = away_evi

    kelly_full_value = kelly(win, push, loss, price, fraction=1.0)
    kelly_fractional_value = kelly(win, push, loss, price, fraction=0.5)

    # gate.py's docstring requires model_margin/market_line in the SAME
    # convention: "positive = home favored." model_margin_home already is
    # (home_rating - away_rating + HFA). home_line is the raw odds-feed
    # spread, which is bet-signed the opposite way (negative = home
    # favored, e.g. -11.5 for an 11.5-pt home favorite). Negating it here
    # converts to "positive = home favored" so the two inputs actually
    # agree before gate() diffs them.
    #
    # Bug found 2026-10-04: this was passing home_line unnegated, so every
    # gap gate() ever computed was effectively |model_margin_home -
    # (-true_home_favored_line)| = roughly model_margin_home + market_line
    # instead of the difference. Re-checked against 2026 wk4's slate:
    # 5 of 8 games' publish/skip decision flips once this is corrected
    # (NE@BUF, NYJ@CHI, TEN@BAL, DAL@HOU go from skip->publish; JAX@CIN
    # goes from publish->skip). See Notes & Fixes tab, Pick Log workbook,
    # for the worked numbers. This does not change MAX_DISAGREEMENT_PTS
    # itself -- no backtest script validating that 7.0 cap was found in
    # this repo, so the cap's own calibration is still unverified; only
    # the gap formula's internal consistency is fixed here.
    decision = gate_module.gate(
        model_margin=model_margin_home,
        market_line=-home_line,
        evi_pct=chosen_evi,
        kelly_pct=kelly_fractional_value,
        has_features=True,
        odds_age_minutes=odds_age_minutes,
    )

    line_signal = {
        "home_line": home_line,
        "home_price": home_price,
        "away_price": away_price,
        "book": book,
        "captured_at": home_row.captured_at.isoformat(),
        "odds_age_minutes": round(odds_age_minutes, 1),
    }

    # bet_rating/opp_rating above are always (home, away) -- bet_team is
    # whichever side gate.py actually chose, which can be either. Swap
    # here so the snapshot's components/driver_text describe the team
    # that was actually picked, not always the home team. (Bug found
    # 2026-10-04: every away-team pick's driver_text was reporting the
    # home team's rating delta under the away team's name.)
    snap_bet_rating, snap_opp_rating = (
        (bet_rating, opp_rating) if bet_team_is_home else (opp_rating, bet_rating)
    )

    if decision.status == "published":
        snap = build_published_snapshot(
            game=game, game_date=game_date, logged_at=evaluated_at,
            bet_team=bet_team, opp_team=opp_team,
            bet_rating=snap_bet_rating, opp_rating=snap_opp_rating, bet_team_is_home=bet_team_is_home,
            spread=spread, odds=price, book=book,
            model_prob=win, push_prob=push, loss_prob=loss,
            evi_value=chosen_evi, kelly_full_value=kelly_full_value,
            kelly_fractional_value=decision.kelly_pct,  # post gate.py cap
            home_features=home_features, away_features=away_features,
            extra_flags=_with_known_qb_flags(game, decision.flags), line_signal=line_signal,
        )
        result = upsert_pick(conn, snap, model_run_id, dry_run)
        return {**asdict(snap), **result}, "published"
    else:
        snap = build_skipped_snapshot(
            game=game, game_date=game_date, logged_at=evaluated_at,
            bet_team=bet_team, spread=spread, odds=price,
            status=decision.status, skip_reason=decision.skip_reason,
            extra_flags=_with_known_qb_flags(game, decision.flags),
        )
        result = upsert_pick(conn, snap, model_run_id, dry_run)
        return {**asdict(snap), **result}, "skipped"


def _run(games: list[GameForDate], game_date: date_type, dry_run: bool) -> PipelineResult:
    conn = get_connection()
    try:
        model_run_id = _open_model_run(conn, MODEL_VERSION, _get_git_sha(), sport="nfl")

        evaluated = 0
        published = 0
        skipped = 0
        errors: list[str] = []
        snapshots: list[dict] = []
        evaluated_at = datetime.now(timezone.utc)

        for game in games:
            evaluated += 1
            label = f"{game.away_abbreviation}@{game.home_abbreviation}"
            try:
                snap_dict, outcome = _evaluate_game(conn, game, game_date, evaluated_at, dry_run, model_run_id)
                snapshots.append(snap_dict)
                if outcome == "published":
                    published += 1
                else:
                    skipped += 1
            except Exception as exc:
                errors.append(f"{label}: {type(exc).__name__}: {exc}")

        _close_model_run(conn, model_run_id, evaluated, published, skipped)
        return PipelineResult(
            run_id=model_run_id, evaluated=evaluated, published=published, skipped=skipped,
            errors=errors, snapshots=snapshots,
        )
    finally:
        conn.close()


def run_for_date(game_date: date_type, dry_run: bool = False, sport_id: int = 1) -> PipelineResult:
    conn = get_connection()
    try:
        games = load_games_for_date(conn, game_date, sport_id=sport_id)
    finally:
        conn.close()
    return _run(games, game_date, dry_run)


def run_for_week(season: int, week: int, dry_run: bool = False, sport_id: int = 1) -> PipelineResult:
    """Same evaluation path as run_for_date, for every game tagged
    (season, week) — what odds_client.ingest_week() populates. Each row's
    game_date is that game's own ET kickoff date (not one shared date),
    since a week spans multiple days (Thu/Sun/Mon)."""
    from zoneinfo import ZoneInfo
    ET = ZoneInfo("America/New_York")

    conn = get_connection()
    try:
        games = load_games_for_week(conn, season, week, sport_id=sport_id)
        model_run_id = _open_model_run(conn, MODEL_VERSION, _get_git_sha(), sport="nfl")

        evaluated = 0
        published = 0
        skipped = 0
        errors: list[str] = []
        snapshots: list[dict] = []
        evaluated_at = datetime.now(timezone.utc)

        for game in games:
            evaluated += 1
            label = f"{game.away_abbreviation}@{game.home_abbreviation}"
            game_date = game.game_time.astimezone(ET).date()
            try:
                snap_dict, outcome = _evaluate_game(conn, game, game_date, evaluated_at, dry_run, model_run_id)
                snapshots.append(snap_dict)
                if outcome == "published":
                    published += 1
                else:
                    skipped += 1
            except Exception as exc:
                errors.append(f"{label}: {type(exc).__name__}: {exc}")

        _close_model_run(conn, model_run_id, evaluated, published, skipped)
        return PipelineResult(
            run_id=model_run_id, evaluated=evaluated, published=published, skipped=skipped,
            errors=errors, snapshots=snapshots,
        )
    finally:
        conn.close()
