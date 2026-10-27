import importlib
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
q = importlib.import_module("backtest_nfl_qb")


def _qbg():
    return pd.DataFrame({
        "season": [2025, 2025, 2025, 2026], "week": [1, 2, 2, 1], "team": ["A", "A", "B", "A"],
        "qb": ["q1", "q1", "q2", "q1"], "n": [40, 40, 40, 40], "epa_sum": [8.0, 8.0, -4.0, 99.0]})


def test_fit_beta_recovers_slope():
    rng = np.random.default_rng(0)
    x = rng.normal(0, 3, 4000)
    y = 0.8 * x + rng.normal(0, 5, 4000)
    beta, se = q.fit_beta(y, x)
    assert abs(beta - 0.8) < 4 * se


def test_qb_values_use_only_earlier_games_and_shrink_to_the_mean():
    val, mu = q.qb_values(_qbg(), 2026, 1, prior_n=100)  # the 2026 wk1 row (epa 99) must be excluded
    assert abs(mu - (8 + 8 - 4) / 120) < 1e-12
    assert val["q1"] < 16 / 80  # shrunk toward mu, below the raw 0.2
    assert val["q1"] > mu       # but still above league mean
    assert val["q2"] < mu


def test_team_baseline_falls_back_to_prior_season_when_no_games_played():
    qbg = _qbg()
    val, mu = q.qb_values(qbg, 2026, 1, prior_n=100)
    base = q.team_baseline(qbg, "A", 2026, 1, val, mu, k=10)
    assert abs(base - val["q1"]) < 1e-12  # gp=0: all weight on last season's QB
