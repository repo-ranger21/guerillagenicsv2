"""picks_daily writes.

Idempotent landing for the day's picks. The cron may fire this several times a
day (lines move); re-running must update, never duplicate. The unique index
picks_daily_slug_date_uidx (slug, game_date) backs the upsert's conflict target.

This NEVER touches picks_editorial — editorial lives in its own table and is
unreachable from this auto path. That separation is the structural half of the
never-overwrite guarantee.
"""

from __future__ import annotations

from typing import Any

from db.client import get_supabase
from utils.logger import get_logger

logger = get_logger(__name__)

_TABLE = "picks_daily"
_CONFLICT = "slug,game_date"


def upsert_picks_daily(rows: list[dict[str, Any]], sb=None) -> int:
    """Upsert pick rows on (slug, game_date). Returns the number written.

    NOTE on the audit-of-record: this overwrites model outputs on each run, so
    picks_daily always reflects the *current* line. The immutable publish-time
    record lives in Betstamp (logged externally) and in each row's `audit`
    jsonb. If you later want to freeze publish-time EVI/Kelly in Postgres too,
    add a `first_published_at` + frozen columns and skip overwriting them on
    update — but don't build that until you need it.
    """
    if not rows:
        logger.info("upsert_picks_daily_skipped", reason="empty_rows")
        return 0

    sb = sb or get_supabase()
    res = sb.table(_TABLE).upsert(rows, on_conflict=_CONFLICT).execute()
    written = len(res.data or [])
    logger.info("upsert_picks_daily_complete", written=written)
    return written
