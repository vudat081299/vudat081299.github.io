"""P1 · Tải file E0 (Premier League) mỗi mùa từ football-data.co.uk, ghi data/manifest.csv.

Chạy: python -m src.download          (file đã có thì không tải lại, chỉ băm SHA-256)
      python -m src.download --force  (tải lại tất cả)
File tải tay đặt sẵn vào data/raw/ (đúng tên E0_<mã mùa>.csv) cũng được: script chỉ băm và ghi manifest.
"""
import csv
import datetime as dt
import hashlib
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "data" / "manifest.csv"
URL = "https://www.football-data.co.uk/mmz4281/{code}/E0.csv"
FIRST, LAST = 1997, 2025          # mùa 1997/98 … 2025/26 (năm bắt đầu)
PAUSE_S = 2.0                     # nghỉ giữa hai lần tải, lịch sự với máy chủ
FIELDS = ["season", "file", "url", "final_url", "downloaded_utc", "bytes", "sha256"]


def season_code(start_year: int) -> str:
    """1997 -> '9798', 2020 -> '2021' (mùa 2020/21)."""
    return f"{start_year % 100:02d}{(start_year + 1) % 100:02d}"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_manifest() -> dict:
    """{tên file: dòng manifest} của lần chạy trước; chưa có manifest thì rỗng."""
    if not MANIFEST.exists():
        return {}
    with MANIFEST.open(newline="") as f:
        return {r["file"]: r for r in csv.DictReader(f)}


def main(force: bool = False) -> list[dict]:
    RAW.mkdir(parents=True, exist_ok=True)
    old = read_manifest()
    rows = []
    with requests.Session() as s:
        s.headers["User-Agent"] = "student-project-downloader/1.0"   # không tên người, không email
        for y in range(FIRST, LAST + 1):
            code = season_code(y)
            url = URL.format(code=code)
            dest = RAW / f"E0_{code}.csv"
            season = f"{y}/{(y + 1) % 100:02d}"
            if dest.exists() and not force:
                # đã có: giữ dòng cũ; file tải tay chưa có dòng thì ghi dòng mới, không tải
                rows.append(old.get(dest.name) or {"season": season, "file": dest.name, "url": url, "final_url": "",
                                                   "downloaded_utc": "", "bytes": dest.stat().st_size,
                                                   "sha256": sha256(dest)})
                continue
            r = s.get(url, timeout=60)               # requests tự theo 301 www -> không www
            r.raise_for_status()
            dest.write_bytes(r.content)              # ghi byte gốc, không decode
            rows.append({"season": season, "file": dest.name, "url": url, "final_url": r.url,
                         "downloaded_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                         "bytes": len(r.content), "sha256": sha256(dest)})
            print(f"{dest.name}: {len(r.content):>7} byte")
            time.sleep(PAUSE_S)
    with MANIFEST.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    # kiểm lại: file trên đĩa phải khớp SHA-256 trong manifest
    bad = [r["file"] for r in rows if sha256(RAW / r["file"]) != r["sha256"]]
    if bad:
        sys.exit(f"SHA-256 lệch: {bad}")
    return rows


if __name__ == "__main__":
    main(force="--force" in sys.argv)
