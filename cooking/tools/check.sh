#!/bin/sh
# Mọi cổng của cooking/ trong một lệnh — lối vào chuẩn, GitHub Actions chạy mọi */tools/check.sh.
#   lint-cooking.py — cổng HTML chung + mọi cooking/data/*.json
# Chạy:  sh cooking/tools/check.sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
python3 cooking/tools/lint-cooking.py
