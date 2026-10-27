# Operations

## Configuration

| Variable | Where | Used by |
|---|---|---|
| `DATABASE_URL` | `.env.local`, GitHub secret | Engine (full rights) |
| `ODDS_API_KEY` | `.env.local`, GitHub secret | Odds and scores |
| `SLACK_WEBHOOK` | GitHub secret (optional) | Failure alert |
| `DATABASE_URL_READONLY` | Cloudflare Pages secret | Site, role `gg_site_reader` |

Never commit `.env.local`. `.gitleaks.toml` and the CI secret-scan job guard against it.

## First-time setup checklist

1. Apply `db/migrations/0001` to `0009` in the Neon SQL editor, in order. Create the role
   `gg_site_reader` before `0008`, or rerun `0008` afterwards.
2. Add the GitHub secrets above (the two required ones are `DATABASE_URL` and `ODDS_API_KEY`).
3. Run the `GG Pipeline` workflow manually with `dry_run` checked, and read the output.
4. Cloudflare Pages: set the project root to `site`, leave the build command empty,
   set the output directory to `/`, and add `DATABASE_URL_READONLY`.
   This is what repoints guerillagenics.app to the new site.
5. Optional: set `SUBSCRIBE_URL` in `site/config.js`.

## Schedules

| Workflow | When | What |
|---|---|---|
| `GG Pipeline` | Daily, 10:30 UTC | Season gate, then odds, picks, grade. Silent outside configured seasons. |
| `GG Weekly Snapshot` | Tuesday, 11:00 UTC | Freezes the latest fully completed week and commits it to `snapshots/` |
| `CI` | Pull requests and pushes to main | ruff, pytest, site tests, gitleaks |

Every step is idempotent. A failed run can simply be re-run.

## Weekly routine

- Team ratings come from `python -m gg.pipeline.ingest_nfl_team_features --prior-season 2025 --current-season 2026`.
  It is **not scheduled yet**, so run it each Tuesday after the games finish or ratings go stale.
- `python -m gg.cli snapshot-week --verify` checks that every frozen week still matches its hashes.

## Each new season

Add one line to `WEEK1_TUESDAY` in `gg/season.py`. Update `TRACKING_START` in
`gg/pipeline/grade.py` only if the public record is meant to restart.

## Local commands

```bash
python -m gg.cli odds --dry-run
python -m gg.cli --current --dry-run
python -m gg.cli grade --dry-run
python -m gg.cli snapshot-week --season 2026
```

`--dry-run` executes every statement against the database and then rolls back, so it proves
the writes would succeed without keeping them.

## Troubleshooting

- **`pip install` fails building `psycopg2-binary`:** your Python is too new for its prebuilt
  wheels. Use Python 3.11 to 3.13 (CI uses 3.11), or install only what the backtests need:
  `numpy pandas pyarrow requests python-dotenv openpyxl`.
- **Odds API credits:** the free plan has 500 a month. The historical-odds endpoints need a paid plan.
- **A pick shows as locked:** the game has started. That is the intended behavior.
- **Ratings look stale:** run the team-features ingest (see Weekly routine).
