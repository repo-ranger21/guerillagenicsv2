# NFL spread backtest (walk-forward, 2022-2025)

Games: 1087 regular-season games. Production constants: CARRY=0.4, K=10, HFA=1.8, SIGMA=13.2. Flat -110 pricing, 1 unit per bet, closing spread. Break-even win rate 52.38%.

## 1. Does the model beat the market on accuracy?

- MAE vs final margin: model **10.00**, closing line **9.49**
- RMSE vs final margin: model 12.91, closing line 12.36
- Mean |model - line|: 2.66 pts

Information test: `result = a + b*line + c*(model - line)`. If the model adds edge, c is positive and significant; c = 0 means the line already contains what the model knows.

- b (line) = 1.07 (SE 0.07); **c (model - line) = -0.058 (SE 0.110, t = -0.52)**

## 2. Production configuration as-is (gate = 7.0 pts, EVI floor 0)

| Slice | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| Every game, higher-EVI side | 1087 | 525-533-29 | 49.6% | -5.1% | [-10.7, +0.5] |
| Published (passes gate) | 829 | 398-410-21 | 49.3% | -5.8% | [-12.2, +0.6] |
| Skipped by gate | 258 | 127-123-8 | 50.8% | -2.9% | [-14.4, +8.6] |
| Published, 2022 | 208 | 101-99-8 | 50.5% | -3.5% | [-16.2, +9.3] |
| Published, 2023 | 213 | 96-107-10 | 47.3% | -9.3% | [-21.8, +3.3] |
| Published, 2024 | 201 | 107-91-3 | 54.0% | +3.1% | [-10.0, +16.2] |
| Published, 2025 | 207 | 94-113-0 | 45.4% | -13.3% | [-26.3, -0.3] |

### By model-vs-line gap (all games)

| Gap (pts) | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| 0-1 | 252 | 127-115-10 | 52.5% | +0.2% | [-11.4, +11.7] |
| 1-2 | 261 | 127-126-8 | 50.2% | -4.0% | [-15.5, +7.4] |
| 2-3 | 212 | 100-109-3 | 47.8% | -8.5% | [-21.3, +4.2] |
| 3-5 | 220 | 102-112-6 | 47.7% | -8.8% | [-21.2, +3.7] |
| 5-7 | 83 | 46-36-1 | 56.1% | +7.0% | [-13.4, +27.4] |
| 7-+ | 59 | 23-35-1 | 39.7% | -23.9% | [-47.7, -0.0] |

### By stated EVI (all games)

| EVI | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| <..0% | 199 | 104-88-7 | 54.2% | +3.3% | [-9.7, +16.3] |
| 0..5% | 233 | 108-118-7 | 47.8% | -8.5% | [-20.6, +3.6] |
| 5..10% | 208 | 98-104-6 | 48.5% | -7.2% | [-20.0, +5.6] |
| 10..20% | 249 | 118-125-6 | 48.6% | -7.1% | [-18.9, +4.6] |
| 20..+% | 198 | 97-98-3 | 49.7% | -5.0% | [-18.2, +8.3] |

Mean stated EVI on published bets: +11.2%. Realised ROI on the same bets: -5.8%.

## 3. Calibration sweep (fit 2022-23, test 2024-25)

Parameters minimise squared margin error on the training seasons only (accuracy, not betting profit, to avoid fitting noise), then are scored once on the held-out seasons.

| Config | CARRY | K | HFA | Train RMSE | Test RMSE | Test MAE |
|---|---|---|---|---|---|---|
| Production | 0.4 | 10 | 1.8 | 12.71 | 13.10 | 10.23 |
| Fit on 2022-23 | 0.2 | 16 | 2.15 | 12.64 | 13.12 | 10.22 |
| Closing line (benchmark) | - | - | - | 12.28 | 12.44 | 9.67 |

Residual sigma: fitted model 12.65 (train), closing line 12.27 (train); production uses 13.2.

Held-out seasons (2024-25), same gate:

| Slice | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| Published, fitted config | 424 | 207-213-4 | 49.3% | -5.9% | [-14.9, +3.2] |
| Published, production config | 408 | 201-204-3 | 49.6% | -5.2% | [-14.5, +4.0] |

## 4. Reading this

- The model's disagreement with the line does **not** predict results at conventional significance. Treat stated EVI as unvalidated; do not market it as an edge.
- The gate thresholds (7.0 pt gap, EVI >= 0) should be judged against the tables above, not prior documentation.
- Closing lines are the most efficient price available; real pre-kickoff lines can differ in either direction.
- Reproduce: `python scripts/backtest_nfl.py`.
