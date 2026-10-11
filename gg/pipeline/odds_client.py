"""
gg.pipeline.odds_client — The Odds API ingest for NFL game lines.

This is the "step two" run.py's own docstring flagged as not-yet-built:
"no odds client exists yet." What this module does, and only this:

  1. Fetch the live NFL odds board from The Odds API.
  2. Save the raw response to data/raw/odds/ — untouched, for audit.
  3. Upsert each event into public.games (creates the row if the game
     doesn't exist yet; The Odds API's schedule IS how future-week games
     get into this database — there is no separate schedule ingest).
  4. Insert one odds_snapshots row per side per market, append-only.
  5. Track the whole call as one ingest_runs row (status/rows_written/
     quota_remaining), same audit spine every other ingest source uses.

Team matching uses the existing the_odds_api crosswalk in external_ids
(seeded in db/migrations/0002) — display_name -> team_id. No guessing,
no fuzzy matching; a name that doesn't match raises loudly rather than
silently skipping a game.

Does NOT decide anything about publishing picks. That's gate.py's job,
fed by gg.pipeline.load.load_latest_odds_snapshot() at evaluation time,
not by this module.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import requests

from gg.pipeline.load import get_connection

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_ODDS_DIR = REPO_ROOT / "data" / "raw" / "odds"

SPORT_KEY = "americanfootball_nfl"
SOURCE = "the_odds_api"

# Preference order when a game has quotes from multiple books — first
# match wins. Not "the best price": a fixed, stated preference order so
# the same book is used run over run wherever possible (comparable line
# movement), not whichever book happened to post first.
BOOK_PREFERENCE = ["draftkings", "fanduel", "betmgm", "caesars"]


@dataclass
class IngestResult:
    ingest_run_id: int
    events_seen: int
    games_upserted: int
    snapshot_rows_written: int
    errors: list


def _base_url() -> str:
    return os.environ.get("ODDS_API_BASE_URL", "https://api.the-odds-api.com/v4")


def _api_key() -> str:
    key = os.environ.get("ODDS_API_KEY")
    if not key:
        raise RuntimeError("ODDS_API_KEY not set — check .env.local")
    return key


def fetch_nfl_odds(markets: str = "spreads,totals,h2h") -> tuple[list[dict], dict]:
    """Hits The Odds API once. Returns (events, response_headers) — headers
    carry x-requests-remaining/x-requests-used, which the caller logs to
    ingest_runs.quota_remaining. Raises on a non-200; never fabricates data
    to paper over a failed call."""
    resp = requests.get(
        f"{_base_url()}/sports/{SPORT_KEY}/odds",
        params={
            "apiKey": _api_key(),
            "regions": "us",
            "markets": markets,
            "oddsFormat": "american",
            "dateFormat": "iso",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json(), dict(resp.headers)


def _save_raw(events: list[dict]) -> Path:
    RAW_ODDS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%MZ")
    path = RAW_ODDS_DIR / f"the_odds_api_nfl_{ts}.json"
    path.write_text(json.dumps(events, indent=2))
    return path


def _team_lookup(conn) -> dict[str, int]:
    """the_odds_api display_name -> team_id, from the crosswalk seeded in
    0002_seed_teams_crosswalk.sql. Not fuzzy — an exact-match dict."""
    with conn.cursor() as cur:
        cur.execute(
            "select source_id, entity_id from public.external_ids "
            "where source = %s and entity_type = 'team'",
            (SOURCE,),
        )
        return {row[0]: row[1] for row in cur.fetchall()}


def _upsert_game(conn, event: dict, team_lookup: dict[str, int], season: int, week: int | None) -> int:
    home_name = event["home_team"]
    away_name = event["away_team"]
    if home_name not in team_lookup:
        raise RuntimeError(f"no the_odds_api team crosswalk entry for '{home_name}'")
    if away_name not in team_lookup:
        raise RuntimeError(f"no the_odds_api team crosswalk entry for '{away_name}'")

    with conn.cursor() as cur:
        cur.execute(
            """
            insert into public.games (sport_id, season, week, home_team_id, away_team_id, game_time, status, external_id)
            values (1, %(season)s, %(week)s, %(home_team_id)s, %(away_team_id)s, %(game_time)s, 'scheduled', %(external_id)s)
            on conflict (external_id) where external_id is not null do update set
              game_time = excluded.game_time,
              week      = coalesce(public.games.week, excluded.week)
            returning id;
            """,
            {
                "season": season,
                "week": week,
                "home_team_id": team_lookup[home_name],
                "away_team_id": team_lookup[away_name],
                "game_time": event["commence_time"],
                "external_id": event["id"],
            },
        )
        return cur.fetchone()[0]


def _extract_snapshot_rows(event: dict) -> list[dict]:
    """One row per (market, side, book) from the preferred available book
    per market — not every book. Storing every book on every pull is a
    real design option (true multi-book line shopping) but out of scope
    for this pass; this module stores the same single-book-preference
    view snapshot.py already assumes when it reads it back."""
    books_by_key = {b["key"]: b for b in event.get("bookmakers", [])}
    rows = []
    for book_key in BOOK_PREFERENCE:
        book = books_by_key.get(book_key)
        if not book:
            continue
        for market in book.get("markets", []):
            for outcome in market.get("outcomes", []):
                rows.append({
                    "market": market["key"],
                    "side": outcome["name"],
                    "line": outcome.get("point"),
                    "price": outcome["price"],
                    "book": book_key,
                })
        break  # first available preferred book only, per BOOK_PREFERENCE docstring
    return rows


def _insert_snapshot_rows(conn, game_id: int, rows: list[dict], ingest_run_id: int, captured_at: datetime) -> int:
    if not rows:
        return 0
    with conn.cursor() as cur:
        for row in rows:
            cur.execute(
                """
                insert into public.odds_snapshots
                  (game_id, market, side, line, price, book, captured_at, ingest_run_id)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (game_id, market, side, book, captured_at) do nothing;
                """,
                (game_id, row["market"], row["side"], row["line"], row["price"], row["book"], captured_at, ingest_run_id),
            )
    return len(rows)


def ingest_week(season: int, week: int, before: str | None = None, dry_run: bool = False) -> IngestResult:
    """Fetch, upsert games, snapshot odds — for whatever events The Odds
    API currently returns (it only ever returns upcoming/live games).
    `before` (ISO date string) optionally caps which events count as this
    week, e.g. '2026-09-29' to exclude next week's early lines bleeding
    into the same call — same filter used ad hoc before this module
    existed. Without it, every event returned is tagged with `week`."""
    conn = get_connection()
    errors: list[str] = []
    games_upserted = 0
    snapshot_rows = 0
    captured_at = datetime.now(timezone.utc)

    with conn.cursor() as cur:
        cur.execute(
            "insert into public.ingest_runs (source, endpoint, sport, status) "
            "values (%s, %s, 'NFL', 'running') returning id;",
            (SOURCE, f"/sports/{SPORT_KEY}/odds"),
        )
        ingest_run_id = cur.fetchone()[0]
    conn.commit()

    try:
        events, headers = fetch_nfl_odds()
        _save_raw(events)
        if before:
            events = [e for e in events if e["commence_time"] < before]

        team_lookup = _team_lookup(conn)

        for event in events:
            try:
                game_id = _upsert_game(conn, event, team_lookup, season, week)
                games_upserted += 1
                rows = _extract_snapshot_rows(event)
                snapshot_rows += _insert_snapshot_rows(conn, game_id, rows, ingest_run_id, captured_at)
            except Exception as exc:
                errors.append(f"{event.get('away_team')}@{event.get('home_team')}: {type(exc).__name__}: {exc}")

        if dry_run:
            conn.rollback()
        else:
            conn.commit()

        with conn.cursor() as cur:
            cur.execute(
                "update public.ingest_runs set finished_at = now(), status = %s, "
                "rows_written = %s, quota_remaining = %s, error_text = %s where id = %s;",
                (
                    "completed" if not errors else "completed_with_errors",
                    snapshot_rows,
                    int(headers.get("x-requests-remaining", -1)),
                    "; ".join(errors) if errors else None,
                    ingest_run_id,
                ),
            )
        conn.commit()

        return IngestResult(
            ingest_run_id=ingest_run_id,
            events_seen=len(events),
            games_upserted=games_upserted,
            snapshot_rows_written=snapshot_rows,
            errors=errors,
        )
    except Exception as exc:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute(
                "update public.ingest_runs set finished_at = now(), status = 'failed', error_text = %s where id = %s;",
                (str(exc), ingest_run_id),
            )
        conn.commit()
        raise
    finally:
        conn.close()
