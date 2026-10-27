# Backtests

## Headline

The model does not beat closing lines. Results below come from the generated reports, which
are the source of truth and carry the current numbers:

- [BACKTEST_NFL.md](BACKTEST_NFL.md): the production configuration over 1,087 regular-season games, 2022-2025
- [BACKTEST_NFL_QB.md](BACKTEST_NFL_QB.md): an experiment adding a starting-quarterback adjustment

As of the 2026-10-24 runs: published bets lost about the vig (roughly -5% ROI at flat -110);
the model is less accurate than the closing line; its disagreement with the line has no
significant predictive value. The quarterback adjustment improved accuracy but still showed no edge.

## What is tested

- Walk-forward: a game in week W sees only earlier data. No lookahead.
- The real production code: ratings, EVI, Kelly, and the actual gate.
- Flat -110 pricing against the closing spread (the odds fields in the free dataset are not reliable).
- Constants fit on 2022-23 and scored on 2024-25. Expanding-window for the QB weight.

## Reproduce

```bash
pip install numpy pandas pyarrow requests python-dotenv openpyxl
python scripts/backtest_nfl.py       --out docs/BACKTEST_NFL.md
python scripts/backtest_nfl_qb.py    --out docs/BACKTEST_NFL_QB.md
```

The first run downloads about 100 MB of nflverse data into `.cache/nflverse` (git-ignored).
Output is deterministic: rerunning gives identical reports.

## How the harness itself is validated

`tests/test_gg_pipeline/test_backtest_nfl.py` checks it on synthetic data with known answers:

| Case | Must produce |
|---|---|
| Model equals the line, or has no skill | Only the vig is lost, about -4.5% ROI |
| Residual-shuffle null (shuffle the error around the line) | Centres on the vig |
| Perfect foresight | Large positive ROI, so the script can detect edge |

Do **not** use a shuffle of raw final scores as a null: it breaks the link between line and result
that a line-following strategy depends on.

## Limits

- About 800 published bets has a standard error near 3 ROI points. A real edge of a couple of points
  would not show. "No demonstrated edge" is not "proven no edge".
- Closing lines are the most efficient prices; real bets at earlier or better numbers may differ.
- Injuries other than the starting quarterback are not modelled.

## Next test (not run yet)

Early-week lines versus the closing line, using The Odds API historical snapshots.
Measure whether the model's disagreement with an early line predicts the later move to the
close (closing-line value). Success is defined in advance: a significantly positive effect
(t > 2) on out-of-sample data. Otherwise the conclusion stands.
