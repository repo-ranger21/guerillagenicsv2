-- ============================================================
-- GuerillaGenics v2 — Neon migration 0006
-- picks_daily columns needed by snapshot.py to build a real frozen
-- snapshot, per Step 6 (driver_text) and the project skill doc
-- (flags, invariant #7's status/skip_reason, invariant #4's logged_at
-- vs created_at distinction). All absent from the original schema —
-- flagged during Step 1 recon, deferred until snapshot.py actually
-- needed them. Table is still empty; additive, zero cost.
-- ============================================================

alter table public.picks_daily
  add column logged_at   timestamptz not null default now(),
  add column driver_text text not null default '',
  add column flags       text[] not null default '{}',
  add column status      text not null default 'published',
  add column skip_reason text;

comment on column public.picks_daily.logged_at is
  'Pick lock time — when this evaluation ran and captured the market, set explicitly by snapshot.py. NOT the row insert time (created_at); a re-run that legitimately updates a row updates this too, but display code must read this, never now().';
comment on column public.picks_daily.driver_text is
  'Templated one-sentence explanation from the top contributing feature. Never LLM-generated — see run.py / snapshot.py for the exact template.';
comment on column public.picks_daily.flags is
  'Short flag codes for the pick card''s flags zone, e.g. COLD_START_LOW_CONFIDENCE. Empty array, not null, when there are none.';
comment on column public.picks_daily.status is
  'published | skipped_below_threshold | skipped_missing_data. No other values. A 16-game slate produces 16 rows regardless of status — skipped picks are rows, not omissions.';
comment on column public.picks_daily.skip_reason is
  'Human-readable reason, populated only when status is a skip variant.';
