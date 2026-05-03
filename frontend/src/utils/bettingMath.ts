/**
 * bettingMath.ts — GuerillaGenics Futures math utilities
 *
 * The two formulas that separate "I see the edge" from
 * "here's exactly how much to bet and why."
 */

/**
 * Converts American odds to raw implied probability.
 * +200 → 0.333, -150 → 0.600
 */
function americanToImplied(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  }
  return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
}

/**
 * Converts American odds to decimal odds.
 * +200 → 3.0, -150 → 1.667
 */
function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return americanOdds / 100 + 1;
  }
  return 100 / Math.abs(americanOdds) + 1;
}

// ─── FORMULA A ───────────────────────────────────────────────────────────────

/**
 * Vig Removal — Multiplicative Method
 *
 * Sportsbooks inflate every team's implied probability so the board
 * sums above 100%. That excess is the vig — their cut. The multiplicative
 * method strips it proportionally: divide each raw implied prob by the
 * total so the board sums to exactly 1.0.
 *
 * Why this matters: Futures books charge 15–25% vig. If you compare your
 * model against raw implied odds instead of fair odds, you'll systematically
 * underestimate your edge on every bet.
 *
 * Math:
 *   1. raw_i = americanToImplied(odds_i)
 *   2. total = Σ raw_i  →  total > 1.0 (the vig)
 *   3. fair_i = raw_i / total
 *   4. vigPct = ((total − 1) / total) × 100
 *
 * @param oddsDict - { teamName: americanOdds } for every team on the board
 * @returns fairProbs (sum to 1.0) and vigPct (the book's cut, as %)
 *
 * @example
 * removeVigMultiplicative({ Chiefs: -200, Eagles: +400, Ravens: +600 })
 * // → { fairProbs: { Chiefs: 0.563, Eagles: 0.281, Lions: 0.156 }, vigPct: 8.4 }
 */
export function removeVigMultiplicative(
  oddsDict: Record<string, number>
): { fairProbs: Record<string, number>; vigPct: number } {
  const entries = Object.entries(oddsDict);
  if (entries.length === 0) {
    return { fairProbs: {}, vigPct: 0 };
  }

  const rawProbs: Record<string, number> = {};
  for (const [team, odds] of entries) {
    rawProbs[team] = americanToImplied(odds);
  }

  const total = Object.values(rawProbs).reduce((sum, p) => sum + p, 0);
  if (total === 0) {
    return { fairProbs: {}, vigPct: 0 };
  }

  const fairProbs: Record<string, number> = {};
  for (const [team, raw] of Object.entries(rawProbs)) {
    fairProbs[team] = Math.round((raw / total) * 1e6) / 1e6;
  }

  const vigPct = Math.round(((total - 1) / total) * 100 * 100) / 100;

  return { fairProbs, vigPct };
}

// ─── FORMULA B ───────────────────────────────────────────────────────────────

/**
 * Annualized EV Calculator
 *
 * Raw EV tells you if a bet is +EV. Annualized EV lets you compare a
 * 5-month Super Bowl bet against a 3-month division bet on equal footing —
 * because capital has a time value. A +18% EV bet resolving in 5 months
 * may beat a +22% EV bet resolving in 3 months when annualized.
 *
 * Math:
 *   1. decimal = americanToDecimal(americanOdds)
 *   2. rawEv = (modelProb × (decimal − 1)) − (1 − modelProb)
 *      Positive = the bet has positive expected return per unit wagered.
 *   3. annualizedGrowth = (1 + rawEv) ^ (365 / days) − 1
 *      Compounds rawEv as if the bet repeated annually.
 *
 * Edge cases:
 *   - rawEv ≤ −1.0: (1 + rawEv) ≤ 0, taking a fractional power is
 *     undefined in the reals. Returns annualizedEv: null with an error.
 *   - days < 1: clamped to 1 to prevent division by zero.
 *
 * @param modelProb - Your model's win probability, 0 to 1
 * @param americanOdds - The line you're getting (e.g. -150, +300)
 * @param daysToResolution - Calendar days until the bet resolves
 * @returns rawEv and annualizedEv as percentages (e.g. 10.45 means 10.45%),
 *          isPositiveEv, and optionally an error string
 *
 * @example
 * futuresEvAnnualized(0.22, 400, 155)
 * // → { rawEv: 10.0, annualizedEv: 24.8, daysToResolution: 155, isPositiveEv: true }
 */
export function futuresEvAnnualized(
  modelProb: number,
  americanOdds: number,
  daysToResolution: number
): {
  rawEv: number;
  annualizedEv: number | null;
  daysToResolution: number;
  isPositiveEv: boolean;
  error?: string;
} {
  const decimal = americanToDecimal(americanOdds);
  const rawEv = modelProb * (decimal - 1) - (1 - modelProb);

  if (rawEv <= -1.0) {
    return {
      rawEv: Math.round(rawEv * 10000) / 100,
      annualizedEv: null,
      daysToResolution,
      isPositiveEv: false,
      error: "Raw EV at or below -100% — annualized growth undefined",
    };
  }

  const safeDays = Math.max(daysToResolution, 1);
  const years = safeDays / 365;
  const annualizedGrowth = Math.pow(1 + rawEv, 1 / years) - 1;

  return {
    rawEv: Math.round(rawEv * 10000) / 100,
    annualizedEv: Math.round(annualizedGrowth * 10000) / 100,
    daysToResolution,
    isPositiveEv: rawEv > 0,
  };
}
