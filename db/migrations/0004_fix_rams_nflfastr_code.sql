-- ============================================================
-- GuerillaGenics v2 — Neon migration 0004
-- Correction: nflverse's actual team code for the Rams is 'LA', not
-- 'LAR'. Discovered empirically running scripts/week1_math.py against
-- live 2025 play-by-play — all other 31 team codes seeded in
-- migration 0002 matched real data exactly; only the Rams differed.
-- teams.abbreviation stays 'LAR' (that's this app's own convention,
-- unique(sport_id, abbreviation) key, used throughout the schema) —
-- only the nflfastr crosswalk source_id changes, since that's the
-- external system's code, not ours.
-- ============================================================

update public.external_ids
set source_id = 'LA'
where entity_type = 'team'
  and source = 'nflfastr'
  and source_id = 'LAR';
