import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Search, Settings, Bell } from "lucide-react";
import { useLeagueStore } from "../../store/leagueSlice.js";

const PAGES = ["FUTURES", "BRACKET", "PLAYERS", "WATCHLIST"];
const LEAGUES = ["NBA", "MLB", "NFL"];

export default function TopNav() {
  const { sport } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedLeague, setLeague } = useLeagueStore();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const activePage = location.pathname.split("/")[2]?.toUpperCase() || "FUTURES";
  const activeLeague = (sport || selectedLeague || "nba").toUpperCase();

  const handlePage = (page) => {
    const league = activeLeague.toLowerCase();
    if (page === "WATCHLIST") navigate("/watchlist");
    else if (page === "PLAYERS") navigate(`/${league}/players/mvp`);
    else navigate(`/${league}/${page.toLowerCase()}`);
  };

  const handleLeague = (league) => {
    setLeague(league.toLowerCase());
    const page = activePage === "WATCHLIST" ? "futures" : activePage.toLowerCase();
    navigate(`/${league.toLowerCase()}/${page}`);
  };

  return (
    <header className="bg-bg-void border-b border-border-default sticky top-0 z-50">
      <div className="h-16 px-6 flex items-center justify-between">

        {/* Left — Logo + page context */}
        <div className="flex items-center gap-3">
          <span className="font-display text-[14px] tracking-[0.2em] text-gg-green-500">
            GUERILLAGENICS
          </span>
          <span className="text-text-muted label-md">/</span>
          <span className="label-md text-text-muted">COMMAND CENTER</span>
        </div>

        {/* Center — Page navigation */}
        <nav className="flex gap-6">
          {PAGES.map((page) => (
            <button
              key={page}
              onClick={() => handlePage(page)}
              className={`label-md transition-colors ${
                activePage === page
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {page}
            </button>
          ))}
        </nav>

        {/* Right — League switcher + search + settings */}
        <div className="flex items-center gap-4">
          <div className="flex gap-4">
            {LEAGUES.map((league) => (
              <button
                key={league}
                onClick={() => handleLeague(league)}
                className={`label-md transition-colors ${
                  activeLeague === league
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {league}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border-default" />

          {/* Search */}
          <div className="relative w-64">
            <div
              className={`flex items-center gap-3 px-4 py-2.5 bg-bg-surface border transition-colors ${
                searchFocused ? "border-border-active" : "border-border-default"
              }`}
            >
              <Search size={14} className="text-text-muted shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search teams, players, futures..."
                className="flex-1 bg-transparent font-mono text-[11px] text-text-primary placeholder:text-text-muted outline-none"
                style={{ fontFamily: "var(--font-mono)" }}
              />
              {!searchFocused && !search && (
                <span className="label-xs text-text-muted">⌘K</span>
              )}
            </div>
          </div>

          <button className="text-text-muted hover:text-text-primary transition-colors">
            <Bell size={16} />
          </button>
          <button className="text-text-muted hover:text-text-primary transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
