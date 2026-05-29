"""End-to-end integration test for GET /api/v1/picks/today.

Proves that the merge runs through the real route, not just the unit.
Asserts the response carries the auto odds alongside the hand-written analysis.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


def _make_sb_mock(daily_data: list, editorial_data: list):
    """Build a MagicMock Supabase client whose .table() call distinguishes
    picks_daily from picks_editorial by name."""
    sb = MagicMock()

    def table_side_effect(name):
        mock_q = MagicMock()
        data = daily_data if name == "picks_daily" else editorial_data
        mock_q.select.return_value.eq.return_value.execute.return_value.data = data
        return mock_q

    sb.table.side_effect = table_side_effect
    return sb


# ─── Core merge integration ──────────────────────────────────────────────────

def test_picks_today_merges_auto_and_editorial(client):
    """Route returns auto odds + hand-written analysis in one response."""
    auto = [{
        "slug": "lad",
        "game_date": "2026-05-04",
        "sport": "mlb",
        "file": "001-A",
        "pick": "LAD -1.5 RUN LINE",
        "game": "ARI @ LAD",
        "game_time": "8:30PM ET",
        "odds": -118,
        "line_signal": {},
        "components": {},
        "formulas": [],
        "audit": {},
        "model_prob": "0.6200",
        "evi": "3.8000",
        "kelly_full": "0.0400",
        "kelly_fractional": "0.0200",
    }]
    editorial = [{
        "slug": "lad",
        "game_date": "2026-05-04",
        "headline": ["The case for ", "LAD -1.5"],
        "subline": "ARI @ LAD · Run Line",
        "tag": "Tonight",
        "analysis": [{"text": ["Hand-authored truth"]}],
        "sgp_legs": [{"id": "l1", "label": "Leg 01", "pick": "LAD -1.5"}],
        "active_legs": ["l1"],
    }]

    with patch("api.routes.picks.get_supabase", return_value=_make_sb_mock(auto, editorial)):
        resp = client.get("/api/v1/picks/today?date=2026-05-04")

    assert resp.status_code == 200
    data = resp.json()

    assert data["date"] == "2026-05-04"
    assert len(data["picks"]) == 1

    pick = data["picks"][0]

    # Auto flows through: odds is from picks_daily
    assert pick["odds"] == -118
    assert pick["modelProb"] == pytest.approx(0.62)
    assert pick["evi"] == pytest.approx(3.8)

    # Editorial wins: analysis is hand-authored, NOT auto
    assert pick["analysis"] == [{"text": ["Hand-authored truth"]}]
    assert pick["headline"] == ["The case for ", "LAD -1.5"]
    assert pick["tag"] == "Tonight"
    assert pick["sgpLegs"] == [{"id": "l1", "label": "Leg 01", "pick": "LAD -1.5"}]
    assert pick["activeLegs"] == ["l1"]


def test_picks_today_empty_when_no_data(client):
    """No picks_daily rows → empty picks list, still 200."""
    with patch("api.routes.picks.get_supabase", return_value=_make_sb_mock([], [])):
        resp = client.get("/api/v1/picks/today")
    assert resp.status_code == 200
    assert resp.json()["picks"] == []


def test_picks_today_auto_only_when_no_editorial(client):
    """picks_daily row with no matching editorial → auto flows through unchanged."""
    auto = [{
        "slug": "hou",
        "game_date": "2026-05-04",
        "sport": "mlb",
        "file": "001-B",
        "pick": "HOU -1.5",
        "game": "LAA @ HOU",
        "game_time": "4:10PM ET",
        "odds": 113,
        "line_signal": {},
        "components": {},
        "formulas": [],
        "audit": {},
        "model_prob": None,
        "evi": None,
        "kelly_full": None,
        "kelly_fractional": None,
    }]

    with patch("api.routes.picks.get_supabase", return_value=_make_sb_mock(auto, [])):
        resp = client.get("/api/v1/picks/today?date=2026-05-04")

    assert resp.status_code == 200
    pick = resp.json()["picks"][0]
    assert pick["odds"] == 113
    assert pick["analysis"] == []
    assert pick["modelProb"] is None
