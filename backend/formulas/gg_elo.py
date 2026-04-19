"""
FORMULA 01 — GuerillaGenics Elo (GG-ELO)
Adaptive Elo rating with margin-of-victory multiplier, home-court adjustment,
and mean reversion at season start.
"""

import math
from dataclasses import dataclass, field

BASE_RATING = 1500.0
K_FACTOR = 20.0
HOME_ADVANTAGE = 65.0
MOV_MULTIPLIER_CAP = 2.0
MEAN_REVERSION_RATE = 0.33


@dataclass
class EloState:
    team_id: str
    rating: float = BASE_RATING
    games_played: int = 0
    season_start_rating: float = BASE_RATING


def expected_score(rating_a: float, rating_b: float) -> float:
    return 1 / (1 + math.pow(10, (rating_b - rating_a) / 400))


def mov_multiplier(margin: int, elo_diff: float) -> float:
    if margin <= 0:
        return 1.0
    raw = math.log(abs(margin) + 1) * (2.2 / (elo_diff * 0.001 + 2.2))
    return min(raw, MOV_MULTIPLIER_CAP)


def update_elo(
    winner: EloState,
    loser: EloState,
    margin: int,
    winner_home: bool = False,
) -> tuple[float, float]:
    home_adj = HOME_ADVANTAGE if winner_home else -HOME_ADVANTAGE
    ew = expected_score(winner.rating + home_adj, loser.rating)
    el = 1 - ew
    multiplier = mov_multiplier(margin, winner.rating - loser.rating)
    k = K_FACTOR * multiplier
    new_winner = winner.rating + k * (1 - ew)
    new_loser = loser.rating + k * (0 - el)
    return round(new_winner, 2), round(new_loser, 2)


def season_reset(rating: float) -> float:
    return round(rating * (1 - MEAN_REVERSION_RATE) + BASE_RATING * MEAN_REVERSION_RATE, 2)


def normalize_elo_to_score(rating: float, min_r: float = 1350.0, max_r: float = 1700.0) -> float:
    clamped = max(min_r, min(max_r, rating))
    return round((clamped - min_r) / (max_r - min_r) * 100, 2)


def compute_gg_elo_from_games(games: list[dict], teams: dict[str, EloState]) -> dict[str, EloState]:
    """
    games: list of {winner_id, loser_id, margin, winner_home}
    teams: {team_id: EloState}
    Returns updated EloState mapping.
    """
    for g in sorted(games, key=lambda x: x.get("date", "")):
        wid, lid = g["winner_id"], g["loser_id"]
        if wid not in teams:
            teams[wid] = EloState(team_id=wid)
        if lid not in teams:
            teams[lid] = EloState(team_id=lid)
        new_w, new_l = update_elo(
            teams[wid], teams[lid],
            g.get("margin", 5),
            g.get("winner_home", False)
        )
        teams[wid].rating = new_w
        teams[wid].games_played += 1
        teams[lid].rating = new_l
        teams[lid].games_played += 1
    return teams
