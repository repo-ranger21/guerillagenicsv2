"""
GET /api/v1/standings/{sport}
Returns current league standings enriched with GG-ELO.
"""

from fastapi import APIRouter, HTTPException, Request
from api.middleware.rate_limit import limiter
from scrapers.espn import fetch_standings
from utils.logger import get_logger

router = APIRouter(tags=["standings"])
logger = get_logger(__name__)

VALID_SPORTS = {"nba", "mlb", "nfl"}


@router.get("/standings/{sport}")
@limiter.limit("30/minute")
async def get_standings(request: Request, sport: str):
    sport = sport.lower()
    if sport not in VALID_SPORTS:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}")

    try:
        standings = fetch_standings(sport)
    except Exception as e:
        logger.warning("standings_scrape_failed", sport=sport, error=str(e))
        standings = []

    return {"sport": sport, "count": len(standings), "standings": standings}
