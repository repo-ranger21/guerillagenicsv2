-- ============================================================
-- GuerillaGenics v2 — Neon migration 0008
-- Results ledger + public read-only feed for the landing page.
--
--   pick_results      one graded outcome per published pick
--   public_pick_feed  view: ONLY picks whose game has started
--                     (no live/paid pick can leak through the site)
--   public_ledger     view: published picks joined to their result
--
-- The site connects as role gg_site_reader, which is granted SELECT on the
-- two views only (no base-table access). Create the role in the Neon
-- console first (Roles -> New role -> gg_site_reader), then run this file;
-- the GRANT block below is a no-op until the role exists, so re-run it
-- after creating the role. Idempotent.
--
-- Tracking policy: results are recorded from NFL Week 6 of the 2026 season.
-- Weeks 1-5 were a testing phase and are intentionally NOT in pick_results.
-- ============================================================

create table if not exists public.pick_results (
  id             bigint generated always as identity primary key,
  pick_id        uuid not null unique references public.picks_daily(id) on delete restrict,
  outcome        text not null check (outcome in ('win', 'loss', 'push', 'void')),
  units          numeric(8,3) not null,            -- profit/loss in units at published odds
  closing_odds   integer,                          -- price at kickoff, for CLV disclosure
  closing_line   numeric(5,1),
  final_score    text,
  post_mortem    text,                             -- required for losses (EAA: show the miss)
  source_url     text,                             -- link to the timestamped public post
  graded_at      timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint loss_requires_post_mortem
    check (outcome <> 'loss' or (post_mortem is not null and length(btrim(post_mortem)) > 0))
);

comment on table public.pick_results is
  'Graded outcomes. One row per published pick. Losses require a post-mortem.';

-- Picks whose game has already kicked off. Gate lives in the view, not the app.
create or replace view public.public_pick_feed as
select
  p.id,
  p.slug,
  p.game_date,
  p.sport,
  p.game,
  p.pick,
  p.odds,
  p.model_prob,
  p.evi,
  p.kelly_full,
  p.kelly_fractional,
  p.driver_text,
  p.flags,
  p.audit,
  p.logged_at,
  g.game_time
from public.picks_daily p
join public.games g on g.id = p.game_id
where p.status = 'published'
  and g.game_time is not null
  and g.game_time <= now();

create or replace view public.public_ledger as
select
  f.id,
  f.game_date,
  f.game,
  f.pick,
  f.odds,
  f.evi,
  f.kelly_fractional,
  r.outcome,
  r.units,
  r.closing_odds,
  r.closing_line,
  r.final_score,
  r.post_mortem,
  r.source_url,
  r.graded_at
from public.public_pick_feed f
join public.pick_results r on r.pick_id = f.id;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'gg_site_reader') then
    revoke all on all tables in schema public from gg_site_reader;
    grant usage on schema public to gg_site_reader;
    grant select on public.public_pick_feed, public.public_ledger to gg_site_reader;
  else
    raise notice 'role gg_site_reader not found - create it in the Neon console, then re-run this file';
  end if;
end $$;
