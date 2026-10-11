"""Sport-agnostic betting math: american_to_profit, evi, kelly.

`american_to_profit` is NOT reimplemented here — it re-exports
backend/formulas/betting_math.am_to_decimal, the repo's existing
canonical conversion (policed by shared/betting_vectors.json against
pytest AND the frontend's vitest mirror, per that module's own
docstring). Reimplementing it here would be exactly the kind of drift
that cross-stack vector system exists to prevent, for a function with
zero reason to differ.

evi/kelly ARE new here, not a rename of betting_math's same-named
functions — and that's deliberate, not an accident of naming:

  backend/formulas/betting_math.evi / .kelly   — two-outcome (p, 1-p).
    Correct for moneylines and futures, where there is no push.

  gg.pipeline.model.shared.evi / .kelly (below) — three-outcome
    (p_win, p_push, p_loss). Required for spread bets on integer
    numbers, where a push is a real, non-negligible outcome (stake
    returned, no win or loss). Feeding a two-outcome formula p_win and
    silently treating p_loss = 1 - p_win overstates effective bet
    frequency by the push mass — this is the exact "naive
    implementations get EV wrong" trap the task spec calls out by name.

Same names, different modules, different bet shapes. Not duplication.
"""

from __future__ import annotations

import os
import sys

_BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend")
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from formulas.betting_math import am_to_decimal as american_to_profit  # noqa: E402


def evi(p_win: float, p_push: float, p_loss: float, odds: int) -> float:
    """Expected value per unit staked, as a percentage. Pushes return stake
    (contribute 0 to profit, not a loss) — ported from examples/gg_sim.py."""
    b = american_to_profit(odds)
    return (p_win * b - p_loss * 1.0) * 100.0


def kelly(p_win: float, p_push: float, p_loss: float, odds: int, fraction: float = 0.5) -> float:
    """Fractional Kelly (default half-Kelly), conditioned on a non-push
    outcome — normalizes p_win/p_loss by their combined mass before
    applying the standard Kelly formula, since push probability isn't a
    bet outcome to size for. Ported from examples/gg_sim.py. Percent of
    bankroll."""
    live = p_win + p_loss
    if live <= 0:
        return 0.0
    p, q = p_win / live, p_loss / live
    b = american_to_profit(odds)
    f = (b * p - q) / b
    return max(0.0, f * fraction * 100.0)
