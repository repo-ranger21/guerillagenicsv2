import test from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../functions/_lib/summary.js";

test("empty ledger has no win rate", () => {
  const s = summarize([]);
  assert.deepEqual(s, { graded: 0, wins: 0, losses: 0, pushes: 0, voids: 0, winRate: null, units: 0 });
});

test("pushes and voids are counted but excluded from win rate", () => {
  const s = summarize([
    { outcome: "win", units: "0.909" },
    { outcome: "loss", units: "-1.000" },
    { outcome: "win", units: 0.909 },
    { outcome: "push", units: "0" },
    { outcome: "void", units: "0" },
  ]);
  assert.equal(s.graded, 5);
  assert.equal(s.wins, 2);
  assert.equal(s.losses, 1);
  assert.equal(s.winRate, 66.7);
  assert.equal(s.units, 0.82);
});

test("numeric strings from Postgres are handled and unknown outcomes ignored", () => {
  const s = summarize([{ outcome: "win", units: "1.5" }, { outcome: "weird", units: "9" }]);
  assert.equal(s.graded, 1);
  assert.equal(s.units, 1.5);
});
