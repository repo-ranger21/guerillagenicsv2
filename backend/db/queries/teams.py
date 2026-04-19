from db.client import get_supabase
from utils.logger import get_logger

logger = get_logger(__name__)


def get_all_teams(sport: str) -> list[dict]:
    sb = get_supabase()
    res = sb.table("teams").select("*").eq("sport", sport).execute()
    return res.data


def get_team_by_abbreviation(sport: str, abbreviation: str) -> dict | None:
    sb = get_supabase()
    res = (sb.table("teams")
             .select("*")
             .eq("sport", sport)
             .eq("abbreviation", abbreviation.upper())
             .limit(1)
             .execute())
    return res.data[0] if res.data else None


def get_team_by_id(team_uuid: str) -> dict | None:
    sb = get_supabase()
    res = sb.table("teams").select("*").eq("id", team_uuid).limit(1).execute()
    return res.data[0] if res.data else None


def upsert_team(team_data: dict) -> dict:
    sb = get_supabase()
    res = (sb.table("teams")
             .upsert(team_data, on_conflict="sport,abbreviation")
             .execute())
    logger.info("team_upserted", abbreviation=team_data.get("abbreviation"))
    return res.data[0]


def get_futures_scores(sport: str, season: str) -> list[dict]:
    sb = get_supabase()
    res = (sb.table("futures_scores")
             .select("*, teams(abbreviation, full_name, city)")
             .eq("sport", sport)
             .eq("season", season)
             .order("cfs_score", desc=True)
             .execute())
    return res.data


def upsert_futures_score(score_data: dict) -> dict:
    sb = get_supabase()
    res = sb.table("futures_scores").insert(score_data).execute()
    return res.data[0]
