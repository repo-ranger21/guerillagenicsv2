"""
FORMULA 08 — Market Inefficiency Detector (MID) — THE NEEDLE
Compares GuerillaGenics model probability to vig-removed market odds.
Fires the NEEDLE alert when 6 specific market inefficiency signals align.
"""

from utils.odds_converter import remove_vig_from_odds, remove_vig_futures

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


def compute_futures_market_prob(
    odds_by_book: dict[str, dict[str, int]],
) -> dict[str, float]:
    """
    Computes consensus fair probabilities for a full Futures board across bookmakers.

    odds_by_book: {bookmaker: {team: american_odds}}
    Returns {team: averaged_fair_prob} — vig stripped per book before averaging
    so no single book's vig structure distorts the consensus line.
    """
    team_prob_sums: dict[str, float] = {}
    book_count = 0
    for _book, team_odds in odds_by_book.items():
        if not team_odds:
            continue
        fair_probs, _ = remove_vig_futures(team_odds)
        for team, prob in fair_probs.items():
            team_prob_sums[team] = team_prob_sums.get(team, 0.0) + prob
        book_count += 1
    if book_count == 0:
        return {}
    return {team: round(total / book_count, 6) for team, total in team_prob_sums.items()}


def compute_futures_team_prob(team: str, books_odds: dict[str, int]) -> float:
    """
    Consensus fair probability for a single Futures team across multiple bookmakers.

    books_odds: {bookmaker_name: american_odds} for this one team.

    For each bookmaker, builds a synthetic two-team board — the named team at their
    listed odds plus a catch-all "__field__" at -110 — then strips vig multiplicatively.
    Averaging the per-book fair probabilities before returning ensures no single
    book's margin distorts the consensus probability.

    Args:
        team:       team name used as the key in the synthetic board
        books_odds: {bookmaker: american_odds} for the named team

    Returns:
        Averaged fair probability in [0.0, 1.0]. Returns 0.0 if no valid odds provided.
    """
    probs = []
    for _book, odds in books_odds.items():
        fair, _ = remove_vig_futures({team: odds, "__field__": -110})
        if team in fair:
            probs.append(fair[team])
    if not probs:
        return 0.0
    return round(sum(probs) / len(probs), 6)


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
    market_odds_by_book: dict,
    market_idx: int = 0,
    opening_odds: int | None = None,
    current_best_odds: int | None = None,
    public_bet_pct: float | None = None,
    sharp_money_on_team: bool = False,
    injury_recently_cleared: bool = False,
    late_season: bool = False,
    is_futures: bool = False,
    futures_team: str | None = None,
) -> dict:
    # AUDIT: Without is_futures=True, routes exclusively through compute_vig_removed_prob()
    # — a two-outcome game odds model (dict[str, list[int]]). Futures boards (N teams,
    # single odds per book) need is_futures=True which calls compute_futures_team_prob()
    # instead. The futures path is wired below.
    if is_futures and futures_team is not None:
        market_prob = compute_futures_team_prob(futures_team, market_odds_by_book)
    else:
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
