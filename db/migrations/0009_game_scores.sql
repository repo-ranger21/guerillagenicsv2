-- ============================================================
-- GuerillaGenics v2 — Neon migration 0009
-- Final scores on games, so `gg grade` can settle picks.
--
-- Scores are written only by gg.pipeline.grade (from The Odds API scores
-- endpoint). Both columns are set together or not at all. Idempotent.
-- ============================================================

alter table public.games
  add column if not exists home_score   int,
  add column if not exists away_score   int,
  add column if not exists completed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'games_scores_together') then
    alter table public.games
      add constraint games_scores_together
      check ((home_score is null) = (away_score is null)
             and (home_score is null or (home_score >= 0 and away_score >= 0)));
  end if;
end $$;

comment on column public.games.home_score is 'Final home score; null until the game is completed.';
comment on column public.games.completed_at is 'When gg grade recorded the final score.';
