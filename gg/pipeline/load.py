"""
gg.pipeline.load — reads pipeline inputs (games, team features) from the
pipeline database (Neon). Read-only: nothing in this module writes.

Every query here is a plain function taking a connection and returning
dataclasses — no ORM, no implicit global connection, no caching. run.py
owns the connection lifecycle and calls these explicitly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date as date_type, datetime
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]


def get_connection():
    # Explicit path, not a cwd-relative search — must find .env.local the
    # same way regardless of where this is invoked from (CLI, cron, API).
    load_dotenv(REPO_ROOT / ".env.local")
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set — check .env.local")
    return psycopg2.connect(database_url)


@dataclass
class GameForDate:
    game_id: int
    sport_id: int
    season: int
    week: int | None
    home_team_id: int
    home_abbreviation: str
    home_full_name: str
    away_team_id: int
    away_abbreviation: str
    away_full_name: str
    game_time: datetime


@dataclass
class TeamFeatures:
    team_id: int
    abbreviation: str
    rating_pts_per_game: float
    as_of: datetime
    epa_play_off: float | None
    epa_play_def: float | None
    ingest_run_id: int | None


def load_games_for_date(conn, game_date: date_type, sport_id: int = 1) -> list[GameForDate]:
    """Games kicking off on `game_date`, evaluated in America/New_York —
    game_time is stored as UTC, and a naive UTC date match would miss any
    evening ET kickoff (e.g. 2026-09-10 20:20 ET is 2026-09-11 00:20 UTC).
    Converting to ET before taking the date is what makes '--date
    2026-09-10' mean what a bettor means by it."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            select g.id as game_id, g.sport_id, g.season, g.week,
                   g.home_team_id, home.abbreviation as home_abbreviation, home.full_name as home_full_name,
                   g.away_team_id, away.abbreviation as away_abbreviation, away.full_name as away_full_name,
                   g.game_time
            from public.games g
            join public.teams home on home.id = g.home_team_id
            join public.teams away on away.id = g.away_team_id
            where g.sport_id = %s
              and (g.game_time at time zone 'America/New_York')::date = %s
            order by g.game_time;
            """,
            (sport_id, game_date),
        )
        return [GameForDate(**row) for row in cur.fetchall()]


def load_latest_team_features(conn, team_id: int, as_of_cutoff: datetime | None = None) -> TeamFeatures | None:
    """Most recent nfl_team_features row for a team. With as_of_cutoff set,
    restricted to as_of <= cutoff — so a pick evaluated for a Sunday game
    can never see a rating computed after that Sunday's kickoff, even if
    this function is called after the fact for debugging. Returns None if
    the team has no features yet; the caller decides whether that's a
    skip_missing_data row, not this function — load.py reads, it doesn't
    decide."""
    query = """
        select f.team_id, t.abbreviation, f.rating_pts_per_game, f.as_of,
               f.epa_play_off, f.epa_play_def, f.ingest_run_id
        from public.nfl_team_features f
        join public.teams t on t.id = f.team_id
        where f.team_id = %(team_id)s
          {cutoff_clause}
        order by f.as_of desc
        limit 1;
    """
    cutoff_clause = "and f.as_of <= %(as_of_cutoff)s" if as_of_cutoff is not None else ""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            query.format(cutoff_clause=cutoff_clause),
            {"team_id": team_id, "as_of_cutoff": as_of_cutoff},
        )
        row = cur.fetchone()
        return TeamFeatures(**row) if row else None


def load_games_for_week(conn, season: int, week: int, sport_id: int = 1) -> list[GameForDate]:
    """Same shape as load_games_for_date, for a whole week at once — what
    odds_client.ingest_week() populates. Ordered by kickoff so a --week
    run evaluates games in the order they'll actually be decided."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            select g.id as game_id, g.sport_id, g.season, g.week,
                   g.home_team_id, home.abbreviation as home_abbreviation, home.full_name as home_full_name,
                   g.away_team_id, away.abbreviation as away_abbreviation, away.full_name as away_full_name,
                   g.game_time
            from public.games g
            join public.teams home on home.id = g.home_team_id
            join public.teams away on away.id = g.away_team_id
            where g.sport_id = %s and g.season = %s and g.week = %s
            order by g.game_time;
            """,
            (sport_id, season, week),
        )
        return [GameForDate(**row) for row in cur.fetchall()]


@dataclass
class OddsSnapshot:
    game_id: int
    market: str
    side: str
    line: float | None
    price: int
    book: str
    captured_at: datetime


def load_latest_odds_snapshot(conn, game_id: int, market: str = "spreads") -> list[OddsSnapshot]:
    """Most recent captured_at for this (game_id, market) — both sides
    (home + away), from whichever single book that pull's rows came from
    (odds_client writes one book's full market per pull, see its
    BOOK_PREFERENCE docstring). Returns [] if no snapshot exists yet;
    same pattern as load_latest_team_features — this module reads, the
    caller decides what an empty result means."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            with latest as (
              select max(captured_at) as captured_at
              from public.odds_snapshots
              where game_id = %(game_id)s and market = %(market)s
            )
            select o.game_id, o.market, o.side, o.line, o.price, o.book, o.captured_at
            from public.odds_snapshots o, latest
            where o.game_id = %(game_id)s and o.market = %(market)s
              and o.captured_at = latest.captured_at;
            """,
            {"game_id": game_id, "market": market},
        )
        return [OddsSnapshot(**row) for row in cur.fetchall()]
