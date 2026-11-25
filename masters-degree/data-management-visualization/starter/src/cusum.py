"""P5 · CUSUM Bernoulli hai phía trên chuỗi thắng sân nhà (1) / không thắng (0).

Tham số mặc định (khoá và ghi lại ở docs/analysis-plan.md): Phase I 1997/98–1999/00, p0 = 540/1140,
mức đổi 0,05, h = 3,1.
Chạy: python -m src.cusum  ->  results/cusum_alarms.csv, results/cusum_path.csv, results/cusum_arl.csv
"""
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def llr_weights(p0: float, p1: float) -> tuple[float, float]:
    """Điểm cộng khi x = 1 và khi x = 0: log tỉ số hợp lý của H1 (p1) so với H0 (p0)."""
    return np.log(p1 / p0), np.log((1 - p1) / (1 - p0))


def bernoulli_cusum(x, p0: float, delta: float, h: float) -> tuple[pd.DataFrame, list[dict]]:
    """Hai nhánh: giảm (p1 = p0 − delta) và tăng (p1 = p0 + delta). Báo thì đặt cả hai về 0, giữ p0."""
    w = {"giảm": llr_weights(p0, p0 - delta), "tăng": llr_weights(p0, p0 + delta)}
    s = {"giảm": 0.0, "tăng": 0.0}
    last_zero = {"giảm": -1, "tăng": -1}      # chỉ số trận cuối cùng nhánh bằng 0
    path, alarms = np.zeros((len(x), 2)), []
    for t, xt in enumerate(x):
        for side, (w1, w0) in w.items():
            s[side] = max(0.0, s[side] + (w1 if xt == 1 else w0))
            if s[side] == 0.0:
                last_zero[side] = t
        path[t] = s["giảm"], s["tăng"]
        for side in ("giảm", "tăng"):
            if s[side] > h:
                alarms.append({"t": t, "side": side, "change_t": last_zero[side] + 1, "stat": s[side]})
                s = {"giảm": 0.0, "tăng": 0.0}
                last_zero = {"giảm": t, "tăng": t}
                break
    return pd.DataFrame(path, columns=["s_down", "s_up"]), alarms


def simulate_arl(p_true: float, p0: float, delta: float, h: float, runs: int = 4000,
                 max_n: int = 60_000, seed: int = 7) -> float:
    """ARL = số trận trung bình tới cảnh báo đầu tiên, mô phỏng song song nhiều chuỗi."""
    rng = np.random.default_rng(seed)
    (d1, d0), (u1, u0) = llr_weights(p0, p0 - delta), llr_weights(p0, p0 + delta)
    sd, su = np.zeros(runs), np.zeros(runs)
    rl = np.full(runs, max_n)
    alive = np.ones(runs, bool)
    for t in range(1, max_n + 1):
        x = rng.random(runs) < p_true
        sd = np.maximum(0, sd + np.where(x, d1, d0))
        su = np.maximum(0, su + np.where(x, u1, u0))
        hit = alive & ((sd > h) | (su > h))
        rl[hit] = t
        alive &= ~hit
        if not alive.any():
            break
    return float(rl.mean())


def run(df: pd.DataFrame, phase1=("1997/98", "1999/00"), delta=0.05, h=3.1):
    ph1 = df[df.season.between(*phase1)]
    p0 = ph1.home_win.sum() / len(ph1)
    mon = df[df.season > phase1[1]].sort_values("seq").reset_index(drop=True)
    path, alarms = bernoulli_cusum(mon.home_win.to_numpy(), p0, delta, h)
    a = pd.DataFrame(alarms)
    if len(a):
        a = a.assign(season=mon.season[a.t].values, season_seq=mon.season_seq[a.t].values,
                     match_date=mon.match_date[a.t].values, match_id=mon.match_id[a.t].values,
                     change_season=mon.season[a.change_t].values, change_seq=mon.season_seq[a.change_t].values,
                     change_date=mon.match_date[a.change_t].values)
    path = pd.concat([mon[["seq", "season", "season_seq", "match_date", "home_win"]], path], axis=1)
    return p0, path, a


if __name__ == "__main__":
    df = pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet")
    p0, path, a = run(df)
    print(f"p0 = {p0:.5f}; số trận theo dõi = {len(path)}; số cảnh báo = {len(a)}")
    print(a[["side", "season", "season_seq", "match_date", "match_id", "change_season", "change_seq", "stat"]].to_string(index=False))
    a.to_csv(ROOT / "results" / "cusum_alarms.csv", index=False)
    # đường CUSUM thưa: mỗi 20 trận + mọi trận có cảnh báo, đủ để vẽ hình
    keep = (path.index % 20 == 0) | path.index.isin(a.t) | (path.index == len(path) - 1)
    path[keep].assign(alarm=path.index[keep].isin(a.t)).to_csv(ROOT / "results" / "cusum_path.csv", index=False)
    arl = [{"p_true": pt, "label": lab, "ARL": simulate_arl(pt, p0, 0.05, 3.1)}
           for pt, lab in [(p0, "không đổi"), (p0 - 0.05, "giảm 0,05"), (p0 + 0.05, "tăng 0,05")]]
    pd.DataFrame(arl).to_csv(ROOT / "results" / "cusum_arl.csv", index=False)
    print(pd.DataFrame(arl).round(1).to_string(index=False))
