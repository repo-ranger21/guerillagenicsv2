# Deployment Guide

## Architecture Overview

```
GitHub → CI (ruff + pytest) → Cloud Build → Cloud Run (backend)
                            → Cloudflare Pages (frontend)
Nightly cron → Cloud Run Job (ingest orchestrator)
```

---

## Prerequisites

- GCP project with Cloud Run, Cloud Build, and Secret Manager APIs enabled
- Workload Identity Federation pool configured (no service account JSON keys)
- Supabase project with schema from `backend/db/schema.sql` applied
- Cloudflare Pages project named `guerillagenics-frontend`
- GitHub repository secrets set (see below)

---

## Required GitHub Secrets

| Secret | Description |
|---|---|
| `GCP_PROJECT_ID` | GCP project ID |
| `GCP_WIF_PROVIDER` | WIF provider resource name |
| `GCP_WIF_SERVICE_ACCOUNT` | Service account email for WIF |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `VITE_API_URL` | Backend Cloud Run URL (set after first deploy) |

All sensitive runtime values (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ODDS_API_KEY`, etc.) are stored in **GCP Secret Manager** and injected into Cloud Run via `--set-secrets`. They are never stored in GitHub secrets.

---

## Initial Setup

### 1. Apply Database Schema

```bash
psql "$SUPABASE_DB_URL" < backend/db/schema.sql
```

### 2. Seed ELO Ratings

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python scripts/seed_elo.py --sport all --season 2024-25
```

### 3. Deploy Backend (Manual First Deploy)

```bash
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/guerillagenics-core-engine
gcloud run deploy guerillagenics-core-engine \
  --image gcr.io/$PROJECT_ID/guerillagenics-core-engine \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets "SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_KEY=supabase-service-key:latest,ODDS_API_KEY=odds-api-key:latest,GG_API_KEYS=gg-api-keys:latest,SLACK_WEBHOOK=slack-webhook:latest,OPENWEATHER_API_KEY=openweather-api-key:latest"
```

### 4. Deploy Frontend

```bash
cd frontend
npm ci
VITE_API_URL=https://YOUR-CLOUD-RUN-URL npm run build
npx wrangler pages deploy dist --project-name guerillagenics-frontend
```

---

## CI/CD Workflows

### `ci.yml` — Pull Request Checks

Runs on every PR to `main` or `develop`:
1. **backend-test**: Python 3.11, installs deps, runs `ruff check` + `pytest --cov=backend`
2. **frontend-test**: Node 20, `npm ci`, ESLint, `vite build`

Both must pass before merge.

### `deploy-backend.yml` — Backend Auto-Deploy

Triggers on push to `main` when files in `backend/**` change:
1. Authenticate via Workload Identity Federation
2. `gcloud builds submit` — builds Docker image tagged with `$SHA` and `latest`
3. `gcloud run deploy` — deploys to `guerillagenics-core-engine` in `us-west1`
4. Smoke test: `curl -f $SERVICE_URL/health`

### `deploy-frontend.yml` — Frontend Auto-Deploy

Triggers on push to `main` when files in `frontend/**` change:
1. `npm ci && npm run build` with `VITE_API_URL` from secrets
2. `cloudflare/wrangler-action@v3` deploys `dist/` to Cloudflare Pages

### `nightly-ingest.yml` — Data Refresh

Scheduled: `0 10 * * *` (06:00 ET daily)  
Manual trigger: `workflow_dispatch` with optional `sport` input

Runs `python backend/ingest/orchestrator.py --sport all` inside the Cloud Run container. On failure, POSTs to `SLACK_WEBHOOK`.

---

## Rollback

```bash
# List revisions
gcloud run revisions list --service guerillagenics-core-engine --region us-west1

# Route traffic back to previous revision
gcloud run services update-traffic guerillagenics-core-engine \
  --to-revisions REVISION_NAME=100 \
  --region us-west1
```

---

## Environment Variables Reference

See `backend/.env.example` for the full list with descriptions.

For local development, copy and populate:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env  # set VITE_API_URL=http://localhost:8080
```

---

## Health Check

```bash
curl https://YOUR-CLOUD-RUN-URL/health
# {"status":"ok","version":"2.0"}
```

The deploy workflow fails the deployment if this returns non-200.

---

## Monitoring

- Cloud Run logs: GCP Console → Cloud Run → guerillagenics-core-engine → Logs
- Structured logs use `structlog` JSON format; query by `event`, `sport`, `pipeline_step`
- Nightly ingest failures → Slack `#gg-alerts` channel
