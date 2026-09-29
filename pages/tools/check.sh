#!/bin/sh
# Cổng của pages/: lint HTML chung, rồi mọi cổng kiến thức verify-*.py.
set -u
cd "$(git rev-parse --show-toplevel)"
FAIL=0
python3 pages/tools/lint-pages.py || FAIL=1
set -- pages/tools/verify-*.py
[ -e "$1" ] || { echo "pages: không tìm thấy pages/tools/verify-*.py nào"; exit 1; }
for v in "$@"; do python3 "$v" || FAIL=1; done
exit $FAIL
