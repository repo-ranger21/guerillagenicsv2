import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatRelative } from "../../utils/dateHelpers.js";
import { formatAmerican } from "../../utils/oddsFormatter.js";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-raised border border-border-default px-3 py-2">
      <div className="label-xs text-text-muted mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="font-mono text-[10px]" style={{ color: p.color }}>
          {p.name}: {formatAmerican(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function OddsMovementChart({ data = [], bookmakers = [] }) {
  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center border border-border-dim bg-bg-surface">
        <span className="label-xs text-text-muted">NO ODDS HISTORY</span>
      </div>
    );
  }

  const colors = ["#84ff47", "#34d399", "#f59e0b", "#94a3b8", "#ef4444"];

  return (
    <div className="bg-bg-surface border border-border-dim p-4">
      <div className="label-xs text-text-muted mb-4">ODDS MOVEMENT — 30 DAYS</div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#555" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontFamily: "var(--font-mono)", fontSize: 8, fill: "#555" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAmerican}
          />
          <Tooltip content={<CustomTooltip />} />
          {bookmakers.map((book, i) => (
            <Line
              key={book}
              type="monotone"
              dataKey={book}
              stroke={colors[i % colors.length]}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
