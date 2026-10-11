-- ============================================================
-- GuerillaGenics v2 — Migration 012
-- Step 5 — dimensions: teams, players.team_id, games, external_ids
-- ============================================================

-- ===== teams =====
create table public.teams (
  id            bigint generated always as identity primary key,
  sport_id      smallint not null references public.sports(id),
  abbreviation  text not null,          -- 'KC', 'BOS', 'LAL'
  full_name     text not null,
  city          text,
  division      text,
  conference    text,
  external_id   text,                   -- ESPN team ID
  venue_name    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (sport_id, abbreviation)
);

create index teams_sport_idx on public.teams (sport_id);

create trigger teams_updated_at
  before update on public.teams
  for each row execute procedure public.set_updated_at();

alter table public.teams enable row level security;

create policy "teams_read_anon" on public.teams
  for select to anon using (true);
create policy "teams_read_authenticated" on public.teams
  for select to authenticated using (true);

-- ===== players: add team_id, keep everything else =====
alter table public.players
  add column team_id bigint references public.teams(id);

create index players_team_id_idx on public.players (team_id) where team_id is not null;

comment on column public.players.team_id is
  'FK to teams. Nullable — backfill from the existing free-text team column is a later task, not done here.';

-- ===== games =====
create table public.games (
  id            bigint generated always as identity primary key,
  sport_id      smallint not null references public.sports(id),
  season        int not null,
  week          int,                    -- NFL week number; drives the cold-start Weeks 1–3 flag
  home_team_id  bigint not null references public.teams(id),
  away_team_id  bigint not null references public.teams(id),
  game_time     timestamptz,
  status        text not null default 'scheduled',  -- scheduled | live | final | postponed
  external_id   text,                   -- The Odds API event ID; null for nflfastR historicals
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

alter table public.games enable row level security;

-- Anon read: every pick card renders a matchup, and September launch is a
-- public link with no auth. Not monetized — teams/sports is the precedent.
create policy "games_read_anon" on public.games
  for select to anon using (true);
create policy "games_read_authenticated" on public.games
  for select to authenticated using (true);

-- ===== external_ids: crosswalk, going forward =====
create table public.external_ids (
  id           bigint generated always as identity primary key,
  entity_type  text not null,           -- 'player', 'team', 'game', 'market'
  entity_id    bigint not null,         -- polymorphic — no FK, entity_type varies
  source       text not null,           -- 'espn', 'nflfastr', 'the_odds_api'
  source_id    text not null,
  created_at   timestamptz not null default now(),
  unique (entity_type, entity_id, source),
  unique (source, source_id, entity_type)
);

create index external_ids_lookup_idx on public.external_ids (source, source_id);

comment on table public.external_ids is
  'Crosswalk for secondary external identifiers beyond each table''s own external_id column. entity_id is intentionally not a foreign key — entity_type varies, so referential integrity is not enforced here; the application is responsible for keeping entries valid. The two unique constraints together make entity_id <-> source_id a bijection per (entity_type, source): one entity cannot hold two source_ids from the same source, and one source_id cannot map to two entities.';

alter table public.external_ids enable row level security;
-- Service_role only — internal crosswalk, not user-facing.

-- ===== odds_history boundary comment (carried over, applies now) =====
comment on table public.odds_history is
  'Futures and props odds — keyed on market_id. NOT for NFL game lines: those live in odds_snapshots (Step 7), keyed on game_id, the sole source for closing line and CLV. Do not add game_id here.';
