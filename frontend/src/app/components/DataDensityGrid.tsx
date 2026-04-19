import { StatBlock } from './StatBlock';

interface StatData {
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: 'up' | 'down';
}

interface DataDensityGridProps {
  stats: StatData[];
  columns?: number;
  className?: string;
}

export function DataDensityGrid({ stats, columns = 4, className = '' }: DataDensityGridProps) {
  return (
    <div
      className={`grid gap-px border border-border-dim ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(120px, 1fr))`,
      }}
    >
      {stats.map((stat, i) => (
        <div key={i} className="bg-bg-surface p-3">
          <StatBlock
            value={stat.value}
            label={stat.label}
            variant="small"
            subvalue={stat.subvalue}
            trend={stat.trend}
          />
        </div>
      ))}
    </div>
  );
}
