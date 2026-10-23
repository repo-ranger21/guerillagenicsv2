# GuerillaGenics

**Show your math.** A sports-betting analytics platform where every pick is
Explainable, Auditable and Actionable (EAA) — and every result, including the
misses, is public. Live at https://guerillagenics.app.

The model does **not** beat closing lines today. That is disclosed on the site;
the point of the project is a record anyone can audit, not a claim nobody can.

## How it fits together

```
 GitHub Actions (daily cron)
   python -m gg.cli odds   ──►  lines          ┐
   python -m gg.cli --current ► picks          ├─►  Neon Postgres
   python -m gg.cli grade  ──►  scores+results ┘      picks_daily, pick_results,
                                                      model_runs, ingest_runs, ...
                                                            │  (only via 2 views,
                                                            │   read-only role gg_site_reader)
                                                            ▼
                              Cloudflare Pages  site/  +  site/functions/api/*
```

Three rules keep it honest:

1. **Only the engine writes.** `gg/` is the sole writer of `picks_daily` and `pick_results`.
2. **Only two views are public.** `public_pick_feed` (a pick appears only after its game kicks off) and `public_ledger`.
3. **Python owns the math.** The site never recomputes anything.

Pick integrity is enforced in code, not by convention:

- A pick can only be created or changed **before kickoff** (`PickLockedError`; no override flag).
- Grading ignores anything before the tracking start (**NFL 2026 Week 6**), picks logged after kickoff, and skipped rows.
- Every loss carries a post-mortem (database constraint); the automatic one states the miss from stored numbers.

## Layout

| Path | What it is |
|---|---|
| `gg/` | The engine: `cli.py`, `season.py`, `pipeline/` (odds, features, model, run, write, grade) |
| `gg/formulas`, `gg/utils` | Shared betting math (Kelly, EVI, Elo, ...) used by the pipeline |
| `db/migrations/` | Neon schema, applied by hand in the Neon SQL editor, in order |
| `site/` | Static landing page + Pages Functions (see `site/README.md`) |
| `shared/betting_vectors.json` | Reference vectors the Python tests check |
| `tests/` | pytest suite (math, grading, season calendar, kickoff lock, schema contract) |
| `docs/` | Methodology notes; the futures-era docs are legacy |

The previous Supabase/FastAPI/React platform is preserved at the git tag
`archive/pre-neon`.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.local        # DATABASE_URL (Neon), ODDS_API_KEY
pytest tests/ && ruff check gg/ tests/

python -m gg.cli odds --dry-run
python -m gg.cli --current --dry-run
python -m gg.cli grade --dry-run
```

`--dry-run` executes every statement against the real database and then rolls
back, so it proves the writes would succeed without keeping them.

## Configuration

| Variable | Used by |
|---|---|
| `DATABASE_URL` | engine (full rights), GitHub secret |
| `ODDS_API_KEY` | odds + scores, GitHub secret |
| `SLACK_WEBHOOK` | optional failure alert, GitHub secret |
| `DATABASE_URL_READONLY` | Cloudflare Pages secret (`gg_site_reader`) |

Each season needs one line in `gg/season.py` (`WEEK1_TUESDAY`). The scheduled
job stays quiet outside configured seasons.

## License

See `LICENSE`.

## Weekly stats snapshots

Every Tuesday (after Monday Night Football) `GG Weekly Snapshot` freezes the finished week
under `snapshots/<season>/week_<WW>/`: team and player stats for the week, season-to-date
totals, the model's team ratings, games with closing spreads, and a `MANIFEST.json` of sha256
hashes. A week is write-once; `python -m gg.cli snapshot-week --verify` flags any edit.
Weeks 1-6 of 2026 are `kind: backfill` (rebuilt from nflverse after the fact). The spreadsheet
`GG_<season>_W<WW>_Snapshot.xlsx` is a generated view, attached to each workflow run.

Backtest of the model: [docs/BACKTEST_NFL.md](docs/BACKTEST_NFL.md) (`python scripts/backtest_nfl.py`).
