"""Walk-forward NFL spread backtest, 2022-2025 regular seasons (1,087 games).

Reproduces the production model: ratings from gg.pipeline.nfl_ratings
(net EPA/play x plays/game, blended with CARRY/K), margin = home_rating -
away_rating + HFA, cover probability from gg.pipeline.model.nfl.analytic_cover,
side = higher EVI, then the real gg.pipeline.model.gate.gate().

No lookahead: a game in week W uses only the prior season plus games from
weeks < W of its own season.

Data: nflverse play-by-play + nfldata games.csv (closing spread), cached under
.cache/nflverse (git-ignored). Prices are assumed flat -110: the odds columns
in games.csv are not reliable closing prices.

    python scripts/backtest_nfl.py --out docs/BACKTEST_NFL.md
"""
from __future__ import annotations

import argparse
import itertools
import math
import os
import sys
import urllib.request

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from gg.pipeline.model import gate as gate_module  # noqa: E402
from gg.pipeline.model.nfl import CARRY, HFA, K, SIGMA, analytic_cover  # noqa: E402
from gg.pipeline.model.shared import evi, kelly  # noqa: E402
from gg.pipeline.nfl_ratings import PLAY_TYPES, blend_rating  # noqa: E402

PBP = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{s}.parquet"
GAMES = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
SEASONS = [2022, 2023, 2024, 2025]
PRICE = -110
WIN_PROFIT = 100 / 110
BREAKEVEN = 110 / 210


def _fetch(path: str, url: str) -> None:
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        urllib.request.urlretrieve(url, path)


def team_game_table(cache: str) -> pd.DataFrame:
    """One row per (season, week, team): offensive/defensive EPA sums and play counts."""
    rows = []
    for s in [SEASONS[0] - 1] + SEASONS:
        path = os.path.join(cache, f"pbp_{s}.parquet")
        _fetch(path, PBP.format(s=s))
        p = pd.read_parquet(path, columns=["season", "week", "season_type", "posteam", "defteam", "epa", "play_type"])
        p = p[(p.season_type == "REG") & p.epa.notna() & p.play_type.isin(PLAY_TYPES)]
        off = p.groupby(["season", "week", "posteam"]).epa.agg(["sum", "count"]).rename(
            columns={"sum": "off_sum", "count": "off_n"}).rename_axis(["season", "week", "team"])
        dfn = p.groupby(["season", "week", "defteam"]).epa.agg(["sum", "count"]).rename(
            columns={"sum": "def_sum", "count": "def_n"}).rename_axis(["season", "week", "team"])
        rows.append(off.join(dfn, how="outer").fillna(0.0).reset_index())
    return pd.concat(rows, ignore_index=True)


def raw_rating(off_sum, off_n, def_sum, def_n, games):
    """Same definition as nfl_ratings.compute_team_epa_stats."""
    if games == 0 or off_n == 0 or def_n == 0:
        return 0.0
    return (off_sum / off_n - def_sum / def_n) * (off_n / games)


def build_features(cache: str) -> pd.DataFrame:
    tg = team_game_table(cache)
    gpath = os.path.join(cache, "games.csv")
    _fetch(gpath, GAMES)
    g = pd.read_csv(gpath)
    g = g[g.season.isin(SEASONS) & (g.game_type == "REG")].copy()
    g = g.dropna(subset=["spread_line", "home_score", "away_score"])

    prior, prior_mean = {}, {}
    for s in SEASONS:
        t = tg[tg.season == s - 1]
        agg = t.groupby("team")[["off_sum", "off_n", "def_sum", "def_n"]].sum()
        games = t.groupby("team").week.nunique()
        prior[s] = {tm: raw_rating(r.off_sum, r.off_n, r.def_sum, r.def_n, games[tm]) for tm, r in agg.iterrows()}
        prior_mean[s] = float(np.mean(list(prior[s].values())))

    def current(s, w, tm):
        t = tg[(tg.season == s) & (tg.week < w) & (tg.team == tm)]
        gp = t.week.nunique()
        if gp == 0:
            return 0.0, 0
        return raw_rating(t.off_sum.sum(), t.off_n.sum(), t.def_sum.sum(), t.def_n.sum(), gp), gp

    recs = []
    for r in g.itertuples():
        h, a, s, w = r.home_team, r.away_team, r.season, r.week
        ch, gh = current(s, w, h)
        ca, ga = current(s, w, a)
        recs.append(dict(
            season=s, week=w, home=h, away=a, spread=float(r.spread_line),
            result=float(r.home_score - r.away_score),
            rp_h=prior[s].get(h, prior_mean[s]), rp_a=prior[s].get(a, prior_mean[s]),
            lm=prior_mean[s], rc_h=ch, rc_a=ca, gp_h=gh, gp_a=ga))
    return pd.DataFrame(recs)


def model_margin(df: pd.DataFrame, carry: float, k: float, hfa: float) -> np.ndarray:
    def blend(rp, rc, gp):
        w = gp / (gp + k)
        return w * rc + (1 - w) * (carry * rp + (1 - carry) * df.lm)
    return (blend(df.rp_h, df.rc_h, df.gp_h) - blend(df.rp_a, df.rc_a, df.gp_a) + hfa).to_numpy()


def check_blend_matches_production(df: pd.DataFrame) -> None:
    r = df.iloc[100]
    prod = blend_rating(r.rp_h, r.lm, r.rc_h, int(r.gp_h), CARRY, K)
    w = r.gp_h / (r.gp_h + K)
    mine = w * r.rc_h + (1 - w) * (CARRY * r.rp_h + (1 - CARRY) * r.lm)
    assert abs(prod - mine) < 1e-9, (prod, mine)


def bets(df: pd.DataFrame, margin: np.ndarray, sigma: float) -> pd.DataFrame:
    """Per-game bet decision as run.py makes it, at flat -110."""
    out = []
    for m, sp, res in zip(margin, df.spread, df.result):
        home_line = -sp  # signed from the home view: favourite negative
        p_home = analytic_cover(m, home_line, sigma)
        p_away = analytic_cover(-m, -home_line, sigma)
        e_home, e_away = evi(p_home, 0, 1 - p_home, PRICE), evi(p_away, 0, 1 - p_away, PRICE)
        home = e_home >= e_away
        p, e = (p_home, e_home) if home else (p_away, e_away)
        cm = (res - sp) if home else (sp - res)  # >0 win, 0 push
        profit = WIN_PROFIT if cm > 0 else (0.0 if cm == 0 else -1.0)
        d = gate_module.gate(model_margin=m, market_line=sp, evi_pct=e,
                             kelly_pct=kelly(p, 0, 1 - p, PRICE, 0.5))
        out.append(dict(home=home, evi=e, gap=abs(m - sp), profit=profit, win=cm > 0,
                        push=cm == 0, published=d.status == "published", status=d.status))
    return pd.DataFrame(out, index=df.index)


def summarize(b: pd.DataFrame) -> dict:
    n = len(b)
    if n == 0:
        nan = float("nan")
        return dict(n=0, w=0, l=0, push=0, win_pct=nan, roi=nan, ci=(nan, nan))
    w, push = int(b.win.sum()), int(b.push.sum())
    decided = n - push
    roi = b.profit.mean() * 100
    se = b.profit.std(ddof=1) / math.sqrt(n) * 100 if n > 1 else float("nan")
    return dict(n=n, w=w, l=decided - w, push=push, win_pct=w / decided * 100 if decided else float("nan"),
                roi=roi, ci=(roi - 1.96 * se, roi + 1.96 * se))


def fmt(s: dict) -> str:
    return (f"{s['n']} | {s['w']}-{s['l']}-{s['push']} | {s['win_pct']:.1f}% | "
            f"{s['roi']:+.1f}% | [{s['ci'][0]:+.1f}, {s['ci'][1]:+.1f}]")


def ols(y, X):
    X = np.column_stack([np.ones(len(y))] + list(X))
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    cov = np.linalg.inv(X.T @ X) * (resid @ resid) / (len(y) - X.shape[1])
    return beta, np.sqrt(np.diag(cov))


HDR = "| Slice | n | W-L-P | Win % | ROI | 95% CI |\n|---|---|---|---|---|---|"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=".cache/nflverse")
    ap.add_argument("--out", default="docs/BACKTEST_NFL.md")
    args = ap.parse_args()
    os.makedirs(args.cache, exist_ok=True)

    df = build_features(args.cache)
    check_blend_matches_production(df)
    L: list[str] = []
    P = L.append

    cur = model_margin(df, CARRY, K, HFA)
    res, sp = df.result.to_numpy(), df.spread.to_numpy()
    P("# NFL spread backtest (walk-forward, 2022-2025)\n")
    P(f"Games: {len(df)} regular-season games. Production constants: CARRY={CARRY}, K={K}, HFA={HFA}, "
      f"SIGMA={SIGMA}. Flat -110 pricing, 1 unit per bet, closing spread. "
      f"Break-even win rate {BREAKEVEN*100:.2f}%.\n")

    P("## 1. Does the model beat the market on accuracy?\n")
    P(f"- MAE vs final margin: model **{np.mean(np.abs(res - cur)):.2f}**, closing line **{np.mean(np.abs(res - sp)):.2f}**")
    P(f"- RMSE vs final margin: model {np.sqrt(np.mean((res - cur) ** 2)):.2f}, closing line {np.sqrt(np.mean((res - sp) ** 2)):.2f}")
    P(f"- Mean |model - line|: {np.mean(np.abs(cur - sp)):.2f} pts\n")
    beta, se = ols(res, [sp, cur - sp])
    P("Information test: `result = a + b*line + c*(model - line)`. If the model adds edge, c is positive and "
      "significant; c = 0 means the line already contains what the model knows.\n")
    P(f"- b (line) = {beta[1]:.2f} (SE {se[1]:.2f}); **c (model - line) = {beta[2]:.3f} "
      f"(SE {se[2]:.3f}, t = {beta[2]/se[2]:.2f})**\n")

    P("## 2. Production configuration as-is (gate = 7.0 pts, EVI floor 0)\n")
    P(HDR)
    b = bets(df, cur, SIGMA)
    P(f"| Every game, higher-EVI side | {fmt(summarize(b))} |")
    P(f"| Published (passes gate) | {fmt(summarize(b[b.published]))} |")
    P(f"| Skipped by gate | {fmt(summarize(b[~b.published]))} |")
    for s in SEASONS:
        m = (df.season == s).to_numpy()
        P(f"| Published, {s} | {fmt(summarize(b[b.published & m]))} |")
    P("")
    P("### By model-vs-line gap (all games)\n")
    P(HDR.replace("Slice", "Gap (pts)"))
    for lo, hi in [(0, 1), (1, 2), (2, 3), (3, 5), (5, 7), (7, 99)]:
        P(f"| {lo}-{hi if hi < 99 else '+'} | {fmt(summarize(b[(b.gap >= lo) & (b.gap < hi)]))} |")
    P("")
    P("### By stated EVI (all games)\n")
    P(HDR.replace("Slice", "EVI"))
    for lo, hi in [(-99, 0), (0, 5), (5, 10), (10, 20), (20, 999)]:
        P(f"| {lo if lo > -99 else '<'}..{hi if hi < 999 else '+'}% | {fmt(summarize(b[(b.evi >= lo) & (b.evi < hi)]))} |")
    P("")
    pub = b[b.published]
    P(f"Mean stated EVI on published bets: {pub.evi.mean():+.1f}%. Realised ROI on the same bets: {pub.profit.mean()*100:+.1f}%.\n")

    P("## 3. Calibration sweep (fit 2022-23, test 2024-25)\n")
    P("Parameters minimise squared margin error on the training seasons only (accuracy, not betting profit, "
      "to avoid fitting noise), then are scored once on the held-out seasons.\n")
    tr, te = df.season.isin([2022, 2023]).to_numpy(), df.season.isin([2024, 2025]).to_numpy()
    grid = itertools.product([0.0, 0.2, 0.4, 0.6, 0.8, 1.0], [2, 4, 6, 10, 16, 24, 40], [0.0, 1.0, 1.8, 2.15, 2.5])
    scored = sorted((float(np.mean((res[tr] - model_margin(df[tr], c, k, h)) ** 2)), c, k, h) for c, k, h in grid)
    _, bc, bk, bh = scored[0]
    fit_m = model_margin(df, bc, bk, bh)
    sigma_fit = float(np.std(res[tr] - fit_m[tr], ddof=1))
    sigma_mkt = float(np.std(res[tr] - sp[tr], ddof=1))
    P("| Config | CARRY | K | HFA | Train RMSE | Test RMSE | Test MAE |\n|---|---|---|---|---|---|---|")
    for name, (c, k, h) in {"Production": (CARRY, K, HFA), "Fit on 2022-23": (bc, bk, bh)}.items():
        mm = model_margin(df, c, k, h)
        P(f"| {name} | {c} | {k} | {h} | {np.sqrt(np.mean((res[tr]-mm[tr])**2)):.2f} | "
          f"{np.sqrt(np.mean((res[te]-mm[te])**2)):.2f} | {np.mean(np.abs(res[te]-mm[te])):.2f} |")
    P(f"| Closing line (benchmark) | - | - | - | {np.sqrt(np.mean((res[tr]-sp[tr])**2)):.2f} | "
      f"{np.sqrt(np.mean((res[te]-sp[te])**2)):.2f} | {np.mean(np.abs(res[te]-sp[te])):.2f} |\n")
    P(f"Residual sigma: fitted model {sigma_fit:.2f} (train), closing line {sigma_mkt:.2f} (train); production uses {SIGMA}.\n")
    P("Held-out seasons (2024-25), same gate:\n")
    P(HDR)
    fb = bets(df[te], fit_m[te], sigma_fit)
    P(f"| Published, fitted config | {fmt(summarize(fb[fb.published]))} |")
    pb = bets(df[te], cur[te], SIGMA)
    P(f"| Published, production config | {fmt(summarize(pb[pb.published]))} |\n")

    P("## 4. Reading this\n")
    t = beta[2] / se[2]
    if t < 2:
        P("- The model's disagreement with the line does **not** predict results at conventional significance. "
          "Treat stated EVI as unvalidated; do not market it as an edge.")
    else:
        P("- The model's disagreement with the line carries statistically significant information beyond the line.")
    P("- The gate thresholds (7.0 pt gap, EVI >= 0) should be judged against the tables above, not prior documentation.")
    P("- Closing lines are the most efficient price available; real pre-kickoff lines can differ in either direction.")
    P("- Reproduce: `python scripts/backtest_nfl.py`.")

    text = "\n".join(L) + "\n"
    with open(args.out, "w") as f:
        f.write(text)
    print(text)


if __name__ == "__main__":
    main()
