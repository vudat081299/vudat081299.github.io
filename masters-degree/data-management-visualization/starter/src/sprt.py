"""P5 · SPRT Bernoulli (Wald) cho mùa 2020/21.

H0: p = p0 (tỉ lệ thắng sân nhà Phase I). H1: p = p1 = (1 − tỉ lệ hoà)/2 (hết lợi thế sân nhà).
Ngưỡng: a = ln(β/(1 − α)), b = ln((1 − β)/α). LLR ≥ b: chấp nhận H1; LLR ≤ a: chấp nhận H0.
Chạy: python -m src.sprt  ->  results/sprt_path_2020-21.csv, results/sprt_seasons.csv
"""
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def bounds(alpha: float, beta: float) -> tuple[float, float]:
    return np.log(beta / (1 - alpha)), np.log((1 - beta) / alpha)


def sprt(x, p0: float, p1: float, alpha: float = 0.05, beta: float = 0.10) -> dict:
    a, b = bounds(alpha, beta)
    step = np.where(np.asarray(x) == 1, np.log(p1 / p0), np.log((1 - p1) / (1 - p0)))
    llr = np.cumsum(step)
    hit = np.flatnonzero((llr >= b) | (llr <= a))
    if len(hit) == 0:
        return {"decision": "chưa quyết", "n": len(llr), "llr": llr, "a": a, "b": b}
    n = hit[0]
    return {"decision": "H1" if llr[n] >= b else "H0", "n": n + 1, "llr": llr, "a": a, "b": b}


def phase1_params(df: pd.DataFrame, first: str, last: str) -> tuple[float, float, float]:
    ph = df[df.season.between(first, last)]
    p0 = ph.home_win.mean()
    draw = (ph.FTR == "D").mean()
    return p0, draw, (1 - draw) / 2


if __name__ == "__main__":
    df = pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet")
    p0, draw, p1 = phase1_params(df, "2016/17", "2018/19")
    s = df[df.season == "2020/21"].sort_values("seq")
    r = sprt(s.home_win.to_numpy(), p0, p1)
    m = s.iloc[r["n"] - 1]
    print(f"p0 = {p0:.5f}, draw = {draw:.5f}, p1 = {p1:.5f}, a = {r['a']:.4f}, b = {r['b']:.4f}")
    print(f"2020/21: {r['decision']} ở trận {r['n']}: {m.home_team} {m.FTHG}-{m.FTAG} {m.away_team}, {m.match_date}")
    s.assign(n=range(1, len(s) + 1), llr=r["llr"], a=r["a"], b=r["b"])[
        ["n", "match_date", "kickoff", "home_team", "away_team", "FTHG", "FTAG", "home_win", "llr", "a", "b"]
    ].to_csv(ROOT / "results" / "sprt_path_2020-21.csv", index=False)
    rows = []
    for season, g in df.sort_values("seq").groupby("season"):
        q = sprt(g.home_win.to_numpy(), p0, p1)
        rows.append({"season": season, "decision": q["decision"], "stop_n": q["n"]})
    out = pd.DataFrame(rows)
    out.to_csv(ROOT / "results" / "sprt_seasons.csv", index=False)
    print(out.to_string(index=False))
