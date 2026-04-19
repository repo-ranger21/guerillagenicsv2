"""
MLB World Series probability model.
"""

from formulas.composite_futures import rank_teams
from formulas.monte_carlo import simulate_bracket_mlb
from formulas.market_inefficiency import compute_mid
from formulas.kelly_criterion import kelly_from_american
from utils.logger import get_logger
import os

logger = get_logger(__name__)
SIMULATIONS = int(os.getenv("MONTE_CARLO_SIMULATIONS", 100000))


def compute_mlb_championship_probs(
    teams: list[dict],
    wildcard_matchups: list[tuple[str, str]] | None = None,
    division_winners: list[str] | None = None,
    odds_map: dict | None = None,
) -> list[dict]:
    ranked = rank_teams(teams)
    elo_map = {t["team_id"]: t.get("gg_elo", 1500.0) for t in ranked}

    if wildcard_matchups and division_winners:
        sim_results = simulate_bracket_mlb(wildcard_matchups, division_winners, elo_map, SIMULATIONS)
    else:
        total_cfs = sum(t["cfs_score"] for t in ranked)
        sim_results = {
            t["team_id"]: {"champion": round(t["cfs_score"] / total_cfs, 4) if total_cfs else 0}
            for t in ranked
        }

    results = []
    for team in ranked:
        tid = team["team_id"]
        champ_prob = sim_results.get(tid, {}).get("champion", 0.0)

        mid_data = {"mid_edge": 0.0, "tier": "FAIR", "market_prob": champ_prob, "triggered_signals": []}
        kelly_data = {"full_kelly": 0.0, "quarter_kelly": 0.0}
        best_odds = -10000

        if odds_map and team.get("abbreviation") in odds_map:
            book_odds = odds_map[team["abbreviation"]]
            flat_odds = [o for ol in book_odds.values() for o in ol]
            if flat_odds:
                best_odds = max(flat_odds)
                mid_data = compute_mid(champ_prob, book_odds)
                if mid_data.get("mid_edge", 0) > 0:
                    kelly_data = kelly_from_american(champ_prob, best_odds)

        results.append({
            **team,
            "championship_prob": champ_prob,
            "tier": mid_data["tier"],
            "mid_edge": mid_data["mid_edge"],
            "best_odds": best_odds,
            "quarter_kelly": kelly_data["quarter_kelly"],
        })

    return results
