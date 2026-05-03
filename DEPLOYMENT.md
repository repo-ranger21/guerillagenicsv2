# GuerillaGenics v2 — Deployment Reference

## Architecture

```
Frontend  →  Cloudflare Pages  (static React/Vite build from frontend/dist)
Backend   →  Google Cloud Run  (FastAPI Docker container)
Database  →  Supabase          (Postgres + Auth)
```

> **Note:** The FastAPI backend cannot run on Cloudflare Pages (static hosting only).
> It must be deployed as a separate service. Cloud Run is the primary target.
> `backend/render.yaml` is provided as an alternative for Render.com.

---

## Quick Start — Local Development

```bash
# Backend
cp backend/.env.example backend/.env   # fill in real values
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080

# Frontend (separate terminal)
cp frontend/.env.example frontend/.env.local   # already has VITE_API_URL=http://localhost:8080
cd frontend
npm install
npm run dev
```

---

## Frontend — Cloudflare Pages

**Build settings:**

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `cd frontend && npm run build` |
| Build output directory | `frontend/dist` |
| Root directory | `/` (repo root) |

**Required environment variables in Cloudflare Pages dashboard:**

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-cloud-run-url.a.run.app` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

SPA routing is handled by `frontend/public/_redirects` (`/* /index.html 200`).

---

## Backend — Google Cloud Run (primary)

See `docs/DEPLOYMENT.md` for the full Cloud Run setup with Workload Identity Federation,
Secret Manager, and CI/CD via GitHub Actions.

**Quick manual deploy:**

```bash
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/guerillagenics-core-engine
gcloud run deploy guerillagenics-core-engine \
  --image gcr.io/$PROJECT_ID/guerillagenics-core-engine \
  --region us-west1 \
  --allow-unauthenticated \
  --set-secrets "SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_KEY=supabase-service-key:latest,ODDS_API_KEY=odds-api-key:latest,GG_API_KEYS=gg-api-keys:latest,OPENWEATHER_API_KEY=openweather-api-key:latest"
```

## Backend — Render.com (alternative)

`backend/render.yaml` is ready to connect as a Render Blueprint. Set secret env vars
(`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ODDS_API_KEY`, etc.) in the Render dashboard
after connecting the repo.

---

## Required Environment Variables

### Backend (`backend/.env.example` for full list)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (never expose to frontend) |
| `ODDS_API_KEY` | Yes | The Odds API key |
| `OPENWEATHER_API_KEY` | Yes | OpenWeatherMap API key |
| `GG_API_KEYS` | Yes | Comma-separated internal API keys |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS origins |

### Frontend (`frontend/.env.example` for full list)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend service URL (no trailing slash) |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for frontend) |

---

## Verify Deployment

```bash
# Backend health check
curl https://your-backend-url/health

# Frontend smoke test
open https://guerillagenics.app
```

See `docs/DEPLOYMENT.md` for CI/CD workflows, rollback procedures, and monitoring.
