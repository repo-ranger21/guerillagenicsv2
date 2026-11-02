"""
gg.pipeline.snapshot — assembles the frozen picks_daily row.

Pure assembly, no decisions and no I/O: every number here is already
computed by the caller (run.py, using gg.pipeline.model.nfl/shared).
This module's only job is turning those numbers into the exact row
shape picks_daily expects — formatting text fields, building the
audit/components/formulas jsonb, and templating driver_text.

Two entry points, matching the project's own invariant #7 ("skipped
picks are rows, not omissions"):
  build_published_snapshot — status='published', full model output
  build_skipped_snapshot   — status='skipped_*', model fields null

Both return the same PickSnapshot shape so write.py has exactly one
row shape to upsert, regardless of status.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date as date_type, datetime
from zoneinfo import ZoneInfo

from gg.pipeline.load import GameForDate, TeamFeatures
from gg.pipeline.model.nfl import CARRY, HFA, K, N, SIGMA

ET = ZoneInfo("America/New_York")

# NFL Weeks 1-3: prior-season ratings only, zero current-season games —
# see gg.pipeline.model.nfl's CARRY/K docstring and the project skill doc
# ("NFL Weeks 1-3 carry a COLD START * LOW CONFIDENCE flag and reduced
# Kelly sizing"). This flags it; it does NOT apply an extra, uncalibrated
# Kelly multiplier beyond the fractional-Kelly already computed by
# gg.pipeline.model.shared.kelly — that number isn't specified anywhere
# in the calibrated constants, and this module doesn't invent one.
COLD_START_MAX_WEEK = 3
COLD_START_FLAG = "COLD_START_LOW_CONFIDENCE"


@dataclass
class PickSnapshot:
    slug: str
    game_date: date_type
    sport: str
    game_id: int
    pick: str
    game: str
    game_time: str
    logged_at: datetime
    odds: int
    line_signal: dict
    components: dict
    formulas: list
    audit: dict
    driver_text: str
    flags: list
    status: str
    skip_reason: str | None
    model_prob: float | None = None
    evi: float | None = None
    kelly_full: float | None = None
    kelly_fractional: float | None = None


def _slug(game: GameForDate) -> str:
    return f"{game.away_abbreviation}-at-{game.home_abbreviation}".lower()


def _game_text(game: GameForDate) -> str:
    return f"{game.away_abbreviation} @ {game.home_abbreviation}"


def _game_time_text(game: GameForDate) -> str:
    """Human-readable local kickoff, e.g. 'Thu 8:20 PM ET'. Built by hand
    rather than with a %-I/%#I strftime flag — those aren't portable
    between Linux/macOS and Windows, and this pipeline runs on both
    (Windows per the task's own environment, Linux likely in CI/Render)."""
    local = game.game_time.astimezone(ET)
    hour12 = local.hour % 12 or 12
    ampm = "AM" if local.hour < 12 else "PM"
    return f"{local.strftime('%a')} {hour12}:{local.minute:02d} {ampm} ET"


def _flags_for(game: GameForDate, extra_flags: tuple[str, ...] = ()) -> list[str]:
    flags = list(extra_flags)
    if game.week is not None and game.week <= COLD_START_MAX_WEEK:
        flags.append(COLD_START_FLAG)
    return flags


def _driver_text(bet_team: str, opp_team: str, bet_rating: float, opp_rating: float) -> str:
    """Templated from the top contributing feature — never LLM-generated.
    An LLM would produce a plausible-sounding reason, not the actual one;
    that's the opposite of explainable. Exact template from the task spec."""
    delta = bet_rating - opp_rating
    return (
        f"{bet_team} rates {delta:+.1f} pts above {opp_team} on 2025 EPA/play, "
        f"regressed {CARRY:.0%} toward the mean."
    )


def build_published_snapshot(
    *,
    game: GameForDate,
    game_date: date_type,
    logged_at: datetime,
    bet_team: str,
    opp_team: str,
    bet_rating: float,
    opp_rating: float,
    bet_team_is_home: bool,
    spread: float,
    odds: int,
    book: str,
    model_prob: float,
    push_prob: float,
    loss_prob: float,
    evi_value: float,
    kelly_full_value: float,
    kelly_fractional_value: float,
    home_features: TeamFeatures,
    away_features: TeamFeatures,
    extra_flags: tuple[str, ...] = (),
    line_signal: dict | None = None,
) -> PickSnapshot:
    """The full-evaluation path: both teams had features, odds existed,
    and gate.py returned status='published'."""
    hfa_signed = HFA if bet_team_is_home else -HFA
    edge_pts = (bet_rating - opp_rating) + hfa_signed

    return PickSnapshot(
        slug=_slug(game),
        game_date=game_date,
        sport="NFL",
        game_id=game.game_id,
        pick=f"{bet_team} {spread:+.1f}",
        game=_game_text(game),
        game_time=_game_time_text(game),
        logged_at=logged_at,
        odds=odds,
        line_signal=line_signal or {},
        components={
            "bet_team": bet_team,
            "opp_team": opp_team,
            "bet_team_is_home": bet_team_is_home,
            "bet_rating_pts_per_game": bet_rating,
            "opp_rating_pts_per_game": opp_rating,
            "hfa": hfa_signed,
            "edge_pts": edge_pts,
            "spread": spread,
            "sigma": SIGMA,
            "n_simulations": N,
            "carry": CARRY,
            "k": K,
            "book": book,
        },
        formulas=[
            "rating = CARRY*prior_season + (1-CARRY)*league_mean (K has no effect at gp=0)",
            "edge_pts = (bet_team_rating - opp_rating) + HFA",
            "margin ~ Normal(edge_pts, SIGMA), N simulations",
            "cover_probabilities(margins, spread) -> win, push, loss",
            "evi = p_win*american_to_profit(odds) - p_loss",
            "kelly = fractional (0.5), conditioned on non-push",
        ],
        audit={
            "home_ingest_run_id": home_features.ingest_run_id,
            "away_ingest_run_id": away_features.ingest_run_id,
            "home_features_as_of": home_features.as_of.isoformat(),
            "away_features_as_of": away_features.as_of.isoformat(),
        },
        driver_text=_driver_text(bet_team, opp_team, bet_rating, opp_rating),
        flags=_flags_for(game, extra_flags),
        status="published",
        skip_reason=None,
        model_prob=model_prob,
        evi=evi_value,
        kelly_full=kelly_full_value,
        kelly_fractional=kelly_fractional_value,
    )


def build_skipped_snapshot(
    *,
    game: GameForDate,
    game_date: date_type,
    logged_at: datetime,
    bet_team: str,
    spread: float,
    odds: int,
    status: str,
    skip_reason: str,
    extra_flags: tuple[str, ...] = (),
) -> PickSnapshot:
    """The skip path — status is one of gate.py's skipped_* values. Same
    row shape as a published pick, model fields simply stay null. This IS
    the row; there is no omission."""
    return PickSnapshot(
        slug=_slug(game),
        game_date=game_date,
        sport="NFL",
        game_id=game.game_id,
        pick=f"{bet_team} {spread:+.1f}",
        game=_game_text(game),
        game_time=_game_time_text(game),
        logged_at=logged_at,
        odds=odds,
        line_signal={},
        components={},
        formulas=[],
        audit={},
        driver_text="",
        flags=_flags_for(game, extra_flags),
        status=status,
        skip_reason=skip_reason,
    )
