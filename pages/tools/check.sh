#!/bin/sh
# Mọi cổng của pages/ trong một lệnh. tools/check.sh là lối vào chuẩn của mỗi project có cổng;
# GitHub Actions chạy mọi */tools/check.sh nó tìm thấy, nên thêm cổng ở đây là CI tự có.
#   1. lint-pages.py — cổng tĩnh, mọi trang
#   2. run-verify.py — mọi cổng kiến thức pages/tools/verify-*.py
# Chạy:  sh pages/tools/check.sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
FAIL=0
python3 pages/tools/lint-pages.py || FAIL=1
python3 pages/tools/run-verify.py || FAIL=1
exit "$FAIL"
