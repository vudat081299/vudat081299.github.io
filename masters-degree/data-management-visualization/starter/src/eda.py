"""P3 · EDA: thống kê mô tả, tỉ lệ thắng sân nhà theo mùa, tỉ số phương sai / trung bình.

Chạy: python -m src.eda  ->  results/eda_describe.csv, results/eda_dispersion.csv, results/eda_season.csv
"""
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PAIRS = {"bàn": ("FTHG", "FTAG"), "cú sút": ("HS", "AS"), "sút trúng đích": ("HST", "AST"),
         "phạt góc": ("HC", "AC"), "phạm lỗi": ("HF", "AF"), "thẻ vàng": ("HY", "AY"), "thẻ đỏ": ("HR", "AR")}


def dispersion(df: pd.DataFrame) -> pd.DataFrame:
    """var/mean cho từng biến: theo đội (sân nhà, sân khách riêng) và theo trận (cộng hai đội)."""
    rows = []
    for name, (h, a) in PAIRS.items():
        for side, s in [("đội nhà", df[h]), ("đội khách", df[a]), ("cả trận", df[h] + df[a])]:
            s = s.dropna().astype(float)
            rows.append({"variable": name, "unit": side, "n": len(s), "mean": s.mean(), "median": s.median(),
                         "sd": s.std(), "q1": s.quantile(.25), "q3": s.quantile(.75), "max": s.max(),
                         "var_over_mean": s.var() / s.mean()})
    return pd.DataFrame(rows)


def season_table(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby("season")
    return pd.DataFrame({"n": g.size(), "home_wins": g.home_win.sum(),
                         "draws": g.FTR.apply(lambda s: (s == "D").sum()),
                         "away_wins": g.FTR.apply(lambda s: (s == "A").sum()),
                         "goals_per_match": g.apply(lambda x: (x.FTHG + x.FTAG).mean())}).assign(
        home_win_rate=lambda t: t.home_wins / t.n, draw_rate=lambda t: t.draws / t.n,
        away_win_rate=lambda t: t.away_wins / t.n).reset_index()


if __name__ == "__main__":
    df = pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet")
    stats = df[df.season >= "2000/01"]
    d = dispersion(stats)
    d.to_csv(ROOT / "results" / "eda_dispersion.csv", index=False)
    s = season_table(df)
    s.to_csv(ROOT / "results" / "eda_season.csv", index=False)
    pd.set_option("display.width", 200)
    print(d.round(3).to_string(index=False))
    print(s.round(3).to_string(index=False))
