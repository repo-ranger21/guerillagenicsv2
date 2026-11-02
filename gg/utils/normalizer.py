from typing import Sequence


def normalize_0_100(value: float, min_val: float, max_val: float) -> float:
    if max_val == min_val:
        return 50.0
    return round(max(0.0, min(100.0, (value - min_val) / (max_val - min_val) * 100)), 2)


def normalize_series(values: Sequence[float]) -> list[float]:
    if not values:
        return []
    mn, mx = min(values), max(values)
    return [normalize_0_100(v, mn, mx) for v in values]


def z_score_normalize(values: Sequence[float]) -> list[float]:
    if len(values) < 2:
        return [50.0] * len(values)
    import statistics
    mu = statistics.mean(values)
    sigma = statistics.stdev(values)
    if sigma == 0:
        return [50.0] * len(values)
    return [round((v - mu) / sigma, 4) for v in values]


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))
