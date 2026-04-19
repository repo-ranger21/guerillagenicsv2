export default function StatBar({ value, max = 100, color = "var(--gg-green-500)" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-1 bg-border-dim w-full">
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
