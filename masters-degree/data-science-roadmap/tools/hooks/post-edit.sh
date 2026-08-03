#!/bin/sh
# Claude Code PostToolUse hook — chạy cổng NGAY khi một agent sửa trang DS.
#
# Vì sao cần, khi đã có pre-commit: agent thường sửa 20 lần rồi mới commit một lần.
# Bắt lỗi ở lần commit nghĩa là nó phải quay lại 20 bước để tìm chỗ hỏng. Bắt ngay ở
# lần sửa thì nó tự sửa lại trong cùng một lượt, còn nhớ mình vừa làm gì.
#
# Nhận JSON của hook trên stdin. Hợp đồng thoát:
#   0  không liên quan, hoặc cổng qua
#   2  cổng CHẶN không qua → stderr được đưa lại cho model đọc và tự sửa
#
# Đăng ký trong .claude/settings.json (matcher "Edit|Write|MultiEdit").
set -u

FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)
[ -n "$FILE" ] || exit 0

# Chỉ quan tâm trang DS và bộ cổng của nó. Sửa CLAUDE.md / HANDOFF.md / TOC.md thì
# không chạy — TOC.md do chính cổng ghi ra, chạy lại sẽ thành vòng lặp.
case "$FILE" in
  */data-science-roadmap/data-science-roadmap.html) ;;
  */data-science-roadmap/tools/*.mjs|*/data-science-roadmap/tools/*.json) ;;
  *) exit 0 ;;
esac

DIR=${FILE%%/data-science-roadmap/*}/data-science-roadmap
[ -f "$DIR/tools/gate.mjs" ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

cd "$DIR" || exit 0

if OUT=$(node tools/gate.mjs 2>&1); then
  # Cổng chặn đã qua. Làm mới số dòng trong TOC.md — thuần máy móc, và làm ngay ở đây
  # thì mục lục không bao giờ bị bỏ lại phía sau. Nếu cấu trúc đổi thì nhánh dưới đã
  # chặn từ trước, nên chỗ này không bao giờ ghi đè một thay đổi cần người xem xét.
  node tools/gate.mjs --write >/dev/null 2>&1
  # Khuyến nghị mới sinh ra thì nói, nhưng không chặn.
  ADV=$(node tools/gate.mjs --advice 2>&1 | grep -c '^  · ' || true)
  printf '{"suppressOutput":true,"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"cổng data-science-roadmap: qua (%s khuyến nghị — `node tools/gate.mjs --advice`). TOC.md đã làm mới số dòng."}}\n' "$ADV"
  exit 0
fi

printf 'CỔNG data-science-roadmap KHÔNG QUA — sửa trước khi làm tiếp:\n\n%s\n' "$OUT" >&2
exit 2
