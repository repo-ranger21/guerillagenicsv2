# backend/db — deprecation map

`backend/db/schema.sql` was deleted 2026-08-12. It was a stale, pre-migration
schema draft that had drifted completely from the real schema, which lives in
`supabase/migrations/` (the sole source of truth — see CLAUDE.md invariant 8).
It used UUID primary keys, a `sport_type` enum, and table shapes (`teams`,
`needle_alerts`, `player_futures`, `model_snapshots`, `odds_history`,
`watchlist`, plus `futures_scores` and `bracket_simulations`, which have no
live equivalent at all) that never matched what the actual migrations built.
`docs/DEPLOYMENT.md` pointed operators at it as the schema-setup step; that's
fixed to `supabase db push` in the same pass as this file.

Deleting the SQL file does not fix the Python written against it. This is
the map of what's still broken, for whoever removes it — Chris, soon. The
pipeline described below is being replaced from scratch, not reconciled.

## Query modules in `backend/db/queries/`

| Module | Targets | Status |
|---|---|---|
| `picks_daily.py` | real `picks_daily` (`slug`/`game_date` conflict target) | **correct — matches live schema, leave alone** |
| `teams.py` | abandoned schema (`sport` bare column, `on_conflict="sport,abbreviation"`) | broken — live `teams` uses `sport_id` FK, not `sport` |
| `needle_alerts.py` | abandoned schema (`is_active`, `edge_pct`, `team_id` uuid, `sport`, `tier`) | broken — none of these columns exist on live `needle_alerts` |
| `player_futures.py` | abandoned schema (`sport`, `season`, `award`, `gg_prob`, `edge_direction`) | broken — none of these columns exist on live `player_futures` |
| `model_snapshots.py` | abandoned schema (`sport`, `season`, `snapshot_type`, `top_needle`) | broken — none of these columns exist on live `model_snapshots` |

## Files importing the broken modules

- `backend/api/routes/futures.py` → `teams.py`
- `backend/api/routes/bracket.py` → `model_snapshots.py`
- `backend/api/routes/alerts.py` → `needle_alerts.py`
- `backend/api/routes/needle.py` → `needle_alerts.py`
- `backend/api/routes/players.py` → `player_futures.py`
- `backend/ingest/nfl_pipeline.py` → `needle_alerts.py`, `model_snapshots.py`
- `backend/ingest/mlb_pipeline.py` → `needle_alerts.py`, `model_snapshots.py`
- `backend/ingest/nba_pipeline.py` → `needle_alerts.py`, `model_snapshots.py`

`backend/ingest/picks_builder.py` imports `picks_daily.py` only — not on this
list, not broken.
