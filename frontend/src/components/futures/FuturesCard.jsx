import { useState } from "react";
import TierBadge from "../shared/TierBadge.jsx";
import StatBar from "../shared/StatBar.jsx";

export default function FuturesCard({ data, expandable = false, onClick }) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (expandable) setExpanded((v) => !v);
    onClick?.();
  };

  const edgeColor =
    data.edge > 0 ? "text-data-positive" : data.edge < 0 ? "text-data-negative" : "text-text-muted";

  return (
    <div>
      {/* Main row */}
      <div
        onClick={handleClick}
        className={`
          h-12 grid items-center px-4
          border-b border-border-dim
          ${data.isNeedle ? "border-l-2 border-l-gg-green-500 bg-[rgba(132,255,71,0.03)]" : "border-l-2 border-l-transparent"}
          ${expandable || onClick ? "cursor-pointer hover:bg-bg-raised" : ""}
          transition-colors
        `}
        style={{ gridTemplateColumns: "60px 1fr 80px 100px 100px 100px 80px 80px 120px", gap: "16px" }}
      >
        <div className="font-display text-[20px] text-text-muted">{data.rank}</div>

        <div className="flex items-center gap-3">
          <span className="text-[14px]">{data.team?.logo}</span>
          <span className="font-display text-[14px] text-text-primary">
            {data.team?.city} {data.team?.name}
          </span>
        </div>

        <div className="font-display text-[16px] text-gg-green-500 text-right">{data.cfs}</div>

        <div className="font-display text-[16px] text-text-primary text-right">
          {data.modelPercent?.toFixed(1)}%
        </div>

        <div className="font-display text-[16px] text-text-secondary text-right">
          {data.marketPercent?.toFixed(1)}%
        </div>

        <div className={`font-display text-[16px] text-right ${edgeColor}`}>
          {data.edge > 0 ? "+" : ""}{data.edge?.toFixed(1)}%
        </div>

        <div className="font-display text-[16px] text-text-primary text-right">{data.mdi}</div>

        <div className="font-display text-[16px] text-text-primary text-right">{data.health}</div>

        <div className="flex justify-end">
          <TierBadge tier={data.tier} />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="bg-bg-raised px-4 py-6 border-b border-border-dim animate-fade-in">
          <div className="label-xs text-text-muted mb-4">ADVANCED STATS</div>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: "GG-ELO", value: data.gg_elo?.toFixed(0) ?? "—" },
              { label: "NIR", value: data.nir_score?.toFixed(1) ?? "—" },
              { label: "SSC", value: data.ssc_score?.toFixed(1) ?? "—" },
              { label: "PDS", value: data.pds_score?.toFixed(1) ?? "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="label-xs text-text-muted mb-1">{label}</div>
                <div className="font-display text-[24px] text-text-primary">{value}</div>
                <StatBar value={parseFloat(value) || 0} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
