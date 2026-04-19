import pytest
from formulas.market_inefficiency import compute_mid, classify_tier, NEEDLE_THRESHOLD


def make_odds_map(odds: int) -> dict:
    return {"fanduel": [odds, -120], "draftkings": [odds + 10, -115]}


def test_positive_edge_detected():
    model_prob = 0.20
    odds_map = make_odds_map(400)
    result = compute_mid(model_prob, odds_map)
    assert result["mid_edge"] > 0


def test_negative_edge_detected():
    model_prob = 0.05
    odds_map = make_odds_map(150)
    result = compute_mid(model_prob, odds_map)
    assert result["mid_edge"] < 0


def test_needle_tier_at_threshold():
    tier = classify_tier(NEEDLE_THRESHOLD + 0.01)
    assert tier == "NEEDLE"


def test_fair_tier():
    tier = classify_tier(0.01)
    assert tier == "FAIR"


def test_fade_tier():
    tier = classify_tier(-0.05)
    assert tier == "FADE"


def test_model_prob_returned():
    model_prob = 0.18
    odds_map = make_odds_map(450)
    result = compute_mid(model_prob, odds_map)
    assert result["model_prob"] == pytest.approx(model_prob)


def test_sharp_money_signal():
    odds_map = make_odds_map(400)
    result = compute_mid(0.20, odds_map, sharp_money_on_team=True)
    assert result["signals"]["sharp_money"] is True
