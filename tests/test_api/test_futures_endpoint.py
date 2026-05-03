import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["product"] == "GuerillaGenics"


def test_futures_nba(client):
    with patch("api.routes.futures.get_futures_scores", return_value=[]):
        resp = client.get("/api/v1/futures/nba")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sport"] == "nba"
    assert "teams" in data


def test_futures_invalid_sport(client):
    resp = client.get("/api/v1/futures/hockey")
    assert resp.status_code == 404


def test_futures_mlb(client):
    with patch("api.routes.futures.get_futures_scores", return_value=[]):
        resp = client.get("/api/v1/futures/mlb")
    assert resp.status_code == 200
    assert resp.json()["sport"] == "mlb"


def test_futures_returns_mock_when_db_fails(client):
    with patch("api.routes.futures.get_futures_scores", side_effect=Exception("db down")):
        resp = client.get("/api/v1/futures/nba")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["teams"]) > 0
