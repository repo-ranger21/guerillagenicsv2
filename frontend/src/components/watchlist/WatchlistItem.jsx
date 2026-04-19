import TierBadge from "../shared/TierBadge.jsx";
import { formatAmerican, formatImpliedProb } from "../../utils/oddsFormatter.js";

export default function WatchlistItem({ item, onRemove }) {
  const isTeam = item.type === "team";

  return (
    <div className="h-14 grid items-center px-4 border-b border-border-dim hover:bg-bg-raised transition-colors border-l-2 border-l-transparent"
      style={{ gridTemplateColumns: "1fr 80px 100px 100px 40px", gap: "16px" }}>

      <div>
        <div className="font-display text-[15px] text-text-primary">
          {isTeam ? item.full_name || item.abbreviation : item.player_name}
        </div>
        <div className="label-xs text-text-muted">
          {item.sport?.toUpperCase()}
          {isTeam
            ? item.tier ? ` · ${item.tier}` : ""
            : item.team ? ` · ${item.team}` : ""}
          {!isTeam && item.award ? ` · ${item.award?.toUpperCase()}` : ""}
        </div>
      </div>

      <div>
        {item.tier ? <TierBadge tier={item.tier} /> : <span className="label-xs text-text-ghost">—</span>}
      </div>

      <div className="font-display text-[15px] text-gg-green-500 text-right">
        {item.cfs_score != null ? `${item.cfs_score.toFixed(1)}` : "—"}
      </div>

      <div className="label-xs text-text-muted text-right font-mono">
        {item.pinnedAt ? new Date(item.pinnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
      </div>

      <button
        onClick={() => onRemove(item.id, item.sport, item.type)}
        className="label-xs text-text-ghost hover:text-data-negative transition-colors text-right"
        aria-label="Remove from watchlist"
      >
        ✕
      </button>
    </div>
  );
}
