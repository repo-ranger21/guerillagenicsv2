import { formatKelly, formatAmerican } from "../../utils/oddsFormatter.js";

export default function KellyOverlay({ kellyFraction, quarterKelly, bestOdds, bankroll }) {
  const unitSize = bankroll ? bankroll * (quarterKelly ?? 0) : null;

  return (
    <div className="bg-bg-raised border border-border-dim p-4">
      <div className="label-xs text-text-muted mb-4">BET SIZING — KELLY CRITERION</div>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="label-xs text-text-muted mb-1">FULL KELLY</div>
          <div className="font-display text-[24px] text-text-secondary">
            {formatKelly(kellyFraction)}
          </div>
        </div>
        <div>
          <div className="label-xs text-text-muted mb-1">¼ KELLY (REC.)</div>
          <div className="font-display text-[24px] text-gg-green-500">
            {formatKelly(quarterKelly)}
          </div>
        </div>
        <div>
          <div className="label-xs text-text-muted mb-1">BEST ODDS</div>
          <div className="font-display text-[24px] text-text-primary">
            {formatAmerican(bestOdds)}
          </div>
        </div>
      </div>
      {unitSize != null && (
        <div className="mt-4 pt-4 border-t border-border-dim">
          <div className="label-xs text-text-muted mb-1">UNIT SIZE (${bankroll?.toLocaleString()} BANKROLL)</div>
          <div className="font-display text-[32px] text-gg-green-500">
            ${Math.round(unitSize).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
