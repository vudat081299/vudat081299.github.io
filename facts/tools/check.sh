#!/bin/sh
# Mọi cổng của facts/ trong một lệnh — lối vào chuẩn, GitHub Actions chạy mọi */tools/check.sh.
#   factlint.py check  — cấu trúc, trùng lặp
#   factlint.py verify — cổng định nghĩa (CLAUDE.md §1)
# Chạy:  sh facts/tools/check.sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
FAIL=0
python3 facts/tools/factlint.py check || FAIL=1
python3 facts/tools/factlint.py verify || FAIL=1
exit "$FAIL"
