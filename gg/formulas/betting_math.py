"""Canonical betting math — the single source of truth.

Every Kelly/EVI number in the product originates here. The shared vectors in
shared/betting_vectors.json police it (run by pytest). Change a formula and
update the vectors in the same commit, or CI turns red. Any future non-Python
implementation must run the same vectors; the retired JS mirror lives at the
git tag archive/pre-neon.

RULE: round only at the edges. Nothing here rounds. Callers round exactly once,
at storage (picks_builder) or display (a thin formatter). Mid-formula rounding
is what split the backend from the frontend before — never reintroduce it.

CONVENTION (read this before touching anything):
  `am_to_decimal` returns the NET profit multiplier b — i.e. profit per unit
  staked, NOT full decimal odds. Full decimal odds would be b + 1.
    -118 → 100/118 ≈ 0.8475   (risk 118 to win 100)
    +113 → 1.13               (risk 100 to win 113)
  Kelly and EVI are defined in terms of this net b. This matches the frontend
  FE engine. (The separate gg/utils/odds_converter.american_to_decimal
  returns FULL decimal rounded to 4dp — that is a DISPLAY helper and must never
  be used inside these formulas.)
"""

from __future__ import annotations


def am_to_decimal(american: int) -> float:
    """American odds → net profit multiplier b (decimal_odds − 1)."""
    return american / 100 if american > 0 else 100 / abs(american)


def implied_prob(american: int) -> float:
    """American odds → break-even (implied) probability."""
    return (
        100 / (american + 100)
        if american > 0
        else abs(american) / (abs(american) + 100)
    )


def kelly(p: float, american: int) -> float:
    """Full Kelly fraction of bankroll. Floors at 0 — never bet a negative edge.

    f* = p − q/b,  where b = net multiplier, q = 1 − p.
    Written as p − q/b rather than (b·p − q)/b: algebraically identical but the
    simplified form avoids an extra multiply then divide, giving a floating-point
    result within machine epsilon of the rational value — matching the vectors.
    """
    b = am_to_decimal(american)
    return max(0.0, p - (1 - p) / b)


def evi(p: float, american: int) -> float:
    """Expected Value Index: expected profit per unit staked, as a percent."""
    b = am_to_decimal(american)
    q = 1 - p
    return (p * b - q) * 100
