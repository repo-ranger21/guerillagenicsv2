"""
Historical backtest for CFS (Composite Futures Score) vs market outcomes.
Usage: python scripts/backtest.py --sport nba --seasons 2021-22,2022-23,2023-24

Outputs per-season metrics: Brier score, ROI at quarter-Kelly, calibration table.
"""
import argparse
import json
import os
import sys
from dataclasses import dataclass, field

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.db.client import get_supabase_client
from backend.formulas.kelly_criterion import kelly_from_american


@dataclass
class BacktestRecord:
    team: str
    season: str
    sport: str
    predicted_prob: float
    market_prob: float
    american_odds: int
    outcome: int  # 1 = won championship, 0 = did not


@dataclass
class BacktestResult:
    sport: str
    seasons: list[str]
    n_records: int
    brier_score: float
    roi: float
    calibration: list[dict] = field(default_factory=list)


def fetch_records(sport: str, seasons: list[str]) -> list[BacktestRecord]:
    db = get_supabase_client()
    result = (
        db.table("model_snapshots")
        .select("*")
        .eq("sport", sport)
        .in_("season", seasons)
        .execute()
    )
    records = []
    for row in result.data:
        payload = row.get("payload", {})
        teams = payload.get("teams", [])
        champion = payload.get("champion")
        for t in teams:
            abbrev = t.get("abbreviation", t.get("team_id", ""))
            records.append(
                BacktestRecord(
                    team=abbrev,
                    season=row["season"],
                    sport=sport,
                    predicted_prob=t.get("champion_prob", 0.0),
                    market_prob=t.get("market_prob", 0.0),
                    american_odds=t.get("american_odds", 10000),
                    outcome=1 if abbrev == champion else 0,
                )
            )
    return records


def brier_score(records: list[BacktestRecord]) -> float:
    if not records:
        return float("nan")
    return float(np.mean([(r.predicted_prob - r.outcome) ** 2 for r in records]))


def simulate_roi(records: list[BacktestRecord], kelly_fraction: float = 0.25) -> float:
    bankroll = 1000.0
    for r in records:
        if r.american_odds == 0 or r.market_prob <= 0:
            continue
        kelly = kelly_from_american(r.predicted_prob, r.american_odds)
        unit = bankroll * kelly.quarter_kelly * kelly_fraction
        if unit <= 0:
            continue
        decimal = (100 / abs(r.american_odds) + 1) if r.american_odds < 0 else (r.american_odds / 100 + 1)
        if r.outcome == 1:
            bankroll += unit * (decimal - 1)
        else:
            bankroll -= unit
    return (bankroll - 1000.0) / 1000.0


def calibration_table(records: list[BacktestRecord], bins: int = 10) -> list[dict]:
    edges = np.linspace(0, 1, bins + 1)
    rows = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        bucket = [r for r in records if lo <= r.predicted_prob < hi]
        if not bucket:
            continue
        rows.append(
            {
                "bin": f"{lo:.1f}–{hi:.1f}",
                "n": len(bucket),
                "mean_predicted": round(float(np.mean([r.predicted_prob for r in bucket])), 4),
                "actual_win_rate": round(float(np.mean([r.outcome for r in bucket])), 4),
            }
        )
    return rows


def run_backtest(sport: str, seasons: list[str]) -> BacktestResult:
    records = fetch_records(sport, seasons)
    if not records:
        print(f"[backtest] No records found for {sport} {seasons}. Using synthetic demo data.")
        records = _synthetic_demo(sport, seasons)

    return BacktestResult(
        sport=sport,
        seasons=seasons,
        n_records=len(records),
        brier_score=round(brier_score(records), 5),
        roi=round(simulate_roi(records), 4),
        calibration=calibration_table(records),
    )


def _synthetic_demo(sport: str, seasons: list[str]) -> list[BacktestRecord]:
    """Generate plausible synthetic records so the script always produces output."""
    rng = np.random.default_rng(42)
    records = []
    for season in seasons:
        n_teams = 30
        probs = rng.dirichlet(np.ones(n_teams) * 2)
        winner_idx = rng.choice(n_teams, p=probs)
        for i in range(n_teams):
            mp = float(rng.beta(2, 8))
            ao = int(100 / mp - 100) if mp > 0.5 else int(-(100 / (1 - mp) - 100))
            records.append(
                BacktestRecord(
                    team=f"T{i:02d}",
                    season=season,
                    sport=sport,
                    predicted_prob=float(probs[i]),
                    market_prob=mp,
                    american_odds=ao,
                    outcome=1 if i == winner_idx else 0,
                )
            )
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest CFS model against historical outcomes")
    parser.add_argument("--sport", choices=["nba", "mlb", "nfl"], default="nba")
    parser.add_argument("--seasons", default="2021-22,2022-23,2023-24",
                        help="Comma-separated list of seasons")
    parser.add_argument("--output", default=None, help="Write JSON results to file")
    args = parser.parse_args()

    seasons = [s.strip() for s in args.seasons.split(",")]
    result = run_backtest(args.sport, seasons)

    output = {
        "sport": result.sport,
        "seasons": result.seasons,
        "n_records": result.n_records,
        "brier_score": result.brier_score,
        "roi_quarter_kelly": result.roi,
        "calibration": result.calibration,
    }

    print(json.dumps(output, indent=2))

    if args.output:
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2)
        print(f"[backtest] Results written to {args.output}")


if __name__ == "__main__":
    main()
