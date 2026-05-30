/**
 * Canonical betting math — frontend mirror of backend/formulas/betting_math.py.
 *
 * These are the ONLY betting formulas allowed in the frontend, and they exist
 * solely for the rare client-side recompute (e.g. a live what-if tool). The
 * authoritative Kelly/EVI for a pick are computed once in Python and shipped in
 * the DTO — render those, don't recompute them. The bankroll slider does plain
 * multiplication (bankroll × kellyFractional), not these functions.
 *
 * Same convention as Python: `amToDecimal` returns the NET profit multiplier b
 * (full decimal odds would be b + 1). Round only at the edges — nothing here
 * rounds. Parity with Python is enforced by shared/betting_vectors.json via
 * bettingMath.test.ts.
 */

// ─── Canonical exports (mirrored in backend/formulas/betting_math.py) ────────

/** American odds → net profit multiplier b (decimalOdds − 1). */
export function amToDecimal(american: number): number {
  return american > 0 ? american / 100 : 100 / Math.abs(american);
}

/** American odds → break-even (implied) probability. */
export function impliedProb(american: number): number {
  return american > 0
    ? 100 / (american + 100)
    : Math.abs(american) / (Math.abs(american) + 100);
}

/**
 * Full Kelly fraction of bankroll. Floors at 0 — never bet a negative edge.
 * Written as p − q/b (not (b·p − q)/b): same algebra, but the simplified form
 * matches the Python IEEE-754 result to within the vector tolerance.
 */
export function kelly(p: number, american: number): number {
  const b = amToDecimal(american);
  const q = 1 - p;
  return Math.max(0, p - q / b);
}

/** Expected Value Index: expected profit per unit staked, as a percent. */
export function evi(p: number, american: number): number {
  const b = amToDecimal(american);
  const q = 1 - p;
  return (p * b - q) * 100;
}

// ─── Private helpers used only by the two downstream exports below ───────────

/**
 * Full decimal odds (b + 1) — used by futuresEvAnnualized only.
 * NOT the same as amToDecimal: this returns net + 1, rounded to nothing.
 * Do not use inside the canonical four functions above.
 */
function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return americanOdds / 100 + 1;
  }
  return 100 / Math.abs(americanOdds) + 1;
}

// ─── Downstream exports (kept for existing app + test coverage) ──────────────

/**
 * Vig Removal — Multiplicative Method
 *
 * Strips the book's vig proportionally so the board sums to exactly 1.0.
 *   fair_i = raw_i / Σraw_i
 *   vigPct  = ((Σraw − 1) / Σraw) × 100
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
    rawProbs[team] = impliedProb(odds);
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

/**
 * Annualized EV Calculator
 *
 * Raw EV tells you if a bet is +EV. Annualized EV lets you compare bets of
 * different durations on equal footing.
 *   rawEv           = modelProb × (decimal − 1) − (1 − modelProb)
 *   annualizedGrowth = (1 + rawEv) ^ (365 / days) − 1
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
