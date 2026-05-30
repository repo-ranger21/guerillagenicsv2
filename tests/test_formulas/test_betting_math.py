"""Cross-stack parity gate for betting math.

Reads shared/betting_vectors.json and asserts each case against the Python
implementation in formulas/betting_math.py. The same vectors run in vitest
against frontend/src/utils/bettingMath.ts. If either language drifts from
the canonical values, CI turns red before a PR can merge.
"""

import json
import math
import pathlib

import pytest

from formulas.betting_math import am_to_decimal, evi, implied_prob, kelly

_VECTORS = json.loads(
    (pathlib.Path(__file__).parent.parent.parent / "shared" / "betting_vectors.json")
    .read_text(encoding="utf-8")
)

_DISPATCH = {
    "am_to_decimal": lambda args: am_to_decimal(args["american"]),
    "implied_prob":  lambda args: implied_prob(args["american"]),
    "kelly":         lambda args: kelly(args["p"], args["american"]),
    "evi":           lambda args: evi(args["p"], args["american"]),
}


def _cases():
    return [
        pytest.param(c["fn"], c["args"], c["expect"], c["tol"], id=f"{c['fn']}({c['args']})")
        for c in _VECTORS["cases"]
    ]


@pytest.mark.parametrize("fn,args,expect,tol", _cases())
def test_betting_math_vector(fn, args, expect, tol):
    result = _DISPATCH[fn](args)
    assert math.isclose(result, expect, abs_tol=tol, rel_tol=0), (
        f"{fn}({args}): got {result!r}, expected {expect!r} ± {tol}"
    )
