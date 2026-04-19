import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatBlockProps {
  value: string | number;
  label: string;
  variant?: 'large' | 'medium' | 'small' | 'comparison';
  trend?: 'up' | 'down';
  subvalue?: string;
  modelValue?: string;
  marketValue?: string;
  edge?: string;
  highlighted?: boolean;
  dimmed?: boolean;
  className?: string;
}

export function StatBlock({
  value,
  label,
  variant = 'medium',
  trend,
  subvalue,
  modelValue,
  marketValue,
  edge,
  highlighted = false,
  dimmed = false,
  className = '',
}: StatBlockProps) {
  const sizeMap = {
    large: 'text-[96px]',
    medium: 'text-[48px]',
    small: 'text-[32px]',
    comparison: 'text-[32px]',
  };

  const opacity = dimmed ? 'opacity-40' : highlighted ? 'opacity-100' : 'opacity-100';

  if (variant === 'comparison' && modelValue && marketValue) {
    return (
      <div className={`flex flex-col ${opacity} ${className}`}>
        <div className="label-xs text-text-muted mb-1">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[32px] text-gg-green-500">{modelValue}</span>
          <span className="font-display text-[24px] text-text-secondary">/</span>
          <span className="font-display text-[32px] text-text-secondary">{marketValue}</span>
        </div>
        {edge && (
          <div className="font-mono text-[9px] text-gg-green-500 mt-1">
            EDGE {edge}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${opacity} ${className}`}>
      <div className="label-xs text-text-muted mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`font-display ${sizeMap[variant]} leading-none`}>
          {value}
        </span>
        {trend && (
          <span className={trend === 'up' ? 'text-data-positive' : 'text-data-negative'}>
            {trend === 'up' ? <ArrowUp size={variant === 'large' ? 32 : 20} /> : <ArrowDown size={variant === 'large' ? 32 : 20} />}
          </span>
        )}
      </div>
      {subvalue && (
        <div className="font-mono text-[10px] text-text-secondary mt-1">
          {subvalue}
        </div>
      )}
    </div>
  );
}
