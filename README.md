# GuerillaGenics v2

The first Futures-only sports intelligence platform.

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

## Quick Start

```bash
git clone https://github.com/repo-ranger21/guerillagenics-v2
cd guerillagenics-v2

# Backend
cp backend/.env.example backend/.env   # fill in your secrets
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8080
# → http://localhost:8080/docs

# Frontend (separate terminal)
cd frontend
cp .env.example .env
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

## License

Proprietary — GuerillaGenics LLC. All rights reserved.
