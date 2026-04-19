import pytest
from formulas.net_impact_rating import compute_nir, normalize_nir_to_score, compute_nir_batch


def test_positive_net_rating():
    nir = compute_nir(115, 105, 100, 50)
    assert nir > 0


def test_negative_net_rating():
    nir = compute_nir(100, 115, 100, 50)
    assert nir < 0


def test_pace_adjustment():
    nir_fast = compute_nir(115, 105, 110, 50, league_avg_pace=100)
    nir_slow = compute_nir(115, 105, 90, 50, league_avg_pace=100)
    assert nir_fast != nir_slow


def test_opponent_strength_adjustment():
    nir_hard = compute_nir(115, 105, 100, 80)
    nir_easy = compute_nir(115, 105, 100, 20)
    assert nir_hard > nir_easy


def test_normalize_range():
    score = normalize_nir_to_score(5.0)
    assert 0 <= score <= 100


def test_batch_returns_scores():
    teams = [
        {"team_id": "A", "pts_per_100": 115, "opp_per_100": 105, "pace": 100, "opp_strength_pct": 55},
        {"team_id": "B", "pts_per_100": 108, "opp_per_100": 112, "pace": 98, "opp_strength_pct": 45},
    ]
    result = compute_nir_batch(teams)
    assert len(result) == 2
    assert "nir_score" in result[0]
    assert result[0]["nir_score"] > result[1]["nir_score"]
