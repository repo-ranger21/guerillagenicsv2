"""
FORMULA 01 — GuerillaGenics Elo (GG-ELO)
Adaptive Elo rating with margin-of-victory multiplier, home-court adjustment,
and mean reversion at season start.
"""

import math
from dataclasses import dataclass

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
    # AUDIT: Receives only game outcomes (winner/loser/margin). No player or roster data
    # feeds into Elo. Active pipelines (nfl_pipeline.py, mlb_pipeline.py) approximate
    # Elo as 1500 + (win_pct - 0.5)*400 rather than calling this function at all.
    # apply_roster_adjustment() (added below) adds a post-hoc roster-quality nudge
    # derived from backend/data/roster_aggregator.py profiles.
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


def apply_roster_adjustment(
    elo_ratings: dict,
    team_profiles: dict,
    sport: str,
    weight: float = 0.05,
) -> dict:
    """
    Nudges GG-ELO ratings using roster quality derived from aggregate player stats.

    For each team present in both elo_ratings and team_profiles, computes a
    roster_quality_score (0.0–1.0) by min-max normalizing the sport's key metrics
    across all teams, then averaging the normalized values.

    Adjustment formula:
        adjusted_elo = base_elo + (roster_quality_score − 0.5) × weight × 1000

    At default weight=0.05, an elite roster (score ≈ 1.0) adds +25 Elo points;
    a poor roster (score ≈ 0.0) subtracts −25 points. A league-average roster
    (score = 0.5) adds exactly zero.

    Args:
        elo_ratings:   {team_name: float} or {team_name: EloState}
        team_profiles: {team_name: dict} from roster_aggregator.aggregate_*_teams()
        sport:         'nfl', 'nba', or 'mlb'
        weight:        scaling factor (default 0.05 → ±25 Elo points max)

    Returns:
        New dict {team_name: adjusted_elo_float}.
        Teams absent from team_profiles are returned with their original rating unchanged.
    """
    SPORT_METRICS: dict[str, list[str]] = {
        "nfl": ["off_efficiency", "def_efficiency", "qb_qbr"],
        "nba": ["off_rating", "def_rating", "depth_score"],
        "mlb": ["rotation_era", "lineup_ops", "rotation_depth"],
    }
    # Metrics where a lower raw value is better — invert after normalization
    INVERTED = {"rotation_era"}

    metrics = SPORT_METRICS.get(sport.lower(), [])
    if not metrics:
        return {k: (v.rating if isinstance(v, EloState) else float(v)) for k, v in elo_ratings.items()}

    team_list = list(elo_ratings.keys())

    # Gather raw metric values in team_list order
    raw: dict[str, list] = {m: [] for m in metrics}
    for team in team_list:
        profile = team_profiles.get(team) or {}
        for m in metrics:
            val = profile.get(m)
            raw[m].append(float(val) if val is not None else float("nan"))

    def _minmax(vals: list[float]) -> list[float]:
        valid = [v for v in vals if not math.isnan(v)]
        if not valid or max(valid) == min(valid):
            return [0.5 for _ in vals]
        mn, mx = min(valid), max(valid)
        return [0.5 if math.isnan(v) else (v - mn) / (mx - mn) for v in vals]

    normed: dict[str, list[float]] = {}
    for m in metrics:
        n = _minmax(raw[m])
        normed[m] = [1.0 - x for x in n] if m in INVERTED else n

    result: dict[str, float] = {}
    for i, team in enumerate(team_list):
        base = elo_ratings[team]
        base_rating = base.rating if isinstance(base, EloState) else float(base)
        scores = [normed[m][i] for m in metrics]
        roster_quality_score = sum(scores) / len(scores)
        adjusted = base_rating + (roster_quality_score - 0.5) * weight * 1000
        result[team] = round(adjusted, 2)

    return result
