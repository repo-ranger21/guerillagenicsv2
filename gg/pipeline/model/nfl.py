"""NFL spread model — calibrated constants.

The Monte Carlo functions (simulate_margin, cover_probabilities,
analytic_cover) land here in Step 5, ported from the working prototype
at examples/gg_sim.py. This module exists now, ahead of that step,
because week1_math.py (Step 4) needs CARRY/K to blend prior- and
current-season team ratings, and these constants must live in exactly
one place with their provenance stated honestly — not scattered or
guessed at the point of use.

Provenance (backtest: scripts/backtest_nfl.py -> docs/BACKTEST_NFL.md,
1,087 regular-season games 2022-2025, walk-forward, no lookahead):

  HFA = 2.15   — best-fitting home-field value on the 2022-23 training
                 seasons (grid 0.0-2.5). It replaces 1.8 from
                 examples/gg_sim.py. Margin error is flat across 1.8-2.5,
                 so this is a calibration tidy-up, not a source of edge.

  SIGMA = 12.65 — residual std dev of (final margin - model margin) on the
                 training seasons. The closing line's own residual is 12.27;
                 the old 13.2 overstated spread and so understated how
                 confident the model's own cover probabilities were.

  CARRY, K     — 0.40 / 10 kept. The fitted pair (0.2 / 16) scored the
                 same out of sample (test RMSE 13.12 vs 13.10), i.e. the
                 optimum is flat; changing them would be noise-chasing.

WHAT THE BACKTEST DOES NOT SHOW: edge. The model is less accurate than the
closing line (MAE 10.00 vs 9.49), and its disagreement with the line has no
significant predictive value (t = -0.52). Published bets went 398-410-21
(-5.8% ROI at flat -110). Stated EVI is therefore an unvalidated model
output, not a measured advantage. Do not describe it as an edge.

  N            — 100,000 simulations. Matches examples/gg_sim.py and
                 the convergence-check pattern already proven there.

Do not change these values casually. Re-run scripts/backtest_nfl.py and
update the provenance note above in the same commit as any number.
"""

CARRY = 0.40   # between-season regression toward mean — flat optimum, see docstring
K = 10         # within-season shrinkage constant     — flat optimum, see docstring
HFA = 2.15     # best fit on 2022-23 walk-forward; see module docstring
SIGMA = 12.65  # residual std dev of model margin errors (2022-23 fit); see docstring
N = 100_000    # simulations; convergence-checked vs closed form in examples/gg_sim.py

# Known limitation, carried forward from examples/gg_sim.py and the project
# skill doc: margins of exactly 3 occur far more often than a normal model
# predicts (documented elsewhere as ~14-15% actual vs a normal's ~3-6%). The
# empirical margin sampler that fixes this is a later task. Do not attempt
# it here, and do not silently paper over it — SIGMA is not the parameter
# that would fix it.


import numpy as np  # noqa: E402


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
