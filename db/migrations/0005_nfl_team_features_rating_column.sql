-- ============================================================
-- GuerillaGenics v2 — Neon migration 0005
-- Add a typed column for the computed team rating.
--
-- nfl_team_features had epa_play_off/epa_play_def/etc. but nothing for
-- the derived net-EPA rating (points above a league-average team, per
-- game) that Step 5's model actually reads. The table's own raw jsonb
-- column is documented as an escape hatch for UNmodeled fields — this
-- is the opposite, a modeled, primary model input — so it gets a real
-- column, added now while the table is still empty and the change is
-- free. Same reasoning as migration 0001's game_id/model_run_id
-- addition to picks_daily.
-- ============================================================

alter table public.nfl_team_features
  add column rating_pts_per_game numeric;

comment on column public.nfl_team_features.rating_pts_per_game is
  'Net EPA/play * plays-per-game, CARRY/K-blended toward the league mean. Points above a league-average team, per game — the direct input to gg.pipeline.model.nfl''s Monte Carlo (Pick.bet_team_rating / opp_rating in examples/gg_sim.py). Computed in scripts/week1_math.py; CARRY/K provenance documented in gg/pipeline/model/nfl.py.';
