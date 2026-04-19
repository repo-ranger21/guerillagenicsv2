import { StatBar } from './StatBar';

interface PlayoffBracketNodeProps {
  team: {
    name: string;
    abbreviation: string;
    logo: string;
  };
  winProbability: number;
  state?: 'default' | 'active' | 'winner' | 'eliminated' | 'simulating';
  onClick?: () => void;
  className?: string;
}

export function PlayoffBracketNode({
  team,
  winProbability,
  state = 'default',
  onClick,
  className = '',
}: PlayoffBracketNodeProps) {
  const stateStyles = {
    default: 'border-border-default opacity-100',
    active: 'border-border-active opacity-100',
    winner: 'border-l-gg-green-500 border-l-[3px] opacity-100',
    eliminated: 'border-border-dim opacity-30',
    simulating: 'border-border-active opacity-100 animate-pulse',
  };

  return (
    <div
      onClick={onClick}
      className={`
        w-[180px] h-16 bg-bg-surface border
        ${stateStyles[state]}
        ${onClick ? 'cursor-pointer hover:border-border-active' : ''}
        transition-all
        ${className}
      `}
    >
      <div className="flex items-center justify-between p-3 h-full">
        {/* Team Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center text-[16px]">
            {team.logo}
          </div>
          <span className="font-mono text-[10px] text-text-primary">
            {team.abbreviation}
          </span>
        </div>

        {/* Win Probability */}
        <div className="font-display text-[20px] text-gg-green-500">
          {winProbability}%
        </div>
      </div>

      {/* Probability Bar */}
      <div className="px-3 pb-2">
        <StatBar
          value={winProbability}
          max={100}
          variant="positive"
          animate={state === 'simulating'}
        />
      </div>
    </div>
  );
}
