# GuerillaGenics — public landing page (Phase 0)

Static page + two read-only API functions (Cloudflare Pages Functions) that read
from Neon through a restricted role. No mock data: if the database is down the
page says so.

```
site/
  index.html, styles.css, app.js, config.js   static page (all DB text via textContent)
  functions/api/picks.js    GET /api/picks   -> latest published picks (post-kickoff only)
  functions/api/ledger.js   GET /api/ledger  -> graded results + summary
  functions/_lib/           db helper + pure summarize() (unit-tested)
  _headers                  CSP + cache headers
db/migrations/0008_pick_results_and_public_feed.sql
```

## One-time setup
1. **Neon console -> Roles -> New role** `gg_site_reader`. Copy its connection string.
2. Run `db/migrations/0008_pick_results_and_public_feed.sql` in the Neon SQL editor
   (it creates `pick_results` + two views and grants the role SELECT on the **views only**).
   If you ran it before creating the role, run it again after.
3. Cloudflare Pages: create a project (e.g. `guerillagenics-site`) and add the secret
   `DATABASE_URL_READONLY` = the `gg_site_reader` connection string.
4. Optional: set `SUBSCRIBE_URL` in `config.js` (Beehiiv signup page). The button stays
   hidden until it is set.

## Run / test
```
cd site && npm install
npm test            # unit tests (node --test)
npm run dev         # wrangler pages dev (needs DATABASE_URL_READONLY in .dev.vars)
npm run deploy      # wrangler pages deploy . --project-name=guerillagenics-site
```
Deploying to the existing `guerillagenics` Pages project would replace what is served
at guerillagenics.app; do that deliberately when you are ready to switch the domain.

## Recording results (tracking begins NFL Week 6, 2026)
Insert one `pick_results` row per graded pick (`outcome` win/loss/push/void, `units`,
`source_url` = link to the timestamped public post). A loss requires a `post_mortem`
(enforced by a CHECK constraint). Weeks 1-5 were testing and are intentionally not recorded.

## Why picks are hidden until kickoff
`public_pick_feed` only exposes published picks whose game has started, so a live
(paid-tier) pick can never leak through the public API. The gate lives in the view,
not in app code.
