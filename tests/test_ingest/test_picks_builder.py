"""Tests for the picks producer.

Pins the stored-output math to exact values — because these stored numbers ARE
the audit-of-record, and they must equal what the frontend FE engine computes.
If these drift, the "math mirrors across stack" promise is broken.
"""

import math

from ingest.picks_builder import (
    PUBLISH_EVI,
    am_to_decimal,
    build_pick_row,
    evi,
    implied_prob,
    kelly,
    select_publishable,
)


def _pick(**over):
    base = {
        "slug": "lad", "sport": "mlb", "game": "ARI @ LAD",
        "pick": "LAD -1.5", "odds": -118, "model_prob": 0.62,
    }
    base.update(over)
    return base


# ─── math correctness (must match frontend FE) ───────────────────────────────

def test_am_to_decimal():
    assert am_to_decimal(-118) == 100 / 118
    assert am_to_decimal(113) == 1.13


def test_implied_prob():
    assert implied_prob(-118) == 118 / 218
    assert math.isclose(implied_prob(100), 0.5)


def test_kelly_and_evi_known_values():
    # p=0.62, odds=-118  →  hand-computed
    assert math.isclose(kelly(0.62, -118), 0.171599, abs_tol=1e-5)
    assert math.isclose(evi(0.62, -118), 14.5423, abs_tol=1e-3)


def test_kelly_floors_at_zero_when_no_edge():
    assert kelly(0.40, -118) == 0.0   # negative edge → never bet


# ─── row construction ────────────────────────────────────────────────────────

def test_build_row_stores_derived_outputs():
    row = build_pick_row(_pick(), "2026-05-29", kelly_multiplier=0.5)
    assert row["model_prob"] == 0.62
    assert math.isclose(row["evi"], 14.5423, abs_tol=1e-3)
    assert math.isclose(row["kelly_full"], 0.1716, abs_tol=1e-4)
    assert math.isclose(row["kelly_fractional"], 0.0858, abs_tol=1e-4)
    assert row["slug"] == "lad" and row["game_date"] == "2026-05-29"


def test_components_pass_through_but_do_not_drive_prob():
    # A garbage components dict must not change the stored probability.
    row = build_pick_row(_pick(components={"era": 0.01}), "2026-05-29")
    assert row["model_prob"] == 0.62          # still the sim's number
    assert row["components"] == {"era": 0.01}  # display only


def test_min_tier_defaults_to_scout():
    assert build_pick_row(_pick(), "2026-05-29")["min_tier"] == "scout"
    assert build_pick_row(_pick(min_tier="command"), "2026-05-29")["min_tier"] == "command"


# ─── threshold gate ──────────────────────────────────────────────────────────

def test_only_publishable_picks_survive():
    strong = _pick(slug="lad", model_prob=0.62)            # EVI ~14.5% → publish
    weak = _pick(slug="sac", odds=-110, model_prob=0.50)   # EVI < 0 → skip
    rows = select_publishable([strong, weak], "2026-05-29")
    slugs = {r["slug"] for r in rows}
    assert slugs == {"lad"}
    assert all(r["evi"] >= PUBLISH_EVI for r in rows)
