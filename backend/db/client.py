import os
from functools import lru_cache
from supabase import create_client, Client
from utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    client = create_client(url, key)
    logger.info("supabase_client_initialized", url=url[:40] + "...")
    return client
