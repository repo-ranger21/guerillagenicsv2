import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "";

async function fetchOddsMovement(sport, teamId, days = 30) {
  const res = await fetch(
    `${API_URL}/api/v1/odds/${sport}?team_id=${teamId}&days=${days}`
  );
  if (!res.ok) throw new Error(`Odds movement fetch failed: ${res.status}`);
  return res.json();
}

export function useOddsMovement(sport, teamId, days = 30) {
  return useQuery({
    queryKey: ["odds-movement", sport, teamId, days],
    queryFn: () => fetchOddsMovement(sport, teamId, days),
    enabled: !!sport && !!teamId,
    staleTime: 30 * 60 * 1000,
  });
}
