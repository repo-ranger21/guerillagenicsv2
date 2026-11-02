import math


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(2 * R * math.asin(math.sqrt(a)), 1)


def travel_fatigue_factor(miles: float) -> float:
    if miles < 500:
        return 0.0
    if miles < 1500:
        return round((miles - 500) / 1000 * 0.02, 4)
    if miles < 2500:
        return round(0.02 + (miles - 1500) / 1000 * 0.03, 4)
    return round(min(0.08, 0.05 + (miles - 2500) / 1000 * 0.01), 4)
