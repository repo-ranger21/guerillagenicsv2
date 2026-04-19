"""
GET /api/v1/odds/{sport}
Returns current championship odds across all books with vig removed.
"""

from fastapi import APIRouter, HTTPException, Request
from api.middleware.rate_limit import limiter
from scrapers.odds_api import fetch_championship_odds, build_team_odds_map, get_best_odds
from utils.odds_converter import american_to_implied_prob, remove_vig_from_odds
from utils.logger import get_logger

router = APIRouter(tags=["odds"])
logger = get_logger(__name__)

VALID_SPORTS = {"nba", "mlb", "nfl"}


@router.get("/odds/{sport}")
@limiter.limit("20/minute")
async def get_odds(request: Request, sport: str, market: str = "championship"):
    sport = sport.lower()
    if sport not in VALID_SPORTS:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}")

    try:
        raw_odds = fetch_championship_odds(sport)
        odds_map = build_team_odds_map(raw_odds)

        teams_out = []
        for team_name, book_odds in odds_map.items():
            all_odds = [o for odds_list in book_odds.values() for o in odds_list]
            best_o, best_book = get_best_odds(team_name, odds_map)
            vig_removed = remove_vig_from_odds(all_odds) if len(all_odds) >= 2 else [american_to_implied_prob(all_odds[0])] if all_odds else [0.0]
            avg_removed = sum(vig_removed) / len(vig_removed) if vig_removed else 0.0
            teams_out.append({
                "team_name": team_name,
                "best_odds": best_o,
                "best_bookmaker": best_book,
                "implied_prob_raw": round(american_to_implied_prob(best_o), 4) if best_o > -100000 else 0.0,
                "implied_prob_vig_removed": round(avg_removed, 4),
                "books_available": list(book_odds.keys()),
                "odds_by_book": {b: ol[0] for b, ol in book_odds.items()},
            })

        teams_out.sort(key=lambda x: x["implied_prob_vig_removed"], reverse=True)
        return {"sport": sport, "market": market, "count": len(teams_out), "odds": teams_out}

    except Exception as e:
        logger.error("odds_fetch_error", sport=sport, error=str(e))
        raise HTTPException(status_code=503, detail="Odds data temporarily unavailable")
