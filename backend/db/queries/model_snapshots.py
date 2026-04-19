import json
from db.client import get_supabase
from utils.logger import get_logger

logger = get_logger(__name__)


def save_snapshot(sport: str, season: str, snapshot_type: str,
                  payload: dict, top_needle: str | None = None) -> dict:
    sb = get_supabase()
    res = sb.table("model_snapshots").insert({
        "sport": sport,
        "season": season,
        "snapshot_type": snapshot_type,
        "formula_version": "2.0.0",
        "payload": payload,
        "top_needle": top_needle,
    }).execute()
    logger.info("snapshot_saved", sport=sport, season=season, type=snapshot_type)
    return res.data[0]


def get_latest_snapshot(sport: str, season: str, snapshot_type: str = "weekly") -> dict | None:
    sb = get_supabase()
    res = (sb.table("model_snapshots")
             .select("*")
             .eq("sport", sport)
             .eq("season", season)
             .eq("snapshot_type", snapshot_type)
             .order("created_at", desc=True)
             .limit(1)
             .execute())
    return res.data[0] if res.data else None


def list_snapshots(sport: str, season: str, limit: int = 20) -> list[dict]:
    sb = get_supabase()
    res = (sb.table("model_snapshots")
             .select("id, sport, season, snapshot_type, formula_version, top_needle, created_at")
             .eq("sport", sport)
             .eq("season", season)
             .order("created_at", desc=True)
             .limit(limit)
             .execute())
    return res.data


def export_snapshot_json(snapshot_id: str) -> str:
    sb = get_supabase()
    res = sb.table("model_snapshots").select("*").eq("id", snapshot_id).limit(1).execute()
    if not res.data:
        raise ValueError(f"Snapshot {snapshot_id} not found")
    return json.dumps(res.data[0], indent=2, default=str)
