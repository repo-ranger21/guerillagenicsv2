import { useParams, useNavigate, useLocation } from "react-router-dom";

const SPORT_SECTIONS = {
  nba: [
    { label: "FUTURES", path: "futures" },
    { label: "BRACKET", path: "bracket" },
    { label: "MVP", path: "players/mvp" },
    { label: "DPOY", path: "players/dpoy" },
    { label: "ROTY", path: "players/roty" },
    { label: "MATCHUPS", path: "matchups" },
  ],
  mlb: [
    { label: "FUTURES", path: "futures" },
    { label: "BRACKET", path: "bracket" },
    { label: "AL MVP", path: "players/mvp" },
    { label: "CY YOUNG", path: "players/cy_young" },
    { label: "ROTY", path: "players/roty" },
    { label: "MATCHUPS", path: "matchups" },
  ],
  nfl: [
    { label: "FUTURES", path: "futures" },
    { label: "BRACKET", path: "bracket" },
    { label: "MVP", path: "players/mvp" },
    { label: "DPOY", path: "players/dpoy" },
    { label: "ROTY", path: "players/roty" },
    { label: "MATCHUPS", path: "matchups" },
  ],
};

export default function LeagueSubNav() {
  const { sport } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (!sport) return null;

  const sections = SPORT_SECTIONS[sport.toLowerCase()] || [];
  const currentPath = location.pathname.replace(`/${sport}/`, "");

  return (
    <div className="bg-bg-surface border-b border-border-dim">
      <div className="px-6 flex items-center gap-6 h-9">
        {sections.map((s) => {
          const active = currentPath.startsWith(s.path);
          return (
            <button
              key={s.path}
              onClick={() => navigate(`/${sport}/${s.path}`)}
              className={`label-xs transition-colors py-2 border-b-2 ${
                active
                  ? "text-text-primary border-gg-green-500"
                  : "text-text-muted border-transparent hover:text-text-secondary"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
