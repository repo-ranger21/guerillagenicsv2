import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';

interface DataPoint {
  date: string;
  odds: number;
}

interface OddsMovementChartProps {
  data: DataPoint[];
  modelImpliedOdds?: number;
  className?: string;
}

export function OddsMovementChart({ data, modelImpliedOdds, className = '' }: OddsMovementChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-overlay border border-border-dim px-3 py-2">
          <div className="font-mono text-[10px] text-text-secondary">
            {payload[0].payload.date}
          </div>
          <div className="font-mono text-[10px] text-gg-green-500 mt-1">
            {payload[0].value > 0 ? '+' : ''}{payload[0].value}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full h-[300px] bg-bg-surface p-4 ${className}`}>
      <div className="label-xs text-text-muted mb-4">ODDS MOVEMENT</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="oddsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(132, 255, 71, 0.04)" />
              <stop offset="100%" stopColor="rgba(132, 255, 71, 0)" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke="var(--text-muted)"
            style={{ fontSize: '8px', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--text-muted)"
            style={{ fontSize: '8px', fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => (value > 0 ? `+${value}` : value)}
          />
          <Tooltip content={<CustomTooltip />} />
          {modelImpliedOdds && (
            <ReferenceLine
              y={modelImpliedOdds}
              stroke="var(--border-active)"
              strokeDasharray="4 4"
              label={{
                value: 'MODEL',
                position: 'right',
                fill: 'var(--gg-green-500)',
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="odds"
            stroke="var(--gg-green-500)"
            strokeWidth={1.5}
            fill="url(#oddsGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
