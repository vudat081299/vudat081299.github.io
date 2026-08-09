#!/bin/sh
# Claude Code PostToolUse hook — chạy cổng fact NGAY khi một agent sửa data.
#
# Vì sao cần, khi đã có pre-commit: agent thường sửa 20 lần rồi mới commit một lần.
# Bắt lỗi ở lần commit nghĩa là nó phải quay lại 20 bước để tìm chỗ hỏng. Bắt ngay ở
# lần sửa thì nó tự sửa lại trong cùng một lượt, còn nhớ mình vừa viết gì.
#
# Nhận JSON của hook trên stdin. Hợp đồng thoát:
#   0  không liên quan, hoặc cổng qua
#   2  cổng CHẶN không qua → stderr được đưa lại cho model đọc và tự sửa
#
# Phạm vi cố ý hẹp: chỉ soi ĐÚNG file vừa sửa, không soi cả thư viện. Nếu soi cả thư viện
# thì mọi lần sửa đều đỏ vì nợ cũ ở file khác, và cổng mất tác dụng.
#
# Đăng ký trong .claude/settings.json (matcher "Edit|Write|MultiEdit").
set -u

FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)
[ -n "$FILE" ] || exit 0

case "$FILE" in
  */facts/data/*.json) ;;
  *) exit 0 ;;
esac

ROOT=${FILE%%/facts/data/*}/facts
[ -f "$ROOT/tools/factlint.py" ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

cd "$ROOT" || exit 0
BASE=$(basename "$FILE")

# manifest.json không chứa fact — sửa nó thì chỉ cần kiểm cấu trúc toàn thư viện.
if [ "$BASE" = "manifest.json" ]; then
  if OUT=$(python3 tools/factlint.py check 2>&1); then
    printf '{"suppressOutput":true,"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"cổng facts: manifest OK."}}\n'
    exit 0
  fi
  printf 'CỔNG FACTS KHÔNG QUA (cấu trúc) — sửa trước khi làm tiếp:\n\n%s\n' "$OUT" >&2
  exit 2
fi

# 1) Cấu trúc: id trùng, cat/sub sai, thiếu src, viz không tồn tại. Toàn thư viện, vì id
#    trùng chỉ phát hiện được khi so với phần còn lại.
if ! SHAPE=$(python3 tools/factlint.py check 2>&1); then
  case "$SHAPE" in
    *'— LỖI ('*)
      printf 'CỔNG FACTS KHÔNG QUA (cấu trúc) — sửa trước khi làm tiếp:\n\n%s\n' \
        "$(printf '%s' "$SHAPE" | sed -n '/— LỖI (/,$p')" >&2
      exit 2 ;;
  esac
  # check trả 1 vì có cặp gần trùng ≥ 0,62 chứ không phải vì lỗi cấu trúc — không chặn,
  # nhưng đếm lại để nhắc ở dưới.
fi
DUPE=$(printf '%s' "$SHAPE" | grep -c '^!! ' || true)

# 2) Cổng định nghĩa §1, chỉ trên file vừa sửa.
if DEF=$(python3 tools/factlint.py verify --file "$BASE" 2>&1); then
  printf '{"suppressOutput":true,"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"cổng facts (%s): định nghĩa OK, %s cặp gần trùng ≥ 0,62 trong cả thư viện."}}\n' \
    "$BASE" "$DUPE"
  exit 0
fi

printf 'CỔNG FACTS KHÔNG QUA — %s có fact trượt định nghĩa (CLAUDE.md §1.1).\nXoá hoặc viết lại chúng trước khi làm tiếp:\n\n%s\n' \
  "$BASE" "$DEF" >&2
exit 2
