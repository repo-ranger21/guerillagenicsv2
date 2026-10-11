"""
gg.cli — python -m gg.cli --date 2026-09-10 --dry-run
         python -m gg.cli --week 3 --season 2026 --dry-run

Thin wrapper around run_for_date()/run_for_week(): parse args, call one,
print the result. No pipeline logic of its own — this is the same code
api/routes/pipeline.py calls, so what gets verified here by eye is
exactly what runs when n8n hits the API.
"""

from __future__ import annotations

import argparse
import json
from datetime import date

from gg.pipeline.run import run_for_date, run_for_week


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the GuerillaGenics pick pipeline")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--date", help="Game date, YYYY-MM-DD (evaluated in America/New_York)")
    group.add_argument("--week", type=int, help="NFL week number (use with --season)")
    parser.add_argument("--season", type=int, default=2026, help="Season year, used with --week")
    parser.add_argument("--dry-run", action="store_true", help="Evaluate and print the full payload; write nothing")
    args = parser.parse_args()

    if args.date:
        game_date = date.fromisoformat(args.date)
        result = run_for_date(game_date, dry_run=args.dry_run)
    else:
        result = run_for_week(args.season, args.week, dry_run=args.dry_run)

    print(
        f"run_id={result.run_id} evaluated={result.evaluated} published={result.published} "
        f"skipped={result.skipped} dry_run={args.dry_run}"
    )
    if result.errors:
        print("ERRORS:")
        for err in result.errors:
            print(f"  - {err}")

    print("\nFull payload:")
    print(json.dumps(result.snapshots, indent=2, default=str))


if __name__ == "__main__":
    main()
