import numpy as np
import pytest

from src.cusum import bernoulli_cusum, llr_weights


def test_hand_example():
    # p0 = 0,5; nhánh giảm p1 = 0,25: x=1 cộng ln(0,5) = -0,693; x=0 cộng ln(1,5) = 0,405
    path, alarms = bernoulli_cusum([0, 0, 1, 0, 0, 0], p0=0.5, delta=0.25, h=10)
    assert path.s_down.round(3).tolist() == [0.405, 0.811, 0.118, 0.523, 0.929, 1.334]
    assert alarms == []


def test_reset_to_zero():
    path, _ = bernoulli_cusum([1, 1, 1], p0=0.5, delta=0.25, h=10)
    assert path.s_down.tolist() == [0, 0, 0]          # thắng liên tiếp không làm nhánh giảm âm


def test_finds_planted_change():
    rng = np.random.default_rng(42)
    x = np.r_[rng.random(1500) < 0.47, rng.random(1000) < 0.30].astype(int)   # đổi ở trận 1500
    _, alarms = bernoulli_cusum(x, p0=0.47, delta=0.05, h=3.1)
    first = [a for a in alarms if a["t"] >= 1500 and a["side"] == "giảm"][0]
    assert 1500 <= first["t"] < 1700
    assert abs(first["change_t"] - 1500) < 80


def test_weights_sign():
    w1, w0 = llr_weights(0.47, 0.42)
    assert w1 < 0 < w0
