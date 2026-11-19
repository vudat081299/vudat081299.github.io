#!/bin/sh
# Cổng của md-annotate/. Cổng không bấm nút: sửa sự kiện hay giao diện thì chạy thêm tools/smoke.cjs.
set -u
cd "$(git rev-parse --show-toplevel)"
python3 md-annotate/tools/lint.py
