export default function EdgeBadge({ edge }) {
  if (edge == null) return null;
  const isValue = edge >= 0.03;
  const isFade  = edge <= -0.03;
  const label   = isValue ? "VALUE" : isFade ? "FADE" : "FAIR";
  const color   = isValue ? "var(--signal-needle)" : isFade ? "var(--signal-fade)" : "var(--text-muted)";
  const bg      = isValue ? "rgba(132,255,71,0.06)" : isFade ? "rgba(239,68,68,0.06)" : "rgba(85,85,85,0.06)";
  const border  = isValue ? "rgba(132,255,71,0.2)"  : isFade ? "rgba(239,68,68,0.2)"  : "rgba(85,85,85,0.15)";

  return (
    <div
      className="inline-flex items-center px-2.5 py-1"
      style={{ backgroundColor: bg, borderLeft: `1px solid ${border}` }}
    >
      <span className="label-xs" style={{ color }}>{label}</span>
    </div>
  );
}
