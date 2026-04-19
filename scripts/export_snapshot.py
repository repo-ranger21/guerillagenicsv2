"""
Export the latest model_snapshots from Supabase to JSON files.
Usage: python scripts/export_snapshot.py --sport nba [--season 2024-25] [--out ./exports]
"""
import argparse
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.db.client import get_supabase_client


def export_snapshot(sport: str, season: str, out_dir: str) -> str:
    db = get_supabase_client()

    result = (
        db.table("model_snapshots")
        .select("*")
        .eq("sport", sport)
        .eq("season", season)
        .order("snapshot_ts", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise ValueError(f"No snapshot found for {sport} {season}")

    snapshot = result.data[0]
    os.makedirs(out_dir, exist_ok=True)

    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{sport}_{season.replace('-', '')}_{ts}.json"
    filepath = os.path.join(out_dir, filename)

    with open(filepath, "w") as f:
        json.dump(snapshot, f, indent=2, default=str)

    print(f"[export_snapshot] Exported {sport} {season} → {filepath}")
    return filepath


def main() -> None:
    parser = argparse.ArgumentParser(description="Export model snapshots to JSON")
    parser.add_argument("--sport", choices=["nba", "mlb", "nfl", "all"], default="nba")
    parser.add_argument("--season", default="2024-25")
    parser.add_argument("--out", default="./exports", help="Output directory")
    args = parser.parse_args()

    sports = ["nba", "mlb", "nfl"] if args.sport == "all" else [args.sport]
    for sport in sports:
        try:
            export_snapshot(sport, args.season, args.out)
        except ValueError as e:
            print(f"[export_snapshot] WARN: {e}")

    print("[export_snapshot] Done.")


if __name__ == "__main__":
    main()
