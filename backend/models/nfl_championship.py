"""
NFL Super Bowl probability model.
"""

from formulas.composite_futures import rank_teams
from formulas.market_inefficiency import compute_mid
from formulas.kelly_criterion import kelly_from_american
from utils.logger import get_logger

logger = get_logger(__name__)


def compute_nfl_championship_probs(teams: list[dict], odds_map: dict | None = None) -> list[dict]:
    ranked = rank_teams(teams)
    total_cfs = sum(t["cfs_score"] for t in ranked)

    results = []
    for team in ranked:
        tid = team["team_id"]
        champ_prob = round(team["cfs_score"] / total_cfs, 4) if total_cfs else 0.0

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
