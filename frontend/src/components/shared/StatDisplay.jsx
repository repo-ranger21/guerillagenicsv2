import { ArrowUp, ArrowDown } from "lucide-react";

const SIZE_MAP = {
  large:      "text-[96px]",
  medium:     "text-[48px]",
  small:      "text-[32px]",
  comparison: "text-[32px]",
};

export default function StatDisplay({
  value,
  label,
  variant = "medium",
  trend,
  subvalue,
  modelValue,
  marketValue,
  edge,
  highlighted = false,
  dimmed = false,
  className = "",
}) {
  const opacity = dimmed ? "opacity-40" : "opacity-100";
  const arrowSize = variant === "large" ? 32 : 20;
  const valueColor = highlighted ? "text-gg-green-500" : "text-text-primary";

  if (variant === "comparison" && modelValue && marketValue) {
    return (
      <div className={`flex flex-col ${opacity} ${className}`}>
        <div className="label-xs text-text-muted mb-1">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[32px] text-gg-green-500">{modelValue}</span>
          <span className="font-display text-[24px] text-text-secondary">/</span>
          <span className="font-display text-[32px] text-text-secondary">{marketValue}</span>
        </div>
        {edge && (
          <div className="font-mono text-[9px] text-gg-green-500 mt-1">
            EDGE {edge}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${opacity} ${className}`}>
      <div className="label-xs text-text-muted mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`font-display ${SIZE_MAP[variant]} leading-none ${valueColor}`}>
          {value}
        </span>
        {trend && (
          <span className={trend === "up" ? "text-data-positive" : "text-data-negative"}>
            {trend === "up" ? <ArrowUp size={arrowSize} /> : <ArrowDown size={arrowSize} />}
          </span>
        )}
      </div>
      {subvalue && (
        <div className="font-mono text-[10px] text-text-secondary mt-1">{subvalue}</div>
      )}
    </div>
  );
}
