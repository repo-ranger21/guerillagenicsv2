"""
The Odds API scraper — futures odds with vig removal.
"""

import os
import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.logger import get_logger
from utils.odds_converter import american_to_implied_prob, remove_vig

logger = get_logger(__name__)

BASE_URL = os.getenv("ODDS_API_BASE_URL", "https://api.the-odds-api.com/v4")

SPORT_KEYS = {
    "nba": "basketball_nba",
    "mlb": "baseball_mlb",
    "nfl": "americanfootball_nfl",
}

CHAMPIONSHIP_MARKETS = {
    "nba": "basketball_nba_championship_winner",
    "mlb": "baseball_mlb_world_series_winner",
    "nfl": "americanfootball_nfl_super_bowl_winner",
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=10))
def _get(endpoint: str, params: dict) -> dict | list:
    api_key = os.environ["ODDS_API_KEY"]
    params["apiKey"] = api_key
    resp = requests.get(f"{BASE_URL}{endpoint}", params=params,
                        timeout=int(os.getenv("SCRAPER_REQUEST_TIMEOUT", 30)))
    resp.raise_for_status()
    remaining = resp.headers.get("x-requests-remaining", "?")
    logger.info("odds_api_request", endpoint=endpoint, remaining=remaining)
    return resp.json()


def fetch_championship_odds(sport: str) -> list[dict]:
    market_key = CHAMPIONSHIP_MARKETS.get(sport)
    if not market_key:
        raise ValueError(f"Unknown sport: {sport}")
    data = _get(f"/sports/{market_key}/odds", {
        "regions": "us",
        "markets": "outrights",
        "oddsFormat": "american",
    })
    return _parse_outrights(data, sport)


def _parse_outrights(data: list[dict], sport: str) -> list[dict]:
    results = []
    for event in data:
        bookmaker = event.get("bookmakers", [])
        for book in bookmaker:
            for market in book.get("markets", []):
                if market.get("key") != "outrights":
                    continue
                for outcome in market.get("outcomes", []):
                    results.append({
                        "sport": sport,
                        "bookmaker": book["key"],
                        "team_name": outcome["name"],
                        "american_odds": int(outcome["price"]),
                        "market": "championship",
                        "last_update": book.get("last_update"),
                    })
    return results


def fetch_division_odds(sport: str) -> list[dict]:
    sport_key = SPORT_KEYS.get(sport)
    if not sport_key:
        raise ValueError(f"Unknown sport: {sport}")
    try:
        data = _get(f"/sports/{sport_key}/odds", {
            "regions": "us",
            "markets": "division_winner",
            "oddsFormat": "american",
        })
        return _parse_outrights(data, sport)
    except Exception as e:
        logger.warning("division_odds_fetch_failed", sport=sport, error=str(e))
        return []


def build_team_odds_map(raw_odds: list[dict]) -> dict[str, dict[str, list[int]]]:
    mapping: dict[str, dict[str, list[int]]] = {}
    for row in raw_odds:
        team = row["team_name"]
        book = row["bookmaker"]
        odds = row["american_odds"]
        if team not in mapping:
            mapping[team] = {}
        if book not in mapping[team]:
            mapping[team][book] = []
        mapping[team][book].append(odds)
    return mapping


def get_best_odds(team_name: str, odds_map: dict) -> tuple[int, str]:
    team_books = odds_map.get(team_name, {})
    if not team_books:
        return -10000, "none"
    best_odds = -10000
    best_book = "none"
    for book, odds_list in team_books.items():
        for o in odds_list:
            if o > best_odds:
                best_odds = o
                best_book = book
    return best_odds, best_book
