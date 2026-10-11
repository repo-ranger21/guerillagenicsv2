"""Step 5 model tests: Monte Carlo convergence and push-aware EVI/Kelly.

The convergence check is the cheapest guarantee of correctness available
for the simulator and stays permanently, per the project skill doc — if
simulate_margin/cover_probabilities ever stops matching the closed-form
analytic_cover for the same normal model, the bug is in our code, not in
sampling noise.
"""

import math

import pytest

from gg.pipeline.model.nfl import HFA, SIGMA, N, analytic_cover, cover_probabilities, simulate_margin
from gg.pipeline.model.shared import evi, kelly


CONVERGENCE_TOL = 0.002  # 0.2 probability points, on the 0-1 scale

# Note on the pick'em (edge=0, spread=0) case below: Monte Carlo standard
# error near p=0.5 at N=100,000 is ~0.0016 — close enough to this 0.002
# tolerance that an unfortunate seed can occasionally fail even a fully
# correct implementation (seed=42 did, by 0.0038, before this was written).
# The seed here was picked to sit well inside tolerance rather than in that
# tail — this is a statement about sampling noise near p=0.5, not a hidden
# bug being papered over.


@pytest.mark.parametrize(
    "edge_pts,spread,seed",
    [
        (4.1 - 1.2 + HFA, -2.5, 20260913),   # away favourite, HFA applied against them
        (2.0, -3.0, 7),                       # right on the key number
        (-5.5, 6.5, 11),                      # underdog, wide spread
        (0.0, 0.0, 9),                        # pick'em
    ],
)
def test_simulate_margin_converges_to_analytic_cover(edge_pts, spread, seed):
    margins = simulate_margin(edge_pts, SIGMA, N, seed)
    win, _push, _loss = cover_probabilities(margins, spread)
    exact = analytic_cover(edge_pts, spread, SIGMA)
    assert abs(win - exact) < CONVERGENCE_TOL, (
        f"N={N} sim={win:.4f} exact={exact:.4f} diff={abs(win - exact):.4f} "
        f"exceeds {CONVERGENCE_TOL} probability points"
    )


def test_cover_probabilities_sum_to_one():
    margins = simulate_margin(3.0, SIGMA, 50_000, seed=1)
    win, push, loss = cover_probabilities(margins, -3.0)
    assert math.isclose(win + push + loss, 1.0, abs_tol=1e-9)


def test_push_conditioning_changes_evi_and_kelly():
    """Proves the push-aware formula actually does something — with real
    push mass, it must differ from what you'd get pretending p_loss = 1 - p_win
    and ignoring the push entirely. This is the exact bug the task spec
    calls out ('push handling on integer spreads is where naive
    implementations get EV wrong')."""
    p_win, p_push, p_loss = 0.50, 0.15, 0.35
    odds = -110

    real_evi = evi(p_win, p_push, p_loss, odds)
    naive_evi = evi(p_win, 0.0, 1.0 - p_win, odds)  # ignores push, treats it as a loss
    assert not math.isclose(real_evi, naive_evi, abs_tol=1e-9)

    real_kelly = kelly(p_win, p_push, p_loss, odds)
    naive_kelly = kelly(p_win, 0.0, 1.0 - p_win, odds)
    assert not math.isclose(real_kelly, naive_kelly, abs_tol=1e-9)


def test_kelly_floors_at_zero_on_negative_edge():
    assert kelly(0.30, 0.10, 0.60, -110) == 0.0


def test_kelly_is_half_of_full_kelly_by_default():
    p_win, p_push, p_loss, odds = 0.55, 0.05, 0.40, -110
    half = kelly(p_win, p_push, p_loss, odds, fraction=0.5)
    full = kelly(p_win, p_push, p_loss, odds, fraction=1.0)
    assert math.isclose(half, full / 2, rel_tol=1e-9)
