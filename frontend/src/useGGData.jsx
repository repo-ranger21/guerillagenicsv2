import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   useGGData — live picks via FastAPI, seed everything else.

   Drop-in replacement for the seed-only provider: the context surface
   (picks, standings, lastNight, lineMovement, audit, season, source) is
   unchanged, so PageDossiers/PageStandings/PageMovement/PageAudit keep reading
   useGG() exactly as they do today.

   picks + season now come live from GET ${VITE_API_URL}/api/v1/picks/today
   (the press route that merges picks_daily + picks_editorial). Standings,
   lastNight, and lineMovement stay on SEED until their own endpoints exist —
   wire each the same way when ready. DataStatusPill reflects pick freshness.
   ───────────────────────────────────────────────────────────────────────────── */

const API_URL = import.meta.env.VITE_API_URL || "";
const CACHE_KEY = "gg:picks:v1";
const REFRESH_MS = 5 * 60 * 1000;

const GGDataContext = createContext(null);

const safeCache = {
  read() {
    try {
      const r = localStorage.getItem(CACHE_KEY);
      return r ? JSON.parse(r) : null;
    } catch { return null; }
  },
  write(v) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* quota or SSR */ }
  },
};

export function GGDataProvider({ seed, children }) {
  const cached = safeCache.read();
  const [live, setLive] = useState(() => cached?.live || null);
  const [source, setSource] = useState(() => (cached?.live ? "cached" : "seed"));
  const [updatedAt, setUpdatedAt] = useState(() => cached?.at || null);
  const mounted = useRef(true);

  const fetchPicks = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/picks/today`, { cache: "no-store" });
      if (!res.ok) throw new Error(`picks ${res.status}`);
      const payload = await res.json();
      if (!mounted.current) return;
      const at = new Date().toISOString();
      setLive(payload);
      setSource("live");
      setUpdatedAt(at);
      safeCache.write({ live: payload, at });
    } catch {
      if (!mounted.current) return;
      setSource((prev) => (prev === "live" ? "cached" : prev));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchPicks();
    const id = setInterval(fetchPicks, REFRESH_MS);
    return () => { mounted.current = false; clearInterval(id); };
  }, [fetchPicks]);

  // Live picks/season override seed. A live payload with zero picks still
  // beats seed (it's a real "no picks today") — key off whether fetch succeeded.
  const value = {
    picks:        source === "live" || source === "cached" ? (live?.picks ?? []) : seed.picks,
    season:       (live?.season && Object.keys(live.season).length) ? live.season : seed.season,
    standings:    seed.standings,     // TODO: wire to /standings when ready
    lastNight:    seed.lastNight,     // TODO: wire when endpoint exists
    lineMovement: seed.lineMovement,  // TODO: wire when endpoint exists
    audit:        seed.audit,         // TODO: wire when endpoint exists
    date:         live?.date || seed.date,
    source,
    updatedAt,
    refresh: fetchPicks,
  };

  return <GGDataContext.Provider value={value}>{children}</GGDataContext.Provider>;
}

export function useGG() {
  const ctx = useContext(GGDataContext);
  if (!ctx) throw new Error("useGG must be used within GGDataProvider");
  return ctx;
}

export function DataStatusPill({ style = {} }) {
  const { source, updatedAt, refresh } = useContext(GGDataContext) ?? {};
  const map = {
    live:   { c: "#00A852", bg: "rgba(0,168,82,.11)",   bd: "rgba(0,168,82,.28)",   label: "● LIVE" },
    cached: { c: "#C8780A", bg: "rgba(200,120,10,.10)", bd: "rgba(200,120,10,.28)", label: "◎ CACHED" },
    seed:   { c: "#C8780A", bg: "rgba(200,120,10,.10)", bd: "rgba(200,120,10,.28)", label: "◎ SEED" },
  };
  const s = map[source] || map.seed;
  const when = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <button
      onClick={refresh}
      title="Click to refresh picks"
      style={{
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: 7,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        padding: "2px 6px",
        borderRadius: 1,
        cursor: "pointer",
        color: s.c,
        background: s.bg,
        border: `1px solid ${s.bd}`,
        ...style,
      }}
    >
      {s.label}{when && (source === "live" || source === "cached") ? ` · ${when}` : ""}
    </button>
  );
}
