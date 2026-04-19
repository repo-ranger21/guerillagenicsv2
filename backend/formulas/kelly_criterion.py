"""
Kelly Criterion + Quarter-Kelly calculator for optimal bet sizing.
Uses GuerillaGenics model probability vs best available odds.
"""

from utils.odds_converter import american_to_decimal
from utils.normalizer import clamp


def kelly_fraction(prob: float, decimal_odds: float) -> float:
    b = decimal_odds - 1
    q = 1 - prob
    if b <= 0:
        return 0.0
    k = (b * prob - q) / b
    return round(clamp(k, 0.0, 1.0), 6)


def kelly_from_american(prob: float, american_odds: int) -> dict:
    dec = american_to_decimal(american_odds)
    full_k = kelly_fraction(prob, dec)
    quarter_k = round(full_k * 0.25, 6)
    half_k = round(full_k * 0.5, 6)

    return {
        "full_kelly": full_k,
        "half_kelly": half_k,
        "quarter_kelly": quarter_k,
        "decimal_odds": dec,
        "implied_ev": round((prob * dec - 1) * 100, 2),
        "is_positive_ev": (prob * dec) > 1.0,
    }


def recommended_unit_size(
    bankroll: float,
    quarter_kelly: float,
    max_pct: float = 0.05,
) -> float:
    raw = bankroll * quarter_kelly
    capped = min(raw, bankroll * max_pct)
    return round(capped, 2)
