"""
Step 4's ingest job — adapts gg.pipeline.nfl_ratings (scripts/week1_math.py's
math, minus the CLI) into a job that WRITES nfl_team_features rows, instead
of printing them.

Opens an ingest_runs row before starting, writes one nfl_team_features row
per team, closes the ingest_runs row with rows_written/status. On failure,
the ingest_runs row is marked status='error' with the exception text before
re-raising — a row stuck in status='running' is reserved for the case this
process dies outright (crash, kill), per ingest_runs' own table comment;
an error this code catches and can describe gets a real status, not a
silent hang.

Season semantics: `season` stored on each row is the season the EPA data
comes FROM (2025 — matches nfl_team_features.epa_play_off's own column
comment, "season-to-date through through_week"), not the season/week being
predicted. The cold-start note below (CARRY-only, K has no effect) concerns
the TARGET games (2026 Week 1, zero games played), not this stored season
value.

Usage:
  python -m gg.pipeline.ingest_nfl_team_features --season 2025
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import requests
from psycopg2.extras import Json, execute_values
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from gg.pipeline.model.nfl import CARRY, K  # noqa: E402
from gg.pipeline.nfl_ratings import compute_all_ratings, fetch_play_by_play, filter_regular_season  # noqa: E402

SOURCE = "nflfastr"
SPORT = "nfl"


def _connect():
    # Explicit path, not a cwd-relative search — this must find .env.local
    # the same way regardless of where it's invoked from (CLI, cron, API).
    load_dotenv(REPO_ROOT / ".env.local")
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set — check .env.local")
    return psycopg2.connect(database_url)


def _open_ingest_run(conn, season: int) -> int:
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into public.ingest_runs (source, endpoint, sport, status)
                values (%s, %s, %s, 'running')
                returning id;
                """,
                (SOURCE, f"play_by_play_{season}", SPORT),
            )
            return cur.fetchone()[0]


def _close_ingest_run(conn, run_id: int, status: str, rows_written: int, error_text: str | None = None) -> None:
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update public.ingest_runs
                set status = %s, rows_written = %s, error_text = %s, finished_at = now()
                where id = %s;
                """,
                (status, rows_written, error_text, run_id),
            )


def _load_team_id_crosswalk(conn) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select e.source_id, e.entity_id
            from public.external_ids e
            where e.entity_type = 'team' and e.source = %s;
            """,
            (SOURCE,),
        )
        return dict(cur.fetchall())


def _write_features(conn, ratings, code_to_team_id: dict[str, int], season: int, through_week: int, run_id: int) -> int:
    as_of = datetime.now(timezone.utc)
    rows = [
        (
            code_to_team_id[r.team],
            as_of,
            season,
            through_week,
            r.epa_play_off,
            r.epa_play_def,
            r.blended_rating_pts_per_game,
            Json({
                "games_played": r.games_played,
                "plays_per_game": r.plays_per_game,
                "net_epa_per_play": r.net_epa_per_play,
                "raw_rating_pts_per_game": r.raw_rating_pts_per_game,
                "carry": CARRY,
                "k": K,
            }),
            run_id,
        )
        for r in ratings
    ]
    with conn:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                insert into public.nfl_team_features
                  (team_id, as_of, season, through_week, epa_play_off, epa_play_def,
                   rating_pts_per_game, raw, ingest_run_id)
                values %s;
                """,
                rows,
            )
    return len(rows)


def run_ingest(prior_season: int = 2025, current_season: int = 2026) -> dict:
    """The ingest job. Never raises silently — see module docstring for the
    error-handling contract.

    2026-09-28 fix: now fetches BOTH the prior season (regression anchor)
    and the current season so far (real in-season signal), instead of only
    ever fetching one season and hardcoding the current-season blend input
    to zero. See nfl_ratings.compute_all_ratings for the actual math
    change; this function just supplies it two real frames instead of one."""
    conn = _connect()
    try:
        run_id = _open_ingest_run(conn, current_season)
        try:
            prior_pbp = filter_regular_season(fetch_play_by_play(prior_season))
            try:
                current_pbp = filter_regular_season(fetch_play_by_play(current_season))
            except requests.HTTPError:
                # No release yet for a season with zero games played (e.g.
                # running this before that season's Week 1) — empty frame
                # with the same columns, so compute_team_epa_stats sees
                # games_played=0 for every team and this degrades to the
                # pure-prior cold start, same as the old hardcoded path.
                current_pbp = prior_pbp.iloc[0:0]

            teams_in_data = sorted(
                t for t in set(prior_pbp["posteam"].dropna()) | set(prior_pbp["defteam"].dropna()) if t
            )
            ratings = compute_all_ratings(prior_pbp, current_pbp, teams_in_data, CARRY, K)
            through_week = int(current_pbp["week"].max()) if len(current_pbp) else 0

            code_to_team_id = _load_team_id_crosswalk(conn)
            missing = [r.team for r in ratings if r.team not in code_to_team_id]
            if missing:
                raise RuntimeError(
                    f"nflfastr codes with no external_ids crosswalk row: {missing}"
                )

            rows_written = _write_features(conn, ratings, code_to_team_id, current_season, through_week, run_id)
            _close_ingest_run(conn, run_id, status="ok", rows_written=rows_written)
            return {
                "ingest_run_id": run_id,
                "status": "ok",
                "rows_written": rows_written,
                "teams": len(ratings),
                "through_week": through_week,
            }
        except Exception as exc:
            _close_ingest_run(conn, run_id, status="error", rows_written=0, error_text=str(exc))
            raise
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest NFL team EPA ratings into nfl_team_features")
    parser.add_argument("--prior-season", type=int, default=2025, help="Prior completed season (regression anchor)")
    parser.add_argument("--current-season", type=int, default=2026, help="Current season, blended in as it progresses")
    args = parser.parse_args()

    result = run_ingest(prior_season=args.prior_season, current_season=args.current_season)
    print(
        f"[ingest_nfl_team_features] ingest_run_id={result['ingest_run_id']} "
        f"status={result['status']} rows_written={result['rows_written']} "
        f"teams={result['teams']} through_week={result['through_week']}"
    )


if __name__ == "__main__":
    main()
