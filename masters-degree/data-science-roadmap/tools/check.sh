#!/bin/sh
# Cổng của data-science-roadmap/. Commit có file của thư mục này thì hook gốc repo chạy nó; CI chạy
# nó ở mọi lần push (REPO-017). Chạy tay:  sh masters-degree/data-science-roadmap/tools/check.sh
set -eu
cd "$(dirname "$0")/.."

# --ci: G-TOC-STALE và G-ROADMAP chặn, không chỉ nhắc.
node tools/gate.mjs --ci

# Lúc commit: sửa HTML mà TOC.md / roadmap.html sinh lại chưa add thì bản commit mang bản cũ.
if ! git diff --cached --quiet -- data-science-roadmap.html; then
  for f in TOC.md roadmap.html; do
    git diff --quiet -- "$f" || { echo "check: $f đã sinh lại mà chưa add — git add $f" >&2; exit 1; }
  done
fi

# Test của chính bộ cổng (~15 giây): khi commit chạm tools/, và luôn chạy ở CI.
if [ -n "${CI:-}" ] || ! git diff --cached --quiet -- tools/; then
  OUT=$(node tools/gate.test.mjs 2>&1) || { printf '%s\n' "$OUT" >&2; exit 1; }
  printf '%s\n' "$OUT" | tail -n 2
fi
