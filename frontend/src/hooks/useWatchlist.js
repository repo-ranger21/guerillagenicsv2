import { useWatchlistStore } from "../store/watchlistSlice.js";

export function useWatchlist() {
  const { items, addItem, removeItem, isPinned, clearAll } = useWatchlistStore();

  const toggleTeam = (team, sport) => {
    if (isPinned(team.team_id || team.abbreviation, sport, "team")) {
      removeItem(team.team_id || team.abbreviation, sport, "team");
    } else {
      addItem({
        id: team.team_id || team.abbreviation,
        sport,
        type: "team",
        abbreviation: team.abbreviation,
        full_name: team.full_name,
        cfs_score: team.cfs_score,
        tier: team.tier,
      });
    }
  };

  const togglePlayer = (player, sport) => {
    if (isPinned(player.player_id, sport, "player")) {
      removeItem(player.player_id, sport, "player");
    } else {
      addItem({
        id: player.player_id,
        sport,
        type: "player",
        player_name: player.player_name,
        team: player.team,
        award: player.award,
      });
    }
  };

  return { items, toggleTeam, togglePlayer, isPinned, clearAll };
}
