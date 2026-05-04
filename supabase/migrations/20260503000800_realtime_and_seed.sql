-- ============================================================
-- GuerillaGenics v2 — Migration 008
-- Realtime publication config + seed data
-- ============================================================

-- ===== Realtime =====
-- Enable Realtime on the alert feed and watchlist.
-- Realtime respects RLS — users only receive rows they can SELECT.

-- needle_alerts: real-time push to the live alerts widget
alter publication supabase_realtime add table public.needle_alerts;

-- watchlist: sync across tabs/devices
alter publication supabase_realtime add table public.watchlist;

-- player_futures: live edge board updates
alter publication supabase_realtime add table public.player_futures;

-- ===== Seed: sport reference data (already inserted in migration 005) =====
-- Verify insert (idempotent — sports already populated)
insert into public.sports (id, code, name)
values
  (1, 'NFL', 'National Football League'),
  (2, 'NBA', 'National Basketball Association'),
  (3, 'MLB', 'Major League Baseball')
on conflict (id) do nothing;

-- ===== Function: partition maintenance helper =====
-- Run this from a Supabase cron (pg_cron) to create next month's partition.
-- Schedule: 1st of each month at 00:05 UTC

create or replace function private.create_next_odds_partition()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_month     date := date_trunc('month', now()) + interval '1 month';
  partition_name text := 'odds_history_' || to_char(next_month, 'YYYY_MM');
  range_start    text := to_char(next_month, 'YYYY-MM-01');
  range_end      text := to_char(next_month + interval '1 month', 'YYYY-MM-01');
begin
  execute format(
    'create table if not exists public.%I partition of public.odds_history
     for values from (%L) to (%L)',
    partition_name, range_start, range_end
  );
end;
$$;

grant execute on function private.create_next_odds_partition() to service_role;

-- ===== pg_cron: auto-create partitions (requires pg_cron extension) =====
-- Uncomment once pg_cron is enabled in your Supabase project:
-- select cron.schedule(
--   'create-odds-partition-monthly',
--   '5 0 1 * *',
--   $$ select private.create_next_odds_partition(); $$
-- );

-- ===== Useful index for the backend ingest pipeline =====
-- Used by backend/ingest/nfl_pipeline.py, nba_pipeline.py, mlb_pipeline.py
-- to do fast upserts by (sport_id, external_id)
-- Already defined in migration 005 — this comment is for documentation.

-- ===== Grant anon access to sports reference data for unauthenticated landing page =====
create policy "sports_read_anon"
  on public.sports for select
  to anon
  using (true);

create policy "players_read_anon"
  on public.players for select
  to anon
  using (true);
