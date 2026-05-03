import { describe, it, expect } from "vitest";
import { removeVigMultiplicative, futuresEvAnnualized } from "./bettingMath";

// ─── removeVigMultiplicative ─────────────────────────────────────────────────

describe("removeVigMultiplicative", () => {
  it("fair probs always sum to 1.0 — two-team market", () => {
    // -110 / -110 is the standard spread market
    // implied(-110) = 110/220 ≈ 0.5238 each → total ≈ 1.0476 (vig)
    const { fairProbs, vigPct } = removeVigMultiplicative({
      TeamA: -110,
      TeamB: -110,
    });
    expect(fairProbs.TeamA).toBeCloseTo(0.5, 4);
    expect(fairProbs.TeamB).toBeCloseTo(0.5, 4);
    expect(vigPct).toBeGreaterThan(0);
    const sum = Object.values(fairProbs).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("fair probs sum to 1.0 — four-team multi-outcome board", () => {
    const board = {
      Chiefs: -200,
      Eagles: +400,
      Ravens: +600,
      Bills: +700,
    };
    const { fairProbs, vigPct } = removeVigMultiplicative(board);
    const sum = Object.values(fairProbs).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
    expect(vigPct).toBeGreaterThan(0);
    expect(Object.keys(fairProbs)).toHaveLength(4);
  });

  it("heavy favorite (-800) gets highest fair probability", () => {
    const { fairProbs, vigPct } = removeVigMultiplicative({
      Favorite: -800,
      Underdog: +500,
    });
    expect(fairProbs.Favorite).toBeGreaterThan(0.8);
    expect(fairProbs.Underdog).toBeLessThan(0.17);
    expect(vigPct).toBeGreaterThan(0);
    const sum = Object.values(fairProbs).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it("longshot (+5000) gets a tiny but non-zero fair probability", () => {
    const { fairProbs } = removeVigMultiplicative({
      Favorite: -400,
      Longshot: +5000,
    });
    expect(fairProbs.Longshot).toBeGreaterThan(0);
    expect(fairProbs.Longshot).toBeLessThan(0.05);
  });

  it("full 32-team NFL Super Bowl board — fair probs sum to 1.0 and vig > 5%", () => {
    const nflBoard: Record<string, number> = {
      Chiefs: -200,
      Eagles: +400,
      Ravens: +600,
      Bills: +700,
    };
    // Fill in 28 more teams as longshots
    for (let i = 1; i <= 28; i++) {
      nflBoard[`Team${i}`] = 2000 + i * 300;
    }

    const { fairProbs, vigPct } = removeVigMultiplicative(nflBoard);
    const sum = Object.values(fairProbs).reduce((a, b) => a + b, 0);

    expect(Object.keys(fairProbs)).toHaveLength(32);
    expect(sum).toBeCloseTo(1.0, 3);
    // Futures books typically charge 10-25% vig — a 32-team board will be higher
    expect(vigPct).toBeGreaterThan(5);
  });

  it("returns empty result and zero vig for empty input", () => {
    const { fairProbs, vigPct } = removeVigMultiplicative({});
    expect(Object.keys(fairProbs)).toHaveLength(0);
    expect(vigPct).toBe(0);
  });
});

// ─── futuresEvAnnualized ─────────────────────────────────────────────────────

describe("futuresEvAnnualized", () => {
  it("returns positive annualized EV for a clearly +EV bet", () => {
    // 30% model prob on +300 odds (raw implied 25%) → +EV
    const result = futuresEvAnnualized(0.3, 300, 155);
    expect(result.isPositiveEv).toBe(true);
    expect(result.rawEv).toBeGreaterThan(0);
    expect(result.annualizedEv).not.toBeNull();
    expect(result.annualizedEv!).toBeGreaterThan(0);
  });

  it("returns negative EV for a clearly -EV bet", () => {
    // 10% model prob, -200 odds (implied ~66.7%) → heavily -EV
    const result = futuresEvAnnualized(0.1, -200, 180);
    expect(result.isPositiveEv).toBe(false);
    expect(result.rawEv).toBeLessThan(0);
  });

  it("handles heavy favorite odds (-800) without error", () => {
    // 92% model prob on -800 (implied ~88.9%) — small positive edge
    const result = futuresEvAnnualized(0.92, -800, 30);
    expect(result.annualizedEv).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it("handles longshot odds (+5000) with 3% model prob → +EV", () => {
    // decimal(+5000) = 51. rawEv = 0.03×50 − 0.97 = 0.53 → +53% raw EV
    const result = futuresEvAnnualized(0.03, 5000, 180);
    expect(result.isPositiveEv).toBe(true);
    expect(result.rawEv).toBeGreaterThan(0);
    expect(result.annualizedEv).not.toBeNull();
  });

  it("same-day resolution (0 days → clamped to 1) produces huge annualized EV", () => {
    // days=0 is clamped to 1; (1+rawEv)^365 is astronomically large for any +EV bet
    const result = futuresEvAnnualized(0.6, -110, 0);
    expect(result.daysToResolution).toBe(0);
    expect(result.annualizedEv).not.toBeNull();
    expect(result.annualizedEv!).toBeGreaterThan(10000); // compounding daily-scale edge
  });

  it("365-day resolution: annualized EV equals raw EV", () => {
    // At exactly 1 year: (1 + rawEv)^(1/1) − 1 = rawEv → both values identical
    const result = futuresEvAnnualized(0.25, 300, 365);
    expect(result.annualizedEv).toBeCloseTo(result.rawEv, 3);
  });

  it("returns error state when rawEv is exactly -1.0 (0% model prob)", () => {
    // rawEv = 0×(decimal-1) − 1 = -1.0 → (1+rawEv)=0 → fractional power undefined
    const result = futuresEvAnnualized(0, -110, 180);
    expect(result.annualizedEv).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.isPositiveEv).toBe(false);
  });

  it("returns EV values as percentages rounded to 2 decimal places", () => {
    const result = futuresEvAnnualized(0.22, 400, 155);
    // Values like 10.45, not 0.1045
    expect(Math.abs(result.rawEv)).toBeGreaterThan(0.1); // percentage not decimal
    expect(result.rawEv).toBe(Math.round(result.rawEv * 100) / 100);
    if (result.annualizedEv !== null) {
      expect(result.annualizedEv).toBe(Math.round(result.annualizedEv * 100) / 100);
    }
  });
});
