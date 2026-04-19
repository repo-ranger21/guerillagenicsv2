import { ConfidenceBadge } from './ConfidenceBadge';
import { StatBar } from './StatBar';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface FuturesCardProps {
  team: {
    name: string;
    city: string;
    logo: string;
    cfsRank: number;
  };
  cfsScore: number;
  modelPercent: number;
  marketOdds: string;
  edge: number;
  kelly: number;
  tier: 'NEEDLE' | 'LOCK' | 'LEAN' | 'WATCH' | 'FADE';
  isNeedle?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FuturesCard({
  team,
  cfsScore,
  modelPercent,
  marketOdds,
  edge,
  kelly,
  tier,
  isNeedle = false,
  onClick,
  className = '',
}: FuturesCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        w-[280px] bg-bg-surface border-l-[1px] border-t border-r border-b
        cursor-pointer transition-all
        ${isNeedle
          ? 'border-l-[3px] border-l-gg-green-500 shadow-[0_0_24px_rgba(132,255,71,0.12)]'
          : 'border-l-border-default border-border-default hover:border-border-active hover:shadow-[0_0_12px_rgba(132,255,71,0.06)]'
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border-dim flex justify-between items-start">
        <ConfidenceBadge tier={tier} />
        <div className="flex items-center gap-1 text-data-positive font-mono text-[10px]">
          <span>+{edge.toFixed(1)}%</span>
          <ArrowUp size={12} />
        </div>
      </div>

      {/* Team Info */}
      <div className="px-4 py-6 border-b border-border-dim">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 bg-bg-raised flex items-center justify-center text-[20px]">
            {team.logo}
          </div>
          <div className="flex-1">
            <div className="font-display text-[24px] leading-none text-text-primary">
              {team.city}
            </div>
            <div className="font-display text-[36px] leading-none text-text-primary">
              {team.name}
            </div>
          </div>
        </div>
        <div className="label-xs text-text-muted text-right">#{team.cfsRank} CFS</div>
      </div>

      {/* CFS Score */}
      <div className="px-4 py-4 border-b border-border-dim">
        <StatBar
          value={cfsScore}
          max={100}
          label="CFS SCORE"
          displayValue={cfsScore.toString()}
          variant="positive"
        />
      </div>

      {/* Stats Grid */}
      <div className="px-4 py-4 space-y-2 border-b border-border-dim">
        <div className="grid grid-cols-2 gap-x-4">
          <div className="label-xs text-text-muted">MODEL%</div>
          <div className="label-xs text-text-muted text-right">MKT ODDS</div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div className="font-mono text-[11px] text-gg-green-500">{modelPercent.toFixed(1)}%</div>
          <div className="font-mono text-[11px] text-text-secondary text-right">{marketOdds}</div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 pt-2">
          <div className="label-xs text-text-muted">EDGE</div>
          <div className="label-xs text-text-muted text-right">CONFIDENCE</div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div className="font-mono text-[11px] text-data-positive">+{edge.toFixed(1)}%</div>
          <div className="font-mono text-[11px] text-text-secondary text-right">{tier}</div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 pt-2">
          <div className="label-xs text-text-muted">KELLY</div>
          <div className="label-xs text-text-muted text-right">UNITS</div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <div className="font-mono text-[11px] text-text-secondary">{kelly.toFixed(1)}u</div>
          <div className="font-mono text-[11px] text-text-secondary text-right">—</div>
        </div>
      </div>

      {/* Action */}
      <div className="px-4 py-3">
        <button className="label-xs text-gg-green-500 hover:text-gg-green-400 transition-colors w-full text-right">
          ANALYZE →
        </button>
      </div>
    </div>
  );
}
