import { ConfidenceBadge } from './ConfidenceBadge';
import { useState } from 'react';

interface TeamData {
  rank: number;
  team: {
    name: string;
    city: string;
    logo: string;
  };
  cfs: number;
  modelPercent: number;
  marketPercent: number;
  edge: number;
  mdi: number;
  health: number;
  tier: 'NEEDLE' | 'LOCK' | 'LEAN' | 'WATCH' | 'FADE';
  isNeedle?: boolean;
}

interface LeaderboardTableRowProps {
  data: TeamData;
  onClick?: () => void;
  expandable?: boolean;
  className?: string;
}

export function LeaderboardTableRow({
  data,
  onClick,
  expandable = false,
  className = '',
}: LeaderboardTableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
    onClick?.();
  };

  return (
    <div className={className}>
      <div
        onClick={handleClick}
        className={`
          h-12 grid grid-cols-[60px_1fr_80px_100px_100px_100px_80px_80px_120px] gap-4 items-center px-4
          border-b border-border-dim
          ${data.isNeedle ? 'border-l-2 border-l-gg-green-500 bg-[rgba(132,255,71,0.03)]' : ''}
          ${expandable || onClick ? 'cursor-pointer hover:bg-bg-raised' : ''}
          transition-colors
        `}
      >
        {/* Rank */}
        <div className="font-display text-[20px] text-text-muted">
          {data.rank}
        </div>

        {/* Team */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-[14px]">
            {data.team.logo}
          </div>
          <span className="font-display text-[14px] text-text-primary">
            {data.team.city} {data.team.name}
          </span>
        </div>

        {/* CFS */}
        <div className="font-display text-[16px] text-gg-green-500 text-right">
          {data.cfs}
        </div>

        {/* MODEL% */}
        <div className="font-display text-[16px] text-text-primary text-right">
          {data.modelPercent.toFixed(1)}%
        </div>

        {/* MKT% */}
        <div className="font-display text-[16px] text-text-secondary text-right">
          {data.marketPercent.toFixed(1)}%
        </div>

        {/* EDGE */}
        <div className={`font-display text-[16px] text-right ${data.edge > 0 ? 'text-data-positive' : 'text-data-negative'}`}>
          {data.edge > 0 ? '+' : ''}{data.edge.toFixed(1)}%
        </div>

        {/* MDI */}
        <div className="font-display text-[16px] text-text-primary text-right">
          {data.mdi}
        </div>

        {/* HEALTH */}
        <div className="font-display text-[16px] text-text-primary text-right">
          {data.health}
        </div>

        {/* TIER */}
        <div className="flex justify-end">
          <ConfidenceBadge tier={data.tier} />
        </div>
      </div>

      {/* Expanded Content (Placeholder) */}
      {isExpanded && (
        <div className="bg-bg-raised px-4 py-6 border-b border-border-dim">
          <div className="label-xs text-text-muted">ADVANCED STATS</div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {/* Placeholder for advanced stats */}
            <div className="font-mono text-[10px] text-text-secondary">
              Additional team analytics would appear here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeaderboardTableHeader() {
  return (
    <div className="h-10 grid grid-cols-[60px_1fr_80px_100px_100px_100px_80px_80px_120px] gap-4 items-center px-4 bg-bg-void border-b border-border-default sticky top-0 z-10">
      <div className="label-xs text-text-muted">RANK</div>
      <div className="label-xs text-text-muted">TEAM</div>
      <div className="label-xs text-text-muted text-right">CFS</div>
      <div className="label-xs text-text-muted text-right">MODEL%</div>
      <div className="label-xs text-text-muted text-right">MKT%</div>
      <div className="label-xs text-text-muted text-right">EDGE</div>
      <div className="label-xs text-text-muted text-right">MDI</div>
      <div className="label-xs text-text-muted text-right">HEALTH</div>
      <div className="label-xs text-text-muted text-right">TIER</div>
    </div>
  );
}
