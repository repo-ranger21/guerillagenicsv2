import { SearchBar } from './SearchBar';
import { Settings } from 'lucide-react';

interface TopNavProps {
  activePage: 'FUTURES' | 'BRACKET' | 'PLAYERS' | 'WATCHLIST';
  onPageChange: (page: 'FUTURES' | 'BRACKET' | 'PLAYERS' | 'WATCHLIST') => void;
  activeLeague: 'NBA' | 'MLB' | 'NFL';
  onLeagueChange: (league: 'NBA' | 'MLB' | 'NFL') => void;
  className?: string;
}

export function TopNav({
  activePage,
  onPageChange,
  activeLeague,
  onLeagueChange,
  className = '',
}: TopNavProps) {
  const pages: Array<'FUTURES' | 'BRACKET' | 'PLAYERS' | 'WATCHLIST'> = [
    'FUTURES',
    'BRACKET',
    'PLAYERS',
    'WATCHLIST',
  ];
  const leagues: Array<'NBA' | 'MLB' | 'NFL'> = ['NBA', 'MLB', 'NFL'];

  return (
    <div className={`bg-bg-void border-b border-border-default ${className}`}>
      {/* Main Nav */}
      <div className="h-16 px-6 flex items-center justify-between">
        {/* Left - Branding */}
        <div className="flex items-center gap-3">
          <div className="font-display text-[14px] tracking-[0.2em] text-gg-green-500">
            GUERILLAGENICS
          </div>
          <div className="text-text-muted">/</div>
          <div className="label-md text-text-muted">COMMAND CENTER</div>
        </div>

        {/* Center - Page Nav */}
        <div className="flex gap-6">
          {pages.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`label-md transition-colors ${
                activePage === page
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Right - League Switcher + Settings */}
        <div className="flex items-center gap-4">
          <div className="flex gap-4">
            {leagues.map((league) => (
              <button
                key={league}
                onClick={() => onLeagueChange(league)}
                className={`label-md transition-colors ${
                  activeLeague === league
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {league}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-border-dim" />
          <SearchBar className="w-64" />
          <button className="text-text-muted hover:text-text-primary transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
