"""The EAA editorial guarantee, as a test.

If `test_written_analysis_is_never_overwritten` ever fails, the platform's core
promise is broken. Treat a failure here as a release blocker.
"""

from utils.picks_merge import EDITORIAL_FIELDS, merge_pick


# ─── The non-negotiable ──────────────────────────────────────────────────────

def test_written_analysis_is_never_overwritten():
    """A hand-authored analysis survives even when auto carries its own."""
    auto = {
        "slug": "lad",
        "odds": -118,
        "analysis": [{"text": ["AUTO-GENERATED — must not appear"]}],
    }
    editorial = {"analysis": [{"text": ["Hand-authored truth"]}]}

    merged = merge_pick(auto, editorial)

    assert merged["analysis"] == editorial["analysis"]
    assert merged["odds"] == -118


def test_auto_fills_only_when_editorial_analysis_absent():
    """When the editor hasn't written analysis, auto may fill the gap."""
    auto = {"analysis": [{"text": ["auto fallback"]}]}

    for empty in ({}, {"analysis": None}, {"analysis": []}):
        merged = merge_pick(auto, empty)
        assert merged["analysis"] == auto["analysis"]


# ─── General merge behavior ──────────────────────────────────────────────────

def test_editorial_wins_each_field_when_present():
    auto = {f: "AUTO" for f in EDITORIAL_FIELDS}
    auto["odds"] = -110
    editorial = {
        "headline": ["a", "b", "c"],
        "subline": "edited subline",
        "tag": "Tonight",
        "analysis": [{"pull": "edited"}],
        "sgp_legs": [{"id": "l1"}],
        "active_legs": ["l1"],
    }

    merged = merge_pick(auto, editorial)

    for f in EDITORIAL_FIELDS:
        assert merged[f] == editorial[f]
    assert merged["odds"] == -110


def test_none_editorial_returns_auto_untouched():
    auto = {"slug": "hou", "odds": 113, "analysis": [{"text": ["x"]}]}
    assert merge_pick(auto, None) == auto


def test_auto_is_not_mutated():
    auto = {"analysis": [{"text": ["original"]}], "odds": -118}
    merge_pick(auto, {"analysis": [{"text": ["new"]}]})
    assert auto["analysis"] == [{"text": ["original"]}]


def test_empty_string_editorial_does_not_blank_auto():
    auto = {"subline": "real subline"}
    merged = merge_pick(auto, {"subline": "   "})
    assert merged["subline"] == "real subline"
