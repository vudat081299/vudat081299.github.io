#!/bin/sh
# Mọi cổng của cashy/ trong một lệnh; commit và CI chạy nó.
#   1. scripts/check-layers.mjs — ranh giới tầng ui → usecases → domain (data dưới usecases)
#   2. tsc -b                   — kiểm kiểu, đúng bước đầu của `pnpm build` lúc deploy
#   3. vitest run               — unit test
#   4. oxlint                   — cần Node ≥ 22
# 2–4 cần deps (`pnpm install` trong cashy/): chưa cài thì nói rõ là bỏ qua. Không có Node ≥ 20 thì trượt.
# Chạy:  sh cashy/tools/check.sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT/cashy"

# node trên PATH có thể là bản cũ do fnm/nvm ghim: thử Homebrew trước, rồi mới tới PATH.
NODE=""
MAJOR=0
for cand in /opt/homebrew/bin/node /opt/homebrew/opt/node/bin/node node; do
  command -v "$cand" >/dev/null 2>&1 || continue
  V=$("$cand" -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)
  case "$V" in ''|*[!0-9]*) continue ;; esac
  if [ "$V" -ge 20 ]; then NODE="$cand"; MAJOR="$V"; break; fi
done
if [ -z "$NODE" ]; then
  echo "cashy: TRƯỢT — không tìm thấy Node ≥ 20, nên không kiểm được gì." >&2
  exit 1
fi
# Các lệnh trong node_modules/.bin gọi `node` theo PATH, nên đặt node vừa chọn lên đầu.
PATH="$(dirname "$(command -v "$NODE")"):$PATH"
export PATH

FAIL=0
"$NODE" scripts/check-layers.mjs || FAIL=1
if [ ! -d node_modules ]; then
  echo "cashy: BỎ QUA tsc -b, vitest và oxlint — chưa cài deps (chạy 'pnpm install' trong cashy/)."
  exit "$FAIL"
fi
node_modules/.bin/tsc -b || FAIL=1
node_modules/.bin/vitest run || FAIL=1
if [ "$MAJOR" -lt 22 ]; then
  echo "cashy: BỎ QUA oxlint — Node $MAJOR < 22."
else
  node_modules/.bin/oxlint || FAIL=1
fi
exit "$FAIL"
