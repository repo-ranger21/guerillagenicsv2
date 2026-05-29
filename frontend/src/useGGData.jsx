import { createContext, useContext } from "react";

const GGDataContext = createContext(null);

export function GGDataProvider({ seed, children }) {
  return (
    <GGDataContext.Provider value={{ ...seed, source: "seed" }}>
      {children}
    </GGDataContext.Provider>
  );
}

export function useGG() {
  const ctx = useContext(GGDataContext);
  if (!ctx) throw new Error("useGG must be used within GGDataProvider");
  return ctx;
}

export function DataStatusPill({ style = {} }) {
  const { source } = useContext(GGDataContext) ?? {};
  const live = source === "live";
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono',monospace",
      fontSize: 7,
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      padding: "2px 6px",
      border: `1px solid ${live ? "rgba(0,168,82,.28)" : "rgba(200,120,10,.28)"}`,
      color: live ? "#00A852" : "#C8780A",
      background: live ? "rgba(0,168,82,.11)" : "rgba(200,120,10,.10)",
      borderRadius: 1,
      ...style,
    }}>
      {live ? "● LIVE" : "◎ SEED"}
    </span>
  );
}
