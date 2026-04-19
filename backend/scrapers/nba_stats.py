"""
stats.nba.com advanced stats scraper.
Uses the undocumented NBA stats API with required headers.
"""

import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.logger import get_logger

logger = get_logger(__name__)

NBA_STATS_BASE = "https://stats.nba.com/stats"

HEADERS = {
    "Host": "stats.nba.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Connection": "keep-alive",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=3, max=15))
def _get(endpoint: str, params: dict) -> dict:
    resp = requests.get(
        f"{NBA_STATS_BASE}/{endpoint}",
        params=params,
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def _parse_result_set(data: dict, idx: int = 0) -> list[dict]:
    rs = data.get("resultSets", [data.get("resultSet", {})])
    if idx >= len(rs):
        return []
    result_set = rs[idx]
    headers = result_set.get("headers", [])
    rows = result_set.get("rowSet", [])
    return [dict(zip(headers, row)) for row in rows]


def fetch_team_advanced_stats(season: str = "2024-25") -> list[dict]:
    data = _get("leaguedashteamstats", {
        "MeasureType": "Advanced",
        "PerMode": "PerGame",
        "Season": season,
        "SeasonType": "Regular Season",
        "LeagueID": "00",
    })
    return _parse_result_set(data)


def fetch_team_base_stats(season: str = "2024-25") -> list[dict]:
    data = _get("leaguedashteamstats", {
        "MeasureType": "Base",
        "PerMode": "Per100Possessions",
        "Season": season,
        "SeasonType": "Regular Season",
        "LeagueID": "00",
    })
    return _parse_result_set(data)


def fetch_player_advanced(season: str = "2024-25") -> list[dict]:
    data = _get("leaguedashplayerstats", {
        "MeasureType": "Advanced",
        "PerMode": "PerGame",
        "Season": season,
        "SeasonType": "Regular Season",
        "LeagueID": "00",
        "Qualifier": "Totals",
        "MinutesMax": "",
        "MinutesMin": "10",
    })
    return _parse_result_set(data)


def fetch_team_clutch_stats(season: str = "2024-25") -> list[dict]:
    data = _get("leaguedashteamclutch", {
        "MeasureType": "Base",
        "PerMode": "PerGame",
        "Season": season,
        "SeasonType": "Regular Season",
        "LeagueID": "00",
        "ClutchTime": "Last 5 Minutes",
        "AheadBehind": "Ahead or Behind",
        "PointDiff": "5",
    })
    return _parse_result_set(data)


def fetch_team_game_log(team_id: str, season: str = "2024-25") -> list[dict]:
    data = _get("teamgamelog", {
        "TeamID": team_id,
        "Season": season,
        "SeasonType": "Regular Season",
        "LeagueID": "00",
    })
    return _parse_result_set(data)
