"""P5 · Ngoại lai: đuôi Poisson cho bàn và thẻ vàng, rào IQR cho cú sút / sút trúng đích / phạt góc.

Lỗi ghi chép KHÔNG tìm ở đây: nó là luật trong quality.py (QF1, QF2).
Chạy: python -m src.outliers  ->  results/outliers.csv, results/outliers_summary.csv
"""
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
POISSON_COLS = ["FTHG", "FTAG", "HY", "AY"]          # var/mean ≈ 1 (xem eda_dispersion.csv)
IQR_COLS = ["HS", "AS", "HST", "AST", "HC", "AC"]    # var/mean ≈ 1,6-2,1: không Poisson


def poisson_tail(x: pd.Series, alpha: float = 0.05) -> pd.DataFrame:
    """P(X >= x) với λ = trung bình cột; ngưỡng α chia cho số trận (Bonferroni)."""
    lam = x.mean()
    p = stats.poisson.sf(x - 1, lam)                 # sf(x-1) = P(X >= x)
    cut = alpha / x.notna().sum()
    return pd.DataFrame({"value": x, "lambda": lam, "p_tail": p, "outlier": p < cut})


def iqr_fence(x: pd.Series, k: float = 1.5) -> pd.DataFrame:
    q1, q3 = x.quantile([0.25, 0.75])
    lo, hi = q1 - k * (q3 - q1), q3 + k * (q3 - q1)
    return pd.DataFrame({"value": x, "lo": lo, "hi": hi, "outlier": (x < lo) | (x > hi)})


def modified_z(x: pd.Series) -> pd.Series:
    """Iglewicz-Hoaglin: 0,6745 (x - trung vị) / MAD. MAD = 0 thì không dùng được (thẻ đỏ)."""
    mad = (x - x.median()).abs().median()
    if mad == 0:
        return pd.Series(np.nan, index=x.index)
    return 0.6745 * (x - x.median()) / mad


def run(df: pd.DataFrame, alpha: float = 0.05, k: float = 1.5) -> tuple[pd.DataFrame, pd.DataFrame]:
    d = df[df.season >= "2000/01"]
    hits, summary = [], []
    for c in POISSON_COLS + IQR_COLS:
        r = poisson_tail(d[c].astype(float), alpha) if c in POISSON_COLS else iqr_fence(d[c].astype(float), k)
        method = "poisson" if c in POISSON_COLS else f"iqr{k}"
        o = r[r.outlier]
        summary.append({"column": c, "method": method, "n": len(r), "outliers": len(o),
                        "threshold": (o.value.min() if len(o) else np.nan) if method == "poisson" else r.hi.iloc[0]})
        hits.append(d.loc[o.index, ["match_id", "match_date", "home_team", "away_team", "FTHG", "FTAG"]]
                    .assign(column=c, method=method, value=o.value, score=o.get("p_tail", o.get("hi"))))
    rc = d.HR.astype(float)
    summary.append({"column": "HR", "method": "iqr/mad", "n": len(rc), "outliers": np.nan,
                    "threshold": f"Q1={rc.quantile(.25):g} Q3={rc.quantile(.75):g} MAD={(rc - rc.median()).abs().median():g}"})
    summary = pd.DataFrame(summary)
    summary["threshold"] = summary.threshold.astype(str)   # cột trộn số và chữ: Arrow (Parquet, Streamlit) từ chối
    return pd.concat(hits, ignore_index=True), summary


if __name__ == "__main__":
    df = pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet")
    hits, summary = run(df)
    hits.to_csv(ROOT / "results" / "outliers.csv", index=False)
    summary.to_csv(ROOT / "results" / "outliers_summary.csv", index=False)
    print(summary.to_string(index=False))
