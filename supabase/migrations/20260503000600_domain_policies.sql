-- ============================================================
-- GuerillaGenics v2 — Migration 006
-- Tier-gated RLS policies for all domain tables
--
-- Key pattern on EVERY policy:
--   (select auth.uid())              — wraps uid() for initPlan caching
--   (select public.has_tier(...))    — wraps SECURITY DEFINER for initPlan caching
-- Without the (select ...) wrapper, the function runs ONCE PER ROW.
-- With it, it runs once per query. >100x perf difference on large tables.
-- ============================================================

-- Enable RLS on every domain table
alter table public.sports          enable row level security;
alter table public.players         enable row level security;
alter table public.markets         enable row level security;
alter table public.odds_history    enable row level security;
alter table public.needle_alerts   enable row level security;
alter table public.model_snapshots enable row level security;
alter table public.player_futures  enable row level security;
alter table public.watchlist       enable row level security;

-- ===== Reference data: any authenticated user can read =====

create policy "sports_read_authenticated"
  on public.sports for select
  to authenticated
  using (true);

create policy "players_read_authenticated"
  on public.players for select
  to authenticated
  using (true);

create policy "markets_read_authenticated"
  on public.markets for select
  to authenticated
  using (true);

-- ===== Odds history: tier-gated =====
-- Scout: delayed 24h feed
-- Operative+: live feed
-- Two PERMISSIVE policies — Postgres OR's them

create policy "odds_history_live_operative_plus"
  on public.odds_history for select
  to authenticated
  using ((select public.has_tier('operative')));

create policy "odds_history_delayed_scout"
  on public.odds_history for select
  to authenticated
  using (recorded_at < (now() - interval '24 hours'));

-- ===== NEEDLE alerts: per-row min_tier gate =====
-- Each alert row carries its own min_tier.
-- A Scout user sees min_tier='scout' alerts.
-- An Operative user sees scout + operative alerts.
-- A Command user sees everything.

create policy "needle_alerts_by_tier"
  on public.needle_alerts for select
  to authenticated
  using (
    private.tier_rank(public.get_user_tier((select auth.uid())))
    >= private.tier_rank(min_tier)
  );

-- ===== Model snapshots: per-row min_tier gate =====

create policy "model_snapshots_by_tier"
  on public.model_snapshots for select
  to authenticated
  using (
    private.tier_rank(public.get_user_tier((select auth.uid())))
    >= private.tier_rank(min_tier)
  );

-- ===== Player futures: Operative+ only =====
-- The edge leaderboard is a paid feature; Scouts see the alert feed only.

create policy "player_futures_operative_plus"
  on public.player_futures for select
  to authenticated
  using ((select public.has_tier('operative')));

-- ===== Watchlist: own rows + tier-based size cap =====

-- SELECT
create policy "watchlist_select_own"
  on public.watchlist for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- DELETE
create policy "watchlist_delete_own"
  on public.watchlist for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- UPDATE
create policy "watchlist_update_own"
  on public.watchlist for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- INSERT: ownership check
create policy "watchlist_insert_own"
  on public.watchlist for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- INSERT: tier-based size cap — RESTRICTIVE (fails if this OR the above fails)
-- Scout: 10 markets | Operative: 100 markets | Command: unlimited
create policy "watchlist_tier_cap"
  on public.watchlist
  as restrictive
  for insert
  to authenticated
  with check (
    case public.get_user_tier((select auth.uid()))
      when 'scout'     then
        (select count(*) from public.watchlist where user_id = (select auth.uid())) < 10
      when 'operative' then
        (select count(*) from public.watchlist where user_id = (select auth.uid())) < 100
      when 'command'   then true
    end
  );

-- ===== service_role mutations (no policy needed — service_role bypasses RLS) =====
-- The Stripe webhook Edge Function uses service_role to:
--   INSERT/UPDATE public.subscriptions
--   INSERT public.needle_alerts
--   INSERT public.model_snapshots
--   INSERT public.odds_history
--   INSERT/UPDATE public.player_futures
--   INSERT/UPDATE public.players
--   INSERT/UPDATE public.markets
-- None of these need explicit policies — service_role always has full access.
