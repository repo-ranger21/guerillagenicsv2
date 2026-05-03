import pytest
from unittest.mock import patch
from scrapers.odds_api import (
    _parse_outrights, build_team_odds_map, get_best_odds
)


MOCK_API_RESPONSE = [{
    "bookmakers": [{
        "key": "fanduel",
        "last_update": "2025-04-19T10:00:00Z",
        "markets": [{
            "key": "outrights",
            "outcomes": [
                {"name": "Boston Celtics", "price": -150},
                {"name": "Oklahoma City Thunder", "price": 450},
            ]
        }]
    }, {
        "key": "draftkings",
        "last_update": "2025-04-19T10:00:00Z",
        "markets": [{
            "key": "outrights",
            "outcomes": [
                {"name": "Boston Celtics", "price": -140},
                {"name": "Oklahoma City Thunder", "price": 480},
            ]
        }]
    }]
}]


def test_parse_outrights_extracts_teams():
    result = _parse_outrights(MOCK_API_RESPONSE, "nba")
    team_names = [r["team_name"] for r in result]
    assert "Boston Celtics" in team_names
    assert "Oklahoma City Thunder" in team_names


def test_parse_outrights_extracts_bookmakers():
    result = _parse_outrights(MOCK_API_RESPONSE, "nba")
    books = {r["bookmaker"] for r in result}
    assert "fanduel" in books
    assert "draftkings" in books


def test_build_team_odds_map():
    raw = _parse_outrights(MOCK_API_RESPONSE, "nba")
    mapping = build_team_odds_map(raw)
    assert "Boston Celtics" in mapping
    assert "fanduel" in mapping["Boston Celtics"]


def test_get_best_odds_favors_highest():
    raw = _parse_outrights(MOCK_API_RESPONSE, "nba")
    mapping = build_team_odds_map(raw)
    best_o, best_book = get_best_odds("Oklahoma City Thunder", mapping)
    assert best_o == 480
    assert best_book == "draftkings"


def test_get_best_odds_missing_team():
    best_o, best_book = get_best_odds("Fake Team", {})
    assert best_o == -10000
    assert best_book == "none"
