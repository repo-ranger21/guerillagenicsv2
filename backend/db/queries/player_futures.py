from db.client import get_supabase
from utils.logger import get_logger

logger = get_logger(__name__)


def get_award_leaderboard(sport: str, season: str, award: str) -> list[dict]:
    sb = get_supabase()
    res = (sb.table("player_futures")
             .select("*, players(full_name, position, team_id, teams(abbreviation))")
             .eq("sport", sport)
             .eq("season", season)
             .eq("award", award)
             .order("gg_prob", desc=True)
             .limit(20)
             .execute())
    return res.data


def upsert_player_future(data: dict) -> dict:
    sb = get_supabase()
    res = (sb.table("player_futures")
             .upsert(data, on_conflict="player_id,sport,season,award")
             .execute())
    return res.data[0]


def get_player_all_awards(player_uuid: str, season: str) -> list[dict]:
    sb = get_supabase()
    res = (sb.table("player_futures")
             .select("*")
             .eq("player_id", player_uuid)
             .eq("season", season)
             .execute())
    return res.data


def get_top_needles_players(sport: str, season: str) -> list[dict]:
    sb = get_supabase()
    res = (sb.table("player_futures")
             .select("*, players(full_name, position, teams(abbreviation, full_name))")
             .eq("sport", sport)
             .eq("season", season)
             .eq("edge_direction", "VALUE")
             .order("edge_pct", desc=True)
             .limit(10)
             .execute())
    return res.data
