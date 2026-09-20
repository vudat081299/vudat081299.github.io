#!/bin/sh
# "Đã xong chưa" cho shop/ — một lệnh, hai tầng kiểm.
#
#   1. lint-shop.py  — dữ liệu, trang, shell, CSS, liên kết tài liệu.  Bắt được cú pháp.
#   2. smoke.js      — mở trình duyệt thật và BẤM.                      Bắt được hành vi.
#
# Tầng 2 mới là tầng bắt được hai lỗi nặng nhất từng xảy ra ở đây; cả hai đều đi qua tầng 1
# sạch sẽ. Thiếu playwright thì tầng 2 tự bỏ qua và nói rõ là đã bỏ qua — im lặng bỏ qua một
# phép kiểm là cách một cổng chết mà không ai biết.
#
# Chạy:  sh shop/tools/check.sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT"
PORT=${PORT:-8347}
FAIL=0

printf '\n── 1/2 cổng lint ─────────────────────────────────────────\n'
python3 shop/tools/lint-shop.py -v || FAIL=1

printf '\n── 2/2 chạy thật trong trình duyệt ───────────────────────\n'
if ! command -v node >/dev/null 2>&1; then
  printf 'BỎ QUA: không có node.\n'
else
  # Máy chủ tạm: fetch cần HTTP, mở file:// là trang rỗng.
  python3 -m http.server "$PORT" >/dev/null 2>&1 &
  SRV=$!
  trap 'kill "$SRV" 2>/dev/null || true' EXIT INT TERM
  i=0
  while [ "$i" -lt 40 ]; do
    if curl -sf -o /dev/null "http://127.0.0.1:$PORT/shop/"; then break; fi
    i=$((i + 1)); sleep 0.1
  done
  set +e
  node shop/tools/smoke.js "http://127.0.0.1:$PORT/shop/"
  RC=$?
  set -e
  [ "$RC" -eq 1 ] && FAIL=1
  [ "$RC" -eq 2 ] && printf '(tầng 2 đã bỏ qua — cổng lint vẫn tính)\n'
fi

printf '\n──────────────────────────────────────────────────────────\n'
if [ "$FAIL" -eq 0 ]; then
  printf 'shop: XONG. Cập nhật shop/HANDOFF.md rồi commit.\n\n'
else
  printf 'shop: CHƯA XONG — sửa các mục LỖI ở trên.\n\n'
fi
exit "$FAIL"
