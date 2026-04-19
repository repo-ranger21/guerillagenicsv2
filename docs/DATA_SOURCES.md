# Data Sources

All scrapers live in `backend/scrapers/`. Every HTTP call uses Tenacity retry logic (3 attempts, exponential backoff).

---

## The Odds API

**File:** `scrapers/odds_api.py`  
**Endpoint:** `https://api.the-odds-api.com/v4/sports/{sport_key}/odds`  
**Auth:** `ODDS_API_KEY` env var (query param `apiKey`)

Fetches championship outright odds across up to 10 bookmakers. Vig removal is applied to produce true market probabilities.

Sport key mapping:
| Sport | Odds API Key |
|---|---|
| NBA | `basketball_nba_championship_winner` |
| MLB | `baseball_mlb_world_series_winner` |
| NFL | `americanfootball_nfl_super_bowl_winner` |

**Rate limits:** 500 requests/month (free tier). The nightly ingest makes 3 requests (one per sport).

---

## ESPN Public API

**File:** `scrapers/espn.py`  
**Base:** `https://site.api.espn.com/apis/site/v2/sports/`

No API key required. Endpoints used:

| Function | Path |
|---|---|
| `fetch_standings(sport)` | `{sport}/standings` |
| `fetch_team_stats(sport)` | `{sport}/teams/{team_id}/statistics` |
| `fetch_injuries(sport)` | `{sport}/injuries` |
| `fetch_scoreboard(sport)` | `{sport}/scoreboard` |

---

## NBA Stats API

**File:** `scrapers/nba_stats.py`  
**Base:** `https://stats.nba.com/stats/`

Requires browser-mimicking headers:
- `x-nba-stats-origin: stats`
- `x-nba-stats-token: true`
- `Referer: https://www.nba.com`

Endpoints used:
| Endpoint | Data |
|---|---|
| `leaguedashteamstats` | Advanced team stats (NetRtg, PACE, etc.) |
| `leaguedashteamclutch` | Clutch performance (close-game W%) |
| `teamgamelog` | Per-game log for MDI calculation |

---

## MLB Stats API (Statsapi)

**File:** `scrapers/mlb_stats.py`  
**Base:** `https://statsapi.mlb.com/api/v1/`

No auth required. League IDs: AL = 103, NL = 104.

Endpoints used: `standings`, `teams/{id}/stats`, `schedule`, `teams/{id}/roster`.

---

## NFL (ESPN)

**File:** `scrapers/nfl_espn.py`

Uses the same ESPN base URL as `scrapers/espn.py` but with NFL-specific parsing for QBR endpoint: `nfl/players/qbr/types/all`.

---

## Baseball Reference (BRef)

**File:** `scrapers/bref.py`  
**Library:** BeautifulSoup 4

Scrapes:
- `/friv/playoff_prob.shtml` — historical playoff percentages
- `/leaders/ws_champ_batting.shtml` — championship win share leaders

Respects a 3-second delay between requests.

---

## FanGraphs

**File:** `scrapers/fangraphs.py`  
**Library:** Playwright (async Chromium)

JavaScript-rendered pages. Scrapes FIP, wRC+, and WAR tables for MLB pitchers and batters. Uses `page.wait_for_selector(".rgMasterTable")` before parsing.

---

## OpenWeatherMap

**File:** `scrapers/weather.py`  
**Endpoint:** `https://api.openweathermap.org/data/2.5/weather`  
**Auth:** `OPENWEATHER_API_KEY` env var

Used for NFL EAF only. 16 outdoor NFL stadium coordinates are hardcoded in `NFL_OUTDOOR_VENUES`. Returns temperature (°F), wind speed (mph), and precipitation probability.

---

## Injury Feed

**File:** `scrapers/injuries.py`

Aggregates from ESPN injury endpoint. Classifies players into roles: `star`, `starter`, `rotation`, `bench`. Win shares are estimated from historical averages by role for IIS calculation.

---

## Data Freshness

| Source | Ingest Frequency | Staleness Tolerance |
|---|---|---|
| Odds API | Daily (nightly cron) | 24h |
| ESPN standings | Daily | 24h |
| NBA Stats | Daily | 24h |
| MLB Stats | Daily | 24h |
| BRef | Weekly | 7d |
| FanGraphs | Weekly | 7d |
| Weather | Game-day only | 3h |
| Injuries | Daily | 12h |
