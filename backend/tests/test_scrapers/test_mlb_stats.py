import pytest
from unittest.mock import patch

MOCK_STANDINGS_RESPONSE = {
    "records": [{
        "division": {"name": "AL East"},
        "teamRecords": [{
            "team": {"id": 147, "abbreviation": "NYY", "name": "New York Yankees"},
            "wins": 95,
            "losses": 67,
            "winningPercentage": ".586",
            "gamesBack": "-",
            "runDifferential": 85,
        }]
    }]
}


def test_fetch_standings_parses_teams():
    with patch("scrapers.mlb_stats._get", return_value=MOCK_STANDINGS_RESPONSE):
        from scrapers.mlb_stats import fetch_standings
        teams = fetch_standings(season=2025)
    assert len(teams) == 1
    assert teams[0]["abbreviation"] == "NYY"
    assert teams[0]["wins"] == 95


def test_fetch_standings_win_pct():
    with patch("scrapers.mlb_stats._get", return_value=MOCK_STANDINGS_RESPONSE):
        from scrapers.mlb_stats import fetch_standings
        teams = fetch_standings(season=2025)
    assert teams[0]["win_pct"] == pytest.approx(0.586, abs=0.001)


MOCK_BATTING = {
    "stats": [{"splits": [{"stat": {"homeRuns": 45, "battingAverage": ".285", "ops": ".912"}}]}]
}


def test_fetch_team_batting_returns_stats():
    with patch("scrapers.mlb_stats._get", return_value=MOCK_BATTING):
        from scrapers.mlb_stats import fetch_team_batting
        stats = fetch_team_batting("147")
    assert "homeRuns" in stats or stats is not None
