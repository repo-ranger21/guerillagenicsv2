export type Sport = 'basketball_nba' | 'baseball_mlb' | 'americanfootball_nfl';

export interface EloRecord {
  teamId: string;
  elo: number;
  lastUpdated: string;
}

export interface TeamStats {
  id: string;
  sport: Sport;
  name: string;
  abbreviation: string;
  elo: number;
  nir: number; // Net Impact Rating
  mdi: number; // Momentum Decay Index
  pds: number; // Playoff DNA Score
  iis: number; // Injury Impact Score
  ssc: number; // Schedule Strength Composite
  cfs: number; // Composite Futures Score
  tier: string;
  updatedAt: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  sport: Sport;
  teamId: string;
  bpm?: number;
  fwar?: number;
  epa_contribution?: number;
  snap_share?: number;
  isInjured: boolean;
  role: 'starter' | 'rotation' | 'bench';
}

export interface MarketOdds {
  teamId: string;
  americanOdds: number;
  impliedProb: number;
  modelProb: number;
  edge: number;
}

export interface EAAReport {
  team: string;
  sport: string;
  market: string;
  scores: {
    composite_futures_score: number;
    tier_label: string;
    gg_elo: number;
    net_impact_rating: number;
    momentum_decay_index: number;
    playoff_dna_score: number;
    injury_impact_score: number;
    schedule_strength_composite: number;
  };
  probabilities: {
    championship: number;
    conference: number;
    division: number;
    model_implied_american_odds: string;
    market_consensus_odds: string;
    market_implied_probability: number;
    edge: number;
    quarter_kelly_fraction: number;
    recommended_unit_size: string;
  };
  needle_status: {
    is_needle: boolean;
    signals_triggered: string[];
    signal_count: number;
    market_blind_days: number;
  };
  explainable: string[];
  auditable: {
    elo_inputs: any;
    nir_inputs: any;
    mdi_inputs: any;
    model_version: string;
    last_computed: string;
  };
  actionable: {
    confidence_tier: string;
    recommendation: string;
    target_exit_odds: string;
    max_odds_to_accept: string;
    risk_note: string;
  };
}
