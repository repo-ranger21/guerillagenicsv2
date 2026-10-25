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
| Every game, higher-EVI side | 1087 | 521-537-29 | 49.2% | -5.8% | [-11.4, -0.2] |
| Published (passes gate) | 830 | 402-408-20 | 49.6% | -5.1% | [-11.5, +1.3] |
| Skipped by gate | 257 | 119-129-9 | 48.0% | -8.1% | [-19.6, +3.4] |
| Published, 2022 | 207 | 101-98-8 | 50.8% | -3.0% | [-15.8, +9.8] |
| Published, 2023 | 208 | 95-104-9 | 47.7% | -8.5% | [-21.2, +4.2] |
| Published, 2024 | 206 | 108-95-3 | 53.2% | +1.5% | [-11.4, +14.5] |
| Published, 2025 | 209 | 98-111-0 | 46.9% | -10.5% | [-23.4, +2.5] |

### By model-vs-line gap (all games)

| Gap (pts) | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| 0-1 | 248 | 120-118-10 | 50.4% | -3.6% | [-15.3, +8.1] |
| 1-2 | 261 | 124-131-6 | 48.6% | -7.0% | [-18.5, +4.5] |
| 2-3 | 209 | 98-106-5 | 48.0% | -8.1% | [-20.9, +4.7] |
| 3-5 | 225 | 106-114-5 | 48.2% | -7.8% | [-20.2, +4.5] |
| 5-7 | 84 | 50-32-2 | 61.0% | +16.0% | [-3.8, +35.8] |
| 7-+ | 60 | 23-36-1 | 39.0% | -25.2% | [-48.7, -1.6] |

### By stated EVI (all games)

| EVI | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| <..0% | 197 | 96-93-8 | 50.8% | -2.9% | [-16.0, +10.2] |
| 0..5% | 209 | 104-100-5 | 51.0% | -2.6% | [-15.4, +10.2] |
| 5..10% | 195 | 91-98-6 | 48.1% | -7.8% | [-21.0, +5.4] |
| 10..20% | 259 | 119-133-7 | 47.2% | -9.6% | [-21.1, +1.9] |
| 20..+% | 227 | 111-113-3 | 49.6% | -5.3% | [-17.7, +7.0] |

Mean stated EVI on published bets: +12.0%. Realised ROI on the same bets: -5.1%.

## 3. Calibration sweep (fit 2022-23, test 2024-25)

Parameters minimise squared margin error on the training seasons only (accuracy, not betting profit, to avoid fitting noise), then are scored once on the held-out seasons.

| Config | CARRY | K | HFA | Train RMSE | Test RMSE | Test MAE |
|---|---|---|---|---|---|---|
| Production | 0.4 | 10 | 2.15 | 12.70 | 13.10 | 10.24 |
| Fit on 2022-23 | 0.2 | 16 | 2.15 | 12.64 | 13.12 | 10.22 |
| Closing line (benchmark) | - | - | - | 12.28 | 12.44 | 9.67 |

Residual sigma: fitted model 12.65 (train), closing line 12.27 (train); production uses 12.65.

Held-out seasons (2024-25), same gate:

| Slice | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| Published, fitted config | 424 | 207-213-4 | 49.3% | -5.9% | [-14.9, +3.2] |
| Published, production config | 415 | 206-206-3 | 50.0% | -4.5% | [-13.7, +4.6] |

## 4. Reading this

- The model's disagreement with the line does **not** predict results at conventional significance. Treat stated EVI as unvalidated; do not market it as an edge.
- The gate thresholds (7.0 pt gap, EVI >= 0) should be judged against the tables above, not prior documentation.
- Closing lines are the most efficient price available; real pre-kickoff lines can differ in either direction.
- Reproduce: `python scripts/backtest_nfl.py`.
