import { TriangleAlert } from "lucide-react";

export default function ErrorState({ message = "Failed to load data", onRetry }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <TriangleAlert size={32} className="text-signal-fade mx-auto mb-4" />
        <div className="font-display text-[32px] text-text-primary">ERROR</div>
        <div className="label-xs text-text-muted mt-2">{message}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-6 px-6 py-2 border border-border-default label-sm text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
          >
            RETRY
          </button>
        )}
      </div>
    </div>
  );
}
