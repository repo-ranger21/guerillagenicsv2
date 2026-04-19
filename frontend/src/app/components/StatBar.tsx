import { useEffect, useState } from 'react';

interface StatBarProps {
  value: number;
  max?: number;
  label?: string;
  displayValue?: string;
  variant?: 'default' | 'positive' | 'negative' | 'comparison';
  animate?: boolean;
  className?: string;
}

export function StatBar({
  value,
  max = 100,
  label,
  displayValue,
  variant = 'default',
  animate = true,
  className = '',
}: StatBarProps) {
  const [width, setWidth] = useState(animate ? 0 : (value / max) * 100);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setWidth((value / max) * 100);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [value, max, animate]);

  const colorMap = {
    default: 'bg-gg-green-500',
    positive: 'bg-data-positive',
    negative: 'bg-data-negative',
    comparison: 'bg-gg-green-500',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || displayValue) && (
        <div className="flex justify-between items-baseline mb-1">
          {label && <span className="label-xs text-text-muted">{label}</span>}
          {displayValue && <span className="font-display text-[14px]">{displayValue}</span>}
        </div>
      )}
      <div className="w-full h-0.5 bg-bg-raised">
        <div
          className={`h-full ${colorMap[variant]} transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1)`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
