import { useState } from 'react';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { StatBar } from '../components/StatBar';

const mockPlayers = [
  {
    name: 'NIKOLA JOKIC',
    team: 'DEN',
    position: 'C',
    award: 'MVP',
    modelProb: 38.2,
    marketProb: 32.1,
    edge: 6.1,
    odds: '+210',
    tier: 'NEEDLE' as const,
    stats: { ppg: 26.4, rpg: 12.4, apg: 9.0 },
  },
  {
    name: 'SHAI GILGEOUS-ALEXANDER',
    team: 'OKC',
    position: 'G',
    award: 'MVP',
    modelProb: 31.7,
    marketProb: 28.9,
    edge: 2.8,
    odds: '+250',
    tier: 'LOCK' as const,
    stats: { ppg: 30.1, rpg: 5.5, apg: 6.2 },
  },
  {
    name: 'GIANNIS ANTETOKOUNMPO',
    team: 'MIL',
    position: 'F',
    award: 'MVP',
    modelProb: 18.4,
    marketProb: 22.6,
    edge: -4.2,
    odds: '+350',
    tier: 'FADE' as const,
    stats: { ppg: 29.9, rpg: 11.0, apg: 5.8 },
  },
  {
    name: 'LUKA DONCIC',
    team: 'DAL',
    position: 'G',
    award: 'MVP',
    modelProb: 11.7,
    marketProb: 16.4,
    edge: -4.7,
    odds: '+500',
    tier: 'FADE' as const,
    stats: { ppg: 28.4, rpg: 8.9, apg: 8.2 },
  },
];

export function PlayerFutures() {
  const [selectedAward, setSelectedAward] = useState<'MVP' | 'DPOY' | 'ROY' | 'MIP'>('MVP');

  return (
    <div className="min-h-screen bg-bg-void">
      {/* Header */}
      <div className="bg-bg-surface border-b border-border-dim px-8 py-6">
        <div className="font-display text-[48px] text-text-primary mb-6">
          PLAYER AWARDS
        </div>

        {/* Award Tabs */}
        <div className="flex gap-6 border-b border-border-dim">
          {(['MVP', 'DPOY', 'ROY', 'MIP'] as const).map((award) => (
            <button
              key={award}
              onClick={() => setSelectedAward(award)}
              className={`pb-3 label-md transition-colors relative ${
                selectedAward === award
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {award === 'MVP' && 'NBA MVP'}
              {award === 'DPOY' && 'DEFENSIVE PLAYER'}
              {award === 'ROY' && 'ROOKIE OF THE YEAR'}
              {award === 'MIP' && 'MOST IMPROVED'}
              {selectedAward === award && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gg-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          {mockPlayers.map((player, i) => (
            <div
              key={i}
              className={`bg-bg-surface border cursor-pointer transition-all hover:border-border-active ${
                player.tier === 'NEEDLE'
                  ? 'border-l-[3px] border-l-gg-green-500 shadow-[0_0_16px_rgba(132,255,71,0.08)]'
                  : 'border-border-default'
              }`}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border-dim">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-bg-raised flex items-center justify-center font-display text-[20px] text-text-muted">
                      {player.position}
                    </div>
                    <div>
                      <div className="font-display text-[20px] text-text-primary leading-none">
                        {player.name.split(' ')[0]}
                      </div>
                      <div className="font-display text-[24px] text-text-primary leading-none">
                        {player.name.split(' ')[1]}
                      </div>
                    </div>
                  </div>
                  <ConfidenceBadge tier={player.tier} />
                </div>
                <div className="label-xs text-text-muted">{player.team} • {player.award}</div>
              </div>

              {/* Stats */}
              <div className="px-6 py-4 border-b border-border-dim">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="font-display text-[24px] text-gg-green-500 leading-none">
                      {player.stats.ppg}
                    </div>
                    <div className="label-xs text-text-muted mt-1">PPG</div>
                  </div>
                  <div>
                    <div className="font-display text-[24px] text-text-primary leading-none">
                      {player.stats.rpg}
                    </div>
                    <div className="label-xs text-text-muted mt-1">RPG</div>
                  </div>
                  <div>
                    <div className="font-display text-[24px] text-text-primary leading-none">
                      {player.stats.apg}
                    </div>
                    <div className="label-xs text-text-muted mt-1">APG</div>
                  </div>
                </div>
              </div>

              {/* Award Probability */}
              <div className="px-6 py-4">
                <div className="mb-4">
                  <StatBar
                    value={player.modelProb}
                    max={100}
                    label="AWARD PROBABILITY"
                    displayValue={`${player.modelProb.toFixed(1)}%`}
                    variant="positive"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="label-xs text-text-muted mb-1">MODEL</div>
                    <div className="font-mono text-[11px] text-gg-green-500">
                      {player.modelProb.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="label-xs text-text-muted mb-1">MARKET</div>
                    <div className="font-mono text-[11px] text-text-secondary">
                      {player.marketProb.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="label-xs text-text-muted mb-1">EDGE</div>
                    <div className={`font-mono text-[11px] ${player.edge > 0 ? 'text-data-positive' : 'text-data-negative'}`}>
                      {player.edge > 0 ? '+' : ''}{player.edge.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="label-xs text-text-muted mb-1">ODDS</div>
                    <div className="font-mono text-[11px] text-text-secondary">
                      {player.odds}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend Sparkline */}
              <div className="px-6 py-4 border-t border-border-dim">
                <div className="label-xs text-text-muted mb-2">LAST 12 GAMES</div>
                <div className="flex items-end gap-1 h-8">
                  {[65, 70, 68, 72, 75, 71, 78, 82, 80, 85, 83, 88].map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gg-green-500 opacity-60 hover:opacity-100 transition-opacity"
                      style={{ height: `${(val / 100) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
