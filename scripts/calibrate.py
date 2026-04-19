"""
Isotonic regression calibration of raw CFS champion probabilities.
Fits a calibration curve on historical data and prints recommended
probability remapping bins.

Usage: python scripts/calibrate.py --sport nba [--seasons 2021-22,2022-23]
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    from sklearn.isotonic import IsotonicRegression
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from scripts.backtest import fetch_records, _synthetic_demo


def platt_calibrate(probs: np.ndarray, outcomes: np.ndarray) -> tuple[float, float]:
    """Fit logistic (Platt) calibration: sigmoid(A*f + B)."""
    from scipy.optimize import minimize

    def nll(params):
        a, b = params
        p_cal = 1 / (1 + np.exp(-(a * probs + b)))
        p_cal = np.clip(p_cal, 1e-9, 1 - 1e-9)
        return -np.mean(outcomes * np.log(p_cal) + (1 - outcomes) * np.log(1 - p_cal))

    res = minimize(nll, [1.0, 0.0], method="Nelder-Mead")
    return float(res.x[0]), float(res.x[1])


def calibrate(sport: str, seasons: list[str]) -> dict:
    records = fetch_records(sport, seasons)
    if not records:
        print(f"[calibrate] No DB records for {sport} {seasons} — using synthetic demo.")
        records = _synthetic_demo(sport, seasons)

    probs = np.array([r.predicted_prob for r in records])
    outcomes = np.array([r.outcome for r in records], dtype=float)

    result: dict = {"sport": sport, "seasons": seasons, "n": len(records)}

    # Platt scaling
    try:
        from scipy.optimize import minimize
        a, b = platt_calibrate(probs, outcomes)
        cal_probs = 1 / (1 + np.exp(-(a * probs + b)))
        raw_brier = float(np.mean((probs - outcomes) ** 2))
        cal_brier = float(np.mean((cal_probs - outcomes) ** 2))
        result["platt"] = {"a": round(a, 6), "b": round(b, 6),
                           "brier_raw": round(raw_brier, 5),
                           "brier_calibrated": round(cal_brier, 5)}
    except ImportError:
        result["platt"] = "scipy not installed"

    # Isotonic regression binning
    if SKLEARN_AVAILABLE:
        iso = IsotonicRegression(out_of_bounds="clip")
        iso.fit(probs, outcomes)
        bins = []
        for lo in np.arange(0, 1, 0.05):
            hi = min(lo + 0.05, 1.0)
            mid = (lo + hi) / 2
            bins.append({"raw": round(float(mid), 3), "calibrated": round(float(iso.predict([mid])[0]), 4)})
        result["isotonic_bins"] = bins
    else:
        result["isotonic_bins"] = "scikit-learn not installed"

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Calibrate CFS probabilities")
    parser.add_argument("--sport", choices=["nba", "mlb", "nfl"], default="nba")
    parser.add_argument("--seasons", default="2021-22,2022-23,2023-24")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    seasons = [s.strip() for s in args.seasons.split(",")]
    result = calibrate(args.sport, seasons)
    print(json.dumps(result, indent=2))

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"[calibrate] Written to {args.output}")


if __name__ == "__main__":
    main()
