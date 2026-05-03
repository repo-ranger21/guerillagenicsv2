# GuerillaGenics v2

The first Futures-only sports intelligence platform.

## Project Overview

GuerillaGenics is a sports intelligence platform focused on futures and player-level edges across NFL, NBA, and MLB.
The backend serves model-driven APIs and ingest pipelines, while analytics scripts support ad hoc roster and betting-angle analysis from CSV exports.

## Stack

- **Backend:** FastAPI + Python 3.11 → Google Cloud Run (us-west1)
- **Frontend:** React + Vite + Tailwind → Cloudflare Pages
- **Database:** Supabase (PostgreSQL)
- **CI/CD:** GitHub Actions

## Live

| Resource | URL |
|---|---|
| App | https://guerillagenics.app |
| API | https://guerillagenics-core-engine-391532873800.us-west1.run.app |
| API Docs | https://guerillagenics-core-engine-391532873800.us-west1.run.app/docs |

## Formula Engine

10 proprietary prediction formulas power every output:

| # | Formula | Code | Purpose |
|---|---|---|---|
| 01 | GuerillaGenics Elo | GG-ELO | Adaptive team rating with margin of victory |
| 02 | Net Impact Rating | NIR | Pace-adjusted net rating vs opponent quality |
| 03 | Schedule Strength | SSC | Remaining schedule difficulty coefficient |
| 04 | Injury Impact Score | IIS | Win-share-weighted injury quantification |
| 05 | Momentum Decay Index | MDI | Exponentially weighted recent performance |
| 06 | Playoff DNA Score | PDS | Historical postseason performance + coaching |
| 07 | Environmental Adj. Factor | EAF | Home/away, travel, rest, weather |
| 08 | Market Inefficiency Detector | MID | Edge vs. vig-removed market odds (the NEEDLE) |
| 09 | Monte Carlo Simulator | MCS | 100,000-run bracket probability engine |
| 10 | Composite Futures Score | CFS | Master weighted score driving all rankings |

See [docs/FORMULAS.md](docs/FORMULAS.md) for full specification.

## Prerequisites

- Python 3.11+
- pip
- Node.js 20+ (frontend only)
- npm (frontend only)

Optional for deployment:
- Docker
- Google Cloud CLI

## Quick Start

```bash
git clone https://github.com/repo-ranger21/guerillagenics-v2
cd guerillagenics-v2

# Backend
cp backend/.env.example backend/.env   # fill in real values
pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --port 8080
# → http://localhost:8080
# → http://localhost:8080/docs

# Frontend (separate terminal — from repo root)
cp frontend/.env.example frontend/.env.local   # VITE_API_URL is already http://localhost:8080
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Deploy

Push to `main` → GitHub Actions auto-deploys:
- **Backend** → Google Cloud Run (`guerillagenics-core-engine`, us-west1)
- **Frontend** → Cloudflare Pages (guerillagenics.app)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full setup including GitHub Secrets.

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production — protected, deploy-gated |
| `develop` | Integration branch |
| `formula/*` | Formula development |
| `feature/*` | UI + API features |
| `scraper/*` | Data scraper work |
| `fix/{issue}-{desc}` | Bug fixes |

## Required GitHub Secrets

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full list of 11 secrets required for CI/CD.

## Data Sources

- stats.nba.com (advanced team + player stats)
- statsapi.mlb.com (MLB game + player data)
- ESPN public API (all sports, injuries)
- The Odds API (futures odds, all books)
- Basketball/Baseball Reference (historical)
- FanGraphs (pitching + hitting splits)
- OpenWeatherMap (game-day weather)

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for refresh schedules.

## Run Backend

```bash
cd backend
uvicorn main:app --reload
```

Backend endpoints:
- API: http://localhost:8080
- Swagger Docs: http://localhost:8080/docs

## Roster Analytics CLI

Use `scripts/roster_analytics.py` to run cross-sport queries directly on the extracted Notion CSV exports.

Expected data location:
- `data/raw/notion_rosters_2026/nfl/**/*_all.csv`
- `data/raw/notion_rosters_2026/nba/**/*_all.csv`
- `data/raw/notion_rosters_2026/mlb/**/*_all.csv`

Examples:

```bash
# Cross-sport snapshot
python scripts/roster_analytics.py overview --top 5

# Position-filtered query examples
python scripts/roster_analytics.py filter --sport nfl --position QB --metric RTG --op gt --value 95
python scripts/roster_analytics.py filter --sport nba --position PG --metric AST --op ge --value 8
python scripts/roster_analytics.py filter --sport mlb --position SP --metric ERA --op lt --value 3.00

# Team-level aggregations
python scripts/roster_analytics.py team-agg --sport nfl --mode offense --top 10
python scripts/roster_analytics.py team-agg --sport nba --mode defense --top 10
python scripts/roster_analytics.py team-agg --sport mlb --mode pitching --top 10

# Betting-angle style flags
python scripts/roster_analytics.py angles --sport nfl --top 20
python scripts/roster_analytics.py anomalies --sport nba --top 20

# JSON output (for downstream scripts)
python scripts/roster_analytics.py --json leaders --sport mlb --top 15
```

## Environment Variable Reference

The project uses the following environment variables across backend and scripts:

| Variable | Purpose |
|---|---|
| `LOG_LEVEL` | Backend log level |
| `SLACK_WEBHOOK` | Ingest failure notifications |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key |
| `ODDS_API_KEY` | The Odds API authentication |
| `OPENWEATHER_API_KEY` | OpenWeatherMap authentication |
| `ODDS_API_BASE_URL` | Override base URL for Odds API |
| `OPENWEATHER_BASE_URL` | Override base URL for OpenWeather API |
| `SCRAPER_REQUEST_TIMEOUT` | Scraper HTTP timeout in seconds |
| `GG_API_KEYS` | Comma-separated API keys for middleware auth |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist |
| `RATE_LIMIT_DEFAULT` | Default API rate limit |
| `RATE_LIMIT_EXPENSIVE` | Tight rate limit for expensive endpoints |
| `MONTE_CARLO_SIMULATIONS` | Simulation count for championship models |
| `CFS_WEIGHT_ELO` | Optional CFS weight override |
| `CFS_WEIGHT_NIR` | Optional CFS weight override |
| `CFS_WEIGHT_SSC` | Optional CFS weight override |
| `CFS_WEIGHT_IIS` | Optional CFS weight override |
| `CFS_WEIGHT_MDI` | Optional CFS weight override |
| `CFS_WEIGHT_PDS` | Optional CFS weight override |
| `CFS_WEIGHT_EAF` | Optional CFS weight override |
| `CFS_WEIGHT_MID` | Optional CFS weight override |

## License

Proprietary — GuerillaGenics LLC. All rights reserved.
