from datetime import date, datetime, timezone

from gg.pipeline.load import GameForDate, TeamFeatures
from gg.pipeline.model.nfl import HFA, home_field_advantage
from gg.pipeline.snapshot import build_published_snapshot
from gg.season import NEUTRAL_SITE_GAMES, is_neutral_site


def test_known_neutral_games():
    assert is_neutral_site(2026, "ATL", "CIN")       # Madrid
    assert is_neutral_site(2026, "NO", "PIT")        # Paris
    assert not is_neutral_site(2026, "CIN", "ATL")   # direction matters: (home, away)
    assert not is_neutral_site(2026, "BAL", "JAX")
    assert not is_neutral_site(2030, "ATL", "CIN")   # unconfigured season


def test_no_team_listed_as_home_for_two_neutral_games_with_same_opponent():
    games = NEUTRAL_SITE_GAMES[2026]
    assert len(games) == 9 and all(h != a for h, a in games)


def test_home_field_advantage_zero_at_neutral_sites():
    assert home_field_advantage(False) == HFA
    assert home_field_advantage(True) == 0.0


def _game():
    return GameForDate(game_id=1, sport_id=1, season=2026, week=9, home_team_id=1, home_abbreviation="ATL",
                       home_full_name="Atlanta Falcons", away_team_id=2, away_abbreviation="CIN",
                       away_full_name="Cincinnati Bengals", game_time=datetime(2026, 11, 8, 14, 30, tzinfo=timezone.utc))


def _feat(abbr):
    return TeamFeatures(team_id=1, abbreviation=abbr, rating_pts_per_game=1.0,
                        as_of=datetime(2026, 11, 3, tzinfo=timezone.utc), epa_play_off=None, epa_play_def=None,
                        ingest_run_id=None)


def _snap(hfa, bet_home):
    return build_published_snapshot(
        game=_game(), game_date=date(2026, 11, 8), logged_at=datetime(2026, 11, 4, tzinfo=timezone.utc),
        bet_team="ATL" if bet_home else "CIN", opp_team="CIN" if bet_home else "ATL",
        bet_rating=3.0, opp_rating=1.0, bet_team_is_home=bet_home, spread=-3.0, odds=-110, book="x",
        model_prob=0.55, push_prob=0.0, loss_prob=0.45, evi_value=5.0, kelly_full_value=2.0,
        kelly_fractional_value=1.0, home_features=_feat("ATL"), away_features=_feat("CIN"), hfa=hfa)


def test_snapshot_edge_excludes_hfa_at_neutral_site():
    s = _snap(0.0, True)
    assert s.components["hfa"] == 0.0 and s.components["edge_pts"] == 2.0
    away = _snap(0.0, False)
    assert away.components["hfa"] == 0.0  # not -0.0 drifting into the edge
    normal = _snap(HFA, True)
    assert normal.components["edge_pts"] == 2.0 + HFA
