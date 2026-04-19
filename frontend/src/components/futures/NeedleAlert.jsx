import PulseDot from "../shared/PulseDot.jsx";
import StatDisplay from "../shared/StatDisplay.jsx";

export default function NeedleAlert({ data, onAnalyze }) {
  if (!data) return null;
  const { team, modelPercent, marketPercent, edge, signals = [], eaaPoints = [] } = data;

  return (
    <div
      className="w-full bg-bg-surface border-l-[4px] border-l-gg-green-500 p-8 relative"
      style={{ boxShadow: "0 0 32px rgba(132, 255, 71, 0.08)" }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="label-xs text-gg-green-500 mb-4 flex items-center gap-2">
          <PulseDot size={8} />
          NEEDLE DETECTED
        </div>
        <div className="font-display text-[48px] text-text-primary leading-none">
          {team?.city} {team?.name}
        </div>
      </div>

      {/* Signal tags */}
      {signals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {signals.map((s, i) => (
            <div
              key={i}
              className="px-3 py-1.5 bg-bg-raised border border-border-dim font-mono text-[8px] text-text-secondary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Probabilities */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <StatDisplay
          value={`${modelPercent?.toFixed(1)}%`}
          label="MODEL PROBABILITY"
          variant="medium"
          highlighted
        />
        <StatDisplay
          value={`${marketPercent?.toFixed(1)}%`}
          label="MARKET IMPLIED"
          variant="medium"
        />
      </div>

      {/* EAA analysis points */}
      {eaaPoints.length > 0 && (
        <div className="space-y-3 mb-6">
          {eaaPoints.map((point, i) => (
            <div
              key={i}
              className="pl-4 py-2 border-l-2 border-gg-green-500 font-mono text-[10px] text-text-secondary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {point}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAnalyze}
        className="px-6 py-3 bg-gg-green-500 text-bg-void label-md hover:bg-gg-green-400 transition-colors"
      >
        VIEW FULL ANALYSIS →
      </button>
    </div>
  );
}
