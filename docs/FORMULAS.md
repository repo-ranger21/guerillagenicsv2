# GuerillaGenics Formula Reference

All formulas live in `backend/formulas/`. Every score is normalized to **0–100** before being passed to CFS unless noted.

---

## GG-ELO — Elo Rating System

**File:** `formulas/gg_elo.py`

Standard Elo with a margin-of-victory (MOV) multiplier applied to the K-factor:

```
MOV_mult = log(|margin| + 1) × 2.2 / (Δelo × 0.001 + 2.2)
MOV_mult = min(MOV_mult, 2.0)

K_eff = K × MOV_mult
new_elo = old_elo + K_eff × (outcome − expected)
```

- K-factor: 20 (default)
- Season reset: 33% reversion to 1500 mean
- `normalize_elo_to_score()` maps raw Elo linearly to [0, 100] within the current season pool

---

## NIR — Net Impact Rating

**File:** `formulas/net_impact_rating.py`

Pace-adjusted net rating with opponent strength correction:

```
pace_adj_net = (points_for − points_against) / possessions × 100
opp_adj = pace_adj_net + α × (opp_strength_percentile − 50)
```

- α = 0.35 (opponent adjustment weight)
- `compute_nir_batch()` normalizes across all teams in the batch to [0, 100]

---

## SSC — Schedule Strength Composite

**File:** `formulas/schedule_strength.py`

Inverted schedule difficulty score (harder schedule = **lower** SSC):

```
difficulty = Σ(opp_elo_normalized × game_weight) + b2b_penalty + travel_factor
SSC = 100 − normalize(difficulty)
```

- Back-to-back penalty: −8 points per B2B game
- Opponent weight: mean ELO of remaining opponents normalized to [0, 1]
- Normalization is relative to the full league in the same sport/season

---

## IIS — Injury Impact Score

**File:** `formulas/injury_impact.py`

Quantifies roster health by weighting injured players by role and availability:

```
STATUS_MULTIPLIERS = {OUT: 1.0, DOUBTFUL: 0.75, QUESTIONABLE: 0.4, PROBABLE: 0.1}
DEPTH_DISCOUNT = {1: 1.0, 2: 0.6, 3: 0.3}   # depth position

impact_pct = Σ(status_mult × depth_discount × win_share_weight)
IIS = clamp(100 − impact_pct × 2, 0, 100)
```

Higher IIS = healthier roster.

---

## MDI — Momentum Decay Index

**File:** `formulas/momentum_decay.py`

Recent form with exponential decay weighting older games:

```
weight(i) = DECAY^i        # i = games ago, DECAY = 0.85
weighted_win_rate = Σ(result_i × weight_i) / Σ(weight_i)
MDI = (weighted_win_rate × 0.7 + margin_component × 0.3) × 100
```

- WINDOW: last 20 games
- Streak bonus/penalty: ±3 points per game in active streak (max ±15)

---

## PDS — Playoff DNA Score

**File:** `formulas/playoff_dna.py`

Four weighted components measuring franchise playoff readiness:

| Component | Weight | Source |
|---|---|---|
| Coach experience (playoff W%) | 25% | BRef scraper |
| Historical championship win rate | 30% | BRef scraper |
| Recent depth (rotation quality) | 25% | ESPN stats |
| Clutch performance (close-game W%) | 20% | NBA Stats API |

```
PDS = 0.25 × coach_exp + 0.30 × historical_wr + 0.25 × recent_depth + 0.20 × clutch
```

---

## EAF — Environmental Advantage Factor

**File:** `formulas/environmental.py`

Accounts for home-court, rest, altitude, and (NFL) weather:

```
EAF = HOME_COURT_BASE(3.5) + rest_advantage + altitude_factor + weather_impact
EAF_score = normalize(EAF, floor=−10, ceiling=15)
```

- Altitude factor: +2.5 for stadiums > 3,000 ft (Denver, Mexico City)
- Weather: NFL outdoor only; temperature, wind, precipitation from OpenWeatherMap
- Rest advantage: days since last game delta vs opponent

---

## MID — Market Inefficiency Detector (THE NEEDLE)

**File:** `formulas/market_inefficiency.py`

Detects exploitable pricing gaps using six weighted signals:

| Signal | Weight |
|---|---|
| Model edge (GG_prob − market_prob) | 2.0 |
| Line movement direction | 1.5 |
| Sharp money indicator | 1.5 |
| Public fade (fade heavy public action) | 1.0 |
| Injury mispriced by market | 1.0 |
| Late-season drift | 0.5 |

**Tier thresholds:**

| Tier | Edge |
|---|---|
| NEEDLE | ≥ 7% |
| LOCK | ≥ 5% |
| LEAN | ≥ 3% |
| WATCH | ≥ 0% |
| FADE | < 0% |

---

## MCS — Monte Carlo Simulation

**File:** `formulas/monte_carlo.py`

Simulates bracket outcomes using per-matchup win probabilities derived from GG-ELO:

```
P(home wins) = 1 / (1 + 10^((elo_away − elo_home − home_adj) / 400))
home_adj = 75 ELO points (NBA/NHL), 0 (neutral site)
```

- Default: **100,000 simulations**
- Returns probability dictionary: `{team: {round: prob, ...}}`
- NBA: 5 rounds (R1 → conf_semis → conf_finals → finals → champion)
- MLB: 5 rounds (WC → DS → CS → WS → champion)

---

## CFS — Composite Futures Score

**File:** `formulas/composite_futures.py`

Weighted combination of all 7 component scores:

| Component | Default Weight |
|---|---|
| GG-ELO | 0.22 |
| NIR | 0.20 |
| IIS | 0.12 |
| MDI (edge) | 0.15 |
| PDS | 0.13 |
| SSC | 0.08 |
| EAF | 0.05 |
| MID edge | 0.05 |

Weights are overridable via `CFS_WEIGHT_*` environment variables. They are re-normalized to sum to 1.0 automatically.

```
CFS = Σ(component_score × weight) / Σ(weights)
```

`rank_teams()` sorts descending by CFS and attaches `rank_position`.

---

## Kelly Criterion

**File:** `formulas/kelly_criterion.py`

```
f* = (b × p − q) / b
```
where `b` = decimal odds − 1, `p` = model probability, `q` = 1 − p.

Returns `full_kelly`, `half_kelly`, `quarter_kelly`, and `recommended_unit_size` (capped at 5% of bankroll).
