-- GuerillaGenics v2 — Supabase Schema
-- Run via: supabase db push  OR  paste into Supabase SQL editor

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE sport_type AS ENUM ('nba', 'mlb', 'nfl');
CREATE TYPE needle_tier AS ENUM ('NEEDLE', 'LOCK', 'LEAN', 'FAIR', 'FADE');
CREATE TYPE award_type AS ENUM ('mvp', 'cy_young', 'dpoy', 'roty', 'hank_aaron', 'silver_slugger');
CREATE TYPE edge_direction AS ENUM ('VALUE', 'FAIR', 'FADE');

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE teams (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport         sport_type NOT NULL,
    team_id       TEXT NOT NULL,          -- ESPN/stats.nba.com internal ID
    abbreviation  TEXT NOT NULL,          -- BOS, LAL, NYY, KC, etc.
    full_name     TEXT NOT NULL,
    city          TEXT NOT NULL,
    division      TEXT,
    conference    TEXT,
    espn_id       TEXT,
    stats_api_id  TEXT,
    lat           NUMERIC(9,6),
    lon           NUMERIC(9,6),
    venue_name    TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sport, abbreviation)
);

CREATE INDEX idx_teams_sport ON teams (sport);
CREATE INDEX idx_teams_abbreviation ON teams (abbreviation);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAM ELO RATINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE team_elo (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sport         sport_type NOT NULL,
    season        TEXT NOT NULL,           -- e.g. "2024-25"
    elo_rating    NUMERIC(8,2) NOT NULL DEFAULT 1500.0,
    games_played  INT NOT NULL DEFAULT 0,
    as_of_date    DATE NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_elo_team_season ON team_elo (team_id, season, as_of_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPOSITE FUTURES SCORES (one row per team per calculation run)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE futures_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sport           sport_type NOT NULL,
    season          TEXT NOT NULL,
    cfs_score       NUMERIC(6,2) NOT NULL,    -- 0–100 composite
    gg_elo          NUMERIC(8,2),
    nir_score       NUMERIC(6,2),
    ssc_score       NUMERIC(6,2),
    iis_score       NUMERIC(6,2),
    mdi_score       NUMERIC(6,2),
    pds_score       NUMERIC(6,2),
    eaf_score       NUMERIC(6,2),
    mid_edge        NUMERIC(6,4),             -- raw MID edge value
    championship_prob NUMERIC(6,4),           -- 0.0–1.0
    calculated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_futures_sport_season ON futures_scores (sport, season, cfs_score DESC);
CREATE INDEX idx_futures_team ON futures_scores (team_id, calculated_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- ODDS HISTORY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE odds_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sport           sport_type NOT NULL,
    season          TEXT NOT NULL,
    market          TEXT NOT NULL,          -- "championship", "division_winner", etc.
    bookmaker       TEXT NOT NULL,          -- "fanduel", "draftkings", "betmgm", etc.
    american_odds   INT NOT NULL,
    decimal_odds    NUMERIC(8,4),
    implied_prob    NUMERIC(6,4),
    vig_removed_prob NUMERIC(6,4),
    recorded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_odds_team_market ON odds_history (team_id, market, recorded_at DESC);
CREATE INDEX idx_odds_sport_season ON odds_history (sport, season, recorded_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- NEEDLE ALERTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE needle_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sport           sport_type NOT NULL,
    season          TEXT NOT NULL,
    tier            needle_tier NOT NULL,
    edge_pct        NUMERIC(6,4) NOT NULL,       -- our_prob - market_prob
    our_prob        NUMERIC(6,4) NOT NULL,
    market_prob     NUMERIC(6,4) NOT NULL,
    best_odds       INT NOT NULL,                -- best available American odds
    best_bookmaker  TEXT NOT NULL,
    signals_triggered TEXT[] NOT NULL DEFAULT '{}',  -- which of 6 signals fired
    kelly_fraction  NUMERIC(6,4),
    quarter_kelly   NUMERIC(6,4),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    deactivated_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_needle_active ON needle_alerts (sport, is_active, tier);
CREATE INDEX idx_needle_team ON needle_alerts (team_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAYERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE players (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport           sport_type NOT NULL,
    player_id       TEXT NOT NULL,          -- ESPN/stats API player ID
    full_name       TEXT NOT NULL,
    first_name      TEXT,
    last_name       TEXT,
    position        TEXT,
    team_id         UUID REFERENCES teams(id),
    jersey_number   TEXT,
    espn_id         TEXT,
    stats_api_id    TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sport, player_id)
);

CREATE INDEX idx_players_sport ON players (sport);
CREATE INDEX idx_players_team ON players (team_id);
CREATE INDEX idx_players_name ON players USING gin (full_name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAYER FUTURES (award race probabilities)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE player_futures (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    sport           sport_type NOT NULL,
    season          TEXT NOT NULL,
    award           award_type NOT NULL,
    gg_prob         NUMERIC(6,4) NOT NULL,    -- our model probability
    market_prob     NUMERIC(6,4),             -- vig-removed market implied
    american_odds   INT,
    best_bookmaker  TEXT,
    edge_direction  edge_direction,
    edge_pct        NUMERIC(6,4),
    rank_position   INT,
    calculated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_player_futures_sport_award ON player_futures (sport, season, award, gg_prob DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- INJURY REPORTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE injury_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sport           sport_type NOT NULL,
    status          TEXT NOT NULL,          -- "OUT", "DOUBTFUL", "QUESTIONABLE", "PROBABLE"
    description     TEXT,
    body_part       TEXT,
    games_missed    INT DEFAULT 0,
    win_shares_lost NUMERIC(6,4),           -- estimated win impact
    reported_at     TIMESTAMPTZ NOT NULL,
    expected_return DATE,
    is_current      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_injuries_team_current ON injury_reports (team_id, is_current);
CREATE INDEX idx_injuries_player ON injury_reports (player_id, reported_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- MODEL SNAPSHOTS (audit trail for formula outputs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE model_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport           sport_type NOT NULL,
    season          TEXT NOT NULL,
    snapshot_type   TEXT NOT NULL,          -- "weekly", "pre_playoffs", "finals"
    formula_version TEXT NOT NULL DEFAULT '2.0.0',
    payload         JSONB NOT NULL,         -- full snapshot of all scores
    top_needle      TEXT,                   -- team abbreviation of top needle pick
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_snapshots_sport_season ON model_snapshots (sport, season, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- WATCHLIST (user-pinned futures — optional server sync)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE watchlist (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         TEXT NOT NULL,          -- Supabase auth UID or anonymous device ID
    team_id         UUID REFERENCES teams(id),
    player_id       UUID REFERENCES players(id),
    sport           sport_type NOT NULL,
    pinned_at       TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT watchlist_target_check CHECK (
        (team_id IS NOT NULL AND player_id IS NULL) OR
        (team_id IS NULL AND player_id IS NOT NULL)
    )
);

CREATE INDEX idx_watchlist_user ON watchlist (user_id, pinned_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- BRACKET SIMULATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE bracket_simulations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport               sport_type NOT NULL,
    season              TEXT NOT NULL,
    simulation_count    INT NOT NULL DEFAULT 100000,
    results             JSONB NOT NULL,     -- {team_id: {round: prob, ...}, ...}
    champion_probs      JSONB NOT NULL,     -- {team_id: probability, ...}
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bracket_sport_season ON bracket_simulations (sport, season, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own watchlist
CREATE POLICY "watchlist_owner" ON watchlist
    USING (user_id = auth.uid()::text OR user_id = current_setting('app.device_id', true));

-- All other tables are read-only for authenticated users
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_read" ON teams FOR SELECT USING (true);

ALTER TABLE futures_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "futures_read" ON futures_scores FOR SELECT USING (true);

ALTER TABLE odds_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "odds_read" ON odds_history FOR SELECT USING (true);

ALTER TABLE needle_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "needle_read" ON needle_alerts FOR SELECT USING (true);

ALTER TABLE player_futures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_futures_read" ON player_futures FOR SELECT USING (true);

ALTER TABLE bracket_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bracket_read" ON bracket_simulations FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER needle_alerts_updated_at BEFORE UPDATE ON needle_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
