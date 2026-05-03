"""
Roster Aggregator — GuerillaGenics pipeline layer
Reads Notion CSV exports and produces team-level stat profiles that feed
the Elo (apply_roster_adjustment) and scoring (compute_lambdas_from_profiles) engines.
"""

import glob
import logging
import math
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).parent.parent.parent
_RAW_DIR = _REPO_ROOT / "data" / "raw" / "notion_rosters_2026"

# NFL skill and defensive position sets
_NFL_SKILL = {"QB", "RB", "WR", "TE"}
_NFL_DEF = {"LB", "CB", "S", "DE", "DT", "DL"}

# MLB pitcher positions
_MLB_PITCHER = {"P", "TWP"}


def _to_num(series: pd.Series) -> pd.Series:
    """Coerce a column to float; non-numeric becomes NaN (never zero-filled)."""
    return pd.to_numeric(series, errors="coerce")


def _warn_low(team: str, metric: str, count: int) -> None:
    logger.warning(
        "low_player_count team=%s metric=%s contributing_players=%d", team, metric, count
    )


# ─── FUNCTION 1 ──────────────────────────────────────────────────────────────

def aggregate_nfl_teams(csv_path: str) -> dict[str, dict]:
    """
    Reads an NFL roster CSV and returns team-level stat profiles.

    Metrics returned per team:
        off_efficiency    – weighted avg (PASS_YDS + RUSH_YDS) per GP for skill positions
        def_efficiency    – weighted avg (TOT + SACK + INT) per GP for defensive positions
        qb_qbr            – GP-weighted average QBR across active QBs
        run_game_strength – total RUSH_YDS / total CAR across all RBs (yards per carry)
        turnover_risk     – total (INT + FUM) per total GP for offensive players

    Returns {} for a team whose data is wholly insufficient.
    Missing/empty stat cells are treated as NaN throughout — never zero-filled.
    """
    df = pd.read_csv(csv_path, encoding="utf-8-sig")

    stat_cols = ["GP", "PASS_YDS", "RUSH_YDS", "TOT", "SACK", "INT", "QBR", "CAR", "FUM"]
    for col in stat_cols:
        if col in df.columns:
            df[col] = _to_num(df[col])

    # Only players who actually played
    df = df[df["GP"].notna() & (df["GP"] > 0)].copy()

    results: dict[str, dict] = {}

    for team, grp in df.groupby("Team"):
        if not isinstance(team, str) or not team.strip():
            continue

        team_result: dict = {}

        # ── off_efficiency ────────────────────────────────────────────────────
        skill = grp[grp["Position"].isin(_NFL_SKILL)].copy()
        skill_gp_sum = skill["GP"].sum(skipna=True)
        if len(skill) < 3:
            _warn_low(team, "off_efficiency", len(skill))
        if skill_gp_sum > 0 and len(skill) >= 1:
            yards = skill["PASS_YDS"].fillna(0) + skill["RUSH_YDS"].fillna(0)
            team_result["off_efficiency"] = round(float(yards.sum()) / float(skill_gp_sum), 4)
        else:
            team_result["off_efficiency"] = None

        # ── def_efficiency ────────────────────────────────────────────────────
        defense = grp[grp["Position"].isin(_NFL_DEF)].copy()
        def_gp_sum = defense["GP"].sum(skipna=True)
        if len(defense) < 3:
            _warn_low(team, "def_efficiency", len(defense))
        if def_gp_sum > 0 and len(defense) >= 1:
            def_stats = defense["TOT"].fillna(0) + defense["SACK"].fillna(0) + defense["INT"].fillna(0)
            team_result["def_efficiency"] = round(float(def_stats.sum()) / float(def_gp_sum), 4)
        else:
            team_result["def_efficiency"] = None

        # ── qb_qbr ───────────────────────────────────────────────────────────
        qbs = grp[(grp["Position"] == "QB") & grp["QBR"].notna()].copy()
        qb_gp_sum = qbs["GP"].sum(skipna=True)
        if len(qbs) < 1:
            _warn_low(team, "qb_qbr", len(qbs))
        if qb_gp_sum > 0:
            team_result["qb_qbr"] = round(float((qbs["QBR"] * qbs["GP"]).sum()) / float(qb_gp_sum), 4)
        else:
            team_result["qb_qbr"] = None

        # ── run_game_strength ─────────────────────────────────────────────────
        rbs = grp[grp["Position"] == "RB"].copy()
        total_car = rbs["CAR"].sum(skipna=True)
        if len(rbs) < 1:
            _warn_low(team, "run_game_strength", len(rbs))
        if total_car > 0:
            team_result["run_game_strength"] = round(
                float(rbs["RUSH_YDS"].sum(skipna=True)) / float(total_car), 4
            )
        else:
            team_result["run_game_strength"] = None

        # ── turnover_risk ─────────────────────────────────────────────────────
        off = grp[grp["Position"].isin(_NFL_SKILL)].copy()
        off_gp_sum = off["GP"].sum(skipna=True)
        if len(off) < 3:
            _warn_low(team, "turnover_risk", len(off))
        if off_gp_sum > 0 and len(off) >= 1:
            turnovers = off["INT"].fillna(0).sum() + off["FUM"].fillna(0).sum()
            team_result["turnover_risk"] = round(float(turnovers) / float(off_gp_sum), 6)
        else:
            team_result["turnover_risk"] = None

        results[team] = team_result

    return results


# ─── FUNCTION 2 ──────────────────────────────────────────────────────────────

def aggregate_nba_teams(csv_path: str) -> dict[str, dict]:
    """
    Reads an NBA roster CSV and returns team-level stat profiles.

    Metrics returned per team:
        off_rating         – MIN-weighted average PTS per game
        def_rating         – MIN-weighted average (STL + BLK) per game
        pace_proxy         – MIN-weighted average AST per game
        three_point_reliance – MIN-weighted average 3P%
        depth_score        – count of players with GP > 20 and PTS > 8

    Returns {} for a team whose data is wholly insufficient.
    """
    df = pd.read_csv(csv_path, encoding="utf-8-sig")

    stat_cols = ["GP", "MIN", "PTS", "STL", "BLK", "AST", "3P%"]
    for col in stat_cols:
        if col in df.columns:
            df[col] = _to_num(df[col])

    # Drop empty name rows and players who didn't play
    df = df[df["Name"].notna() & (df["Name"].astype(str).str.strip() != "")].copy()
    df = df[df["GP"].notna() & (df["GP"] > 0)].copy()

    results: dict[str, dict] = {}

    for team, grp in df.groupby("Team"):
        if not isinstance(team, str) or not team.strip():
            continue

        team_result: dict = {}
        min_sum = grp["MIN"].sum(skipna=True)

        # ── off_rating ────────────────────────────────────────────────────────
        valid_pts = grp[grp["MIN"].notna() & grp["PTS"].notna()]
        if len(valid_pts) < 3:
            _warn_low(team, "off_rating", len(valid_pts))
        if min_sum > 0 and len(valid_pts) >= 1:
            team_result["off_rating"] = round(
                float((valid_pts["PTS"] * valid_pts["MIN"]).sum()) / float(valid_pts["MIN"].sum()), 4
            )
        else:
            team_result["off_rating"] = None

        # ── def_rating ────────────────────────────────────────────────────────
        valid_def = grp[grp["MIN"].notna() & (grp["STL"].notna() | grp["BLK"].notna())].copy()
        valid_def["def_stat"] = valid_def["STL"].fillna(0) + valid_def["BLK"].fillna(0)
        if len(valid_def) < 3:
            _warn_low(team, "def_rating", len(valid_def))
        def_min_sum = valid_def["MIN"].sum(skipna=True)
        if def_min_sum > 0 and len(valid_def) >= 1:
            team_result["def_rating"] = round(
                float((valid_def["def_stat"] * valid_def["MIN"]).sum()) / float(def_min_sum), 4
            )
        else:
            team_result["def_rating"] = None

        # ── pace_proxy ────────────────────────────────────────────────────────
        valid_ast = grp[grp["MIN"].notna() & grp["AST"].notna()]
        ast_min_sum = valid_ast["MIN"].sum(skipna=True)
        if ast_min_sum > 0:
            team_result["pace_proxy"] = round(
                float((valid_ast["AST"] * valid_ast["MIN"]).sum()) / float(ast_min_sum), 4
            )
        else:
            team_result["pace_proxy"] = None

        # ── three_point_reliance ──────────────────────────────────────────────
        valid_3p = grp[grp["MIN"].notna() & grp["3P%"].notna()]
        p3_min_sum = valid_3p["MIN"].sum(skipna=True)
        if p3_min_sum > 0:
            team_result["three_point_reliance"] = round(
                float((valid_3p["3P%"] * valid_3p["MIN"]).sum()) / float(p3_min_sum), 4
            )
        else:
            team_result["three_point_reliance"] = None

        # ── depth_score ───────────────────────────────────────────────────────
        deep = grp[grp["GP"].notna() & grp["PTS"].notna() & (grp["GP"] > 20) & (grp["PTS"] > 8)]
        team_result["depth_score"] = int(len(deep))

        results[team] = team_result

    return results


# ─── FUNCTION 3 ──────────────────────────────────────────────────────────────

def aggregate_mlb_teams(csv_path: str) -> dict[str, dict]:
    """
    Reads an MLB roster CSV and returns team-level stat profiles.

    Metrics returned per team:
        rotation_era    – IP-weighted average ERA for starters (IP > 30)
        rotation_depth  – count of starters with IP > 30 and ERA < 4.00
        lineup_ops      – Games-weighted average OPS for position players (Games > 30)
        lineup_depth    – count of position players with Games > 30 and OPS > 0.750
        strikeout_rate  – total SO / total IP for starters (IP > 30)

    Returns {} for a team whose data is wholly insufficient.
    """
    df = pd.read_csv(csv_path, encoding="utf-8-sig")

    stat_cols = ["Games", "IP", "ERA", "SO", "OPS", "AVG"]
    for col in stat_cols:
        if col in df.columns:
            df[col] = _to_num(df[col])

    results: dict[str, dict] = {}

    for team, grp in df.groupby("Team"):
        if not isinstance(team, str) or not team.strip():
            continue

        team_result: dict = {}

        # Split pitchers from position players
        pitchers = grp[grp["Position"].isin(_MLB_PITCHER)].copy()
        batters = grp[~grp["Position"].isin(_MLB_PITCHER)].copy()

        # Starters: IP > 30
        starters = pitchers[pitchers["IP"].notna() & (pitchers["IP"] > 30)].copy()

        # ── rotation_era ──────────────────────────────────────────────────────
        valid_era = starters[starters["ERA"].notna()]
        if len(valid_era) < 3:
            _warn_low(team, "rotation_era", len(valid_era))
        ip_sum = valid_era["IP"].sum(skipna=True)
        if ip_sum > 0 and len(valid_era) >= 1:
            team_result["rotation_era"] = round(
                float((valid_era["ERA"] * valid_era["IP"]).sum()) / float(ip_sum), 4
            )
        else:
            team_result["rotation_era"] = None

        # ── rotation_depth ────────────────────────────────────────────────────
        team_result["rotation_depth"] = int(
            len(starters[starters["ERA"].notna() & (starters["ERA"] < 4.00)])
        )

        # ── lineup_ops ────────────────────────────────────────────────────────
        active_batters = batters[batters["Games"].notna() & (batters["Games"] > 30)].copy()
        valid_ops = active_batters[active_batters["OPS"].notna()]
        if len(valid_ops) < 3:
            _warn_low(team, "lineup_ops", len(valid_ops))
        games_sum = valid_ops["Games"].sum(skipna=True)
        if games_sum > 0 and len(valid_ops) >= 1:
            team_result["lineup_ops"] = round(
                float((valid_ops["OPS"] * valid_ops["Games"]).sum()) / float(games_sum), 4
            )
        else:
            team_result["lineup_ops"] = None

        # ── lineup_depth ──────────────────────────────────────────────────────
        team_result["lineup_depth"] = int(
            len(valid_ops[valid_ops["OPS"] > 0.750])
        )

        # ── strikeout_rate ────────────────────────────────────────────────────
        valid_so = starters[starters["SO"].notna() & starters["IP"].notna()]
        total_ip = valid_so["IP"].sum(skipna=True)
        if total_ip > 0:
            team_result["strikeout_rate"] = round(
                float(valid_so["SO"].sum()) / float(total_ip), 4
            )
        else:
            team_result["strikeout_rate"] = None

        results[team] = team_result

    return results


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def find_csv(sport: str) -> str | None:
    """Locate the *_all.csv for a sport in the repo's raw data directory."""
    pattern = str(_RAW_DIR / sport / "**" / "*_all.csv")
    matches = glob.glob(pattern, recursive=True)
    return matches[0] if matches else None


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    for sport, fn in [
        ("nfl", aggregate_nfl_teams),
        ("nba", aggregate_nba_teams),
        ("mlb", aggregate_mlb_teams),
    ]:
        path = find_csv(sport)
        if not path:
            print(f"[{sport.upper()}] CSV not found — skipping")
            continue
        profiles = fn(path)
        print(f"\n=== {sport.upper()} ({len(profiles)} teams) ===")
        for team in list(profiles)[:3]:
            print(f"  {team}: {profiles[team]}")
