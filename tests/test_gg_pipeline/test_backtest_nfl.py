"""Calibration checks for scripts/backtest_nfl.py, on synthetic data (no downloads).

A backtest is a measuring instrument, so it is tested like one: against cases
whose answer is known.
  - model == closing line  -> only the vig is lost (about -4.5% ROI)
  - no-skill model         -> same
  - residual-shuffle null  -> same, on average
  - perfect foresight      -> huge positive ROI (the script can detect edge)
Shuffling raw results is NOT a valid null: it breaks the link between line
and result that a line-following strategy depends on. Shuffle the error
around the line instead.
"""
import importlib
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
b = importlib.import_module("backtest_nfl")

VIG_ROI = -100 * (1 - 0.5 * (100 / 110 + 1))  # -4.545...: a fair coin at -110


def _games(n=1000, seed=7):
    rng = np.random.default_rng(seed)
    spread = np.round(rng.normal(1.5, 6.0, n) * 2) / 2  # half-point lines, home-favoured positive
    result = np.round(spread + rng.normal(0, 12.5, n))
    return pd.DataFrame({"spread": spread, "result": result})


def _roi(df, margin):
    return b.summarize(b.bets(df, np.asarray(margin, dtype=float), b.SIGMA))["roi"]


def test_model_equal_to_line_loses_only_the_vig():
    df = _games()
    assert abs(_roi(df, df.spread) - VIG_ROI) < 6.0


def test_no_skill_model_loses_only_the_vig():
    df = _games()
    noise = np.random.default_rng(3).normal(0, 3.0, len(df))
    assert abs(_roi(df, df.spread + noise) - VIG_ROI) < 7.0


def test_residual_shuffle_null_centres_on_the_vig():
    df = _games(n=800)
    margin = df.spread.to_numpy() + np.random.default_rng(5).normal(0, 3.0, len(df))
    resid = (df.result - df.spread).to_numpy()
    rois = []
    for seed in range(20):
        d = df.copy()
        d["result"] = d.spread.to_numpy() + np.random.default_rng(seed).permutation(resid)
        rois.append(_roi(d, margin))
    assert abs(np.mean(rois) - VIG_ROI) < 3.0


def test_perfect_foresight_is_detected():
    df = _games()
    assert _roi(df, df.result) > 50.0


def test_summarize_counts_and_roi():
    df = pd.DataFrame({"profit": [100 / 110, -1.0, 0.0, 100 / 110], "win": [True, False, False, True],
                       "push": [False, False, True, False]})
    s = b.summarize(df)
    assert (s["n"], s["w"], s["l"], s["push"]) == (4, 2, 1, 1)
    assert abs(s["win_pct"] - 200 / 3) < 1e-9
    assert abs(s["roi"] - (2 * 100 / 110 - 1) / 4 * 100) < 1e-9


def test_bet_profit_and_push_handling():
    # home -3 (spread_line 3): home wins by 3 -> push; by 7 -> home covers
    df = pd.DataFrame({"spread": [3.0, 3.0], "result": [3.0, 7.0]})
    margin = np.array([10.0, 10.0])  # model loves the home side
    out = b.bets(df, margin, b.SIGMA)
    assert out.home.all()
    assert out.push.tolist() == [True, False]
    assert out.profit.round(4).tolist() == [0.0, round(100 / 110, 4)]


def test_vectorised_blend_matches_production_blend_rating():
    rng = np.random.default_rng(1)
    n = 150
    df = pd.DataFrame({
        "rp_h": rng.normal(0, 3, n), "rp_a": rng.normal(0, 3, n), "lm": 0.2,
        "rc_h": rng.normal(0, 3, n), "rc_a": rng.normal(0, 3, n),
        "gp_h": rng.integers(0, 10, n), "gp_a": rng.integers(0, 10, n)})
    b.check_blend_matches_production(df)  # asserts on row 100
