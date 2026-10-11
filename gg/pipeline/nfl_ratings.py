"""NFL team ratings from nflverse play-by-play.

Shared by scripts/week1_math.py (standalone, prints only) and
gg.pipeline.ingest_nfl_team_features (writes nfl_team_features rows) —
one implementation, so a fix here doesn't need to be made twice.

Net-EPA rating (points above a league-average team, per game) computed
from a season of play-by-play, then blended toward the league mean using
CARRY/K from gg.pipeline.model.nfl.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import pandas as pd
import requests

PBP_URL_TEMPLATE = (
    "https://github.com/nflverse/nflverse-data/releases/download/pbp/"
    "play_by_play_{season}.parquet"
)

# Standard nflfastR EPA-analysis filter: real snaps only — excludes no-plays,
# penalties without a play, kneels/spikes, and special teams, all of which
# either have no EPA value or would distort a spread-relevant rating.
PLAY_TYPES = ("pass", "run")


# ---------- I/O shell ----------

def fetch_play_by_play(season: int) -> pd.DataFrame:
    """Downloads one season of nflverse play-by-play. The only network call
    in this module — kept isolated so everything below it is pure."""
    url = PBP_URL_TEMPLATE.format(season=season)
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    return pd.read_parquet(io.BytesIO(resp.content))


# ---------- pure math ----------

def filter_regular_season(pbp: pd.DataFrame) -> pd.DataFrame:
    """Pure: drops postseason plays. Playoff samples are non-random — only
    good teams accumulate them — so mixing them in would bias ratings
    toward teams with deep playoff runs rather than reflecting a full,
    comparable season for every team."""
    return pbp[pbp["season_type"] == "REG"]


@dataclass
class TeamRating:
    team: str
    games_played: int
    epa_play_off: float
    epa_play_def: float
    plays_per_game: float
    net_epa_per_play: float
    raw_rating_pts_per_game: float
    blended_rating_pts_per_game: float


def compute_team_epa_stats(pbp: pd.DataFrame, team: str) -> dict:
    """Pure: takes an in-memory play-by-play frame, returns numbers. No
    network, no disk, no database — the frame is already in memory by the
    time this runs."""
    snaps = pbp[pbp["epa"].notna() & pbp["play_type"].isin(PLAY_TYPES)]

    off = snaps[snaps["posteam"] == team]
    dfn = snaps[snaps["defteam"] == team]

    games_played = pbp.loc[
        (pbp["posteam"] == team) | (pbp["defteam"] == team), "game_id"
    ].nunique()

    epa_play_off = float(off["epa"].mean()) if len(off) else 0.0
    epa_play_def = float(dfn["epa"].mean()) if len(dfn) else 0.0
    plays_per_game = (len(off) / games_played) if games_played else 0.0

    # Net rating: own offensive EPA/play minus EPA/play allowed on defense.
    # Higher is better on both terms, so this is a direct subtraction, not
    # an average — a team can be net-positive via offense, defense, or both.
    net_epa_per_play = epa_play_off - epa_play_def

    # Convert an efficiency rate (points of value per play) into a game-level
    # impact (points above average per game) by scaling by the team's own
    # play volume — this is what gg_sim.py's Pick.bet_team_rating expects.
    raw_rating_pts_per_game = net_epa_per_play * plays_per_game

    return {
        "team": team,
        "games_played": games_played,
        "epa_play_off": epa_play_off,
        "epa_play_def": epa_play_def,
        "plays_per_game": plays_per_game,
        "net_epa_per_play": net_epa_per_play,
        "raw_rating_pts_per_game": raw_rating_pts_per_game,
    }


def blend_rating(
    raw_prior_value: float,
    league_mean_prior: float,
    current_value: float,
    games_played: int,
    carry: float,
    k: float,
) -> float:
    """Pure: two-stage blend.

    1. Between-season regression toward the mean: the prior-season raw
       rating carries forward at `carry`, and reverts the rest of the way
       to the league mean. This is the ONLY term that matters when
       games_played=0 — there is no current season to blend in yet.

    2. Within-season shrinkage: as games_played grows, weight shifts from
       the carried-forward prior toward the current-season observed value,
       at rate games_played / (games_played + k).

    At games_played=0, weight = 0/(0+k) = 0 for every k > 0 — current_value
    and k are both fully ignored, and the function reduces to term 1 alone,
    regardless of what k is. That is the algebraic proof, not just an
    assertion, that k has no effect at gp=0 (Step 4's requirement) — see
    the confirmation check in scripts/week1_math.py's __main__, which
    exercises this with three different k values and asserts identical
    output.
    """
    carried_forward = carry * raw_prior_value + (1 - carry) * league_mean_prior
    denom = games_played + k
    weight = (games_played / denom) if denom > 0 else 0.0
    return weight * current_value + (1 - weight) * carried_forward


def compute_all_ratings(
    prior_pbp: pd.DataFrame,
    current_pbp: pd.DataFrame,
    teams: list[str],
    carry: float,
    k: float,
) -> list[TeamRating]:
    """prior_pbp = last completed season (the regression anchor).
    current_pbp = this season so far — may be EMPTY (e.g. run before Week 1
    kicks off), in which case every team's games_played=0 and blend_rating
    reduces to the pure carried-forward prior. That reduction is a real
    regression test in tests/test_gg_pipeline, not just an assertion here.

    Replaces the old hardcoded current_value=0.0/games_played=0 cold-start
    stub (2026-09-28 fix): that version could never produce anything but
    the pre-season rating, no matter how many real games had been played,
    because nothing ever fed it a current season to blend in."""
    prior_stats = {t: compute_team_epa_stats(prior_pbp, t) for t in teams}
    current_stats = {t: compute_team_epa_stats(current_pbp, t) for t in teams}
    league_mean_prior = sum(s["raw_rating_pts_per_game"] for s in prior_stats.values()) / len(prior_stats)

    ratings = []
    for t in teams:
        p, c = prior_stats[t], current_stats[t]
        blended = blend_rating(
            raw_prior_value=p["raw_rating_pts_per_game"],
            league_mean_prior=league_mean_prior,
            current_value=c["raw_rating_pts_per_game"],
            games_played=c["games_played"],
            carry=carry,
            k=k,
        )
        # Display fields: use current-season numbers once any exist,
        # otherwise fall back to prior — avoids storing a misleading 0.0
        # in epa_play_off/def when games_played=0 and c[...] is a zero stub.
        source = c if c["games_played"] else p
        ratings.append(TeamRating(
            team=t,
            games_played=c["games_played"],
            epa_play_off=source["epa_play_off"],
            epa_play_def=source["epa_play_def"],
            plays_per_game=source["plays_per_game"],
            net_epa_per_play=source["net_epa_per_play"],
            raw_rating_pts_per_game=p["raw_rating_pts_per_game"],
            blended_rating_pts_per_game=blended,
        ))
    return sorted(ratings, key=lambda r: r.blended_rating_pts_per_game, reverse=True)
