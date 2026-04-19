"""
FORMULA 10 — Composite Futures Score (CFS)
Master weighted score that combines all 8 sub-formulas into a single 0–100 ranking.
Weights configurable via environment; defaults tuned against 2023–2025 seasons.
"""

import os
from utils.normalizer import clamp

DEFAULT_WEIGHTS = {
    "gg_elo":   0.22,
    "nir":      0.20,
    "ssc":      0.08,
    "iis":      0.12,
    "mdi":      0.15,
    "pds":      0.13,
    "eaf":      0.05,
    "mid_edge": 0.05,
}


def _load_weights() -> dict[str, float]:
    w = dict(DEFAULT_WEIGHTS)
    overrides = {
        "gg_elo":   "CFS_WEIGHT_ELO",
        "nir":      "CFS_WEIGHT_NIR",
        "ssc":      "CFS_WEIGHT_SSC",
        "iis":      "CFS_WEIGHT_IIS",
        "mdi":      "CFS_WEIGHT_MDI",
        "pds":      "CFS_WEIGHT_PDS",
        "eaf":      "CFS_WEIGHT_EAF",
        "mid_edge": "CFS_WEIGHT_MID",
    }
    for key, env_var in overrides.items():
        val = os.getenv(env_var)
        if val:
            try:
                w[key] = float(val)
            except ValueError:
                pass
    total = sum(w.values())
    if abs(total - 1.0) > 0.01:
        w = {k: v / total for k, v in w.items()}
    return w


def compute_cfs(
    gg_elo_score: float,
    nir_score: float,
    ssc_score: float,
    iis_score: float,
    mdi_score: float,
    pds_score: float,
    eaf_score: float,
    mid_edge: float,
    weights: dict[str, float] | None = None,
) -> dict:
    if weights is None:
        weights = _load_weights()

    mid_normalized = clamp((mid_edge + 0.20) / 0.40 * 100, 0, 100)

    scores = {
        "gg_elo":   clamp(gg_elo_score, 0, 100),
        "nir":      clamp(nir_score, 0, 100),
        "ssc":      clamp(ssc_score, 0, 100),
        "iis":      clamp(iis_score, 0, 100),
        "mdi":      clamp(mdi_score, 0, 100),
        "pds":      clamp(pds_score, 0, 100),
        "eaf":      clamp(eaf_score, 0, 100),
        "mid_edge": mid_normalized,
    }

    cfs = sum(scores[k] * weights[k] for k in weights)

    return {
        "cfs_score": round(cfs, 2),
        "components": scores,
        "weights": weights,
    }


def rank_teams(teams: list[dict]) -> list[dict]:
    """
    teams: list of dicts each containing all required sub-scores
    Returns sorted list with cfs_score and rank added.
    """
    weights = _load_weights()
    results = []
    for t in teams:
        cfs_data = compute_cfs(
            gg_elo_score=t.get("gg_elo_score", 50),
            nir_score=t.get("nir_score", 50),
            ssc_score=t.get("ssc_score", 50),
            iis_score=t.get("iis_score", 100),
            mdi_score=t.get("mdi_score", 50),
            pds_score=t.get("pds_score", 50),
            eaf_score=t.get("eaf_score", 50),
            mid_edge=t.get("mid_edge", 0.0),
            weights=weights,
        )
        results.append({**t, **cfs_data})

    results.sort(key=lambda x: x["cfs_score"], reverse=True)
    for i, r in enumerate(results, 1):
        r["rank"] = i
    return results
