"""
FORMULA 04 — Injury Impact Score (IIS)
Quantifies the win-share/WAR impact of current injuries on championship probability.
Accounts for injury duration, player replacement level, and lineup depth.
"""

from utils.normalizer import clamp

STATUS_MULTIPLIERS = {
    "OUT": 1.0,
    "DOUBTFUL": 0.75,
    "QUESTIONABLE": 0.4,
    "PROBABLE": 0.1,
}

DEPTH_DISCOUNT = {
    1: 1.0,
    2: 0.6,
    3: 0.3,
}


def player_impact_loss(
    win_shares: float,
    status: str,
    roster_depth: int = 1,
) -> float:
    multiplier = STATUS_MULTIPLIERS.get(status.upper(), 0.0)
    depth_factor = DEPTH_DISCOUNT.get(min(roster_depth, 3), 0.2)
    return round(win_shares * multiplier * depth_factor, 4)


def compute_iis(
    injuries: list[dict],
    team_baseline_win_shares: float = 30.0,
) -> dict:
    """
    injuries: [{player_name, win_shares, status, roster_depth, games_missed}]
    team_baseline_win_shares: total team win shares this season
    """
    if not injuries:
        return {"iis_raw": 0.0, "iis_score": 100.0, "total_ws_lost": 0.0, "n_injured": 0}

    total_loss = sum(
        player_impact_loss(
            inj.get("win_shares", 0),
            inj.get("status", "OUT"),
            inj.get("roster_depth", 1),
        )
        for inj in injuries
    )

    if team_baseline_win_shares <= 0:
        team_baseline_win_shares = 30.0

    impact_pct = clamp(total_loss / team_baseline_win_shares * 100, 0, 50)
    iis_score = clamp(100 - impact_pct * 2, 0, 100)

    return {
        "iis_raw": round(total_loss, 4),
        "iis_score": round(iis_score, 2),
        "impact_pct": round(impact_pct, 2),
        "total_ws_lost": round(total_loss, 4),
        "n_injured": len(injuries),
    }


def compute_iis_batch(teams: list[dict]) -> list[dict]:
    """
    teams: [{team_id, injuries: [...], baseline_win_shares}]
    """
    results = []
    for t in teams:
        iis_data = compute_iis(
            t.get("injuries", []),
            t.get("baseline_win_shares", 30.0),
        )
        results.append({**t, **iis_data})
    return results
