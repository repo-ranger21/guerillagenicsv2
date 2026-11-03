# NFL spread backtest (walk-forward, 2022-2025)

Games: 1087 regular-season games. Production constants: CARRY=0.4, K=10, HFA=2.15, SIGMA=12.65. Flat -110 pricing, 1 unit per bet, closing spread. Break-even win rate 52.38%.

## 1. Does the model beat the market on accuracy?

- MAE vs final margin: model **10.01**, closing line **9.49**
- RMSE vs final margin: model 12.90, closing line 12.36
- Mean |model - line|: 2.70 pts

Information test: `result = a + b*line + c*(model - line)`. If the model adds edge, c is positive and significant; c = 0 means the line already contains what the model knows.

- b (line) = 1.07 (SE 0.07); **c (model - line) = -0.058 (SE 0.110, t = -0.52)**

## 2. Production configuration as-is (gate = 7.0 pts, EVI floor 0)

| Slice | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| Every game, higher-EVI side | 1087 | 523-535-29 | 49.4% | -5.5% | [-11.1, +0.1] |
| Published (passes gate) | 834 | 404-410-20 | 49.6% | -5.1% | [-11.5, +1.3] |
| Skipped by gate | 253 | 119-125-9 | 48.8% | -6.6% | [-18.2, +4.9] |
| Published, 2022 | 211 | 103-100-8 | 50.7% | -3.0% | [-15.7, +9.6] |
| Published, 2023 | 208 | 95-104-9 | 47.7% | -8.5% | [-21.2, +4.2] |
| Published, 2024 | 206 | 108-95-3 | 53.2% | +1.5% | [-11.4, +14.5] |
| Published, 2025 | 209 | 98-111-0 | 46.9% | -10.5% | [-23.4, +2.5] |

### By model-vs-line gap (all games)

| Gap (pts) | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| 0-1 | 247 | 121-116-10 | 51.1% | -2.4% | [-14.1, +9.3] |
| 1-2 | 262 | 128-128-6 | 50.0% | -4.4% | [-15.9, +7.0] |
| 2-3 | 208 | 98-105-5 | 48.3% | -7.6% | [-20.5, +5.2] |
| 3-5 | 226 | 103-118-5 | 46.6% | -10.8% | [-23.1, +1.5] |
| 5-7 | 87 | 51-34-2 | 60.0% | +14.2% | [-5.3, +33.8] |
| 7-+ | 57 | 22-34-1 | 39.3% | -24.6% | [-48.8, -0.3] |

### By stated EVI (all games)

| EVI | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| <..0% | 196 | 97-91-8 | 51.6% | -1.4% | [-14.6, +11.7] |
| 0..5% | 210 | 106-99-5 | 51.7% | -1.3% | [-14.0, +11.5] |
| 5..10% | 196 | 94-96-6 | 49.5% | -5.4% | [-18.6, +7.8] |
| 10..20% | 258 | 116-135-7 | 46.2% | -11.5% | [-22.9, +0.0] |
| 20..+% | 227 | 110-114-3 | 49.1% | -6.2% | [-18.5, +6.2] |

Mean stated EVI on published bets: +12.1%. Realised ROI on the same bets: -5.1%.

## 3. Calibration sweep (fit 2022-23, test 2024-25)

Parameters minimise squared margin error on the training seasons only (accuracy, not betting profit, to avoid fitting noise), then are scored once on the held-out seasons.

| Config | CARRY | K | HFA | Train RMSE | Test RMSE | Test MAE |
|---|---|---|---|---|---|---|
| Production | 0.4 | 10 | 2.15 | 12.68 | 13.11 | 10.27 |
| Fit on 2022-23 | 0.2 | 16 | 2.5 | 12.62 | 13.14 | 10.27 |
| Closing line (benchmark) | - | - | - | 12.28 | 12.44 | 9.67 |

Residual sigma: fitted model 12.63 (train), closing line 12.27 (train); production uses 12.65.

Held-out seasons (2024-25), same gate:

| Slice | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| Published, fitted config | 424 | 208-212-4 | 49.5% | -5.4% | [-14.5, +3.7] |
| Published, production config | 415 | 206-206-3 | 50.0% | -4.5% | [-13.7, +4.6] |

## 4. Reading this

- The model's disagreement with the line does **not** predict results at conventional significance. Treat stated EVI as unvalidated; do not market it as an edge.
- The gate thresholds (7.0 pt gap, EVI >= 0) should be judged against the tables above, not prior documentation.
- Closing lines are the most efficient price available; real pre-kickoff lines can differ in either direction.
- Reproduce: `python scripts/backtest_nfl.py`.
