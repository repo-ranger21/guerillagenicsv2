import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function fetchStandings(sport) {
  return fetch(`${API_BASE}/api/v1/standings/${sport}`).then((r) => {
    if (!r.ok) throw new Error(`standings ${r.status}`);
    return r.json();
  });
}

function MatchupRow({ home, away }) {
  const homeFav = (home.cfs_score ?? 50) >= (away.cfs_score ?? 50);
  return (
    <div className="border-b border-border-dim hover:bg-bg-raised transition-colors">
      <div
        className="h-16 grid items-center px-4"
        style={{ gridTemplateColumns: "1fr 60px 1fr", gap: "16px" }}
      >
        <div className={`flex items-center gap-3 ${homeFav ? "" : "opacity-60"}`}>
          <div className="font-display text-[20px] text-text-primary">{home.abbreviation}</div>
          <div>
            <div className="label-xs text-text-muted">{home.full_name}</div>
            <div className="font-mono text-[10px] text-gg-green-500">
              {home.cfs_score != null ? `${home.cfs_score.toFixed(1)} CFS` : ""}
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="label-xs text-text-ghost">VS</div>
        </div>

        <div className={`flex items-center gap-3 justify-end ${!homeFav ? "" : "opacity-60"}`}>
          <div>
            <div className="label-xs text-text-muted text-right">{away.full_name}</div>
            <div className="font-mono text-[10px] text-gg-green-500 text-right">
              {away.cfs_score != null ? `${away.cfs_score.toFixed(1)} CFS` : ""}
            </div>
          </div>
          <div className="font-display text-[20px] text-text-primary">{away.abbreviation}</div>
        </div>
      </div>
    </div>
  );
}

const MOCK_MATCHUPS = [
  { home: { abbreviation: "BOS", full_name: "Boston Celtics", cfs_score: 82.4 }, away: { abbreviation: "NYK", full_name: "New York Knicks", cfs_score: 71.2 } },
  { home: { abbreviation: "OKC", full_name: "Oklahoma City Thunder", cfs_score: 88.1 }, away: { abbreviation: "MEM", full_name: "Memphis Grizzlies", cfs_score: 66.3 } },
  { home: { abbreviation: "DEN", full_name: "Denver Nuggets", cfs_score: 79.5 }, away: { abbreviation: "LAL", full_name: "Los Angeles Lakers", cfs_score: 68.7 } },
  { home: { abbreviation: "MIL", full_name: "Milwaukee Bucks", cfs_score: 74.8 }, away: { abbreviation: "IND", full_name: "Indiana Pacers", cfs_score: 69.1 } },
];

export default function MatchupCenter() {
  const { sport } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["standings", sport],
    queryFn: () => fetchStandings(sport),
    staleTime: 5 * 60 * 1000,
  });

  const teams = data?.standings ?? [];
  const matchups = teams.length >= 2
    ? Array.from({ length: Math.floor(teams.length / 2) }, (_, i) => ({
        home: teams[i * 2],
        away: teams[i * 2 + 1],
      }))
    : MOCK_MATCHUPS;

  return (
    <div className="min-h-screen bg-bg-void">
      <div className="p-6 border-b border-border-default">
        <div className="font-display text-[32px] text-text-primary">
          {sport?.toUpperCase()} MATCHUP CENTER
        </div>
        <div className="label-xs text-text-muted mt-1">
          MODEL PROJECTIONS · {matchups.length} MATCHUPS
        </div>
      </div>

      <div className="bg-bg-surface">
        <div
          className="h-10 grid items-center px-4 bg-bg-void border-b border-border-default sticky top-0 z-10"
          style={{ gridTemplateColumns: "1fr 60px 1fr", gap: "16px" }}
        >
          <div className="label-xs text-text-muted">HOME</div>
          <div className="label-xs text-text-muted text-center">—</div>
          <div className="label-xs text-text-muted text-right">AWAY</div>
        </div>

        {isLoading && (
          <div className="p-12 text-center">
            <div className="font-display text-[32px] text-text-ghost animate-pulse">LOADING</div>
          </div>
        )}

        {!isLoading && matchups.map((m, i) => (
          <MatchupRow key={i} home={m.home} away={m.away} />
        ))}

        {!isLoading && matchups.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-display text-[48px] text-text-ghost">NO MATCHUPS</div>
          </div>
        )}
      </div>
    </div>
  );
}
