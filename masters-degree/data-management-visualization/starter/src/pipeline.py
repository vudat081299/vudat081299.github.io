"""Chạy lại toàn bộ đường ống, đo thời gian từng bước.

Chạy: python -m src.pipeline            (dùng file đã có trong data/raw/, kiểm SHA-256)
      python -m src.pipeline --force    (tải lại từ đầu)
"""
import contextlib
import io
import runpy
import sys
import time
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
STEPS = ["download", "clean", "quality", "eda", "outliers", "anom", "cusum", "sprt", "charts"]

if __name__ == "__main__":
    times = []
    for step in STEPS:
        t0 = time.perf_counter()
        with contextlib.redirect_stdout(io.StringIO()):        # giữ màn hình gọn; mỗi bước tự ghi results/
            runpy.run_module(f"src.{step}", run_name="__main__")  # luật chặn ở quality -> SystemExit, dừng ở đây
        times.append({"step": step, "seconds": round(time.perf_counter() - t0, 2)})
        print(f"{step:<9} {times[-1]['seconds']:>6.2f} s")
    pd.DataFrame(times).to_csv(ROOT / "results" / "timings.csv", index=False)
    print(f"tổng     {sum(t['seconds'] for t in times):>6.2f} s")
