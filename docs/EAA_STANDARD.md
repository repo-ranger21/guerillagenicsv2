# EAA Standard — Edge-Adjusted Analysis

EAA (Edge-Adjusted Analysis) is GuerillaGenics' output format for communicating model findings. Every NEEDLE alert, futures card, and API response uses the EAA standard.

---

## Core Fields

| Field | Type | Description |
|---|---|---|
| `team_id` / `abbreviation` | string | Canonical team identifier |
| `full_name` | string | Full franchise name |
| `sport` | enum | `nba`, `mlb`, `nfl` |
| `season` | string | `YYYY-YY` or `YYYY` |
| `cfs_score` | float [0–100] | Composite Futures Score |
| `rank_position` | int | League rank by CFS (1 = best) |
| `gg_prob` | float [0–1] | GuerillaGenics championship probability |
| `market_prob` | float [0–1] | Vig-removed market consensus probability |
| `edge_pct` | float | `gg_prob − market_prob` (signed) |
| `american_odds` | int | Best available American odds |
| `edge_direction` | enum | `VALUE`, `FADE`, or `NEUTRAL` |
| `tier` | enum | `NEEDLE`, `LOCK`, `LEAN`, `WATCH`, `FADE` |

---

## Component Score Block

Every EAA payload includes a `components` object with all 7 sub-scores:

```json
{
  "components": {
    "gg_elo": 84.2,
    "nir": 76.1,
    "ssc": 61.4,
    "iis": 91.0,
    "mdi": 78.3,
    "pds": 55.6,
    "eaf": 70.0
  }
}
```

---

## Signal Block (NEEDLE Alerts Only)

When `tier` is `NEEDLE`, `LOCK`, or `LEAN`, a `signals` block is included:

```json
{
  "signals": {
    "model_edge": 0.094,
    "line_movement": true,
    "sharp_money": true,
    "public_fade": false,
    "injury_mispriced": false,
    "late_season_drift": false
  },
  "triggered_signals": ["model_edge", "line_movement", "sharp_money"]
}
```

---

## Kelly Block

Included when American odds are available:

```json
{
  "kelly": {
    "full_kelly": 0.062,
    "half_kelly": 0.031,
    "quarter_kelly": 0.015,
    "recommended_unit_size": 0.015,
    "ev": 0.18
  }
}
```

---

## EAA Points (Display Layer)

The frontend renders up to 5 "EAA Points" — short narrative bullets summarizing the key drivers of an alert. These are constructed from triggered signals and component scores at render time:

| Signal | EAA Point Template |
|---|---|
| `model_edge` | `+{edge_pct}% model edge vs market` |
| `line_movement` | `Line moved in our favor since open` |
| `sharp_money` | `Sharp action detected (low public%, high handle%)` |
| `injury_mispriced` | `Opponent key injury not priced in` |
| `public_fade` | `Fading {pct}% public on {team}` |

---

## Versioning

The EAA standard version is embedded in `model_snapshots.payload.eaa_version`. Current version: `2.0`. Breaking schema changes bump the major version; additive fields bump minor.

---

## Database Representation

EAA objects are persisted in two tables:

- `futures_scores` — one row per team per season; `components` JSONB column
- `needle_alerts` — one row per alert; `signals` and `eaa_points` JSONB columns
- `model_snapshots` — full EAA output for all teams, snapshot per ingest run
