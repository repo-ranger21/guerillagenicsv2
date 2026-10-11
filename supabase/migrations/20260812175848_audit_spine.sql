-- ============================================================
-- GuerillaGenics v2 — Migration 011
-- Audit spine: ingest_runs + model_runs.
-- Operational telemetry, service_role only — no anon/authenticated
-- policies, same pattern as picks_editorial.
-- ============================================================

create table public.ingest_runs (
  id              bigint generated always as identity primary key,
  source          text not null,           -- 'the_odds_api', 'nflfastr'
  endpoint        text,                    -- 'nfl/odds', 'nfl/events'
  sport           text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running',
  rows_written    integer,
  quota_remaining integer,
  error_text      text,
  created_at      timestamptz not null default now()
);

create index ingest_runs_source_started_idx
  on public.ingest_runs (source, started_at desc);

create index ingest_runs_running_idx
  on public.ingest_runs (started_at)
  where status = 'running';

alter table public.ingest_runs enable row level security;

comment on table public.ingest_runs is
  'Proves the pipeline actually ran and wrote rows. Catches silent failure: a workflow reporting success while writing nothing. A row stuck in status=''running'' means the job died mid-flight — that is a signal, not a bug; no cleanup job removes it.';

comment on column public.ingest_runs.status is
  'running | ok | error. No other values. A row that never leaves running is itself the alert.';

comment on column public.ingest_runs.quota_remaining is
  'x-requests-remaining from The Odds API. Free tier is 500 credits/month with no daily top-up — quota exhaustion must be visible here, not discovered when Sunday''s pull returns nothing.';

-- ============================================================

create table public.model_runs (
  id               bigint generated always as identity primary key,
  model_version    text not null,          -- semantic, e.g. 'nfl-spread-0.1.0'
  git_sha          text,
  sport            text not null,
  run_at           timestamptz not null default now(),
  inputs_hash      text,
  games_evaluated  integer,
  picks_published  integer,
  picks_skipped    integer,
  notes            text,
  created_at       timestamptz not null default now()
);

create index model_runs_sport_run_at_idx
  on public.model_runs (sport, run_at desc);

alter table public.model_runs enable row level security;

comment on table public.model_runs is
  'Audit anchor for the EAA claim: every published pick traces to the exact code that produced it. games_evaluated / picks_published / picks_skipped record the full slate outcome — "16 evaluated, 3 published, 13 passed" — as a product differentiator at slate level, not just per pick. picks_daily.model_run_id FK lands in Step 8, not here.';

comment on column public.model_runs.inputs_hash is
  'Hash of the feature snapshot the run consumed. Traces a disputed pick to its exact inputs independent of git_sha — code and data can each change on their own.';
