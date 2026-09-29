#!/bin/sh
# Cổng của gốc repo: cấu trúc, sổ quyết định, danh mục trang chủ.
set -u
cd "$(git rev-parse --show-toplevel)"
FAIL=0
python3 tools/lint-structure.py || FAIL=1
python3 tools/decisions.py check || FAIL=1
python3 tools/lint-collection.py || FAIL=1
exit $FAIL
