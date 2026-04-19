from datetime import datetime
from typing import Any


def build_eaa(
    team_abbr: str,
    sport: str,
    season: str,
    cfs_score: float,
    championship_prob: float,
    market_prob: float,
    best_odds: int,
    tier: str,
    edge_pct: float,
    kelly_fraction: float,
    quarter_kelly: float,
    formula_breakdown: dict[str, Any],
    signals: list[str],
) -> dict:
    return {
        "schema": "EAA_v2",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "team": team_abbr,
        "sport": sport,
        "season": season,
        "tier": tier,
        "scores": {
            "cfs": round(cfs_score, 2),
            "gg_elo": round(formula_breakdown.get("gg_elo", 0), 2),
            "nir": round(formula_breakdown.get("nir", 0), 2),
            "ssc": round(formula_breakdown.get("ssc", 0), 2),
            "iis": round(formula_breakdown.get("iis", 0), 2),
            "mdi": round(formula_breakdown.get("mdi", 0), 2),
            "pds": round(formula_breakdown.get("pds", 0), 2),
            "eaf": round(formula_breakdown.get("eaf", 0), 2),
        },
        "probabilities": {
            "gg_model": round(championship_prob, 4),
            "market_implied": round(market_prob, 4),
            "edge_pct": round(edge_pct, 4),
        },
        "odds": {
            "best_american": best_odds,
            "kelly_fraction": round(kelly_fraction, 4),
            "quarter_kelly": round(quarter_kelly, 4),
        },
        "signals": signals,
    }
