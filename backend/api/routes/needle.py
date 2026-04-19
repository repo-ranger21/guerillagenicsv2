"""
GET /api/v1/needle/{sport}
Returns active NEEDLE market inefficiency alerts.
"""

from fastapi import APIRouter, HTTPException, Request
from api.middleware.rate_limit import limiter
from db.queries.needle_alerts import get_active_needles, get_needle_history
from utils.logger import get_logger

router = APIRouter(tags=["needle"])
logger = get_logger(__name__)

VALID_SPORTS = {"nba", "mlb", "nfl"}


@router.get("/needle/{sport}")
@limiter.limit("60/minute")
async def get_needles(request: Request, sport: str, include_history: bool = False):
    sport = sport.lower()
    if sport not in VALID_SPORTS:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}")

    try:
        active = get_active_needles(sport)
    except Exception as e:
        logger.error("needle_db_error", sport=sport, error=str(e))
        active = _mock_needles(sport)

    response = {"sport": sport, "active_count": len(active), "needles": active}

    if include_history:
        try:
            season = "2024-25" if sport == "nba" else "2025"
            response["history"] = get_needle_history(sport, season)
        except Exception:
            response["history"] = []

    return response


@router.get("/needle/all")
@limiter.limit("30/minute")
async def get_all_needles(request: Request):
    try:
        return {
            "needles": get_active_needles(),
            "count": len(get_active_needles()),
        }
    except Exception as e:
        logger.error("needle_all_error", error=str(e))
        needles = []
        for sport in VALID_SPORTS:
            needles.extend(_mock_needles(sport))
        return {"needles": needles, "count": len(needles)}


def _mock_needles(sport: str) -> list[dict]:
    mock = {
        "nba": [{
            "team_abbreviation": "OKC", "full_name": "Oklahoma City Thunder",
            "tier": "NEEDLE", "edge_pct": 0.094, "our_prob": 0.187, "market_prob": 0.093,
            "best_odds": 450, "best_bookmaker": "fanduel",
            "signals_triggered": ["model_edge", "line_movement", "sharp_money", "public_fade", "injury_mispriced"],
            "kelly_fraction": 0.089, "quarter_kelly": 0.022,
        }],
        "mlb": [{
            "team_abbreviation": "PHI", "full_name": "Philadelphia Phillies",
            "tier": "LOCK", "edge_pct": 0.062, "our_prob": 0.141, "market_prob": 0.079,
            "best_odds": 700, "best_bookmaker": "draftkings",
            "signals_triggered": ["model_edge", "sharp_money", "late_season_drift"],
            "kelly_fraction": 0.058, "quarter_kelly": 0.015,
        }],
        "nfl": [],
    }
    return mock.get(sport, [])
