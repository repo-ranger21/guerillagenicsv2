"""
FORMULA 07 — Environmental Adjustment Factor (EAF)
Accounts for home/away split, travel distance, rest days, altitude,
and (for NFL/outdoor sports) weather conditions.
"""

from utils.haversine import travel_fatigue_factor
from utils.normalizer import clamp


HOME_COURT_BASE = 3.5
REST_OPTIMAL = 2
REST_CAP = 5


def rest_advantage(team_rest_days: int, opp_rest_days: int) -> float:
    team_adj = clamp((team_rest_days - REST_OPTIMAL) * 0.5, -2.0, 2.0)
    opp_adj = clamp((opp_rest_days - REST_OPTIMAL) * 0.5, -2.0, 2.0)
    return round(team_adj - opp_adj, 4)


def altitude_factor(venue_altitude_ft: float) -> float:
    if venue_altitude_ft < 3000:
        return 0.0
    return round(min((venue_altitude_ft - 3000) / 2000 * 0.03, 0.05), 4)


def weather_impact(
    temp_f: float = 65.0,
    wind_mph: float = 5.0,
    precipitation_in: float = 0.0,
    is_outdoor: bool = False,
) -> float:
    if not is_outdoor:
        return 0.0
    heat_penalty = max(0, (temp_f - 90) / 10 * 0.02)
    cold_penalty = max(0, (32 - temp_f) / 10 * 0.025)
    wind_penalty = max(0, (wind_mph - 15) / 10 * 0.015)
    rain_penalty = precipitation_in * 0.01
    return round(-(heat_penalty + cold_penalty + wind_penalty + rain_penalty), 4)


def compute_eaf(
    is_home: bool,
    travel_miles: float,
    team_rest_days: int,
    opp_rest_days: int,
    venue_altitude_ft: float = 0.0,
    temp_f: float = 65.0,
    wind_mph: float = 5.0,
    precipitation_in: float = 0.0,
    is_outdoor: bool = False,
) -> dict:
    home_val = HOME_COURT_BASE if is_home else -HOME_COURT_BASE
    fatigue = -travel_fatigue_factor(travel_miles) * 10
    rest = rest_advantage(team_rest_days, opp_rest_days)
    altitude = altitude_factor(venue_altitude_ft) * 10
    weather = weather_impact(temp_f, wind_mph, precipitation_in, is_outdoor) * 10

    raw = home_val + fatigue + rest + altitude + weather

    base_min, base_max = -12.0, 12.0
    score = clamp((raw - base_min) / (base_max - base_min) * 100, 0, 100)

    return {
        "eaf_raw": round(raw, 4),
        "eaf_score": round(score, 2),
        "components": {
            "home_advantage": round(home_val, 2),
            "travel_fatigue": round(fatigue, 4),
            "rest_delta": round(rest, 4),
            "altitude": round(altitude, 4),
            "weather": round(weather, 4),
        },
    }
