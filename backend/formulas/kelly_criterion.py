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


def futures_ev_annualized(
    model_prob: float,
    american_odds: int,
    days_to_resolution: int,
) -> dict:
    """
    Extends raw EV with an annualized growth rate so Futures bets of different
    durations can be ranked on equal footing. A +18% EV Super Bowl bet in 5 months
    may beat a +22% EV division bet in 3 months — this surfaces that comparison.

    Assumes flat Kelly sizing (simplified). Use alongside kelly_from_american for
    full sizing context.
    """
    dec = american_to_decimal(american_odds)
    raw_ev = (model_prob * (dec - 1)) - (1 - model_prob)
    if raw_ev <= -1.0:
        return {
            "raw_ev_pct": round(raw_ev * 100, 2),
            "annualized_ev_pct": None,
            "days_to_resolution": days_to_resolution,
            "is_positive_ev": False,
            "error": "Raw EV at or below -100% — annualized growth undefined",
        }
    years = max(days_to_resolution, 1) / 365
    annualized_growth = (1 + raw_ev) ** (1 / years) - 1
    return {
        "raw_ev_pct": round(raw_ev * 100, 2),
        "annualized_ev_pct": round(annualized_growth * 100, 2),
        "days_to_resolution": days_to_resolution,
        "is_positive_ev": raw_ev > 0,
    }
