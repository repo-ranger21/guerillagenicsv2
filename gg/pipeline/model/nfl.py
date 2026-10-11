"""NFL spread model — calibrated constants.

The Monte Carlo functions (simulate_margin, cover_probabilities,
analytic_cover) land here in Step 5, ported from the working prototype
at examples/gg_sim.py. This module exists now, ahead of that step,
because week1_math.py (Step 4) needs CARRY/K to blend prior- and
current-season team ratings, and these constants must live in exactly
one place with their provenance stated honestly — not scattered or
guessed at the point of use.

Provenance, stated plainly rather than aspirationally:

  SIGMA, HFA   — taken from examples/gg_sim.py, the working NFL spread
                 Monte Carlo already in this repo (NFL_MARGIN_SIGMA,
                 HOME_FIELD_PTS), and confirmed against the project's
                 own skill doc ("HFA ≈ 1.8, compressed post-2020";
                 "σ ≈ 13.2"). This is the only pair of values actually
                 grounded in this codebase.

  CARRY, K     — PROVISIONAL. Nothing in this repo computes or has ever
                 used these two constants. There is no walk-forward
                 backtest over 1,087 games (2022-2025) anywhere in this
                 codebase: scripts/backtest.py and scripts/calibrate.py
                 both backtest a different model entirely (CFS
                 championship-futures Brier score / ROI, not NFL
                 spreads), pull from model_snapshots, and silently fall
                 back to fabricated synthetic data when no real record
                 exists. Do not cite that file as this pair's source.
                 CARRY=0.40 / K=10 are used here because the task asked
                 for them as a starting point, not because they have
                 been validated against real results. Real calibration
                 is a separate, later task.

  N            — 100,000 simulations. Matches examples/gg_sim.py and
                 the convergence-check pattern already proven there.

Do not change these values casually. If SIGMA/HFA drift from
examples/gg_sim.py, or CARRY/K get a real backtest, update the
provenance note above in the same commit as the number.
"""

CARRY = 0.40   # between-season regression toward mean — PROVISIONAL, see module docstring
K = 10         # within-season shrinkage constant     — PROVISIONAL, see module docstring
HFA = 1.8      # empirical home field, post-2020 compression — from examples/gg_sim.py
SIGMA = 13.2   # residual std dev of NFL final margins        — from examples/gg_sim.py
N = 100_000    # simulations; convergence-checked vs closed form in examples/gg_sim.py

# Known limitation, carried forward from examples/gg_sim.py and the project
# skill doc: margins of exactly 3 occur far more often than a normal model
# predicts (documented elsewhere as ~14-15% actual vs a normal's ~3-6%). The
# empirical margin sampler that fixes this is a later task. Do not attempt
# it here, and do not silently paper over it — SIGMA is not the parameter
# that would fix it.


import numpy as np


def simulate_margin(edge_pts: float, sigma: float, n: int, seed: int) -> np.ndarray:
    """Pure: simulated final margins from the bet team's perspective. No I/O —
    a random seed is a number in, an array is the number out. Ported from
    examples/gg_sim.py."""
    rng = np.random.default_rng(seed)
    return rng.normal(loc=edge_pts, scale=sigma, size=n)


def cover_probabilities(margins: np.ndarray, spread: float) -> tuple[float, float, float]:
    """Pure: (win, push, loss) probabilities. spread is signed from the bet
    team's view: -2.5 favourite, +3 dog. Ported from examples/gg_sim.py."""
    adj = margins + spread
    push = float(np.mean(np.isclose(adj, 0.0, atol=1e-9)))
    win = float(np.mean(adj > 0))
    return win, push, 1.0 - win - push


def analytic_cover(edge_pts: float, spread: float, sigma: float) -> float:
    """Closed form for the same normal model. The Monte Carlo simulation
    must converge to this — see tests/test_gg_pipeline/test_nfl_model.py,
    which asserts convergence within 0.2 probability points at N=100,000.
    That check is the cheapest guarantee of correctness available and
    stays permanently, per the project skill doc. Ported from
    examples/gg_sim.py."""
    from math import erf, sqrt

    z = (edge_pts + spread) / sigma
    return 0.5 * (1.0 + erf(z / sqrt(2.0)))
