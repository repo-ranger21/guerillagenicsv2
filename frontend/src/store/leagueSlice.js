import { create } from "zustand";

export const useLeagueStore = create((set) => ({
  selectedLeague: "nba",
  setLeague: (league) => set({ selectedLeague: league }),
  availableLeagues: ["nba", "mlb", "nfl"],
}));
