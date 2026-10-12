"""
gg.cli — the one entry point for the engine.

  python -m gg.cli --date 2026-09-10 --dry-run      evaluate picks for a date
  python -m gg.cli --week 7 --season 2026           evaluate picks for a week
  python -m gg.cli --current                        evaluate the current NFL week
  python -m gg.cli odds [--week 7 --season 2026]    pull lines (default: current week)
  python -m gg.cli grade [--dry-run]                record scores, settle picks

Thin wrapper: parse args, call the pipeline, print, set the exit code.
Picks for games that have already kicked off are never touched (see
gg.pipeline.write.PickLockedError); a non-zero exit means a real failure.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime

from gg.season import ET, current_season_week, week_end_exclusive


def _resolve_week(args) -> tuple[int, int]:
    if getattr(args, "week", None):
        return args.season, args.week
    return current_season_week(datetime.now(ET).date())


def _cmd_odds(argv: list[str]) -> int:
    from gg.pipeline.odds_client import ingest_week

    p = argparse.ArgumentParser(prog="gg.cli odds")
    p.add_argument("--week", type=int)
    p.add_argument("--season", type=int, default=2026)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args(argv)
    season, week = _resolve_week(args)
    cutoff = week_end_exclusive(season, week).isoformat()
    res = ingest_week(season, week, before=cutoff, dry_run=args.dry_run)
    print(
        f"odds season={season} week={week} events={res.events_seen} games={res.games_upserted} "
        f"snapshot_rows={res.snapshot_rows_written} errors={len(res.errors)} dry_run={args.dry_run}"
    )
    for err in res.errors:
        print(f"  - {err}")
    return 1 if res.errors else 0


def _cmd_grade(argv: list[str]) -> int:
    from gg.pipeline.grade import run_grade

    p = argparse.ArgumentParser(prog="gg.cli grade")
    p.add_argument("--dry-run", action="store_true", help="Run everything, then roll back")
    p.add_argument("--days-from", type=int, default=3, help="Look back this many days for final scores (max 3)")
    args = p.parse_args(argv)
    res = run_grade(dry_run=args.dry_run, days_from=args.days_from)
    print(f"grade scores_recorded={res.scores_recorded} graded={len(res.graded)} "
          f"skipped={len(res.skipped)} dry_run={args.dry_run}")
    for line in res.graded:
        print(f"  graded: {line}")
    for line in res.skipped:
        print(f"  skipped: {line}")
    if res.needs_review:
        print("NEEDS EDITORIAL POST-MORTEM (auto text stored):")
        for line in res.needs_review:
            print(f"  - {line}")
    return 0


def _cmd_picks(argv: list[str]) -> int:
    from gg.pipeline.run import run_for_date, run_for_week

    parser = argparse.ArgumentParser(description="Run the GuerillaGenics pick pipeline")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--date", help="Game date, YYYY-MM-DD (evaluated in America/New_York)")
    group.add_argument("--week", type=int, help="NFL week number (use with --season)")
    group.add_argument("--current", action="store_true", help="The current NFL week (from gg.season)")
    parser.add_argument("--season", type=int, default=2026, help="Season year, used with --week")
    parser.add_argument("--dry-run", action="store_true", help="Evaluate and print the full payload; write nothing")
    args = parser.parse_args(argv)

    if args.date:
        result = run_for_date(date.fromisoformat(args.date), dry_run=args.dry_run)
    else:
        season, week = (args.season, args.week) if args.week else current_season_week(datetime.now(ET).date())
        result = run_for_week(season, week, dry_run=args.dry_run)

    print(
        f"run_id={result.run_id} evaluated={result.evaluated} published={result.published} "
        f"skipped={result.skipped} locked={result.locked} dry_run={args.dry_run}"
    )
    if result.errors:
        print("ERRORS:")
        for err in result.errors:
            print(f"  - {err}")

    print("\nFull payload:")
    print(json.dumps(result.snapshots, indent=2, default=str))
    return 1 if result.errors else 0


def main(argv: list[str] | None = None) -> None:
    argv = list(sys.argv[1:] if argv is None else argv)
    commands = {"odds": _cmd_odds, "grade": _cmd_grade}
    if argv and argv[0] in commands:
        code = commands[argv[0]](argv[1:])
    else:
        code = _cmd_picks(argv)
    sys.exit(code)


if __name__ == "__main__":
    main()
