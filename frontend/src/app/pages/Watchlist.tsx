import { FuturesCard } from '../components/FuturesCard';
import { EmptyState } from '../components/LoadingState';
import { Bell, Trash2 } from 'lucide-react';

const mockWatchlistItems = [
  {
    team: { name: 'THUNDER', city: 'OKLAHOMA CITY', logo: '⚡', cfsRank: 1 },
    cfsScore: 84,
    modelPercent: 22.4,
    marketOdds: '+350',
    edge: 7.0,
    kelly: 2.3,
    tier: 'NEEDLE' as const,
    isNeedle: true,
    alertAt: '+400',
    currentStatus: 'BELOW TARGET',
  },
  {
    team: { name: 'CELTICS', city: 'BOSTON', logo: '☘️', cfsRank: 2 },
    cfsScore: 82,
    modelPercent: 20.1,
    marketOdds: '+280',
    edge: 1.9,
    kelly: 1.1,
    tier: 'LOCK' as const,
    isNeedle: false,
    alertAt: '+350',
    currentStatus: 'ABOVE TARGET',
  },
];

const alertHistory = [
  { time: 'Apr 19, 2026 08:42', message: 'OKC THUNDER odds moved from +380 to +350 (-30)' },
  { time: 'Apr 18, 2026 14:23', message: 'BOSTON CELTICS reached alert threshold of +350' },
  { time: 'Apr 17, 2026 19:15', message: 'OKC THUNDER CFS score updated: 82 → 84 (+2)' },
  { time: 'Apr 16, 2026 11:08', message: 'DENVER NUGGETS odds moved from +450 to +420 (-30)' },
];

export function Watchlist() {
  const hasWatchlistItems = mockWatchlistItems.length > 0;

  if (!hasWatchlistItems) {
    return (
      <div className="min-h-screen bg-bg-void flex items-center justify-center">
        <EmptyState
          message="NOTHING PINNED"
          submessage="START HUNTING"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-void p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="font-display text-[48px] text-text-primary mb-2">
          WATCHLIST
        </div>
        <div className="label-xs text-text-muted">
          TRACKED FUTURES • {mockWatchlistItems.length} ACTIVE
        </div>
      </div>

      {/* Pinned Futures */}
      <div className="mb-12">
        <div className="label-md text-text-primary mb-6">PINNED FUTURES</div>
        <div className="grid grid-cols-3 gap-6">
          {mockWatchlistItems.map((item, i) => (
            <div key={i} className="relative">
              <FuturesCard
                team={item.team}
                cfsScore={item.cfsScore}
                modelPercent={item.modelPercent}
                marketOdds={item.marketOdds}
                edge={item.edge}
                kelly={item.kelly}
                tier={item.tier}
                isNeedle={item.isNeedle}
              />

              {/* Alert Settings Overlay */}
              <div className="mt-4 bg-bg-surface border border-border-dim p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="label-xs text-text-muted">PRICE ALERT</div>
                  <button className="text-text-muted hover:text-data-negative transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <Bell size={14} className="text-text-muted" />
                  <input
                    type="text"
                    value={item.alertAt}
                    className="flex-1 px-3 py-2 bg-bg-raised border border-border-default focus:border-border-active font-mono text-[11px] text-text-primary outline-none"
                    placeholder="Alert at odds..."
                  />
                </div>

                <div className={`font-mono text-[9px] ${
                  item.currentStatus === 'BELOW TARGET' ? 'text-data-positive' : 'text-text-muted'
                }`}>
                  {item.currentStatus}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert History */}
      <div>
        <div className="label-md text-text-primary mb-6">ALERT HISTORY</div>
        <div className="bg-bg-surface border border-border-dim">
          {alertHistory.map((alert, i) => (
            <div
              key={i}
              className={`px-6 py-4 flex items-start gap-4 ${
                i !== alertHistory.length - 1 ? 'border-b border-border-dim' : ''
              }`}
            >
              <Bell size={14} className="text-gg-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-mono text-[10px] text-text-muted mb-1">
                  {alert.time}
                </div>
                <div className="font-mono text-[11px] text-text-primary">
                  {alert.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
