"""
NBA ingest pipeline — runs all NBA data collection and score computation.
"""

from scrapers.nba_stats import fetch_team_advanced_stats, fetch_team_base_stats, fetch_team_clutch_stats
from scrapers.espn import fetch_standings, fetch_injuries
from scrapers.odds_api import fetch_championship_odds, build_team_odds_map
from scrapers.injuries import get_active_injuries
from formulas.gg_elo import compute_gg_elo_from_games, normalize_elo_to_score, EloState
from formulas.net_impact_rating import compute_nir_batch
from formulas.injury_impact import compute_iis_batch
from formulas.momentum_decay import compute_mdi_batch
from formulas.composite_futures import rank_teams
from formulas.market_inefficiency import compute_mid
from formulas.kelly_criterion import kelly_from_american
from db.queries.teams import get_all_teams
from db.queries.odds_history import insert_odds_batch
from db.queries.needle_alerts import create_needle_alert, deactivate_needles_for_team
from db.queries.model_snapshots import save_snapshot
from utils.odds_converter import american_to_implied_prob
from utils.logger import get_logger
from datetime import datetime

logger = get_logger(__name__)
SEASON = "2024-25"
NEEDLE_EDGE_THRESHOLD = 0.05


def run_nba_pipeline() -> dict:
    logger.info("nba_pipeline_start")

    advanced = fetch_team_advanced_stats(SEASON)
    base_per100 = fetch_team_base_stats(SEASON)
    standings = fetch_standings("nba")
    injuries_by_team = get_active_injuries("nba")
    championship_odds = fetch_championship_odds("nba")
    odds_map = build_team_odds_map(championship_odds)

    espn_id_map = {t["espn_id"]: t for t in standings}
    adv_map = {row.get("TEAM_ID"): row for row in advanced}
    base_map = {row.get("TEAM_ID"): row for row in base_per100}

    teams_input = []
    for standing in standings:
        eid = standing.get("espn_id")
        adv = adv_map.get(eid, {})
        base = base_map.get(eid, {})

        nir_pace = float(adv.get("PACE", 100) or 100)
        pts_per100 = float(base.get("PTS", 110) or 110)
        opp_per100 = float(base.get("OPP_PTS", 110) or 110)
        net_rtg = float(adv.get("NET_RATING", 0) or 0)

        inj_list = injuries_by_team.get(eid, [])
        wins = standing.get("wins", 0)
        losses = standing.get("losses", 0)
        win_pct = wins / max(wins + losses, 1)

        elo_rating = 1500 + (win_pct - 0.5) * 400
        elo_score = normalize_elo_to_score(elo_rating)

        teams_input.append({
            "team_id": eid or standing.get("abbreviation", "UNK"),
            "abbreviation": standing.get("abbreviation"),
            "full_name": standing.get("display_name"),
            "gg_elo": elo_rating,
            "gg_elo_score": elo_score,
            "pts_per_100": pts_per100,
            "opp_per_100": opp_per100,
            "pace": nir_pace,
            "opp_strength_pct": 50.0,
            "injuries": inj_list,
            "baseline_win_shares": 30.0,
            "recent_results": [],
            "pds_score": 60.0,
            "eaf_score": 50.0,
            "season": SEASON,
            "sport": "nba",
        })

    teams_with_nir = compute_nir_batch(teams_input)
    teams_with_iis = compute_iis_batch(teams_with_nir)
    teams_with_mdi = compute_mdi_batch(teams_with_iis)

    for t in teams_with_mdi:
        abbr = t.get("abbreviation", "")
        book_odds = odds_map.get(t.get("full_name", ""), {})
        flat_odds = [o for ol in book_odds.values() for o in ol]
        if flat_odds:
            best = max(flat_odds)
            market_prob = american_to_implied_prob(best)
            t["mid_edge"] = max(0, 0.12 - market_prob)
        else:
            t["mid_edge"] = 0.0

    ranked = rank_teams(teams_with_mdi)

    needle_count = 0
    for team in ranked:
        abbr = team.get("abbreviation", "")
        book_odds = odds_map.get(team.get("full_name", ""), {})
        champ_prob = team.get("championship_prob", team["cfs_score"] / 100 * 0.3)
        if book_odds:
            mid = compute_mid(champ_prob, book_odds)
            if mid["mid_edge"] >= NEEDLE_EDGE_THRESHOLD:
                flat = [o for ol in book_odds.values() for o in ol]
                best_o = max(flat) if flat else -1000
                kelly = kelly_from_american(champ_prob, best_o) if best_o > -5000 else {}
                try:
                    create_needle_alert({
                        "team_id": team.get("team_id"),
                        "sport": "nba",
                        "season": SEASON,
                        "tier": mid["tier"],
                        "edge_pct": mid["mid_edge"],
                        "our_prob": mid["model_prob"],
                        "market_prob": mid["market_prob"],
                        "best_odds": best_o,
                        "best_bookmaker": list(book_odds.keys())[0] if book_odds else "unknown",
                        "signals_triggered": mid.get("triggered_signals", []),
                        "kelly_fraction": kelly.get("full_kelly", 0),
                        "quarter_kelly": kelly.get("quarter_kelly", 0),
                    })
                    needle_count += 1
                except Exception as e:
                    logger.warning("needle_insert_failed", team=abbr, error=str(e))

    snapshot_payload = {
        "teams": ranked[:10],
        "simulation_count": 100000,
        "champion_probs": {t["abbreviation"]: t.get("championship_prob", 0) for t in ranked},
    }
    top_needle = ranked[0]["abbreviation"] if ranked else None
    try:
        save_snapshot("nba", SEASON, "weekly", snapshot_payload, top_needle)
    except Exception as e:
        logger.warning("snapshot_save_failed", error=str(e))

    logger.info("nba_pipeline_complete", teams=len(ranked), needles=needle_count)
    return {"teams_processed": len(ranked), "needles_created": needle_count}
