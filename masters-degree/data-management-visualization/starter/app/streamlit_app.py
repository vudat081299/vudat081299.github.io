"""P7 · Demo. Chạy từ gốc repo: streamlit run app/streamlit_app.py  (không cần mạng)."""
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))                    # để import được src/ khi streamlit chạy file này
from src import anom, cusum, outliers, sprt      # noqa: E402


@st.cache_data                                   # Streamlit chạy lại cả file mỗi lần kéo thanh trượt
def load():
    return (pd.read_parquet(ROOT / "data" / "clean" / "matches.parquet"),
            pd.read_csv(ROOT / "results" / "quality_report.csv"))


df, quality = load()
st.title("Lợi thế sân nhà ở Premier League, 1997/98-2025/26")
t_data, t_out, t_anom, t_cusum, t_sprt = st.tabs(["Dữ liệu", "Ngoại lai", "ANOM", "CUSUM", "SPRT"])

with t_data:
    st.metric("Số trận", len(df))
    st.dataframe(quality, hide_index=True)

with t_out:
    k = st.slider("Hệ số rào IQR (k)", 1.0, 3.0, 1.5, 0.5)
    a = st.select_slider("α cho đuôi Poisson (chia cho số trận)", [0.01, 0.05, 0.1], 0.05)
    hits, summary = outliers.run(df, alpha=a, k=k)
    st.dataframe(summary, hide_index=True)
    st.dataframe(hits.head(200), hide_index=True)

with t_anom:
    alpha = st.select_slider("α", [0.01, 0.05, 0.10], 0.05)
    g = df.groupby("season").agg(x=("home_win", "sum"), n=("home_win", "size")).reset_index().rename(columns={"season": "group"})
    r = anom.anom_binomial(g, alpha)
    st.line_chart(r.set_index("group")[["p", "LDL", "UDL", "pbar"]])
    st.write("Mùa ngoài vạch:", list(r.group[r.signal != ""]) or "không có")

with t_cusum:
    delta = st.slider("Mức đổi muốn bắt", 0.02, 0.10, 0.05, 0.01)
    h = st.slider("Ngưỡng h", 2.0, 5.0, 3.1, 0.1)
    p0 = df[df.season <= "1999/00"].home_win.mean()               # Phase I: 1997/98–1999/00
    mon = df[df.season >= "2000/01"].sort_values("seq")
    path, alarms = cusum.bernoulli_cusum(mon.home_win.to_numpy(), p0, delta, h)  # gọi lại hàm thật
    st.line_chart(path)                                             # hai cột s_down, s_up
    st.dataframe(pd.DataFrame(alarms), hide_index=True)

with t_sprt:
    season = st.selectbox("Mùa", sorted(df.season.unique()), index=23)
    p0d, draw, p1d = sprt.phase1_params(df, "2016/17", "2018/19")
    p0 = st.slider("p0", 0.35, 0.55, float(round(p0d, 3)), 0.001)
    p1 = st.slider("p1", 0.25, 0.50, float(round(p1d, 3)), 0.001)
    a_ = st.slider("α", 0.01, 0.10, 0.05, 0.01)
    b_ = st.slider("β", 0.05, 0.20, 0.10, 0.01)
    s = df[df.season == season].sort_values("seq")
    r = sprt.sprt(s.home_win.to_numpy(), p0, p1, a_, b_)
    st.line_chart(pd.DataFrame({"LLR": r["llr"], "a": r["a"], "b": r["b"]}, index=range(1, len(s) + 1)))
    st.write(f"Quyết định: {r['decision']} ở trận {r['n']}")
