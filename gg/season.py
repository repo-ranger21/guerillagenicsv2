"""
gg.season — which NFL week is it? One config table, no hard-coded season.

An NFL week runs Tuesday through Monday, so Week 1 starts on the Tuesday
before the opening Thursday game. Add one line per season; everything that
needs "the current week" (the scheduled cron, `gg.cli --current`) reads here.
"""

from __future__ import annotations

from datetime import date, timedelta
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")

# Season -> the Tuesday that opens Week 1 (opening game is that Thursday).
WEEK1_TUESDAY: dict[int, date] = {
    2026: date(2026, 9, 8),  # opener Thu 2026-09-10
}

MAX_REGULAR_SEASON_WEEK = 18


def current_season_week(today: date) -> tuple[int, int]:
    """(season, week) for `today` (an America/New_York date).

    Raises if `today` falls outside every configured regular season: a
    scheduled job should fail loudly in the offseason or when the table
    needs a new year, never guess a week."""
    for season, start in sorted(WEEK1_TUESDAY.items(), reverse=True):
        if today >= start:
            week = (today - start).days // 7 + 1
            if week > MAX_REGULAR_SEASON_WEEK:
                raise ValueError(f"{today} is past regular-season week {MAX_REGULAR_SEASON_WEEK} of {season}")
            return season, week
    raise ValueError(f"{today} is before the first configured season in gg.season.WEEK1_TUESDAY")


def week_end_exclusive(season: int, week: int) -> date:
    """First Tuesday AFTER the week: the `before` cutoff for odds ingest so
    next week's early lines are not tagged as this week's games."""
    return WEEK1_TUESDAY[season] + timedelta(days=7 * week)
