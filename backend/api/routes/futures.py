"""
GET /api/v1/futures/{sport}
Returns CFS-ranked futures leaderboard with all formula sub-scores.
"""

from fastapi import APIRouter, HTTPException, Request
from api.middleware.rate_limit import limiter
from db.queries.teams import get_futures_scores
from utils.logger import get_logger

router = APIRouter(tags=["futures"])
logger = get_logger(__name__)

VALID_SPORTS = {"nba", "mlb", "nfl"}

CURRENT_SEASONS = {"nba": "2024-25", "mlb": "2025", "nfl": "2025"}


@router.get("/futures/{sport}")
@limiter.limit("60/minute")
async def get_futures(request: Request, sport: str, season: str | None = None):
    sport = sport.lower()
    if sport not in VALID_SPORTS:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}")

    resolved_season = season or CURRENT_SEASONS.get(sport, "2024-25")

    try:
        scores = get_futures_scores(sport, resolved_season)
    except Exception as e:
        logger.error("futures_db_error", sport=sport, error=str(e))
        scores = _mock_futures(sport)

    return {
        "sport": sport,
        "season": resolved_season,
        "count": len(scores),
        "teams": scores,
    }


def _mock_futures(sport: str) -> list[dict]:
    teams = {
        "nba": [
            {"abbreviation": "BOS", "full_name": "Boston Celtics", "city": "Boston"},
            {"abbreviation": "OKC", "full_name": "Oklahoma City Thunder", "city": "Oklahoma City"},
            {"abbreviation": "CLE", "full_name": "Cleveland Cavaliers", "city": "Cleveland"},
            {"abbreviation": "GSW", "full_name": "Golden State Warriors", "city": "San Francisco"},
        ],
        "mlb": [
            {"abbreviation": "LAD", "full_name": "Los Angeles Dodgers", "city": "Los Angeles"},
            {"abbreviation": "PHI", "full_name": "Philadelphia Phillies", "city": "Philadelphia"},
            {"abbreviation": "NYY", "full_name": "New York Yankees", "city": "New York"},
            {"abbreviation": "ATL", "full_name": "Atlanta Braves", "city": "Atlanta"},
        ],
        "nfl": [
            {"abbreviation": "KC", "full_name": "Kansas City Chiefs", "city": "Kansas City"},
            {"abbreviation": "BAL", "full_name": "Baltimore Ravens", "city": "Baltimore"},
            {"abbreviation": "SF", "full_name": "San Francisco 49ers", "city": "San Francisco"},
            {"abbreviation": "BUF", "full_name": "Buffalo Bills", "city": "Buffalo"},
        ],
    }
    mock_teams = teams.get(sport, [])
    result = []
    for i, t in enumerate(mock_teams):
        cfs = round(82 - i * 7.5, 2)
        result.append({
            "rank": i + 1,
            "abbreviation": t["abbreviation"],
            "full_name": t["full_name"],
            "city": t["city"],
            "cfs_score": cfs,
            "championship_prob": round(0.22 - i * 0.05, 4),
            "gg_elo": round(1620 - i * 40, 2),
            "nir_score": round(78 - i * 6, 2),
            "iis_score": round(92 - i * 3, 2),
            "mdi_score": round(71 - i * 8, 2),
            "pds_score": round(80 - i * 5, 2),
            "tier": ["NEEDLE", "LOCK", "LEAN", "FAIR"][min(i, 3)],
        })
    return result
