"""
gg.pipeline.write — THE ONLY module that touches picks_daily.

Upserts a PickSnapshot on its natural key (slug, game_date). No other
module in this pipeline is permitted to write to picks_daily — enforce
that by only ever adding writes here, not by convention alone.

dry_run is a PARAMETER, not a branch: the INSERT ... ON CONFLICT always
executes, against the real database, inside a transaction — that's what
proves the row would actually write cleanly (catches constraint
violations, bad FKs, type mismatches) rather than just proving the SQL
text is well-formed. The only thing dry_run changes is the very last
step: commit (write survives) vs rollback (write is discarded). Same
code path either way, exactly as the task spec requires — a dry run
that skipped execute() entirely would be testing a different program.

picks_editorial is never imported, referenced, or written anywhere in
this module. There is no code path to it from here.
"""

from __future__ import annotations

from gg.pipeline.snapshot import PickSnapshot

_UPSERT_SQL = """
insert into public.picks_daily
  (slug, game_date, sport, game_id, model_run_id, pick, game, game_time, odds,
   line_signal, components, formulas, audit, model_prob, evi, kelly_full,
   kelly_fractional, logged_at, driver_text, flags, status, skip_reason)
values
  (%(slug)s, %(game_date)s, %(sport)s, %(game_id)s, %(model_run_id)s, %(pick)s,
   %(game)s, %(game_time)s, %(odds)s, %(line_signal)s, %(components)s, %(formulas)s,
   %(audit)s, %(model_prob)s, %(evi)s, %(kelly_full)s, %(kelly_fractional)s,
   %(logged_at)s, %(driver_text)s, %(flags)s, %(status)s, %(skip_reason)s)
on conflict (slug, game_date) do update set
  sport             = excluded.sport,
  game_id           = excluded.game_id,
  model_run_id      = excluded.model_run_id,
  pick              = excluded.pick,
  game              = excluded.game,
  game_time         = excluded.game_time,
  odds              = excluded.odds,
  line_signal       = excluded.line_signal,
  components        = excluded.components,
  formulas          = excluded.formulas,
  audit             = excluded.audit,
  model_prob        = excluded.model_prob,
  evi               = excluded.evi,
  kelly_full        = excluded.kelly_full,
  kelly_fractional  = excluded.kelly_fractional,
  logged_at         = excluded.logged_at,
  driver_text       = excluded.driver_text,
  flags             = excluded.flags,
  status            = excluded.status,
  skip_reason       = excluded.skip_reason
  -- id and created_at intentionally NOT in this list: id is the row's
  -- permanent identity, created_at is the ORIGINAL insert time. logged_at
  -- (the pick lock time) DOES update on a legitimate re-run -- see its
  -- column comment in db/migrations/0006_picks_daily_snapshot_columns.sql.
returning id, created_at, logged_at, (xmax = 0) as was_insert;
"""


def _params(snapshot: PickSnapshot, model_run_id: int) -> dict:
    import json

    return {
        "slug": snapshot.slug,
        "game_date": snapshot.game_date,
        "sport": snapshot.sport,
        "game_id": snapshot.game_id,
        "model_run_id": model_run_id,
        "pick": snapshot.pick,
        "game": snapshot.game,
        "game_time": snapshot.game_time,
        "odds": snapshot.odds,
        "line_signal": json.dumps(snapshot.line_signal),
        "components": json.dumps(snapshot.components),
        "formulas": json.dumps(snapshot.formulas),
        "audit": json.dumps(snapshot.audit),
        "model_prob": snapshot.model_prob,
        "evi": snapshot.evi,
        "kelly_full": snapshot.kelly_full,
        "kelly_fractional": snapshot.kelly_fractional,
        "logged_at": snapshot.logged_at,
        "driver_text": snapshot.driver_text,
        "flags": snapshot.flags,
        "status": snapshot.status,
        "skip_reason": snapshot.skip_reason,
    }


def upsert_pick(conn, snapshot: PickSnapshot, model_run_id: int, dry_run: bool) -> dict:
    """The one function in the whole pipeline that writes to picks_daily.

    Returns a dict describing what happened/would happen — always,
    dry_run or not, same shape either way:
      {dry_run, id, slug, game_date, was_insert, created_at, logged_at}
    """
    params = _params(snapshot, model_run_id)

    with conn.cursor() as cur:
        cur.execute(_UPSERT_SQL, params)
        row = cur.fetchone()

    if dry_run:
        conn.rollback()
    else:
        conn.commit()

    return {
        "dry_run": dry_run,
        "id": row[0],
        "slug": snapshot.slug,
        "game_date": snapshot.game_date,
        "created_at": row[1],
        "logged_at": row[2],
        "was_insert": row[3],
    }
