"""Shared-vector parity test (Python side).

Runs shared/betting_vectors.json against backend/formulas/betting_math.py.
The vitest suite in frontend/src/utils/bettingMath.test.ts runs the SAME file
against the JS mirror. If either implementation drifts, that side goes red.
"""

import json
import math
import pathlib

import pytest

from formulas import betting_math as bm

# tests/test_formulas/<file> — parents[2] is the repo root.
_VECTORS = json.loads(
    (pathlib.Path(__file__).resolve().parents[2] / "shared" / "betting_vectors.json").read_text()
)

# Map vector fn-name → call against the canonical module.
_DISPATCH = {
    "am_to_decimal": lambda a: bm.am_to_decimal(a["american"]),
    "implied_prob":  lambda a: bm.implied_prob(a["american"]),
    "kelly":         lambda a: bm.kelly(a["p"], a["american"]),
    "evi":           lambda a: bm.evi(a["p"], a["american"]),
}


def _ident(case):
    return f"{case['fn']}({case['args']})"


@pytest.mark.parametrize("case", _VECTORS["cases"], ids=[_ident(c) for c in _VECTORS["cases"]])
def test_betting_vector(case):
    assert case["fn"] in _DISPATCH, f"unknown fn in vectors: {case['fn']}"
    got = _DISPATCH[case["fn"]](case["args"])
    assert math.isclose(got, case["expect"], abs_tol=case["tol"]), (
        f"{_ident(case)}: got {got!r}, expected {case['expect']!r} (tol {case['tol']})"
    )
