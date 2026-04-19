import { useQuery } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "";

async function fetchNeedles(sport) {
  const endpoint = sport
    ? `${API_URL}/api/v1/needle/${sport}`
    : `${API_URL}/api/v1/alerts/needle`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Needle fetch failed: ${res.status}`);
  return res.json();
}

export function useNeedles(sport) {
  return useQuery({
    queryKey: ["needles", sport],
    queryFn: () => fetchNeedles(sport),
    refetchInterval: 10 * 60 * 1000,
  });
}
