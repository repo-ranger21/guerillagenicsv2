"""
Integration tests — pipeline data flow from Notion CSV exports through Elo/scoring engines.
Verifies that the aggregation layer, roster adjustment, lambda computation, and futures
probability functions all operate correctly on real and mock data.
"""

import glob
import os
import pytest

from pathlib import Path

# Repo root: backend/tests/ → backend/ → repo root
_REPO_ROOT = Path(__file__).parent.parent.parent
_RAW_DIR = _REPO_ROOT / "data" / "raw" / "notion_rosters_2026"


def _find_csv(sport: str) -> str | None:
    matches = glob.glob(str(_RAW_DIR / sport / "**" / "*_all.csv"), recursive=True)
    return matches[0] if matches else None


# ─── Shared fixtures ─────────────────────────────────────────────────────────

NFL_CSV = _find_csv("nfl")
NBA_CSV = _find_csv("nba")
MLB_CSV = _find_csv("mlb")

needs_nfl = pytest.mark.skipif(NFL_CSV is None, reason="NFL CSV not found")
needs_nba = pytest.mark.skipif(NBA_CSV is None, reason="NBA CSV not found")
needs_mlb = pytest.mark.skipif(MLB_CSV is None, reason="MLB CSV not found")


# ─── Test 1: Aggregation layer returns non-empty dicts ───────────────────────

def test_aggregate_nfl_teams_non_empty():
    from data.roster_aggregator import aggregate_nfl_teams
    assert NFL_CSV is not None, "NFL CSV not found — is data/ present?"
    profiles = aggregate_nfl_teams(NFL_CSV)
    assert isinstance(profiles, dict)
    assert len(profiles) > 0, "Expected at least one NFL team profile"
    # Each profile has the five required metrics
    for team, p in profiles.items():
        assert isinstance(p, dict), f"{team} profile is not a dict"
        for key in ["off_efficiency", "def_efficiency", "qb_qbr", "run_game_strength", "turnover_risk"]:
            assert key in p, f"{team} missing key {key!r}"


def test_aggregate_nba_teams_non_empty():
    from data.roster_aggregator import aggregate_nba_teams
    assert NBA_CSV is not None, "NBA CSV not found"
    profiles = aggregate_nba_teams(NBA_CSV)
    assert isinstance(profiles, dict)
    assert len(profiles) > 0
    for team, p in profiles.items():
        for key in ["off_rating", "def_rating", "pace_proxy", "three_point_reliance", "depth_score"]:
            assert key in p, f"{team} missing key {key!r}"


def test_aggregate_mlb_teams_non_empty():
    from data.roster_aggregator import aggregate_mlb_teams
    assert MLB_CSV is not None, "MLB CSV not found"
    profiles = aggregate_mlb_teams(MLB_CSV)
    assert isinstance(profiles, dict)
    assert len(profiles) > 0
    for team, p in profiles.items():
        for key in ["rotation_era", "rotation_depth", "lineup_ops", "lineup_depth", "strikeout_rate"]:
            assert key in p, f"{team} missing key {key!r}"


# ─── Test 2: apply_roster_adjustment — bounds check ──────────────────────────

def test_apply_roster_adjustment_nfl_bounds():
    from formulas.gg_elo import apply_roster_adjustment

    base_ratings = {"Chiefs": 1600.0, "Eagles": 1520.0, "Bears": 1460.0}
    mock_profiles = {
        "Chiefs": {"off_efficiency": 85.0, "def_efficiency": 6.5, "qb_qbr": 72.0},
        "Eagles": {"off_efficiency": 70.0, "def_efficiency": 5.8, "qb_qbr": 61.0},
        "Bears":  {"off_efficiency": 55.0, "def_efficiency": 4.2, "qb_qbr": 48.0},
    }
    adjusted = apply_roster_adjustment(base_ratings, mock_profiles, "nfl")

    for team, base in base_ratings.items():
        adj = adjusted[team]
        assert isinstance(adj, float), f"{team} adjusted value is not float"
        assert abs(adj - base) <= 50, (
            f"{team}: adjusted={adj} vs base={base}, delta={abs(adj - base):.1f} exceeds ±50"
        )


def test_apply_roster_adjustment_nba_bounds():
    from formulas.gg_elo import apply_roster_adjustment

    base_ratings = {"Celtics": 1650.0, "Lakers": 1510.0, "Pistons": 1400.0}
    mock_profiles = {
        "Celtics": {"off_rating": 15.2, "def_rating": 2.1, "depth_score": 9},
        "Lakers":  {"off_rating": 12.8, "def_rating": 1.8, "depth_score": 6},
        "Pistons": {"off_rating": 10.1, "def_rating": 1.3, "depth_score": 3},
    }
    adjusted = apply_roster_adjustment(base_ratings, mock_profiles, "nba")

    for team, base in base_ratings.items():
        assert abs(adjusted[team] - base) <= 50


def test_apply_roster_adjustment_mlb_bounds():
    from formulas.gg_elo import apply_roster_adjustment

    base_ratings = {"Dodgers": 1580.0, "Cubs": 1490.0, "Athletics": 1410.0}
    mock_profiles = {
        "Dodgers":   {"rotation_era": 2.95, "lineup_ops": 0.820, "rotation_depth": 5},
        "Cubs":      {"rotation_era": 3.80, "lineup_ops": 0.745, "rotation_depth": 3},
        "Athletics": {"rotation_era": 4.50, "lineup_ops": 0.680, "rotation_depth": 1},
    }
    adjusted = apply_roster_adjustment(base_ratings, mock_profiles, "mlb")

    for team, base in base_ratings.items():
        assert abs(adjusted[team] - base) <= 50


def test_apply_roster_adjustment_missing_profile_unchanged():
    """Teams absent from team_profiles must be returned at their original rating."""
    from formulas.gg_elo import apply_roster_adjustment

    base_ratings = {"Chiefs": 1600.0, "Unknown": 1500.0}
    mock_profiles = {
        "Chiefs": {"off_efficiency": 80.0, "def_efficiency": 6.0, "qb_qbr": 70.0},
    }
    adjusted = apply_roster_adjustment(base_ratings, mock_profiles, "nfl")

    # Unknown team has no profile → 0.5 quality score → +0 adjustment
    assert "Unknown" in adjusted
    assert abs(adjusted["Unknown"] - 1500.0) <= 50


# ─── Test 3: compute_lambdas_from_profiles — positive floats ─────────────────

def test_compute_lambdas_nfl():
    from formulas.monte_carlo import compute_lambdas_from_profiles

    profiles = {
        "Chiefs": {"off_efficiency": 85.0, "def_efficiency": 6.5},
        "Eagles": {"off_efficiency": 70.0, "def_efficiency": 5.8},
        "Bears":  {"off_efficiency": 55.0, "def_efficiency": 4.2},
    }
    lam_h, lam_a = compute_lambdas_from_profiles("Chiefs", "Eagles", profiles, "nfl", 23.5)
    assert isinstance(lam_h, float) and lam_h > 0, f"lambda_home must be positive float, got {lam_h}"
    assert isinstance(lam_a, float) and lam_a > 0, f"lambda_away must be positive float, got {lam_a}"


def test_compute_lambdas_nba():
    from formulas.monte_carlo import compute_lambdas_from_profiles

    profiles = {
        "Celtics": {"off_rating": 15.2, "def_rating": 2.1},
        "Lakers":  {"off_rating": 12.8, "def_rating": 1.8},
        "Nuggets": {"off_rating": 13.5, "def_rating": 1.9},
    }
    lam_h, lam_a = compute_lambdas_from_profiles("Celtics", "Lakers", profiles, "nba", 110.0)
    assert lam_h > 0 and lam_a > 0


def test_compute_lambdas_mlb():
    from formulas.monte_carlo import compute_lambdas_from_profiles

    profiles = {
        "Dodgers":   {"lineup_ops": 0.820, "rotation_era": 2.95},
        "Cubs":      {"lineup_ops": 0.745, "rotation_era": 3.80},
        "Athletics": {"lineup_ops": 0.680, "rotation_era": 4.50},
    }
    lam_h, lam_a = compute_lambdas_from_profiles("Dodgers", "Athletics", profiles, "mlb", 4.5)
    assert lam_h > 0 and lam_a > 0


def test_compute_lambdas_missing_team_fallback():
    from formulas.monte_carlo import compute_lambdas_from_profiles

    profiles = {"Chiefs": {"off_efficiency": 80.0, "def_efficiency": 6.0}}
    # "Eagles" is not in profiles — should fall back to (league_avg, league_avg)
    lam_h, lam_a = compute_lambdas_from_profiles("Chiefs", "Eagles", profiles, "nfl", 23.5)
    assert lam_h == 23.5 and lam_a == 23.5


# ─── Test 4: compute_futures_team_prob — range check ─────────────────────────

def test_compute_futures_team_prob_in_range():
    from formulas.market_inefficiency import compute_futures_team_prob

    books_odds = {
        "DraftKings": 400,
        "FanDuel":    380,
        "BetMGM":     420,
    }
    prob = compute_futures_team_prob("Chiefs", books_odds)
    assert isinstance(prob, float), "Result must be a float"
    assert 0.0 <= prob <= 1.0, f"Probability {prob} out of range [0, 1]"


def test_compute_futures_team_prob_single_book():
    from formulas.market_inefficiency import compute_futures_team_prob

    # Single bookmaker — should return their fair prob directly
    prob = compute_futures_team_prob("Lakers", {"DraftKings": 300})
    assert 0.0 < prob < 1.0


def test_compute_futures_team_prob_heavy_favorite():
    from formulas.market_inefficiency import compute_futures_team_prob

    prob = compute_futures_team_prob("Chiefs", {"DraftKings": -200, "FanDuel": -180})
    assert prob > 0.5, "Heavy favorite should have prob > 0.5"
    assert prob < 1.0


def test_compute_futures_team_prob_longshot():
    from formulas.market_inefficiency import compute_futures_team_prob

    prob = compute_futures_team_prob("Browns", {"DraftKings": 5000, "FanDuel": 4500})
    assert 0.0 < prob < 0.1, f"Longshot prob {prob} should be < 0.10"


def test_compute_futures_team_prob_empty_input():
    from formulas.market_inefficiency import compute_futures_team_prob

    prob = compute_futures_team_prob("Chiefs", {})
    assert prob == 0.0


# ─── Test 5: compute_mid futures path ────────────────────────────────────────

def test_compute_mid_futures_path():
    from formulas.market_inefficiency import compute_mid

    books_odds = {"DraftKings": 400, "FanDuel": 380}
    result = compute_mid(
        model_prob=0.30,
        market_odds_by_book=books_odds,
        is_futures=True,
        futures_team="Chiefs",
    )
    assert "mid_edge" in result
    assert "tier" in result
    assert "market_prob" in result
    assert 0.0 <= result["market_prob"] <= 1.0


def test_compute_mid_standard_path_unchanged():
    """Existing game-odds path must still work with no new parameters."""
    from formulas.market_inefficiency import compute_mid

    result = compute_mid(
        model_prob=0.55,
        market_odds_by_book={"FanDuel": [-110, -110]},
    )
    assert "mid_edge" in result
    assert result["market_prob"] > 0
