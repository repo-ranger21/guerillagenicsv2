import pytest
from formulas.momentum_decay import compute_mdi, compute_mdi_batch


def make_results(wins: list[bool], margins: list[int]) -> list[dict]:
    return [{"won": w, "margin": m} for w, m in zip(wins, margins)]


def test_all_wins_high_score():
    results = make_results([True] * 10, [8] * 10)
    data = compute_mdi(results)
    assert data["mdi_score"] > 70


def test_all_losses_low_score():
    results = make_results([False] * 10, [5] * 10)
    data = compute_mdi(results)
    assert data["mdi_score"] < 30


def test_empty_returns_neutral():
    data = compute_mdi([])
    assert data["mdi_score"] == 50.0


def test_streak_positive_on_wins():
    results = make_results([True, True, True, False], [5, 6, 7, 4])
    data = compute_mdi(results)
    assert data["streak"] == 3


def test_streak_negative_on_losses():
    results = make_results([False, False, True, True], [3, 4, 5, 6])
    data = compute_mdi(results)
    assert data["streak"] == -2


def test_batch():
    teams = [
        {"team_id": "A", "recent_results": make_results([True] * 8, [7] * 8)},
        {"team_id": "B", "recent_results": make_results([False] * 8, [4] * 8)},
    ]
    result = compute_mdi_batch(teams)
    assert result[0]["mdi_score"] > result[1]["mdi_score"]
