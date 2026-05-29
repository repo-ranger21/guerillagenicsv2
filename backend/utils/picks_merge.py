"""Editorial merge for picks.

Combines the wire bin (picks_daily, auto) with the editor's desk
(picks_editorial, hand-authored). Editorial wins field-by-field. `analysis` is
the non-negotiable: a written analysis is NEVER overwritten by auto-generation,
not even by a future "auto-fill empty analysis" feature.

The guarantee is proven in tests/test_utils/test_picks_merge.py. If you ever
change EDITORIAL_FIELDS or this logic, that test must stay green — it is the
machine-checkable form of the EAA editorial promise.
"""

from __future__ import annotations

from typing import Any

# Fields the editor's desk owns. Anything not listed flows through from auto
# (odds, components, formulas, line_signal, model outputs, audit, timing…).
EDITORIAL_FIELDS: tuple[str, ...] = (
    "headline",
    "subline",
    "tag",
    "analysis",
    "sgp_legs",
    "active_legs",
)


def _is_nonempty(value: Any) -> bool:
    """An editorial field 'exists' only if it carries real content.

    None, "", "   ", [], and {} all count as absent, so an empty editorial row
    never blanks out an auto value — it just declines to override.
    """
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


def merge_pick(auto: dict[str, Any], editorial: dict[str, Any] | None) -> dict[str, Any]:
    """Overlay editorial onto auto. Editorial wins where it has content.

    Args:
        auto: a picks_daily row (wire bin). Source of truth for odds, model
            outputs, formulas, and everything not authored by hand.
        editorial: the matching picks_editorial row, or None if the editor
            hasn't written this matchup yet.

    Returns:
        A new merged dict. `auto` is not mutated.
    """
    merged = dict(auto)
    if not editorial:
        return merged
    for field in EDITORIAL_FIELDS:
        if _is_nonempty(editorial.get(field)):
            merged[field] = editorial[field]
    return merged
