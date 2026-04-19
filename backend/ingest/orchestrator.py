"""
Master ingest orchestrator — runs all sport pipelines in sequence.
Called by nightly-ingest.yml: python backend/ingest/orchestrator.py --sport all
"""

import argparse
import sys
import os
import requests
from datetime import datetime
from ingest.nba_pipeline import run_nba_pipeline
from ingest.mlb_pipeline import run_mlb_pipeline
from ingest.nfl_pipeline import run_nfl_pipeline
from utils.logger import get_logger

logger = get_logger(__name__)

PIPELINES = {
    "nba": run_nba_pipeline,
    "mlb": run_mlb_pipeline,
    "nfl": run_nfl_pipeline,
}


def send_slack_alert(message: str) -> None:
    webhook = os.getenv("SLACK_WEBHOOK")
    if not webhook:
        return
    try:
        requests.post(webhook, json={"text": message}, timeout=10)
    except Exception as e:
        logger.warning("slack_alert_failed", error=str(e))


def run_all(sports: list[str]) -> dict:
    start = datetime.utcnow()
    results = {}
    errors = []

    for sport in sports:
        fn = PIPELINES.get(sport)
        if not fn:
            logger.warning("unknown_sport", sport=sport)
            continue
        try:
            logger.info("pipeline_start", sport=sport)
            result = fn()
            results[sport] = {"status": "ok", "data": result}
            logger.info("pipeline_complete", sport=sport, teams=result.get("teams_processed"))
        except Exception as e:
            logger.error("pipeline_failed", sport=sport, error=str(e))
            results[sport] = {"status": "error", "error": str(e)}
            errors.append(f"{sport}: {e}")

    elapsed = (datetime.utcnow() - start).seconds
    if errors:
        send_slack_alert(
            f":rotating_light: GuerillaGenics nightly ingest FAILED\n"
            f"Sports with errors: {', '.join(errors)}\n"
            f"Elapsed: {elapsed}s"
        )
    else:
        logger.info("orchestrator_complete", sports=sports, elapsed_sec=elapsed)

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sport", default="all",
                        help="Sport to ingest: nba, mlb, nfl, or all")
    args = parser.parse_args()

    if args.sport == "all":
        sports = list(PIPELINES.keys())
    elif args.sport in PIPELINES:
        sports = [args.sport]
    else:
        print(f"Unknown sport: {args.sport}", file=sys.stderr)
        sys.exit(1)

    results = run_all(sports)
    failed = [s for s, r in results.items() if r["status"] == "error"]
    if failed:
        sys.exit(1)
