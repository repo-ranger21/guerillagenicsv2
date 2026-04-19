import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "";

async function fetchPlayerFutures(sport, award, season) {
  const params = season ? `?season=${season}` : "";
  const res = await fetch(`${API_URL}/api/v1/player-futures/${sport}/${award}${params}`);
  if (!res.ok) throw new Error(`Player futures fetch failed: ${res.status}`);
  return res.json();
}

export function usePlayerFutures(sport, award, season) {
  return useQuery({
    queryKey: ["player-futures", sport, award, season],
    queryFn: () => fetchPlayerFutures(sport, award, season),
    enabled: !!sport && !!award,
    staleTime: 10 * 60 * 1000,
  });
}
