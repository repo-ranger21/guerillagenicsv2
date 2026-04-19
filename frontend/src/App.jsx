import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TopNav from "./components/layout/TopNav.jsx";
import LeagueSubNav from "./components/layout/LeagueSubNav.jsx";
import CommandCenter from "./components/layout/CommandCenter.jsx";
import FuturesLeaderboard from "./components/futures/FuturesLeaderboard.jsx";
import PlayoffBracket from "./components/bracket/PlayoffBracket.jsx";
import PlayerFutures from "./components/players/PlayerFutures.jsx";
import Watchlist from "./components/watchlist/Watchlist.jsx";
import MatchupCenter from "./components/matchups/MatchupCenter.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gg-bg text-gg-text font-sans">
        <TopNav />
        <LeagueSubNav />
        <main className="max-w-screen-2xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/nba/futures" replace />} />
            <Route path="/:sport/command-center" element={<CommandCenter />} />
            <Route path="/:sport/futures" element={<FuturesLeaderboard />} />
            <Route path="/:sport/bracket" element={<PlayoffBracket />} />
            <Route path="/:sport/players/:award" element={<PlayerFutures />} />
            <Route path="/:sport/players" element={<Navigate to="mvp" replace />} />
            <Route path="/:sport/matchups" element={<MatchupCenter />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="*" element={<Navigate to="/nba/futures" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
