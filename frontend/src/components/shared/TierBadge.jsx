const TIER_CONFIG = {
  NEEDLE: {
    color: "var(--signal-needle)",
    bg: "rgba(132, 255, 71, 0.06)",
    border: "rgba(132, 255, 71, 0.2)",
    showDot: true,
  },
  LOCK: {
    color: "var(--signal-lock)",
    bg: "rgba(52, 211, 153, 0.08)",
    border: "rgba(52, 211, 153, 0.15)",
    showDot: false,
  },
  LEAN: {
    color: "var(--signal-lean)",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.15)",
    showDot: false,
  },
  WATCH: {
    color: "var(--signal-watch)",
    bg: "rgba(85, 85, 85, 0.08)",
    border: "rgba(85, 85, 85, 0.15)",
    showDot: false,
  },
  FADE: {
    color: "var(--signal-fade)",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.15)",
    showDot: false,
  },
};

export default function TierBadge({ tier, className = "" }) {
  const cfg = TIER_CONFIG[tier?.toUpperCase()] ?? TIER_CONFIG.WATCH;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${className}`}
      style={{ backgroundColor: cfg.bg, borderLeft: `1px solid ${cfg.border}` }}
    >
      {cfg.showDot && (
        <span
          className="w-1 h-1 rounded-full animate-needle-pulse"
          style={{ backgroundColor: cfg.color }}
        />
      )}
      <span className="label-xs" style={{ color: cfg.color }}>
        {tier}
      </span>
    </div>
  );
}
