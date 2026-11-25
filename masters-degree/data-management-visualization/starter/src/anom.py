"""P5 · ANOM cho tỉ lệ (nhị thức), các nhóm cùng cỡ n: mỗi mùa một nhóm.

Giới hạn quyết định (Minitab, Nelson): p̄ ± h(α, k) · sqrt(p̄(1 − p̄)/n) · sqrt((k − 1)/k).
h(α, k) với bậc tự do vô hạn: tính bằng mô phỏng (chính xác tới ~0,005) và xấp xỉ Šidák.
Chạy: python -m src.anom  ->  results/anom.csv
"""
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]


def h_sidak(alpha: float, k: int) -> float:
    return stats.norm.ppf(1 - (1 - (1 - alpha) ** (1 / k)) / 2)


def h_exact(alpha: float, k: int, sims: int = 400_000, seed: int = 1) -> float:
    """Phân vị 1 − α của max_i |Z_i − Z̄| / sqrt((k − 1)/k), Z_i ~ N(0, 1) độc lập."""
    rng = np.random.default_rng(seed)
    z = rng.standard_normal((sims, k))
    m = np.abs(z - z.mean(axis=1, keepdims=True)).max(axis=1) / np.sqrt((k - 1) / k)
    return float(np.quantile(m, 1 - alpha))


def anom_binomial(groups: pd.DataFrame, alpha: float = 0.05, h: float | None = None) -> pd.DataFrame:
    """groups: cột 'group', 'x' (số lần thành công), 'n' (cùng một n cho mọi nhóm)."""
    n = groups.n.iloc[0]
    assert (groups.n == n).all(), "cỡ nhóm khác nhau: cần giới hạn riêng từng nhóm"
    k = len(groups)
    pbar = groups.x.sum() / groups.n.sum()
    h = h_sidak(alpha, k) if h is None else h
    half = h * np.sqrt(pbar * (1 - pbar) / n) * np.sqrt((k - 1) / k)
    out = groups.assign(p=groups.x / n, pbar=pbar, h=h, LDL=pbar - half, UDL=pbar + half)
    out["signal"] = np.select([out.p < out.LDL, out.p > out.UDL], ["dưới", "trên"], "")
    return out


if __name__ == "__main__":
    df = pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet")
    g = df.groupby("season").agg(x=("home_win", "sum"), n=("home_win", "size")).reset_index()
    g = g.rename(columns={"season": "group"})
    k = len(g)
    print(f"k = {k}; h Šidák = {h_sidak(.05, k):.4f}; h mô phỏng = {h_exact(.05, k):.4f}")
    res = anom_binomial(g, 0.05)
    res.to_csv(ROOT / "results" / "anom.csv", index=False)
    print(res.round(4).to_string(index=False))
    r01 = anom_binomial(g, 0.01)
    print("α = 0,01:", r01.LDL.iloc[0].round(4), r01.UDL.iloc[0].round(4), "tín hiệu:", list(r01.group[r01.signal != ""]))
