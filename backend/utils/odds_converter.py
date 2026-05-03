def american_to_decimal(american: int) -> float:
    if american > 0:
        return round(american / 100 + 1, 4)
    return round(100 / abs(american) + 1, 4)


def decimal_to_american(decimal: float) -> int:
    if decimal >= 2.0:
        return round((decimal - 1) * 100)
    return round(-100 / (decimal - 1))


def american_to_implied_prob(american: int) -> float:
    if american > 0:
        return round(100 / (american + 100), 6)
    return round(abs(american) / (abs(american) + 100), 6)


def decimal_to_implied_prob(decimal: float) -> float:
    return round(1 / decimal, 6)


def remove_vig(probs: list[float]) -> list[float]:
    total = sum(probs)
    if total == 0:
        return probs
    return [round(p / total, 6) for p in probs]


def remove_vig_from_odds(odds_list: list[int]) -> list[float]:
    raw_probs = [american_to_implied_prob(o) for o in odds_list]
    return remove_vig(raw_probs)


def best_american_odds(odds_list: list[int]) -> int:
    return max(odds_list, key=lambda o: american_to_decimal(o))


def vig_percentage(odds_list: list[int]) -> float:
    total = sum(american_to_implied_prob(o) for o in odds_list)
    return round((total - 1.0) * 100, 4)


def remove_vig_futures(odds_dict: dict[str, int]) -> tuple[dict[str, float], float]:
    """
    Multiplicative vig removal for a full Futures board (e.g., all 32 NFL teams).
    Sportsbooks inflate Futures vig to 15-25%, so stripping it before edge
    calculation is critical — raw implied probs will systematically understate edge.

    Returns (fair_probs_dict, vig_pct_float).
    """
    raw = {team: american_to_implied_prob(odds) for team, odds in odds_dict.items()}
    total = sum(raw.values())
    if total == 0:
        return {team: 0.0 for team in odds_dict}, 0.0
    fair = {team: round(prob / total, 6) for team, prob in raw.items()}
    vig_pct = round((total - 1.0) / total * 100, 4)
    return fair, vig_pct
