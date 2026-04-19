"""
MLB ingest pipeline.
"""

from scrapers.mlb_stats import fetch_standings
from scrapers.odds_api import fetch_championship_odds, build_team_odds_map
from scrapers.injuries import get_active_injuries
from formulas.composite_futures import rank_teams
from formulas.market_inefficiency import compute_mid
from formulas.kelly_criterion import kelly_from_american
from db.queries.needle_alerts import create_needle_alert
from db.queries.model_snapshots import save_snapshot
from utils.odds_converter import american_to_implied_prob
from utils.logger import get_logger

logger = get_logger(__name__)
SEASON = "2025"
NEEDLE_EDGE_THRESHOLD = 0.05


def run_mlb_pipeline() -> dict:
    logger.info("mlb_pipeline_start")

    standings = fetch_standings(season=2025, league_id=103)
    al_standings = fetch_standings(season=2025, league_id=103)
    nl_standings = fetch_standings(season=2025, league_id=104)
    all_standings = al_standings + nl_standings

    injuries_by_team = get_active_injuries("mlb")
    championship_odds = fetch_championship_odds("mlb")
    odds_map = build_team_odds_map(championship_odds)

    teams_input = []
    for team in all_standings:
        wins = team.get("wins", 0)
        losses = team.get("losses", 0)
        win_pct = wins / max(wins + losses, 1)
        run_diff = team.get("run_differential", 0)

        elo_rating = 1500 + (win_pct - 0.5) * 400 + run_diff * 0.5
        elo_score = max(0, min(100, (elo_rating - 1350) / 350 * 100))

        abbr = team.get("abbreviation", "")
        inj_list = injuries_by_team.get(team.get("mlb_id", ""), [])

        teams_input.append({
            "team_id": team.get("mlb_id", abbr),
            "abbreviation": abbr,
            "full_name": team.get("full_name"),
            "gg_elo": round(elo_rating, 2),
            "gg_elo_score": round(elo_score, 2),
            "nir_score": round(50 + win_pct * 50, 2),
            "ssc_score": 50.0,
            "iis_score": max(0, 100 - len(inj_list) * 8),
            "mdi_score": round(50 + (win_pct - 0.5) * 60, 2),
            "pds_score": 55.0,
            "eaf_score": 50.0,
            "mid_edge": 0.0,
            "season": SEASON,
            "sport": "mlb",
        })

    ranked = rank_teams(teams_input)

    needle_count = 0
    for team in ranked:
        book_odds = odds_map.get(team.get("full_name", ""), {})
        if not book_odds:
            continue
        champ_prob = team["cfs_score"] / 100 * 0.25
        mid = compute_mid(champ_prob, book_odds)
        if mid["mid_edge"] >= NEEDLE_EDGE_THRESHOLD:
            flat = [o for ol in book_odds.values() for o in ol]
            best_o = max(flat) if flat else -1000
            kelly = kelly_from_american(champ_prob, best_o) if best_o > -5000 else {}
            try:
                create_needle_alert({
                    "team_id": team.get("team_id"),
                    "sport": "mlb",
                    "season": SEASON,
                    "tier": mid["tier"],
                    "edge_pct": mid["mid_edge"],
                    "our_prob": mid["model_prob"],
                    "market_prob": mid["market_prob"],
                    "best_odds": best_o,
                    "best_bookmaker": list(book_odds.keys())[0],
                    "signals_triggered": mid.get("triggered_signals", []),
                    "kelly_fraction": kelly.get("full_kelly", 0),
                    "quarter_kelly": kelly.get("quarter_kelly", 0),
                })
                needle_count += 1
            except Exception as e:
                logger.warning("needle_insert_failed", sport="mlb", error=str(e))

    try:
        save_snapshot("mlb", SEASON, "weekly", {
            "teams": ranked[:10],
            "champion_probs": {t["abbreviation"]: round(t["cfs_score"] / 100 * 0.25, 4) for t in ranked},
        }, ranked[0]["abbreviation"] if ranked else None)
    except Exception as e:
        logger.warning("snapshot_save_failed", error=str(e))

    logger.info("mlb_pipeline_complete", teams=len(ranked), needles=needle_count)
    return {"teams_processed": len(ranked), "needles_created": needle_count}
