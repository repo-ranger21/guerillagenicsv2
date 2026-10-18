"""
FORMULA 09 — Monte Carlo Bracket Simulator (MCS)
Runs N simulations of the playoff bracket using GG-ELO win probabilities.
Returns per-team probabilities for each round including championship.
"""

import random
from collections import defaultdict

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
    # AUDIT: Win probability is derived solely from elo_map differences (Bernoulli trial
    # per game). No scoring model exists — expected points are never computed from roster
    # data. compute_lambdas_from_profiles() (added below) derives roster-based expected-
    # score lambdas for use in a Double Poisson scoring simulation alongside this bracket.
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


def compute_lambdas_from_profiles(
    home_team: str,
    away_team: str,
    team_profiles: dict,
    sport: str,
    league_avg: float,
) -> tuple[float, float]:
    """
    Derives expected scoring lambdas for home and away teams from roster profiles.

    Translates player-aggregate stat profiles into expected output (points/runs/score)
    for use in a Double Poisson or Poisson scoring simulation. Each team's lambda is
    the league average scaled by offensive strength and opponent defensive resistance.

    Formulas by sport:
        NFL:  lambda = league_avg × (off_efficiency / league_mean_off)
                                   × (league_mean_def / opp_def_efficiency)
        NBA:  lambda = league_avg × (off_rating / league_mean_off)
                                   × (league_mean_def / opp_def_rating)
        MLB:  lambda = league_avg × (lineup_ops / league_mean_ops)
                                   × (league_mean_era / opp_rotation_era)

    Fallback: if either team is missing from team_profiles, or a required metric is
    unavailable, returns (league_avg, league_avg).

    Args:
        home_team:     team name matching a key in team_profiles
        away_team:     team name matching a key in team_profiles
        team_profiles: {team_name: dict} from roster_aggregator.aggregate_*_teams()
        sport:         'nfl', 'nba', or 'mlb'
        league_avg:    baseline expected output per team per game
                       (e.g. 23.5 for NFL points, 110 for NBA points, 4.5 for MLB runs)

    Returns:
        (lambda_home, lambda_away) — both positive floats, minimum 0.1
    """
    home_p = team_profiles.get(home_team)
    away_p = team_profiles.get(away_team)

    if not home_p or not away_p:
        return (league_avg, league_avg)

    sport = sport.lower()
    all_profiles = list(team_profiles.values())

    def _mean(key: str) -> float:
        vals = [p.get(key) for p in all_profiles if p.get(key) is not None]
        return sum(vals) / len(vals) if vals else league_avg

    def _get(profile: dict, key: str, fallback: float) -> float:
        v = profile.get(key)
        return float(v) if v is not None else fallback

    if sport == "nfl":
        lg_off = _mean("off_efficiency")
        lg_def = _mean("def_efficiency")
        if lg_off <= 0 or lg_def <= 0:
            return (league_avg, league_avg)
        h_off = _get(home_p, "off_efficiency", lg_off)
        a_off = _get(away_p, "off_efficiency", lg_off)
        h_def = _get(home_p, "def_efficiency", lg_def)
        a_def = _get(away_p, "def_efficiency", lg_def)
        if a_def <= 0 or h_def <= 0:
            return (league_avg, league_avg)
        lam_home = league_avg * (h_off / lg_off) * (lg_def / a_def)
        lam_away = league_avg * (a_off / lg_off) * (lg_def / h_def)

    elif sport == "nba":
        lg_off = _mean("off_rating")
        lg_def = _mean("def_rating")
        if lg_off <= 0 or lg_def <= 0:
            return (league_avg, league_avg)
        h_off = _get(home_p, "off_rating", lg_off)
        a_off = _get(away_p, "off_rating", lg_off)
        h_def = _get(home_p, "def_rating", lg_def)
        a_def = _get(away_p, "def_rating", lg_def)
        if a_def <= 0 or h_def <= 0:
            return (league_avg, league_avg)
        lam_home = league_avg * (h_off / lg_off) * (lg_def / a_def)
        lam_away = league_avg * (a_off / lg_off) * (lg_def / h_def)

    elif sport == "mlb":
        lg_ops = _mean("lineup_ops")
        lg_era = _mean("rotation_era")
        if lg_ops <= 0 or lg_era <= 0:
            return (league_avg, league_avg)
        h_ops = _get(home_p, "lineup_ops", lg_ops)
        a_ops = _get(away_p, "lineup_ops", lg_ops)
        h_era = _get(home_p, "rotation_era", lg_era)
        a_era = _get(away_p, "rotation_era", lg_era)
        if a_era <= 0 or h_era <= 0:
            return (league_avg, league_avg)
        lam_home = league_avg * (h_ops / lg_ops) * (lg_era / a_era)
        lam_away = league_avg * (a_ops / lg_ops) * (lg_era / h_era)

    else:
        return (league_avg, league_avg)

    return (round(max(lam_home, 0.1), 4), round(max(lam_away, 0.1), 4))
