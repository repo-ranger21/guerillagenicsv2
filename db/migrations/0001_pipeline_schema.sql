-- ============================================================
-- GuerillaGenics v2 — Neon migration 0001
-- Pipeline-only schema subset, ported from supabase/migrations/:
--   20260503000500_domain_tables.sql               -> sports
--   20260812175848_audit_spine.sql                 -> ingest_runs, model_runs
--   20260812180330_dimensions_teams_games_external_ids.sql -> teams, games, external_ids
--   20260812183314_feature_store.sql               -> nfl_team_features only
--   20260504000100_picks_tables.sql                -> picks_daily only,
--                                                       plus game_id/model_run_id
--                                                       added here (not present
--                                                       on the Supabase original)
--
-- Deliberately NOT ported: profiles, subscriptions, players, markets,
-- odds_history*, needle_alerts, model_snapshots, player_futures,
-- watchlist (all auth.users-linked or product-surface, unrelated to
-- this pipeline), picks_editorial (must not exist here — see
-- guerillagenics skill invariant #3), nfl_player_features /
-- mlb_pitcher_features / nba_player_features (out of active NFL
-- team-level scope).
--
-- RLS/policies intentionally omitted: no anon/authenticated Postgres
-- roles exist on Neon (those are Supabase Auth constructs), and the
-- sole writer is the pipeline's own DATABASE_URL role.
--
-- game_id / model_run_id added to picks_daily beyond the Supabase
-- schema: closes the CLV-join gap and the model_runs audit trace
-- flagged during Step 1 recon, added now while the table is empty
-- and the cost of doing so is zero.
-- ============================================================

create schema if not exists private;

create type public.subscription_tier as enum ('scout', 'operative', 'command');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'append-only table: % is not permitted on %.% — insert a new row with a new as_of instead',
    TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME;
end;
$$;

-- ===== sports =====
create table public.sports (
  id    smallint primary key,
  code  text unique not null,
  name  text not null
);

insert into public.sports (id, code, name) values
  (1, 'NFL', 'National Football League'),
  (2, 'NBA', 'National Basketball Association'),
  (3, 'MLB', 'Major League Baseball');

-- ===== teams =====
create table public.teams (
  id            bigint generated always as identity primary key,
  sport_id      smallint not null references public.sports(id),
  abbreviation  text not null,
  full_name     text not null,
  city          text,
  division      text,
  conference    text,
  external_id   text,
  venue_name    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (sport_id, abbreviation)
);

create index teams_sport_idx on public.teams (sport_id);

create trigger teams_updated_at
  before update on public.teams
  for each row execute procedure public.set_updated_at();

-- ===== games =====
create table public.games (
  id            bigint generated always as identity primary key,
  sport_id      smallint not null references public.sports(id),
  season        int not null,
  week          int,
  home_team_id  bigint not null references public.teams(id),
  away_team_id  bigint not null references public.teams(id),
  game_time     timestamptz,
  status        text not null default 'scheduled',
  external_id   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index games_external_id_uidx
  on public.games (external_id) where external_id is not null;

create index games_sport_season_idx on public.games (sport_id, season);
create index games_game_time_idx    on public.games (game_time);
create index games_home_team_idx    on public.games (home_team_id);
create index games_away_team_idx    on public.games (away_team_id);

create trigger games_updated_at
  before update on public.games
  for each row execute procedure public.set_updated_at();

-- ===== external_ids =====
create table public.external_ids (
  id           bigint generated always as identity primary key,
  entity_type  text not null,
  entity_id    bigint not null,
  source       text not null,
  source_id    text not null,
  created_at   timestamptz not null default now(),
  unique (entity_type, entity_id, source),
  unique (source, source_id, entity_type)
);

create index external_ids_lookup_idx on public.external_ids (source, source_id);

-- ===== ingest_runs =====
create table public.ingest_runs (
  id              bigint generated always as identity primary key,
  source          text not null,
  endpoint        text,
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

-- ===== model_runs =====
create table public.model_runs (
  id               bigint generated always as identity primary key,
  model_version    text not null,
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

-- ===== nfl_team_features =====
create table public.nfl_team_features (
  id                  bigint generated always as identity primary key,
  team_id             bigint not null references public.teams(id),
  as_of               timestamptz not null,
  season              int not null,
  through_week        int,
  epa_play_off        numeric,
  epa_play_def        numeric,
  success_rate_off    numeric,
  success_rate_def    numeric,
  pace_secs_play      numeric,
  elo                 numeric,
  ats_cover_rate_l17  numeric,
  rest_days           int,
  raw                 jsonb not null default '{}'::jsonb,
  ingest_run_id       bigint references public.ingest_runs(id),
  created_at          timestamptz not null default now(),
  unique (team_id, as_of)
);

create index nfl_team_features_team_as_of_idx
  on public.nfl_team_features (team_id, as_of desc);

create trigger nfl_team_features_append_only
  before update or delete on public.nfl_team_features
  for each row execute procedure private.reject_mutation();

-- ===== picks_daily =====
create table public.picks_daily (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null,
  game_date        date not null,
  sport            text not null,
  game_id          bigint not null references public.games(id),
  model_run_id     bigint not null references public.model_runs(id),
  file             text,
  pick             text not null,
  game             text not null,
  game_time        text,
  odds             int not null,
  line_signal      jsonb not null default '{}'::jsonb,
  components       jsonb not null default '{}'::jsonb,
  formulas         jsonb not null default '[]'::jsonb,
  audit            jsonb not null default '{}'::jsonb,
  model_prob       numeric(6,4),
  evi              numeric(7,4),
  kelly_full       numeric(6,4),
  kelly_fractional numeric(6,4),
  min_tier         public.subscription_tier not null default 'scout',
  created_at       timestamptz not null default now()
);

create unique index picks_daily_slug_date_uidx
  on public.picks_daily (slug, game_date);
create index picks_daily_game_date_idx
  on public.picks_daily (game_date);
create index picks_daily_game_id_idx
  on public.picks_daily (game_id);
