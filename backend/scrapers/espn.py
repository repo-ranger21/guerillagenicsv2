"""
ESPN public API scraper — standings, scores, injuries for all sports.
"""

import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.logger import get_logger

logger = get_logger(__name__)

ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports"
ESPN_CORE = "https://sports.core.api.espn.com/v2/sports"

SPORT_PATHS = {
    "nba": "basketball/nba",
    "mlb": "baseball/mlb",
    "nfl": "americanfootball/nfl",
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def _get(url: str, params: dict | None = None) -> dict:
    resp = requests.get(url, params=params or {}, timeout=20,
                        headers={"User-Agent": "GuerillaGenics/2.0"})
    resp.raise_for_status()
    return resp.json()


def fetch_standings(sport: str) -> list[dict]:
    path = SPORT_PATHS.get(sport)
    if not path:
        raise ValueError(f"Unknown sport: {sport}")
    data = _get(f"{ESPN_BASE}/{path}/standings")
    groups = data.get("children", [data])
    teams = []
    for group in groups:
        for standing in group.get("standings", {}).get("entries", []):
            team_ref = standing.get("team", {})
            stats = {s["name"]: s["value"] for s in standing.get("stats", [])}
            teams.append({
                "espn_id": team_ref.get("id"),
                "abbreviation": team_ref.get("abbreviation"),
                "display_name": team_ref.get("displayName"),
                "wins": int(stats.get("wins", 0)),
                "losses": int(stats.get("losses", 0)),
                "win_pct": float(stats.get("winPercent", 0)),
                "games_behind": float(stats.get("gamesBehind", 0)),
                "sport": sport,
            })
    return teams


def fetch_team_stats(sport: str, team_espn_id: str) -> dict:
    path = SPORT_PATHS.get(sport)
    if not path:
        raise ValueError(f"Unknown sport: {sport}")
    data = _get(f"{ESPN_BASE}/{path}/teams/{team_espn_id}/statistics")
    splits = data.get("splits", {}).get("categories", [])
    result = {"espn_id": team_espn_id}
    for cat in splits:
        for stat in cat.get("stats", []):
            result[stat["name"]] = stat.get("value")
    return result


def fetch_injuries(sport: str) -> list[dict]:
    path = SPORT_PATHS.get(sport)
    if not path:
        raise ValueError(f"Unknown sport: {sport}")
    data = _get(f"{ESPN_BASE}/{path}/injuries")
    injuries = []
    for item in data.get("injuries", []):
        player = item.get("athlete", {})
        injuries.append({
            "espn_player_id": player.get("id"),
            "player_name": player.get("fullName"),
            "team_espn_id": item.get("team", {}).get("id"),
            "status": item.get("status"),
            "description": item.get("longComment", item.get("shortComment", "")),
            "return_date": item.get("returnDate"),
            "sport": sport,
        })
    return injuries


def fetch_scoreboard(sport: str) -> list[dict]:
    path = SPORT_PATHS.get(sport)
    if not path:
        raise ValueError(f"Unknown sport: {sport}")
    data = _get(f"{ESPN_BASE}/{path}/scoreboard")
    games = []
    for event in data.get("events", []):
        comp = event.get("competitions", [{}])[0]
        teams = comp.get("competitors", [])
        if len(teams) < 2:
            continue
        home = next((t for t in teams if t.get("homeAway") == "home"), teams[0])
        away = next((t for t in teams if t.get("homeAway") == "away"), teams[1])
        games.append({
            "game_id": event.get("id"),
            "date": event.get("date"),
            "home_team_id": home.get("team", {}).get("id"),
            "away_team_id": away.get("team", {}).get("id"),
            "home_score": int(home.get("score", 0) or 0),
            "away_score": int(away.get("score", 0) or 0),
            "status": event.get("status", {}).get("type", {}).get("name"),
            "sport": sport,
        })
    return games
