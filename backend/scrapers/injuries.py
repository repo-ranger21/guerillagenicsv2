"""
ESPN injury feed aggregator — fetches and normalizes injury data for all sports.
"""

from scrapers.espn import fetch_injuries
from utils.logger import get_logger

logger = get_logger(__name__)

IMPACT_WIN_SHARES = {
    "nba": {
        "star": 8.0,
        "starter": 4.5,
        "rotation": 2.0,
        "bench": 0.5,
    },
    "mlb": {
        "star": 4.0,
        "starter": 2.5,
        "rotation": 1.0,
        "bench": 0.3,
    },
    "nfl": {
        "star": 3.5,
        "starter": 2.0,
        "rotation": 0.8,
        "bench": 0.2,
    },
}


def classify_player_role(player_name: str, sport: str, roster_depth: int = 1) -> str:
    if roster_depth == 1:
        return "star"
    if roster_depth == 2:
        return "starter"
    if roster_depth <= 4:
        return "rotation"
    return "bench"


def estimate_win_shares(sport: str, roster_depth: int) -> float:
    role = classify_player_role("", sport, roster_depth)
    return IMPACT_WIN_SHARES.get(sport, IMPACT_WIN_SHARES["nba"]).get(role, 1.0)


def fetch_all_injuries(sport: str) -> list[dict]:
    raw = fetch_injuries(sport)
    enriched = []
    for inj in raw:
        roster_depth = 2
        ws = estimate_win_shares(sport, roster_depth)
        enriched.append({
            **inj,
            "win_shares": ws,
            "roster_depth": roster_depth,
        })
    logger.info("injuries_fetched", sport=sport, count=len(enriched))
    return enriched


def group_injuries_by_team(injuries: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for inj in injuries:
        tid = inj.get("team_espn_id") or "unknown"
        if tid not in grouped:
            grouped[tid] = []
        grouped[tid].append(inj)
    return grouped


def get_active_injuries(sport: str) -> dict[str, list[dict]]:
    injuries = fetch_all_injuries(sport)
    active = [i for i in injuries if i.get("status") in ("OUT", "DOUBTFUL", "QUESTIONABLE")]
    logger.info("active_injuries", sport=sport, count=len(active))
    return group_injuries_by_team(active)
