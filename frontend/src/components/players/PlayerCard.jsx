import TierBadge from "../shared/TierBadge.jsx";
import StatBar from "../shared/StatBar.jsx";
import { formatAmerican, formatImpliedProb, formatEdge } from "../../utils/oddsFormatter.js";

export default function PlayerCard({ player, award }) {
  const edgeDir = player.edge_direction?.toUpperCase();
  const edgeColor = edgeDir === "VALUE" ? "text-data-positive" : edgeDir === "FADE" ? "text-data-negative" : "text-text-muted";

  return (
    <div
      className={`bg-bg-surface border-b border-border-dim p-4 hover:bg-bg-raised transition-colors ${
        edgeDir === "VALUE" ? "border-l-2 border-l-gg-green-500" : "border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="font-display text-[20px] text-text-muted w-8">{player.rank_position}</div>
          <div>
            <div className="font-display text-[18px] text-text-primary">{player.player_name}</div>
            <div className="label-xs text-text-muted mt-0.5">
              {player.team} · {player.position}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="label-xs text-text-muted mb-0.5">GG PROB</div>
            <div className="font-display text-[24px] text-gg-green-500">
              {formatImpliedProb(player.gg_prob)}
            </div>
          </div>
          <div className="text-right">
            <div className="label-xs text-text-muted mb-0.5">MKT</div>
            <div className="font-display text-[18px] text-text-secondary">
              {formatImpliedProb(player.market_prob)}
            </div>
          </div>
          <div className="text-right">
            <div className="label-xs text-text-muted mb-0.5">EDGE</div>
            <div className={`font-display text-[18px] ${edgeColor}`}>
              {formatEdge(player.edge_pct)}
            </div>
          </div>
          <div className="text-right">
            <div className="label-xs text-text-muted mb-0.5">ODDS</div>
            <div className="font-display text-[18px] text-text-primary">
              {formatAmerican(player.american_odds)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <StatBar
          value={player.gg_prob * 100}
          color={edgeDir === "VALUE" ? "var(--gg-green-500)" : "var(--border-active)"}
        />
      </div>
    </div>
  );
}
