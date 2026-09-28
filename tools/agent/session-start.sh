#!/bin/sh
# SessionStart — việc đầu tiên của mọi phiên, để agent khỏi phải nhớ.
#
# Dựng lại bộ điều phối hook git (chạy nhiều lần vô hại). Thiếu nó thì lớp cổng lúc commit và
# lúc push không tồn tại trên máy này — trước đây đó là một dòng chữ trong CLAUDE.md, và phiên
# nào quên đọc thì phiên ấy commit không qua cổng nào.
#
# stdout của SessionStart đi thẳng vào ngữ cảnh của agent, nên im lặng khi mọi thứ ổn và chỉ in
# đúng một dòng khi có chuyện.
ROOT=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
[ -n "$ROOT" ] && [ -f "$ROOT/tools/install-hooks.sh" ] || exit 0
if ! (cd "$ROOT" && sh tools/install-hooks.sh) >/dev/null 2>&1; then
  echo "⚠ Không cài được hook git — lệnh 'sh tools/install-hooks.sh' lỗi, nên cổng lúc commit/push đang KHÔNG chạy. Chạy tay lệnh ấy để xem lỗi."
fi
exit 0
