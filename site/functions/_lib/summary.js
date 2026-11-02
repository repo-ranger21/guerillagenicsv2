const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

// Summarise ledger rows. Pushes/voids are counted but excluded from win rate.
export function summarize(rows) {
  let wins = 0, losses = 0, pushes = 0, voids = 0, units = 0;
  for (const r of rows) {
    switch (r.outcome) {
      case "win": wins++; break;
      case "loss": losses++; break;
      case "push": pushes++; break;
      case "void": voids++; break;
      default: continue;
    }
    units += num(r.units) ?? 0;
  }
  const decided = wins + losses;
  return {
    graded: wins + losses + pushes + voids,
    wins, losses, pushes, voids,
    winRate: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null,
    units: Math.round(units * 100) / 100,
  };
}
