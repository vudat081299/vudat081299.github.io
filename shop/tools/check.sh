#!/bin/sh
# Cổng của shop/: kiểm tĩnh — dữ liệu, trang, shell, CSS, liên kết tài liệu. Commit có file trong
# shop/ thì hook gốc repo chạy nó; CI chạy nó cùng shop/tools/smoke.js (REPO-017).
# Chạy:  sh shop/tools/check.sh      (in cả mức XEM: python3 shop/tools/lint-shop.py -v)
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
python3 shop/tools/lint-shop.py
