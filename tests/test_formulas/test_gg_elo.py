import pytest
from formulas.gg_elo import (
    expected_score, update_elo, season_reset,
    normalize_elo_to_score, BASE_RATING, EloState
)


def test_expected_score_equal_ratings():
    assert expected_score(1500, 1500) == pytest.approx(0.5, abs=0.001)


def test_expected_score_higher_wins():
    es = expected_score(1600, 1500)
    assert es > 0.5


def test_update_elo_winner_gains():
    winner = EloState("A", 1500)
    loser = EloState("B", 1500)
    new_w, new_l = update_elo(winner, loser, margin=10)
    assert new_w > 1500
    assert new_l < 1500


def test_update_elo_sum_conserved():
    winner = EloState("A", 1500)
    loser = EloState("B", 1500)
    new_w, new_l = update_elo(winner, loser, margin=5)
    assert abs((new_w + new_l) - (winner.rating + loser.rating)) < 1.0


def test_season_reset_moves_toward_base():
    high_rating = 1700.0
    reset = season_reset(high_rating)
    assert reset < high_rating
    assert reset > BASE_RATING


def test_normalize_elo_midpoint():
    score = normalize_elo_to_score(1525.0)
    assert 0 <= score <= 100


def test_compute_gg_elo_from_games():
    from formulas.gg_elo import compute_gg_elo_from_games
    games = [
        {"winner_id": "A", "loser_id": "B", "margin": 8, "winner_home": True, "date": "2025-01-01"},
        {"winner_id": "B", "loser_id": "C", "margin": 3, "winner_home": False, "date": "2025-01-02"},
    ]
    teams = {}
    result = compute_gg_elo_from_games(games, teams)
    assert "A" in result
    assert "B" in result
    assert result["A"].rating > BASE_RATING
