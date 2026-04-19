export const TIER_CONFIG = {
  NEEDLE: {
    label: "◈ NEEDLE",
    color: "#84ff47",
    bg: "rgba(132, 255, 71, 0.08)",
    border: "rgba(132, 255, 71, 0.3)",
    className: "text-gg-needle",
    badgeClass: "bg-gg-needle-bg text-gg-needle border border-gg-needle/30",
  },
  LOCK: {
    label: "▲ LOCK",
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.08)",
    border: "rgba(52, 211, 153, 0.3)",
    className: "text-gg-lock",
    badgeClass: "bg-gg-lock-bg text-gg-lock border border-gg-lock/30",
  },
  LEAN: {
    label: "→ LEAN",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.08)",
    border: "rgba(251, 191, 36, 0.3)",
    className: "text-gg-lean",
    badgeClass: "bg-gg-lean-bg text-gg-lean border border-gg-lean/30",
  },
  FAIR: {
    label: "◇ FAIR",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.06)",
    border: "rgba(148, 163, 184, 0.2)",
    className: "text-gg-fair",
    badgeClass: "bg-gg-fair-bg text-gg-fair border border-gg-fair/20",
  },
  FADE: {
    label: "▽ FADE",
    color: "#f87171",
    bg: "rgba(248, 113, 113, 0.08)",
    border: "rgba(248, 113, 113, 0.3)",
    className: "text-gg-fade",
    badgeClass: "bg-gg-fade-bg text-gg-fade border border-gg-fade/30",
  },
};

export function getTierConfig(tier) {
  return TIER_CONFIG[tier?.toUpperCase()] ?? TIER_CONFIG.FAIR;
}
