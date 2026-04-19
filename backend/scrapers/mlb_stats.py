"""
statsapi.mlb.com scraper — MLB team and player stats.
"""

import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.logger import get_logger

logger = get_logger(__name__)

MLB_BASE = "https://statsapi.mlb.com/api/v1"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _get(endpoint: str, params: dict | None = None) -> dict:
    resp = requests.get(f"{MLB_BASE}{endpoint}", params=params or {}, timeout=20)
    resp.raise_for_status()
    return resp.json()


def fetch_standings(season: int = 2025, league_id: int = 103) -> list[dict]:
    data = _get("/standings", {
        "leagueId": league_id,
        "season": season,
        "standingsTypes": "regularSeason",
        "hydrate": "team,division",
    })
    teams = []
    for record in data.get("records", []):
        for tr in record.get("teamRecords", []):
            team = tr.get("team", {})
            teams.append({
                "mlb_id": str(team.get("id")),
                "abbreviation": team.get("abbreviation"),
                "full_name": team.get("name"),
                "wins": tr.get("wins", 0),
                "losses": tr.get("losses", 0),
                "win_pct": float(tr.get("winningPercentage", "0")),
                "games_behind": float(tr.get("gamesBack", "0").replace("-", "0")),
                "run_differential": tr.get("runDifferential", 0),
                "division": record.get("division", {}).get("name"),
            })
    return teams


def fetch_team_pitching(team_id: str, season: int = 2025) -> dict:
    data = _get(f"/teams/{team_id}/stats", {
        "stats": "season",
        "group": "pitching",
        "season": season,
    })
    splits = data.get("stats", [{}])[0].get("splits", [{}])
    return splits[0].get("stat", {}) if splits else {}


def fetch_team_batting(team_id: str, season: int = 2025) -> dict:
    data = _get(f"/teams/{team_id}/stats", {
        "stats": "season",
        "group": "hitting",
        "season": season,
    })
    splits = data.get("stats", [{}])[0].get("splits", [{}])
    return splits[0].get("stat", {}) if splits else {}


def fetch_schedule(team_id: str, start_date: str, end_date: str) -> list[dict]:
    data = _get("/schedule", {
        "sportId": 1,
        "teamId": team_id,
        "startDate": start_date,
        "endDate": end_date,
        "hydrate": "team,linescore",
    })
    games = []
    for date_entry in data.get("dates", []):
        for game in date_entry.get("games", []):
            home = game.get("teams", {}).get("home", {})
            away = game.get("teams", {}).get("away", {})
            games.append({
                "game_pk": game.get("gamePk"),
                "game_date": game.get("gameDate"),
                "home_team_id": str(home.get("team", {}).get("id")),
                "away_team_id": str(away.get("team", {}).get("id")),
                "home_score": home.get("score", 0),
                "away_score": away.get("score", 0),
                "status": game.get("status", {}).get("detailedState"),
            })
    return games


def fetch_roster(team_id: str, season: int = 2025) -> list[dict]:
    data = _get(f"/teams/{team_id}/roster", {"rosterType": "40Man", "season": season})
    return [
        {
            "mlb_player_id": str(p.get("person", {}).get("id")),
            "full_name": p.get("person", {}).get("fullName"),
            "position": p.get("position", {}).get("abbreviation"),
            "jersey_number": p.get("jerseyNumber"),
        }
        for p in data.get("roster", [])
    ]
