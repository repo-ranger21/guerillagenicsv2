-- ============================================================
-- GuerillaGenics v2 — Neon migration 0007
-- odds_snapshots: append-only market lines, keyed by game_id.
--
-- Scope note (per the project's earlier documented boundary): this
-- table is for NFL GAME lines only (spreads/totals/h2h on a game_id),
-- fed by The Odds API's /sports/{sport}/odds endpoint. It is
-- deliberately NOT the same thing as the old Supabase odds_history
-- table (market_id-keyed, built for futures/props) -- that boundary
-- was decided during the original Supabase build and carries forward
-- here: never mix game-line and futures/prop odds in one table keyed
-- one way.
--
-- Append-only for the same reason as nfl_team_features: line movement
-- and closing-line value only exist because history is never
-- overwritten. Every pull is a new row, even if the number didn't
-- change since the last pull.
-- ============================================================

create table public.odds_snapshots (
  id            bigint generated always as identity primary key,
  game_id       bigint not null references public.games(id),
  market        text not null,            -- 'spreads' | 'totals' | 'h2h'
  side          text not null,            -- team full_name ('Green Bay Packers'), or 'Over'/'Under'
  line          numeric,                  -- point (spread/total); null for h2h
  price         int not null,             -- american odds
  book          text not null,            -- bookmaker key, e.g. 'draftkings'
  captured_at   timestamptz not null default now(),
  is_closing    boolean not null default false,
  ingest_run_id bigint references public.ingest_runs(id),
  created_at    timestamptz not null default now(),
  unique (game_id, market, side, book, captured_at)
);

create index odds_snapshots_game_market_idx
  on public.odds_snapshots (game_id, market, captured_at desc);

create trigger odds_snapshots_append_only
  before update or delete on public.odds_snapshots
  for each row execute procedure private.reject_mutation();
