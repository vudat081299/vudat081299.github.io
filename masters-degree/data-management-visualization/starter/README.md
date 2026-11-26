# Lợi thế sân nhà ở Premier League: ngoại lai, ANOM, CUSUM, SPRT

Repo khung cho đồ án nhóm IT5425 (giám sát lợi thế sân nhà ở Premier League). Clone về, cài, tải dữ liệu, chạy một lệnh.
Cách làm từng bước và lý do mỗi lựa chọn: trang “Giám sát lợi thế sân nhà ở Premier League” của đồ án
(https://vudat081299.github.io/masters-degree/data-management-visualization/sports-monitoring-build.html).

## Dữ liệu và điều khoản

- Nguồn: football-data.co.uk, file `E0` (Premier League) mỗi mùa, 1997/98–2025/26. Nghĩa cột: https://www.football-data.co.uk/notes.txt
- Repo **không kèm dữ liệu**. Trang nguồn ghi dữ liệu dành cho cá nhân; không phân phối lại file gốc.
  `python -m src.download` tự tải về `data/raw/` và ghi `data/manifest.csv` (URL, SHA-256).
- Tải tay thì đặt file vào `data/raw/E0_<mã mùa>.csv` (ví dụ `E0_2021.csv` là mùa 2020/21); script chỉ băm, không tải lại.
- Trước khi công khai repo: đọc điều khoản ở https://www.football-data.co.uk/data.php và hỏi bên giữ dữ liệu.

## Chạy

    python3 -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    python -m src.pipeline          # tải (nếu thiếu), làm sạch, kiểm chất lượng, EDA, 4 phương pháp, hình
    python -m pytest -q tests       # chạy sau pipeline: vài test đọc data/clean/
    streamlit run app/streamlit_app.py

Kết quả: `results/*.csv`, hình `results/fig/*.png`. Luật chặn (QB1–QB8) vi phạm thì pipeline dừng ở bước quality.

## Cây thư mục

    src/download.py    tải, ghi manifest           src/outliers.py   đuôi Poisson, rào IQR
    src/clean.py       đọc 29 file, bảng matches   src/anom.py       ANOM cho tỉ lệ
    src/quality.py     8 luật chặn, 5 luật gắn cờ  src/cusum.py      CUSUM Bernoulli, mô phỏng ARL
    src/eda.py         bảng mỗi mùa, var/TB        src/sprt.py       SPRT Bernoulli
    src/charts.py      hình PNG                    src/pipeline.py   một lệnh chạy mọi bước
    tests/             test tính tay, giả lập, luật chất lượng, app
    docs/              khuôn: problem, data-card, data-dictionary, lineage, analysis-plan, limitations

`requirements.txt` ghim đúng phiên bản các gói dùng trực tiếp (`==`).
