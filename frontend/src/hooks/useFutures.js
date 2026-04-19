import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "";

async function fetchFutures(sport, season) {
  const params = season ? `?season=${season}` : "";
  const res = await fetch(`${API_URL}/api/v1/futures/${sport}${params}`);
  if (!res.ok) throw new Error(`Futures fetch failed: ${res.status}`);
  return res.json();
}

export function useFutures(sport, season) {
  return useQuery({
    queryKey: ["futures", sport, season],
    queryFn: () => fetchFutures(sport, season),
    enabled: !!sport,
    staleTime: 5 * 60 * 1000,
  });
}
