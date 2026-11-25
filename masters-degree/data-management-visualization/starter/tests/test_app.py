from streamlit.testing.v1 import AppTest


def test_app_runs_and_sliders_work():
    at = AppTest.from_file("../app/streamlit_app.py", default_timeout=60).run()
    assert not at.exception, at.exception
    at.slider[2].set_value(0.08).run()         # CUSUM: mức đổi
    at.slider[3].set_value(3.9).run()          # CUSUM: h
    assert not at.exception, at.exception
    assert any("H1" in m.value for m in at.markdown)
