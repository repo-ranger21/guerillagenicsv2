"""
Seed Supabase team_elo table with starting ELO ratings.
Usage: python scripts/seed_elo.py --sport nba [--season 2024-25] [--reset]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.db.client import get_supabase_client

NBA_SEEDS: dict[str, float] = {
    "BOS": 1680, "OKC": 1650, "DEN": 1620, "MIL": 1590, "LAC": 1570,
    "PHI": 1565, "NYK": 1560, "MIN": 1555, "CLE": 1550, "MIA": 1545,
    "PHX": 1540, "SAC": 1530, "NOP": 1520, "DAL": 1515, "LAL": 1510,
    "GSW": 1505, "ATL": 1490, "CHI": 1480, "TOR": 1470, "IND": 1465,
    "MEM": 1460, "UTA": 1450, "ORL": 1445, "BKN": 1440, "POR": 1430,
    "OKC2": 1420, "HOU": 1415, "CHA": 1400, "DET": 1390, "WAS": 1380,
}

MLB_SEEDS: dict[str, float] = {
    "ATL": 1640, "LAD": 1630, "NYY": 1620, "HOU": 1600, "PHI": 1580,
    "BAL": 1570, "SD": 1565, "SEA": 1560, "MIL": 1550, "CLE": 1540,
    "TOR": 1530, "MIN": 1525, "BOS": 1520, "NYM": 1515, "STL": 1510,
    "TB": 1500, "ARI": 1490, "CHC": 1480, "SF": 1475, "MIA": 1470,
    "TEX": 1460, "CIN": 1450, "PIT": 1440, "COL": 1430, "KC": 1420,
    "DET": 1415, "CWS": 1400, "WSH": 1390, "LAA": 1380, "OAK": 1370,
}

NFL_SEEDS: dict[str, float] = {
    "KC": 1680, "SF": 1650, "BAL": 1620, "BUF": 1600, "DAL": 1580,
    "PHI": 1570, "MIA": 1560, "DET": 1550, "CIN": 1545, "JAX": 1540,
    "LAR": 1530, "GB": 1520, "SEA": 1515, "MIN": 1510, "CLE": 1505,
    "ATL": 1490, "LV": 1480, "NYJ": 1470, "PIT": 1465, "NE": 1460,
    "IND": 1450, "TB": 1445, "CHI": 1440, "NO": 1435, "TEN": 1430,
    "NYG": 1420, "HOU": 1415, "DEN": 1410, "LAC": 1405, "WAS": 1400,
    "CAR": 1390, "ARI": 1380,
}

SEED_MAPS = {"nba": NBA_SEEDS, "mlb": MLB_SEEDS, "nfl": NFL_SEEDS}


def seed_sport(sport: str, season: str, reset: bool) -> None:
    db = get_supabase_client()
    seeds = SEED_MAPS[sport]

    if reset:
        db.table("team_elo").delete().eq("sport", sport).eq("season", season).execute()
        print(f"[seed_elo] Cleared existing {sport} {season} ELO rows")

    rows = [
        {
            "sport": sport,
            "abbreviation": abbrev,
            "season": season,
            "elo_rating": rating,
            "games_played": 0,
        }
        for abbrev, rating in seeds.items()
    ]

    result = db.table("team_elo").upsert(rows, on_conflict="sport,abbreviation,season").execute()
    print(f"[seed_elo] Upserted {len(rows)} {sport} {season} ELO seeds")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed starting ELO ratings into Supabase")
    parser.add_argument("--sport", choices=["nba", "mlb", "nfl", "all"], default="all")
    parser.add_argument("--season", default="2024-25")
    parser.add_argument("--reset", action="store_true", help="Delete existing rows before seeding")
    args = parser.parse_args()

    sports = list(SEED_MAPS.keys()) if args.sport == "all" else [args.sport]
    for sport in sports:
        seed_sport(sport, args.season, args.reset)

    print("[seed_elo] Done.")


if __name__ == "__main__":
    main()
