-- ============================================================
-- GuerillaGenics v2 — Migration 005
-- Core domain tables: sports, players, markets, odds_history,
-- needle_alerts, model_snapshots, player_futures, watchlist
-- ============================================================

-- ===== Reference tables =====

create table public.sports (
  id    smallint primary key,
  code  text unique not null,   -- 'NFL', 'NBA', 'MLB'
  name  text not null
);

insert into public.sports (id, code, name) values
  (1, 'NFL', 'National Football League'),
  (2, 'NBA', 'National Basketball Association'),
  (3, 'MLB', 'Major League Baseball');

create table public.players (
  id          bigint generated always as identity primary key,
  sport_id    smallint not null references public.sports(id),
  external_id text not null,                  -- ESPN player ID
  full_name   text not null,
  team        text,
  position    text,
  status      text not null default 'Active', -- Active, Injured, etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (sport_id, external_id)
);

create index players_sport_idx    on public.players (sport_id);
create index players_team_idx     on public.players (sport_id, team);
create index players_name_search  on public.players using gin (to_tsvector('english', full_name));

create trigger players_updated_at
  before update on public.players
  for each row execute procedure public.set_updated_at();

-- Markets: the "what can be bet on" catalog
create table public.markets (
  id           bigint generated always as identity primary key,
  sport_id     smallint not null references public.sports(id),
  market_type  text not null,   -- 'futures_champion', 'futures_mvp', 'season_wins'
  player_id    bigint references public.players(id),
  team         text,
  season       int not null,
  external_id  text not null unique,
  label        text not null,   -- human-readable: "Chiefs to win Super Bowl LX"
  status       text not null default 'open',  -- open, settled, suspended
  settled_at   timestamptz,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index markets_sport_season_idx on public.markets (sport_id, season);
create index markets_type_idx         on public.markets (market_type, sport_id);
create index markets_player_idx       on public.markets (player_id) where player_id is not null;
create index markets_status_idx       on public.markets (status) where status = 'open';

-- ===== Odds history — append-only time-series =====
-- Partitioned by month for retention management.
-- Primary key includes recorded_at for partition routing.

create table public.odds_history (
  id             bigint generated always as identity,
  market_id      bigint not null references public.markets(id) on delete cascade,
  book           text not null,          -- 'draftkings', 'fanduel', 'betmgm'
  selection      text not null,          -- team name, player name, Over/Under label
  american_price int not null,
  decimal_price  numeric(8, 4) generated always as (
                   case
                     when american_price > 0
                       then 1 + (american_price::numeric / 100)
                     else
                       1 + (100.0 / abs(american_price)::numeric)
                   end
                 ) stored,
  recorded_at    timestamptz not null default now(),
  primary key (recorded_at, market_id, id)
) partition by range (recorded_at);

-- Create partitions for current season + buffer
-- Add new partitions monthly via cron or pg_partman
create table public.odds_history_2026_04 partition of public.odds_history
  for values from ('2026-04-01') to ('2026-05-01');
create table public.odds_history_2026_05 partition of public.odds_history
  for values from ('2026-05-01') to ('2026-06-01');
create table public.odds_history_2026_06 partition of public.odds_history
  for values from ('2026-06-01') to ('2026-07-01');
create table public.odds_history_2026_07 partition of public.odds_history
  for values from ('2026-07-01') to ('2026-08-01');
create table public.odds_history_2026_08 partition of public.odds_history
  for values from ('2026-08-01') to ('2026-09-01');
create table public.odds_history_2026_09 partition of public.odds_history
  for values from ('2026-09-01') to ('2026-10-01');
create table public.odds_history_2026_10 partition of public.odds_history
  for values from ('2026-10-01') to ('2026-11-01');
create table public.odds_history_2026_11 partition of public.odds_history
  for values from ('2026-11-01') to ('2026-12-01');
create table public.odds_history_2026_12 partition of public.odds_history
  for values from ('2026-12-01') to ('2027-01-01');
create table public.odds_history_2027_01 partition of public.odds_history
  for values from ('2027-01-01') to ('2027-02-01');
create table public.odds_history_2027_02 partition of public.odds_history
  for values from ('2027-02-01') to ('2027-03-01');

-- "Latest N for a market" — primary access pattern
create index odds_history_market_recorded_idx
  on public.odds_history (market_id, recorded_at desc)
  include (book, american_price);

-- "Everything in a date range" — wide scans, BRIN ~1% size of B-tree
create index odds_history_recorded_brin
  on public.odds_history using brin (recorded_at)
  with (pages_per_range = 32);

-- Hot: latest 7-day partial index for live dashboards
create index odds_history_recent_idx
  on public.odds_history (market_id, book, recorded_at desc)
  where recorded_at > '2026-04-26 00:00:00+00';  -- update weekly via migration or cron

-- ===== NEEDLE alerts (edge alerts feed) =====

create table public.needle_alerts (
  id          bigint generated always as identity primary key,
  market_id   bigint not null references public.markets(id) on delete cascade,
  severity    public.needle_severity not null,
  title       text not null,
  body        text,
  edge_bps    int,                           -- basis points of edge detected
  fired_at    timestamptz not null default now(),
  expires_at  timestamptz,
  min_tier    public.subscription_tier not null default 'scout',
  payload     jsonb not null default '{}'::jsonb
);

-- Feed query: latest alerts paginated
create index needle_alerts_fired_idx
  on public.needle_alerts (fired_at desc);
create index needle_alerts_severity_fired_idx
  on public.needle_alerts (severity, fired_at desc);
create index needle_alerts_tier_fired_idx
  on public.needle_alerts (min_tier, fired_at desc);

-- Active-only partial index for the live alerts widget
create index needle_alerts_active_idx
  on public.needle_alerts (fired_at desc)
  where expires_at is null;

-- Supports expiry filtering in queries that evaluate against current time.
create index needle_alerts_expires_at_idx
  on public.needle_alerts (expires_at);

-- ===== Model snapshots (Futures model outputs) =====

create table public.model_snapshots (
  id             bigint generated always as identity primary key,
  market_id      bigint not null references public.markets(id) on delete cascade,
  model_version  text not null,
  fair_price     numeric(8, 4) not null,     -- model's fair implied probability
  edge_bps       int,                         -- (fair_price - market_price) in bps
  confidence     numeric(4, 3),               -- 0.000 to 1.000
  kelly_fraction numeric(6, 5),               -- recommended Kelly stake as decimal
  features       jsonb not null default '{}'::jsonb,  -- raw model inputs
  output         jsonb not null default '{}'::jsonb,  -- full model output
  min_tier       public.subscription_tier not null default 'operative',
  computed_at    timestamptz not null default now()
);

create index model_snapshots_market_computed_idx
  on public.model_snapshots (market_id, computed_at desc);
create index model_snapshots_version_idx
  on public.model_snapshots (model_version, computed_at desc);
create index model_snapshots_edge_idx
  on public.model_snapshots (edge_bps desc nulls last)
  where edge_bps is not null;
create index model_snapshots_features_gin
  on public.model_snapshots using gin (features jsonb_path_ops);

-- ===== Player futures (denormalized leaderboard / edge board) =====

create table public.player_futures (
  market_id       bigint not null references public.markets(id) on delete cascade,
  player_id       bigint not null references public.players(id) on delete cascade,
  consensus_price int,                        -- average across books (American)
  best_book       text,
  best_price      int,
  fair_price      numeric(8, 4),
  edge_bps        int,
  elo_rating      numeric(8, 2),              -- from GG-ELO engine
  updated_at      timestamptz not null default now(),
  primary key (market_id, player_id)
);

create index player_futures_edge_idx
  on public.player_futures (edge_bps desc nulls last);
create index player_futures_player_idx
  on public.player_futures (player_id);
create index player_futures_elo_idx
  on public.player_futures (elo_rating desc nulls last);

create trigger player_futures_updated_at
  before update on public.player_futures
  for each row execute procedure public.set_updated_at();

-- ===== Watchlist (per-user saved markets) =====

create table public.watchlist (
  user_id    uuid not null references auth.users(id) on delete cascade,
  market_id  bigint not null references public.markets(id) on delete cascade,
  note       text,
  added_at   timestamptz not null default now(),
  primary key (user_id, market_id)
);

create index watchlist_market_idx on public.watchlist (market_id);
create index watchlist_user_idx   on public.watchlist (user_id, added_at desc);
