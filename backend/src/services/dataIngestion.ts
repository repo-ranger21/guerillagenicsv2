import axios from 'axios';
import * as cheerio from 'cheerio';
import cron from 'node-cron';
import type { Sport, TeamStats, PlayerStats } from '../types/guerilla.ts';
import { calculateNewElo, calculateNIR, calculateSSC, calculateIIS, calculateMDI, calculatePDS, calculateCFS, runMonteCarloSim, detectInefficiency } from '../lib/guerillaFormulas.ts';

const NBA_STATS_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.nba.com/',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://www.nba.com'
};

const WAIT_TIME = 3000; // 3 seconds rate limit

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// In-memory store for now (Ideally Supabase/DB)
let teamsDB: Record<string, TeamStats> = {};
let playersDB: Record<string, PlayerStats[]> = {};
let oddsDB: any[] = [];

export async function fetchNBAStandings() {
  try {
    const url = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';
    const response = await axios.get(url);
    const data = response.data;
    
    // Process standings and update ELO if games were played
    // This is where the game-by-game update would happen in a real loop
    return data;
  } catch (error) {
    console.error('Error fetching NBA standings:', error);
  }
}

export async function fetchNBAAdvancedStats() {
  try {
    const url = 'https://stats.nba.com/stats/leaguedashteamstats?MeasureType=Advanced&Season=2025-26&SeasonType=Regular+Season';
    // NBA stats.nba.com strictly requires specific headers and often blocks cloud IPs
    // In this environment, we may have to use cached/fallback data if the direct fetch is blocked
    const response = await axios.get(url, { headers: NBA_STATS_HEADERS });
    return response.data;
  } catch (error) {
    console.warn('NBA stats.nba.com fetch blocked or failed. Using fallback data pattern.');
    return null;
  }
}

export async function fetchOdds(sport: Sport) {
  // Use The Odds API - 500 req/month free tier
  const API_KEY = process.env.THE_ODDS_API_KEY;
  if (!API_KEY) {
    console.warn('THE_ODDS_API_KEY not found in env. Market Edge won\'t be calculated.');
    return [];
  }
  
  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us&markets=outrights&oddsFormat=american`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${sport} odds:`, error);
    return [];
  }
}

// Full Ingestion Loop
export async function runIngestion(sport: Sport) {
  console.log(`[INGESTION] Starting full run for ${sport}...`);
  
  // 1. Fetch Basic Data
  const standings = await fetchNBAStandings();
  const advancedStats = await fetchNBAAdvancedStats();
  const odds = await fetchOdds(sport);
  
  // 2. Compute Formulas
  // For each team in sport:
  // - updateElo()
  // - calculateNIR()
  // - calculatePDS()
  // - calculateIIS()
  // - calculateSSC()
  // - calculateMDI()
  // - runMonteCarloSim()
  // - calculateCFS()
  // - detectInefficiency()
  
  // 3. Update DB
  console.log(`[INGESTION] Data refresh complete for ${sport}.`);
}

// Setup Cron Jobs
export function setupCrons() {
  // Every 2 hours: standings and injuries
  cron.schedule('0 */2 * * *', () => {
    runIngestion('basketball_nba');
  });
  
  // Every 15 min: odds feed
  cron.schedule('*/15 * * * *', () => {
    fetchOdds('basketball_nba');
  });
}

export function getTeams(sport: Sport) {
  return Object.values(teamsDB).filter(t => t.sport === sport);
}

export function getTeamReport(sport: Sport, teamId: string) {
  const team = teamsDB[teamId];
  if (!team) return null;
  
  // Construct EAA JSON based on computed metrics
  return {
    team: team.name,
    sport: team.sport,
    // ... complete EAA report structure
  };
}
