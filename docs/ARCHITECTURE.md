# Architecture

## Shape

```
 GitHub Actions
   daily 10:30 UTC   GG Pipeline        odds -> picks -> grade
   Tuesday 11:00 UTC GG Weekly Snapshot frozen team/player stats  -> snapshots/ (git)
        |
        v
 gg/ (Python engine) ----writes----> Neon Postgres
                                       |  two views only, read-only role gg_site_reader
                                       v
                          Cloudflare Pages: site/ + site/functions/api/*
```

The engine is the only writer. The site is a thin reader. Think of it as a
bank: tellers (the engine) change the books, and the window display (the site)
only shows what the books already say.

## Three rules

1. **Only the engine writes.** `gg/` is the sole writer of `picks_daily` and `pick_results`.
2. **Only two views are public.** `public_pick_feed` and `public_ledger`, exposed through the
   read-only role `gg_site_reader`. `public_pick_feed` shows a pick only after its game kicks off.
3. **Python owns the math.** The site never recomputes a number.

## Pick lifecycle

1. `gg.cli odds` stores line snapshots in `odds_snapshots` (each row: book, side, price, capture time).
2. `gg.cli --current` loads the week's games and team features, models each game, runs the gate,
   and upserts one `picks_daily` row per game. Skipped games get a row too, with the skip reason.
3. At kickoff the pick is frozen. `gg.pipeline.write.PickLockedError` blocks any change, with no override flag.
4. `gg.cli grade` records final scores (`games.home_score/away_score`), then settles each eligible pick into `pick_results`.

## Grading rules

- Flat 1-unit stake at the published odds.
- Ignored: anything before the tracking start (`TRACKING_START` in `gg/pipeline/grade.py`),
  picks logged after kickoff, and skipped rows.
- Every loss carries a post-mortem (database constraint `loss_requires_post_mortem`). The
  automatic one is templated from stored numbers and does not invent a reason.
- Closing line and odds are the last snapshot captured at or before kickoff.

## Data model (`db/migrations/`)

| Table / view | Purpose |
|---|---|
| `sports`, `teams`, `external_ids` | Reference data and ID crosswalks (nflverse, The Odds API) |
| `games` | Schedule, status and scores |
| `nfl_team_features` | Weekly team ratings the model reads |
| `odds_snapshots` | Every line capture. Append-only: a trigger rejects updates and deletes |
| `model_runs`, `ingest_runs` | Audit trail for each run |
| `picks_daily` | One frozen row per game: pick, odds, EVI, Kelly, reasons, audit |
| `pick_results` | Settled outcomes, written only by the grader |
| `public_pick_feed`, `public_ledger` | The only public surface |

## Code map (`gg/`)

| Path | Responsibility |
|---|---|
| `cli.py` | Entry point: `odds`, `grade`, `snapshot-week`, and the default picks mode |
| `season.py` | Season calendar (NFL weeks run Tuesday to Monday); one line per season |
| `pipeline/odds_client.py` | The Odds API pulls |
| `pipeline/nfl_ratings.py`, `ingest_nfl_team_features.py` | Team ratings from nflverse play-by-play |
| `pipeline/model/` | `nfl.py` (constants, cover probability), `shared.py` (EVI, Kelly), `gate.py` (publish decision) |
| `pipeline/run.py`, `snapshot.py`, `write.py`, `load.py` | Orchestration, row assembly, guarded writes, reads |
| `pipeline/grade.py` | Score ingestion and settlement |
| `pipeline/weekly_snapshot.py` | Write-once weekly stats snapshots |
| `formulas/`, `utils/` | Shared betting math |

## Weekly stats snapshots

Upstream data is revised after the fact, so each finished week is copied into
`snapshots/<season>/week_<WW>/` (team and player stats, season-to-date totals, the model's
ratings, games with spreads) with a `MANIFEST.json` of sha256 hashes. A week is written once;
`--verify` flags any later edit. Weeks 1-6 of 2026 are `kind: backfill`, rebuilt from nflverse
after the fact. A spreadsheet view (`GG_<season>_W<WW>_Snapshot.xlsx`) is generated and not committed.
