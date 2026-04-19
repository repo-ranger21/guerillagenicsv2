from db.client import get_supabase
from utils.logger import get_logger

logger = get_logger(__name__)


def get_active_needles(sport: str | None = None) -> list[dict]:
    sb = get_supabase()
    query = (sb.table("needle_alerts")
               .select("*, teams(abbreviation, full_name, city)")
               .eq("is_active", True)
               .order("edge_pct", desc=True))
    if sport:
        query = query.eq("sport", sport)
    return query.execute().data


def create_needle_alert(alert_data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("needle_alerts").insert(alert_data).execute()
    logger.info("needle_alert_created",
                team=alert_data.get("team_id"),
                tier=alert_data.get("tier"),
                edge=alert_data.get("edge_pct"))
    return res.data[0]


def deactivate_needle(alert_id: str) -> None:
    from datetime import datetime
    sb = get_supabase()
    sb.table("needle_alerts").update({
        "is_active": False,
        "deactivated_at": datetime.utcnow().isoformat()
    }).eq("id", alert_id).execute()
    logger.info("needle_deactivated", alert_id=alert_id)


def deactivate_needles_for_team(team_uuid: str, sport: str) -> int:
    from datetime import datetime
    sb = get_supabase()
    res = (sb.table("needle_alerts")
             .update({
                 "is_active": False,
                 "deactivated_at": datetime.utcnow().isoformat()
             })
             .eq("team_id", team_uuid)
             .eq("sport", sport)
             .eq("is_active", True)
             .execute())
    return len(res.data)


def get_needle_history(sport: str, season: str, limit: int = 50) -> list[dict]:
    sb = get_supabase()
    res = (sb.table("needle_alerts")
             .select("*, teams(abbreviation, full_name)")
             .eq("sport", sport)
             .eq("season", season)
             .order("created_at", desc=True)
             .limit(limit)
             .execute())
    return res.data
