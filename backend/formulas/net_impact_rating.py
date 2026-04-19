"""
FORMULA 02 — Net Impact Rating (NIR)
Pace-adjusted net rating normalized against opponent quality.
Accounts for opponent strength percentile when computing final NIR score.
"""

from utils.normalizer import normalize_0_100


def pace_adjust(net_rating: float, pace: float, league_avg_pace: float = 100.0) -> float:
    if pace <= 0:
        return net_rating
    return round(net_rating * (league_avg_pace / pace), 4)


def opponent_adjusted_nir(
    net_rating: float,
    opp_strength_percentile: float,
    alpha: float = 0.35,
) -> float:
    adjustment = (opp_strength_percentile - 50) / 50 * alpha * abs(net_rating)
    return round(net_rating + adjustment, 4)


def compute_nir(
    points_per_100: float,
    points_allowed_per_100: float,
    pace: float,
    opp_strength_percentile: float,
    league_avg_pace: float = 100.0,
) -> float:
    raw_net = points_per_100 - points_allowed_per_100
    pace_adjusted = pace_adjust(raw_net, pace, league_avg_pace)
    return opponent_adjusted_nir(pace_adjusted, opp_strength_percentile)


def normalize_nir_to_score(nir: float, min_nir: float = -15.0, max_nir: float = 15.0) -> float:
    return normalize_0_100(nir, min_nir, max_nir)


def compute_nir_batch(teams: list[dict], league_avg_pace: float = 100.0) -> list[dict]:
    """
    teams: list of {team_id, pts_per_100, opp_per_100, pace, opp_strength_pct}
    Returns same list with added nir and nir_score fields.
    """
    results = []
    for t in teams:
        nir = compute_nir(
            t["pts_per_100"],
            t["opp_per_100"],
            t.get("pace", league_avg_pace),
            t.get("opp_strength_pct", 50.0),
            league_avg_pace,
        )
        results.append({**t, "nir": nir})
    nir_vals = [r["nir"] for r in results]
    mn, mx = min(nir_vals, default=0), max(nir_vals, default=1)
    for r in results:
        r["nir_score"] = normalize_0_100(r["nir"], mn, mx)
    return results
