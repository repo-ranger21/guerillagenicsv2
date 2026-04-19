import { useState } from 'react';
import { TopNav } from './components/TopNav';
import { FuturesLeaderboard } from './pages/FuturesLeaderboard';
import { TeamDeepDive } from './pages/TeamDeepDive';
import { PlayoffBracket } from './pages/PlayoffBracket';
import { PlayerFutures } from './pages/PlayerFutures';
import { Watchlist } from './pages/Watchlist';

type Page = 'FUTURES' | 'BRACKET' | 'PLAYERS' | 'WATCHLIST' | 'TEAM_DEEP_DIVE';
type League = 'NBA' | 'MLB' | 'NFL';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('FUTURES');
  const [activeLeague, setActiveLeague] = useState<League>('NBA');

  const renderPage = () => {
    switch (activePage) {
      case 'FUTURES':
        return <FuturesLeaderboard />;
      case 'BRACKET':
        return <PlayoffBracket />;
      case 'PLAYERS':
        return <PlayerFutures />;
      case 'WATCHLIST':
        return <Watchlist />;
      case 'TEAM_DEEP_DIVE':
        return <TeamDeepDive />;
      default:
        return <FuturesLeaderboard />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-void">
      <TopNav
        activePage={activePage === 'TEAM_DEEP_DIVE' ? 'FUTURES' : activePage}
        onPageChange={setActivePage}
        activeLeague={activeLeague}
        onLeagueChange={setActiveLeague}
      />
      {renderPage()}
    </div>
  );
}
