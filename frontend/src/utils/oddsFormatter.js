export function formatAmerican(odds) {
  if (odds == null || odds === 0) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function formatImpliedProb(prob) {
  if (prob == null) return "—";
  return `${(prob * 100).toFixed(1)}%`;
}

export function formatEdge(edge) {
  if (edge == null) return "—";
  const pct = (edge * 100).toFixed(1);
  return edge > 0 ? `+${pct}%` : `${pct}%`;
}

export function formatKelly(fraction) {
  if (fraction == null || fraction === 0) return "—";
  return `${(fraction * 100).toFixed(2)}%`;
}
