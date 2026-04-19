"""
OpenWeatherMap scraper for game-day weather conditions (NFL outdoor stadiums).
"""

import os
import requests
from tenacity import retry, stop_after_attempt, wait_exponential
from utils.logger import get_logger

logger = get_logger(__name__)

OWM_BASE = os.getenv("OPENWEATHER_BASE_URL", "https://api.openweathermap.org/data/2.5")

NFL_OUTDOOR_VENUES = {
    "BUF": {"lat": 42.7738, "lon": -78.7870, "name": "Highmark Stadium"},
    "CHI": {"lat": 41.8623, "lon": -87.6167, "name": "Soldier Field"},
    "CLE": {"lat": 41.5061, "lon": -81.6995, "name": "Huntington Bank Field"},
    "DEN": {"lat": 39.7439, "lon": -105.0201, "name": "Empower Field"},
    "GB":  {"lat": 44.5013, "lon": -88.0622, "name": "Lambeau Field"},
    "KC":  {"lat": 39.0489, "lon": -94.4839, "name": "GEHA Field"},
    "NYG": {"lat": 40.8135, "lon": -74.0745, "name": "MetLife Stadium"},
    "NYJ": {"lat": 40.8135, "lon": -74.0745, "name": "MetLife Stadium"},
    "LV":  {"lat": 36.0908, "lon": -115.1838, "name": "Allegiant Stadium"},
    "SF":  {"lat": 37.4033, "lon": -121.9694, "name": "Levi's Stadium"},
    "SEA": {"lat": 47.5952, "lon": -122.3316, "name": "Lumen Field"},
    "NE":  {"lat": 42.0909, "lon": -71.2643, "name": "Gillette Stadium"},
    "PIT": {"lat": 40.4468, "lon": -80.0158, "name": "Acrisure Stadium"},
    "BAL": {"lat": 39.2780, "lon": -76.6227, "name": "M&T Bank Stadium"},
    "CIN": {"lat": 39.0954, "lon": -84.5161, "name": "Paycor Stadium"},
    "TEN": {"lat": 36.1665, "lon": -86.7713, "name": "Nissan Stadium"},
}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
def _get(endpoint: str, params: dict) -> dict:
    api_key = os.environ["OPENWEATHER_API_KEY"]
    params["appid"] = api_key
    params["units"] = "imperial"
    resp = requests.get(f"{OWM_BASE}{endpoint}", params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def fetch_current_weather(lat: float, lon: float) -> dict:
    data = _get("/weather", {"lat": lat, "lon": lon})
    return {
        "temp_f": round(data.get("main", {}).get("temp", 65), 1),
        "feels_like_f": round(data.get("main", {}).get("feels_like", 65), 1),
        "wind_mph": round(data.get("wind", {}).get("speed", 0), 1),
        "wind_gust_mph": round(data.get("wind", {}).get("gust", 0), 1),
        "precipitation_in": round(data.get("rain", {}).get("1h", 0) * 0.0394, 3),
        "conditions": data.get("weather", [{}])[0].get("description", ""),
        "humidity_pct": data.get("main", {}).get("humidity", 50),
    }


def fetch_forecast_at_time(lat: float, lon: float, target_dt: int) -> dict:
    data = _get("/forecast", {"lat": lat, "lon": lon, "cnt": 40})
    best = min(
        data.get("list", []),
        key=lambda x: abs(x.get("dt", 0) - target_dt),
        default={}
    )
    if not best:
        return {"temp_f": 65.0, "wind_mph": 5.0, "precipitation_in": 0.0}
    return {
        "temp_f": round(best.get("main", {}).get("temp", 65), 1),
        "wind_mph": round(best.get("wind", {}).get("speed", 0), 1),
        "precipitation_in": round(best.get("rain", {}).get("3h", 0) * 0.0394, 3),
        "conditions": best.get("weather", [{}])[0].get("description", ""),
    }


def get_game_weather(team_abbr: str, game_timestamp: int | None = None) -> dict:
    venue = NFL_OUTDOOR_VENUES.get(team_abbr.upper())
    if not venue:
        return {"is_outdoor": False, "temp_f": 65.0, "wind_mph": 5.0, "precipitation_in": 0.0}
    try:
        if game_timestamp:
            weather = fetch_forecast_at_time(venue["lat"], venue["lon"], game_timestamp)
        else:
            weather = fetch_current_weather(venue["lat"], venue["lon"])
        return {"is_outdoor": True, "venue": venue["name"], **weather}
    except Exception as e:
        logger.warning("weather_fetch_failed", team=team_abbr, error=str(e))
        return {"is_outdoor": True, "temp_f": 55.0, "wind_mph": 10.0, "precipitation_in": 0.0}
