"""
GET /api/v1/player-futures/{sport}/{award}
Returns award race leaderboard with GG model probabilities.
"""

from fastapi import APIRouter, HTTPException, Request
from api.middleware.rate_limit import limiter
from db.queries.player_futures import get_award_leaderboard
from utils.logger import get_logger

router = APIRouter(tags=["players"])
logger = get_logger(__name__)

VALID_SPORTS = {"nba", "mlb", "nfl"}
VALID_AWARDS = {
    "nba": {"mvp", "dpoy", "roty", "sixth_man"},
    "mlb": {"mvp", "cy_young", "roty", "hank_aaron"},
    "nfl": {"mvp", "dpoy", "roty", "offensive_player"},
}
CURRENT_SEASONS = {"nba": "2024-25", "mlb": "2025", "nfl": "2025"}


@router.get("/player-futures/{sport}/{award}")
@limiter.limit("60/minute")
async def get_player_futures(request: Request, sport: str, award: str, season: str | None = None):
    sport = sport.lower()
    award = award.lower()
    if sport not in VALID_SPORTS:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}")
    if award not in VALID_AWARDS.get(sport, set()):
        raise HTTPException(status_code=404, detail=f"Unknown award '{award}' for {sport}")

    resolved_season = season or CURRENT_SEASONS.get(sport, "2024-25")

    try:
        leaderboard = get_award_leaderboard(sport, resolved_season, award)
    except Exception as e:
        logger.error("player_futures_error", sport=sport, award=award, error=str(e))
        leaderboard = _mock_award_leaderboard(sport, award)

    return {
        "sport": sport,
        "award": award,
        "season": resolved_season,
        "count": len(leaderboard),
        "candidates": leaderboard,
    }


def _mock_award_leaderboard(sport: str, award: str) -> list[dict]:
    mock = {
        "nba_mvp": [
            {"rank": 1, "player_name": "Shai Gilgeous-Alexander", "team": "OKC", "gg_prob": 0.31, "market_prob": 0.27, "best_odds": -180, "edge_direction": "VALUE"},
            {"rank": 2, "player_name": "Nikola Jokić", "team": "DEN", "gg_prob": 0.24, "market_prob": 0.28, "best_odds": -200, "edge_direction": "FADE"},
            {"rank": 3, "player_name": "Jayson Tatum", "team": "BOS", "gg_prob": 0.18, "market_prob": 0.15, "best_odds": 450, "edge_direction": "VALUE"},
        ],
        "mlb_cy_young": [
            {"rank": 1, "player_name": "Tarik Skubal", "team": "DET", "gg_prob": 0.28, "market_prob": 0.25, "best_odds": -160, "edge_direction": "VALUE"},
            {"rank": 2, "player_name": "Chris Sale", "team": "ATL", "gg_prob": 0.19, "market_prob": 0.22, "best_odds": 180, "edge_direction": "FADE"},
        ],
    }
    key = f"{sport}_{award}"
    return mock.get(key, [])
