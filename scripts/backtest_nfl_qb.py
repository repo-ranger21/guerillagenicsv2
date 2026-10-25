"""Experiment: does a starting-quarterback adjustment give the model any edge?

Builds on scripts/backtest_nfl.py (same ratings, gate, -110 pricing, closing
spreads, 2022-2025). The team rating already contains its quarterbacks'
play, so the adjustment is the CHANGE: how much better or worse today's
starter is than the QBs who produced the team's rating.

  qb_value   = shrunk EPA per dropback, from every earlier game (walk-forward:
               prior seasons plus weeks < W of this season), shrunk toward the
               league mean with PRIOR_N dropbacks of pseudo-data.
  baseline   = dropback-weighted qb_value of the QBs behind the team's rating,
               blended current/prior season with the same gp/(gp+K) weight.
  adjustment = beta * DROPBACKS * ((qb_value - baseline)_home - (...)_away)

beta and PRIOR_N are fit on 2022-23 only; 2024-25 is the held-out test.
The starter is read from games.csv (the QB who actually started). In real use
that is known from Thursday-Saturday injury reports; a rare late scratch is
the only leak, and it is stated, not hidden.

QB injuries are covered through the starter. Non-QB injuries need a player
value model and are NOT tested here.

    python scripts/backtest_nfl_qb.py --out docs/BACKTEST_NFL_QB.md
"""
from __future__ import annotations

import argparse
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import backtest_nfl as b  # noqa: E402

DROPBACKS = 38.0  # team dropbacks per game (league average)
PRIOR_GRID = [100, 200, 400, 800, 1600]


def qb_game_table(cache: str) -> pd.DataFrame:
    """One row per (season, week, team, QB): dropbacks and EPA sum."""
    rows = []
    for s in [b.SEASONS[0] - 1] + b.SEASONS:
        p = pd.read_parquet(os.path.join(cache, f"pbp_{s}.parquet"),
                            columns=["season", "week", "season_type", "posteam", "epa", "qb_dropback", "id"])
        p = p[(p.season_type == "REG") & (p.qb_dropback == 1) & p.epa.notna() & p.id.notna()]
        rows.append(p.groupby(["season", "week", "posteam", "id"]).epa.agg(["count", "sum"])
                    .rename(columns={"count": "n", "sum": "epa_sum"}).reset_index()
                    .rename(columns={"posteam": "team", "id": "qb"}))
    return pd.concat(rows, ignore_index=True)


def qb_values(qbg: pd.DataFrame, season: int, week: int, prior_n: float):
    h = qbg[(qbg.season < season) | ((qbg.season == season) & (qbg.week < week))]
    mu = h.epa_sum.sum() / h.n.sum()
    agg = h.groupby("qb")[["n", "epa_sum"]].sum()
    return (agg.epa_sum + prior_n * mu) / (agg.n + prior_n), mu


def team_baseline(qbg, team, season, week, val, mu, k):
    def wmean(sub):
        g = sub.groupby("qb").n.sum()
        if g.sum() == 0:
            return mu
        return float((g * val.reindex(g.index).fillna(mu)).sum() / g.sum())
    cur = qbg[(qbg.season == season) & (qbg.week < week) & (qbg.team == team)]
    prior = qbg[(qbg.season == season - 1) & (qbg.team == team)]
    gp = cur.week.nunique()
    w = gp / (gp + k)
    return w * wmean(cur) + (1 - w) * wmean(prior)


def qb_feature(df: pd.DataFrame, qbg: pd.DataFrame, prior_n: float) -> np.ndarray:
    """Points-per-game QB swing, home minus away, for every game in df."""
    out = np.zeros(len(df))
    cache: dict = {}
    for i, r in enumerate(df.itertuples()):
        key = (r.season, r.week)
        if key not in cache:
            cache[key] = qb_values(qbg, r.season, r.week, prior_n)
        val, mu = cache[key]
        xh = val.get(r.hqb, mu) - team_baseline(qbg, r.home, r.season, r.week, val, mu, b.K)
        xa = val.get(r.aqb, mu) - team_baseline(qbg, r.away, r.season, r.week, val, mu, b.K)
        out[i] = DROPBACKS * (xh - xa)
    return out


def fit_beta(y, x):
    beta = float(x @ y / (x @ x))
    se = float(np.sqrt(((y - beta * x) ** 2).sum() / (len(y) - 1) / (x @ x)))
    return beta, se


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=".cache/nflverse")
    ap.add_argument("--out", default="docs/BACKTEST_NFL_QB.md")
    args = ap.parse_args()

    df = b.build_features(args.cache)
    g = pd.read_csv(os.path.join(args.cache, "games.csv"))
    g = g[g.season.isin(b.SEASONS) & (g.game_type == "REG")]
    ids = g.set_index(["season", "week", "home_team", "away_team"])[["home_qb_id", "away_qb_id"]]
    df = df.join(ids, on=["season", "week", "home", "away"]).rename(columns={"home_qb_id": "hqb", "away_qb_id": "aqb"})
    dropped = int(df.hqb.isna().sum() + df.aqb.isna().sum())
    df = df.dropna(subset=["hqb", "aqb"]).reset_index(drop=True)
    qbg = qb_game_table(args.cache)

    res, sp = df.result.to_numpy(), df.spread.to_numpy()
    base = b.model_margin(df, b.CARRY, b.K, b.HFA)
    tr, te = df.season.isin([2022, 2023]).to_numpy(), df.season.isin([2024, 2025]).to_numpy()

    fits = []
    for pn in PRIOR_GRID:
        x = qb_feature(df, qbg, pn)
        beta, se = fit_beta((res - base)[tr], x[tr])
        rmse = float(np.sqrt(np.mean((res[tr] - (base + beta * x)[tr]) ** 2)))
        fits.append((rmse, pn, beta, se, x))
    rmse_tr, pn, beta, se, x = min(fits, key=lambda t: t[0])
    # Expanding window: each season's beta is fit only on seasons before it
    # (2022-24 for 2025), so the test seasons are scored fully out of sample.
    season_arr = df.season.to_numpy()
    beta_by_season = {}
    for s_ in b.SEASONS:
        past = season_arr < s_ if s_ > 2023 else season_arr <= 2023
        beta_by_season[s_] = fit_beta((res - base)[past], x[past])[0]
    beta_vec = np.array([beta_by_season[s_] for s_ in season_arr])
    adj = base + beta_vec * x
    sigma_adj = float(np.std(res[tr] - adj[tr], ddof=1))

    L: list[str] = []
    P = L.append
    P("# Experiment: starting-QB adjustment (walk-forward, 2022-2025)\n")
    P(f"Games: {len(df)} ({dropped} QB-id gaps dropped). Fit on 2022-23, test on 2024-25 (n={int(te.sum())}). "
      "Same ratings, gate, -110 pricing and closing spreads as docs/BACKTEST_NFL.md.\n")
    P("## 1. Fit (training seasons only)\n")
    P("| PRIOR_N | beta | SE | t | Train RMSE |\n|---|---|---|---|---|")
    for rm, p_, bt, s_, _ in fits:
        P(f"| {p_}{' (chosen)' if p_ == pn else ''} | {bt:.3f} | {s_:.3f} | {bt/s_:.1f} | {rm:.2f} |")
    P("\nBeta used per season (expanding window, out of sample): "
      + ", ".join(f"{k}: {v:.2f}" for k, v in beta_by_season.items()) + ".")
    P(f"\nbeta = 1 would mean the QB swing is worth exactly its EPA-implied points. Chosen: PRIOR_N={pn}, beta={beta:.3f}.\n")

    beta_all, se_all = fit_beta(res - base, x)
    P("Power check (diagnostic only; uses ALL seasons, so it is in-sample): "
      f"beta = {beta_all:.2f} +/- {1.96*se_all:.2f} (95%). "
      "A wide interval that contains both 0 and 1 means the data cannot say whether QB changes matter beyond "
      "what the team rating already holds.\n")
    P("## 2. Accuracy (points of margin error)\n")
    P("| Model | Train RMSE | Test RMSE | Test MAE |\n|---|---|---|---|")
    for name, m in [("Base (production)", base), ("Base + QB adjustment", adj), ("Closing line", sp)]:
        P(f"| {name} | {np.sqrt(np.mean((res[tr]-m[tr])**2)):.2f} | {np.sqrt(np.mean((res[te]-m[te])**2)):.2f} | "
          f"{np.mean(np.abs(res[te]-m[te])):.2f} |")
    P("")
    big = np.abs(x) >= 2.0
    P(f"Games where the QB swing is >= 2 pts: {int(big.sum())} total, {int((big & te).sum())} in the test seasons.\n")
    P("| Subset (swing >= 2 pts) | Base RMSE | +QB RMSE | Line RMSE |\n|---|---|---|---|")
    for name, mk in [("Test seasons", big & te), ("All seasons (train is in-sample)", big)]:
        if mk.sum() > 1:
            P(f"| {name} (n={int(mk.sum())}) | {np.sqrt(np.mean((res[mk]-base[mk])**2)):.2f} | "
              f"{np.sqrt(np.mean((res[mk]-adj[mk])**2)):.2f} | {np.sqrt(np.mean((res[mk]-sp[mk])**2)):.2f} |")
    P("")

    P("## 3. Does the adjusted model know anything the line does not?\n")
    P("`result = a + b*line + c*(model - line)`; c > 0 and significant would mean edge.\n")
    P("| Model | Sample | c | SE | t |\n|---|---|---|---|---|")
    for name, m in [("Base", base), ("Base + QB", adj)]:
        for lab, mk in [("Test 2024-25", te), ("All 2022-25", np.ones(len(df), bool))]:
            bt, s_ = b.ols(res[mk], [sp[mk], (m - sp)[mk]])
            P(f"| {name} | {lab} | {bt[2]:.3f} | {s_[2]:.3f} | {bt[2]/s_[2]:.2f} |")
    P("")

    P("## 4. Betting results (gate as in production, flat -110)\n")
    P(b.HDR)
    for name, m, sg in [("Base", base, b.SIGMA), ("Base + QB", adj, sigma_adj)]:
        bb = b.bets(df, m, sg)
        P(f"| {name}, test 2024-25, published | {b.fmt(b.summarize(bb[bb.published & te]))} |")
        P(f"| {name}, all seasons, published | {b.fmt(b.summarize(bb[bb.published]))} |")
    P("")
    P("## 5. Reading this\n")
    bt_te, s_te = b.ols(res[te], [sp[te], (adj - sp)[te]])
    t_te = bt_te[2] / s_te[2]
    P(f"- QB swing coefficient: beta = {beta:.2f} (t = {beta/se:.1f}) on training data.")
    P("- A positive t in section 3 on the test seasons is the only evidence of edge that counts; "
      f"it is {t_te:.2f} here. Two seasons of games have low power: a true edge of a couple of ROI points "
      "would not show at this sample size.")
    P("- Closing lines already price known QB changes, so a QB adjustment is expected to improve ACCURACY "
      "(section 2) long before it beats the line.")
    P("- Reproduce: `python scripts/backtest_nfl_qb.py`.")
    text = "\n".join(L) + "\n"
    with open(args.out, "w") as f:
        f.write(text)
    print(text)


if __name__ == "__main__":
    main()
