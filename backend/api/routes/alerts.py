"""
GET  /api/v1/alerts/needle       — all active needle alerts across sports
POST /api/v1/alerts/needle/check — manually trigger needle check for a team
"""

from fastapi import APIRouter, Request
from api.middleware.rate_limit import limiter
from db.queries.needle_alerts import get_active_needles
from utils.logger import get_logger

router = APIRouter(tags=["alerts"])
logger = get_logger(__name__)


@router.get("/alerts/needle")
@limiter.limit("60/minute")
async def get_all_needle_alerts(request: Request, sport: str | None = None):
    try:
        alerts = get_active_needles(sport)
    except Exception as e:
        logger.error("alerts_db_error", error=str(e))
        alerts = []
    return {
        "count": len(alerts),
        "alerts": alerts,
        "filter_sport": sport,
    }


@router.get("/alerts/needle/{sport}")
@limiter.limit("60/minute")
async def get_needle_alerts_by_sport(request: Request, sport: str):
    sport = sport.lower()
    try:
        alerts = get_active_needles(sport)
    except Exception as e:
        logger.error("alerts_sport_error", sport=sport, error=str(e))
        alerts = []
    return {"sport": sport, "count": len(alerts), "alerts": alerts}
