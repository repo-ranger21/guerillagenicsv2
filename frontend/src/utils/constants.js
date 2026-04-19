export const SPORTS = ["nba", "mlb", "nfl"];

export const SPORT_LABELS = { nba: "NBA", mlb: "MLB", nfl: "NFL" };

export const AWARD_OPTIONS = {
  nba: [
    { value: "mvp", label: "MVP" },
    { value: "dpoy", label: "DPOY" },
    { value: "roty", label: "ROTY" },
    { value: "sixth_man", label: "6th Man" },
  ],
  mlb: [
    { value: "mvp", label: "MVP" },
    { value: "cy_young", label: "Cy Young" },
    { value: "roty", label: "ROTY" },
    { value: "hank_aaron", label: "Hank Aaron" },
  ],
  nfl: [
    { value: "mvp", label: "MVP" },
    { value: "dpoy", label: "DPOY" },
    { value: "roty", label: "ROTY" },
    { value: "offensive_player", label: "OPOY" },
  ],
};

export const ESPN_TEAM_IDS = {
  nba: {
    BOS: "2", LAL: "13", GSW: "9", OKC: "25", CLE: "5",
    DEN: "7", MIL: "15", MIA: "14", NYK: "18", PHI: "20",
  },
  mlb: {
    LAD: "19", NYY: "10", BOS: "4", HOU: "18", ATL: "15",
    PHI: "22", SF: "26", NYM: "21", ARI: "29", MIL: "158",
  },
  nfl: {
    KC: "12", BAL: "33", SF: "25", BUF: "2", PHI: "21",
    DAL: "6", DET: "8", GB: "9", LAR: "14", HOU: "34",
  },
};

export const API_BASE = import.meta.env.VITE_API_URL || "";
