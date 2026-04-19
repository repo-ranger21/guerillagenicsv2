import pytest
import respx
import httpx
from unittest.mock import patch
import json


MOCK_STANDINGS = {
    "children": [{
        "name": "Eastern Conference",
        "standings": {
            "entries": [{
                "team": {"id": "1", "abbreviation": "BOS", "displayName": "Boston Celtics"},
                "stats": [
                    {"name": "wins", "value": 60},
                    {"name": "losses", "value": 20},
                    {"name": "winPercent", "value": 0.75},
                    {"name": "gamesBehind", "value": 0},
                ]
            }]
        }
    }]
}


@respx.mock
def test_fetch_standings_returns_teams():
    respx.get("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/standings").mock(
        return_value=httpx.Response(200, json=MOCK_STANDINGS)
    )
    with patch("scrapers.espn._get", return_value=MOCK_STANDINGS):
        from scrapers.espn import fetch_standings
        teams = fetch_standings("nba")
    assert len(teams) >= 1


def test_fetch_standings_invalid_sport():
    from scrapers.espn import fetch_standings
    with pytest.raises(ValueError, match="Unknown sport"):
        fetch_standings("hockey")


MOCK_INJURIES = {
    "injuries": [{
        "athlete": {"id": "1234", "fullName": "Test Player"},
        "team": {"id": "1"},
        "status": "OUT",
        "longComment": "Knee injury",
        "returnDate": None,
    }]
}


def test_fetch_injuries_parses_status():
    with patch("scrapers.espn._get", return_value=MOCK_INJURIES):
        from scrapers.espn import fetch_injuries
        injuries = fetch_injuries("nba")
    assert len(injuries) == 1
    assert injuries[0]["status"] == "OUT"
    assert injuries[0]["player_name"] == "Test Player"
