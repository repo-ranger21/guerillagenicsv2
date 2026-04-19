"""
ESPN NFL scraper — standings, QBR, team stats.
"""

import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.logger import get_logger

logger = get_logger(__name__)

ESPN_NFL_BASE = "https://site.api.espn.com/apis/site/v2/sports/americanfootball/nfl"
ESPN_QBR_URL = "https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/{season}/types/2/athletes/{player_id}/qbr/eventlogs"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
def _get(url: str, params: dict | None = None) -> dict:
    resp = requests.get(url, params=params or {}, timeout=20,
                        headers={"User-Agent": "GuerillaGenics/2.0"})
    resp.raise_for_status()
    return resp.json()


def fetch_nfl_standings(season: int = 2025) -> list[dict]:
    data = _get(f"{ESPN_NFL_BASE}/standings", {"season": season})
    teams = []
    for group in data.get("children", [data]):
        for entry in group.get("standings", {}).get("entries", []):
            team = entry.get("team", {})
            stats = {s["name"]: s["value"] for s in entry.get("stats", [])}
            teams.append({
                "espn_id": team.get("id"),
                "abbreviation": team.get("abbreviation"),
                "display_name": team.get("displayName"),
                "wins": int(stats.get("wins", 0)),
                "losses": int(stats.get("losses", 0)),
                "ties": int(stats.get("ties", 0)),
                "win_pct": float(stats.get("winPercent", 0)),
                "points_for": float(stats.get("pointsFor", 0)),
                "points_against": float(stats.get("pointsAgainst", 0)),
                "point_diff": float(stats.get("pointDifferential", 0)),
                "conference": group.get("name", ""),
                "sport": "nfl",
            })
    return teams


def fetch_nfl_team_stats(team_espn_id: str, season: int = 2025) -> dict:
    data = _get(f"{ESPN_NFL_BASE}/teams/{team_espn_id}/statistics", {"season": season})
    result = {"espn_id": team_espn_id}
    for cat in data.get("splits", {}).get("categories", []):
        for stat in cat.get("stats", []):
            result[stat["name"]] = stat.get("value")
    return result


def fetch_qbr(player_espn_id: str, season: int = 2025) -> dict:
    url = ESPN_QBR_URL.format(season=season, player_id=player_espn_id)
    try:
        data = _get(url)
        events = data.get("events", {}).get("items", [])
        qbr_values = [e.get("totQBR", 0) for e in events if e.get("totQBR") is not None]
        avg_qbr = sum(qbr_values) / len(qbr_values) if qbr_values else 0.0
        return {
            "espn_player_id": player_espn_id,
            "avg_qbr": round(avg_qbr, 2),
            "games": len(qbr_values),
            "qbr_values": qbr_values,
        }
    except Exception as e:
        logger.warning("qbr_fetch_failed", player=player_espn_id, error=str(e))
        return {"espn_player_id": player_espn_id, "avg_qbr": 0.0, "games": 0}


def fetch_nfl_schedule(season: int = 2025) -> list[dict]:
    data = _get(f"{ESPN_NFL_BASE}/scoreboard", {"season": season, "seasontype": 2, "week": "all"})
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
            "week": event.get("week", {}).get("number"),
            "date": event.get("date"),
            "home_team_id": home.get("team", {}).get("id"),
            "away_team_id": away.get("team", {}).get("id"),
            "home_score": int(home.get("score", 0) or 0),
            "away_score": int(away.get("score", 0) or 0),
            "status": event.get("status", {}).get("type", {}).get("name"),
            "sport": "nfl",
        })
    return games
