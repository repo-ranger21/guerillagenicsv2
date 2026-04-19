export interface ScoreboardEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    clock: number;
    displayClock: string;
    period: number;
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
      description: string;
      detail: string;
      shortDetail: string;
    }
  };
  competitions: {
    id: string;
    leaders?: {
      name: string;
      displayName: string;
      leaders: {
        displayValue: string;
        value: number;
        athlete: {
          fullName: string;
          displayName: string;
          shortName: string;
          headshot: string;
        }
      }[]
    }[];
    competitors: {
      id: string;
      homeAway: 'home' | 'away';
      winner?: boolean;
      team: {
        id: string;
        location: string;
        name: string;
        abbreviation: string;
        displayName: string;
        logo: string;
        color: string;
      };
      score: string;
      linescores?: { value: number }[];
      records?: { summary: string }[];
    }[];
  }[];
}

export interface ScoreboardData {
  events: ScoreboardEvent[];
}

export interface RosterAthlete {
  id: string;
  fullName: string;
  shortName: string;
  position: { abbreviation: string };
  jersey: string;
}

export interface RosterData {
  team: { id: string; displayName: string };
  athletes: RosterAthlete[];
}

const NBA_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const NBA_TEAM_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams';

export const fetchNBAScoreboard = async (date?: string): Promise<ScoreboardData> => {
  try {
    let url = NBA_SCOREBOARD_URL;
    if (date) {
      url += `?dates=${date}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch NBA scoreboard');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    return { events: [] };
  }
};

export const fetchTeamRoster = async (teamId: string): Promise<RosterData> => {
  try {
    const response = await fetch(`${NBA_TEAM_URL}/${teamId}/roster`);
    if (!response.ok) throw new Error(`Failed to fetch roster for team ${teamId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching roster:', error);
    return { team: { id: teamId, displayName: '' }, athletes: [] };
  }
};
