"""
NFL team ratings from nflverse play-by-play — 2026 Week 1 cold start.

Thin CLI wrapper around gg.pipeline.nfl_ratings — all the actual math and
the nflverse fetch live there now, shared with gg.pipeline.ingest_nfl_team_features
(the version that writes rows instead of printing them).

This script only prints. It does not write to any database.

Usage:
  python scripts/week1_math.py --season 2025
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from gg.pipeline.model.nfl import CARRY, K
from gg.pipeline.nfl_ratings import (
    compute_all_ratings,
    compute_team_epa_stats,
    blend_rating,
    fetch_play_by_play,
    filter_regular_season,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="NFL team ratings from nflverse play-by-play")
    parser.add_argument("--season", type=int, default=2025, help="Play-by-play season to pull (default: 2025)")
    args = parser.parse_args()

    print(f"[week1_math] Fetching {args.season} play-by-play from nflverse...")
    pbp = fetch_play_by_play(args.season)
    print(f"[week1_math] {len(pbp):,} plays loaded.")
    pbp = filter_regular_season(pbp)
    print(f"[week1_math] {len(pbp):,} regular-season plays after dropping postseason.")

    teams = sorted(set(pbp["posteam"].dropna()) | set(pbp["defteam"].dropna()))
    teams = [t for t in teams if t]  # drop any blank/NaN-derived entries
    print(f"[week1_math] {len(teams)} teams found in {args.season} play-by-play.")

    ratings = compute_all_ratings(pbp, teams, CARRY, K)

    print(f"\n[week1_math] CARRY={CARRY} K={K} (gp=0 for this run -- see confirmation below)\n")
    header = f"{'team':<5} {'gp':>3} {'epa_off':>8} {'epa_def':>8} {'ppg':>6} {'net_epa':>8} {'raw_rtg':>8} {'blended':>8}"
    print(header)
    print("-" * len(header))
    for r in ratings:
        print(
            f"{r.team:<5} {r.games_played:>3} {r.epa_play_off:>8.4f} {r.epa_play_def:>8.4f} "
            f"{r.plays_per_game:>6.1f} {r.net_epa_per_play:>8.4f} "
            f"{r.raw_rating_pts_per_game:>8.2f} {r.blended_rating_pts_per_game:>8.2f}"
        )

    # Confirmation: K has no effect at gp=0, proven by running the blend
    # with three very different k values and asserting identical output.
    all_raw_stats = [compute_team_epa_stats(pbp, t) for t in teams]
    league_mean_prior = sum(s["raw_rating_pts_per_game"] for s in all_raw_stats) / len(all_raw_stats)
    sample_raw = next(s for s in all_raw_stats if s["team"] == ratings[0].team)
    results_by_k = {
        k_val: blend_rating(sample_raw["raw_rating_pts_per_game"], league_mean_prior, 0.0, 0, CARRY, k_val)
        for k_val in (1, 10, 500)
    }
    assert len(set(results_by_k.values())) == 1, (
        f"K should have zero effect at gp=0, got different results: {results_by_k}"
    )
    print(
        f"\n[week1_math] Confirmed: blended rating for {ratings[0].team} at gp=0 is identical "
        f"across k in {list(results_by_k)} -> {next(iter(results_by_k.values())):.4f}"
    )


if __name__ == "__main__":
    main()
