"""
Player award futures model — MVP, Cy Young, DPOY, ROTY.
Scores candidates using weighted per-game/season stats and narrative factors.
"""

from utils.normalizer import normalize_0_100
from utils.odds_converter import american_to_implied_prob, remove_vig_from_odds
from utils.logger import get_logger

logger = get_logger(__name__)

AWARD_WEIGHTS = {
    "nba_mvp": {"pts": 0.25, "ast": 0.15, "reb": 0.10, "ts_pct": 0.15,
                "bpm": 0.20, "vorp": 0.10, "win_shares": 0.05},
    "nba_dpoy": {"blk": 0.20, "stl": 0.20, "def_rating": 0.30,
                 "def_bpm": 0.20, "win_shares_def": 0.10},
    "nba_roty": {"pts": 0.30, "ast": 0.15, "reb": 0.10, "ts_pct": 0.15,
                 "bpm": 0.15, "win_shares": 0.15},
    "mlb_mvp": {"war": 0.40, "ops_plus": 0.25, "rbi": 0.10,
                "hr": 0.10, "wrc_plus": 0.15},
    "mlb_cy_young": {"war": 0.35, "era_plus": 0.25, "fip": 0.20,
                     "k_9": 0.10, "whip": 0.10},
    "mlb_roty": {"war": 0.40, "ops_plus": 0.30, "wrc_plus": 0.30},
    "nfl_mvp": {"passer_rating": 0.25, "qbr": 0.20, "td_int": 0.20,
                "yards": 0.15, "win_pct": 0.20},
}


def score_candidate(stats: dict, sport: str, award: str) -> float:
    key = f"{sport}_{award}"
    weights = AWARD_WEIGHTS.get(key)
    if not weights:
        return 50.0
    raw = sum(float(stats.get(stat, 0)) * w for stat, w in weights.items())
    return round(raw, 4)


def rank_candidates(
    players: list[dict],
    sport: str,
    award: str,
    odds_map: dict[str, list[int]] | None = None,
) -> list[dict]:
    scores = [score_candidate(p.get("stats", {}), sport, award) for p in players]
    mn, mx = min(scores, default=0), max(scores, default=1)
    results = []
    for player, raw_score in zip(players, scores):
        gg_prob = normalize_0_100(raw_score, mn, mx) / 100

        market_prob = 0.0
        american_odds = None
        edge_dir = "FAIR"
        edge_pct = 0.0
        if odds_map and player.get("player_name") in odds_map:
            player_odds = odds_map[player["player_name"]]
            if player_odds:
                american_odds = max(player_odds)
                market_prob = american_to_implied_prob(american_odds)
                edge_pct = round(gg_prob - market_prob, 4)
                edge_dir = "VALUE" if edge_pct > 0.02 else ("FADE" if edge_pct < -0.02 else "FAIR")

        results.append({
            **player,
            "gg_prob": round(gg_prob, 4),
            "market_prob": round(market_prob, 4),
            "american_odds": american_odds,
            "edge_direction": edge_dir,
            "edge_pct": edge_pct,
        })

    results.sort(key=lambda x: x["gg_prob"], reverse=True)
    for i, r in enumerate(results, 1):
        r["rank_position"] = i
    return results
