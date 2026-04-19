"""
FORMULA 08 — Market Inefficiency Detector (MID) — THE NEEDLE
Compares GuerillaGenics model probability to vig-removed market odds.
Fires the NEEDLE alert when 6 specific market inefficiency signals align.
"""

from utils.odds_converter import remove_vig_from_odds
from utils.normalizer import clamp

NEEDLE_THRESHOLD = 0.07
LOCK_THRESHOLD = 0.05
LEAN_THRESHOLD = 0.03

SIGNAL_WEIGHTS = {
    "model_edge": 2.0,
    "line_movement": 1.5,
    "sharp_money": 1.5,
    "public_fade": 1.0,
    "injury_mispriced": 1.0,
    "late_season_drift": 0.5,
}


def compute_vig_removed_prob(odds_by_book: dict[str, list[int]], market_idx: int = 0) -> float:
    all_removed = []
    for bookmaker, odds_list in odds_by_book.items():
        if len(odds_list) >= 2:
            removed = remove_vig_from_odds(odds_list)
            if market_idx < len(removed):
                all_removed.append(removed[market_idx])
    return round(sum(all_removed) / len(all_removed), 6) if all_removed else 0.0


def classify_tier(edge: float) -> str:
    if edge >= NEEDLE_THRESHOLD:
        return "NEEDLE"
    if edge >= LOCK_THRESHOLD:
        return "LOCK"
    if edge >= LEAN_THRESHOLD:
        return "LEAN"
    if edge >= 0:
        return "FAIR"
    return "FADE"


def detect_line_movement_signal(
    opening_odds: int,
    current_odds: int,
    our_direction: str,
) -> bool:
    if our_direction == "VALUE":
        return current_odds < opening_odds
    return current_odds > opening_odds


def detect_public_fade(
    public_bet_pct: float,
    our_direction: str,
    threshold: float = 0.65,
) -> bool:
    if our_direction == "VALUE":
        return public_bet_pct > threshold
    return public_bet_pct < (1 - threshold)


def score_signals(signals: dict[str, bool]) -> float:
    total_weight = sum(SIGNAL_WEIGHTS.values())
    earned = sum(SIGNAL_WEIGHTS[k] for k, v in signals.items() if v)
    return round(earned / total_weight, 4)


def compute_mid(
    model_prob: float,
    market_odds_by_book: dict[str, list[int]],
    market_idx: int = 0,
    opening_odds: int | None = None,
    current_best_odds: int | None = None,
    public_bet_pct: float | None = None,
    sharp_money_on_team: bool = False,
    injury_recently_cleared: bool = False,
    late_season: bool = False,
) -> dict:
    market_prob = compute_vig_removed_prob(market_odds_by_book, market_idx)
    if market_prob <= 0:
        return {
            "mid_edge": 0.0,
            "tier": "FAIR",
            "model_prob": model_prob,
            "market_prob": 0.0,
            "signals": {},
            "signal_score": 0.0,
        }

    edge = round(model_prob - market_prob, 6)
    our_direction = "VALUE" if edge > 0 else "FADE"

    signals: dict[str, bool] = {
        "model_edge": abs(edge) >= LEAN_THRESHOLD,
        "line_movement": False,
        "sharp_money": sharp_money_on_team,
        "public_fade": False,
        "injury_mispriced": injury_recently_cleared,
        "late_season_drift": late_season and abs(edge) >= LEAN_THRESHOLD,
    }

    if opening_odds is not None and current_best_odds is not None:
        signals["line_movement"] = detect_line_movement_signal(
            opening_odds, current_best_odds, our_direction
        )

    if public_bet_pct is not None:
        signals["public_fade"] = detect_public_fade(public_bet_pct, our_direction)

    signal_score = score_signals(signals)
    tier = classify_tier(edge)

    return {
        "mid_edge": edge,
        "tier": tier,
        "model_prob": round(model_prob, 6),
        "market_prob": round(market_prob, 6),
        "signals": signals,
        "signal_score": signal_score,
        "triggered_signals": [k for k, v in signals.items() if v],
    }
