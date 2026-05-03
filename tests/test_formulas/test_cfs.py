import pytest
from formulas.composite_futures import compute_cfs, rank_teams


def test_compute_cfs_in_range():
    result = compute_cfs(75, 68, 55, 90, 72, 65, 52, 0.06)
    assert 0 <= result["cfs_score"] <= 100


def test_high_scores_yield_high_cfs():
    high = compute_cfs(95, 92, 85, 98, 90, 88, 82, 0.12)
    low = compute_cfs(30, 28, 35, 50, 32, 30, 40, -0.05)
    assert high["cfs_score"] > low["cfs_score"]


def test_components_returned():
    result = compute_cfs(70, 65, 55, 85, 68, 62, 50, 0.04)
    assert "components" in result
    assert "weights" in result
    assert len(result["components"]) == 8


def test_rank_teams_sorted():
    teams = [
        {"team_id": "A", "gg_elo_score": 80, "nir_score": 78, "ssc_score": 55,
         "iis_score": 90, "mdi_score": 72, "pds_score": 68, "eaf_score": 52, "mid_edge": 0.08},
        {"team_id": "B", "gg_elo_score": 40, "nir_score": 38, "ssc_score": 45,
         "iis_score": 70, "mdi_score": 42, "pds_score": 48, "eaf_score": 50, "mid_edge": -0.02},
    ]
    ranked = rank_teams(teams)
    assert ranked[0]["team_id"] == "A"
    assert ranked[0]["rank"] == 1
    assert ranked[1]["rank"] == 2


def test_weights_sum_to_one():
    result = compute_cfs(50, 50, 50, 50, 50, 50, 50, 0.0)
    total = sum(result["weights"].values())
    assert abs(total - 1.0) < 0.01
