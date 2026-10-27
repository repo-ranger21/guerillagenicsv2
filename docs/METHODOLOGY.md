# Methodology

Source of truth for every number below is the code. The constants live in
`gg/pipeline/model/nfl.py` and `gg/pipeline/model/gate.py`; if this page and the
code disagree, the code wins.

## EAA

- **Explainable:** the reason text is generated from stored numbers, never freehand.
- **Auditable:** every pick traces to its inputs (`model_runs`, `ingest_runs`, `odds_snapshots`) and is reproducible.
- **Actionable:** each row carries odds, EVI, a Kelly size, or an explicit skip with a reason.

## The model (NFL spreads)

1. **Team rating** (`pipeline/nfl_ratings.py`). Net EPA per play (offense minus defense) times plays
   per game, in points above average. A season's rating blends toward the league mean between seasons
   (`CARRY`), and shifts toward current-season play as games accumulate at weight `games / (games + K)`.
2. **Margin.** Home rating minus away rating plus home-field advantage (`HFA`).
3. **Cover probability.** The margin is treated as a normal distribution with standard deviation
   `SIGMA`; the probability that the bet side covers the spread comes from that distribution.
   Monte Carlo (`N` simulations) is checked against the closed form in the tests.
4. **EVI.** Expected value per unit staked at the offered price: `(p_win * profit - p_loss) * 100`.
   Pushes return the stake.
5. **Kelly.** Half-Kelly on the non-push outcomes, capped at `MAX_KELLY_PCT`. Kelly is like sizing a
   bet to your confidence in a map: if the map is wrong, a full-size bet takes you off a cliff, so we
   size down and cap.
6. **Side.** The side with the higher EVI is the candidate pick; the gate then decides whether to publish it.

## The gate (`gate.py`)

A pick is published only if all hold:

- Both teams have features and the odds are fresh (default limit 180 minutes).
- The model and market margins differ by no more than `MAX_DISAGREEMENT_PTS`.
  A large gap means the model is missing information, not that it found edge.
- EVI is above `MIN_EVI_PCT`.

Otherwise the game is stored as a skipped row with the reason.

## Constants and where they come from

| Constant | Basis |
|---|---|
| `HFA`, `SIGMA` | Fit on 2022-23 in the walk-forward backtest ([BACKTESTS.md](BACKTESTS.md)) |
| `CARRY`, `K` | Kept at the originals; the fitted values score the same out of sample |
| `MAX_DISAGREEMENT_PTS` | Risk cap. Backtest shows large gaps lose, supports the cap on the high side only |
| `MAX_KELLY_PCT`, `MIN_EVI_PCT` | Judgment calls, stated as such. No EVI bucket clears break-even |

## Known limitations

- The normal model under-weights key margins (3 and 7 occur far more often than a normal predicts).
- Stated EVI is a model output. In backtests it is far higher than realised ROI, so it must not be read as measured edge.
- Ratings use team EPA only. No injury or personnel adjustment is in production.
