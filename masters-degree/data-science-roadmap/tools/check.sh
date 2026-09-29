#!/bin/sh
# Cổng của data-science-roadmap/. Commit có file của thư mục này thì hook gốc repo chạy nó; CI chạy
# nó ở mọi lần push (REPO-017). Chạy tay:  sh masters-degree/data-science-roadmap/tools/check.sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TOP=$(CDPATH= cd -- "$HERE/../.." && pwd)
DIR=masters-degree/data-science-roadmap
cd "$HERE"

# --ci: G-TOC-STALE và G-ROADMAP chặn, không chỉ nhắc.
node tools/gate.mjs --ci

# Gọi git từ gốc repo: trong hook, git đặt GIT_DIR mà không đặt GIT_WORK_TREE, nên thư mục đang
# đứng bị coi là gốc và mọi đường dẫn tương đối trỏ trượt.
g() { git -C "$TOP" "$@"; }

# Lúc commit: sửa HTML mà TOC.md / roadmap.html sinh lại chưa add thì bản commit mang bản cũ.
if ! g diff --cached --quiet -- "$DIR/data-science-roadmap.html"; then
  for f in TOC.md roadmap.html; do
    g diff --quiet -- "$DIR/$f" || { echo "check: $DIR/$f đã sinh lại mà chưa add" >&2; exit 1; }
  done
fi

# Test của chính bộ cổng (~15 giây): khi commit chạm tools/, và luôn chạy ở CI.
if [ -n "${CI:-}" ] || ! g diff --cached --quiet -- "$DIR/tools/"; then
  OUT=$(node tools/gate.test.mjs 2>&1) || { printf '%s\n' "$OUT" >&2; exit 1; }
  printf '%s\n' "$OUT" | tail -n 1
fi
