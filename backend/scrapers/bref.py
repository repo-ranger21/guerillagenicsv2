"""
Basketball/Baseball Reference scraper using BeautifulSoup.
Fetches historical playoff records and win shares.
"""

import requests
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.logger import get_logger

logger = get_logger(__name__)

BREF_BASE = "https://www.basketball-reference.com"
BBREF_BASE = "https://www.baseball-reference.com"

HEADERS = {"User-Agent": "GuerillaGenics Research Bot/2.0 (non-commercial research)"}


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=3, min=5, max=30))
def _get_soup(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=25)
    resp.raise_for_status()
    return BeautifulSoup(resp.content, "lxml")


def fetch_nba_playoff_history(team_abbr: str) -> dict:
    url = f"{BREF_BASE}/teams/{team_abbr.upper()}/"
    try:
        soup = _get_soup(url)
        rows = soup.select("table#franchise_years tbody tr")
        playoff_wins = playoff_losses = 0
        finals_appearances = championships = 0
        for row in rows:
            cells = {th.get("data-stat"): th.get_text(strip=True) for th in row.find_all(["td", "th"])}
            if not cells.get("season"):
                continue
            pw = cells.get("wins", "0").replace("*", "")
            pl = cells.get("losses", "0")
            if cells.get("playoffs"):
                try:
                    playoff_wins += int(pw)
                    playoff_losses += int(pl)
                except ValueError:
                    pass
            if "Champ" in cells.get("playoffs", ""):
                championships += 1
            if "Finals" in cells.get("playoffs", ""):
                finals_appearances += 1
        return {
            "team_abbr": team_abbr.upper(),
            "playoff_wins": playoff_wins,
            "playoff_losses": playoff_losses,
            "championships": championships,
            "finals_appearances": finals_appearances,
        }
    except Exception as e:
        logger.warning("bref_nba_history_failed", team=team_abbr, error=str(e))
        return {
            "team_abbr": team_abbr.upper(),
            "playoff_wins": 0, "playoff_losses": 0,
            "championships": 0, "finals_appearances": 0,
        }


def fetch_nba_win_shares(season: int = 2025) -> list[dict]:
    season_str = f"{season - 1}-{str(season)[2:]}"
    url = f"{BREF_BASE}/leagues/NBA_{season}_advanced.html"
    try:
        soup = _get_soup(url)
        table = soup.find("table", {"id": "advanced_stats"})
        if not table:
            return []
        rows = table.select("tbody tr:not(.thead)")
        players = []
        for row in rows:
            cells = {td.get("data-stat"): td.get_text(strip=True) for td in row.find_all("td")}
            if not cells.get("player") or cells.get("player") == "Player":
                continue
            players.append({
                "player_name": cells.get("player"),
                "team_abbr": cells.get("team_id"),
                "win_shares": float(cells.get("ws", "0") or "0"),
                "ws_per_48": float(cells.get("ws_per_48", "0") or "0"),
                "vorp": float(cells.get("vorp", "0") or "0"),
                "bpm": float(cells.get("bpm", "0") or "0"),
                "season": season_str,
            })
        return players
    except Exception as e:
        logger.warning("bref_win_shares_failed", season=season, error=str(e))
        return []


def fetch_mlb_war(season: int = 2025, stat_type: str = "batting") -> list[dict]:
    url = f"{BBREF_BASE}/leagues/MLB/{season}-{stat_type}.shtml"
    try:
        soup = _get_soup(url)
        table_id = "players_standard_batting" if stat_type == "batting" else "players_standard_pitching"
        table = soup.find("table", {"id": table_id})
        if not table:
            return []
        rows = table.select("tbody tr:not(.thead)")
        players = []
        for row in rows:
            cells = {td.get("data-stat"): td.get_text(strip=True) for td in row.find_all("td")}
            if not cells.get("player"):
                continue
            players.append({
                "player_name": cells.get("player"),
                "team_abbr": cells.get("team_ID"),
                "war": float(cells.get("WAR", "0") or "0"),
                "season": season,
                "stat_type": stat_type,
            })
        return players
    except Exception as e:
        logger.warning("bref_mlb_war_failed", season=season, stat_type=stat_type, error=str(e))
        return []
