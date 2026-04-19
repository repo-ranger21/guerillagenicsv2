"""
FORMULA 09 — Monte Carlo Bracket Simulator (MCS)
Runs N simulations of the playoff bracket using GG-ELO win probabilities.
Returns per-team probabilities for each round including championship.
"""

import random
from collections import defaultdict
from typing import Any

DEFAULT_SIMULATIONS = 100_000
HOME_COURT_ELO_ADJ = 65.0


def win_probability(elo_a: float, elo_b: float, a_has_home: bool = True) -> float:
    adj = HOME_COURT_ELO_ADJ if a_has_home else -HOME_COURT_ELO_ADJ
    return 1 / (1 + 10 ** ((elo_b - elo_a - adj) / 400))


def simulate_series(
    team_a: str,
    elo_a: float,
    team_b: str,
    elo_b: float,
    games_to_win: int = 4,
    a_has_home: bool = True,
) -> str:
    wins_a = wins_b = 0
    p_a = win_probability(elo_a, elo_b, a_has_home)
    while wins_a < games_to_win and wins_b < games_to_win:
        if random.random() < p_a:
            wins_a += 1
        else:
            wins_b += 1
    return team_a if wins_a == games_to_win else team_b


def simulate_bracket_nba(
    first_round_matchups: list[tuple[str, str]],
    elo_map: dict[str, float],
    simulations: int = DEFAULT_SIMULATIONS,
) -> dict[str, dict[str, float]]:
    """
    first_round_matchups: [(seed1_team, seed8_team), (seed2, seed7), ...]
    Returns {team_id: {"r1": prob, "r2": prob, "conf_finals": prob, "finals": prob, "champion": prob}}
    """
    round_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    round_names = ["r1", "conf_semis", "conf_finals", "finals", "champion"]

    for _ in range(simulations):
        remaining = [list(pair) for pair in first_round_matchups]

        for round_idx, round_name in enumerate(round_names):
            if len(remaining) == 1 and round_idx == len(round_names) - 1:
                winner = simulate_series(
                    remaining[0][0],
                    elo_map.get(remaining[0][0], 1500),
                    remaining[0][1],
                    elo_map.get(remaining[0][1], 1500),
                    games_to_win=4,
                )
                round_counts[winner]["champion"] += 1
                break

            next_round = []
            for i in range(0, len(remaining), 2):
                if i + 1 >= len(remaining):
                    next_round.append(remaining[i])
                    continue
                pair_a = remaining[i]
                pair_b = remaining[i + 1]

                for team in pair_a + pair_b:
                    round_counts[team][round_name] += 1

                w_a = simulate_series(
                    pair_a[0], elo_map.get(pair_a[0], 1500),
                    pair_a[1], elo_map.get(pair_a[1], 1500),
                )
                w_b = simulate_series(
                    pair_b[0], elo_map.get(pair_b[0], 1500),
                    pair_b[1], elo_map.get(pair_b[1], 1500),
                )
                next_round.append([w_a, w_b])
            remaining = next_round

    all_teams = {t for pair in first_round_matchups for t in pair}
    result: dict[str, dict[str, float]] = {}
    for team in all_teams:
        result[team] = {
            rn: round(round_counts[team].get(rn, 0) / simulations, 4)
            for rn in round_names
        }
    return result


def simulate_bracket_mlb(
    wildcard_matchups: list[tuple[str, str]],
    division_winners: list[str],
    elo_map: dict[str, float],
    simulations: int = DEFAULT_SIMULATIONS,
) -> dict[str, dict[str, float]]:
    round_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for _ in range(simulations):
        wc_winners = [
            simulate_series(a, elo_map.get(a, 1500), b, elo_map.get(b, 1500), games_to_win=3)
            for a, b in wildcard_matchups
        ]
        ds_teams = division_winners + wc_winners
        random.shuffle(ds_teams)

        ds_winners = []
        for i in range(0, len(ds_teams), 2):
            if i + 1 < len(ds_teams):
                w = simulate_series(
                    ds_teams[i], elo_map.get(ds_teams[i], 1500),
                    ds_teams[i + 1], elo_map.get(ds_teams[i + 1], 1500),
                    games_to_win=3,
                )
                ds_winners.append(w)
                for t in [ds_teams[i], ds_teams[i + 1]]:
                    round_counts[t]["ds"] += 1

        cs_winners = []
        for i in range(0, len(ds_winners), 2):
            if i + 1 < len(ds_winners):
                w = simulate_series(
                    ds_winners[i], elo_map.get(ds_winners[i], 1500),
                    ds_winners[i + 1], elo_map.get(ds_winners[i + 1], 1500),
                    games_to_win=4,
                )
                cs_winners.append(w)
                for t in [ds_winners[i], ds_winners[i + 1]]:
                    round_counts[t]["cs"] += 1

        if len(cs_winners) >= 2:
            champion = simulate_series(
                cs_winners[0], elo_map.get(cs_winners[0], 1500),
                cs_winners[1], elo_map.get(cs_winners[1], 1500),
                games_to_win=4,
            )
            for t in cs_winners:
                round_counts[t]["ws"] += 1
            round_counts[champion]["champion"] += 1

    all_teams = {t for pair in wildcard_matchups for t in pair} | set(division_winners)
    return {
        team: {
            rn: round(round_counts[team].get(rn, 0) / simulations, 4)
            for rn in ["wc", "ds", "cs", "ws", "champion"]
        }
        for team in all_teams
    }
