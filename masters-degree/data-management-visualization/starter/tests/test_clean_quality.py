import pandas as pd
import pytest

from src.clean import norm_referee, parse_date, read_raw
from src.quality import run


def test_dates_two_formats():
    d = parse_date(pd.Series(["14/05/00", "19/12/2020"]))
    assert [str(x) for x in d] == ["2000-05-14", "2020-12-19"]


@pytest.mark.parametrize("raw,canon", [
    ("Wiley, A. G.", "A Wiley"), ("A.G. Wiley", "A Wiley"), ("Alan Wiley ", "A Wiley"),
    ("\xa0U Rennie", "U Rennie"), ("David Ellaray", "D Elleray"), ("l Mason", "L Mason"),
    ("R Madley", "R Madley"), ("A Madley", "A Madley")])      # cùng họ, hai người khác nhau
def test_referee(raw, canon):
    assert norm_referee(raw) == canon


def test_trailing_commas(tmp_path):
    f = tmp_path / "E0_0304.csv"
    f.write_text("Div,Date,HomeTeam\nE0,16/08/03,Arsenal,,,\n,,\n")
    rows, log = read_raw(f)
    assert len(rows) == 1 and log["trimmed_rows"] == 1 and log["empty_rows"] == 1


def test_extra_data_is_not_dropped(tmp_path):
    f = tmp_path / "E0_0304.csv"
    f.write_text("Div,Date,HomeTeam\nE0,16/08/03,Arsenal,1.85\n")
    with pytest.raises(ValueError):
        read_raw(f)


def test_quality_catches_injected_errors():
    df = pd.read_parquet("data/clean/matches.parquet")
    bad = df.copy()
    bad.loc[bad.index[5000], "FTR"] = "A" if bad.FTR.iloc[5000] != "A" else "H"
    bad.loc[bad.index[6000], "HST"] = bad.HS.iloc[6000] + 1
    rep, _ = run(bad)
    v = rep.set_index("rule").violations
    assert v["QB5"] == 1 and v["QF1"] >= 4
