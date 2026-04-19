import { formatAmerican, formatImpliedProb, formatEdge } from "../../utils/oddsFormatter.js";

export default function AwardCandidateRow({ player }) {
  const isValue = player.edge_direction === "VALUE";
  const isFade  = player.edge_direction === "FADE";
  const edgeColor = isValue ? "text-data-positive" : isFade ? "text-data-negative" : "text-text-muted";

  return (
    <div
      className={`h-12 grid items-center px-4 border-b border-border-dim hover:bg-bg-raised transition-colors ${
        isValue ? "border-l-2 border-l-gg-green-500 bg-[rgba(132,255,71,0.02)]" : "border-l-2 border-l-transparent"
      }`}
      style={{ gridTemplateColumns: "48px 1fr 100px 100px 100px 100px", gap: "16px" }}
    >
      <div className="font-display text-[18px] text-text-muted">{player.rank_position}</div>
      <div>
        <div className="font-display text-[14px] text-text-primary">{player.player_name}</div>
        <div className="label-xs text-text-muted">{player.team} · {player.position}</div>
      </div>
      <div className="font-display text-[16px] text-gg-green-500 text-right">
        {formatImpliedProb(player.gg_prob)}
      </div>
      <div className="font-display text-[16px] text-text-secondary text-right">
        {formatImpliedProb(player.market_prob)}
      </div>
      <div className={`font-display text-[16px] text-right ${edgeColor}`}>
        {formatEdge(player.edge_pct)}
      </div>
      <div className="font-display text-[16px] text-text-primary text-right">
        {formatAmerican(player.american_odds)}
      </div>
    </div>
  );
}
