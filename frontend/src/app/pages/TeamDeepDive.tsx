import { OddsMovementChart } from '../components/OddsMovementChart';
import { StatBlock } from '../components/StatBlock';
import { DataDensityGrid } from '../components/DataDensityGrid';
import { KellyCalculator } from '../components/KellyCalculator';
import { EnvironmentalFactorIndicator } from '../components/EnvironmentalFactorIndicator';
import { ConfidenceBadge } from '../components/ConfidenceBadge';

// Mock data
const oddsData = [
  { date: 'Feb 15', odds: 550 },
  { date: 'Feb 22', odds: 520 },
  { date: 'Mar 1', odds: 480 },
  { date: 'Mar 8', odds: 450 },
  { date: 'Mar 15', odds: 420 },
  { date: 'Mar 22', odds: 410 },
  { date: 'Mar 29', odds: 400 },
  { date: 'Apr 5', odds: 380 },
  { date: 'Apr 12', odds: 360 },
  { date: 'Apr 19', odds: 350 },
];

const advancedStats = [
  { label: 'OFF RTG', value: '118.4', trend: 'up' as const },
  { label: 'DEF RTG', value: '109.2', trend: 'down' as const },
  { label: 'NET RTG', value: '+9.2', trend: 'up' as const },
  { label: 'PACE', value: '99.8' },
  { label: 'TS%', value: '59.2%', trend: 'up' as const },
  { label: 'EFG%', value: '56.8%' },
  { label: 'TOV%', value: '12.1%', trend: 'down' as const },
  { label: 'ORB%', value: '24.7%' },
];

export function TeamDeepDive() {
  return (
    <div className="min-h-screen bg-bg-void">
      {/* Header */}
      <div className="border-b-4 border-t-4 border-t-[#007AC1] bg-bg-surface px-8 py-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 flex items-center justify-center text-[48px]">
              ⚡
            </div>
            <div>
              <div className="font-display text-[64px] leading-none text-text-primary">
                OKLAHOMA CITY THUNDER
              </div>
              <div className="mt-3">
                <ConfidenceBadge tier="NEEDLE" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <StatBlock
              value="84"
              label="CFS SCORE"
              variant="large"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[420px_1fr] gap-6 p-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Odds Movement */}
          <OddsMovementChart
            data={oddsData}
            modelImpliedOdds={350}
          />

          {/* Kelly Calculator */}
          <KellyCalculator
            edge={7.0}
            modelPercent={22.4}
            marketOdds="+350"
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div>
            <div className="label-md text-text-primary mb-4">KEY METRICS</div>
            <DataDensityGrid stats={advancedStats} columns={4} />
          </div>

          {/* Needle Analysis */}
          <div className="bg-bg-surface border border-border-dim p-6">
            <div className="label-md text-gg-green-500 mb-4">NEEDLE ANALYSIS</div>
            <div className="space-y-4">
              <div className="pl-4 border-l-2 border-gg-green-500 font-mono text-[11px] text-text-secondary">
                <strong className="text-text-primary">Explainable:</strong> Model identifies 7.0% edge based on superior net rating (+9.2) vs market-implied performance expectations. Team's recent form (8-2 L10) not fully priced into odds.
              </div>
              <div className="pl-4 border-l-2 border-gg-green-500 font-mono text-[11px] text-text-secondary">
                <strong className="text-text-primary">Auditable:</strong> CFS formula weights: Offensive Rating (18%), Defensive Rating (18%), Health Index (15%), Schedule Strength (12%), Recent Form (10%), remaining distributed across 5 additional factors.
              </div>
              <div className="pl-4 border-l-2 border-gg-green-500 font-mono text-[11px] text-text-secondary">
                <strong className="text-text-primary">Actionable:</strong> Recommended 1/4 Kelly sizing at 2.3u suggests $575 wager on $10,000 bankroll. Monitor health status daily — any starter injury drops tier to LEAN.
              </div>
            </div>
          </div>

          {/* Environmental Factors */}
          <div className="bg-bg-surface border border-border-dim p-6">
            <div className="label-md text-text-primary mb-4">NEXT GAME CONTEXT</div>
            <div className="mb-4 font-mono text-[10px] text-text-secondary">
              vs WARRIORS • Apr 21, 2026 • 20:00 ET • Home
            </div>
            <EnvironmentalFactorIndicator
              weather={{ condition: 'Clear', temp: 72 }}
              travelFatigue="low"
            />
          </div>

          {/* Schedule Heatmap */}
          <div className="bg-bg-surface border border-border-dim p-6">
            <div className="label-md text-text-primary mb-4">REMAINING SCHEDULE</div>
            <div className="grid grid-cols-10 gap-1">
              {[85, 92, 68, 71, 88, 65, 79, 73, 90, 70, 82, 66, 75, 84, 69, 78, 87, 72].map((cfs, i) => {
                const color = cfs > 80 ? 'bg-data-negative' : cfs > 70 ? 'bg-signal-lean' : 'bg-data-positive';
                return (
                  <div
                    key={i}
                    className={`h-8 ${color} flex items-center justify-center font-mono text-[8px] text-bg-void cursor-pointer hover:opacity-80`}
                    title={`Opponent CFS: ${cfs}`}
                  >
                    {cfs}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between items-center font-mono text-[8px] text-text-muted">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-data-positive" />
                <span>EASY (&lt;70)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-signal-lean" />
                <span>MEDIUM (70-80)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-data-negative" />
                <span>HARD (&gt;80)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
