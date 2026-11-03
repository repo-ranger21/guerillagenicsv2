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

# Games played at a neutral site (the International Series). The designated
# "home" team has no home crowd there, so the model must not add home-field
# advantage. Keyed by season; each entry is (home, away) in database
# abbreviations. Source: nflverse games.csv rows with location == "Neutral".
# Add a season's entries when its schedule is released; a missed entry means the
# model silently gives one team a home edge it does not have.
NEUTRAL_SITE_GAMES: dict[int, frozenset[tuple[str, str]]] = {
    2026: frozenset({
        ("LAR", "SF"),   # wk 1  Melbourne
        ("DAL", "BAL"),  # wk 3  Rio de Janeiro
        ("WAS", "IND"),  # wk 4  London (Tottenham)
        ("JAX", "PHI"),  # wk 5  London (Tottenham)
        ("JAX", "HOU"),  # wk 6  London (Wembley)
        ("NO", "PIT"),   # wk 7  Paris
        ("ATL", "CIN"),  # wk 9  Madrid
        ("DET", "NE"),   # wk 10 Munich
        ("SF", "MIN"),   # wk 11 Mexico City
    }),
}


def is_neutral_site(season: int, home_abbr: str, away_abbr: str) -> bool:
    """True if this game is played at a neutral site (no home-field advantage)."""
    return (home_abbr, away_abbr) in NEUTRAL_SITE_GAMES.get(season, frozenset())


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
