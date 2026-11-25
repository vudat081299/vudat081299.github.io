"""P2 · Luật chất lượng dữ liệu trên bảng sạch.

Luật "chặn" (QB1–QB8): sai thì dừng đường ống (sys.exit, mã thoát 1).
Luật "gắn cờ" (QF1–QF5): ghi số dòng vi phạm, chạy tiếp.
Chạy: python -m src.quality   ->  results/quality_report.csv, results/quality_rows.csv
"""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
STATS_FROM = "2000/01"                      # cú sút, thẻ, trọng tài có từ mùa này


def rules(df: pd.DataFrame) -> list[tuple[str, str, str, pd.Series]]:
    """Mỗi luật: (mã, mức, mô tả, mask các dòng VI PHẠM)."""
    stats = df["season"] >= STATS_FROM
    exp_ftr = pd.Series(["H" if h > a else "A" if h < a else "D" for h, a in zip(df.FTHG, df.FTAG)], index=df.index)
    exp_htr = pd.Series([pd.NA if pd.isna(h) else "H" if h > a else "A" if h < a else "D"
                         for h, a in zip(df.HTHG, df.HTAG)], index=df.index)
    per_season = df.groupby("season")["match_id"].transform("size")
    home_n = df.groupby(["season", "home_team"])["match_id"].transform("size")
    away_n = df.groupby(["season", "away_team"])["match_id"].transform("size")
    counts = ["FTHG", "FTAG", "HTHG", "HTAG", "HS", "AS", "HST", "AST", "HF", "AF", "HC", "AC", "HY", "AY", "HR", "AR"]
    start = pd.to_datetime(df.season_start.astype(str) + "-07-01").dt.date
    end = pd.to_datetime((df.season_start + 1).astype(str) + "-08-31").dt.date   # 2019/20 đá tới 26/7/2020
    first = df.groupby("season_start").match_date.min()
    nxt_first = df.season_start.map(lambda y: first.get(y + 1))
    overlap = df.match_date >= nxt_first.fillna(pd.Timestamp.max.date())
    return [
        ("QB1", "chặn", "khoá (mùa, đội nhà, đội khách) không trùng", df.duplicated("match_id", keep=False)),
        ("QB2", "chặn", "mỗi mùa đúng 380 trận", per_season != 380),
        ("QB3", "chặn", "mỗi đội 19 trận sân nhà, 19 sân khách", (home_n != 19) | (away_n != 19)),
        ("QB4", "chặn", "ngày, hai đội, bàn, FTR không trống",
         df[["match_date", "home_team", "away_team", "FTHG", "FTAG", "FTR"]].isna().any(axis=1)),
        ("QB5", "chặn", "FTR khớp số bàn", df.FTR != exp_ftr),
        ("QB6", "chặn", "mọi số đếm ≥ 0", (df[counts] < 0).any(axis=1).fillna(False)),
        ("QB7", "chặn", "ngày từ 1/7 năm đầu tới 31/8 năm sau, và hai mùa liền nhau không chồng ngày",
         (df.match_date < start) | (df.match_date > end) | overlap),
        ("QB8", "chặn", "từ 2000/01: cú sút, thẻ, phạt góc, trọng tài không trống",
         stats & df[["referee", "HS", "AS", "HST", "AST", "HC", "AC", "HY", "AY", "HR", "AR"]].isna().any(axis=1)),
        ("QF1", "gắn cờ", "sút trúng đích > tổng cú sút (HST > HS hoặc AST > AS)",
         ((df.HST > df.HS) | (df.AST > df.AS)).fillna(False)),
        ("QF2", "gắn cờ", "bàn > sút trúng đích (FTHG > HST hoặc FTAG > AST)",
         ((df.FTHG > df.HST) | (df.FTAG > df.AST)).fillna(False)),
        ("QF3", "gắn cờ", "HTR không khớp bàn hiệp 1, hoặc bàn hiệp 1 > cả trận",
         ((df.HTR != exp_htr) | (df.HTHG > df.FTHG) | (df.HTAG > df.FTAG)).fillna(False)),
        ("QF4", "gắn cờ", "thẻ đỏ ≥ 3 cho một đội trong một trận", ((df.HR >= 3) | (df.AR >= 3)).fillna(False)),
        ("QF5", "gắn cờ", "không có giờ đá (trước 2019/20): thứ tự trong ngày lấy theo file", df.kickoff.isna()),
    ]


def run(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    report, hits = [], []
    for code, level, desc, mask in rules(df):
        mask = mask.astype(bool)
        report.append({"rule": code, "level": level, "description": desc, "violations": int(mask.sum())})
        if code != "QF5":                       # QF5 đếm 8.360 trận không giờ đá: không liệt kê
            hits.append(df.loc[mask, ["match_id", "match_date", "FTHG", "FTAG", "HS", "AS", "HST", "AST"]].assign(rule=code))
    return pd.DataFrame(report), pd.concat(hits, ignore_index=True)


if __name__ == "__main__":
    df = pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet")
    report, rows = run(df)
    (ROOT / "results").mkdir(exist_ok=True)
    report.to_csv(ROOT / "results" / "quality_report.csv", index=False)
    rows.to_csv(ROOT / "results" / "quality_rows.csv", index=False)
    print(report.to_string(index=False))
    blocked = report[(report.level == "chặn") & (report.violations > 0)]
    if len(blocked):
        sys.exit(f"Dừng: {len(blocked)} luật chặn bị vi phạm")
