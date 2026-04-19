"""
FORMULA 05 — Momentum Decay Index (MDI)
Exponentially weighted recent performance trend.
Recent games matter more than older games; decay rate configurable.
"""

import math
from utils.normalizer import normalize_0_100

DEFAULT_DECAY = 0.85
WINDOW = 20


def game_weight(games_ago: int, decay: float = DEFAULT_DECAY) -> float:
    return round(math.pow(decay, games_ago), 6)


def compute_mdi(
    recent_results: list[dict],
    decay: float = DEFAULT_DECAY,
    window: int = WINDOW,
) -> dict:
    """
    recent_results: ordered newest-first list of
      {won: bool, margin: int, opp_elo: float}
    """
    if not recent_results:
        return {"mdi_raw": 0.0, "mdi_score": 50.0, "streak": 0, "weighted_wins": 0.0}

    games = recent_results[:window]
    total_weight = 0.0
    weighted_wins = 0.0
    weighted_margin = 0.0

    for i, g in enumerate(games):
        w = game_weight(i, decay)
        total_weight += w
        if g.get("won"):
            weighted_wins += w
            weighted_margin += g.get("margin", 3) * w
        else:
            weighted_margin -= g.get("margin", 3) * w

    win_rate = weighted_wins / total_weight if total_weight > 0 else 0.5
    avg_margin = weighted_margin / total_weight if total_weight > 0 else 0

    mdi_raw = win_rate * 60 + min(max(avg_margin / 30, -1), 1) * 20 + 20

    streak = 0
    if games:
        direction = games[0].get("won")
        for g in games:
            if g.get("won") == direction:
                streak += 1
            else:
                break
        if not direction:
            streak = -streak

    return {
        "mdi_raw": round(mdi_raw, 2),
        "mdi_score": round(normalize_0_100(mdi_raw, 0, 100), 2),
        "win_rate_weighted": round(win_rate, 4),
        "avg_margin_weighted": round(avg_margin, 2),
        "streak": streak,
        "games_evaluated": len(games),
    }


def compute_mdi_batch(teams: list[dict], decay: float = DEFAULT_DECAY) -> list[dict]:
    results = []
    for t in teams:
        mdi_data = compute_mdi(t.get("recent_results", []), decay)
        results.append({**t, **mdi_data})
    return results
