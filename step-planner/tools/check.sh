#!/bin/sh
# Cổng của step-planner/: mẫu và code (lint.py), cú pháp JS, logic thuần (test-core.mjs), rồi bấm thật trong
# Chromium (smoke.cjs) trên một máy chủ HTTP tạm. Thiếu playwright thì smoke BỎ QUA; CI chạy nó ở job smoke.
set -u
cd "$(git rev-parse --show-toplevel)"
python3 step-planner/tools/lint.py || exit 1
out=$(python3 step-planner/tools/lint.py --self-test) || { printf '%s\n' "$out" | grep -v '^  ok'; exit 1; }
# js/ là ES module: `node --check file.js` bỏ qua lỗi cú pháp của file module, nên đọc qua stdin với --input-type=module.
for f in step-planner/js/*.js; do
  node --input-type=module --check < "$f" || { echo "step-planner: lỗi cú pháp $f"; exit 1; }
done
out=$(node step-planner/tools/test-core.mjs) || { printf '%s\n' "$out" | grep -v '^  ok'; exit 1; }
printf '%s\n' "$out" | tail -1

PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1])')
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT INT TERM
i=0
until curl -sf -o /dev/null "http://127.0.0.1:$PORT/step-planner/"; do
  i=$((i + 1)); [ $i -gt 40 ] && { echo "step-planner: máy chủ tạm không lên"; exit 1; }
  sleep 0.25
done
out=$(node step-planner/tools/smoke.cjs "http://127.0.0.1:$PORT/step-planner/"); code=$?
if [ $code -eq 2 ]; then echo "step-planner: BỎ QUA smoke — chưa có playwright"; exit 0; fi
[ $code -ne 0 ] && { printf '%s\n' "$out" | grep -v '^  ok'; exit 1; }
printf '%s\n' "$out" | tail -1
