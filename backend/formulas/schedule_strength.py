"""
FORMULA 03 — Schedule Strength Coefficient (SSC)
Remaining schedule difficulty based on opponent GG-ELO ratings,
home/away splits, and back-to-back frequency.
"""

from utils.normalizer import normalize_0_100

BASE_ELO = 1500.0


def game_difficulty(
    opp_elo: float,
    is_away: bool,
    home_advantage: float = 65.0,
) -> float:
    effective_opp = opp_elo + (home_advantage if is_away else 0)
    return round(effective_opp, 2)


def b2b_penalty(back_to_backs: int, remaining_games: int) -> float:
    if remaining_games == 0:
        return 0.0
    return round(min(0.15, back_to_backs / remaining_games * 0.5), 4)


def compute_ssc(
    remaining_games: list[dict],
    team_elo_map: dict[str, float],
    home_advantage: float = 65.0,
) -> dict:
    if not remaining_games:
        return {"ssc_raw": BASE_ELO, "ssc_score": 50.0, "avg_opp_elo": BASE_ELO, "b2b_rate": 0.0}

    difficulties = []
    for g in remaining_games:
        opp_elo = team_elo_map.get(g["opponent_id"], BASE_ELO)
        diff = game_difficulty(opp_elo, g.get("is_away", False), home_advantage)
        difficulties.append(diff)

    avg_diff = sum(difficulties) / len(difficulties)

    back_to_backs = sum(
        1 for i in range(1, len(remaining_games))
        if remaining_games[i].get("is_b2b", False)
    )
    penalty = b2b_penalty(back_to_backs, len(remaining_games))
    ssc_raw = avg_diff * (1 + penalty)

    return {
        "ssc_raw": round(ssc_raw, 2),
        "avg_opp_elo": round(avg_diff, 2),
        "b2b_count": back_to_backs,
        "b2b_rate": round(penalty, 4),
        "games_remaining": len(remaining_games),
    }


def normalize_ssc_to_score(ssc_raw: float, min_r: float = 1400.0, max_r: float = 1620.0) -> float:
    inverted = max_r + min_r - ssc_raw
    return normalize_0_100(inverted, min_r, max_r)


def compute_ssc_batch(
    teams: list[dict],
    schedules: dict[str, list[dict]],
    elo_map: dict[str, float],
) -> list[dict]:
    results = []
    for t in teams:
        tid = t["team_id"]
        ssc_data = compute_ssc(schedules.get(tid, []), elo_map)
        raw_vals_list = [ssc_data["ssc_raw"]]
        results.append({**t, **ssc_data})
    raw_vals = [r["ssc_raw"] for r in results]
    mn, mx = min(raw_vals, default=1400), max(raw_vals, default=1620)
    for r in results:
        r["ssc_score"] = normalize_ssc_to_score(r["ssc_raw"], mn, mx)
    return results
