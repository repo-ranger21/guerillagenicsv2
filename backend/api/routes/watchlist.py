"""
GET  /api/v1/watchlist/{user_id}        — get user's pinned futures
POST /api/v1/watchlist/{user_id}        — add item to watchlist
DELETE /api/v1/watchlist/{user_id}/{id} — remove item
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from api.middleware.rate_limit import limiter
from db.client import get_supabase
from utils.logger import get_logger

router = APIRouter(tags=["watchlist"])
logger = get_logger(__name__)


class WatchlistItem(BaseModel):
    sport: str
    team_id: str | None = None
    player_id: str | None = None


@router.get("/watchlist/{user_id}")
@limiter.limit("60/minute")
async def get_watchlist(request: Request, user_id: str):
    try:
        sb = get_supabase()
        res = (sb.table("watchlist")
                 .select("*, teams(abbreviation, full_name), players(full_name, position)")
                 .eq("user_id", user_id)
                 .order("pinned_at", desc=True)
                 .execute())
        return {"user_id": user_id, "count": len(res.data), "items": res.data}
    except Exception as e:
        logger.error("watchlist_get_error", user_id=user_id, error=str(e))
        return {"user_id": user_id, "count": 0, "items": []}


@router.post("/watchlist/{user_id}")
@limiter.limit("30/minute")
async def add_to_watchlist(request: Request, user_id: str, item: WatchlistItem):
    if not item.team_id and not item.player_id:
        raise HTTPException(status_code=400, detail="Must provide team_id or player_id")
    try:
        sb = get_supabase()
        res = sb.table("watchlist").insert({
            "user_id": user_id,
            "team_id": item.team_id,
            "player_id": item.player_id,
            "sport": item.sport,
        }).execute()
        return {"success": True, "item": res.data[0]}
    except Exception as e:
        logger.error("watchlist_add_error", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to add to watchlist")


@router.delete("/watchlist/{user_id}/{item_id}")
@limiter.limit("30/minute")
async def remove_from_watchlist(request: Request, user_id: str, item_id: str):
    try:
        sb = get_supabase()
        sb.table("watchlist").delete().eq("id", item_id).eq("user_id", user_id).execute()
        return {"success": True, "removed_id": item_id}
    except Exception as e:
        logger.error("watchlist_delete_error", item_id=item_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to remove item")
