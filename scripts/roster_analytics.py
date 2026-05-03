"""
Roster analytics CLI for Notion-exported NFL/NBA/MLB player databases.

This script reads the extracted *_all.csv files under:
  data/raw/notion_rosters_2026/

Usage examples:
  python scripts/roster_analytics.py leaders --sport nfl --top 10
  python scripts/roster_analytics.py filter --sport nfl --position QB --metric RTG --op gt --value 95
  python scripts/roster_analytics.py filter --sport nba --position PG --metric AST --op ge --value 8
  python scripts/roster_analytics.py team-agg --sport mlb --mode pitching --top 10
  python scripts/roster_analytics.py angles --sport nba --top 20
  python scripts/roster_analytics.py overview --top 5
"""

from __future__ import annotations

import argparse
import glob
import json
import os
from dataclasses import dataclass
from typing import Any

try:
    import pandas as pd
except ImportError as exc:
    raise SystemExit(
        "This script requires pandas. Install dependencies first, e.g. pip install -r backend/requirements.txt"
    ) from exc

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_ROOT = os.path.join(REPO_ROOT, "data", "raw", "notion_rosters_2026")

SPORT_COLUMNS: dict[str, list[str]] = {
    "nfl": [
        "GP",
        "CMP_PCT",
        "PASS_YDS",
        "PASS_TD",
        "INT",
        "RTG",
        "QBR",
        "CAR",
        "RUSH_YDS",
        "RUSH_AVG",
        "RUSH_TD",
        "REC",
        "TGTS",
        "REC_YDS",
        "REC_AVG",
        "REC_TD",
        "TOT",
        "SOLO",
        "SACK",
        "FF",
        "PD",
        "FGM",
        "FGA",
        "FG_PCT",
        "XPM",
        "FUM",
        "PTS",
        "LNG",
    ],
    "nba": [
        "GP",
        "MIN",
        "PTS",
        "REB",
        "AST",
        "STL",
        "BLK",
        "FG%",
        "3P%",
        "FT%",
        "TO",
    ],
    "mlb": [
        "Games",
        "AVG",
        "HR",
        "RBI",
        "OBP",
        "SLG",
        "OPS",
        "R",
        "H",
        "SB",
        "ERA",
        "W",
        "L",
        "IP",
        "SO",
        "WHIP",
        "Saves",
    ],
}

PRIMARY_LEADER_METRICS: dict[str, list[str]] = {
    "nfl": ["PASS_YDS", "RUSH_YDS", "REC_YDS", "SACK", "FGM", "RTG", "QBR"],
    "nba": ["PTS", "REB", "AST", "STL", "BLK", "FG%", "3P%"],
    "mlb": ["OPS", "HR", "RBI", "SB", "SO", "Saves", "ERA", "WHIP"],
}

LOWER_IS_BETTER = {"ERA", "WHIP", "TO", "INT"}

NBA_POSITION_MAP = {
    "PG": ["PG", "G"],
    "SG": ["SG", "G"],
    "SF": ["SF", "F"],
    "PF": ["PF", "F"],
    "C": ["C"],
    "G": ["G", "PG", "SG"],
    "F": ["F", "SF", "PF"],
}


@dataclass
class QueryResult:
    command: str
    sport: str | None
    rows: list[dict[str, Any]]


def _find_sport_csv(sport: str) -> str:
    pattern = os.path.join(DATA_ROOT, sport, "**", "*_all.csv")
    matches = glob.glob(pattern, recursive=True)
    if not matches:
        raise FileNotFoundError(
            f"No *_all.csv file found for sport='{sport}'. Expected under {pattern}"
        )
    # Prefer the most recently modified in case multiple exports exist.
    matches.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return matches[0]


def _clean_str_columns(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.columns:
        if pd.api.types.is_object_dtype(df[col]):
            df[col] = df[col].astype(str).str.strip()
            df[col] = df[col].replace({"": pd.NA, "nan": pd.NA, "None": pd.NA})
    return df


def load_sport_df(sport: str) -> pd.DataFrame:
    csv_path = _find_sport_csv(sport)
    df = pd.read_csv(csv_path, dtype=str)
    df = _clean_str_columns(df)

    if "Name" not in df.columns:
        raise ValueError(f"Required column 'Name' missing in {csv_path}")

    # Notion exports can include blank template rows.
    df = df[df["Name"].notna()].copy()

    numeric_columns = [c for c in SPORT_COLUMNS[sport] if c in df.columns]
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    if "Position" in df.columns:
        df["Position"] = df["Position"].astype("string").str.upper()

    df["__sport"] = sport
    df["__source"] = csv_path
    return df


def _as_records(df: pd.DataFrame, columns: list[str], top: int) -> list[dict[str, Any]]:
    safe_cols = [c for c in columns if c in df.columns]
    return df[safe_cols].head(top).to_dict(orient="records")


def _position_mask(df: pd.DataFrame, sport: str, position: str) -> pd.Series:
    if "Position" not in df.columns:
        return pd.Series([True] * len(df), index=df.index)

    pos = position.upper().strip()
    if sport == "nba":
        aliases = NBA_POSITION_MAP.get(pos, [pos])
        return df["Position"].isin(aliases)

    if sport == "mlb":
        if pos in {"SP", "RP", "P"}:
            aliases = ["P", "SP", "RP"]
        else:
            aliases = [pos]
        return df["Position"].isin(aliases)

    return df["Position"].astype("string").str.contains(rf"\b{pos}\b", case=False, na=False)


def leaders(sport: str, top: int) -> QueryResult:
    df = load_sport_df(sport)
    rows: list[dict[str, Any]] = []

    for metric in PRIMARY_LEADER_METRICS[sport]:
        if metric not in df.columns:
            continue

        metric_df = df[df[metric].notna()].copy()
        if metric_df.empty:
            continue

        ascending = metric in LOWER_IS_BETTER
        metric_df = metric_df.sort_values(metric, ascending=ascending)
        recs = _as_records(metric_df, ["Name", "Team", "Position", metric], top)
        rows.append({"metric": metric, "leaders": recs})

    return QueryResult(command="leaders", sport=sport, rows=rows)


def filter_players(
    sport: str,
    metric: str,
    op: str,
    value: float,
    position: str | None,
    min_games: float | None,
    top: int,
) -> QueryResult:
    df = load_sport_df(sport)

    if metric not in df.columns:
        raise ValueError(f"Metric '{metric}' is not present for {sport}. Available: {sorted(df.columns)}")

    working = df[df[metric].notna()].copy()

    if position:
        working = working[_position_mask(working, sport, position)]

    gp_col = "GP" if "GP" in working.columns else ("Games" if "Games" in working.columns else None)
    if min_games is not None and gp_col:
        working = working[working[gp_col].fillna(0) >= min_games]

    ops = {
        "gt": lambda s: s > value,
        "ge": lambda s: s >= value,
        "lt": lambda s: s < value,
        "le": lambda s: s <= value,
        "eq": lambda s: s == value,
    }
    if op not in ops:
        raise ValueError(f"Unsupported operator '{op}'. Use one of {sorted(ops.keys())}")

    working = working[ops[op](working[metric])].copy()
    working = working.sort_values(metric, ascending=(op in {"lt", "le"}))

    cols = ["Name", "Team", "Position", metric]
    if gp_col:
        cols.append(gp_col)

    return QueryResult(command="filter", sport=sport, rows=_as_records(working, cols, top))


def team_aggregations(sport: str, mode: str, top: int) -> QueryResult:
    df = load_sport_df(sport)
    if "Team" not in df.columns:
        raise ValueError("Team column is missing; cannot aggregate.")

    working = df[df["Team"].notna()].copy()

    if sport == "nfl":
        if mode == "offense":
            cols = ["PASS_YDS", "RUSH_YDS", "REC_YDS", "PASS_TD", "RUSH_TD", "REC_TD", "PTS"]
            agg = working.groupby("Team", as_index=False)[[c for c in cols if c in working.columns]].sum(min_count=1)
            agg["OFFENSE_TOTAL"] = agg[[c for c in ["PASS_YDS", "RUSH_YDS", "REC_YDS"] if c in agg.columns]].sum(axis=1)
            agg = agg.sort_values("OFFENSE_TOTAL", ascending=False)
        elif mode == "defense":
            cols = ["TOT", "SOLO", "SACK", "FF", "PD", "INT"]
            agg = working.groupby("Team", as_index=False)[[c for c in cols if c in working.columns]].sum(min_count=1)
            agg["DEFENSE_IMPACT"] = agg[[c for c in ["SACK", "FF", "INT", "PD"] if c in agg.columns]].sum(axis=1)
            agg = agg.sort_values("DEFENSE_IMPACT", ascending=False)
        else:
            raise ValueError("NFL mode must be one of: offense, defense")

    elif sport == "nba":
        cols = ["PTS", "REB", "AST", "STL", "BLK", "TO"]
        agg = working.groupby("Team", as_index=False)[[c for c in cols if c in working.columns]].sum(min_count=1)
        agg["OFFENSE_TOTAL"] = agg[[c for c in ["PTS", "AST"] if c in agg.columns]].sum(axis=1)
        agg["DEFENSE_TOTAL"] = agg[[c for c in ["REB", "STL", "BLK"] if c in agg.columns]].sum(axis=1)
        if mode == "offense":
            agg = agg.sort_values("OFFENSE_TOTAL", ascending=False)
        elif mode == "defense":
            agg = agg.sort_values("DEFENSE_TOTAL", ascending=False)
        else:
            raise ValueError("NBA mode must be one of: offense, defense")

    elif sport == "mlb":
        hitters = working[working["OPS"].notna() | working["AVG"].notna()].copy()
        pitchers = working[working["ERA"].notna() | working["WHIP"].notna()].copy()

        if mode == "offense":
            cols = ["R", "H", "HR", "RBI", "SB"]
            agg = hitters.groupby("Team", as_index=False)[[c for c in cols if c in hitters.columns]].sum(min_count=1)
            agg["OFFENSE_TOTAL"] = agg[[c for c in ["R", "H", "HR", "RBI", "SB"] if c in agg.columns]].sum(axis=1)
            agg = agg.sort_values("OFFENSE_TOTAL", ascending=False)
        elif mode == "pitching":
            grp = pitchers.groupby("Team", as_index=False)
            agg = grp[[c for c in ["IP", "SO", "W", "L", "Saves"] if c in pitchers.columns]].sum(min_count=1)
            if "ERA" in pitchers.columns and "IP" in pitchers.columns:
                era_weighted = (
                    pitchers.assign(_w_era=pitchers["ERA"] * pitchers["IP"].fillna(0))
                    .groupby("Team", as_index=False)[["_w_era", "IP"]]
                    .sum(min_count=1)
                )
                era_weighted["STAFF_ERA"] = era_weighted["_w_era"] / era_weighted["IP"].replace({0: pd.NA})
                agg = agg.merge(era_weighted[["Team", "STAFF_ERA"]], on="Team", how="left")

            if "WHIP" in pitchers.columns and "IP" in pitchers.columns:
                whip_weighted = (
                    pitchers.assign(_w_whip=pitchers["WHIP"] * pitchers["IP"].fillna(0))
                    .groupby("Team", as_index=False)[["_w_whip", "IP"]]
                    .sum(min_count=1)
                )
                whip_weighted["STAFF_WHIP"] = whip_weighted["_w_whip"] / whip_weighted["IP"].replace({0: pd.NA})
                agg = agg.merge(whip_weighted[["Team", "STAFF_WHIP"]], on="Team", how="left")

            sort_col = "STAFF_ERA" if "STAFF_ERA" in agg.columns else "SO"
            agg = agg.sort_values(sort_col, ascending=True if sort_col == "STAFF_ERA" else False)
        else:
            raise ValueError("MLB mode must be one of: offense, pitching")
    else:
        raise ValueError(f"Unsupported sport: {sport}")

    return QueryResult(command="team-agg", sport=sport, rows=agg.head(top).to_dict(orient="records"))


def betting_angles(sport: str, top: int) -> QueryResult:
    df = load_sport_df(sport)
    angles: list[dict[str, Any]] = []

    if sport == "nfl":
        qbs = df[_position_mask(df, sport, "QB")].copy()
        qbs = qbs[qbs[[c for c in ["RTG", "QBR", "PASS_YDS", "PASS_TD", "INT"] if c in qbs.columns]].notna().any(axis=1)]
        if not qbs.empty:
            qbs["TD_INT_RATIO"] = (qbs["PASS_TD"].fillna(0) + 1) / (qbs["INT"].fillna(0) + 1)
            qbs["PASS_YDS_PER_GP"] = qbs["PASS_YDS"].fillna(0) / qbs["GP"].replace({0: pd.NA})

            risk = qbs[(qbs["RTG"].fillna(0) >= 95) & ((qbs["INT"].fillna(0) >= 10) | (qbs["TD_INT_RATIO"] < 2.0))]
            for _, r in risk.sort_values(["RTG", "INT"], ascending=[False, False]).head(top).iterrows():
                angles.append(
                    {
                        "angle_type": "regression_risk",
                        "Name": r.get("Name"),
                        "Team": r.get("Team"),
                        "Position": r.get("Position"),
                        "note": "High RTG with turnover profile that may regress",
                        "RTG": r.get("RTG"),
                        "INT": r.get("INT"),
                        "TD_INT_RATIO": round(float(r.get("TD_INT_RATIO")), 3),
                    }
                )

            value = qbs[
                (qbs["PASS_YDS"].fillna(0) >= 3500)
                & (qbs["PASS_TD"].fillna(0) <= 22)
                & (qbs["CMP_PCT"].fillna(0) >= 64)
            ]
            for _, r in value.sort_values("PASS_YDS", ascending=False).head(top).iterrows():
                angles.append(
                    {
                        "angle_type": "value_play",
                        "Name": r.get("Name"),
                        "Team": r.get("Team"),
                        "Position": r.get("Position"),
                        "note": "Passing volume + completion profile suggests positive TD regression",
                        "PASS_YDS": r.get("PASS_YDS"),
                        "PASS_TD": r.get("PASS_TD"),
                        "CMP_PCT": r.get("CMP_PCT"),
                    }
                )

        skill = df[(df["REC_YDS"].fillna(0) >= 900) & (df["REC_TD"].fillna(0) <= 4) & (df["TGTS"].fillna(0) >= 90)]
        for _, r in skill.sort_values("REC_YDS", ascending=False).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "value_play",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "Target volume and yardage without matching TD total",
                    "REC_YDS": r.get("REC_YDS"),
                    "REC_TD": r.get("REC_TD"),
                    "TGTS": r.get("TGTS"),
                }
            )

    elif sport == "nba":
        working = df[df[[c for c in ["PTS", "FG%", "TO", "AST", "REB"] if c in df.columns]].notna().any(axis=1)]

        risk = working[(working["PTS"].fillna(0) >= 22) & ((working["FG%"].fillna(100) < 44) | (working["TO"].fillna(0) >= 3.2))]
        for _, r in risk.sort_values("PTS", ascending=False).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "regression_risk",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "Scoring load paired with lower efficiency / elevated turnovers",
                    "PTS": r.get("PTS"),
                    "FG%": r.get("FG%"),
                    "TO": r.get("TO"),
                }
            )

        value_ast = working[(working["AST"].fillna(0) >= 7.5) & (working["TO"].fillna(99) <= 2.5)]
        for _, r in value_ast.sort_values("AST", ascending=False).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "value_play",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "Playmaking volume with controlled turnovers",
                    "AST": r.get("AST"),
                    "TO": r.get("TO"),
                    "MIN": r.get("MIN"),
                }
            )

        value_reb = working[(working["REB"].fillna(0) >= 9.0) & (working["PTS"].fillna(0) <= 14.0)]
        for _, r in value_reb.sort_values("REB", ascending=False).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "value_play",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "High rebounding floor with modest scoring profile",
                    "REB": r.get("REB"),
                    "PTS": r.get("PTS"),
                    "MIN": r.get("MIN"),
                }
            )

    elif sport == "mlb":
        hitters = df[df["OPS"].notna() | df["AVG"].notna()].copy()
        pitchers = df[df["ERA"].notna() | df["WHIP"].notna()].copy()

        risk_hit = hitters[(hitters["AVG"].fillna(0) >= 0.300) & (hitters["OPS"].fillna(9) < 0.780)]
        for _, r in risk_hit.sort_values("AVG", ascending=False).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "regression_risk",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "High AVG with modest OPS profile",
                    "AVG": r.get("AVG"),
                    "OPS": r.get("OPS"),
                    "HR": r.get("HR"),
                }
            )

        value_hit = hitters[(hitters["OPS"].fillna(0) >= 0.820) & (hitters["HR"].fillna(99) <= 18)]
        for _, r in value_hit.sort_values("OPS", ascending=False).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "value_play",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "Strong overall hitting profile without inflated HR count",
                    "OPS": r.get("OPS"),
                    "HR": r.get("HR"),
                    "RBI": r.get("RBI"),
                }
            )

        risk_pit = pitchers[(pitchers["ERA"].fillna(9) <= 3.00) & (pitchers["WHIP"].fillna(0) >= 1.25)]
        for _, r in risk_pit.sort_values("ERA", ascending=True).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "regression_risk",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "Run prevention outpacing baserunner suppression",
                    "ERA": r.get("ERA"),
                    "WHIP": r.get("WHIP"),
                    "IP": r.get("IP"),
                }
            )

        value_pit = pitchers[
            (pitchers["ERA"].fillna(0) >= 3.8)
            & (pitchers["WHIP"].fillna(9) <= 1.15)
            & (pitchers["SO"].fillna(0) >= 140)
        ]
        for _, r in value_pit.sort_values("SO", ascending=False).head(top).iterrows():
            angles.append(
                {
                    "angle_type": "value_play",
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "note": "Strong strikeout + WHIP profile despite elevated ERA",
                    "ERA": r.get("ERA"),
                    "WHIP": r.get("WHIP"),
                    "SO": r.get("SO"),
                }
            )

    else:
        raise ValueError(f"Unsupported sport: {sport}")

    return QueryResult(command="angles", sport=sport, rows=angles[:top])


def anomalies(sport: str, top: int) -> QueryResult:
    df = load_sport_df(sport)
    out: list[dict[str, Any]] = []

    key_metrics = [m for m in PRIMARY_LEADER_METRICS[sport] if m in df.columns]
    for metric in key_metrics:
        m = df[["Name", "Team", "Position", metric]].copy()
        m = m[m[metric].notna()]
        if len(m) < 20:
            continue

        std = m[metric].std(skipna=True)
        mean = m[metric].mean(skipna=True)
        if pd.isna(std) or std == 0:
            continue

        m["z"] = (m[metric] - mean) / std
        extreme = m[(m["z"] >= 2.5) | (m["z"] <= -2.5)].copy()
        if extreme.empty:
            continue

        extreme = extreme.sort_values("z", key=lambda s: s.abs(), ascending=False)
        for _, r in extreme.head(top).iterrows():
            out.append(
                {
                    "metric": metric,
                    "Name": r.get("Name"),
                    "Team": r.get("Team"),
                    "Position": r.get("Position"),
                    "value": r.get(metric),
                    "z": round(float(r.get("z")), 3),
                }
            )

    out.sort(key=lambda x: abs(float(x["z"])), reverse=True)
    return QueryResult(command="anomalies", sport=sport, rows=out[:top])


def overview(top: int) -> QueryResult:
    rows: list[dict[str, Any]] = []

    for sport in ["nfl", "nba", "mlb"]:
        df = load_sport_df(sport)
        rows.append(
            {
                "sport": sport,
                "players": int(df["Name"].nunique()),
                "teams": int(df["Team"].nunique()) if "Team" in df.columns else None,
                "source": df["__source"].iloc[0],
            }
        )

        lead = leaders(sport, top=1).rows
        for block in lead:
            metric = block.get("metric")
            one = (block.get("leaders") or [{}])[0]
            rows.append(
                {
                    "sport": sport,
                    "metric": metric,
                    "Name": one.get("Name"),
                    "Team": one.get("Team"),
                    "Position": one.get("Position"),
                    "value": one.get(metric),
                }
            )

    return QueryResult(command="overview", sport=None, rows=rows)


def _print_result(result: QueryResult, as_json: bool) -> None:
    payload = {
        "command": result.command,
        "sport": result.sport,
        "rows": result.rows,
    }
    if as_json:
        print(json.dumps(payload, indent=2, default=str))
    else:
        df = pd.DataFrame(result.rows)
        if df.empty:
            print("No rows returned.")
            return
        with pd.option_context("display.max_columns", None, "display.width", 180):
            print(df.to_string(index=False))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Cross-sport roster analytics for Notion exports")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of a table")

    sub = parser.add_subparsers(dest="command", required=True)

    p_leaders = sub.add_parser("leaders", help="Stat leaders for a sport")
    p_leaders.add_argument("--sport", choices=["nfl", "nba", "mlb"], required=True)
    p_leaders.add_argument("--top", type=int, default=10)

    p_filter = sub.add_parser("filter", help="Metric and position filters")
    p_filter.add_argument("--sport", choices=["nfl", "nba", "mlb"], required=True)
    p_filter.add_argument("--metric", required=True)
    p_filter.add_argument("--op", choices=["gt", "ge", "lt", "le", "eq"], required=True)
    p_filter.add_argument("--value", type=float, required=True)
    p_filter.add_argument("--position", default=None)
    p_filter.add_argument("--min-games", type=float, default=None)
    p_filter.add_argument("--top", type=int, default=100)

    p_team = sub.add_parser("team-agg", help="Team-level aggregates")
    p_team.add_argument("--sport", choices=["nfl", "nba", "mlb"], required=True)
    p_team.add_argument("--mode", required=True, help="nfl/nba: offense|defense, mlb: offense|pitching")
    p_team.add_argument("--top", type=int, default=30)

    p_angles = sub.add_parser("angles", help="GuerillaGenics-style value and regression angles")
    p_angles.add_argument("--sport", choices=["nfl", "nba", "mlb"], required=True)
    p_angles.add_argument("--top", type=int, default=30)

    p_anom = sub.add_parser("anomalies", help="Outlier detection by z-score")
    p_anom.add_argument("--sport", choices=["nfl", "nba", "mlb"], required=True)
    p_anom.add_argument("--top", type=int, default=30)

    p_overview = sub.add_parser("overview", help="Cross-sport quick snapshot")
    p_overview.add_argument("--top", type=int, default=3)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "leaders":
        result = leaders(sport=args.sport, top=args.top)
    elif args.command == "filter":
        result = filter_players(
            sport=args.sport,
            metric=args.metric,
            op=args.op,
            value=args.value,
            position=args.position,
            min_games=args.min_games,
            top=args.top,
        )
    elif args.command == "team-agg":
        result = team_aggregations(sport=args.sport, mode=args.mode, top=args.top)
    elif args.command == "angles":
        result = betting_angles(sport=args.sport, top=args.top)
    elif args.command == "anomalies":
        result = anomalies(sport=args.sport, top=args.top)
    elif args.command == "overview":
        result = overview(top=args.top)
    else:
        raise ValueError(f"Unsupported command {args.command}")

    _print_result(result, as_json=args.json)


if __name__ == "__main__":
    main()
