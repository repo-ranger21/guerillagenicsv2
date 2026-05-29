"""GET /api/v1/picks/today — the press.

Pulls the day's wire picks (picks_daily) + editor's desk (picks_editorial),
merges them editorial-wins, and serializes to the camelCase DTO the React app
already consumes.
"""

from __future__ import annotations

from datetime import date as date_cls
from typing import Any

from fastapi import APIRouter, Query
from db.client import get_supabase
from utils.picks_merge import merge_pick
from utils.logger import get_logger

router = APIRouter(tags=["picks"])
logger = get_logger(__name__)


def _to_dto(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id":               row.get("slug"),
        "file":             row.get("file"),
        "sport":            (row.get("sport") or "").upper(),
        "tag":              row.get("tag"),
        "pick":             row.get("pick"),
        "game":             row.get("game"),
        "time":             row.get("game_time"),
        "odds":             row.get("odds"),
        "headline":         row.get("headline") or [],
        "subline":          row.get("subline") or "",
        "lineSignal":       row.get("line_signal") or {},
        "components":       row.get("components") or {},
        "formulas":         row.get("formulas") or [],
        "sgpLegs":          row.get("sgp_legs") or [],
        "activeLegs":       row.get("active_legs") or [],
        "analysis":         row.get("analysis") or [],
        "audit":            row.get("audit") or {},
        "modelProb":        _num(row.get("model_prob")),
        "evi":              _num(row.get("evi")),
        "kellyFull":        _num(row.get("kelly_full")),
        "kellyFractional":  _num(row.get("kelly_fractional")),
    }


def _num(v: Any) -> float | None:
    return float(v) if v is not None else None


def _load_season(sb) -> dict[str, Any]:
    """Season summary block for the masthead.

    Stubbed — returns {} until the season-record source is confirmed.
    The frontend falls back to seed.season when this is empty.
    """
    return {}


@router.get("/picks/today")
def picks_today(
    target: date_cls | None = Query(default=None, alias="date"),
) -> dict[str, Any]:
    sb = get_supabase()
    game_date = (target or date_cls.today()).isoformat()

    auto_rows = (
        sb.table("picks_daily").select("*").eq("game_date", game_date).execute().data
    ) or []
    edit_rows = (
        sb.table("picks_editorial").select("*").eq("game_date", game_date).execute().data
    ) or []

    editorial_by_slug = {r["slug"]: r for r in edit_rows}

    picks = [
        _to_dto(merge_pick(auto, editorial_by_slug.get(auto["slug"])))
        for auto in auto_rows
    ]

    logger.info("picks_today_served", date=game_date, count=len(picks))

    return {
        "date":        game_date,
        "generatedAt": None,
        "season":      _load_season(sb),
        "picks":       picks,
    }
