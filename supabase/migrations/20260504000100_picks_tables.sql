-- ─────────────────────────────────────────────────────────────────────────────
-- picks_daily + picks_editorial
-- ─────────────────────────────────────────────────────────────────────────────
-- Two-bin model:
--   picks_daily     = wire bin. Auto-enriched picks + STORED model outputs.
--                     Written ONLY by the pipeline (service_role).
--   picks_editorial = editor's desk. Hand-authored headline/analysis/SGP.
--                     Backend-only; the frontend never reads it directly.
--                     The pipeline has NO code path that writes here.
--
-- Merge happens server-side in GET /api/v1/picks/today, editorial winning
-- field-by-field, with `analysis` protected from auto-fill. See
-- backend/utils/picks_merge.py and its never-overwrite test.
--
-- Tier guard: uses public.has_tier() from migration 003 — the single
-- chokepoint for all tier logic. Pattern matches migration 006.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── picks_daily : wire bin (auto only) ─────────────────────────────────────
create table if not exists public.picks_daily (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null,
  game_date        date not null,
  sport            text not null,
  file             text,
  pick             text not null,
  game             text not null,
  game_time        text,
  odds             int not null,
  line_signal      jsonb not null default '{}'::jsonb,
  components       jsonb not null default '{}'::jsonb,
  formulas         jsonb not null default '[]'::jsonb,
  audit            jsonb not null default '{}'::jsonb,

  -- STORED model outputs — audit-of-record at publish/Betstamp-log time.
  -- Frontend FE engine may recompute for live bankroll-slider what-ifs,
  -- but these are the published truth.
  model_prob       numeric(6,4),
  evi              numeric(7,4),
  kelly_full       numeric(6,4),
  kelly_fractional numeric(6,4),

  min_tier         public.subscription_tier not null default 'scout',
  created_at       timestamptz not null default now()
);

create unique index if not exists picks_daily_slug_date_uidx
  on public.picks_daily (slug, game_date);

create index if not exists picks_daily_game_date_idx
  on public.picks_daily (game_date);

-- ─── picks_editorial : editor's desk (hand-authored only) ───────────────────
create table if not exists public.picks_editorial (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  game_date    date not null,
  headline     jsonb,
  subline      text,
  tag          text,
  analysis     jsonb,   -- PROTECTED — never overwritten by auto-fill
  sgp_legs     jsonb,
  active_legs  jsonb,
  author       text,
  updated_at   timestamptz not null default now()
);

create unique index if not exists picks_editorial_slug_date_uidx
  on public.picks_editorial (slug, game_date);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.picks_daily     enable row level security;
alter table public.picks_editorial enable row level security;

-- picks_editorial: no policies for public roles — service_role only.
-- The pipeline (service_role) bypasses RLS for reads during merge.
-- There is no write path from any auto code to this table.

-- picks_daily: tier-gated read, using the (select public.has_tier(...))
-- initPlan pattern established in migration 006 for > 100x query perf.
drop policy if exists picks_daily_tier_read on public.picks_daily;
create policy picks_daily_tier_read on public.picks_daily
  for select to authenticated
  using ((select public.has_tier(min_tier)));

-- No insert/update/delete policies for authenticated role.
-- Pipeline writes exclusively via service_role.

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- picks_daily is NOT added to supabase_realtime publication.
-- Picks refresh on pipeline cron cadence via /picks/today polling.
-- Realtime stays reserved for needle_alerts (live ticker).
