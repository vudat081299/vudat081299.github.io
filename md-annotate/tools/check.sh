#!/bin/sh
# Cổng của md-annotate/. test-core.mjs và smoke.cjs đang tạm dừng (MDAN-083); sửa lớn thì bật lại cả hai.
set -u
cd "$(git rev-parse --show-toplevel)"
python3 md-annotate/tools/lint.py || exit 1
# Tạm dừng (MDAN-083). Bật lại: bỏ dấu # ở hai dòng dưới.
# out=$(node md-annotate/tools/test-core.mjs) || { printf '%s\n' "$out" | grep -v '^  ok'; exit 1; }
# printf '%s\n' "$out" | tail -1
