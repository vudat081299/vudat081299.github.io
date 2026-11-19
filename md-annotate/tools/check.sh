#!/bin/sh
# Cổng của md-annotate/. Cổng không bấm nút: sửa sự kiện hay giao diện thì chạy thêm tools/smoke.cjs.
set -u
cd "$(git rev-parse --show-toplevel)"
python3 md-annotate/tools/lint.py || exit 1
out=$(node md-annotate/tools/test-core.mjs) || { printf '%s\n' "$out" | grep -v '^  ok'; exit 1; }
printf '%s\n' "$out" | tail -1
