"""
gg/pipeline/model/gate.py

Decides whether a modeled edge is publishable. Pure functions — numbers in,
a decision out. No I/O.

NOT CALIBRATED (corrected 2026-10-04): this module's constants were
previously documented as "derived from backtest.py over 1,058 decided
games, 2022-2025, walk-forward with no lookahead," with a specific sweep
table for MAX_DISAGREEMENT_PTS. That provenance claim does not hold up:
no backtest.py or any script containing those numbers exists anywhere in
this repo, and the live DB has no historical outcome data to have produced
them from (games.status is always 'scheduled', no score columns exist,
and the DB only covers the 2026 season -- 2022-2025 "decided games" are
not present here in any form). Do not cite the sweep table below as a
real backtest result until one actually exists. Treat MAX_DISAGREEMENT_PTS
the same as MAX_KELLY_PCT and MIN_EVI_PCT: a judgment call, not a
validated threshold. (Separately, a real sign-convention bug in how
run.py called gate() -- market_line was passed in the opposite sign
convention from this docstring's "positive = home favored" -- was found
and fixed the same day; that fix is independent of this provenance issue
and does not resolve it.)
"""
from dataclasses import dataclass
from typing import Literal

# --- constants -----------------------------------------------------------
# UNVERIFIED sweep table (see module docstring -- no backtest script or
# outcome data backing this was found in the repo as of 2026-10-04):
#     gap <= 7  ->  n=997  49.85% ATS
#     gap >  7  ->  n= 61  40.98% ATS   (-21.76% ROI)
#     gap >  8  ->  n= 42  35.71% ATS   (-31.82% ROI)
# 7.0 is kept as the operating threshold (it's a reasonable-sounding
# judgment call, not a disproven one) but is NOT CALIBRATED.
MAX_DISAGREEMENT_PTS = 7.0  # NOT CALIBRATED -- judgment call, see docstring above

# Kelly assumes you know the true probability. We demonstrably do not —
# the model trails closing lines by ~1.8 pts of mean absolute error.
# Ceiling is a judgment call, not a derived one. Stated, not hidden.
MAX_KELLY_PCT = 2.5

# EVI publish floor. NOT CALIBRATED. No backtest bucket cleared break-even,
# so there is no evidence-based floor to set. Held at 0.0 so it filters
# nothing silently. Revisit only with evidence.
MIN_EVI_PCT = 0.0

Status = Literal[
    "published",
    "skipped_model_uncertainty",   # gap beyond the derived cap
    "skipped_below_threshold",
    "skipped_missing_data",
    "skipped_stale_odds",
]


@dataclass(frozen=True)
class Decision:
    status: Status
    skip_reason: str | None
    kelly_pct: float          # post-ceiling, what actually gets staked
    kelly_raw: float          # what the formula wanted, for the audit trail
    flags: tuple[str, ...]


def gate(
    *,
    model_margin: float,
    market_line: float,
    evi_pct: float,
    kelly_pct: float,
    has_features: bool = True,
    odds_age_minutes: float = 0.0,
    extra_flags: tuple[str, ...] = (),
    max_odds_age_minutes: float = 180.0,
) -> Decision:
    """
    model_margin / market_line: both from the home team's perspective,
    positive = home favored. gap = how far the model disagrees.
    """
    gap = abs(model_margin - market_line)
    flags = list(extra_flags)

    capped = min(kelly_pct, MAX_KELLY_PCT)
    if kelly_pct > MAX_KELLY_PCT:
        flags.append("kelly_capped")

    if not has_features:
        return Decision("skipped_missing_data",
                        "feature row missing for one or both teams",
                        0.0, kelly_pct, tuple(flags))

    if odds_age_minutes > max_odds_age_minutes:
        return Decision("skipped_stale_odds",
                        f"odds {odds_age_minutes:.0f}m old, limit "
                        f"{max_odds_age_minutes:.0f}m",
                        0.0, kelly_pct, tuple(flags))

    if gap > MAX_DISAGREEMENT_PTS:
        return Decision(
            "skipped_model_uncertainty",
            f"model disagrees with market by {gap:.1f} pts "
            f"(cap {MAX_DISAGREEMENT_PTS:.0f}, NOT CALIBRATED -- judgment "
            f"call, no validated backtest behind this threshold; see module "
            f"docstring). Large disagreement indicates missing information, "
            f"not edge.",
            0.0, kelly_pct, tuple(flags))

    if evi_pct <= MIN_EVI_PCT:
        return Decision("skipped_below_threshold",
                        f"EVI {evi_pct:+.2f}% at or below floor "
                        f"{MIN_EVI_PCT:+.2f}%",
                        0.0, kelly_pct, tuple(flags))

    if gap > MAX_DISAGREEMENT_PTS * 0.75:
        flags.append("wide_disagreement")

    return Decision("published", None, capped, kelly_pct, tuple(flags))
