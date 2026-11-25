import numpy as np
import pandas as pd
from scipy import stats

from src.anom import anom_binomial, h_exact, h_sidak


def test_hand_example():
    g = pd.DataFrame({"group": list("ABC"), "x": [40, 50, 60], "n": [100] * 3})
    r = anom_binomial(g, 0.05)
    h = stats.norm.ppf(1 - (1 - 0.95 ** (1 / 3)) / 2)            # 2,388
    half = h * np.sqrt(0.5 * 0.5 / 100) * np.sqrt(2 / 3)
    assert np.isclose(r.LDL.iloc[0], 0.5 - half) and np.isclose(r.UDL.iloc[0], 0.5 + half)
    assert r.signal.tolist() == ["dưới", "", "trên"]


def test_sidak_close_to_exact():
    assert abs(h_sidak(0.05, 29) - h_exact(0.05, 29, sims=200_000)) < 0.02
