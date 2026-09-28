#!/bin/sh
# Mọi cổng của cashy/ trong một lệnh — lối vào chuẩn, GitHub Actions chạy mọi */tools/check.sh.
#   1. scripts/check-layers.mjs — ranh giới tầng ui → usecases → domain (data dưới usecases)
#   2. oxlint                   — cần deps (`pnpm install` trong cashy/) và Node ≥ 22
# Thiếu điều kiện cho oxlint thì NÓI RÕ là bỏ qua; không tìm được Node ≥ 20 thì TRƯỢT, vì như thế
# là không kiểm được gì — im lặng qua là cách một cổng chết mà không ai biết.
# Chạy:  sh cashy/tools/check.sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT/cashy"

# node mặc định trên máy có thể là bản cũ do fnm/nvm ghim — dò một node ≥ 20, ưu tiên PATH rồi Homebrew.
NODE=""
MAJOR=0
for cand in node /opt/homebrew/bin/node /opt/homebrew/opt/node/bin/node; do
  command -v "$cand" >/dev/null 2>&1 || continue
  V=$("$cand" -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)
  case "$V" in ''|*[!0-9]*) continue ;; esac
  if [ "$V" -ge 20 ]; then NODE="$cand"; MAJOR="$V"; break; fi
done
if [ -z "$NODE" ]; then
  echo "cashy: TRƯỢT — không tìm thấy Node ≥ 20, nên không kiểm được gì." >&2
  exit 1
fi
PATH="$(dirname "$(command -v "$NODE")"):$PATH"
export PATH

FAIL=0
"$NODE" scripts/check-layers.mjs || FAIL=1
if [ ! -x node_modules/.bin/oxlint ]; then
  echo "cashy: BỎ QUA oxlint — chưa cài deps (chạy 'pnpm install' trong cashy/)."
elif [ "$MAJOR" -lt 22 ]; then
  echo "cashy: BỎ QUA oxlint — Node $MAJOR < 22."
else
  node_modules/.bin/oxlint || FAIL=1
fi
exit "$FAIL"
