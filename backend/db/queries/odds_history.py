from db.client import get_supabase
from utils.logger import get_logger

logger = get_logger(__name__)


def get_latest_odds(sport: str, season: str, market: str = "championship") -> list[dict]:
    sb = get_supabase()
    res = (sb.table("odds_history")
             .select("*, teams(abbreviation, full_name)")
             .eq("sport", sport)
             .eq("season", season)
             .eq("market", market)
             .order("recorded_at", desc=True)
             .execute())
    seen = set()
    latest = []
    for row in res.data:
        key = (row["team_id"], row["bookmaker"])
        if key not in seen:
            seen.add(key)
            latest.append(row)
    return latest


def get_odds_movement(team_uuid: str, market: str, days: int = 30) -> list[dict]:
    sb = get_supabase()
    from datetime import datetime, timedelta
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    res = (sb.table("odds_history")
             .select("*")
             .eq("team_id", team_uuid)
             .eq("market", market)
             .gte("recorded_at", since)
             .order("recorded_at", desc=False)
             .execute())
    return res.data


def insert_odds_batch(odds_records: list[dict]) -> int:
    if not odds_records:
        return 0
    sb = get_supabase()
    res = sb.table("odds_history").insert(odds_records).execute()
    logger.info("odds_inserted", count=len(res.data))
    return len(res.data)


def get_best_odds_by_team(sport: str, season: str, market: str = "championship") -> dict:
    rows = get_latest_odds(sport, season, market)
    best: dict[str, dict] = {}
    for row in rows:
        tid = row["team_id"]
        if tid not in best or row["american_odds"] > best[tid]["american_odds"]:
            best[tid] = row
    return best
