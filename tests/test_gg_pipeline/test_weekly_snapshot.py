import pandas as pd
import pytest

from gg.pipeline import weekly_snapshot as ws


def _games():
    return pd.DataFrame({
        "season": [2026] * 6, "game_type": ["REG"] * 6, "week": [1, 1, 2, 2, 3, 3],
        "home_score": [20, 17, 24, None, 10, None], "away_score": [10, 14, 21, 7, 3, None]})


def test_completed_weeks_requires_every_game_final():
    assert ws.completed_weeks(_games(), 2026) == [1]
    assert ws.latest_completed_week(_games(), 2026) == 1


def test_latest_completed_week_needs_an_unbroken_run():
    g = _games()
    g["home_score"], g["away_score"] = 1.0, 2.0  # every game final, weeks 1-3
    assert ws.latest_completed_week(g, 2026) == 3
    g.loc[g.week == 2, "home_score"] = None  # a hole in week 2 stops the run at week 1
    assert ws.latest_completed_week(g, 2026) == 1
    assert ws.latest_completed_week(g.iloc[0:0], 2026) is None


def test_to_date_team_sums_counting_stats_only():
    t = pd.DataFrame({"team": ["A", "A", "B"], "week": [1, 2, 1], "season": 2026,
                      "passing_yards": [200, 300, 150], "passing_cpoe": [1.0, 2.0, 3.0]})
    out = ws.to_date_team(t).set_index("team")
    assert out.loc["A", "passing_yards"] == 500 and out.loc["A", "games"] == 2
    assert "passing_cpoe" not in out.columns  # ratios must not be summed


def test_active_rows_drops_all_zero_players():
    p = pd.DataFrame({"week": 1, "season": 2026, "passing_yards": [0, 120], "carries": [0, 0]})
    assert len(ws.active_rows(p)) == 1


def _tiny_data():
    pbp = pd.DataFrame({"game_id": ["g1"] * 4, "week": 1, "posteam": ["A", "A", "B", "B"],
                        "defteam": ["B", "B", "A", "A"], "epa": [0.2, 0.1, -0.1, 0.0],
                        "play_type": ["pass", "run", "pass", "run"], "season_type": "REG"})
    team = pd.DataFrame({"team": ["A", "B"], "week": 1, "season": 2026, "season_type": "REG", "passing_yards": [200, 100]})
    player = pd.DataFrame({"player_id": ["p1"], "player_display_name": ["P One"], "position": ["QB"],
                           "position_group": ["QB"], "team": ["A"], "week": 1, "season": 2026,
                           "season_type": "REG", "passing_yards": [200], "headshot_url": ["x"]})
    games = pd.DataFrame({"game_id": ["g1"], "season": 2026, "game_type": "REG", "week": 1, "gameday": "2026-09-10",
                          "home_team": "A", "away_team": "B", "home_score": 20, "away_score": 10, "spread_line": 3.0})
    return dict(games=games, team=team, player=player, prior_pbp=pbp, pbp=pbp)


def test_freeze_is_write_once_and_verifiable(tmp_path):
    root = str(tmp_path)
    out = ws.freeze_week(2026, 1, root=root, data=_tiny_data())
    assert ws.verify_week(2026, 1, root=root) == []
    with pytest.raises(FileExistsError):
        ws.freeze_week(2026, 1, root=root, data=_tiny_data())
    with open(f"{out}/team_week.csv", "a") as fh:
        fh.write("tamper\n")
    assert any("team_week.csv" in p for p in ws.verify_week(2026, 1, root=root))
    ws.freeze_week(2026, 1, root=root, data=_tiny_data(), force=True)
    assert ws.verify_week(2026, 1, root=root) == []
