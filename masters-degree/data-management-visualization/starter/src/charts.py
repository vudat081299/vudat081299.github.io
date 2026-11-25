"""P6 · Bốn hình chính, đọc từ results/*.csv. Chạy: python -m src.charts -> results/fig/*.png"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")                     # không cần màn hình
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
R, FIG = ROOT / "results", ROOT / "results" / "fig"
SRC = "Nguồn: football-data.co.uk, Premier League (E0)"


def anom_chart():
    a = pd.read_csv(R / "anom.csv")
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(a.group, a.p, marker="o", color="0.2")
    for col, ls in [("pbar", "-"), ("LDL", "--"), ("UDL", "--")]:
        ax.axhline(a[col].iloc[0], ls=ls, color="0.5", lw=1)
    out = a[a.signal.fillna("") != ""]           # CSV đọc ô trống thành NaN
    ax.scatter(out.group, out.p, s=80, facecolors="none", edgecolors="k", zorder=3)
    ax.set_title("Chỉ 2020/21 có tỉ lệ thắng sân nhà dưới vạch ANOM (α = 0,05)", loc="left")
    ax.set_ylabel("Tỉ lệ thắng sân nhà"); ax.tick_params(axis="x", rotation=90)
    fig.text(0.01, 0.01, SRC, fontsize=8); fig.tight_layout(); fig.savefig(FIG / "anom.png", dpi=120)


def cusum_chart():
    p = pd.read_csv(R / "cusum_path.csv")
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(p.seq, p.s_down, label="nhánh giảm", color="0.2", lw=1)
    ax.plot(p.seq, p.s_up, label="nhánh tăng", color="0.6", lw=1)
    ax.axhline(3.1, ls="--", color="k", lw=1)
    al = p[p.alarm]
    ax.scatter(al.seq, al[["s_down", "s_up"]].max(axis=1), color="k", zorder=3)
    ax.set_title("Từ 2019/20 CUSUM chỉ báo giảm lợi thế sân nhà (h = 3,1)", loc="left")
    ax.set_xlabel("Trận thứ (toàn bộ, từ 1997/98)"); ax.legend()
    fig.text(0.01, 0.01, SRC, fontsize=8); fig.tight_layout(); fig.savefig(FIG / "cusum.png", dpi=120)


def sprt_chart():
    s = pd.read_csv(R / "sprt_path_2020-21.csv")
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(s.n, s.llr, color="0.2")
    ax.axhline(s.b.iloc[0], ls="--", color="k"); ax.axhline(s.a.iloc[0], ls="--", color="k")
    stop = s[s.llr >= s.b].n.min()
    ax.axvline(stop, color="0.6")
    ax.set_title(f"2020/21: SPRT chấp nhận H1 (hết lợi thế sân nhà) ở trận {stop}", loc="left")
    ax.set_xlabel("Trận thứ trong mùa"); ax.set_ylabel("log tỉ số hợp lý")
    fig.text(0.01, 0.01, SRC, fontsize=8); fig.tight_layout(); fig.savefig(FIG / "sprt.png", dpi=120)


def season_box():
    df = pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet")
    df["goals"] = df.FTHG + df.FTAG
    seasons = sorted(df.season.unique())
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.boxplot([df.goals[df.season == s] for s in seasons], tick_labels=seasons)
    ax.set_title("Số bàn mỗi trận theo mùa", loc="left"); ax.tick_params(axis="x", rotation=90)
    fig.text(0.01, 0.01, SRC, fontsize=8); fig.tight_layout(); fig.savefig(FIG / "goals_box.png", dpi=120)


if __name__ == "__main__":
    FIG.mkdir(parents=True, exist_ok=True)
    for f in (anom_chart, cusum_chart, sprt_chart, season_box):
        f()
    print(sorted(p.name for p in FIG.glob("*.png")))
