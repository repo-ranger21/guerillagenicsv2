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
