"""
FanGraphs scraper using Playwright for JavaScript-rendered tables.
Fetches pitching/hitting splits and team FIP data.
"""

import asyncio
from playwright.async_api import async_playwright
from utils.logger import get_logger

logger = get_logger(__name__)

FANGRAPHS_BASE = "https://www.fangraphs.com"


async def _scrape_table(url: str, table_selector: str = "table.rgMasterTable") -> list[dict]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (compatible; GuerillaGenics Research)"
        })
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_selector(table_selector, timeout=15000)
            headers = await page.eval_on_selector_all(
                f"{table_selector} thead tr:last-child th",
                "els => els.map(e => e.innerText.trim())"
            )
            rows = await page.eval_on_selector_all(
                f"{table_selector} tbody tr",
                "rows => rows.map(row => Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim()))"
            )
            return [dict(zip(headers, row)) for row in rows if row]
        finally:
            await browser.close()


def fetch_team_pitching_fip(season: int = 2025) -> list[dict]:
    url = f"{FANGRAPHS_BASE}/leaders.aspx?pos=all&stats=pit&lg=all&qual=0&type=1&season={season}&team=0,ts&age=0"
    try:
        raw = asyncio.run(_scrape_table(url))
        result = []
        for row in raw:
            result.append({
                "team_name": row.get("Team", ""),
                "fip": _safe_float(row.get("FIP")),
                "era": _safe_float(row.get("ERA")),
                "xfip": _safe_float(row.get("xFIP")),
                "k_pct": _safe_float(row.get("K%")),
                "bb_pct": _safe_float(row.get("BB%")),
                "hr_9": _safe_float(row.get("HR/9")),
                "season": season,
            })
        return result
    except Exception as e:
        logger.warning("fangraphs_pitching_failed", season=season, error=str(e))
        return []


def fetch_team_batting_wrc(season: int = 2025) -> list[dict]:
    url = f"{FANGRAPHS_BASE}/leaders.aspx?pos=all&stats=bat&lg=all&qual=0&type=8&season={season}&team=0,ts&age=0"
    try:
        raw = asyncio.run(_scrape_table(url))
        result = []
        for row in raw:
            result.append({
                "team_name": row.get("Team", ""),
                "wrc_plus": _safe_float(row.get("wRC+")),
                "war": _safe_float(row.get("WAR")),
                "ops_plus": _safe_float(row.get("OPS+")),
                "babip": _safe_float(row.get("BABIP")),
                "iso": _safe_float(row.get("ISO")),
                "season": season,
            })
        return result
    except Exception as e:
        logger.warning("fangraphs_batting_failed", season=season, error=str(e))
        return []


def _safe_float(val: str | None) -> float | None:
    if val is None:
        return None
    cleaned = val.replace("%", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None
