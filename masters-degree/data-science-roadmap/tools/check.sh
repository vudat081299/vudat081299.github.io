#!/bin/sh
# Mọi cổng CHẶN của data-science-roadmap/ — lối vào chuẩn, GitHub Actions chạy mọi */tools/check.sh.
# Bộ cổng và ý nghĩa từng cổng: CLAUDE.md của thư mục này, mục "Chạy cổng" và "Cổng tự động".
# Chạy:  sh masters-degree/data-science-roadmap/tools/check.sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$HERE"
# --ci như pre-commit và pre-push: G-ROADMAP và G-TOC-STALE CHẶN chứ không chỉ nhắc. GitHub Actions
# là lớp quyết định deploy (REPO-014), nên roadmap.html lệch nguồn không được lên web.
node tools/gate.mjs --ci
