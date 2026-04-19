import pytest
from formulas.playoff_dna import compute_pds


def test_experienced_coach_scores_higher():
    exp = compute_pds(15, 4, 2, 100, 60, 8, clutch_net_rating=3.0, playoff_clutch_win_pct=0.6)
    inexp = compute_pds(1, 0, 0, 10, 20, 1, clutch_net_rating=-2.0, playoff_clutch_win_pct=0.4)
    assert exp["pds_score"] > inexp["pds_score"]


def test_output_in_range():
    data = compute_pds(5, 1, 0, 40, 35, 4)
    assert 0 <= data["pds_score"] <= 100


def test_components_present():
    data = compute_pds(10, 3, 1, 60, 40, 6)
    assert "coach_exp" in data["components"]
    assert "clutch" in data["components"]
    assert "historical_wr" in data["components"]
    assert "recent_depth" in data["components"]


def test_zero_games_handled():
    data = compute_pds(0, 0, 0, 0, 0, 0)
    assert data["pds_score"] >= 0
