"""Grading math, score parsing, season calendar, kickoff lock, and the
engine <-> database contract (columns the code writes must exist in the
migrations that define them)."""

import re
from datetime import date
from pathlib import Path

import pytest

from gg.pipeline import grade
from gg.pipeline.grade import build_post_mortem, grade_spread, parse_completed, profit_units
from gg.season import current_season_week, week_end_exclusive

MIGRATIONS = Path(__file__).resolve().parents[2] / "db" / "migrations"


# ── spread grading ───────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "is_home, spread, home, away, expected",
    [
        (True, -3.5, 27, 20, "win"),    # home -3.5 wins by 7
        (True, -3.5, 23, 20, "loss"),   # wins by 3, does not cover
        (True, -3.0, 23, 20, "push"),   # lands exactly on the number
        (False, 3.5, 20, 23, "win"),    # away +3.5, loses by 3 -> covers
        (False, 3.5, 27, 20, "loss"),   # away +3.5, loses by 7
        (False, -2.5, 17, 24, "win"),   # away -2.5, wins by 7
        (False, 7.0, 31, 24, "push"),
    ],
)
def test_grade_spread(is_home, spread, home, away, expected):
    assert grade_spread(is_home, spread, home, away) == expected


def test_profit_units():
    assert profit_units("win", -110) == pytest.approx(0.909)
    assert profit_units("win", 120) == pytest.approx(1.2)
    assert profit_units("loss", -110) == -1.0
    assert profit_units("push", -110) == 0.0
    assert profit_units("void", 150) == 0.0


def test_post_mortem_states_the_miss_without_inventing_a_reason():
    text = build_post_mortem(
        pick="KC -3.5", bet_team="KC", bet_team_is_home=True, spread=-3.5,
        home_score=20, away_score=19, edge_pts=4.1,
    )
    assert text.startswith("[auto]")
    assert "+1" in text and "+4.1" in text
    assert text.strip() != ""


# ── score parsing ────────────────────────────────────────────────────────────

def _event(**kw):
    base = {
        "id": "abc", "completed": True, "home_team": "Kansas City Chiefs",
        "away_team": "Denver Broncos",
        "scores": [{"name": "Denver Broncos", "score": "17"}, {"name": "Kansas City Chiefs", "score": "24"}],
    }
    base.update(kw)
    return base


def test_parse_completed_matches_by_name_not_position():
    assert parse_completed(_event()) == ("abc", 24, 17)


@pytest.mark.parametrize("override", [{"completed": False}, {"scores": None}, {"scores": []},
                                      {"scores": [{"name": "Nobody", "score": "1"}]}])
def test_parse_completed_rejects_unfinished_or_unmatched(override):
    assert parse_completed(_event(**override)) is None


# ── season calendar ──────────────────────────────────────────────────────────

def test_current_season_week():
    assert current_season_week(date(2026, 9, 8)) == (2026, 1)
    assert current_season_week(date(2026, 9, 14)) == (2026, 1)   # Monday night of week 1
    assert current_season_week(date(2026, 9, 15)) == (2026, 2)
    assert current_season_week(date(2026, 10, 12)) == (2026, 5)  # Monday of week 5
    assert current_season_week(date(2026, 10, 13)) == (2026, 6)  # Week 6 starts Tuesday


def test_season_calendar_fails_loudly_outside_the_season():
    with pytest.raises(ValueError):
        current_season_week(date(2026, 8, 1))
    with pytest.raises(ValueError):
        current_season_week(date(2027, 2, 1))


def test_week_end_exclusive_is_next_tuesday():
    assert week_end_exclusive(2026, 1) == date(2026, 9, 15)
    assert week_end_exclusive(2026, 6) == date(2026, 10, 20)


def test_tracking_starts_at_week_6():
    assert grade.TRACKING_START == (2026, 6)


# ── kickoff lock ─────────────────────────────────────────────────────────────

class _Cur:
    def __init__(self, started):
        self.started, self.executed = started, []

    def __enter__(self): return self
    def __exit__(self, *a): return False
    def execute(self, sql, params=None): self.executed.append(sql)
    def fetchone(self): return (self.started,)


class _Conn:
    def __init__(self, started):
        self.cur, self.rolled_back = _Cur(started), False

    def cursor(self, *a, **k): return self.cur
    def rollback(self): self.rolled_back = True
    def commit(self): raise AssertionError("must not commit a locked pick")


def test_upsert_refuses_started_games():
    from gg.pipeline.write import PickLockedError, upsert_pick

    class Snap:  # only game_id is read before the lock check fires
        game_id = 1

    conn = _Conn(started=True)
    # _params would read many attributes; the lock check must come first.
    import gg.pipeline.write as write
    original = write._params
    write._params = lambda s, r: {}
    try:
        with pytest.raises(PickLockedError):
            upsert_pick(conn, Snap(), model_run_id=1, dry_run=False)
    finally:
        write._params = original
    assert conn.rolled_back
    assert not any("insert into public.picks_daily" in q for q in conn.cur.executed)


# ── engine <-> database contract ─────────────────────────────────────────────

def _migration_sql() -> str:
    return "\n".join(p.read_text() for p in sorted(MIGRATIONS.glob("*.sql")))


def test_pick_results_insert_columns_exist_in_migrations():
    cols = re.search(r"insert into public\.pick_results\s*\((.*?)\)\s*values", grade._INSERT_RESULT_SQL, re.S)
    written = [c.strip() for c in cols.group(1).split(",")]
    ddl = re.search(r"create table if not exists public\.pick_results \((.*?)\n\);", _migration_sql(), re.S).group(1)
    for col in written:
        assert re.search(rf"^\s*{col}\s", ddl, re.M), f"pick_results.{col} not defined in migrations"


def test_game_score_columns_exist_in_migration_0009():
    sql = (MIGRATIONS / "0009_game_scores.sql").read_text()
    for col in ("home_score", "away_score", "completed_at"):
        assert col in sql


def test_grade_never_writes_picks_daily():
    src = Path(grade.__file__).read_text()
    assert not re.search(r"(insert into|update|delete from)\s+public\.picks_daily", src, re.I)
