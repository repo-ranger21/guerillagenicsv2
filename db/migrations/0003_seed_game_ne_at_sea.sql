-- ============================================================
-- GuerillaGenics v2 — Neon migration 0003
-- Step 3: one hardcoded games row — NE @ SEA, 2026 Week 1.
-- Schedule ingest is a later task; this is a deliberate hardcode to
-- prove the pipe end to end on a single known game.
--
-- Kickoff 2026-09-10 20:20 ET is converted via AT TIME ZONE rather
-- than a manually computed UTC offset, so DST is handled correctly
-- regardless of which side of a transition the date falls on.
-- home_team_id/away_team_id resolved by abbreviation lookup rather
-- than hardcoded ids, matching migration 0002's pattern.
-- ============================================================

insert into public.games (sport_id, season, week, home_team_id, away_team_id, game_time, status, external_id)
select
  1,
  2026,
  1,
  home.id,
  away.id,
  ('2026-09-10 20:20:00'::timestamp AT TIME ZONE 'America/New_York'),
  'scheduled',
  null
from public.teams home, public.teams away
where home.sport_id = 1 and home.abbreviation = 'SEA'
  and away.sport_id = 1 and away.abbreviation = 'NE';
