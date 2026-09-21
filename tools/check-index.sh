#!/bin/sh
# "Đã xong chưa" cho trang chủ — một lệnh, hai tầng kiểm. Cùng khuôn với
# shop/tools/check.sh; repo này có một cách làm rồi thì đừng bịa cách thứ hai.
#
#   1. lint-collection.py  — dữ liệu: trường bắt buộc, phím trùng, href chết,
#                            trang mồ côi, danh sách WITHHELD.
#   2. smoke-index.js      — mở trình duyệt thật và ĐO.
#
# Tầng 2 mới bắt được thứ tầng 1 mù hoàn toàn: tràn ngang, lệch mép, tương phản
# chữ, lọc tìm kiếm còn trơ tiêu đề rỗng. Thiếu playwright thì tầng 2 tự bỏ qua
# VÀ NÓI RÕ là đã bỏ qua — im lặng bỏ qua một phép kiểm là cách một cổng chết mà
# không ai biết.
#
# Chạy:  sh tools/check-index.sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
PORT=${PORT:-8348}
FAIL=0

printf '\n── 1/2 cổng dữ liệu ──────────────────────────────────────\n'
python3 tools/lint-collection.py || FAIL=1

printf '\n── 2/2 đo trong trình duyệt thật ─────────────────────────\n'
if ! command -v node >/dev/null 2>&1; then
  printf 'BỎ QUA: không có node.\n'
else
  # Máy chủ tạm: trang đọc collection.json bằng fetch, mở file:// là trang rỗng.
  python3 -m http.server "$PORT" >/dev/null 2>&1 &
  SRV=$!
  trap 'kill "$SRV" 2>/dev/null || true' EXIT INT TERM
  i=0
  while [ "$i" -lt 40 ]; do
    if curl -sf -o /dev/null "http://127.0.0.1:$PORT/index.html"; then break; fi
    i=$((i + 1)); sleep 0.1
  done
  # Gói cài toàn cục không nằm trong đường tìm của node khi chạy từ thư mục repo.
  NODE_PATH=${NODE_PATH:-$(npm root -g 2>/dev/null || true)}
  export NODE_PATH
  set +e
  node tools/smoke-index.js "http://127.0.0.1:$PORT/index.html"
  RC=$?
  set -e
  [ "$RC" -eq 1 ] && FAIL=1
  [ "$RC" -eq 2 ] && printf '(tầng 2 đã bỏ qua — cổng dữ liệu vẫn tính)\n'
fi

printf '\n──────────────────────────────────────────────────────────\n'
if [ "$FAIL" -eq 0 ]; then
  printf 'index: XONG.\n\n'
else
  printf 'index: CHƯA XONG — sửa các mục LỖI ở trên.\n\n'
fi
exit "$FAIL"
