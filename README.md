# GuerillaGenics

**Show your math.** A sports-betting analytics engine where every pick is
Explainable, Auditable and Actionable (EAA), and every result, including the
misses, goes in a public ledger.

## Status

- The engine (`gg/`) pulls lines, evaluates NFL spread picks, locks them at kickoff
  and grades them, on a daily schedule, against Neon Postgres.
- **The model does not beat closing lines.** Walk-forward backtests over 1,087
  games (2022-2025) show no demonstrated edge. The project's value today is a record
  anyone can audit, not a claim nobody can. Details: [docs/BACKTESTS.md](docs/BACKTESTS.md).
- Public tracking starts with NFL 2026 Week 6. Earlier weeks were testing and are not recorded.
- The new public site is in `site/`. As of 2026-10-27 the domain guerillagenics.app still
  serves the previous site until Cloudflare Pages is repointed (see [docs/OPERATIONS.md](docs/OPERATIONS.md)).

## Documentation

| Read this | For |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit, the data model, the integrity rules |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Setup, secrets, schedules, weekly routine, troubleshooting |
| [docs/METHODOLOGY.md](docs/METHODOLOGY.md) | The model, the gate, and what each constant is based on |
| [docs/BACKTESTS.md](docs/BACKTESTS.md) | Results, how to reproduce them, how they were validated |
| [site/README.md](site/README.md) | The public landing page and its two API functions |

`docs/` also holds futures-era documents (`FORMULAS.md`, `NEEDLE_CRITERIA.md`,
`DATA_SOURCES.md`, the field table in `EAA_STANDARD.md`). They are legacy.

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate      # Python 3.11-3.13
pip install -r requirements.txt
cp .env.example .env.local                             # DATABASE_URL, ODDS_API_KEY
pytest tests/ && ruff check gg/ tests/ scripts/

python -m gg.cli --current --dry-run                   # evaluate this week's picks, write nothing
```

## Check the claims yourself

```bash
python scripts/backtest_nfl.py                         # regenerates docs/BACKTEST_NFL.md
python -m gg.cli snapshot-week --verify                # frozen weekly stats still match their hashes
```

## License

See `LICENSE`. The previous Supabase/FastAPI/React platform is preserved at the git tag `archive/pre-neon`.
