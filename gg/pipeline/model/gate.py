"""
gg/pipeline/model/gate.py

Decides whether a modeled edge is publishable. Pure functions — numbers in,
a decision out. No I/O.

BACKTESTED, AND NO CONFIGURATION SHOWS EDGE (2026-10-23): scripts/backtest_nfl.py
(results in docs/BACKTEST_NFL.md) replays this exact gate over 1,087 games,
2022-2025, walk-forward, flat -110 against the closing spread.

  - Published bets: 402-408-20, 49.6% wins, -5.1% ROI (95% CI -11.5 to +1.3).
  - Gap > 7 pts: 23-36-1, -25.2% ROI. The cap is directionally supported:
    a large disagreement with the line is the model missing information.
  - Gaps below 7 are not distinguishable from coin flips; no EVI bucket
    clears break-even, and realised ROI does not rise with stated EVI.
  - Mean stated EVI on published bets was +12.0% against -5.1% realised.

So the gate is a risk filter, not an edge finder. It keeps the model from
publishing its worst-looking disagreements; it does not make the remaining
picks profitable. (An earlier docstring cited a sweep table from a
"backtest.py" that never existed in this repo; that table is gone.)
"""
from dataclasses import dataclass
from typing import Literal

# --- constants -----------------------------------------------------------
# Backtest by |model - line| gap (docs/BACKTEST_NFL.md): 5-7 pts 50-32-2 (+16.0% ROI,
# CI spans zero); 7+ pts 23-36-1 (-25.2% ROI). 7.0 is kept as a risk cap.
MAX_DISAGREEMENT_PTS = 7.0  # risk cap, supported by backtest on the high side only

# Kelly assumes you know the true probability. We demonstrably do not —
# the model trails closing lines by ~1.8 pts of mean absolute error.
# Ceiling is a judgment call, not a derived one. Stated, not hidden.
MAX_KELLY_PCT = 2.5

# EVI publish floor. The backtest found no EVI bucket that clears break-even
# and no rise in realised ROI with stated EVI, so there is no evidence-based
# floor to set. Held at 0.0 so it filters nothing silently.
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
            f"(cap {MAX_DISAGREEMENT_PTS:.0f}; gaps above it went 23-36-1 in "
            f"the 2022-25 backtest). Large disagreement indicates missing "
            f"information, not edge.",
            0.0, kelly_pct, tuple(flags))

    if evi_pct <= MIN_EVI_PCT:
        return Decision("skipped_below_threshold",
                        f"EVI {evi_pct:+.2f}% at or below floor "
                        f"{MIN_EVI_PCT:+.2f}%",
                        0.0, kelly_pct, tuple(flags))

    if gap > MAX_DISAGREEMENT_PTS * 0.75:
        flags.append("wide_disagreement")

    return Decision("published", None, capped, kelly_pct, tuple(flags))
