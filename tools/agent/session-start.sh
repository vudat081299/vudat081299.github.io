#!/bin/sh
# SessionStart: bật hook git của repo (chạy nhiều lần vô hại). Im lặng khi ổn, in một dòng khi lỗi.
ROOT=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
[ -n "$ROOT" ] && [ -f "$ROOT/tools/install-hooks.sh" ] || exit 0
if ! (cd "$ROOT" && sh tools/install-hooks.sh) >/dev/null 2>&1; then
  echo "⚠ 'sh tools/install-hooks.sh' lỗi — cổng lúc commit đang KHÔNG chạy. Chạy tay lệnh ấy để xem lỗi."
fi
exit 0
