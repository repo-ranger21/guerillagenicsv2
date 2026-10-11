"""
GuerillaGenics - NFL spread Monte Carlo (standalone)

No database, no API, no pipeline. Pure functions in, numbers out.
Run:  python gg_sim.py
"""

import numpy as np
from dataclasses import dataclass

NFL_MARGIN_SIGMA = 13.2   # historical stdev of NFL final margins
HOME_FIELD_PTS   = 1.8    # post-2020 HFA has compressed from the old ~2.5


# ---------- pure math ----------

def american_to_profit(odds: int) -> float:
    """Profit per 1 unit staked."""
    return 100.0 / abs(odds) if odds < 0 else odds / 100.0


def simulate_margin(edge_pts: float, sigma: float, n: int, seed: int) -> np.ndarray:
    """Simulated final margins from the bet team's perspective."""
    rng = np.random.default_rng(seed)
    return rng.normal(loc=edge_pts, scale=sigma, size=n)


def cover_probabilities(margins: np.ndarray, spread: float):
    """spread is signed from the bet team's view: -2.5 favourite, +3 dog."""
    adj = margins + spread
    push = float(np.mean(np.isclose(adj, 0.0, atol=1e-9)))
    win = float(np.mean(adj > 0))
    return win, push, 1.0 - win - push


def evi(p_win: float, p_push: float, p_loss: float, odds: int) -> float:
    """Expected value per unit staked, as a percentage. Pushes return stake."""
    b = american_to_profit(odds)
    return (p_win * b - p_loss * 1.0) * 100.0


def kelly(p_win: float, p_push: float, p_loss: float, odds: int,
          fraction: float = 0.5) -> float:
    """Fractional Kelly, conditioned on a non-push outcome. Percent of bankroll."""
    live = p_win + p_loss
    if live <= 0:
        return 0.0
    p, q = p_win / live, p_loss / live
    b = american_to_profit(odds)
    f = (b * p - q) / b
    return max(0.0, f * fraction * 100.0)


# ---------- one pick ----------

@dataclass
class Pick:
    label: str
    bet_team_rating: float
    opp_rating: float
    bet_team_is_home: bool
    spread: float
    odds: int


def evaluate(pick: Pick, n: int = 100_000, seed: int = 20260913,
             sigma: float = NFL_MARGIN_SIGMA):
    hfa = HOME_FIELD_PTS if pick.bet_team_is_home else -HOME_FIELD_PTS
    edge = (pick.bet_team_rating - pick.opp_rating) + hfa

    margins = simulate_margin(edge, sigma, n, seed)
    w, pu, l = cover_probabilities(margins, pick.spread)

    return {
        "label": pick.label,
        "edge_pts": edge,
        "model_prob": w,
        "push_prob": pu,
        "evi": evi(w, pu, l, pick.odds),
        "kelly_pct": kelly(w, pu, l, pick.odds),
        "mean_margin": float(margins.mean()),
    }


# ---------- verification ----------

def analytic_cover(edge_pts: float, spread: float, sigma: float) -> float:
    """Closed form for the same normal model. The sim must converge to this."""
    from math import erf, sqrt
    z = (edge_pts + spread) / sigma
    return 0.5 * (1.0 + erf(z / sqrt(2.0)))


if __name__ == "__main__":
    p = Pick(
        label="BAL -2.5 @ IND",
        bet_team_rating=4.1,      # points above a league-average team
        opp_rating=1.2,
        bet_team_is_home=False,
        spread=-2.5,
        odds=-110,
    )

    r = evaluate(p)
    print(f"{r['label']}")
    print(f"  model edge      {r['edge_pts']:+.2f} pts")
    print(f"  mean sim margin {r['mean_margin']:+.2f} pts")
    print(f"  model_prob      {r['model_prob']*100:.2f}%")
    print(f"  push_prob       {r['push_prob']*100:.2f}%")
    print(f"  EVI             {r['evi']:+.2f}%")
    print(f"  Kelly (half)    {r['kelly_pct']:.2f}%")

    print("\n  convergence check")
    exact = analytic_cover(r["edge_pts"], p.spread, NFL_MARGIN_SIGMA)
    for n in (1_000, 10_000, 100_000, 1_000_000):
        m = simulate_margin(r["edge_pts"], NFL_MARGIN_SIGMA, n, seed=7)
        w, _, _ = cover_probabilities(m, p.spread)
        print(f"    n={n:>9,}  sim {w*100:6.2f}%   error {abs(w-exact)*100:+.3f} pts")
    print(f"    closed form   {exact*100:6.2f}%")

    print("\n  sigma sensitivity (model_prob)")
    for s in (12.0, 13.2, 14.5):
        m = simulate_margin(r["edge_pts"], s, 200_000, seed=11)
        w, _, _ = cover_probabilities(m, p.spread)
        print(f"    sigma={s:>4.1f}   {w*100:6.2f}%   EVI {evi(w,0,1-w,p.odds):+.2f}%")

    print("\n  push exposure on a key number (spread -3.0)")
    for spr in (-2.5, -3.0, -3.5):
        m = simulate_margin(r["edge_pts"], NFL_MARGIN_SIGMA, 200_000, seed=13)
        mr = np.round(m)  # discrete scores
        w, pu, l = cover_probabilities(mr, spr)
        print(f"    {spr:+.1f}   win {w*100:5.2f}%  push {pu*100:5.2f}%  "
              f"EVI {evi(w,pu,l,p.odds):+.2f}%")
