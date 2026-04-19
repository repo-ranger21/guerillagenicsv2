"""
FORMULA 06 — Playoff DNA Score (PDS)
Measures a team's historical postseason pedigree:
coach experience, clutch performance, series resilience, and recent playoff depth.
"""

from utils.normalizer import clamp


def coach_experience_score(playoff_years: int, finals_appearances: int, rings: int) -> float:
    raw = playoff_years * 2 + finals_appearances * 5 + rings * 8
    return round(clamp(raw / 80 * 100, 0, 100), 2)


def historical_win_rate_score(playoff_wins: int, playoff_losses: int) -> float:
    total = playoff_wins + playoff_losses
    if total == 0:
        return 40.0
    wr = playoff_wins / total
    return round(clamp(wr * 100, 0, 100), 2)


def recent_depth_score(
    series_wins_last_3: int,
    max_possible: int = 9,
) -> float:
    if max_possible <= 0:
        return 50.0
    return round(clamp(series_wins_last_3 / max_possible * 100, 0, 100), 2)


def clutch_score(
    clutch_net_rating: float,
    playoff_clutch_win_pct: float,
) -> float:
    net_component = clamp((clutch_net_rating + 15) / 30 * 50, 0, 50)
    wr_component = clamp(playoff_clutch_win_pct * 50, 0, 50)
    return round(net_component + wr_component, 2)


def compute_pds(
    coach_playoff_years: int,
    coach_finals: int,
    coach_rings: int,
    franchise_playoff_wins: int,
    franchise_playoff_losses: int,
    series_wins_last_3_years: int,
    clutch_net_rating: float = 0.0,
    playoff_clutch_win_pct: float = 0.5,
    weights: dict | None = None,
) -> dict:
    if weights is None:
        weights = {
            "coach": 0.25,
            "history": 0.30,
            "recent": 0.25,
            "clutch": 0.20,
        }

    coach = coach_experience_score(coach_playoff_years, coach_finals, coach_rings)
    history = historical_win_rate_score(franchise_playoff_wins, franchise_playoff_losses)
    recent = recent_depth_score(series_wins_last_3_years)
    clutch = clutch_score(clutch_net_rating, playoff_clutch_win_pct)

    pds = (
        coach * weights["coach"]
        + history * weights["history"]
        + recent * weights["recent"]
        + clutch * weights["clutch"]
    )

    return {
        "pds_score": round(pds, 2),
        "components": {
            "coach_exp": coach,
            "historical_wr": history,
            "recent_depth": recent,
            "clutch": clutch,
        },
    }
