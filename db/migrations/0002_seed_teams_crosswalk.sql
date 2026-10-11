-- ============================================================
-- GuerillaGenics v2 — Neon migration 0002
-- Seed 32 NFL teams + nflfastr/the_odds_api crosswalk.
--
-- Relocation handling (OAK->LV, SD->LAC, STL->LAR): external_ids has
-- unique(entity_type, entity_id, source) — one team gets exactly one
-- nflfastr source_id, so only the CURRENT abbreviation is stored here.
-- The historical codes (OAK, SD, STL) are not in this table; they
-- become a season-aware alias dict in the Step 4 ingest module, since
-- 2025 play-by-play (the only season this slice touches) already uses
-- the current codes. teams.external_id (ESPN ID) is left null — not
-- requested in Step 2, not fabricated.
-- ============================================================

insert into public.teams (sport_id, abbreviation, full_name, city, division, conference) values
  (1, 'BUF', 'Buffalo Bills',          'Buffalo',        'AFC East',  'AFC'),
  (1, 'MIA', 'Miami Dolphins',         'Miami',          'AFC East',  'AFC'),
  (1, 'NE',  'New England Patriots',   'New England',    'AFC East',  'AFC'),
  (1, 'NYJ', 'New York Jets',          'New York',       'AFC East',  'AFC'),
  (1, 'BAL', 'Baltimore Ravens',       'Baltimore',      'AFC North', 'AFC'),
  (1, 'CIN', 'Cincinnati Bengals',     'Cincinnati',     'AFC North', 'AFC'),
  (1, 'CLE', 'Cleveland Browns',       'Cleveland',      'AFC North', 'AFC'),
  (1, 'PIT', 'Pittsburgh Steelers',    'Pittsburgh',     'AFC North', 'AFC'),
  (1, 'HOU', 'Houston Texans',         'Houston',        'AFC South', 'AFC'),
  (1, 'IND', 'Indianapolis Colts',     'Indianapolis',   'AFC South', 'AFC'),
  (1, 'JAX', 'Jacksonville Jaguars',   'Jacksonville',   'AFC South', 'AFC'),
  (1, 'TEN', 'Tennessee Titans',       'Tennessee',      'AFC South', 'AFC'),
  (1, 'DEN', 'Denver Broncos',         'Denver',         'AFC West',  'AFC'),
  (1, 'KC',  'Kansas City Chiefs',     'Kansas City',    'AFC West',  'AFC'),
  (1, 'LV',  'Las Vegas Raiders',      'Las Vegas',      'AFC West',  'AFC'),
  (1, 'LAC', 'Los Angeles Chargers',   'Los Angeles',    'AFC West',  'AFC'),
  (1, 'DAL', 'Dallas Cowboys',         'Dallas',         'NFC East',  'NFC'),
  (1, 'NYG', 'New York Giants',        'New York',       'NFC East',  'NFC'),
  (1, 'PHI', 'Philadelphia Eagles',    'Philadelphia',   'NFC East',  'NFC'),
  (1, 'WAS', 'Washington Commanders',  'Washington',     'NFC East',  'NFC'),
  (1, 'CHI', 'Chicago Bears',          'Chicago',        'NFC North', 'NFC'),
  (1, 'DET', 'Detroit Lions',          'Detroit',        'NFC North', 'NFC'),
  (1, 'GB',  'Green Bay Packers',      'Green Bay',      'NFC North', 'NFC'),
  (1, 'MIN', 'Minnesota Vikings',      'Minnesota',      'NFC North', 'NFC'),
  (1, 'ATL', 'Atlanta Falcons',        'Atlanta',        'NFC South', 'NFC'),
  (1, 'CAR', 'Carolina Panthers',      'Carolina',       'NFC South', 'NFC'),
  (1, 'NO',  'New Orleans Saints',     'New Orleans',    'NFC South', 'NFC'),
  (1, 'TB',  'Tampa Bay Buccaneers',   'Tampa Bay',      'NFC South', 'NFC'),
  (1, 'ARI', 'Arizona Cardinals',      'Arizona',        'NFC West',  'NFC'),
  (1, 'LAR', 'Los Angeles Rams',       'Los Angeles',    'NFC West',  'NFC'),
  (1, 'SF',  'San Francisco 49ers',    'San Francisco',  'NFC West',  'NFC'),
  (1, 'SEA', 'Seattle Seahawks',       'Seattle',        'NFC West',  'NFC');

-- nflfastr crosswalk: source_id = current abbreviation (1:1 with teams.abbreviation)
insert into public.external_ids (entity_type, entity_id, source, source_id)
select 'team', t.id, 'nflfastr', t.abbreviation
from public.teams t
where t.sport_id = 1;

-- the_odds_api crosswalk: source_id = full display name
insert into public.external_ids (entity_type, entity_id, source, source_id)
select 'team', t.id, 'the_odds_api', v.display_name
from public.teams t
join (values
  ('BUF','Buffalo Bills'), ('MIA','Miami Dolphins'), ('NE','New England Patriots'), ('NYJ','New York Jets'),
  ('BAL','Baltimore Ravens'), ('CIN','Cincinnati Bengals'), ('CLE','Cleveland Browns'), ('PIT','Pittsburgh Steelers'),
  ('HOU','Houston Texans'), ('IND','Indianapolis Colts'), ('JAX','Jacksonville Jaguars'), ('TEN','Tennessee Titans'),
  ('DEN','Denver Broncos'), ('KC','Kansas City Chiefs'), ('LV','Las Vegas Raiders'), ('LAC','Los Angeles Chargers'),
  ('DAL','Dallas Cowboys'), ('NYG','New York Giants'), ('PHI','Philadelphia Eagles'), ('WAS','Washington Commanders'),
  ('CHI','Chicago Bears'), ('DET','Detroit Lions'), ('GB','Green Bay Packers'), ('MIN','Minnesota Vikings'),
  ('ATL','Atlanta Falcons'), ('CAR','Carolina Panthers'), ('NO','New Orleans Saints'), ('TB','Tampa Bay Buccaneers'),
  ('ARI','Arizona Cardinals'), ('LAR','Los Angeles Rams'), ('SF','San Francisco 49ers'), ('SEA','Seattle Seahawks')
) as v(abbreviation, display_name) on v.abbreviation = t.abbreviation
where t.sport_id = 1;
