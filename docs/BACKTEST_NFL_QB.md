# Experiment: starting-QB adjustment (walk-forward, 2022-2025)

Games: 1087 (0 QB-id gaps dropped). Fit on 2022-23, test on 2024-25 (n=544). Same ratings, gate, -110 pricing and closing spreads as docs/BACKTEST_NFL.md.

## 1. Fit (training seasons only)

| PRIOR_N | beta | SE | t | Train RMSE |
|---|---|---|---|---|
| 100 | 0.051 | 0.219 | 0.2 | 12.68 |
| 200 | 0.064 | 0.268 | 0.2 | 12.68 |
| 400 | 0.084 | 0.337 | 0.3 | 12.68 |
| 800 | 0.129 | 0.451 | 0.3 | 12.68 |
| 1600 (chosen) | 0.227 | 0.662 | 0.3 | 12.68 |

Beta used per season (expanding window, out of sample): 2022: 0.23, 2023: 0.23, 2024: 0.23, 2025: 1.00.

beta = 1 would mean the QB swing is worth exactly its EPA-implied points. Chosen: PRIOR_N=1600, beta=0.227.

Power check (diagnostic only; uses ALL seasons, so it is in-sample): beta = 1.45 +/- 0.67 (95%). A wide interval that contains both 0 and 1 means the data cannot say whether QB changes matter beyond what the team rating already holds.

## 2. Accuracy (points of margin error)

| Model | Train RMSE | Test RMSE | Test MAE |
|---|---|---|---|
| Base (production) | 12.68 | 13.11 | 10.27 |
| Base + QB adjustment | 12.68 | 12.96 | 10.18 |
| Closing line | 12.28 | 12.44 | 9.67 |

Games where the QB swing is >= 2 pts: 89 total, 74 in the test seasons.

| Subset (swing >= 2 pts) | Base RMSE | +QB RMSE | Line RMSE |
|---|---|---|---|
| Test seasons (n=74) | 15.17 | 14.46 | 13.23 |
| All seasons (train is in-sample) (n=89) | 14.71 | 14.12 | 12.95 |

## 3. Does the adjusted model know anything the line does not?

`result = a + b*line + c*(model - line)`; c > 0 and significant would mean edge.

| Model | Sample | c | SE | t |
|---|---|---|---|---|
| Base | Test 2024-25 | -0.072 | 0.145 | -0.50 |
| Base | All 2022-25 | -0.058 | 0.110 | -0.52 |
| Base + QB | Test 2024-25 | -0.034 | 0.157 | -0.22 |
| Base + QB | All 2022-25 | -0.033 | 0.116 | -0.29 |

## 4. Betting results (gate as in production, flat -110)

| Slice | n | W-L-P | Win % | ROI | 95% CI |
|---|---|---|---|---|---|
| Base, test 2024-25, published | 415 | 206-206-3 | 50.0% | -4.5% | [-13.7, +4.6] |
| Base, all seasons, published | 834 | 404-410-20 | 49.6% | -5.1% | [-11.5, +1.3] |
| Base + QB, test 2024-25, published | 421 | 205-213-3 | 49.0% | -6.3% | [-15.4, +2.8] |
| Base + QB, all seasons, published | 847 | 406-421-20 | 49.1% | -6.1% | [-12.5, +0.2] |

## 5. Reading this

- QB swing coefficient: beta = 0.23 (t = 0.3) on training data.
- A positive t in section 3 on the test seasons is the only evidence of edge that counts; it is -0.22 here. Two seasons of games have low power: a true edge of a couple of ROI points would not show at this sample size.
- Closing lines already price known QB changes, so a QB adjustment is expected to improve ACCURACY (section 2) long before it beats the line.
- Reproduce: `python scripts/backtest_nfl_qb.py`.
