# GuerillaGenics v2 — Deployment Reference

## Architecture

```
Frontend  →  Cloudflare Pages  (static React/Vite build from frontend/dist)
Backend   →  Render.com        (FastAPI Docker container via backend/render.yaml)
Database  →  Supabase          (Postgres + Auth + Realtime)
```

> **Note:** The FastAPI backend cannot run on Cloudflare Pages (static hosting only).
> Deploy as a separate Render web service using `backend/render.yaml`.

---

## Quick Start — Local Development

```bash
# Backend
cp backend/.env.example backend/.env   # fill in real values
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080

# Frontend (separate terminal — from repo root)
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
| Framework preset | None |
| Build command | `cd frontend && npm run build` |
| Build output directory | `frontend/dist` |
| Root directory | `/` (repo root) |

**Required environment variables in Cloudflare Pages dashboard:**

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-render-app.onrender.com` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

SPA routing is handled by `frontend/public/_redirects` (`/* /index.html 200`).

---

## Backend — Render.com

`backend/render.yaml` is a Render Blueprint. Connect the repo in the Render dashboard,
then set all secret env vars (marked `sync: false`) via the Render environment panel.

**Required secret env vars (set in Render dashboard):**

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key — never expose to frontend |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `ODDS_API_KEY` | Yes | The Odds API key |
| `OPENWEATHER_API_KEY` | Yes | OpenWeatherMap API key |
| `GG_API_KEYS` | Yes | Comma-separated internal API keys |
| `ALLOWED_ORIGINS` | Auto-set | Set to `https://guerillagenics.app,https://www.guerillagenics.app` |
| `ENV` | Auto-set | `production` |
| `LOG_LEVEL` | Auto-set | `INFO` |

**Quick manual deploy (Docker):**

```bash
cd backend
docker build -t guerillagenics-api .
docker run -p 8080:8080 --env-file .env guerillagenics-api
```

---

## Required Environment Variables

### Backend (`backend/.env.example` for full list)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (never expose to frontend) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
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

## Post-Deploy Verification

```bash
# Backend
curl https://your-render-app.onrender.com/health
# Expected: {"status": "ok", "version": "2.0"}

# Frontend
# Open https://your-pages-url.pages.dev
# 1. Page loads without console errors
# 2. Sign In button visible in nav
# 3. Sign up with test email — confirm row in Supabase Auth dashboard
# 4. Needle alerts feed loads (empty is fine — no data yet)
# 5. Futures edge board shows TierGate upgrade prompt for Scout users
```

---

## First Data — Seed Test Records

Run these from the Supabase SQL editor to verify the live data path end-to-end.

```sql
-- Insert a test needle alert
INSERT INTO public.needle_alerts
  (market_id, severity, title, body, edge_bps, min_tier)
VALUES
  (1, 'sharp', 'Test Alert', 'This is a test needle alert.', 250, 'scout');
-- The frontend should show this alert immediately via real-time subscription.

-- Insert a test futures edge row
INSERT INTO public.futures_edges
  (team, sport, cfs_score, model_prob, market_prob, edge_bps, min_tier)
VALUES
  ('Test Team', 'NBA', 0.72, 0.18, 0.14, 400, 'scout');
-- Should appear on the Edge Board page.
```

---

## CI/CD

Push to `main` → GitHub Actions auto-deploys:
- **Frontend** → Cloudflare Pages (guerillagenics.app)
- **Backend** → Render picks up new commits automatically if connected via Blueprint

See `.github/workflows/` for workflow definitions.
