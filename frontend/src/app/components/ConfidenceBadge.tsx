interface ConfidenceBadgeProps {
  tier: 'NEEDLE' | 'LOCK' | 'LEAN' | 'WATCH' | 'FADE';
  className?: string;
}

export function ConfidenceBadge({ tier, className = '' }: ConfidenceBadgeProps) {
  const config = {
    NEEDLE: {
      color: 'signal-needle',
      bg: 'rgba(132, 255, 71, 0.06)',
      border: 'rgba(132, 255, 71, 0.2)',
      showDot: true,
    },
    LOCK: {
      color: 'signal-lock',
      bg: 'rgba(132, 255, 71, 0.08)',
      border: 'rgba(132, 255, 71, 0.15)',
      showDot: false,
    },
    LEAN: {
      color: 'signal-lean',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.15)',
      showDot: false,
    },
    WATCH: {
      color: 'signal-watch',
      bg: 'rgba(85, 85, 85, 0.08)',
      border: 'rgba(85, 85, 85, 0.15)',
      showDot: false,
    },
    FADE: {
      color: 'signal-fade',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.15)',
      showDot: false,
    },
  };

  const { color, bg, border, showDot } = config[tier];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${className}`}
      style={{
        backgroundColor: bg,
        borderLeft: `1px solid ${border}`,
      }}
    >
      {showDot && (
        <span
          className="w-1 h-1 rounded-full animate-needle-pulse"
          style={{ backgroundColor: `var(--${color})` }}
        />
      )}
      <span
        className="label-xs"
        style={{ color: `var(--${color})` }}
      >
        {tier}
      </span>
    </div>
  );
}
