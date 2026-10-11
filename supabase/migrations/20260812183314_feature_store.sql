-- ============================================================
-- GuerillaGenics v2 — Migration 013
-- Step 6 — feature store: nfl_team_features, nfl_player_features,
-- mlb_pitcher_features, nba_player_features.
-- Append-only: insert new rows with a new as_of, never UPDATE/DELETE.
-- Service_role only — pipeline internals, the frontend never reads these.
-- ============================================================

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

revoke update, delete on public.nfl_team_features from anon, authenticated;
alter table public.nfl_team_features enable row level security;

create trigger nfl_team_features_append_only
  before update or delete on public.nfl_team_features
  for each row execute procedure private.reject_mutation();

comment on table public.nfl_team_features is
  'Team-level model inputs, computed in-house from nflfastR play-by-play. Append-only: a new observation is a new row with a new as_of, never an UPDATE. This is what makes "what did the model know at 11:42am Sunday" answerable.';

comment on column public.nfl_team_features.as_of is
  'Timestamp this feature snapshot was computed. Never overwritten — the append-only key alongside team_id.';
comment on column public.nfl_team_features.epa_play_off is
  'Offensive EPA per play. Source: nflfastR, computed in-house from play-by-play. Season-to-date through through_week. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.epa_play_def is
  'Defensive EPA per play allowed. Source: nflfastR, computed in-house from play-by-play. Season-to-date through through_week. Lower is better. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.success_rate_off is
  'Offensive success rate — share of plays with positive EPA. Source: nflfastR, computed in-house from play-by-play. Season-to-date through through_week. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.success_rate_def is
  'Defensive success rate allowed. Source: nflfastR, computed in-house from play-by-play. Season-to-date through through_week. Lower is better. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.pace_secs_play is
  'Seconds of game clock per offensive play in neutral game script. Source: nflfastR, computed in-house from play-by-play. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.elo is
  'GG-ELO team rating. Source: computed in-house by the GG-ELO engine from game results — not a third-party rating. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.ats_cover_rate_l17 is
  'Against-the-spread cover rate, trailing 17 games. Source: computed in-house from odds_history closing lines and game results. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.rest_days is
  'Days of rest since this team''s previous game. Source: computed in-house from the games table. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_team_features.raw is
  'Escape hatch for unmodeled nflfastR fields. An unmodeled field must never block an ingest — typed columns are what the model reads, this is everything else.';

-- ===== nfl_player_features =====
create table public.nfl_player_features (
  id               bigint generated always as identity primary key,
  player_id        bigint not null references public.players(id),
  as_of            timestamptz not null,
  season           int not null,
  through_week     int,
  snap_share       numeric,
  target_share     numeric,
  air_yards_share  numeric,
  wopr             numeric,
  raw              jsonb not null default '{}'::jsonb,
  ingest_run_id    bigint references public.ingest_runs(id),
  created_at       timestamptz not null default now(),
  unique (player_id, as_of)
);

create index nfl_player_features_player_as_of_idx
  on public.nfl_player_features (player_id, as_of desc);

revoke update, delete on public.nfl_player_features from anon, authenticated;
alter table public.nfl_player_features enable row level security;

create trigger nfl_player_features_append_only
  before update or delete on public.nfl_player_features
  for each row execute procedure private.reject_mutation();

comment on table public.nfl_player_features is
  'Player-level model inputs, computed in-house from nflfastR play-by-play. Append-only: a new observation is a new row with a new as_of, never an UPDATE.';

comment on column public.nfl_player_features.as_of is
  'Timestamp this feature snapshot was computed. Never overwritten — the append-only key alongside player_id.';
comment on column public.nfl_player_features.snap_share is
  'Share of team offensive snaps played. Source: nflfastR, computed in-house from play-by-play participation data. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_player_features.target_share is
  'Share of team passing targets. Source: nflfastR, computed in-house from play-by-play. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_player_features.air_yards_share is
  'Share of team total air yards. Source: nflfastR, computed in-house from play-by-play. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_player_features.wopr is
  'Weighted Opportunity Rating (1.5 x target_share + 0.7 x air_yards_share) — the standard usage composite. Source: computed in-house from nflfastR play-by-play. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nfl_player_features.raw is
  'Escape hatch for unmodeled nflfastR fields. An unmodeled field must never block an ingest.';

-- ===== mlb_pitcher_features (defined now, populated later) =====
create table public.mlb_pitcher_features (
  id             bigint generated always as identity primary key,
  player_id      bigint not null references public.players(id),
  as_of          timestamptz not null,
  season         int not null,
  fip            numeric,
  xfip           numeric,
  k_per_9        numeric,
  bb_per_9       numeric,
  raw            jsonb not null default '{}'::jsonb,
  ingest_run_id  bigint references public.ingest_runs(id),
  created_at     timestamptz not null default now(),
  unique (player_id, as_of)
);

create index mlb_pitcher_features_player_as_of_idx
  on public.mlb_pitcher_features (player_id, as_of desc);

revoke update, delete on public.mlb_pitcher_features from anon, authenticated;
alter table public.mlb_pitcher_features enable row level security;

create trigger mlb_pitcher_features_append_only
  before update or delete on public.mlb_pitcher_features
  for each row execute procedure private.reject_mutation();

comment on table public.mlb_pitcher_features is
  'Pitcher-level model inputs, computed in-house. Defined now, empty until the MLB pipeline lands — locking the shape now avoids a migration under deadline pressure. Append-only, same as the NFL tables. No through_week column: MLB has no natural week unit; a period marker lands in its own shape when the MLB pipeline is built, not pre-guessed here.';

comment on column public.mlb_pitcher_features.fip is
  'Fielding Independent Pitching. Source: computed in-house from box score/play-by-play data, not a third-party rating. Lower is better. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.mlb_pitcher_features.xfip is
  'Expected FIP — normalizes home-run rate to league average. Source: computed in-house. Lower is better. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.mlb_pitcher_features.k_per_9 is
  'Strikeouts per 9 innings. Source: computed in-house from box score data. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.mlb_pitcher_features.bb_per_9 is
  'Walks per 9 innings. Source: computed in-house from box score data. Lower is better. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.mlb_pitcher_features.raw is
  'Escape hatch for unmodeled fields once the MLB pipeline is built.';

-- ===== nba_player_features (defined now, populated later) =====
create table public.nba_player_features (
  id             bigint generated always as identity primary key,
  player_id      bigint not null references public.players(id),
  as_of          timestamptz not null,
  season         int not null,
  ts_pct         numeric,
  bpm            numeric,
  usage_rate     numeric,
  minutes_l10    numeric,
  raw            jsonb not null default '{}'::jsonb,
  ingest_run_id  bigint references public.ingest_runs(id),
  created_at     timestamptz not null default now(),
  unique (player_id, as_of)
);

create index nba_player_features_player_as_of_idx
  on public.nba_player_features (player_id, as_of desc);

revoke update, delete on public.nba_player_features from anon, authenticated;
alter table public.nba_player_features enable row level security;

create trigger nba_player_features_append_only
  before update or delete on public.nba_player_features
  for each row execute procedure private.reject_mutation();

comment on table public.nba_player_features is
  'Player-level model inputs, computed in-house. Defined now, empty until the NBA pipeline lands. Append-only, same as the NFL tables. No through_week column: NBA has no natural week unit; a period marker lands in its own shape when the NBA pipeline is built, not pre-guessed here.';

comment on column public.nba_player_features.ts_pct is
  'True shooting percentage — points per shooting possession, accounts for 3-pointers and free throws. Source: computed in-house from box score data. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nba_player_features.bpm is
  'Box Plus-Minus, in-house implementation. Source: computed in-house from box score data, not a third-party rating. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nba_player_features.usage_rate is
  'Share of team possessions used by the player while on court. Source: computed in-house from box score data. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nba_player_features.minutes_l10 is
  'Average minutes played, trailing 10 games. Source: computed in-house from box score data. Action threshold: not yet calibrated — see model_runs for the version that sets it.';
comment on column public.nba_player_features.raw is
  'Escape hatch for unmodeled fields once the NBA pipeline is built.';
