import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "";

async function fetchBracket(sport, season) {
  const params = season ? `?season=${season}` : "";
  const res = await fetch(`${API_URL}/api/v1/bracket/${sport}${params}`);
  if (!res.ok) throw new Error(`Bracket fetch failed: ${res.status}`);
  return res.json();
}

export function useBracket(sport, season) {
  return useQuery({
    queryKey: ["bracket", sport, season],
    queryFn: () => fetchBracket(sport, season),
    enabled: !!sport,
    staleTime: 15 * 60 * 1000,
  });
}
