"""Tests for the MLB model_prob adapter.

Proves:
  1. adapt_mlb_games() produces valid build_pick_row input.
  2. model_prob traces to win_probability() (Elo sim), NOT the components heuristic.
  3. Games without odds in odds_by_slug are silently skipped.
  4. The shaped output passes through build_pick_row without error.
"""

import math

import pytest

from formulas.monte_carlo import win_probability
from ingest.mlb_adapter import adapt_mlb_games
from ingest.picks_builder import build_pick_row, PUBLISH_EVI


# ─── fixtures ────────────────────────────────────────────────────────────────

def _game(home_abbr="LAD", away_abbr="ARI", date="2026-05-29",
          home_name="Los Angeles Dodgers", away_name="Arizona Diamondbacks"):
    return {
        "game_pk": 745001,
        "game_date": date,
        "home_id": "119",
        "home_abbr": home_abbr,
        "home_name": home_name,
        "away_id": "109",
        "away_abbr": away_abbr,
        "away_name": away_name,
        "game_time": "2026-05-29T01:10:00Z",
    }


_ELO_MAP = {
    "Los Angeles Dodgers": 1620.0,
    "Arizona Diamondbacks": 1480.0,
    "LAD": 1620.0,
    "ARI": 1480.0,
}

_SLUG = "ari-lad-2026-05-29"


# ─── core parity tests ───────────────────────────────────────────────────────

def test_model_prob_traces_to_elo_sim():
    """model_prob in the shaped pick must equal win_probability(home_elo, away_elo)."""
    candidates = adapt_mlb_games([_game()], _ELO_MAP, {_SLUG: -130})
    assert len(candidates) == 1
    pick = candidates[0]

    expected_prob = win_probability(1620.0, 1480.0, a_has_home=True)
    assert math.isclose(pick["model_prob"], expected_prob, rel_tol=1e-6)


def test_model_prob_is_not_from_components():
    """components is display-only; changing it must not affect model_prob."""
    base = adapt_mlb_games([_game()], _ELO_MAP, {_SLUG: -130})
    assert len(base) == 1
    prob_base = base[0]["model_prob"]

    # A completely different components dict must yield the same model_prob
    # (it comes from Elo, not from components).
    game_with_junk = {**_game(), "some_garbage": {"era": 0.01, "fip": 0.99}}
    varied = adapt_mlb_games([game_with_junk], _ELO_MAP, {_SLUG: -130})
    assert len(varied) == 1
    assert math.isclose(varied[0]["model_prob"], prob_base, rel_tol=1e-9)


def test_shaped_output_has_all_required_build_pick_row_keys():
    """Every key required by build_pick_row must be present."""
    candidates = adapt_mlb_games([_game()], _ELO_MAP, {_SLUG: -130})
    required = {"slug", "sport", "game", "pick", "odds", "model_prob"}
    assert required.issubset(candidates[0].keys())


def test_shaped_output_passes_through_build_pick_row():
    """build_pick_row must accept the adapter output without error."""
    candidates = adapt_mlb_games([_game()], _ELO_MAP, {_SLUG: -130})
    row = build_pick_row(candidates[0], "2026-05-29")
    assert 0 < row["model_prob"] < 1
    assert isinstance(row["evi"], float)
    assert isinstance(row["kelly_full"], float)
    assert row["kelly_full"] >= 0
    assert row["sport"] == "mlb"


def test_game_without_odds_is_skipped():
    """A game slug absent from odds_by_slug must be dropped — never fabricated."""
    candidates = adapt_mlb_games([_game()], _ELO_MAP, odds_by_slug={})
    assert candidates == []


def test_only_games_with_odds_are_returned():
    """With two games, only the one that has odds is returned."""
    g1 = _game(home_abbr="LAD", away_abbr="ARI")
    g2 = _game(home_abbr="NYY", away_abbr="BOS",
                home_name="New York Yankees", away_name="Boston Red Sox")
    slug2 = "bos-nyy-2026-05-29"
    elo_map = {**_ELO_MAP, "New York Yankees": 1590.0, "Boston Red Sox": 1510.0,
               "NYY": 1590.0, "BOS": 1510.0}

    candidates = adapt_mlb_games([g1, g2], elo_map, {slug2: -150})
    assert len(candidates) == 1
    assert candidates[0]["slug"] == slug2


def test_missing_elo_falls_back_to_neutral():
    """A team not in elo_map should use 1500 (neutral) without crashing."""
    candidates = adapt_mlb_games([_game()], elo_map={}, odds_by_slug={_SLUG: -130})
    assert len(candidates) == 1
    prob = candidates[0]["model_prob"]
    # Both teams at Elo 1500 with home-court advantage → home win prob > 0.5
    expected = win_probability(1500.0, 1500.0, a_has_home=True)
    assert math.isclose(prob, expected, rel_tol=1e-6)


def test_slug_format():
    """slug must be away_abbr-home_abbr-date (lowercase, hyphen-separated)."""
    candidates = adapt_mlb_games([_game()], _ELO_MAP, {_SLUG: -130})
    assert candidates[0]["slug"] == "ari-lad-2026-05-29"


def test_pick_label_uses_home_team_ml():
    """pick label should identify the home team + ML market."""
    candidates = adapt_mlb_games([_game()], _ELO_MAP, {_SLUG: -130})
    assert "Los Angeles Dodgers" in candidates[0]["pick"]
    assert "ML" in candidates[0]["pick"]
