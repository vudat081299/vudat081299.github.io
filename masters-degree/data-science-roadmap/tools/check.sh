#!/bin/sh
# Mọi cổng CHẶN của data-science-roadmap/ — lối vào chuẩn, GitHub Actions chạy mọi */tools/check.sh.
# Bộ cổng và ý nghĩa từng cổng: CLAUDE.md của thư mục này, mục "Chạy cổng" và "Cổng tự động".
# Chạy:  sh masters-degree/data-science-roadmap/tools/check.sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$HERE"
node tools/gate.mjs
