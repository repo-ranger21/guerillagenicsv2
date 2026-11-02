"""
gg.pipeline.weekly_snapshot — a hard, checksummed copy of team and player
stats as of the end of each NFL week.

Why: upstream data (nflverse) is revised after the fact. A pick made in Week 8
must be explainable from the numbers as they stood at the end of Week 7, not
from whatever the source says a month later. Each week's folder is written once,
never overwritten (without --force), and carries a MANIFEST.json of sha256
hashes so any later edit is detectable (`--verify`).

Per week, under snapshots/<season>/week_<WW>/:
  team_week.csv        that week's per-team box stats (one row per team-game)
  player_week.csv      that week's per-player stats (rows with any activity)
  team_to_date.csv     season-to-date team totals through the week
  player_to_date.csv   season-to-date player totals through the week
  ratings.csv          the model's team ratings using data through the week
                       (what picks for week+1 are built on)
  games.csv            every regular-season game through the week, with scores
                       and the closing spread
  ledger.csv           the public pick ledger as it stood (only if DATABASE_URL set)
  MANIFEST.json        provenance + sha256 for every file above

Season-to-date for any week is also recoverable by concatenating the weekly
team_week.csv / player_week.csv files. The .xlsx workbook is a convenience
view generated from these files; the CSVs are the record.

kind="live"      written at the end of the week, data as it stood then.
kind="backfill"  rebuilt later from current nflverse data (so it may include
                 later stat corrections). Labelled as such in the manifest.
"""

from __future__ import annotations

import dataclasses
import glob
import hashlib
import io
import json
import os
import subprocess
from datetime import datetime, timezone

import pandas as pd
import requests

from gg.pipeline.model.nfl import CARRY, K
from gg.pipeline.nfl_ratings import compute_all_ratings, fetch_play_by_play, filter_regular_season

GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/{kind}/{kind}_week_{season}.parquet"
SNAPSHOT_ROOT = "snapshots"

GAME_COLS = ["game_id", "season", "week", "gameday", "away_team", "away_score", "home_team",
             "home_score", "result", "total", "spread_line", "total_line", "away_moneyline",
             "home_moneyline", "div_game", "roof", "surface", "away_qb_name", "home_qb_name"]

# Ratios that cannot be summed across weeks; dropped from to-date tables.
_RATIO_COLS = {"pacr", "racr", "target_share", "air_yards_share", "wopr", "fg_pct", "pat_pct",
               "passing_cpoe", "fg_long", "pt_long", "gwfg_distance"}
_LIST_COLS = {"fg_made_list", "fg_missed_list", "fg_blocked_list", "fg_made_distance",
              "fg_missed_distance", "fg_blocked_distance"}
_PLAYER_ID = ["player_id", "player_display_name", "position", "position_group"]


# ---------- pure ----------

def completed_weeks(games: pd.DataFrame, season: int) -> list[int]:
    """Weeks of the regular season in which every game has a final score."""
    g = games[(games.season == season) & (games.game_type == "REG")]
    final = (g.home_score.notna() & g.away_score.notna()).groupby(g.week).all()
    return sorted(int(w) for w, ok in final.items() if ok)


def latest_completed_week(games: pd.DataFrame, season: int) -> int | None:
    """Latest week W such that weeks 1..W are all complete."""
    done = set(completed_weeks(games, season))
    w = 0
    while (w + 1) in done:
        w += 1
    return w or None


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def numeric_stat_cols(df: pd.DataFrame, extra_skip: set[str] = frozenset()) -> list[str]:
    skip = _RATIO_COLS | _LIST_COLS | {"season", "week"} | set(extra_skip)
    return [c for c in df.select_dtypes("number").columns if c not in skip]


def to_date_team(team_weeks: pd.DataFrame) -> pd.DataFrame:
    cols = numeric_stat_cols(team_weeks)
    out = team_weeks.groupby("team")[cols].sum()
    out.insert(0, "games", team_weeks.groupby("team").week.nunique())
    return out.reset_index().sort_values("team")


def to_date_player(player_weeks: pd.DataFrame) -> pd.DataFrame:
    cols = numeric_stat_cols(player_weeks)
    g = player_weeks.groupby(_PLAYER_ID, dropna=False)
    out = g[cols].sum()
    out.insert(0, "games", g.week.nunique())
    out.insert(1, "last_team", g.team.last())
    return out.reset_index().sort_values(["position_group", "player_display_name"])


def active_rows(player_weeks: pd.DataFrame) -> pd.DataFrame:
    """Drop rows where every counting stat is zero (listed, no activity)."""
    cols = numeric_stat_cols(player_weeks)
    return player_weeks[(player_weeks[cols].fillna(0) != 0).any(axis=1)]


def ratings_frame(prior_pbp: pd.DataFrame, current_pbp: pd.DataFrame, through_week: int) -> pd.DataFrame:
    teams = sorted(t for t in prior_pbp.posteam.dropna().unique())
    rows = compute_all_ratings(prior_pbp, current_pbp, teams, CARRY, K)
    df = pd.DataFrame([dataclasses.asdict(r) for r in rows])
    df.insert(0, "through_week", through_week)
    df.insert(1, "applies_to_week", through_week + 1)
    df["carry"], df["k"] = CARRY, K
    return df


# ---------- I/O ----------

def _read_parquet_url(url: str) -> pd.DataFrame:
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    return pd.read_parquet(io.BytesIO(r.content))


def load_data(season: int, games: pd.DataFrame | None = None) -> dict:
    """Download everything freeze_week needs once, so a backfill reuses it."""
    return {
        "games": games if games is not None else pd.read_csv(GAMES_URL),
        "team": _read_parquet_url(STATS_URL.format(kind="stats_team", season=season)),
        "player": _read_parquet_url(STATS_URL.format(kind="stats_player", season=season)),
        "prior_pbp": filter_regular_season(fetch_play_by_play(season - 1)),
        "pbp": filter_regular_season(fetch_play_by_play(season)),
    }


def week_dir(root: str, season: int, week: int) -> str:
    return os.path.join(root, str(season), f"week_{week:02d}")


def _git_head() -> str | None:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True,
                                       stderr=subprocess.DEVNULL).strip()
    except Exception:
        return None


def _ledger_csv(path: str) -> bool:
    if not os.environ.get("DATABASE_URL"):
        return False
    try:
        from gg.pipeline.load import get_connection
        with get_connection() as conn:
            df = pd.read_sql("select * from public.public_ledger", conn)
        df.to_csv(path, index=False)
        return True
    except Exception as exc:  # ledger is a convenience; the stats are the record
        print(f"  ledger skipped: {exc}")
        return False


def freeze_week(season: int, week: int, *, root: str = SNAPSHOT_ROOT, kind: str = "live",
                force: bool = False, data: dict | None = None) -> str:
    """Write one week's snapshot folder. `data` lets tests/backfills reuse
    already-downloaded frames: keys games, team, player, prior_pbp, pbp."""
    out = week_dir(root, season, week)
    if os.path.exists(os.path.join(out, "MANIFEST.json")) and not force:
        raise FileExistsError(f"{out} already frozen; snapshots are write-once (use --force to replace)")
    d = data or {}
    games = d.get("games") if d.get("games") is not None else pd.read_csv(GAMES_URL)
    team = d.get("team") if d.get("team") is not None else _read_parquet_url(STATS_URL.format(kind="stats_team", season=season))
    player = d.get("player") if d.get("player") is not None else _read_parquet_url(STATS_URL.format(kind="stats_player", season=season))
    prior_pbp = d.get("prior_pbp") if d.get("prior_pbp") is not None else filter_regular_season(fetch_play_by_play(season - 1))
    pbp = d.get("pbp") if d.get("pbp") is not None else filter_regular_season(fetch_play_by_play(season))

    reg = lambda df: df[df.season_type == "REG"]  # noqa: E731
    team_thru, player_thru = reg(team)[reg(team).week <= week], reg(player)[reg(player).week <= week]
    games_thru = games[(games.season == season) & (games.game_type == "REG") & (games.week <= week)]

    os.makedirs(out, exist_ok=True)
    files = {
        "team_week.csv": team_thru[team_thru.week == week].sort_values("team"),
        "player_week.csv": active_rows(player_thru[player_thru.week == week]).drop(columns=["headshot_url"], errors="ignore")
        .drop(columns=list(_LIST_COLS), errors="ignore").sort_values(["team", "position_group", "player_display_name"]),
        "team_to_date.csv": to_date_team(team_thru),
        "player_to_date.csv": to_date_player(player_thru),
        "ratings.csv": ratings_frame(prior_pbp, pbp[pbp.week <= week], week),
        "games.csv": games_thru[[c for c in GAME_COLS if c in games_thru.columns]].sort_values(["week", "gameday", "game_id"]),
    }
    for name, df in files.items():
        df.to_csv(os.path.join(out, name), index=False)
    if kind == "live" and _ledger_csv(os.path.join(out, "ledger.csv")):
        files["ledger.csv"] = None

    manifest = {
        "season": season, "week": week, "kind": kind,
        "created_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "git_commit": _git_head(),
        "model": {"carry": CARRY, "k": K},
        "sources": {"games": GAMES_URL,
                    "team_stats": STATS_URL.format(kind="stats_team", season=season),
                    "player_stats": STATS_URL.format(kind="stats_player", season=season),
                    "play_by_play": [f"nflverse pbp {season - 1}", f"nflverse pbp {season}"]},
        "files": {n: {"sha256": sha256_file(os.path.join(out, n)),
                      "bytes": os.path.getsize(os.path.join(out, n))} for n in sorted(files)},
    }
    with open(os.path.join(out, "MANIFEST.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    return out


def verify_week(season: int, week: int, root: str = SNAPSHOT_ROOT) -> list[str]:
    """Problems found (empty list = every file matches its recorded hash)."""
    out = week_dir(root, season, week)
    mpath = os.path.join(out, "MANIFEST.json")
    if not os.path.exists(mpath):
        return [f"{out}: no MANIFEST.json"]
    with open(mpath) as fh:
        manifest = json.load(fh)
    problems = []
    for name, meta in manifest["files"].items():
        p = os.path.join(out, name)
        if not os.path.exists(p):
            problems.append(f"{name}: missing")
        elif sha256_file(p) != meta["sha256"]:
            problems.append(f"{name}: hash mismatch (edited after freeze)")
    return problems


def build_workbook(season: int, week: int, root: str = SNAPSHOT_ROOT, path: str | None = None) -> str:
    """Spreadsheet view: this week's frozen files plus every frozen week up to it."""
    out = week_dir(root, season, week)
    with open(os.path.join(out, "MANIFEST.json")) as fh:
        manifest = json.load(fh)

    def read(n):
        return pd.read_csv(os.path.join(out, n))

    def stack(name):
        parts = [pd.read_csv(f) for f in sorted(glob.glob(os.path.join(root, str(season), "week_*", name)))
                 if int(os.path.basename(os.path.dirname(f)).split("_")[1]) <= week]
        return pd.concat(parts, ignore_index=True) if parts else pd.DataFrame()

    path = path or os.path.join(root, str(season), f"GG_{season}_W{week:02d}_Snapshot.xlsx")
    readme = pd.DataFrame({"field": ["season", "through week", "kind", "created (UTC)", "git commit", "note"],
                           "value": [season, week, manifest["kind"], manifest["created_utc"], manifest["git_commit"],
                                     "CSVs under snapshots/ are the record; this workbook is a view. "
                                     "Verify with: python -m gg.cli snapshot-week --verify"]})
    sheets = {"README": readme, "Ratings": read("ratings.csv"), "Games": read("games.csv"),
              "Team_ToDate": read("team_to_date.csv"), "Player_ToDate": read("player_to_date.csv"),
              "Team_Weekly": stack("team_week.csv"), "Player_Weekly": stack("player_week.csv")}
    if os.path.exists(os.path.join(out, "ledger.csv")):
        sheets["Ledger"] = read("ledger.csv")
    with pd.ExcelWriter(path, engine="openpyxl") as xw:
        for name, df in sheets.items():
            df.to_excel(xw, sheet_name=name, index=False)
            ws = xw.sheets[name]
            ws.freeze_panes = "A2"
            ws.auto_filter.ref = ws.dimensions
    return path
