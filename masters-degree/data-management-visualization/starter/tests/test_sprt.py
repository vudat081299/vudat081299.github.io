import numpy as np

from src.sprt import bounds, sprt


def test_bounds():
    a, b = bounds(0.05, 0.10)
    assert round(a, 4) == -2.2513 and round(b, 4) == 2.8904


def simulate(p_true, p0=0.475, p1=0.389, runs=4000, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    res = [sprt((rng.random(n) < p_true).astype(int), p0, p1)["decision"] for _ in range(runs)]
    return np.mean([r == "H1" for r in res])


def test_false_alarm_close_to_alpha():
    rate = simulate(0.475)            # dữ liệu sinh từ H0
    assert 0.02 < rate <= 0.05 / 0.9 + 0.01, rate      # Wald: α thật ≤ α/(1 − β)


def test_power_close_to_one_minus_beta():
    power = simulate(0.389, seed=1)   # dữ liệu sinh từ H1
    assert power >= 0.88, power
