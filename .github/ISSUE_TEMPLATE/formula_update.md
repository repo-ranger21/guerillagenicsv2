---
name: Formula Update
about: Propose a change to a prediction formula or its weights
title: "[FORMULA] "
labels: formula, enhancement
assignees: ""
---

## Formula affected

- [ ] FORMULA 01 — GG-ELO
- [ ] FORMULA 02 — NIR (Net Impact Rating)
- [ ] FORMULA 03 — SSC (Schedule Strength)
- [ ] FORMULA 04 — IIS (Injury Impact Score)
- [ ] FORMULA 05 — MDI (Momentum Decay Index)
- [ ] FORMULA 06 — PDS (Playoff DNA Score)
- [ ] FORMULA 07 — EAF (Environmental Adjustment)
- [ ] FORMULA 08 — MID (Market Inefficiency / NEEDLE)
- [ ] FORMULA 09 — MCS (Monte Carlo Simulator)
- [ ] FORMULA 10 — CFS (Composite Futures Score)
- [ ] Kelly Criterion calculator

## Motivation

<!-- Why does this formula need to change? Backtest failure? New data source? -->

## Current behavior

<!-- Describe the current formula logic and what it's getting wrong -->

## Proposed change

<!-- Describe the new formula logic, new parameters, or weight adjustments -->

## Backtest evidence

<!-- 
Reference backtest results from scripts/backtest.py or docs/BACKTEST_RESULTS.md.
Include: season(s) tested, accuracy metric before/after, number of championships predicted.
-->

| Season | Before | After | Delta |
|--------|--------|-------|-------|
| 2022-23 | | | |
| 2023-24 | | | |
| 2024-25 | | | |

## Impact on CFS weights

<!-- If this changes formula output range, will CFS weights need rebalancing? -->

## Risk

- [ ] Low — minor coefficient tweak
- [ ] Medium — changes output range
- [ ] High — changes core formula logic

## Acceptance criteria

- [ ] `pytest backend/tests/test_formulas/` passes
- [ ] Backtest accuracy >= current baseline (see docs/BACKTEST_RESULTS.md)
- [ ] docs/FORMULAS.md updated
- [ ] CHANGELOG.md updated
