interface LeagueSwitcherProps {
  activeLeague: 'NBA' | 'MLB' | 'NFL';
  onChange: (league: 'NBA' | 'MLB' | 'NFL') => void;
  variant?: 'tabs' | 'pills';
  className?: string;
}

export function LeagueSwitcher({
  activeLeague,
  onChange,
  variant = 'tabs',
  className = '',
}: LeagueSwitcherProps) {
  const leagues: Array<'NBA' | 'MLB' | 'NFL'> = ['NBA', 'MLB', 'NFL'];

  if (variant === 'pills') {
    return (
      <div className={`inline-flex gap-2 ${className}`}>
        {leagues.map((league) => (
          <button
            key={league}
            onClick={() => onChange(league)}
            className={`px-4 py-2 label-md transition-colors ${
              activeLeague === league
                ? 'bg-bg-raised text-gg-green-500 border border-gg-green-500'
                : 'bg-bg-surface text-text-muted border border-border-default hover:text-text-secondary hover:border-border-active'
            }`}
          >
            {league}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-6 border-b border-border-dim ${className}`}>
      {leagues.map((league) => (
        <button
          key={league}
          onClick={() => onChange(league)}
          className={`pb-3 label-md transition-colors relative ${
            activeLeague === league
              ? 'text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {league}
          {activeLeague === league && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gg-green-500" />
          )}
        </button>
      ))}
    </div>
  );
}
