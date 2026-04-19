import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


def test_needle_nba_returns_200(client):
    with patch("api.routes.needle.get_active_needles", return_value=[]):
        resp = client.get("/api/v1/needle/nba")
    assert resp.status_code == 200


def test_needle_response_structure(client):
    mock_alert = {
        "team_abbreviation": "OKC",
        "tier": "NEEDLE",
        "edge_pct": 0.094,
        "best_odds": 450,
    }
    with patch("api.routes.needle.get_active_needles", return_value=[mock_alert]):
        resp = client.get("/api/v1/needle/nba")
    data = resp.json()
    assert "needles" in data
    assert "active_count" in data


def test_needle_invalid_sport(client):
    resp = client.get("/api/v1/needle/cricket")
    assert resp.status_code == 404


def test_needle_all_sports(client):
    with patch("api.routes.alerts.get_active_needles", return_value=[]):
        resp = client.get("/api/v1/alerts/needle")
    assert resp.status_code == 200
    assert "alerts" in resp.json()
