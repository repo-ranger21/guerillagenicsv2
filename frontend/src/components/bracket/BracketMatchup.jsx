import StatBar from "../shared/StatBar.jsx";
import PulseDot from "../shared/PulseDot.jsx";

export default function BracketMatchup({ rank, team, probability, isTop = false }) {
  const pct = (probability * 100).toFixed(1);
  return (
    <div
      className={`p-4 bg-bg-surface border transition-colors hover:bg-bg-raised ${
        isTop ? "border-l-2 border-l-gg-green-500 border-t border-r border-b border-border-dim" : "border-border-dim"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isTop && <PulseDot size={6} />}
          <span className="font-display text-[18px] text-text-primary">{team}</span>
        </div>
        <span className="font-display text-[20px] text-gg-green-500">{pct}%</span>
      </div>
      <StatBar value={probability * 100} color={isTop ? "var(--gg-green-500)" : "var(--border-active)"} />
      <div className="mt-2 label-xs text-text-muted">#{rank} CHAMPIONSHIP PROB</div>
    </div>
  );
}
