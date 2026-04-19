import { useState } from 'react';
import { LeaderboardTableRow, LeaderboardTableHeader } from '../components/LeaderboardTableRow';
import { NeedleAlertPanel } from '../components/NeedleAlertPanel';
import { FuturesCard } from '../components/FuturesCard';
import { ConfidenceBadge } from '../components/ConfidenceBadge';

// Mock data
const mockTeams = [
  {
    rank: 1,
    team: { name: 'THUNDER', city: 'OKLAHOMA CITY', logo: '⚡' },
    cfs: 84,
    modelPercent: 22.4,
    marketPercent: 15.4,
    edge: 7.0,
    mdi: 92,
    health: 95,
    tier: 'NEEDLE' as const,
    isNeedle: true,
  },
  {
    rank: 2,
    team: { name: 'CELTICS', city: 'BOSTON', logo: '☘️' },
    cfs: 82,
    modelPercent: 20.1,
    marketPercent: 18.2,
    edge: 1.9,
    mdi: 89,
    health: 88,
    tier: 'LOCK' as const,
    isNeedle: false,
  },
  {
    rank: 3,
    team: { name: 'NUGGETS', city: 'DENVER', logo: '⛰️' },
    cfs: 79,
    modelPercent: 16.8,
    marketPercent: 14.1,
    edge: 2.7,
    mdi: 85,
    health: 82,
    tier: 'LOCK' as const,
    isNeedle: false,
  },
  {
    rank: 4,
    team: { name: 'BUCKS', city: 'MILWAUKEE', logo: '🦌' },
    cfs: 76,
    modelPercent: 14.2,
    marketPercent: 16.5,
    edge: -2.3,
    mdi: 81,
    health: 76,
    tier: 'LEAN' as const,
    isNeedle: false,
  },
  {
    rank: 5,
    team: { name: 'SUNS', city: 'PHOENIX', logo: '☀️' },
    cfs: 73,
    modelPercent: 11.9,
    marketPercent: 10.2,
    edge: 1.7,
    mdi: 78,
    health: 90,
    tier: 'LEAN' as const,
    isNeedle: false,
  },
  {
    rank: 6,
    team: { name: 'WARRIORS', city: 'GOLDEN STATE', logo: '🌉' },
    cfs: 71,
    modelPercent: 10.3,
    marketPercent: 12.8,
    edge: -2.5,
    mdi: 74,
    health: 71,
    tier: 'WATCH' as const,
    isNeedle: false,
  },
  {
    rank: 7,
    team: { name: 'MAVERICKS', city: 'DALLAS', logo: '🐴' },
    cfs: 68,
    modelPercent: 8.7,
    marketPercent: 9.1,
    edge: -0.4,
    mdi: 72,
    health: 85,
    tier: 'WATCH' as const,
    isNeedle: false,
  },
  {
    rank: 8,
    team: { name: 'CLIPPERS', city: 'LA', logo: '⛵' },
    cfs: 65,
    modelPercent: 6.2,
    marketPercent: 8.9,
    edge: -2.7,
    mdi: 68,
    health: 62,
    tier: 'FADE' as const,
    isNeedle: false,
  },
];

export function FuturesLeaderboard() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [needleOnly, setNeedleOnly] = useState(false);

  const needleTeam = mockTeams.find(t => t.isNeedle);

  const filteredTeams = mockTeams.filter(team => {
    if (needleOnly && !team.isNeedle) return false;
    if (selectedTier && team.tier !== selectedTier) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-bg-void">
      {/* Left Sidebar - Filters */}
      <div className="w-60 bg-bg-surface border-r border-border-dim p-6">
        <div className="label-md text-text-primary mb-6">FILTERS</div>

        {/* Needle Only Toggle */}
        <div className="mb-8">
          <button
            onClick={() => setNeedleOnly(!needleOnly)}
            className={`w-full px-4 py-3 border transition-all ${
              needleOnly
                ? 'border-gg-green-500 bg-[rgba(132,255,71,0.06)] text-gg-green-500'
                : 'border-border-default bg-bg-raised text-text-muted hover:border-border-active'
            }`}
          >
            <div className="label-sm">NEEDLE ONLY</div>
            <div className="font-mono text-[8px] mt-1">
              {needleOnly ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </button>
        </div>

        {/* Tier Filter */}
        <div className="space-y-3">
          <div className="label-xs text-text-muted">CONFIDENCE TIER</div>
          {['NEEDLE', 'LOCK', 'LEAN', 'WATCH', 'FADE'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
              className={`w-full text-left transition-opacity ${
                selectedTier === null || selectedTier === tier ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <ConfidenceBadge tier={tier as any} />
            </button>
          ))}
        </div>

        {/* Active Filters */}
        {(selectedTier || needleOnly) && (
          <div className="mt-8 pt-6 border-t border-border-dim">
            <div className="label-xs text-text-muted mb-3">ACTIVE</div>
            <div className="space-y-2">
              {needleOnly && (
                <div className="px-2 py-1 bg-bg-raised border border-border-dim flex justify-between items-center">
                  <span className="font-mono text-[8px] text-text-secondary">NEEDLE ONLY</span>
                  <button
                    onClick={() => setNeedleOnly(false)}
                    className="text-text-muted hover:text-text-primary text-[8px]"
                  >
                    ×
                  </button>
                </div>
              )}
              {selectedTier && (
                <div className="px-2 py-1 bg-bg-raised border border-border-dim flex justify-between items-center">
                  <span className="font-mono text-[8px] text-text-secondary">{selectedTier}</span>
                  <button
                    onClick={() => setSelectedTier(null)}
                    className="text-text-muted hover:text-text-primary text-[8px]"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Needle Alert */}
        {needleTeam && !needleOnly && !selectedTier && (
          <div className="p-6">
            <NeedleAlertPanel
              team={needleTeam.team}
              modelPercent={needleTeam.modelPercent}
              marketPercent={needleTeam.marketPercent}
              edge={needleTeam.edge}
              signals={['HOT_STREAK', 'HEALTHY_ROSTER', 'EASY_SCHEDULE', 'UNDERVALUED']}
              eaaPoints={[
                'Team has won 8 of last 10 games with average margin of +12.4 points',
                'All starters have played 90%+ of available minutes in past 14 days',
                'Remaining 18 games: 12 vs sub-.500 teams, 4 home vs playoff contenders',
              ]}
            />
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-bg-surface">
          <LeaderboardTableHeader />
          {filteredTeams.map((team) => (
            <LeaderboardTableRow
              key={team.rank}
              data={team}
              expandable
            />
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-display text-[64px] text-text-ghost">NO MATCHES</div>
            <div className="label-xs text-text-muted mt-4">ADJUST YOUR FILTERS</div>
          </div>
        )}
      </div>
    </div>
  );
}
