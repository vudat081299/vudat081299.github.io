#!/bin/sh
# Cổng của masters-degree/class-schedule: dữ liệu khớp lịch gốc, logic giờ, kiểu JSDoc.
set -u
cd "$(git rev-parse --show-toplevel)/masters-degree/class-schedule"
FAIL=0
node tools/verify.mjs || FAIL=1
TSC=$(command -v tsc || true)
[ -z "$TSC" ] && [ -x ../../cashy/node_modules/.bin/tsc ] && TSC=../../cashy/node_modules/.bin/tsc
if [ -n "$TSC" ]; then
  "$TSC" -p tsconfig.json && echo "class-schedule: tsc OK" || FAIL=1
else
  echo "class-schedule: BỎ QUA tsc — chưa có TypeScript"
fi
exit $FAIL
