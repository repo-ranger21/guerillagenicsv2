"""picks_builder — the producer.

Takes your sport pipeline's output and lands publishable picks into picks_daily,
computing the STORED model outputs (EVI, Kelly) that become the audit-of-record.

THE PROBABILITY: model_prob is your Monte Carlo / Poisson output, supplied by
the pipeline. It is NOT recomputed from the `components` heuristic — components
are the explainability display only. EVI and Kelly derive from model_prob.
"""

from __future__ import annotations

from datetime import date as date_cls
from typing import Any

from db.queries.picks_daily import upsert_picks_daily
from formulas.betting_math import am_to_decimal, implied_prob, kelly, evi  # noqa: F401
from utils.logger import get_logger

logger = get_logger(__name__)

# EAA publishing rule: publish >= +3.0%, monitor +1.5–3.0%, skip < +1.5%.
PUBLISH_EVI = 3.0

# Fractional Kelly applied to the full stake. 0.5x standard; the documented
# early-season 0.35x discount can be passed per-run via kelly_multiplier.
DEFAULT_KELLY_MULT = 0.5


# ─── row construction ────────────────────────────────────────────────────────

def build_pick_row(
    pick: dict[str, Any],
    game_date: str,
    kelly_multiplier: float = DEFAULT_KELLY_MULT,
) -> dict[str, Any]:
    """Map one pipeline pick to a picks_daily row with stored model outputs.

    Required from the pipeline: slug, sport, game, pick, odds (american int),
    model_prob (0..1 from the sim). Optional display/EAA fields pass through.
    """
    p = float(pick["model_prob"])
    odds = int(pick["odds"])

    full = kelly(p, odds)
    return {
        "slug":             pick["slug"],
        "game_date":        game_date,
        "sport":            pick["sport"],
        "file":             pick.get("file"),
        "pick":             pick["pick"],
        "game":             pick["game"],
        "game_time":        pick.get("game_time"),
        "odds":             odds,
        "line_signal":      pick.get("line_signal") or {},
        "components":       pick.get("components") or {},   # explainability display only
        "formulas":         pick.get("formulas") or [],     # build via utils/eaa_builder
        "audit":            pick.get("audit") or {},
        # Stored model outputs = audit-of-record.
        "model_prob":       round(p, 4),
        "evi":              round(evi(p, odds), 4),
        "kelly_full":       round(full, 4),
        "kelly_fractional": round(full * kelly_multiplier, 4),
        # Monetization knob: who sees this pick. Default everyone (scout).
        "min_tier":         pick.get("min_tier", "scout"),
    }


def select_publishable(
    picks: list[dict[str, Any]],
    game_date: str,
    kelly_multiplier: float = DEFAULT_KELLY_MULT,
) -> list[dict[str, Any]]:
    """Build rows and keep only those clearing the publish threshold."""
    rows = [build_pick_row(p, game_date, kelly_multiplier) for p in picks]
    publishable = [r for r in rows if r["evi"] >= PUBLISH_EVI]
    logger.info(
        "select_publishable",
        total=len(rows),
        publishable=len(publishable),
        threshold=PUBLISH_EVI,
    )
    return publishable


def run_for_date(
    picks: list[dict[str, Any]],
    target: date_cls | None = None,
    kelly_multiplier: float = DEFAULT_KELLY_MULT,
    sb=None,
) -> int:
    """End-to-end: build → threshold filter → idempotent upsert. Returns rows written.

    Wire your MLB pipeline in like:
        from ingest.mlb_pipeline import generate_picks   # your producer
        run_for_date(generate_picks())
    """
    game_date = (target or date_cls.today()).isoformat()
    rows = select_publishable(picks, game_date, kelly_multiplier)
    return upsert_picks_daily(rows, sb=sb)
