import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { removeVigMultiplicative, futuresEvAnnualized } from "./utils/bettingMath";
import { useAuth } from './lib/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { TierGate } from './components/auth/TierGate';
import { useNeedleAlerts } from './hooks/useNeedleAlerts';
import { useFuturesEdge } from './hooks/useFuturesEdge';
import { useWatchlist } from './hooks/useWatchlist';
import { formatAmerican } from './utils/oddsFormatter';

/* ═══════════════════════════════════════════════════════════════
   FONT INJECTION
═══════════════════════════════════════════════════════════════ */
if (!document.getElementById("gg-fonts")) {
  const l = document.createElement("link");
  l.id = "gg-fonts";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap";
  document.head.appendChild(l);
}

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════ */
const C = {
  ink: "#141210",
  ink2: "#1E1B17",
  inkBorder: "rgba(255,255,255,.06)",
  paper: "#F2EDE2",
  paper2: "#E8E2D4",
  paper3: "#DDD7C8",
  cream: "#FAF7F0",
  rule: "#C2B99E",
  ruleLt: "#DAD3C0",
  ghost: "#8E8472",
  green: "#00A852",
  greenLt: "rgba(0,168,82,.11)",
  greenBd: "rgba(0,168,82,.28)",
  amber: "#C8780A",
  amberLt: "rgba(200,120,10,.10)",
  amberBd: "rgba(200,120,10,.28)",
  red: "#B32820",
  redLt: "rgba(179,40,32,.09)",
  redBd: "rgba(179,40,32,.26)",
  blue: "#1A4C88",
  blueLt: "rgba(26,76,136,.09)",
  blueBd: "rgba(26,76,136,.28)",
  mlb: "#C8780A",
  nba: "#1A4C88",
  dfs: "#006B3C",
  stamp: "#9E2820",
  serif: "'DM Serif Display',serif",
  mono: "'IBM Plex Mono',monospace",
  display: "'Bebas Neue',sans-serif",
};

/* ═══════════════════════════════════════════════════════════════
   FORMULA ENGINE
═══════════════════════════════════════════════════════════════ */
const FE = {
  amToDecimal: (o) => (o > 0 ? o / 100 : 100 / Math.abs(o)),
  impliedProb: (o) => (o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100)),
  kelly: (p, o) => {
    const b = FE.amToDecimal(o),
      q = 1 - p;
    return Math.max(0, (b * p - q) / b);
  },
  evi: (p, o) => {
    const b = FE.amToDecimal(o),
      q = 1 - p;
    return (p * b - q) * 100;
  },
  compositeProb: (c) => {
    const W = { era: 0.25, fip: 0.2, woba: 0.2, momentum: 0.15, line: 0.12, ts: 0.08 };
    let ws = 0,
      wt = 0;
    Object.entries(c).forEach(([k, v]) => {
      if (W[k] !== undefined && v != null) {
        ws += v * W[k];
        wt += W[k];
      }
    });
    return wt === 0 ? 0.5 : 0.48 + ws * 0.3;
  },
  fipDiff: (fip1, fip2) => fip2 - fip1,
  xfipEVI: (fipDiff, oddsLine) => {
    const baseProb = 0.5 + fipDiff * 0.03;
    return FE.evi(Math.min(0.78, Math.max(0.38, baseProb)), oddsLine);
  },
  bankroll: (kf, rolls = [500, 1000, 2500, 5000]) =>
    rolls.map((b) => ({ b, bet: +(b * kf).toFixed(2) })),
  sgpCorr: (legs) => {
    if (!legs || legs.length < 2) return 0;
    const pairs = [];
    for (let i = 0; i < legs.length - 1; i++)
      for (let j = i + 1; j < legs.length; j++) pairs.push(legs[i].corr?.[legs[j].id] ?? 0);
    return pairs.reduce((a, b) => a + b, 0) / pairs.length;
  },
};

/* ═══════════════════════════════════════════════════════════════
   REAL DATA — March 26, 2026
═══════════════════════════════════════════════════════════════ */
const TODAY = "March 26, 2026";

// Active pick dossiers — real games, real lines
const PICKS = [
  {
    id: "lad",
    file: "001-A",
    sport: "MLB",
    tag: "Tonight",
    pick: "LAD −1.5 RUN LINE",
    game: "Arizona D-backs @ LA Dodgers",
    time: "8:30PM ET · NBC/Peacock · Dodger Stadium",
    odds: -118,
    headline: [
      "The case for ",
      "LAD −1.5",
      ": Yamamoto vs. Gallen — the largest Opening Day line since the 2003 Yankees.",
    ],
    subline: "Arizona D-backs vs. LA Dodgers · Run Line −1.5 (−118) · 8:30PM ET · Dodger Stadium",
    lineSignal: {
      from: "−1.5 (−105)",
      to: "−1.5 (−118)",
      type: "SHARP",
      detail: "Dodgers drawing 71% of handle",
    },
    components: { era: 0.88, fip: 0.85, woba: 0.8, momentum: 0.82, line: 0.79, ts: 0.75 },
    formulas: [
      {
        num: "01",
        name: "FIP DIFF",
        value: "+1.42",
        raw: 1.42,
        pct: 85,
        verdict: "bull",
        src: "FanGraphs",
        bench: "Yamamoto vs Gallen",
      },
      {
        num: "02",
        name: "wOBA ADV",
        value: "+.048",
        raw: 0.048,
        pct: 78,
        verdict: "bull",
        src: "FanGraphs",
        bench: "LAD lineup edge",
      },
      {
        num: "03",
        name: "EVI",
        value: "live",
        raw: null,
        pct: null,
        verdict: "bull",
        src: "GG Model",
        bench: "≥ +3.0% ✓",
      },
      {
        num: "04",
        name: "K/9 ADV",
        value: "+3.2",
        raw: 3.2,
        pct: 72,
        verdict: "bull",
        src: "Statcast",
        bench: "Yamamoto 11.4 K/9",
      },
      {
        num: "05",
        name: "3-PEAT MOMENTUM",
        value: "0.89",
        raw: 0.89,
        pct: 89,
        verdict: "bull",
        src: "GG Model",
        bench: "WS MVP returning",
      },
    ],
    sgpLegs: [
      { id: "l1", label: "Leg 01 · Run Line", pick: "LAD −1.5", corr: { l2: 0.68, l3: 0.54 } },
      {
        id: "l2",
        label: "Leg 02 · Strikeouts",
        pick: "Yamamoto OVER 7.5 K",
        corr: { l1: 0.68, l3: 0.41 },
      },
      {
        id: "l3",
        label: "Leg 03 · Team Total",
        pick: "LAD OVER 4.5 Runs",
        corr: { l1: 0.54, l2: 0.41 },
      },
      {
        id: "l4",
        label: "Leg 04 · AVOID",
        pick: "Gallen OVER 5.5 K",
        avoid: true,
        corr: { l1: -0.38, l2: -0.22, l3: -0.31 },
      },
    ],
    activeLegs: ["l1", "l2", "l3"],
    analysis: [
      {
        text: [
          "Yoshinobu Yamamoto starts as the ",
          "reigning World Series MVP",
          " against a Gallen who's been inconsistent in Cactus League action. The Dodgers are the heaviest Opening Day favorite since the 2003 Yankees at −250 to −266 on the ML — the run line at −118 represents meaningful value extraction.",
        ],
      },
      {
        pull: "The books opened this at −1.5 (−105). It's now −118. That 13-cent steam move is the sharp community confirming what the model already sees — Yamamoto in Dodger Stadium against a thin Arizona lineup is a mismatch.",
      },
      {
        text: [
          "Kyle Tucker and Edwin Díaz join a roster that won the ",
          "2025 World Series",
          ". Dodgers' win total is set at 102.5 — the market expects them to win roughly every third game they play.",
        ],
      },
    ],
    audit: { logged: "14:22 Mar 26", pregame: true, record: "31–18", winRate: "63.3%", units: "+18.4u" },
  },
  {
    id: "hou",
    file: "001-B",
    sport: "MLB",
    tag: "Today 4:10PM",
    pick: "HOU −1.5 RUN LINE",
    game: "LA Angels @ Houston Astros",
    time: "4:10PM ET · FDSNW/SCHN · Minute Maid Park",
    odds: +113,
    headline: ["HOU −1.5 (+113):", " sharp steam confirmed", " on what models call a massive mismatch."],
    subline: "LA Angels @ Houston Astros · Run Line −1.5 (+113) · 4:10PM ET · Minute Maid Park",
    lineSignal: {
      from: "−1.5 (+125)",
      to: "−1.5 (+113)",
      type: "SHARP STEAM",
      detail: "One-way handle all morning",
    },
    components: { era: 0.79, fip: 0.82, woba: 0.72, momentum: 0.74, line: 0.81, ts: 0.7 },
    formulas: [
      {
        num: "01",
        name: "FIP DIFF",
        value: "+0.94",
        raw: 0.94,
        pct: 73,
        verdict: "bull",
        src: "FanGraphs",
        bench: "Brown vs Soriano",
      },
      {
        num: "02",
        name: "LINEUP wOBA",
        value: "+.031",
        raw: 0.031,
        pct: 65,
        verdict: "bull",
        src: "FanGraphs",
        bench: "HOU edge vs LAA",
      },
      {
        num: "03",
        name: "EVI",
        value: "live",
        raw: null,
        pct: null,
        verdict: "bull",
        src: "GG Model",
        bench: "≥ +3.0% ✓",
      },
      {
        num: "04",
        name: "HOME ADV",
        value: "+4.2%",
        raw: 4.2,
        pct: 60,
        verdict: "bull",
        src: "GG Model",
        bench: "Minute Maid edge",
      },
    ],
    sgpLegs: [],
    activeLegs: [],
    analysis: [
      {
        text: [
          "Multiple models flagged this as a ",
          "'massive mismatch'",
          " — Hunter Brown (FIP 3.41, K/9 9.8) vs. José Soriano and an Angels lineup ranked 28th in wOBA against righties. Sharp money moved the run line from +125 to +113 in four hours.",
        ],
      },
      {
        pull: "When you get plus money on the run line AND sharp steam is driving the price down — that's the signal. The model says take it before it flips negative.",
      },
    ],
    audit: { logged: "12:05 Mar 26", pregame: true, record: "31–18", winRate: "63.3%", units: "+18.4u" },
  },
  {
    id: "cha",
    file: "002-A",
    sport: "NBA",
    tag: "Tonight 7PM",
    pick: "CHA −1.5 SPREAD",
    game: "New York Knicks @ Charlotte Hornets",
    time: "7:00PM ET · CHA −1 to −1.5 · Spectrum Center",
    odds: -114,
    headline: ["CHA −1.5:", " the NBA's hottest ATS team", " faces a Knicks squad resting for April."],
    subline: "NY Knicks @ Charlotte Hornets · CHA −1.5 (−114) · 7:00PM ET · Spectrum Center",
    lineSignal: {
      from: "CHA −1 (−108)",
      to: "CHA −1.5 (−114)",
      type: "SHARP",
      detail: "Hornets 70% ATS rate last 50",
    },
    components: { era: 0.76, fip: 0.78, woba: 0.71, momentum: 0.85, line: 0.73, ts: 0.8 },
    formulas: [
      {
        num: "01",
        name: "ATS MOMENTUM",
        value: "70%",
        raw: 0.7,
        pct: 85,
        verdict: "bull",
        src: "GG Model",
        bench: "Last 50 games",
      },
      {
        num: "02",
        name: "3PT RATE (L10)",
        value: "40.3%",
        raw: 40.3,
        pct: 80,
        verdict: "bull",
        src: "NBA.com",
        bench: "#1 in NBA L10",
      },
      {
        num: "03",
        name: "TRUE SHOT%",
        value: "+3.1%",
        raw: 3.1,
        pct: 72,
        verdict: "bull",
        src: "BBRef",
        bench: "CHA vs NYK edge",
      },
      {
        num: "04",
        name: "EVI",
        value: "live",
        raw: null,
        pct: null,
        verdict: "bull",
        src: "GG Model",
        bench: "≥ +3.0% ✓",
      },
      {
        num: "05",
        name: "KNUEPPEL 3P",
        value: "247",
        raw: 247,
        pct: 90,
        verdict: "bull",
        src: "NBA.com",
        bench: "Rookie 3PT record",
      },
    ],
    sgpLegs: [
      { id: "n1", label: "Leg 01 · Spread", pick: "CHA −1.5", corr: { n2: 0.61, n3: 0.49 } },
      {
        id: "n2",
        label: "Leg 02 · Threes",
        pick: "CHA OVER 15.5 3PM",
        corr: { n1: 0.61, n3: 0.55 },
      },
      {
        id: "n3",
        label: "Leg 03 · LaMelo",
        pick: "Ball OVER 24.5 PTS",
        corr: { n1: 0.49, n2: 0.55 },
      },
    ],
    activeLegs: ["n1", "n2", "n3"],
    analysis: [
      {
        text: [
          "Charlotte has covered ",
          "35 of their last 50 games (70%)",
          " — the strongest ATS run in the league. They're the top three-point shooting team over the last 10 games (18.7 made, 40.3%). Kon Knueppel leads the league with 247 made threes, shattering the rookie record.",
        ],
      },
      {
        pull: "New York is on a 7-game win streak but their magic number to clinch is 1. Expect rest management. Charlotte has everything to play for — they're fighting a 3-way tie for the 8-seed.",
      },
      {
        text: [
          "LaMelo Ball is averaging ",
          "4.5 made threes over his last 10 games",
          ". Karl-Anthony Towns' PRA over is 30.5 — he's cleared it in 4 of his last 5 against Charlotte.",
        ],
      },
    ],
    audit: { logged: "13:45 Mar 26", pregame: true, record: "31–18", winRate: "63.3%", units: "+18.4u" },
  },
  {
    id: "sac",
    file: "002-B",
    sport: "NBA",
    tag: "Tonight 7PM",
    pick: "SAC +15.5 SPREAD",
    game: "Sacramento Kings @ Orlando Magic",
    time: "7:00PM ET · ORL −15.5 · Kia Center",
    odds: -110,
    headline: [
      "Contrarian: ",
      "SAC +15.5",
      " — Orlando on a 6-game skid, books pricing a blowout that model says won't happen.",
    ],
    subline: "Sacramento Kings @ Orlando Magic · SAC +15.5 (−110) · 7:00PM ET · Kia Center",
    lineSignal: {
      from: "ORL −13.5",
      to: "ORL −15.5",
      type: "FADE SIGNAL",
      detail: "Public piling on ORL, sharps quiet",
    },
    components: { era: 0.48, fip: 0.52, woba: 0.55, momentum: 0.44, line: 0.58, ts: 0.51 },
    formulas: [
      {
        num: "01",
        name: "COVER PROB",
        value: "57%",
        raw: 0.57,
        pct: 57,
        verdict: "neut",
        src: "BetMGM Model",
        bench: "+15.5 threshold",
      },
      {
        num: "02",
        name: "ORL L6 ATS",
        value: "1-5",
        raw: 0.17,
        pct: 17,
        verdict: "bear",
        src: "ATS Stats",
        bench: "6-game skid",
      },
      {
        num: "03",
        name: "EVI",
        value: "live",
        raw: null,
        pct: null,
        verdict: "neut",
        src: "GG Model",
        bench: "Marginal",
      },
      {
        num: "04",
        name: "SPREAD SIZE",
        value: "15.5",
        raw: 15.5,
        pct: 70,
        verdict: "neut",
        src: "Market",
        bench: "Widest board",
      },
    ],
    sgpLegs: [],
    activeLegs: [],
    analysis: [
      {
        text: [
          "BetMGM's model assigns ",
          "57% cover probability to SAC +15.5",
          ". Orlando has been eliminated from contention and enters on a 6-game losing skid — the largest spread on any NBA board this week. The 2-point line move from −13.5 to −15.5 came on public recreational money, not sharp action.",
        ],
      },
      {
        pull: "EVI is marginal at this number — we're playing the fade, not the conviction. Kelly sizes this at half our normal fraction.",
      },
    ],
    audit: { logged: "14:10 Mar 26", pregame: true, record: "31–18", winRate: "63.3%", units: "+18.4u" },
  },
];

const NBA_STANDINGS = {
  west: [
    {
      seed: 1,
      team: "Oklahoma City Thunder",
      abbr: "OKC",
      w: 57,
      l: 15,
      status: "CLINCHED",
      hot: false,
      streak: "L1",
      note: "y-Clinched",
    },
    {
      seed: 2,
      team: "San Antonio Spurs",
      abbr: "SAS",
      w: 54,
      l: 18,
      status: "CLINCHED",
      hot: true,
      streak: "W7",
      note: "x-Clinched · Wemby",
    },
    {
      seed: 3,
      team: "Los Angeles Lakers",
      abbr: "LAL",
      w: 46,
      l: 26,
      status: "IN",
      hot: true,
      streak: "W9",
      note: "Magic #4",
    },
    {
      seed: 4,
      team: "Denver Nuggets",
      abbr: "DEN",
      w: 45,
      l: 28,
      status: "IN",
      hot: true,
      streak: "W3",
      note: "Jokić 6K assists",
    },
    {
      seed: 5,
      team: "Minnesota Timberwolves",
      abbr: "MIN",
      w: 44,
      l: 28,
      status: "IN",
      hot: false,
      streak: "W2",
      note: "Beat HOU in OT",
    },
    {
      seed: 6,
      team: "Houston Rockets",
      abbr: "HOU",
      w: 43,
      l: 28,
      status: "IN",
      hot: false,
      streak: "L1",
      note: "Fading",
    },
    { seed: "▼", team: "— PLAY-IN LINE —", abbr: "", w: null, l: null, status: "BUBBLE", divider: true },
    {
      seed: 7,
      team: "Phoenix Suns",
      abbr: "PHX",
      w: 40,
      l: 33,
      status: "PLAY-IN",
      hot: false,
      streak: "",
      note: "",
    },
    {
      seed: 8,
      team: "LA Clippers",
      abbr: "LAC",
      w: 36,
      l: 36,
      status: "PLAY-IN",
      hot: false,
      streak: "",
      note: "",
    },
    {
      seed: 9,
      team: "Portland Trail Blazers",
      abbr: "POR",
      w: 36,
      l: 37,
      status: "PLAY-IN",
      hot: false,
      streak: "",
      note: "",
    },
    {
      seed: 10,
      team: "Golden State Warriors",
      abbr: "GSW",
      w: 34,
      l: 38,
      status: "BUBBLE",
      hot: false,
      streak: "L3",
      note: "2-8 L10",
    },
    {
      seed: 15,
      team: "Sacramento Kings",
      abbr: "SAC",
      w: 19,
      l: 53,
      status: "ELIM",
      hot: false,
      streak: "",
      note: "Eliminated",
    },
  ],
  east: [
    {
      seed: 1,
      team: "Detroit Pistons",
      abbr: "DET",
      w: 52,
      l: 20,
      status: "CLINCHED",
      hot: false,
      streak: "L1",
      note: "x-Clinched",
    },
    {
      seed: 2,
      team: "Boston Celtics",
      abbr: "BOS",
      w: 47,
      l: 24,
      status: "IN",
      hot: false,
      streak: "W1",
      note: "Magic #3",
    },
    {
      seed: 3,
      team: "New York Knicks",
      abbr: "NYK",
      w: 48,
      l: 25,
      status: "IN",
      hot: true,
      streak: "W7",
      note: "Magic #1",
    },
    {
      seed: 4,
      team: "Cleveland Cavaliers",
      abbr: "CLE",
      w: 45,
      l: 27,
      status: "IN",
      hot: false,
      streak: "L1",
      note: "Magic #4",
    },
    {
      seed: 5,
      team: "Toronto Raptors",
      abbr: "TOR",
      w: 40,
      l: 31,
      status: "IN",
      hot: false,
      streak: "",
      note: "",
    },
    {
      seed: 6,
      team: "Atlanta Hawks",
      abbr: "ATL",
      w: 40,
      l: 32,
      status: "IN",
      hot: true,
      streak: "W3",
      note: "9-1 L10",
    },
    { seed: "▼", team: "— PLAY-IN LINE —", abbr: "", w: null, l: null, status: "BUBBLE", divider: true },
    {
      seed: 7,
      team: "Philadelphia 76ers",
      abbr: "PHI",
      w: 39,
      l: 33,
      status: "PLAY-IN",
      hot: true,
      streak: "W1",
      note: "Embiid + George back",
    },
    {
      seed: 8,
      team: "Orlando Magic",
      abbr: "ORL",
      w: 38,
      l: 34,
      status: "BUBBLE",
      hot: false,
      streak: "L6",
      note: "6-game skid",
    },
    {
      seed: 9,
      team: "Charlotte Hornets",
      abbr: "CHA",
      w: 38,
      l: 34,
      status: "BUBBLE",
      hot: true,
      streak: "W4",
      note: "70% ATS L50",
    },
    {
      seed: 10,
      team: "Miami Heat",
      abbr: "MIA",
      w: 38,
      l: 34,
      status: "BUBBLE",
      hot: false,
      streak: "W1",
      note: "3-way tie",
    },
    {
      seed: 15,
      team: "Indiana Pacers",
      abbr: "IND",
      w: 16,
      l: 56,
      status: "ELIM",
      hot: false,
      streak: "",
      note: "Eliminated",
    },
  ],
};

const LAST_NIGHT = [
  {
    game: "DEN 142, DAL 135",
    star: "⭐ Game of Night",
    hero: "Jamal Murray 53 PTS (19-28 FG, 9-14 3PT)",
    note: "Jokić 23/21/19 · 1st center w/ 6,000 assists",
    sport: "NBA",
  },
  {
    game: "BOS 119, OKC 109",
    star: "Snapped OKC 12-game streak",
    hero: "Jaylen Brown 31/8/8",
    note: "SGA 33 pts (10-12 FG) in loss",
    sport: "NBA",
  },
  {
    game: "PHI 157, CHI 137",
    star: "Highest PHI score since 1970",
    hero: "Embiid 35/6/7 · PG 28/6/4",
    note: "51 pts in Q3 — record single quarter",
    sport: "NBA",
  },
  {
    game: "LAL 137, IND 130",
    star: "LAL 12-2 in March",
    hero: "Dončić 40+ pts · LeBron 23/9/9",
    note: "Lakers 9-game win streak",
    sport: "NBA",
  },
  {
    game: "NYY 7, SF 0",
    star: "MLB Opening Night",
    hero: "Max Fried 6.1 IP · 2H · 0R · 4K",
    note: "Logan Webb 10.80 ERA · Judge 4K / 0-5",
    sport: "MLB",
  },
  {
    game: "ATL 130, DET 129 OT",
    star: "Cunningham out",
    hero: "Jalen Johnson 27 · McCollum 27",
    note: "Dramatic OT win for Atlanta",
    sport: "NBA",
  },
  {
    game: "MIN 110, HOU 108 OT",
    star: "West playoff race",
    hero: "15-0 MIN run in OT",
    note: "Rockets fading — key implications",
    sport: "NBA",
  },
];

const LM_DATA = [
  {
    sport: "MLB",
    game: "LAA @ HOU · 4:10PM",
    pick: "HOU −1.5",
    from: "+125",
    to: "+113",
    type: "sharp",
    ev: "+4.2%",
    cls: "pos",
    context:
      "One-way sharp handle all morning. Multiple models flagging massive mismatch. Hunter Brown vs Soriano — 28th-ranked Angels lineup.",
    action: "ACTIVE BRIEF FILED",
    time: "This AM",
  },
  {
    sport: "MLB",
    game: "ARI @ LAD · 8:30PM",
    pick: "LAD −1.5",
    from: "−105",
    to: "−118",
    type: "sharp",
    ev: "+3.8%",
    cls: "pos",
    context:
      "Yamamoto vs Gallen. Dodgers drawing 71% of handle. Three-peat narrative driving recreational AND sharp money.",
    action: "ACTIVE BRIEF FILED",
    time: "This AM",
  },
  {
    sport: "MLB",
    game: "CHW @ MIL · 2:10PM",
    pick: "MIL −1.5",
    from: "+115",
    to: "+110",
    type: "sharp",
    ev: "+3.1%",
    cls: "pos",
    context: "White Sox are a -210 dog. Brewers drawing sharp interest on the run line at plus money.",
    action: "MONITORING",
    time: "This AM",
  },
  {
    sport: "NBA",
    game: "NYK @ CHA · 7:00PM",
    pick: "CHA −1.5",
    from: "−108",
    to: "−114",
    type: "sharp",
    ev: "+3.4%",
    cls: "pos",
    context:
      "Hornets 70% ATS last 50. Knicks magic number is 1 — rest management expected. LaMelo 4.5 3PM avg L10.",
    action: "ACTIVE BRIEF FILED",
    time: "This AM",
  },
  {
    sport: "NBA",
    game: "MIA 120, CLE 103 (RESULT)",
    pick: "MIA +3.5",
    from: "CLE −4",
    to: "CLE −3.5",
    type: "rlm",
    ev: "HIT +0.9u",
    cls: "pos",
    context:
      "Reverse LM: line moved from −4 to −3.5 despite 68% public on Cleveland. Sharps bought Heat points. Miami won outright.",
    action: "RESULT: MODEL HIT",
    time: "Mar 25",
  },
  {
    sport: "NBA",
    game: "LAL 137, IND 130 (RESULT)",
    pick: "OVER 267",
    from: "238.5",
    to: "238.5",
    type: "rlm",
    ev: "HIT +0.8u",
    cls: "pos",
    context:
      "86% of money on Under. RLM signal on Over — Indiana's last 5 had all cleared the total. Final: 267. Model flagged.",
    action: "RESULT: MODEL HIT",
    time: "Mar 25",
  },
  {
    sport: "MLB",
    game: "SAC @ ORL · 7:00PM",
    pick: "SAC +15.5",
    from: "−13.5",
    to: "−15.5",
    type: "fade",
    ev: "+1.9%",
    cls: "watch",
    context:
      "Public piling on Orlando. No sharp confirmation. Model: 57% cover prob at +15.5. Recreational steam, not sharp.",
    action: "MARGINAL BRIEF",
    time: "This AM",
  },
];

const FORMULAS = [
  {
    id: "fip",
    name: "FIP",
    full: "Fielding Independent Pitching",
    sport: "mlb",
    eaa: true,
    desc: "Measures pitcher performance using only what the pitcher controls: strikeouts, walks, HBP, and home runs. Removes defense variance from ERA.",
    formula: "FIP = ((13×HR + 3×(BB+HBP) − 2×K) / IP) + constant (~3.10)",
    use: "Primary pitcher matchup signal. FIP differential ≥ 0.75 between starters = actionable edge.",
    threshold: "Action: FIP diff ≥ 0.75. Yamamoto 2025 FIP: 2.81. Source: FanGraphs.",
    tags: ["mlb", "eaa", "pitching", "core"],
  },
  {
    id: "woba",
    name: "wOBA",
    full: "Weighted On-Base Average",
    sport: "mlb",
    eaa: true,
    desc: "Weights each offensive event by its actual run value. Walks, singles, doubles, HRs all given different coefficients based on real run production data.",
    formula: "wOBA = (0.69×BB + 0.88×1B + 1.25×2B + 1.58×3B + 2.00×HR) / PA",
    use: "Lineup vs. pitcher matchup picks. Batter run production props, team totals.",
    threshold: "Action: wOBA ≥ .360 vs pitcher FIP >4.5. Source: FanGraphs.",
    tags: ["mlb", "eaa", "lineup", "total"],
  },
  {
    id: "xfip",
    name: "xFIP",
    full: "Expected Fielding Independent Pitching",
    sport: "mlb",
    eaa: true,
    desc: "Like FIP but normalizes home run rate to league average. Stabilizes faster than FIP and better predicts future performance in small samples.",
    formula: "xFIP = ((13×(FB%×lgHR/FB%) + 3×(BB+HBP) − 2×K) / IP) + constant",
    use: "Early-season picks where sample size is small. More reliable than ERA through 10 starts.",
    threshold: "Action: xFIP differential ≥ 0.60 for Opening Day picks. Source: FanGraphs.",
    tags: ["mlb", "eaa", "pitching", "earlySeason"],
  },
  {
    id: "evi",
    name: "EVI",
    full: "Expected Value Index (GG Proprietary)",
    sport: "all",
    eaa: true,
    desc: "Composite EV score: model probability × net odds − (1−prob). Positive = edge over book. The single most important number — drives all bet/no-bet decisions.",
    formula: "EVI = (ModelWin% × NetOdds) − (ModelLoss% × 1)  expressed as %",
    use: "North star across MLB, NBA, and DFS. Threshold for publishing any pick is EVI ≥ +3.0%.",
    threshold: "Publish: EVI ≥ +3.0%. Monitor: +1.5–3.0%. Skip: <+1.5%. Source: GG Internal.",
    tags: ["all", "eaa", "core"],
  },
  {
    id: "kelly",
    name: "KELLY",
    full: "Kelly Criterion Staking",
    sport: "all",
    eaa: true,
    desc: "Mathematical bankroll management. Optimal bet fraction given edge and odds. Applied at 0.5× fractional to reduce variance and respect uncertainty in early-season samples.",
    formula: "K* = (b·p − q) / b   where b = net decimal odds, p = win prob, q = 1−p",
    use: "Sizing every single pick. Never flat bet. Never exceed Full Kelly.",
    threshold: "Published at 0.5× fractional. Early-season discount: 0.35× for first 10 games. Source: GG.",
    tags: ["all", "eaa", "bankroll", "core"],
  },
  {
    id: "ts",
    name: "TRUE SHOT%",
    full: "True Shooting Percentage",
    sport: "nba",
    eaa: true,
    desc: "Shooting efficiency accounting for 3-point value and free throws. Far superior to FG% for evaluating scoring output and matchup edges.",
    formula: "TS% = Total Points / (2 × (FGA + 0.44 × FTA))",
    use: "NBA player prop picks. TS% mismatch vs opponent = points over/under edge.",
    threshold: "Action: Player TS% ≥ 55% + opponent allows >57% TS%. Source: Basketball Reference.",
    tags: ["nba", "eaa", "props"],
  },
  {
    id: "bpm",
    name: "BPM",
    full: "Box Plus/Minus",
    sport: "nba",
    eaa: true,
    desc: "Estimates a player's contribution to team performance per 100 possessions relative to a league-average player. Best all-in-one player value metric.",
    formula: "BPM = Weighted regression of box score stats + opponent adjustment",
    use: "Team spread picks. Lineup BPM differential = expected point spread edge.",
    threshold: "Action: BPM diff ≥ +4.0 per 100 for spread confidence. Source: Basketball Reference.",
    tags: ["nba", "eaa", "spread"],
  },
  {
    id: "ats",
    name: "ATS MOMENTUM",
    full: "Against-the-Spread Rolling Momentum",
    sport: "nba",
    eaa: true,
    desc: "GG proprietary rolling ATS cover rate. Measures team's tendency to outperform market expectations. 50-game rolling window to capture current form.",
    formula: "ATS Mom = (Covers in last N games / N) × Confidence Weight (line size adj.)",
    use: "Spread picks. Charlotte 70% ATS last 50 = highest in NBA = strong signal.",
    threshold: "Action: ATS rate ≥ 62% over last 30+ games = model buys the cover. Source: GG.",
    tags: ["nba", "eaa", "spread", "momentum"],
  },
  {
    id: "poisson",
    name: "POISSON",
    full: "Poisson Distribution Run/Score Model",
    sport: "mlb",
    eaa: true,
    desc: "Models discrete scoring events using Poisson distribution. 10,000 Monte Carlo iterations generate full probability distributions for runs, totals, and run lines.",
    formula: "P(k runs) = (λᵏ × e⁻ᵏ) / k!   λ = expected run rate from FIP + wOBA inputs",
    use: "Game totals, team run totals, run line confidence intervals.",
    threshold: "10,000 iterations. Win probability ≥ 60% for EVI calculation. Source: GG Internal.",
    tags: ["mlb", "eaa", "total", "core"],
  },
  {
    id: "wopr",
    name: "WOPR",
    full: "Weighted Opportunity Rating",
    sport: "dfs",
    eaa: true,
    desc: "DFS-native composite of target share + air yards share. Best single predictor of WR receiving yards floor. Used for PrizePicks and Underdog Fantasy lineup construction.",
    formula: "WOPR = (1.5 × Target Share) + (0.7 × Air Yards Share)",
    use: "WR receiving yards props. WOPR ≥ 0.65 + favorable matchup = over signal.",
    threshold: "Action: WOPR ≥ 0.65. Source: FP / nflfastR. (NFL season resumes Sept 2026)",
    tags: ["dfs", "nfl", "eaa", "props"],
  },
];

const AUDIT_DATA = [
  {
    file: "OPENING-NIGHT",
    pick: "NYY ML / RUN LINE vs SF Giants",
    sport: "MLB Opening Night",
    date: "Mar 25, 2026",
    logged: "Pre-game",
    result: "win",
    label: "WIN +0.7u",
    summary: "NYY −117 ML / −1.5 (+146) · Result: NYY 7, SF 0 · Covered by 7 full runs",
    eviAtPick: 4.2,
    kellyAtPick: 2.6,
    conf: 69,
    log: [
      {
        ts: "Pre-game",
        event: "NYY logged pre-game. Fried (FIP 2.81) vs Webb (FIP 3.94). Run line at +146 offered positive Kelly value.",
        val: "VERIFIED",
        cls: "ok",
      },
      {
        ts: "2nd inning",
        event: "Fried retired 15 of final 16 batters. 5-run 2nd: Grisham 2-RBI triple, McMahon 2-RBI single, Stanton 114.4 mph contact.",
        val: "ON MODEL",
        cls: "ok",
      },
      {
        ts: "5th inning",
        event: "Stanton 2-RBI single. NYY extend to 7-0. Webb removed after 5.0 IP, 9 H, 7 ER, 10.80 ERA.",
        val: "ON MODEL",
        cls: "ok",
      },
      {
        ts: "Final",
        event: "NYY 7, SF 0. Covered run line by 5.5 runs. Fried: first Yankee since David Cone (1996) to throw 6.1+ scoreless innings on Opening Day with ≤2H.",
        val: "HIT",
        cls: "ok",
      },
    ],
    miss: null,
    note: "Aaron Judge 0-5 with 4 Ks (first reigning MVP to do so on Opening Day) — HR prop correctly skipped. Webb K prop (7 K in 5 IP = 1.4 K/9 vs 2025 rate of 1.08) hit if held.",
  },
  {
    file: "MAR25-NBA-01",
    pick: "MIA +3.5 vs Cleveland Cavaliers",
    sport: "NBA Mar 25",
    date: "Mar 25, 2026",
    logged: "Pre-game",
    result: "win",
    label: "WIN +0.9u",
    summary: "MIA +3.5 (−110) · Result: MIA 120, CLE 103 · Miami won outright",
    eviAtPick: 3.8,
    kellyAtPick: 2.3,
    conf: 63,
    log: [
      {
        ts: "Pre-game",
        event: "Reverse line movement detected. Line moved CLE −4 → CLE −3.5 despite 68% of public money on Cleveland. Sharps buying Heat points.",
        val: "SHARP SIGNAL",
        cls: "ok",
      },
      {
        ts: "Halftime",
        event: "MIA leading by 7. Model projection: MIA +6.2 points net. CLE's Donovan Mitchell (42 pts on Mar 24) showing fatigue signs.",
        val: "ON MODEL",
        cls: "ok",
      },
      { ts: "Final", event: "MIA 120, CLE 103. Miami won outright. RLM signal was correct — sharps had this.", val: "HIT", cls: "ok" },
    ],
    miss: null,
    note: "Reverse line movement is one of the most reliable sharp signals. When the line moves against public flow, follow the professional money. This is Exhibit A.",
  },
  {
    file: "MAR24-NBA-01",
    pick: "DEN −4.5 vs Phoenix Suns",
    sport: "NBA Mar 24",
    date: "Mar 24, 2026",
    logged: "Pre-game",
    result: "loss",
    label: "MISS −1.0u",
    summary: "DEN −4.5 (−110) · Result: DEN 125, PHX 123 · Denver won by 2, missed cover",
    eviAtPick: 3.1,
    kellyAtPick: 1.9,
    conf: 60,
    log: [
      {
        ts: "Pre-game",
        event: "EVI: +3.1% — at the lower bound of threshold. Jokić triple-double streak = strong momentum signal.",
        val: "MARGINAL",
        cls: "warn",
      },
      {
        ts: "4th quarter",
        event: "Jokić buzzer-beater to win 125-123. But margin = 2, not 4.5. Model projection: DEN +6.1. Actual: +2.",
        val: "MISS",
        cls: "fail",
      },
      {
        ts: "Final",
        event: "DEN 125, PHX 123. Model correct on winner — wrong on margin. Missed cover by 2.5 pts.",
        val: "LOSS",
        cls: "fail",
      },
    ],
    miss: {
      label: "Post-Mortem · What the model missed",
      text: "The model correctly identified Denver as the winner (Jokić's form was unmistakable) but failed to account for Phoenix's defensive adjustment — they allowed Jokić's scoring but cut off the transition offense that historically inflates DEN margins.\n\nModel update: Adding a 'clutch defense adjustment' variable. Phoenix has held DEN to <5-point margins in 4 of their last 5 matchups. Head-to-head ATS history is now a weighted input.\n\nProcess note: Betstamp timestamp at pre-game confirms the pick was logged before the game. The miss is real. It's in the record.",
    },
  },
];

/* ═══════════════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════════════ */
function useEngine(pick, bankroll) {
  return useMemo(() => {
    if (!pick) return null;
    const p = FE.compositeProb(pick.components);
    const fk = FE.kelly(p, pick.odds),
      frac = fk * 0.5;
    const ev = FE.evi(p, pick.odds);
    const imp = FE.impliedProb(pick.odds);
    const sgp =
      pick.activeLegs.length > 1 ? FE.sgpCorr(pick.sgpLegs.filter((l) => pick.activeLegs.includes(l.id))) : null;
    return { p, fk, frac, ev, imp, edge: p - imp, betAmt: bankroll * frac, scenarios: FE.bankroll(frac), sgp };
  }, [pick, bankroll]);
}

function useCount(target, dur = 900) {
  const [v, sv] = useState(0),
    raf = useRef(),
    st = useRef(),
    fr = useRef(0);
  useEffect(() => {
    fr.current = v;
    st.current = null;
    const run = (ts) => {
      if (!st.current) st.current = ts;
      const prog = Math.min((ts - st.current) / dur, 1),
        ease = 1 - Math.pow(1 - prog, 3);
      sv(fr.current + (target - fr.current) * ease);
      if (prog < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return v;
}

/* ═══════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════════ */
const sportColor = (s) => (s === "MLB" || s === "mlb" ? C.amber : s === "NBA" || s === "nba" ? C.blue : C.green);

const Tag = ({ children, v = "ghost", style = {} }) => {
  const vars = {
    green: { bg: C.greenLt, c: C.green, bd: C.greenBd },
    amber: { bg: C.amberLt, c: C.amber, bd: C.amberBd },
    red: { bg: C.redLt, c: C.red, bd: C.redBd },
    blue: { bg: C.blueLt, c: C.blue, bd: C.blueBd },
    ghost: { bg: "transparent", c: C.ghost, bd: C.rule },
  };
  const s = vars[v] || vars.ghost;
  return (
    <span
      style={{
        fontFamily: C.mono,
        fontSize: 7,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        padding: "2px 6px",
        border: `1px solid ${s.bd}`,
        color: s.c,
        background: s.bg,
        borderRadius: 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

const Stamp = ({ children, color, rotate = "-11deg", size = 80 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: `3px solid ${color}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontFamily: C.mono,
      fontSize: 7.5,
      letterSpacing: 1,
      lineHeight: 1.4,
      fontWeight: 700,
      textTransform: "uppercase",
      flexShrink: 0,
      color,
      transform: `rotate(${rotate})`,
    }}
  >
    {children}
  </div>
);

const Card = ({ header, headerRight, children, style = {} }) => (
  <div style={{ border: `1px solid ${C.rule}`, background: C.cream, overflow: "hidden", ...style }}>
    {header && (
      <div
        style={{
          background: C.ink,
          padding: "9px 14px",
          fontFamily: C.mono,
          fontSize: 8,
          letterSpacing: 2,
          color: "rgba(255,255,255,.4)",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{header}</span>
        {headerRight && <span style={{ color: C.green }}>{headerRight}</span>}
      </div>
    )}
    <div style={{ padding: 14 }}>{children}</div>
  </div>
);

const SectionHdr = ({ title, meta }) => (
  <div
    style={{
      background: C.paper2,
      padding: "16px 40px",
      borderBottom: `2px solid ${C.rule}`,
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
    }}
  >
    <div style={{ fontFamily: C.display, fontSize: 26, letterSpacing: 3, color: C.ink }}>{title}</div>
    <div
      style={{
        fontFamily: C.mono,
        fontSize: 9,
        letterSpacing: 1.5,
        color: C.ghost,
        textTransform: "uppercase",
      }}
    >
      {meta}
    </div>
  </div>
);

const BarFill = ({ pct, color = C.ink, h = 3 }) => (
  <div style={{ height: h, background: C.ruleLt, borderRadius: 2, overflow: "hidden" }}>
    <div
      style={{
        height: h,
        width: `${pct}%`,
        background: color,
        borderRadius: 2,
        transition: "width .9s cubic-bezier(.4,0,.2,1)",
      }}
    />
  </div>
);

const Redact = ({ children }) => {
  const [o, so] = useState(false);
  return (
    <span
      onClick={() => so(!o)}
      title={o ? "" : "click to declassify"}
      style={{
        display: "inline",
        background: o ? "transparent" : C.ink,
        color: o ? C.blue : C.ink,
        cursor: "pointer",
        padding: "0 3px",
        transition: "all .3s",
        borderBottom: o ? `1px dashed ${C.blue}` : "none",
        borderRadius: 1,
      }}
    >
      {children}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════
   KELLY CARD
═══════════════════════════════════════════════════════════════ */
const KellyCard = ({ calc, bankroll }) => {
  if (!calc) return null;
  const pct = +(calc.frac * 100).toFixed(1),
    fill = Math.min(pct * 10, 100);
  return (
    <Card header="Kelly Criterion Sizing">
      <div style={{ fontFamily: C.display, fontSize: 42, letterSpacing: 2, color: C.ink, lineHeight: 1 }}>{pct}%</div>
      <div style={{ fontFamily: C.mono, fontSize: 8.5, color: C.ghost, margin: "3px 0 10px" }}>
        Fractional Kelly (0.5×) · of bankroll
      </div>
      <div style={{ height: 5, background: C.ruleLt, borderRadius: 3, margin: "6px 0" }}>
        <div
          style={{
            height: 5,
            width: `${fill}%`,
            background: C.green,
            borderRadius: 3,
            transition: "width 1.1s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
      <div
        style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: 7.5, color: C.ghost, marginTop: 3 }}
      >
        <span>0%</span>
        <span>5%</span>
        <span>10%</span>
      </div>
      <div
        style={{
          background: C.paper2,
          border: `1px solid ${C.ruleLt}`,
          padding: 9,
          fontFamily: C.mono,
          fontSize: 9,
          color: C.ghost,
          lineHeight: 1.9,
          marginTop: 8,
        }}
      >
        <strong style={{ color: C.ink }}>Full Kelly:</strong> {+(calc.fk * 100).toFixed(1)}% → Applied: {pct}%
        <br />
        {calc.scenarios.map((s) => (
          <span key={s.b}>
            <strong style={{ color: C.ink }}>${s.b.toLocaleString()}:</strong> ${s.bet}{" "}
          </span>
        ))}
      </div>
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════
   EVI CARD
═══════════════════════════════════════════════════════════════ */
const EVICard = ({ calc }) => {
  if (!calc) return null;
  const ev = +calc.ev.toFixed(1),
    edge = +(calc.edge * 100).toFixed(1);
  const evColor = ev >= 3 ? C.green : ev >= 0 ? C.amber : C.red;
  return (
    <Card header="Live EVI Calculation" headerRight={ev >= 3 ? "● ABOVE THRESHOLD" : "● BELOW THRESHOLD"}>
      {calc.p < 0.65 && (
        <div style={{ background: C.amberLt, border: `1px solid ${C.amberBd}`, padding: "8px 10px", marginBottom: 10, fontFamily: C.mono, fontSize: 8.5, color: C.amber, lineHeight: 1.7 }}>
          We tell you when model confidence is low — because brain damage includes betting on a coin flip with false certainty.
        </div>
      )}
      <div style={{ textAlign: "center", padding: "8px 0 12px", borderBottom: `1px solid ${C.ruleLt}`, marginBottom: 12 }}>
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 7.5,
            letterSpacing: 2,
            color: C.ghost,
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Expected Value Index
        </div>
        <div style={{ fontFamily: C.display, fontSize: 52, letterSpacing: 2, color: evColor, lineHeight: 1 }}>
          {ev > 0 ? "+" : ""}
          {ev}%
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 8, color: C.ghost, marginTop: 4 }}>Threshold: +3.0% to publish</div>
      </div>
      {[
        ["Model Win Prob", `${+(calc.p * 100).toFixed(1)}%`, C.ink],
        ["Book Implied Prob", `${+(calc.imp * 100).toFixed(1)}%`, C.ghost],
        ["Edge vs. Book", `${edge > 0 ? "+" : ""}${edge}%`, edge > 0 ? C.green : C.red],
        ["Formula", "(p×b − q) × 100", C.ghost],
      ].map(([k, v, c]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "7px 0",
            borderBottom: `1px solid ${C.ruleLt}`,
            fontFamily: C.mono,
            fontSize: 9.5,
          }}
        >
          <span style={{ color: C.ghost, letterSpacing: 0.5 }}>{k}</span>
          <span style={{ fontWeight: 700, color: c }}>{v}</span>
        </div>
      ))}
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════
   BANKROLL SLIDER
═══════════════════════════════════════════════════════════════ */
const BankrollSlider = ({ bankroll, onChange }) => (
  <Card header="Bankroll Simulator">
    <div style={{ fontFamily: C.mono, fontSize: 8, color: C.ghost, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
      Set Your Bankroll
    </div>
    <div style={{ fontFamily: C.display, fontSize: 34, letterSpacing: 2, color: C.ink, marginBottom: 6 }}>${bankroll.toLocaleString()}</div>
    <input type="range" min={200} max={50000} step={100} value={bankroll} onChange={(e) => onChange(+e.target.value)} style={{ width: "100%", accentColor: C.green, cursor: "pointer" }} />
    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: C.mono, fontSize: 7.5, color: C.ghost, marginTop: 4 }}>
      <span>$200</span>
      <span>$50,000</span>
    </div>
  </Card>
);

/* ═══════════════════════════════════════════════════════════════
   EXHIBIT WRAPPER
═══════════════════════════════════════════════════════════════ */
const Exhibit = ({ label, children }) => (
  <div style={{ position: "relative", border: `1px solid ${C.rule}`, padding: 22, marginBottom: 22, background: C.cream }}>
    <div
      style={{
        position: "absolute",
        top: -9,
        left: 18,
        fontFamily: C.mono,
        fontSize: 8,
        letterSpacing: 2.5,
        color: C.ghost,
        background: C.cream,
        padding: "0 8px",
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   DOSSIER DETAIL
═══════════════════════════════════════════════════════════════ */
const DossierDetail = ({ pick, bankroll }) => {
  const calc = useEngine(pick, bankroll);
  const sc = sportColor(pick?.sport);
  if (!pick || !calc)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 60, textAlign: "center" }}>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase" }}>Select a brief from the index</div>
      </div>
    );
  const ev = +calc.ev.toFixed(1),
    kPct = +(calc.frac * 100).toFixed(1),
    confPct = +(calc.p * 100).toFixed(0);
  const evColor = ev >= 3 ? C.green : ev >= 0 ? C.amber : C.red;

  return (
    <div style={{ padding: "28px 32px 64px", overflowY: "auto" }}>
      {/* Case header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, paddingBottom: 22, borderBottom: `3px double ${C.rule}` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: C.display, fontSize: 13, letterSpacing: 2, color: sc, padding: "2px 8px", background: `${sc}15`, border: `1px solid ${sc}40` }}>{pick.sport}</span>
            <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 3, color: C.ghost, textTransform: "uppercase" }}>Intelligence Brief · File {pick.file} · {pick.tag}</span>
          </div>
          <h1 style={{ fontFamily: C.serif, fontSize: "clamp(22px,3vw,33px)", lineHeight: 1.1, color: C.ink, marginBottom: 10, maxWidth: 560 }}>
            {pick.headline[0]}
            <em style={{ color: sc }}>{pick.headline[1]}</em>
            {pick.headline[2]}
          </h1>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 0.8, color: C.ghost, lineHeight: 1.8 }}>
            <strong style={{ color: C.ink }}>{pick.subline}</strong>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
          <Stamp color={C.green}>BETSTAMP<br />VERIFIED<br />✓</Stamp>
          <Stamp color={sc} rotate="10deg" size={62}>EAA<br />{ev >= 3 ? "3/3" : "2/3"}<br />PASS</Stamp>
        </div>
      </div>

      {/* Evidence bar */}
      <div style={{ display: "flex", background: C.paper2, borderTop: `2px solid ${C.rule}`, borderBottom: `2px solid ${C.rule}`, margin: "22px 0", flexWrap: "wrap" }}>
        {[
          { l: "EVI Score", v: `${ev > 0 ? "+" : ""}${ev}%`, c: evColor, s: "Threshold +3%" },
          { l: "Confidence", v: `${confPct}%`, c: C.ink, s: "Model composite" },
          { l: "Kelly Size", v: `${kPct}%`, c: C.amber, s: "Fractional 0.5×" },
          { l: "Line Signal", v: pick.lineSignal.type, c: C.green, s: `${pick.lineSignal.from} → ${pick.lineSignal.to}` },
          { l: "Formulas", v: pick.formulas.length, c: C.ink, s: "EAA-tagged" },
          { l: "Bet $1k", v: `$${(1000 * calc.frac).toFixed(0)}`, c: C.ink, s: "At current bankroll" },
        ].map((c, i) => (
          <div key={i} style={{ flex: 1, minWidth: "16%", padding: "11px 10px", borderRight: i < 5 ? `1px solid ${C.rule}` : "none", textAlign: "center" }}>
            <div style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 2, color: C.ghost, textTransform: "uppercase", marginBottom: 5 }}>{c.l}</div>
            <div style={{ fontFamily: C.display, fontSize: 20, letterSpacing: 1, color: c.c }}>{c.v}</div>
            <div style={{ fontFamily: C.mono, fontSize: 8, color: C.ghost, marginTop: 2, letterSpacing: 0.5 }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 268px", gap: 24 }}>
        <div>
          {/* Exhibit A */}
          <Exhibit label="Exhibit A — Intelligence Analysis">
            <div style={{ background: C.ink, color: C.paper, padding: "10px 14px", marginBottom: 14, fontFamily: C.mono, fontSize: 8.5, letterSpacing: 0.5, lineHeight: 1.7 }}>
              Bottom-up roster data. Top-down market pricing. <span style={{ color: C.green }}>The gap is your money.</span>
            </div>
            <div style={{ fontFamily: C.serif, fontSize: 17, color: C.ink, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.ruleLt}` }}>
              The case in detail — <em style={{ color: sc }}>evidence and context</em>
            </div>
            {pick.analysis.map((b, i) => (
              <div key={i}>
                {b.text && (
                  <p style={{ fontFamily: C.mono, fontSize: 10.5, lineHeight: 1.95, color: "#4A4234", marginBottom: 14 }}>
                    {b.text[0]}
                    <strong style={{ color: C.ink }}>{b.text[1]}</strong>
                    {b.text[2]}
                  </p>
                )}
                {b.pull && (
                  <div style={{ background: C.ink, color: C.paper, padding: "18px 22px", margin: "14px 0", fontFamily: C.serif, fontSize: 17, lineHeight: 1.45, fontStyle: "italic", position: "relative" }}>
                    <span style={{ position: "absolute", top: 14, left: 16, fontFamily: C.serif, fontSize: 52, lineHeight: 0.5, color: sc, opacity: 0.45 }}>"</span>
                    <span style={{ paddingLeft: 28 }}>{b.pull}</span>
                  </div>
                )}
              </div>
            ))}
            {/* Line movement viz */}
            <div style={{ display: "flex", alignItems: "center", background: C.paper2, border: `1px solid ${C.rule}`, padding: "13px 16px", marginTop: 14, gap: 0 }}>
              <div style={{ marginRight: 16 }}>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: C.ghost, textTransform: "uppercase", marginBottom: 3 }}>OPENED</div>
                <div style={{ fontFamily: C.display, fontSize: 24, color: C.ink }}>{pick.lineSignal.from}</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: 2, background: C.ink, position: "relative" }}>
                  <span style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: C.ink }}>▶</span>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: sc, fontWeight: 700, textTransform: "uppercase" }}>{pick.lineSignal.type}</div>
                <div style={{ fontFamily: C.mono, fontSize: 8, color: C.ghost }}>{pick.lineSignal.detail}</div>
              </div>
              <div style={{ marginLeft: 16 }}>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: C.ghost, textTransform: "uppercase", marginBottom: 3 }}>CURRENT</div>
                <div style={{ fontFamily: C.display, fontSize: 30, color: sc }}>{pick.lineSignal.to}</div>
              </div>
            </div>
          </Exhibit>

          {/* Exhibit B: Formula chain */}
          <Exhibit label="Exhibit B — Formula Evidence Chain (EAA Compliant)">
            <div style={{ fontFamily: C.serif, fontSize: 17, color: C.ink, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.ruleLt}` }}>
              {pick.formulas.length}-formula confirmation chain — <em style={{ color: sc }}>all sources linked</em>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.mono, fontSize: 10 }}>
              <thead>
                <tr>
                  {["#", "Formula", "Value", "Strength", "Benchmark", "Verdict", "Source"].map((h) => (
                    <th key={h} style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: C.ghost, textAlign: "left", padding: "7px 4px", borderBottom: `2px solid ${C.ink}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pick.formulas.map((f, i) => {
                  const isLive = f.value === "live";
                  const lv = isLive ? `${ev > 0 ? "+" : ""}${ev}%` : f.value;
                  const lp = isLive ? Math.min(Math.abs(ev) * 10, 100) : f.pct;
                  const lc = isLive ? evColor : f.verdict === "bull" ? C.green : f.verdict === "bear" ? C.red : C.amber;
                  return (
                    <tr key={i}>
                      <td style={{ padding: "10px 4px", borderBottom: `1px solid ${C.ruleLt}`, color: C.ghost, fontSize: 9 }}>{f.num}</td>
                      <td style={{ padding: "10px 4px", borderBottom: `1px solid ${C.ruleLt}`, color: C.ghost, letterSpacing: 1.5, fontSize: 9 }}>{f.name}{isLive && <span style={{ color: C.green, marginLeft: 4 }}>●</span>}</td>
                      <td style={{ padding: "10px 4px", borderBottom: `1px solid ${C.ruleLt}`, fontWeight: 700, fontSize: 14, color: lc }}>{lv}</td>
                      <td style={{ padding: "10px 4px", borderBottom: `1px solid ${C.ruleLt}`, width: 100 }}><BarFill pct={lp} color={lc} /></td>
                      <td style={{ padding: "10px 4px", borderBottom: `1px solid ${C.ruleLt}`, fontSize: 9, color: C.ghost }}>{f.bench}</td>
                      <td style={{ padding: "10px 4px", borderBottom: `1px solid ${C.ruleLt}`, fontSize: 8, letterSpacing: 1.5, textAlign: "right", color: f.verdict === "bull" ? C.green : f.verdict === "bear" ? C.red : C.amber }}>{f.verdict === "bull" ? "BULLISH" : f.verdict === "bear" ? "BEARISH" : "MARGINAL"}</td>
                      <td style={{ padding: "10px 4px", borderBottom: `1px solid ${C.ruleLt}`, fontSize: 8, color: C.ghost, textDecoration: "underline", cursor: "pointer" }}>{f.src}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Exhibit>

          {/* SGP if applicable */}
          {pick.sgpLegs.length > 0 && (
            <Exhibit label="Exhibit C — SGP Correlation">
              <div style={{ fontFamily: C.serif, fontSize: 17, color: C.ink, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.ruleLt}` }}>SGP correlation — <em style={{ color: sc }}>edges the books haven't priced</em></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {pick.sgpLegs.map((leg, i) => {
                  const vals = Object.values(leg.corr || {});
                  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                  const cc = avg > 0 ? C.green : C.red;
                  return (
                    <div key={i} style={{ padding: "11px 13px", border: `1px solid ${leg.avoid ? C.redBd : C.rule}`, background: C.paper, borderLeft: leg.avoid ? `3px solid ${C.red}` : undefined }}>
                      <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: leg.avoid ? C.red : C.ghost, marginBottom: 5, textTransform: "uppercase" }}>{leg.label}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 7 }}>{leg.pick}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: C.mono, fontSize: 8, color: C.ghost, whiteSpace: "nowrap" }}>Avg corr:</span>
                        <div style={{ flex: 1, height: 3, background: C.ruleLt, borderRadius: 2 }}>
                          <div style={{ height: 3, width: `${Math.abs(avg) * 100}%`, background: cc, borderRadius: 2, transition: "width .9s" }} />
                        </div>
                        <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: cc, whiteSpace: "nowrap" }}>{avg > 0 ? "+" : ""}{avg.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {calc.sgp !== null && (
                <div style={{ background: C.ink, color: C.paper, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", textTransform: "uppercase" }}>Recommended SGP (legs 1–{pick.activeLegs.length})</div>
                    <div style={{ fontFamily: C.display, fontSize: 18, color: calc.sgp > 0.4 ? C.green : calc.sgp > 0 ? C.amber : C.red, marginTop: 2 }}>Avg Correlation: {calc.sgp > 0 ? "+" : ""}{calc.sgp.toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", marginBottom: 2, textTransform: "uppercase" }}>Verdict</div>
                    <div style={{ fontFamily: C.display, fontSize: 20, color: calc.sgp > 0.4 ? C.green : C.red }}>{calc.sgp > 0.4 ? "BUILD IT" : calc.sgp > 0 ? "MARGINAL" : "AVOID"}</div>
                  </div>
                </div>
              )}
            </Exhibit>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card header="Recommendation" headerRight="● ACTIVE">
            <div style={{ fontFamily: C.display, fontSize: 30, letterSpacing: 2, color: C.ink, marginBottom: 3 }}>{pick.pick}</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 0.8, color: C.ghost, marginBottom: 12 }}>{pick.odds > 0 ? `+${pick.odds}` : pick.odds} · {pick.time}</div>
            {[
              ["EVI", `${ev > 0 ? "+" : ""}${ev}%`, evColor],
              ["Confidence", `${confPct}%`, C.ink],
              ["Kelly", `${kPct}% bankroll`, C.amber],
              ["Signal", pick.lineSignal.type, C.green],
              ["Bet $1k", `$${(1000 * calc.frac).toFixed(0)}`, C.ink],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: `1px solid ${C.ruleLt}`, fontFamily: C.mono, fontSize: 9.5 }}>
                <span style={{ color: C.ghost, letterSpacing: 0.5, textTransform: "uppercase" }}>{k}</span>
                <span style={{ fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
            <button style={{ width: "100%", background: C.ink, color: C.paper, padding: 13, fontFamily: C.display, fontSize: 17, letterSpacing: 3, marginTop: 14, cursor: "pointer", border: "none" }} onMouseEnter={(e) => (e.target.style.background = "#2a2520")} onMouseLeave={(e) => (e.target.style.background = C.ink)}>
              LOG TO BETSTAMP
              <div style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 1.5, color: "rgba(255,255,255,.35)", marginTop: 3 }}>Timestamps pick before posting</div>
            </button>
          </Card>
          <EVICard calc={calc} />
          <KellyCard calc={calc} bankroll={bankroll} />
          <Card header="Betstamp Verification" headerRight="✓ VERIFIED">
            {[
              ["Logged", pick.audit.logged],
              ["Pre-game", "Confirmed"],
              ["Season W/L", pick.audit.record],
              ["Win Rate", pick.audit.winRate],
              ["Units", pick.audit.units],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6.5px 0", borderBottom: `1px solid ${C.ruleLt}`, fontFamily: C.mono, fontSize: 9.5 }}>
                <span style={{ color: C.ghost }}>{k}</span>
                <span style={{ fontWeight: 700, color: k === "Season W/L" ? C.ink : C.green }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card header="EAA Compliance">
            <div style={{ fontFamily: C.mono, fontSize: 8.5, color: C.ghost, lineHeight: 1.7, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.ruleLt}` }}>
              Every recommendation is Explainable, Auditable, and Actionable. <strong style={{ color: C.ink }}>You should understand every bet you make.</strong>
            </div>
            {[
              { t: "E", ts: { border: `1px solid ${C.blue}`, color: C.blue }, text: "Plain-language explanation. Every formula has a one-sentence definition." },
              { t: "A", ts: { border: `1px solid ${C.amber}`, color: C.amber }, text: "All formulas source-linked. Betstamp timestamp pre-publication. Reproducible." },
              { t: "A", ts: { border: `1px solid ${C.green}`, color: C.green }, text: `Kelly sized at ${kPct}%. Entry: EVI ≥ +3.0%. Exit rule defined.` },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 9, padding: "8px 0", borderBottom: i < 2 ? `1px solid ${C.ruleLt}` : "none", fontFamily: C.mono, fontSize: 9.5, lineHeight: 1.6, color: C.ghost }}>
                <span style={{ ...item.ts, fontSize: 7, letterSpacing: 1.5, fontWeight: 700, padding: "2px 5px", border: "1px solid", whiteSpace: "nowrap", height: "fit-content", marginTop: 2, textTransform: "uppercase" }}>{item.t}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: DOSSIERS
═══════════════════════════════════════════════════════════════ */
const PageDossiers = ({ bankroll, setBankroll }) => {
  const [sel, setSel] = useState("lad");
  const pick = PICKS.find((p) => p.id === sel);
  const [sportF, setSportF] = useState("all");
  const visible = sportF === "all" ? PICKS : PICKS.filter((p) => p.sport.toLowerCase() === sportF);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", minHeight: "calc(100vh - 136px)" }}>
      <div style={{ borderRight: `2px solid ${C.rule}`, background: C.paper2, overflowY: "auto", maxHeight: "calc(100vh - 136px)", position: "sticky", top: 136 }}>
        <div style={{ padding: 14, borderBottom: `1px solid ${C.rule}` }}><BankrollSlider bankroll={bankroll} onChange={setBankroll} /></div>
        {/* Sport filter */}
        <div style={{ display: "flex", gap: 4, padding: "10px 14px", borderBottom: `1px solid ${C.rule}` }}>
          {["all", "MLB", "NBA"].map((s) => (
            <button key={s} onClick={() => setSportF(s)} style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, padding: "5px 10px", textTransform: "uppercase", border: `1px solid ${sportF === s ? C.ink : C.rule}`, color: sportF === s ? C.paper : C.ghost, background: sportF === s ? C.ink : "transparent", cursor: "pointer", borderRadius: 1, transition: "all .15s" }}>{s}</button>
          ))}
        </div>
        {visible.map((p) => {
          const wp = FE.compositeProb(p.components),
            ev = +FE.evi(wp, p.odds).toFixed(1);
          const sc = sportColor(p.sport);
          return (
            <div key={p.id} onClick={() => setSel(p.id)} style={{ padding: "16px 18px", borderBottom: `1px solid ${C.ruleLt}`, cursor: "pointer", transition: "background .15s", borderLeft: `3px solid ${sel === p.id ? sc : "transparent"}`, background: sel === p.id ? C.cream : "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.background = C.cream)} onMouseLeave={(e) => (e.currentTarget.style.background = sel === p.id ? C.cream : "transparent")}> 
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontFamily: C.display, fontSize: 12, letterSpacing: 2, color: sc, padding: "1px 6px", background: `${sc}15`, border: `1px solid ${sc}40` }}>{p.sport}</span>
                <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: C.ghost, textTransform: "uppercase" }}>{p.tag}</span>
              </div>
              <div style={{ fontFamily: C.display, fontSize: 18, letterSpacing: 1.5, color: C.ink, marginBottom: 4 }}>{p.pick}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ghost, marginBottom: 8, letterSpacing: 0.8 }}>{p.game}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 1, background: ev >= 3 ? C.greenLt : C.redLt, color: ev >= 3 ? C.green : C.red, border: `1px solid ${ev >= 3 ? C.greenBd : C.redBd}` }}>EVI {ev > 0 ? "+" : ""}{ev}%</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <Tag v="green">EAA</Tag>
                  <Tag v="ghost">{p.file}</Tag>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <DossierDetail pick={pick} bankroll={bankroll} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: STANDINGS (new!)
═══════════════════════════════════════════════════════════════ */
const StandingRow = ({ row }) => {
  if (row.divider)
    return (
      <tr>
        <td colSpan={7} style={{ padding: "6px 10px", background: C.ink, fontFamily: C.mono, fontSize: 8, letterSpacing: 3, color: "rgba(255,255,255,.3)", textTransform: "uppercase", textAlign: "center" }}>▼ PLAY-IN TOURNAMENT ZONE ▼</td>
      </tr>
    );
  const sc = row.status === "CLINCHED" ? C.green : row.status === "ELIM" ? C.red : row.status === "BUBBLE" ? C.amber : row.status === "PLAY-IN" ? C.blue : C.ghost;
  const pct = row.w != null ? ((row.w / (row.w + row.l)) * 100).toFixed(1) : "";
  return (
    <tr style={{ borderBottom: `1px solid ${C.ruleLt}` }}>
      <td style={{ padding: "9px 10px", fontFamily: C.mono, fontSize: 9, color: C.ghost, width: 32 }}>{row.seed}</td>
      <td style={{ padding: "9px 10px", fontFamily: C.mono, fontSize: 11, color: C.ink, fontWeight: 700 }}>
        <div>{row.team}</div>
        {row.note && <div style={{ fontSize: 8, color: C.ghost, letterSpacing: 0.5, marginTop: 2 }}>{row.note}</div>}
      </td>
      <td style={{ padding: "9px 10px", fontFamily: C.display, fontSize: 18, color: C.green, textAlign: "center" }}>{row.w}</td>
      <td style={{ padding: "9px 10px", fontFamily: C.display, fontSize: 18, color: C.red, textAlign: "center" }}>{row.l}</td>
      <td style={{ padding: "9px 10px", fontFamily: C.mono, fontSize: 10, color: C.ghost, textAlign: "center" }}>{pct ? `${pct}%` : ""}</td>
      <td style={{ padding: "9px 10px", textAlign: "center" }}>
        <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, padding: "2px 7px", border: `1px solid ${sc}40`, color: sc, background: `${sc}10`, textTransform: "uppercase", whiteSpace: "nowrap" }}>{row.status}</span>
      </td>
      <td style={{ padding: "9px 10px", fontFamily: C.mono, fontSize: 9, color: row.hot ? C.green : C.ghost, textAlign: "center" }}>{row.hot && "🔥 "}{row.streak}</td>
    </tr>
  );
};

const PageStandings = () => (
  <div style={{ background: C.paper }}>
    <SectionHdr title="NBA STANDINGS" meta={`Playoff picture · March 26, 2026 · ${21} games remaining`} />
    {/* Last night scoreboard */}
    <div style={{ padding: "24px 40px 0" }}>
      <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 2, color: C.ghost, textTransform: "uppercase", marginBottom: 12 }}>◀ Last Night's Results · March 25</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 8, marginBottom: 28 }}>
        {LAST_NIGHT.map((g, i) => {
          const sc = g.sport === "MLB" ? C.amber : C.blue;
          return (
            <div key={i} style={{ background: C.cream, border: `1px solid ${C.rule}`, padding: "12px 14px", borderLeft: `3px solid ${sc}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontFamily: C.display, fontSize: 14, letterSpacing: 1, color: C.ink }}>{g.game}</div>
                <Tag v={g.sport === "MLB" ? "amber" : "blue"}>{g.sport}</Tag>
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: sc, fontWeight: 700, marginBottom: 3 }}>{g.star}</div>
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink, marginBottom: 2 }}>{g.hero}</div>
              <div style={{ fontFamily: C.mono, fontSize: 8.5, color: C.ghost }}>{g.note}</div>
            </div>
          );
        })}
      </div>
    </div>
    {/* Conference standings */}
    <div style={{ padding: "0 40px 64px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {[
        { conf: "Western Conference", data: NBA_STANDINGS.west },
        { conf: "Eastern Conference", data: NBA_STANDINGS.east },
      ].map(({ conf, data }) => (
        <div key={conf}>
          <div style={{ fontFamily: C.display, fontSize: 20, letterSpacing: 2, color: C.ink, marginBottom: 12, borderBottom: `2px solid ${C.rule}`, paddingBottom: 8 }}>{conf}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Team", "W", "L", "PCT", "Status", "Form"].map((h) => (
                  <th key={h} style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: C.ghost, textAlign: h === "Team" ? "left" : "center", padding: "7px 10px", borderBottom: `2px solid ${C.ink}`, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{data.map((r, i) => <StandingRow key={i} row={r} />)}</tbody>
          </table>
        </div>
      ))}
    </div>
    {/* Playoff context */}
    <div style={{ padding: "0 40px 64px" }}>
      <div style={{ background: C.paper2, border: `1px solid ${C.rule}`, padding: 22, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {[
          { t: "Key dates", items: ["Regular Season ends: April 12", "Play-In Tournament: April 14–17", "Playoffs begin: April 18", "Celtics vs Knicks: April 9 (East #2 seed decider)"] },
          { t: "Magic numbers (to clinch seed)", items: ["OKC: 8 to lock #1 overall", "Detroit: 6 for East #1", "Boston magic #: 3", "Knicks magic #: 1 (effectively in)"] },
          { t: "Three-way bubble (East 8–10)", items: ["Orlando 38-34 · 6-game skid", "Charlotte 38-34 · 4-game W streak", "Miami 38-34 · Won last night", "Complex multi-team tiebreaker applies"] },
        ].map(({ t, items }) => (
          <div key={t}>
            <div style={{ fontFamily: C.serif, fontSize: 15, color: C.ink, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.ruleLt}` }}>{t}</div>
            {items.map((item, i) => (
              <div key={i} style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ghost, padding: "4px 0", borderBottom: `1px solid ${C.ruleLt}`, letterSpacing: 0.5 }}><span style={{ color: C.ink }}>·</span> {item}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   PAGE: FORMULA LIBRARY
═══════════════════════════════════════════════════════════════ */
const PageFormulas = () => {
  const [filt, setFilt] = useState("all"),
    [q, setQ] = useState("");
  const vis = useMemo(
    () =>
      FORMULAS.filter((f) => {
        const mq = !q || f.name.toLowerCase().includes(q.toLowerCase()) || f.full.toLowerCase().includes(q.toLowerCase()) || f.desc.toLowerCase().includes(q.toLowerCase());
        const mf = filt === "all" || f.tags.includes(filt) || (filt === "eaa" && f.eaa);
        return mq && mf;
      }),
    [filt, q],
  );
  const sc = (f) => (f.tags.includes("mlb") ? C.amber : f.tags.includes("nba") ? C.blue : C.green);
  return (
    <div style={{ background: C.paper }}>
      <SectionHdr title="FORMULA LIBRARY" meta="Production-grade metrics · EAA-tagged · Source-linked" />
      <div style={{ background: C.ink, padding: "18px 40px", borderBottom: `1px solid ${C.inkBorder}` }}>
        <div style={{ fontFamily: C.serif, fontSize: 16, color: C.paper, lineHeight: 1.5, maxWidth: 700 }}>
          We're not trying to out-resource the books. We find the three spots per month where they moved too slow and we moved first. <em style={{ color: C.green }}>That's the guerrilla part.</em>
        </div>
      </div>
      <div style={{ padding: "24px 40px 64px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search formulas…" style={{ background: C.cream, border: `1px solid ${C.rule}`, padding: "9px 14px", fontFamily: C.mono, fontSize: 10, color: C.ink, width: 220, outline: "none" }} />
          {["all", "mlb", "nba", "dfs", "eaa"].map((f) => (
            <button key={f} onClick={() => setFilt(f)} style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: 1.5, padding: "8px 13px", textTransform: "uppercase", border: `1px solid ${filt === f ? C.ink : C.rule}`, color: filt === f ? C.paper : C.ghost, background: filt === f ? C.ink : "transparent", cursor: "pointer", borderRadius: 1, transition: "all .15s" }}>{f}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 2, background: C.ruleLt }}>
          {vis.map((f) => {
            const c = sc(f);
            return (
              <div key={f.id} style={{ background: C.cream, border: `1px solid ${C.rule}`, overflow: "hidden" }}>
                <div style={{ background: C.paper2, padding: "12px 16px", borderBottom: `1px solid ${C.rule}` }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                    {f.tags.map((t) => (
                      <Tag key={t} v={t === "eaa" ? "green" : t === "dfs" ? "amber" : t === "mlb" ? "amber" : t === "nba" ? "blue" : "ghost"}>{t}</Tag>
                    ))}
                  </div>
                  <div style={{ fontFamily: C.display, fontSize: 22, letterSpacing: 2, color: C.ink }}>{f.name}</div>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ fontFamily: C.serif, fontSize: 14, color: C.ink, marginBottom: 8 }}>{f.full}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ghost, lineHeight: 1.8, marginBottom: 10 }}>{f.desc}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ink, background: C.paper, border: `1px solid ${C.ruleLt}`, padding: "8px 10px", letterSpacing: 0.5, lineHeight: 1.7, marginBottom: 10, fontStyle: "italic" }}>{f.formula}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ghost, lineHeight: 1.7 }}>Use: <strong style={{ color: c }}>{f.use}</strong></div>
                </div>
                <div style={{ background: C.ink, color: C.paper, padding: "9px 12px", fontFamily: C.mono, fontSize: 9, lineHeight: 1.7 }}>
                  <strong style={{ color: c }}>Threshold:</strong> {f.threshold}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: LINE MOVEMENT
═══════════════════════════════════════════════════════════════ */
const PageMovement = () => {
  const [filt, setFilt] = useState("all");
  const TM = { sharp: "Sharp Money", steam: "Steam Move", rlm: "Reverse LM", fade: "Fade Signal" };
  const TC = { sharp: C.green, steam: C.amber, rlm: C.blue, fade: C.red };
  const vis = filt === "all" ? LM_DATA : LM_DATA.filter((d) => d.type === filt);
  return (
    <div style={{ background: C.paper }}>
      <SectionHdr title="LINE MOVEMENT INTELLIGENCE" meta="Sharp · Steam · Reverse LM · Today's signals" />
      <div style={{ padding: "24px 40px 64px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["all", "sharp", "steam", "rlm", "fade"].map((f) => (
            <button key={f} onClick={() => setFilt(f)} style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: 1.5, padding: "8px 13px", textTransform: "uppercase", border: `1px solid ${filt === f ? C.ink : C.rule}`, color: filt === f ? C.paper : C.ghost, background: filt === f ? C.ink : "transparent", cursor: "pointer", borderRadius: 1, transition: "all .15s" }}>{f === "all" ? "All Signals" : TM[f]}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(310px,1fr))", gap: 16 }}>
          {vis.map((d, i) => {
            const sc2 = d.sport === "MLB" ? C.amber : C.blue;
            return (
              <div key={i} style={{ border: `1px solid ${C.rule}`, background: C.cream, overflow: "hidden" }}>
                <div style={{ background: C.paper2, padding: "10px 14px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontFamily: C.display, fontSize: 12, letterSpacing: 2, color: sc2, padding: "1px 6px", background: `${sc2}15`, border: `1px solid ${sc2}40` }}>{d.sport}</span>
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 1.5, padding: "3px 7px", textTransform: "uppercase", fontWeight: 700, border: `1px solid ${TC[d.type]}40`, color: TC[d.type], background: `${TC[d.type]}10` }}>{TM[d.type]}</span>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 1, color: C.ghost, marginBottom: 6, textTransform: "uppercase" }}>{d.game}</div>
                  <div style={{ fontFamily: C.display, fontSize: 22, letterSpacing: 1.5, color: C.ink, marginBottom: 10 }}>{d.pick}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 15, color: C.ghost, textDecoration: "line-through" }}>{d.from}</span>
                    <span style={{ fontSize: 12, color: C.rule }}>→</span>
                    <span style={{ fontFamily: C.display, fontSize: 24, color: TC[d.type] }}>{d.to}</span>
                  </div>
                  <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ghost, lineHeight: 1.8 }}>{d.context}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.paper2, padding: "8px 10px", marginTop: 10, borderTop: `1px solid ${C.ruleLt}` }}>
                    <div style={{ fontFamily: C.mono, fontSize: 8, color: C.ghost, letterSpacing: 1, textTransform: "uppercase" }}>{d.action}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: d.cls === "pos" ? C.green : d.cls === "neg" ? C.red : C.amber }}>{d.ev}</div>
                  </div>
                  <div style={{ fontFamily: C.mono, fontSize: 8, color: C.ghost, marginTop: 6, textAlign: "right" }}>{d.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: SGP ENGINE
═══════════════════════════════════════════════════════════════ */
const PageSGP = () => (
  <div style={{ background: C.paper }}>
    <SectionHdr title="SGP CORRELATION ENGINE" meta="Positive correlation = the books are underpricing your parlay" />
    <div style={{ padding: "24px 40px 64px" }}>
      <div style={{ background: C.ink, color: C.paper, padding: "20px 28px", marginBottom: 28, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: C.serif, fontSize: 20, marginBottom: 8 }}>The books want you to build same-game parlays. Here's the math on why they keep winning.</div>
          <div style={{ fontFamily: C.mono, fontSize: 9.5, color: "rgba(255,255,255,.45)", lineHeight: 1.85, maxWidth: 580 }}>
            FanDuel and DraftKings price every SGP leg independently — as if a Dodgers win has zero correlation with Yamamoto striking out 8. It doesn't. The SGP Engine finds the positively correlated legs the books are ignoring and flags the negatives. Positive avg correlation ≥ +0.40 = build it. Negative = they're pricing you out before you've hit submit.
          </div>
        </div>
        <div style={{ fontFamily: C.display, fontSize: 38, letterSpacing: 2, color: C.red, opacity: 0.65, border: `3px solid ${C.red}`, padding: "10px 18px", textAlign: "center", lineHeight: 1 }}>
          THE<br />BOOKS'<br />TRAP
        </div>
      </div>
      {/* Tonight's Dodgers SGP */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {[
          {
            title: "LAD SGP Tonight — BUILD THIS",
            status: "go",
            slbl: "● CORRELATED · GO",
            legs: [
              { n: "01", pick: "LAD −1.5", c: +0.68 },
              { n: "02", pick: "Yamamoto OVER 7.5 K", c: +0.68 },
              { n: "03", pick: "LAD OVER 4.5 Runs", c: +0.54 },
            ],
            avg: +0.63,
            gap: "Underpriced ▲",
            verdict: "BUILD IT",
          },
          {
            title: "LAD SGP Tonight — AVOID",
            status: "avoid",
            slbl: "● NEG CORR · AVOID",
            legs: [
              { n: "01", pick: "LAD -1.5", c: -0.41 },
              { n: "02", pick: "Gallen OVER 5.5 K", c: -0.41 },
              { n: "03", pick: "ARI UNDER 2 Runs", c: -0.33 },
            ],
            avg: -0.38,
            gap: "Overpriced ▼",
            verdict: "DO NOT BUILD",
          },
        ].map((ex, ei) => (
          <div key={ei} style={{ border: `1px solid ${C.rule}`, background: C.cream, overflow: "hidden" }}>
            <div style={{ background: C.paper2, padding: "11px 16px", borderBottom: `2px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: C.serif, fontSize: 16, color: C.ink }}>{ex.title}</div>
              <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase", color: ex.status === "go" ? C.green : C.red }}>{ex.slbl}</div>
            </div>
            <div style={{ padding: 14 }}>
              {ex.legs.map((leg, li) => (
                <div key={li} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.ruleLt}`, fontFamily: C.mono, fontSize: 10 }}>
                  <div style={{ color: C.ghost, width: 40, fontSize: 9 }}>Leg {leg.n}</div>
                  <div style={{ flex: 1, fontWeight: 700, color: C.ink }}>{leg.pick}</div>
                  <div style={{ fontWeight: 700, color: leg.c > 0 ? C.green : C.red }}>{leg.c > 0 ? "+" : ""}{leg.c.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.ink, color: C.paper, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", textTransform: "uppercase" }}>Avg Correlation</div>
                <div style={{ fontFamily: C.display, fontSize: 20, color: ex.status === "go" ? C.green : C.red }}>{ex.avg > 0 ? "+" : ""}{ex.avg.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", textTransform: "uppercase" }}>Book Gap</div>
                <div style={{ fontFamily: C.display, fontSize: 16, color: ex.status === "go" ? C.green : C.red }}>{ex.gap}</div>
              </div>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", textTransform: "uppercase" }}>Verdict</div>
                <div style={{ fontFamily: C.display, fontSize: 20, color: ex.status === "go" ? C.green : C.red }}>{ex.verdict}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Charlotte SGP */}
      <div style={{ fontFamily: C.serif, fontSize: 17, color: C.ink, marginBottom: 14 }}>Tonight's NBA — Charlotte Hornets SGP</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          {
            title: "CHA SGP — BUILD THIS",
            status: "go",
            slbl: "● CORRELATED · GO",
            legs: [
              { n: "01", pick: "CHA −1.5", c: +0.61 },
              { n: "02", pick: "CHA OVER 15.5 3PM", c: +0.61 },
              { n: "03", pick: "LaMelo OVER 24.5 PTS", c: +0.49 },
            ],
            avg: +0.57,
            gap: "Underpriced ▲",
            verdict: "BUILD IT",
          },
          {
            title: "CHA SGP — AVOID",
            status: "avoid",
            slbl: "● NEG CORR · AVOID",
            legs: [
              { n: "01", pick: "CHA -1.5", c: -0.35 },
              { n: "02", pick: "NYK ML", c: -0.35 },
              { n: "03", pick: "KAT UNDER 28.5 PRA", c: -0.28 },
            ],
            avg: -0.33,
            gap: "Overpriced ▼",
            verdict: "DO NOT BUILD",
          },
        ].map((ex, ei) => (
          <div key={ei} style={{ border: `1px solid ${C.rule}`, background: C.cream, overflow: "hidden" }}>
            <div style={{ background: C.paper2, padding: "11px 16px", borderBottom: `2px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: C.serif, fontSize: 16, color: C.ink }}>{ex.title}</div>
              <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase", color: ex.status === "go" ? C.green : C.red }}>{ex.slbl}</div>
            </div>
            <div style={{ padding: 14 }}>
              {ex.legs.map((leg, li) => (
                <div key={li} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.ruleLt}`, fontFamily: C.mono, fontSize: 10 }}>
                  <div style={{ color: C.ghost, width: 40, fontSize: 9 }}>Leg {leg.n}</div>
                  <div style={{ flex: 1, fontWeight: 700, color: C.ink }}>{leg.pick}</div>
                  <div style={{ fontWeight: 700, color: leg.c > 0 ? C.green : C.red }}>{leg.c > 0 ? "+" : ""}{leg.c.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.ink, color: C.paper, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", textTransform: "uppercase" }}>Avg Correlation</div>
                <div style={{ fontFamily: C.display, fontSize: 20, color: ex.status === "go" ? C.green : C.red }}>{ex.avg > 0 ? "+" : ""}{ex.avg.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", textTransform: "uppercase" }}>Verdict</div>
                <div style={{ fontFamily: C.display, fontSize: 20, color: ex.status === "go" ? C.green : C.red }}>{ex.verdict}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   PAGE: AUDIT ROOM
═══════════════════════════════════════════════════════════════ */
const PageAudit = () => (
  <div style={{ background: C.paper }}>
    <SectionHdr title="THE AUDIT ROOM" meta="Wins and misses. We show both. Post-game EAA breakdowns." />
    <div style={{ padding: "24px 40px 64px" }}>
      <p style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ghost, lineHeight: 1.9, maxWidth: 640, marginBottom: 28 }}>
        Every result gets a full post-mortem. <strong style={{ color: C.ink }}>This is not a highlights reel.</strong> It's an evidence archive. The Audit Room is the single most important page on this platform — it's where the EAA promise becomes real.
      </p>
      {/* Season stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, background: C.ruleLt, border: `1px solid ${C.rule}`, marginBottom: 28 }}>
        {[
          ["Season", "31–18", ""],
          ["Win Rate", "63.3%", C.green],
          ["Units", "+18.4u", C.green],
          ["Avg Kelly", "2.1%", ""],
          ["Logged", "49", C.amber],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: C.cream, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 2, color: C.ghost, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div style={{ fontFamily: C.display, fontSize: 26, letterSpacing: 1.5, color: c || C.ink }}>{v}</div>
          </div>
        ))}
      </div>
      {AUDIT_DATA.map((entry, i) => {
        const sc = entry.sport.includes("MLB") ? C.amber : C.blue;
        return (
          <div key={i} style={{ border: `1px solid ${C.rule}`, background: C.cream, marginBottom: 20 }}>
            <div style={{ background: C.paper2, padding: "13px 18px", borderBottom: `2px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: C.display, fontSize: 13, letterSpacing: 2, color: sc, padding: "1px 8px", background: `${sc}15`, border: `1px solid ${sc}40` }}>{entry.sport.includes("MLB") ? "MLB" : "NBA"}</span>
                <div style={{ fontFamily: C.serif, fontSize: 17, color: C.ink }}>File {entry.file} · {entry.pick}</div>
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 8.5, color: C.ghost, letterSpacing: 1, textAlign: "right", lineHeight: 1.7 }}>{entry.date} · Logged: {entry.logged}</div>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ fontFamily: C.display, fontSize: 24, letterSpacing: 2, padding: "5px 14px", flexShrink: 0, background: entry.result === "win" ? C.greenLt : C.redLt, color: entry.result === "win" ? C.green : C.red, border: `1px solid ${entry.result === "win" ? C.greenBd : C.redBd}` }}>{entry.label}</div>
                <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ghost, lineHeight: 1.9 }}>
                  {entry.summary}
                  <br />
                  <strong style={{ color: C.ink }}>EVI at pick: {entry.eviAtPick > 0 ? "+" : ""}{entry.eviAtPick}%</strong>
                  {" · "}
                  <strong style={{ color: C.ink }}>Kelly: {entry.kellyAtPick}%</strong>
                  {" · "}
                  <strong style={{ color: C.ink }}>Confidence: {entry.conf}%</strong>
                </div>
              </div>
              <div>
                {entry.log.map((row, j) => (
                  <div key={j} style={{ display: "flex", gap: 0, padding: "9px 0", borderBottom: `1px solid ${C.ruleLt}`, fontFamily: C.mono, fontSize: 9.5, alignItems: "flex-start" }}>
                    <div style={{ width: 110, color: C.ghost, flexShrink: 0, fontSize: 9 }}>{row.ts}</div>
                    <div style={{ flex: 1, color: C.ink }}>{row.event}</div>
                    <div style={{ width: 90, textAlign: "right", fontWeight: 700, flexShrink: 0, fontSize: 9, color: row.cls === "ok" ? C.green : row.cls === "fail" ? C.red : C.amber }}>{row.val}</div>
                  </div>
                ))}
              </div>
              {entry.note && <div style={{ background: C.greenLt, border: `1px solid ${C.greenBd}`, padding: "10px 14px", marginTop: 12, fontFamily: C.mono, fontSize: 9, color: C.ghost, lineHeight: 1.7 }}><strong style={{ color: C.ink }}>Model note:</strong> {entry.note}</div>}
              {entry.miss && (
                <div style={{ background: C.redLt, border: `1px solid ${C.redBd}`, borderLeft: `4px solid ${C.red}`, padding: "14px 16px", marginTop: 14 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2.5, color: C.red, textTransform: "uppercase", marginBottom: 7, fontWeight: 700 }}>{entry.miss.label}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink, lineHeight: 1.85 }}>
                    {entry.miss.text.split("\n\n").map((para, pi) => (
                      <p key={pi} style={{ marginBottom: pi < 2 ? 10 : 0 }}>{para}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   PAGE: PRICING
═══════════════════════════════════════════════════════════════ */
const PRICING_TIERS = [
  {
    id: "scout",
    name: "SCOUT",
    price: "$29",
    period: "/mo",
    subtitle: "Know what the market doesn't yet.",
    desc: "Access Futures model outputs across NFL, NBA, and MLB. See probability differentials, undervalued teams, and Elo power rankings updated weekly. Better information than 99% of the market. Minimal brain damage.",
    features: [
      "Futures model outputs",
      "Probability differentials vs. market",
      "Weekly Elo power rankings",
      "Cross-sport coverage (NFL + NBA + MLB)",
    ],
    cta: "Start with the signal",
    accent: C.green,
  },
  {
    id: "operative",
    name: "OPERATIVE",
    price: "$79",
    period: "/mo",
    subtitle: "Act on what the market doesn't yet.",
    desc: "Everything in Scout plus vig-stripped implied probabilities, Kelly-sized stake recommendations, and annualized EV comparisons across open Futures windows. From 'I see the edge' to 'here's exactly how much to bet and why.' Near-zero brain damage.",
    features: [
      "Everything in Scout",
      "Vig removal (multiplicative method)",
      "Kelly stake sizing",
      "Annualized EV calculator",
      "Open Futures windows dashboard",
    ],
    cta: "Scale with the edge",
    accent: C.amber,
    featured: true,
  },
  {
    id: "command",
    name: "COMMAND",
    price: "$199",
    period: "/mo",
    subtitle: "Move before the market moves.",
    desc: "Full cross-sport Futures dashboard with historical edge tracking, model confidence intervals, and early-window alerts when a line opens mispriced before public money corrects it. Roster database refreshes feed this in real time. Zero brain damage. Maximum asymmetric advantage.",
    features: [
      "Everything in Operative",
      "Historical edge tracking",
      "Model confidence intervals",
      "Early-window mispricing alerts",
      "Real-time roster database feed",
      "Full NFL + NBA + MLB Futures board",
    ],
    cta: "Move first",
    accent: C.blue,
  },
];

const PagePricing = () => (
  <div style={{ background: C.paper }}>
    <SectionHdr title="INTELLIGENCE TIERS" meta="Three levels. One mission." />
    {/* Anti-props positioning */}
    <div style={{ background: C.ink, padding: "24px 40px", borderBottom: `1px solid ${C.inkBorder}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center", maxWidth: 860 }}>
        <div style={{ fontFamily: C.serif, fontSize: 20, color: C.paper, lineHeight: 1.45 }}>
          Props are a war of attrition. Futures are a war of positioning. We fight the second one.
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 9.5, color: "rgba(255,255,255,.4)", lineHeight: 1.9 }}>
          Props markets are optimized against you — smaller windows, faster corrections, higher vig. Futures have wider inefficiency windows because the book moves slower than the information. That gap is where we operate.
        </div>
      </div>
    </div>
    <div style={{ padding: "40px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      {PRICING_TIERS.map((tier) => (
        <div key={tier.id} style={{ border: `2px solid ${tier.featured ? tier.accent : C.rule}`, background: tier.featured ? C.cream : C.paper, overflow: "hidden", position: "relative" }}>
          {tier.featured && (
            <div style={{ background: tier.accent, padding: "5px 12px", fontFamily: C.mono, fontSize: 7.5, letterSpacing: 2, color: C.ink, fontWeight: 700, textAlign: "center", textTransform: "uppercase" }}>
              MOST POPULAR
            </div>
          )}
          <div style={{ padding: 24 }}>
            <div style={{ fontFamily: C.display, fontSize: 28, letterSpacing: 3, color: tier.accent, marginBottom: 4 }}>{tier.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 10 }}>
              <span style={{ fontFamily: C.display, fontSize: 42, letterSpacing: 2, color: C.ink }}>{tier.price}</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 1 }}>{tier.period}</span>
            </div>
            <div style={{ fontFamily: C.serif, fontSize: 14, color: C.ink, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.ruleLt}`, fontStyle: "italic", lineHeight: 1.4 }}>
              {tier.subtitle}
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ghost, lineHeight: 1.85, marginBottom: 18 }}>
              {tier.desc}
            </div>
            <div style={{ marginBottom: 20 }}>
              {tier.features.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: i < tier.features.length - 1 ? `1px solid ${C.ruleLt}` : "none", fontFamily: C.mono, fontSize: 9, color: C.ink, alignItems: "flex-start" }}>
                  <span style={{ color: tier.accent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>
            <button
              style={{ width: "100%", background: tier.accent, color: tier.id === "command" ? C.paper : C.ink, padding: "13px 16px", fontFamily: C.display, fontSize: 16, letterSpacing: 2, cursor: "pointer", border: "none", textTransform: "uppercase", transition: "opacity .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {tier.cta}
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   PAGE: EDGE CALCULATOR (Operative Tier)
═══════════════════════════════════════════════════════════════ */
const PageEdgeCalc = () => {
  const [vigRows, setVigRows] = useState([
    { team: "Chiefs", odds: "-200" },
    { team: "Eagles", odds: "+400" },
    { team: "Ravens", odds: "+600" },
    { team: "Bills", odds: "+700" },
  ]);
  const [vigResult, setVigResult] = useState(null);

  const [evA, setEvA] = useState({ modelProb: "0.22", odds: "+400", days: "155" });
  const [evB, setEvB] = useState({ modelProb: "0.35", odds: "+180", days: "90" });

  const addRow = () => setVigRows((r) => [...r, { team: "", odds: "" }]);
  const updateRow = (i, field, val) =>
    setVigRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const removeRow = (i) => setVigRows((rows) => rows.filter((_, idx) => idx !== i));

  const calcVig = () => {
    const dict = {};
    vigRows.forEach(({ team, odds }) => {
      const n = parseInt(odds);
      if (team && !isNaN(n)) dict[team] = n;
    });
    if (Object.keys(dict).length === 0) return;
    setVigResult(removeVigMultiplicative(dict));
  };

  const calcEvA = futuresEvAnnualized(
    parseFloat(evA.modelProb) || 0,
    parseInt(evA.odds) || 100,
    parseInt(evA.days) || 30
  );
  const calcEvB = futuresEvAnnualized(
    parseFloat(evB.modelProb) || 0,
    parseInt(evB.odds) || 100,
    parseInt(evB.days) || 30
  );

  const winnerIsA =
    calcEvA.annualizedEv != null && calcEvB.annualizedEv != null
      ? calcEvA.annualizedEv > calcEvB.annualizedEv
      : calcEvA.isPositiveEv;

  const inputStyle = {
    background: C.cream, border: `1px solid ${C.ruleLt}`, padding: "7px 9px",
    fontFamily: C.mono, fontSize: 10, color: C.ink, outline: "none", width: "100%",
  };

  return (
    <div style={{ background: C.paper }}>
      <SectionHdr title="EDGE CALCULATOR" meta="Operative Tier · Vig removal + Annualized EV" />

      <div style={{ padding: "24px 40px 64px" }}>
        {/* EAA tagline */}
        <div style={{ background: C.ink, color: C.paper, padding: "14px 18px", marginBottom: 28, borderLeft: `4px solid ${C.green}`, fontFamily: C.mono, fontSize: 9, lineHeight: 1.8, letterSpacing: 0.5 }}>
          Every recommendation is Explainable, Auditable, and Actionable.{" "}
          <strong style={{ color: C.green }}>You should understand every bet you make.</strong>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

          {/* ── VIG REMOVAL ── */}
          <div>
            <div style={{ fontFamily: C.display, fontSize: 22, letterSpacing: 2, color: C.ink, marginBottom: 4 }}>VIG REMOVAL</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ghost, lineHeight: 1.7, marginBottom: 16 }}>
              Enter every team on the Futures board. We strip the book's cut and give you the real implied probabilities to compare against your model.
            </div>

            {vigRows.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 28px", gap: 6, marginBottom: 6, alignItems: "stretch" }}>
                <input value={row.team} onChange={(e) => updateRow(i, "team", e.target.value)} placeholder="Team name" style={inputStyle} />
                <input value={row.odds} onChange={(e) => updateRow(i, "odds", e.target.value)} placeholder="-110" style={{ ...inputStyle, textAlign: "right" }} />
                <button onClick={() => removeRow(i)} style={{ background: "none", border: `1px solid ${C.ruleLt}`, color: C.ghost, cursor: "pointer", fontSize: 13 }}>×</button>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={addRow} style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, padding: "8px 12px", border: `1px solid ${C.rule}`, color: C.ghost, background: "transparent", cursor: "pointer", textTransform: "uppercase" }}>+ Team</button>
              <button onClick={calcVig} style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, padding: "8px 18px", border: "none", background: C.ink, color: C.paper, cursor: "pointer", textTransform: "uppercase" }}>Remove Vig →</button>
            </div>

            {vigResult && (
              <div style={{ marginTop: 18, border: `1px solid ${C.rule}`, overflow: "hidden" }}>
                <div style={{ background: C.ink, padding: "9px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>Fair Probabilities</span>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.red, fontWeight: 700 }}>Book charging {vigResult.vigPct.toFixed(1)}% vig</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.mono, fontSize: 9 }}>
                  <thead>
                    <tr>
                      {["Team", "Odds", "Raw Implied", "Fair Implied"].map((h) => (
                        <th key={h} style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: C.ghost, textAlign: h === "Team" ? "left" : "right", padding: "7px 10px", borderBottom: `1px solid ${C.rule}`, background: C.paper2 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(vigResult.fairProbs).map(([team, fair]) => {
                      const rawOdds = parseInt(vigRows.find((r) => r.team === team)?.odds || "0");
                      const rawImpl = rawOdds > 0 ? 100 / (rawOdds + 100) : Math.abs(rawOdds) / (Math.abs(rawOdds) + 100);
                      return (
                        <tr key={team}>
                          <td style={{ padding: "8px 10px", color: C.ink, fontWeight: 700, borderBottom: `1px solid ${C.ruleLt}` }}>{team}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: C.ghost, borderBottom: `1px solid ${C.ruleLt}` }}>{vigRows.find((r) => r.team === team)?.odds}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: C.ghost, borderBottom: `1px solid ${C.ruleLt}` }}>{(rawImpl * 100).toFixed(1)}%</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: C.green, fontWeight: 700, borderBottom: `1px solid ${C.ruleLt}` }}>{(fair * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ background: C.greenLt, border: `1px solid ${C.greenBd}`, padding: "9px 12px", fontFamily: C.mono, fontSize: 8.5, color: C.ghost, lineHeight: 1.7 }}>
                  <strong style={{ color: C.ink }}>Book is charging {vigResult.vigPct.toFixed(1)}% vig on this board.</strong> Compare your model against Fair Implied — not Raw Implied.
                </div>
              </div>
            )}
          </div>

          {/* ── ANNUALIZED EV ── */}
          <div>
            <div style={{ fontFamily: C.display, fontSize: 22, letterSpacing: 2, color: C.ink, marginBottom: 4 }}>ANNUALIZED EV</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ghost, lineHeight: 1.7, marginBottom: 16 }}>
              A 5-month Super Bowl bet and a 3-month division bet aren't comparable on raw EV. Annualize both and compare which grows your bankroll faster per year.
            </div>

            {[
              { label: "BET A", state: evA, set: setEvA, result: calcEvA, accent: C.green },
              { label: "BET B", state: evB, set: setEvB, result: calcEvB, accent: C.amber },
            ].map(({ label, state, set, result, accent }) => (
              <div key={label} style={{ border: `1px solid ${C.rule}`, background: C.cream, marginBottom: 14, overflow: "hidden" }}>
                <div style={{ background: C.paper2, padding: "8px 14px", borderBottom: `1px solid ${C.rule}`, fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: accent, textTransform: "uppercase" }}>{label}</div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {[
                      { lbl: "Model Prob", field: "modelProb", ph: "0.22" },
                      { lbl: "Odds", field: "odds", ph: "+400" },
                      { lbl: "Days Out", field: "days", ph: "155" },
                    ].map(({ lbl, field, ph }) => (
                      <div key={field}>
                        <div style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 1.5, color: C.ghost, textTransform: "uppercase", marginBottom: 3 }}>{lbl}</div>
                        <input value={state[field]} onChange={(e) => set((s) => ({ ...s, [field]: e.target.value }))} placeholder={ph} style={{ ...inputStyle, textAlign: "right", padding: "6px 8px" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { l: "Raw EV", v: result.rawEv != null ? `${result.rawEv > 0 ? "+" : ""}${result.rawEv}%` : "—", c: (result.rawEv || 0) >= 3 ? C.green : (result.rawEv || 0) >= 0 ? C.amber : C.red },
                      { l: "Annualized EV", v: result.annualizedEv != null ? `${result.annualizedEv > 0 ? "+" : ""}${result.annualizedEv}%` : (result.error ? "N/A" : "—"), c: (result.annualizedEv || 0) > 0 ? accent : C.red },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ background: C.paper, border: `1px solid ${C.ruleLt}`, padding: "10px 10px", textAlign: "center" }}>
                        <div style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 1.5, color: C.ghost, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                        <div style={{ fontFamily: C.display, fontSize: 22, letterSpacing: 1.5, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {result.annualizedEv != null && result.isPositiveEv && (
                    <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 8.5, color: C.ghost, lineHeight: 1.7, background: C.greenLt, border: `1px solid ${C.greenBd}`, padding: "7px 10px" }}>
                      This bet grows your bankroll at <strong style={{ color: C.green }}>{result.annualizedEv}% annually</strong> if your model is right.
                    </div>
                  )}
                  {result.error && (
                    <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 8.5, color: C.red, lineHeight: 1.7, background: C.redLt, border: `1px solid ${C.redBd}`, padding: "7px 10px" }}>
                      {result.error}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Winner callout */}
            <div style={{ background: C.ink, color: C.paper, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 1.5, color: "rgba(255,255,255,.3)", textTransform: "uppercase", marginBottom: 4 }}>Better bankroll growth</div>
                <div style={{ fontFamily: C.display, fontSize: 20, color: winnerIsA ? C.green : C.amber }}>{winnerIsA ? "BET A" : "BET B"} — higher annualized EV</div>
              </div>
              <div style={{ fontFamily: C.display, fontSize: 30, letterSpacing: 1, color: winnerIsA ? C.green : C.amber }}>
                {winnerIsA
                  ? (calcEvA.annualizedEv != null ? `${calcEvA.annualizedEv > 0 ? "+" : ""}${calcEvA.annualizedEv}%` : "—")
                  : (calcEvB.annualizedEv != null ? `${calcEvB.annualizedEv > 0 ? "+" : ""}${calcEvB.annualizedEv}%` : "—")}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: NEEDLE ALERTS
═══════════════════════════════════════════════════════════════ */
const SEVERITY_COLORS = {
  info:    C.blue,
  sharp:   C.green,
  steam:   C.amber,
  reverse: C.red,
};

const NeedleDetail = ({ alert }) => {
  if (!alert) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 60, textAlign: "center" }}>
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ghost, letterSpacing: 2, textTransform: "uppercase" }}>Select an alert from the feed</div>
      </div>
    );
  }
  const sc = SEVERITY_COLORS[alert.severity] ?? C.ghost;
  const sportSc = sportColor(alert.sport ?? "");
  const firedAt = alert.fired_at ? new Date(alert.fired_at).toLocaleString() : "—";
  const expiresAt = alert.expires_at ? new Date(alert.expires_at).toLocaleString() : "—";
  return (
    <div style={{ padding: "28px 32px 64px", overflowY: "auto" }}>
      {/* Header — visible all tiers */}
      <div style={{ marginBottom: 22, paddingBottom: 22, borderBottom: `3px double ${C.rule}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: C.mono, fontSize: 7, letterSpacing: 1.5, padding: "2px 8px", border: `1px solid ${sc}40`, color: sc, background: `${sc}10`, textTransform: "uppercase", borderRadius: 1 }}>
            {alert.severity}
          </span>
          {alert.sport && (
            <span style={{ fontFamily: C.display, fontSize: 12, letterSpacing: 2, color: sportSc, padding: "1px 6px", background: `${sportSc}15`, border: `1px solid ${sportSc}40` }}>
              {alert.sport}
            </span>
          )}
          {alert.market_type && (
            <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: C.ghost, textTransform: "uppercase" }}>
              {alert.market_type}
            </span>
          )}
        </div>
        <h2 style={{ fontFamily: C.serif, fontSize: "clamp(20px,2.5vw,28px)", color: C.ink, marginBottom: 8, lineHeight: 1.15 }}>
          {alert.title}
        </h2>
        {alert.market_label && (
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ghost, letterSpacing: 0.5 }}>{alert.market_label}</div>
        )}
      </div>

      {/* Body text — visible all tiers */}
      {alert.body && (
        <div style={{ background: C.paper2, border: `1px solid ${C.rule}`, padding: "14px 18px", marginBottom: 22, fontFamily: C.mono, fontSize: 10, color: C.ink, lineHeight: 1.85, letterSpacing: 0.3 }}>
          {alert.body}
        </div>
      )}

      {/* Meta strip — visible all tiers */}
      <div style={{ display: "flex", background: C.paper2, borderTop: `2px solid ${C.rule}`, borderBottom: `2px solid ${C.rule}`, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { l: "Severity",  v: (alert.severity ?? "—").toUpperCase(), c: sc },
          { l: "Sport",     v: alert.sport ?? "—",                     c: C.ink },
          { l: "Fired",     v: firedAt,                                c: C.ghost },
          { l: "Expires",   v: expiresAt,                              c: C.ghost },
          { l: "Min Tier",  v: (alert.min_tier ?? "scout").toUpperCase(), c: C.amber },
        ].map((m, i) => (
          <div key={i} style={{ flex: 1, minWidth: "18%", padding: "11px 10px", borderRight: i < 4 ? `1px solid ${C.rule}` : "none", textAlign: "center" }}>
            <div style={{ fontFamily: C.mono, fontSize: 7.5, letterSpacing: 2, color: C.ghost, textTransform: "uppercase", marginBottom: 5 }}>{m.l}</div>
            <div style={{ fontFamily: C.display, fontSize: 17, letterSpacing: 1, color: m.c }}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* Operative-gated detail: edge_bps + model payload */}
      <TierGate required="operative">
        <div>
          {alert.edge_bps != null && (
            <div style={{ border: `1px solid ${C.rule}`, background: C.cream, marginBottom: 16, overflow: "hidden" }}>
              <div style={{ background: C.ink, padding: "9px 14px", fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>
                Edge Signal
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                  <div style={{ fontFamily: C.display, fontSize: 42, letterSpacing: 2, lineHeight: 1, color: alert.edge_bps > 0 ? C.green : C.red }}>
                    {alert.edge_bps > 0 ? "+" : ""}{alert.edge_bps}
                  </div>
                  <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 1 }}>basis points</div>
                </div>
                <div style={{ height: 5, background: C.ruleLt, borderRadius: 3 }}>
                  <div style={{ height: 5, width: `${Math.min(Math.abs(alert.edge_bps) / 5, 100)}%`, background: alert.edge_bps > 0 ? C.green : C.red, borderRadius: 3, transition: "width .9s cubic-bezier(.4,0,.2,1)" }} />
                </div>
              </div>
            </div>
          )}
          {alert.payload && (
            <div style={{ border: `1px solid ${C.rule}`, background: C.cream, overflow: "hidden" }}>
              <div style={{ background: C.ink, padding: "9px 14px", fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>
                Model Payload
              </div>
              <div style={{ padding: 14 }}>
                <pre style={{ fontFamily: C.mono, fontSize: 9, color: C.ink, lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                  {typeof alert.payload === "object" ? JSON.stringify(alert.payload, null, 2) : String(alert.payload)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </TierGate>
    </div>
  );
};

const PageNeedles = ({ alerts, loading, error, user, isOperative }) => {
  const [selId, setSelId] = useState(null);
  const sel = alerts.find((a) => a.id === selId) ?? null;

  return (
    <div style={{ background: C.paper }}>
      {/* Section header with live indicator */}
      <div style={{ background: C.paper2, padding: "16px 40px", borderBottom: `2px solid ${C.rule}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: C.display, fontSize: 26, letterSpacing: 3, color: C.ink }}>NEEDLE ALERTS</div>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 2s infinite" }} />
              <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, color: C.green, textTransform: "uppercase" }}>
                {isOperative ? "LIVE" : "24H DELAY"}
              </span>
            </div>
          )}
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 1.5, color: C.ghost, textTransform: "uppercase" }}>
          Sharp steam · Reverse LM · Model flags
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "calc(100vh - 136px)" }}>
        {/* Alert list — all tiers see this */}
        <div style={{ borderRight: `2px solid ${C.rule}`, background: C.paper2, overflowY: "auto", maxHeight: "calc(100vh - 190px)", position: "sticky", top: 190 }}>
          {loading && (
            <div style={{ padding: 28, fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>
              Loading alerts…
            </div>
          )}
          {error && (
            <div style={{ margin: 14, padding: "10px 14px", fontFamily: C.mono, fontSize: 9, color: C.red, background: C.redLt, border: `1px solid ${C.redBd}` }}>
              {error}
            </div>
          )}
          {!loading && !error && alerts.length === 0 && !user && (
            <div style={{ padding: 32, fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 1.5, textAlign: "center", lineHeight: 2, textTransform: "uppercase" }}>
              Sign in to see live alerts
            </div>
          )}
          {!loading && !error && alerts.length === 0 && user && (
            <div style={{ padding: 32, fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 1.5, textAlign: "center", lineHeight: 2, textTransform: "uppercase" }}>
              No active alerts — check back soon.
            </div>
          )}
          {alerts.map((a) => {
            const sc = SEVERITY_COLORS[a.severity] ?? C.ghost;
            const sportSc = sportColor(a.sport ?? "");
            const firedAt = a.fired_at ? new Date(a.fired_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            return (
              <div
                key={a.id}
                onClick={() => setSelId(a.id)}
                style={{ padding: "16px 18px", borderBottom: `1px solid ${C.ruleLt}`, cursor: "pointer", transition: "background .15s", borderLeft: `3px solid ${selId === a.id ? sc : "transparent"}`, background: selId === a.id ? C.cream : "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.cream)}
                onMouseLeave={(e) => (e.currentTarget.style.background = selId === a.id ? C.cream : "transparent")}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: C.mono, fontSize: 7, letterSpacing: 1.5, padding: "2px 6px", border: `1px solid ${sc}40`, color: sc, background: `${sc}10`, textTransform: "uppercase", borderRadius: 1 }}>
                    {a.severity}
                  </span>
                  {a.sport && (
                    <span style={{ fontFamily: C.display, fontSize: 11, letterSpacing: 2, color: sportSc, padding: "1px 5px", background: `${sportSc}15`, border: `1px solid ${sportSc}40` }}>
                      {a.sport}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>
                  {a.market_label ?? a.title}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 0.5 }}>{firedAt}</div>
              </div>
            );
          })}
        </div>

        {/* Alert detail panel */}
        <NeedleDetail alert={sel} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE: FUTURES EDGE BOARD
═══════════════════════════════════════════════════════════════ */
function timeAgo(iso) {
  if (!iso) return '—';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const EDGE_SPORT_OPTIONS = ['ALL', 'NFL', 'NBA', 'MLB'];

const FUTURES_TEASER_ROWS = [
  { sport: 'NFL', market_label: 'Super Bowl Champion — Kansas City Chiefs', best_price: +450 },
  { sport: 'NBA', market_label: 'NBA Champion — Oklahoma City Thunder', best_price: +310 },
  { sport: 'MLB', market_label: 'World Series Champion — Los Angeles Dodgers', best_price: +380 },
];

const FuturesScoutTeaser = () => (
  <div>
    <div style={{ border: `1px solid ${C.rule}`, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 10 }}>
        <thead>
          <tr>
            {['Sport', 'Market / Team', 'Best Price'].map((h) => (
              <th key={h} style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: C.ghost, textAlign: 'left', padding: '9px 12px', borderBottom: `2px solid ${C.ink}`, background: C.paper2 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FUTURES_TEASER_ROWS.map((row, i) => {
            const sc = sportColor(row.sport);
            return (
              <tr key={i} style={{ borderBottom: `1px solid ${C.ruleLt}`, filter: i > 0 ? 'blur(5px)' : 'none', userSelect: 'none', background: i % 2 === 0 ? C.cream : C.paper }}>
                <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontFamily: C.display, fontSize: 12, letterSpacing: 2, color: sc, padding: '1px 6px', background: `${sc}15`, border: `1px solid ${sc}40` }}>{row.sport}</span>
                </td>
                <td style={{ padding: '12px', color: C.ink, fontWeight: 700 }}>{row.market_label}</td>
                <td style={{ padding: '12px', fontFamily: C.display, fontSize: 20, color: row.best_price > 0 ? C.green : C.amber }}>{formatAmerican(row.best_price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div style={{ textAlign: 'center', padding: '32px 0 0' }}>
      <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 3, color: C.green, textTransform: 'uppercase', marginBottom: 12 }}>Operative Feature</div>
      <div style={{ fontFamily: C.serif, fontSize: 20, color: C.ink, marginBottom: 10 }}>Act on what the market doesn't yet.</div>
      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ghost, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 20px' }}>
        The full edge leaderboard — edge_bps, fair price, model confidence, and real-time watchlist — is an Operative feature.
      </div>
      <button
        onClick={() => window.location.href = '/pricing'}
        style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.ink, background: C.green, border: 'none', padding: '12px 28px', cursor: 'pointer', borderRadius: 2 }}
      >
        Upgrade to Operative — $79/mo
      </button>
    </div>
  </div>
);

const PageFutures = ({ futures, loading, error, tieredOut, refetch, isWatched, addToWatchlist, removeFromWatchlist, capReached, edgeSport, setEdgeSport }) => {
  const freshAt = futures.length > 0 ? futures[0].updated_at : null;
  const sportCounts = EDGE_SPORT_OPTIONS.slice(1).reduce((acc, s) => {
    acc[s] = futures.filter((f) => f.sport === s).length;
    return acc;
  }, {});

  return (
    <div style={{ background: C.paper }}>
      <div style={{ background: C.paper2, padding: '16px 40px', borderBottom: `2px solid ${C.rule}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: C.display, fontSize: 26, letterSpacing: 3, color: C.ink }}>FUTURES EDGE BOARD</div>
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 1.5, color: C.ghost, textTransform: 'uppercase' }}>
          Open futures · Model edge ranked · Operative tier
        </div>
      </div>

      <div style={{ padding: '24px 40px 64px' }}>
        {/* Controls: sport filter + freshness + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {EDGE_SPORT_OPTIONS.map((s) => {
              const active = (s === 'ALL' && edgeSport === undefined) || s === edgeSport;
              const count = s === 'ALL' ? futures.length : (sportCounts[s] || 0);
              return (
                <button key={s} onClick={() => setEdgeSport(s === 'ALL' ? undefined : s)} style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: 1.5, padding: '7px 12px', textTransform: 'uppercase', border: `1px solid ${active ? C.ink : C.rule}`, color: active ? C.paper : C.ghost, background: active ? C.ink : 'transparent', cursor: 'pointer', borderRadius: 1, transition: 'all .15s' }}>
                  {s}{!tieredOut && futures.length > 0 && <span style={{ marginLeft: 5, opacity: 0.55 }}>{count}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {freshAt && (
              <span style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1, color: C.ghost, textTransform: 'uppercase' }}>
                Updated {timeAgo(freshAt)}
              </span>
            )}
            <button
              onClick={refetch}
              style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: 1.5, padding: '6px 12px', textTransform: 'uppercase', border: `1px solid ${C.rule}`, color: C.ghost, background: 'transparent', cursor: 'pointer', borderRadius: 1, transition: 'all .15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.ink; e.currentTarget.style.color = C.ink; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.rule; e.currentTarget.style.color = C.ghost; }}
            >
              ↻ REFRESH
            </button>
          </div>
        </div>

        {/* TierGate — operative required, scout sees blurred teaser */}
        <TierGate required="operative" fallback={<FuturesScoutTeaser />}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 2, textTransform: 'uppercase' }}>Loading edge data…</div>
          )}
          {error && (
            <div style={{ padding: '12px 16px', fontFamily: C.mono, fontSize: 9, color: C.red, background: C.redLt, border: `1px solid ${C.redBd}`, marginBottom: 16 }}>{error}</div>
          )}
          {!loading && !error && futures.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: C.mono, fontSize: 9, color: C.ghost, letterSpacing: 2, textTransform: 'uppercase' }}>
              No futures with edge found — try a different sport filter.
            </div>
          )}
          {!loading && !error && futures.length > 0 && (
            <div style={{ border: `1px solid ${C.rule}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: C.mono, fontSize: 10 }}>
                <thead>
                  <tr>
                    {['Sport', 'Market / Team', 'Best Price', 'Fair Price', 'Edge', 'Book', 'Elo', ''].map((h) => (
                      <th key={h} style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: C.ghost, textAlign: 'left', padding: '9px 12px', borderBottom: `2px solid ${C.ink}`, background: C.paper2, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {futures.map((f, i) => {
                    const sc = sportColor(f.sport);
                    const edgePct = f.edge_bps != null ? (f.edge_bps / 100).toFixed(1) : null;
                    const watched = isWatched(f.market_id);
                    return (
                      <tr key={f.market_id} style={{ borderBottom: `1px solid ${C.ruleLt}`, background: i % 2 === 0 ? C.cream : C.paper }}>
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: C.display, fontSize: 12, letterSpacing: 2, color: sc, padding: '1px 6px', background: `${sc}15`, border: `1px solid ${sc}40` }}>{f.sport}</span>
                        </td>
                        <td style={{ padding: '11px 12px', color: C.ink, fontWeight: 700, maxWidth: 260 }}>
                          <div style={{ fontSize: 11 }}>{f.market_label}</div>
                          {f.team && <div style={{ fontSize: 8.5, color: C.ghost, marginTop: 2 }}>{f.team}{f.position && ` · ${f.position}`}</div>}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: C.display, fontSize: 20, color: (f.best_price ?? 0) > 0 ? C.green : C.amber, whiteSpace: 'nowrap' }}>
                          {formatAmerican(f.best_price)}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: C.display, fontSize: 16, color: C.ghost, whiteSpace: 'nowrap' }}>
                          {formatAmerican(f.fair_price)}
                        </td>
                        <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                          {edgePct != null ? (
                            <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: f.edge_bps > 0 ? C.green : C.red, background: f.edge_bps > 0 ? C.greenLt : C.redLt, border: `1px solid ${f.edge_bps > 0 ? C.greenBd : C.redBd}`, padding: '2px 7px', borderRadius: 1 }}>
                              {f.edge_bps > 0 ? '+' : ''}{edgePct}%
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '11px 12px', fontFamily: C.mono, fontSize: 9, color: C.ghost }}>{f.best_book ?? '—'}</td>
                        <td style={{ padding: '11px 12px', fontFamily: C.mono, fontSize: 9, color: C.ghost }}>{f.elo_rating != null ? f.elo_rating.toFixed(0) : '—'}</td>
                        <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => watched ? removeFromWatchlist(f.market_id) : addToWatchlist(f.market_id)}
                            disabled={!watched && capReached}
                            title={!watched && capReached ? 'Watchlist limit reached' : watched ? 'Remove from watchlist' : 'Add to watchlist'}
                            style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, padding: '5px 10px', textTransform: 'uppercase', border: `1px solid ${watched ? C.green : C.rule}`, color: watched ? C.green : C.ghost, background: watched ? C.greenLt : 'transparent', cursor: !watched && capReached ? 'not-allowed' : 'pointer', opacity: !watched && capReached ? 0.4 : 1, borderRadius: 1, transition: 'all .15s', whiteSpace: 'nowrap' }}
                          >
                            {watched ? '★ WATCHING' : '+ WATCH'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TierGate>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("dossiers");
  const [bankroll, setBankroll] = useState(1000);
  const { user, tier, isOperative, isCommand, signOut, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const { alerts, loading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useNeedleAlerts({ limit: 50 });
  const [edgeSport, setEdgeSport] = useState(undefined);
  const { futures, loading: futuresLoading, error: futuresError, tieredOut: futuresTieredOut, refetch: refetchFutures } = useFuturesEdge({ sport: edgeSport, limit: 100 });
  const { add: addToWatchlist, remove: removeFromWatchlist, isWatched, capReached } = useWatchlist();
  const pages = [
    { id: "needles", label: "Needle Alerts", badge: alerts.length > 0 ? alerts.length : undefined },
    { id: "futures", label: "Edge Board", badge: !futuresTieredOut && futures.length > 0 ? futures.length : undefined },
    { id: "dossiers", label: "Active Briefs", badge: 4 },
    { id: "standings", label: "NBA Standings" },
    { id: "movement", label: "Line Movement", badge: 6 },
    { id: "sgp", label: "SGP Engine" },
    { id: "formulas", label: "Formula Library" },
    { id: "audit", label: "Audit Room" },
    { id: "edge", label: "Edge Calculator" },
    { id: "pricing", label: "Pricing" },
  ];

  return (
    <div style={{ fontFamily: C.mono, background: C.ink, minHeight: "100vh" }}>
      {/* Classification bar */}
      <div style={{ background: C.stamp, textAlign: "center", padding: "5px 16px", fontFamily: C.mono, fontSize: 9, letterSpacing: 3.5, fontWeight: 700, textTransform: "uppercase", color: "#fff", position: "sticky", top: 0, zIndex: 200 }}>
        Classification: EAA Verified · Betstamp Audited · MLB & NBA Season Active · {TODAY}
      </div>

      {/* Masthead */}
      <div style={{ background: C.ink, padding: "0 40px", borderBottom: `1px solid ${C.inkBorder}`, position: "sticky", top: 26, zIndex: 190 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "12px 0", gap: 16 }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,.22)", lineHeight: 1.9, textTransform: "uppercase" }}>
            EAA: <span style={{ color: C.green }}>Active</span> · MLB Season: <span style={{ color: C.amber }}>Day 2</span>
            <br />
            NBA: <span style={{ color: C.blue }}>Playoffs in 17 days</span> · Betstamp: <span style={{ color: C.green }}>Live</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: C.display, fontSize: 36, letterSpacing: 5, color: "#fff", lineHeight: 1 }}>GUERILLAGENICS</div>
            <div style={{ fontFamily: C.serif, fontSize: 13, letterSpacing: 0.3, color: "rgba(255,255,255,.72)", marginTop: 7, fontStyle: "italic" }}>Make money on sports, without the brain damage.</div>
            <div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: 3, color: C.green, textTransform: "uppercase", marginTop: 5 }}>The Futures edge, already found.</div>
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 1.5, color: "rgba(255,255,255,.22)", textAlign: "right", lineHeight: 1.9, textTransform: "uppercase" }}>
            Record: <span style={{ color: C.green }}>31W – 18L</span>
            <br />
            Units: <span style={{ color: C.green }}>+18.4u</span>
            <br />
            Win Rate: <span style={{ color: C.green }}>63.3%</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: C.ink, borderBottom: `2px solid ${C.inkBorder}`, position: "sticky", top: "calc(26px + 66px)", zIndex: 180 }}>
        <div style={{ display: "flex", alignItems: "stretch", padding: "0 40px", overflowX: "auto", scrollbarWidth: "none" }}>
          {pages.map((p) => (
            <button key={p.id} onClick={() => { setPage(p.id); window.scrollTo(0, 0); }} style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: page === p.id ? "#fff" : "rgba(255,255,255,.3)", padding: "13px 16px", background: "none", cursor: "pointer", borderBottom: page === p.id ? `2px solid ${C.green}` : "2px solid transparent", marginBottom: -2, whiteSpace: "nowrap", transition: "color .18s", flexShrink: 0 }}>
              {p.label}
              {p.badge && <span style={{ fontFamily: C.mono, fontSize: 7, background: C.green, color: C.ink, padding: "1px 5px", borderRadius: 1, marginLeft: 6, fontWeight: 700 }}>{p.badge}</span>}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            {[
              ["MLB", C.amber],
              ["NBA", C.blue],
            ].map(([label, c]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: C.mono, fontSize: 8, letterSpacing: 1.5, color: c }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, animation: "pulse 2s infinite" }} />
                {label} ACTIVE
              </div>
            ))}
            {/* Auth button */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 10, borderLeft: `1px solid ${C.inkBorder}` }}>
              {!user ? (
                <button
                  onClick={() => setShowAuth(true)}
                  style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", padding: "6px 14px", background: "none", border: `1px solid ${C.inkBorder}`, color: "rgba(255,255,255,.5)", cursor: "pointer", transition: "color .15s, border-color .15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.inkBorder; e.currentTarget.style.color = "rgba(255,255,255,.5)"; }}
                >
                  Sign In
                </button>
              ) : (
                <>
                  <span style={{
                    fontFamily: C.mono, fontSize: 8, letterSpacing: 2, textTransform: "uppercase",
                    padding: "3px 8px", borderRadius: 1,
                    border: `1px solid ${tier === "command" ? C.green : tier === "operative" ? C.blue : C.amber}40`,
                    color: tier === "command" ? C.green : tier === "operative" ? C.blue : C.amber,
                    background: `${tier === "command" ? C.green : tier === "operative" ? C.blue : C.amber}10`,
                  }}>
                    {tier?.toUpperCase()}
                  </span>
                  <button
                    onClick={signOut}
                    style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", padding: "6px 12px", background: "none", border: `1px solid ${C.inkBorder}`, color: "rgba(255,255,255,.4)", cursor: "pointer" }}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pages */}
      <div style={{ minHeight: "calc(100vh - 136px)" }}>
        {page === "needles" && <PageNeedles alerts={alerts} loading={alertsLoading} error={alertsError} refetch={refetchAlerts} user={user} isOperative={isOperative} />}
        {page === "futures" && <PageFutures futures={futures} loading={futuresLoading} error={futuresError} tieredOut={futuresTieredOut} refetch={refetchFutures} isWatched={isWatched} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} capReached={capReached} edgeSport={edgeSport} setEdgeSport={setEdgeSport} />}
        {page === "dossiers" && <PageDossiers bankroll={bankroll} setBankroll={setBankroll} />}
        {page === "standings" && <PageStandings />}
        {page === "movement" && <PageMovement />}
        {page === "sgp" && <PageSGP />}
        {page === "formulas" && <PageFormulas />}
        {page === "audit" && <PageAudit />}
        {page === "edge" && <PageEdgeCalc />}
        {page === "pricing" && <PagePricing />}
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:${C.ruleLt}}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:${C.green};cursor:pointer}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:${C.paper2}}
        ::-webkit-scrollbar-thumb{background:${C.rule};border-radius:2px}
        *{box-sizing:border-box}
        @media(max-width:860px){
          .gg-grid-dos{grid-template-columns:1fr!important}
          .gg-sidebar{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        }
      `}</style>
    </div>
  );
}
