# NEEDLE Criteria

The NEEDLE is the GuerillaGenics signal for maximum-conviction betting edges in futures markets. This document defines what qualifies as each tier and how the MID formula weights signals.

---

## Tier Definitions

| Tier | Minimum Edge | Color | Behavior |
|---|---|---|---|
| NEEDLE | ≥ 7.0% | `gg-green-500` (pulsing) | Spotlight card; push notification |
| LOCK | ≥ 5.0% | `gg-green-500` | Highlighted row; left border |
| LEAN | ≥ 3.0% | amber | Highlighted row |
| WATCH | ≥ 0.0% | gray | Standard row |
| FADE | < 0.0% | red | Dimmed; no left border |

Edge is defined as `GG_prob − market_prob` after vig removal.

---

## Qualifying Signals

The MID formula evaluates 6 binary/continuous signals. A tier is only assigned when the composite weighted signal score clears the edge threshold:

### 1. Model Edge (`model_edge`, weight 2.0)
Raw probability gap between GG model and market consensus. The single highest-weight signal. Value equals the edge percentage directly.

### 2. Line Movement (`line_movement`, weight 1.5)
Triggered when opening odds have shortened (e.g., +600 → +450) without a clear public-action explanation. Indicates professional money. Detected by comparing `open_odds` vs `current_odds` in `odds_history`.

### 3. Sharp Money (`sharp_money`, weight 1.5)
Triggered when public betting percentage is below 30% but money percentage is above 60% — indicating sharp/syndicate action on the opposite side of the public.

### 4. Public Fade (`public_fade`, weight 1.0)
Triggered when public bet% on a team exceeds 70% AND the team is overpriced by the model. Contrarian signal.

### 5. Injury Mispriced (`injury_mispriced`, weight 1.0)
Triggered when an opponent has a significant IIS impact (> 15 points below healthy baseline) AND market odds have not adjusted proportionally within 24 hours of the injury report.

### 6. Late-Season Drift (`late_season_drift`, weight 0.5)
Triggered in the final 15% of the regular season or during playoff positioning battles. Books historically lag in adjusting futures during this window.

---

## Minimum Signal Requirements

A NEEDLE alert requires **at least 3 triggered signals** in addition to clearing the 7% edge threshold. This prevents false positives from a single massive model edge.

LOCK and LEAN require only 2 triggered signals.

---

## Alert Lifecycle

1. **Created** — Ingest pipeline detects qualifying edge → row inserted into `needle_alerts`
2. **Active** — Alert is surfaced on Futures board and Alerts feed
3. **Resolved** — Edge collapses below 1.5% → `resolved_at` timestamp set
4. **Stale** — Alert age > 7 days without resolution → hidden from active feed but preserved in DB

---

## Push Notification Trigger

The nightly ingest sends a Slack notification (`SLACK_WEBHOOK`) whenever:
- A new NEEDLE (≥ 7%) is created
- An existing NEEDLE resolves
- Any signal changes tier (e.g., LEAN → NEEDLE)

---

## Anti-Gaming Rules

To prevent the model from repeatedly surfacing the same alert as market prices slowly catch up:

- A team cannot have more than 1 active NEEDLE alert at a time
- Alerts for the same team created within 72 hours are de-duplicated (highest edge wins)
- Post-championship (after odds hit −500 or better), no new alerts are generated for that team
