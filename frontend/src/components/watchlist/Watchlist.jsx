import { useWatchlist } from "../../hooks/useWatchlist.js";
import WatchlistItem from "./WatchlistItem.jsx";

const SPORT_ORDER = ["nba", "mlb", "nfl"];

export default function Watchlist() {
  const { items, toggleTeam, togglePlayer, clearAll, removeItem } = useWatchlist();

  const grouped = SPORT_ORDER.reduce((acc, sport) => {
    const sportItems = items.filter((i) => i.sport === sport);
    if (sportItems.length) acc[sport] = sportItems;
    return acc;
  }, {});

  const hasItems = items.length > 0;

  return (
    <div className="min-h-screen bg-bg-void">
      <div className="p-6 border-b border-border-default flex items-center justify-between">
        <div>
          <div className="font-display text-[32px] text-text-primary">WATCHLIST</div>
          <div className="label-xs text-text-muted mt-1">{items.length} PINNED</div>
        </div>
        {hasItems && (
          <button
            onClick={clearAll}
            className="label-xs text-text-muted hover:text-data-negative transition-colors border border-border-default px-3 py-1.5 hover:border-data-negative"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {!hasItems && (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="font-display text-[64px] text-text-ghost leading-none">EMPTY</div>
          <div className="label-xs text-text-muted mt-4">PIN TEAMS AND PLAYERS FROM THE FUTURES BOARD</div>
        </div>
      )}

      {hasItems && (
        <div className="bg-bg-surface">
          <div
            className="h-10 grid items-center px-4 bg-bg-void border-b border-border-default sticky top-0 z-10"
            style={{ gridTemplateColumns: "1fr 80px 100px 100px 40px", gap: "16px" }}
          >
            {["ENTITY", "TIER", "CFS", "PINNED", ""].map((h, i) => (
              <div key={i} className={`label-xs text-text-muted ${i > 0 ? "text-right" : ""}`}>{h}</div>
            ))}
          </div>

          {Object.entries(grouped).map(([sport, sportItems]) => (
            <div key={sport}>
              <div className="px-4 py-2 bg-bg-raised border-b border-border-dim">
                <span className="label-xs text-text-muted">{sport.toUpperCase()}</span>
              </div>
              {sportItems.map((item) => (
                <WatchlistItem
                  key={`${item.id}-${item.sport}-${item.type}`}
                  item={item}
                  onRemove={removeItem}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
