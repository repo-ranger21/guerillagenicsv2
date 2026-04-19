interface LoadingStateProps {
  message?: string;
  className?: string;
}

interface EmptyStateProps {
  message: string;
  submessage?: string;
  className?: string;
}

export function LoadingState({ message = 'LOADING INTEL...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      <div className="space-y-4 w-full max-w-md">
        <div className="h-24 animate-shimmer rounded-none" />
        <div className="h-16 animate-shimmer rounded-none" />
        <div className="h-16 animate-shimmer rounded-none" />
      </div>
      <div className="label-md text-text-muted mt-8">{message}</div>
    </div>
  );
}

export function EmptyState({ message, submessage, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      <div className="font-display text-[128px] text-text-ghost leading-none">
        {message}
      </div>
      {submessage && (
        <div className="label-xs text-text-muted mt-4">{submessage}</div>
      )}
    </div>
  );
}
