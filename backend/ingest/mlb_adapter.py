"""MLB model_prob adapter.

Bridges MLB pipeline data (standings → Elo ratings, schedule → game candidates)
to the shape build_pick_row expects. This is the seam between the futures-only
pipeline and the game-pick producer.

ODDS GAP: The Odds API integration was removed (commit 0c927cb) and no odds
scraper remains in the codebase. `odds_by_slug` MUST be provided by the caller
from an external source; without it this adapter returns zero candidates. When
odds become available (new Odds API key, ESPN odds endpoint, etc.) pass them in
here — nothing else needs to change.

Entry points:
    adapt_mlb_games()     — pure transform, testable with fixture data
    generate_mlb_picks()  — fetches live schedule + standings, then adapts
"""

from __future__ import annotations

import math
from datetime import date as date_cls, timedelta
from typing import Any

import requests

from formulas.monte_carlo import win_probability
from utils.logger import get_logger

logger = get_logger(__name__)

MLB_BASE = "https://statsapi.mlb.com/api/v1"
MLB_LEAGUE_AVG_RUNS = 4.5  # historical MLB average runs per team per game


# ─── schedule fetch ───────────────────────────────────────────────────────────

def fetch_games_for_date(game_date: str) -> list[dict[str, Any]]:
    """Return all MLB games scheduled for game_date (YYYY-MM-DD).

    Uses the MLB Stats API schedule endpoint directly (all teams, one date)
    rather than the per-team fetch_schedule() in mlb_stats.py.
    """
    try:
        resp = requests.get(
            f"{MLB_BASE}/schedule",
            params={"sportId": 1, "date": game_date, "hydrate": "team,linescore"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("mlb_schedule_fetch_failed", date=game_date, error=str(exc))
        return []

    games = []
    for date_entry in data.get("dates", []):
        for game in date_entry.get("games", []):
            home = game.get("teams", {}).get("home", {}).get("team", {})
            away = game.get("teams", {}).get("away", {}).get("team", {})
            status = game.get("status", {}).get("abstractGameState", "")
            if status in ("Final",):
                continue  # skip completed games
            games.append({
                "game_pk": game.get("gamePk"),
                "game_date": game_date,
                "home_id": str(home.get("id", "")),
                "home_abbr": home.get("abbreviation", ""),
                "home_name": home.get("name", ""),
                "away_id": str(away.get("id", "")),
                "away_abbr": away.get("abbreviation", ""),
                "away_name": away.get("name", ""),
                "game_time": game.get("gameDate", ""),
            })
    return games


def fetch_team_elos() -> dict[str, float]:
    """Return {team_name: elo_rating} from current AL+NL standings.

    Elo is derived from win% and run differential — the same formula as
    mlb_pipeline.py — so the ratings are consistent across the stack.
    """
    elo_map: dict[str, float] = {}
    try:
        for league_id in (103, 104):  # AL, NL
            resp = requests.get(
                f"{MLB_BASE}/standings",
                params={
                    "leagueId": league_id,
                    "season": date_cls.today().year,
                    "standingsTypes": "regularSeason",
                    "hydrate": "team",
                },
                timeout=20,
            )
            resp.raise_for_status()
            for record in resp.json().get("records", []):
                for tr in record.get("teamRecords", []):
                    team = tr.get("team", {})
                    wins = tr.get("wins", 0)
                    losses = tr.get("losses", 0)
                    win_pct = wins / max(wins + losses, 1)
                    run_diff = tr.get("runDifferential", 0)
                    elo = 1500 + (win_pct - 0.5) * 400 + run_diff * 0.5
                    elo_map[team.get("name", "")] = round(elo, 2)
                    elo_map[team.get("abbreviation", "")] = round(elo, 2)
    except Exception as exc:
        logger.warning("mlb_elo_fetch_failed", error=str(exc))
    return elo_map


# ─── core adapter ────────────────────────────────────────────────────────────

def adapt_mlb_games(
    game_candidates: list[dict[str, Any]],
    elo_map: dict[str, float],
    odds_by_slug: dict[str, int],
) -> list[dict[str, Any]]:
    """Shape MLB game candidates into build_pick_row input.

    Args:
        game_candidates: list of game dicts from fetch_games_for_date().
        elo_map:         {team_name_or_abbr: elo_rating} from fetch_team_elos().
        odds_by_slug:    {slug: american_odds} — REQUIRED from caller; no odds
                         source exists in the codebase (Odds API removed). Games
                         without an entry here are logged and skipped.

    Returns:
        list[dict] shaped for build_pick_row(). model_prob is from
        win_probability(home_elo, away_elo) — the Elo-based single-game
        probability, NOT the components heuristic.
    """
    if not odds_by_slug:
        logger.warning(
            "adapt_mlb_games: odds_by_slug is empty — no picks can be built. "
            "Provide sportsbook odds from an external source to proceed."
        )

    results = []
    for game in game_candidates:
        home_name = game["home_name"]
        away_name = game["away_name"]
        home_abbr = game["home_abbr"]
        away_abbr = game["away_abbr"]
        game_date = game["game_date"]

        slug = f"{away_abbr.lower()}-{home_abbr.lower()}-{game_date}"

        if slug not in odds_by_slug:
            logger.debug("adapt_mlb_games: no odds for slug %s, skipping", slug)
            continue

        odds = odds_by_slug[slug]

        # model_prob from Elo — the sim path, not the components heuristic
        home_elo = elo_map.get(home_name) or elo_map.get(home_abbr) or 1500.0
        away_elo = elo_map.get(away_name) or elo_map.get(away_abbr) or 1500.0
        model_prob = win_probability(home_elo, away_elo, a_has_home=True)

        results.append({
            "slug":      slug,
            "sport":     "mlb",
            "game":      f"{away_name} @ {home_name}",
            "pick":      f"{home_name} ML",
            "odds":      int(odds),
            "model_prob": round(model_prob, 6),
            # display / pass-through fields
            "game_time": game.get("game_time", ""),
            "components": {
                "home_elo": home_elo,
                "away_elo": away_elo,
            },
            "audit": {
                "home_abbr": home_abbr,
                "away_abbr": away_abbr,
                "game_pk": game.get("game_pk"),
            },
        })

    logger.info(
        "adapt_mlb_games",
        candidates=len(game_candidates),
        with_odds=len(odds_by_slug),
        shaped=len(results),
    )
    return results


# ─── entry point ─────────────────────────────────────────────────────────────

def generate_mlb_picks(
    target_date: date_cls | None = None,
    odds_by_slug: dict[str, int] | None = None,
) -> list[dict[str, Any]]:
    """Fetch live data and return pick candidates shaped for build_pick_row.

    Odds gap: pass odds_by_slug from your odds source. Without it, returns [].
    """
    game_date = (target_date or date_cls.today()).isoformat()
    odds_by_slug = odds_by_slug or {}

    games = fetch_games_for_date(game_date)
    logger.info("generate_mlb_picks: fetched %d scheduled games", len(games))

    elo_map = fetch_team_elos()
    logger.info("generate_mlb_picks: built elo_map for %d entries", len(elo_map))

    return adapt_mlb_games(games, elo_map, odds_by_slug)
