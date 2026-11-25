"""P2 · Gộp 29 file E0 thành một bảng sạch: mỗi dòng một trận.

Chạy: python -m src.clean
Ra:   data/clean/matches.parquet, data/clean/matches.duckdb, data/clean/referee_map.csv,
      data/clean/load_log.csv (mỗi file: mã hoá, số cột, số dòng bỏ, lý do).
"""
import csv
import io
import re
from pathlib import Path

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
CLEAN = ROOT / "data" / "clean"

# Cột giữ lại, đúng tên trong notes.txt của nguồn (để tra ngược được).
RESULT_COLS = ["Date", "Time", "HomeTeam", "AwayTeam", "FTHG", "FTAG", "FTR", "HTHG", "HTAG", "HTR"]
STAT_COLS = ["Referee", "HS", "AS", "HST", "AST", "HF", "AF", "HC", "AC", "HY", "AY", "HR", "AR"]
COUNT_COLS = ["FTHG", "FTAG", "HTHG", "HTAG"] + STAT_COLS[1:]


def season_of(path: Path) -> tuple[str, int]:
    code = path.stem.split("_")[1]                      # 'E0_2021' -> '2021'
    y = int(code[:2]); y += 1900 if y >= 90 else 2000
    return f"{y}/{(y + 1) % 100:02d}", y


def read_raw(path: Path) -> tuple[list[dict], dict]:
    """Đọc một file gốc bằng module csv, không bỏ dòng nào mà không ghi lý do."""
    b = path.read_bytes()
    try:
        text, enc = b.decode("utf-8-sig"), "utf-8"      # -sig: bỏ BOM nếu có
    except UnicodeDecodeError:
        text, enc = b.decode("cp1252"), "cp1252"        # 2004/05 có byte 0xA0 (dấu cách không ngắt)
    rows = list(csv.reader(io.StringIO(text)))
    header, body = rows[0], rows[1:]
    out, n_empty, n_trimmed = [], 0, 0
    for i, r in enumerate(body, start=1):
        if not any(x.strip() for x in r):               # dòng toàn dấu phẩy (1999/00, 2014/15)
            n_empty += 1
            continue
        if len(r) > len(header):                        # dòng thừa dấu phẩy (2003/04, 2004/05)
            extra = r[len(header):]
            if any(x.strip() for x in extra):           # phần thừa có chữ: dừng, đừng đoán
                raise ValueError(f"{path.name} dòng {i}: phần thừa có dữ liệu {extra}")
            r, n_trimmed = r[:len(header)], n_trimmed + 1
        d = {h: v for h, v in zip(header, r) if h}      # bỏ cột không tên (1997/98-2002/03)
        d["file_row"] = i
        out.append(d)
    log = {"file": path.name, "encoding": enc, "bom": b.startswith(b"\xef\xbb\xbf"),
           "n_fields": len(header), "n_named": sum(1 for h in header if h),
           "rows_in_file": len(body), "empty_rows": n_empty, "trimmed_rows": n_trimmed, "kept": len(out)}
    return out, log


def parse_date(s: pd.Series) -> pd.Series:
    """dd/mm/yy (8 ký tự) hoặc dd/mm/yyyy (10 ký tự); nói rõ định dạng, đừng để pandas đoán."""
    short = pd.to_datetime(s.where(s.str.len() == 8), format="%d/%m/%y", errors="coerce")
    long_ = pd.to_datetime(s.where(s.str.len() == 10), format="%d/%m/%Y", errors="coerce")
    out = short.fillna(long_)
    bad = s[out.isna()]
    if len(bad):
        raise ValueError(f"Ngày không đọc được: {bad.unique()[:5]}")
    return out.dt.date


# --- Tên trọng tài -----------------------------------------------------------------
# Lỗi gõ đã soát tay. Ba dòng cuối suy từ ngữ cảnh: mùa đó chỉ có một trọng tài Premier League mang họ ấy.
REF_FIX = {"Ellaray": "Elleray", "Gallagh": "Gallagher", "Gallaghe": "Gallagher"}
REF_MANUAL = {"Mn Atkinson": "M Atkinson", "K Kavanagh": "C Kavanagh",
              "O Oliver": "M Oliver", "S Scott": "G Scott"}


def norm_referee(raw: str) -> str | None:
    s = raw.replace("\xa0", " ").strip()
    if not s:
        return None
    if "," in s:                                        # 'Wiley, A. G.' -> 'A. G. Wiley'
        last, first = [x.strip() for x in s.split(",", 1)]
        s = f"{first} {last}"
    parts = re.sub(r"[.]", " ", s).split()              # 'A.G. Wiley' -> ['A','G','Wiley']
    surname = REF_FIX.get(parts[-1], parts[-1])
    key = f"{parts[0][0].upper()} {surname}"            # chữ cái đầu của tên + họ: 'A Wiley'
    return REF_MANUAL.get(key, key)                     # KHÔNG gộp theo họ: A Madley ≠ R Madley


def build() -> tuple[pd.DataFrame, pd.DataFrame]:
    frames, logs = [], []
    for path in sorted(RAW.glob("E0_*.csv")):
        rows, log = read_raw(path)
        season, y = season_of(path)
        df = pd.DataFrame(rows)
        df = df.reindex(columns=RESULT_COLS + STAT_COLS + ["file_row"])   # cột thiếu -> NA
        df.insert(0, "season", season)
        df.insert(1, "season_start", y)
        df["source_file"] = path.name
        frames.append(df)
        logs.append(log | {"season": season})
    df = pd.concat(frames, ignore_index=True)

    df["match_date"] = parse_date(df.pop("Date").str.strip())
    df["kickoff"] = df.pop("Time").str.strip().replace("", pd.NA)      # chỉ có từ 2019/20
    for c in ["HomeTeam", "AwayTeam", "FTR", "HTR"]:
        df[c] = df[c].str.strip().replace("", pd.NA)
    for c in COUNT_COLS:                                                # ô rỗng -> NA, không phải 0
        df[c] = pd.to_numeric(df[c].str.strip().replace("", pd.NA)).astype("Int16")
    df["referee_raw"] = df.pop("Referee")
    df["referee"] = df["referee_raw"].map(lambda x: norm_referee(x) if isinstance(x, str) else None)
    df["home_win"] = (df["FTR"] == "H").astype("int8")

    # Thứ tự trận: ngày, giờ đá, rồi thứ tự trong file. CUSUM và SPRT phụ thuộc thứ tự này.
    df = df.sort_values(["match_date", "kickoff", "file_row"], na_position="first", kind="stable")
    df["seq"] = range(1, len(df) + 1)
    df["season_seq"] = df.groupby("season").cumcount() + 1
    df["match_id"] = df["season"].str.replace("/", "-") + "_" + df["HomeTeam"] + "_" + df["AwayTeam"]
    df = df.rename(columns={"HomeTeam": "home_team", "AwayTeam": "away_team"})
    order = ["match_id", "season", "season_start", "seq", "season_seq", "match_date", "kickoff",
             "home_team", "away_team", "FTHG", "FTAG", "FTR", "HTHG", "HTAG", "HTR", "home_win",
             "referee", "referee_raw", *STAT_COLS[1:], "source_file", "file_row"]
    return df[order].reset_index(drop=True), pd.DataFrame(logs)


def save(df: pd.DataFrame, logs: pd.DataFrame) -> None:
    CLEAN.mkdir(parents=True, exist_ok=True)
    df.to_parquet(CLEAN / "matches.parquet", index=False)
    logs.to_csv(CLEAN / "load_log.csv", index=False)
    m = (df.dropna(subset=["referee_raw"]).groupby(["referee_raw", "referee"]).size()
           .rename("n").reset_index().sort_values(["referee", "referee_raw"]))
    m.to_csv(CLEAN / "referee_map.csv", index=False)
    db = CLEAN / "matches.duckdb"
    db.unlink(missing_ok=True)
    with duckdb.connect(str(db)) as con:
        con.execute("CREATE TABLE matches AS SELECT * FROM read_parquet(?)", [str(CLEAN / "matches.parquet")])
        con.execute("ALTER TABLE matches ADD PRIMARY KEY (match_id)")


if __name__ == "__main__":
    df, logs = build()
    save(df, logs)
    print(logs.to_string(index=False))
    print(df.shape, df.dtypes.value_counts().to_dict())
