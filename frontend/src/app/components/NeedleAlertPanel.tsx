import { StatBlock } from './StatBlock';

interface NeedleAlertPanelProps {
  team: {
    name: string;
    city: string;
  };
  modelPercent: number;
  marketPercent: number;
  edge: number;
  signals: string[];
  eaaPoints: string[];
  onAnalyze?: () => void;
  className?: string;
}

export function NeedleAlertPanel({
  team,
  modelPercent,
  marketPercent,
  edge,
  signals,
  eaaPoints,
  onAnalyze,
  className = '',
}: NeedleAlertPanelProps) {
  return (
    <div
      className={`w-full bg-bg-surface border-l-[4px] border-l-gg-green-500 p-8 relative ${className}`}
      style={{ boxShadow: '0 0 32px rgba(132, 255, 71, 0.08)' }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="label-xs text-gg-green-500 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-gg-green-500 animate-pulse-glow" />
          NEEDLE DETECTED
        </div>
        <div className="font-display text-[48px] text-text-primary leading-none">
          {team.city} {team.name}
        </div>
      </div>

      {/* Signals */}
      <div className="flex flex-wrap gap-2 mb-6">
        {signals.map((signal, i) => (
          <div
            key={i}
            className="px-3 py-1.5 bg-bg-raised border border-border-dim font-mono text-[8px] text-text-secondary"
          >
            {signal}
          </div>
        ))}
      </div>

      {/* Stats Comparison */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <StatBlock
          value={`${modelPercent.toFixed(1)}%`}
          label="MODEL PROBABILITY"
          variant="medium"
          highlighted
        />
        <StatBlock
          value={`${marketPercent.toFixed(1)}%`}
          label="MARKET IMPLIED"
          variant="medium"
        />
      </div>

      {/* EAA Summary */}
      <div className="space-y-3 mb-6">
        {eaaPoints.map((point, i) => (
          <div
            key={i}
            className="pl-4 py-2 border-l-2 border-gg-green-500 font-mono text-[10px] text-text-secondary"
          >
            {point}
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onAnalyze}
        className="px-6 py-3 bg-gg-green-500 text-bg-void label-md hover:bg-gg-green-400 transition-colors"
      >
        VIEW FULL ANALYSIS →
      </button>
    </div>
  );
}
