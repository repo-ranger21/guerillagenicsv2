import { useState } from "react";
import { useParams } from "react-router-dom";
import { useFutures } from "../../hooks/useFutures.js";
import { useNeedles } from "../../hooks/useNeedles.js";
import FuturesCard from "./FuturesCard.jsx";
import NeedleAlert from "./NeedleAlert.jsx";
import TierBadge from "../shared/TierBadge.jsx";
import LoadingState from "../shared/LoadingState.jsx";
import ErrorState from "../shared/ErrorState.jsx";

const TIERS = ["NEEDLE", "LOCK", "LEAN", "WATCH", "FADE"];

const TABLE_HEADERS = [
  { label: "RANK",    align: "left"  },
  { label: "TEAM",    align: "left"  },
  { label: "CFS",     align: "right" },
  { label: "MODEL%",  align: "right" },
  { label: "MKT%",    align: "right" },
  { label: "EDGE",    align: "right" },
  { label: "MDI",     align: "right" },
  { label: "HEALTH",  align: "right" },
  { label: "TIER",    align: "right" },
];

export default function FuturesLeaderboard() {
  const { sport } = useParams();
  const [tierFilter, setTierFilter] = useState(null);
  const [needleOnly, setNeedleOnly] = useState(false);

  const { data: futuresData, isLoading, error, refetch } = useFutures(sport);
  const { data: needlesData } = useNeedles(sport);

  if (isLoading) return <LoadingState label="LOADING FUTURES" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const teams = futuresData?.teams ?? [];
  const topNeedle = needlesData?.needles?.[0];

  const filtered = teams.filter((t) => {
    if (needleOnly && !t.isNeedle) return false;
    if (tierFilter && t.tier !== tierFilter) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-bg-void">
      {/* Sidebar filters */}
      <aside className="w-60 bg-bg-surface border-r border-border-dim p-6 shrink-0">
        <div className="label-md text-text-primary mb-6">FILTERS</div>

        {/* Needle-only toggle */}
        <div className="mb-8">
          <button
            onClick={() => setNeedleOnly((v) => !v)}
            className={`w-full px-4 py-3 border transition-all ${
              needleOnly
                ? "border-gg-green-500 bg-[rgba(132,255,71,0.06)] text-gg-green-500"
                : "border-border-default bg-bg-raised text-text-muted hover:border-border-active"
            }`}
          >
            <div className="label-sm">NEEDLE ONLY</div>
            <div className="font-mono text-[8px] mt-1" style={{ fontFamily: "var(--font-mono)" }}>
              {needleOnly ? "ACTIVE" : "INACTIVE"}
            </div>
          </button>
        </div>

        {/* Tier filter */}
        <div className="space-y-3">
          <div className="label-xs text-text-muted">CONFIDENCE TIER</div>
          {TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tierFilter === tier ? null : tier)}
              className={`w-full text-left transition-opacity ${
                tierFilter === null || tierFilter === tier ? "opacity-100" : "opacity-40"
              }`}
            >
              <TierBadge tier={tier} />
            </button>
          ))}
        </div>

        {/* Active filters */}
        {(tierFilter || needleOnly) && (
          <div className="mt-8 pt-6 border-t border-border-dim">
            <div className="label-xs text-text-muted mb-3">ACTIVE</div>
            <div className="space-y-2">
              {needleOnly && (
                <div className="px-2 py-1 bg-bg-raised border border-border-dim flex justify-between items-center">
                  <span className="font-mono text-[8px] text-text-secondary">NEEDLE ONLY</span>
                  <button onClick={() => setNeedleOnly(false)} className="text-text-muted text-[10px]">×</button>
                </div>
              )}
              {tierFilter && (
                <div className="px-2 py-1 bg-bg-raised border border-border-dim flex justify-between items-center">
                  <span className="font-mono text-[8px] text-text-secondary">{tierFilter}</span>
                  <button onClick={() => setTierFilter(null)} className="text-text-muted text-[10px]">×</button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Needle spotlight card */}
        {topNeedle && !needleOnly && !tierFilter && (
          <div className="p-6">
            <NeedleAlert
              data={topNeedle}
              onAnalyze={() => setTierFilter("NEEDLE")}
            />
          </div>
        )}

        {/* Table */}
        <div className="bg-bg-surface">
          {/* Sticky header */}
          <div
            className="h-10 items-center px-4 bg-bg-void border-b border-border-default sticky top-0 z-10 hidden md:grid"
            style={{ gridTemplateColumns: "60px 1fr 80px 100px 100px 100px 80px 80px 120px", gap: "16px" }}
          >
            {TABLE_HEADERS.map((h) => (
              <div
                key={h.label}
                className={`label-xs text-text-muted ${h.align === "right" ? "text-right" : ""}`}
              >
                {h.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((team) => (
            <FuturesCard
              key={team.abbreviation || team.rank}
              data={team}
              expandable
            />
          ))}

          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="font-display text-[64px] text-text-ghost">NO MATCHES</div>
              <div className="label-xs text-text-muted mt-4">ADJUST YOUR FILTERS</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
