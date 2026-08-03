#!/bin/sh
# Cài cả HAI lớp tự động cho repo này. Chạy một lần cho mỗi máy / mỗi bản clone:
#
#   masters-degree/data-science-roadmap/tools/install-hooks.sh
#
# Vì sao phải có script: cả .git/hooks/ và .claude/ đều KHÔNG được git theo dõi
# (.claude/ nằm trong .gitignore), nên hook không thể tự theo repo về máy mới. Nguồn sự
# thật là hai file được theo dõi trong tools/hooks/; script này chỉ nối chúng vào chỗ
# git và Claude Code thật sự đọc.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$HERE" rev-parse --show-toplevel)

# ---- 1. git pre-commit ------------------------------------------------------
SRC="$HERE/hooks/pre-commit"
DST="$ROOT/.git/hooks/pre-commit"
chmod +x "$SRC" "$HERE/hooks/post-edit.sh" 2>/dev/null || true

if [ -e "$DST" ] && ! [ -L "$DST" ]; then
  echo "· đã có $DST (không phải symlink) — KHÔNG ghi đè."
  echo "  tự thêm dòng này vào hook hiện có:"
  echo "    sh masters-degree/data-science-roadmap/tools/hooks/pre-commit || exit 1"
else
  ln -sf "$SRC" "$DST"
  echo "✓ git pre-commit → tools/hooks/pre-commit"
fi

# ---- 2. Claude Code PostToolUse --------------------------------------------
# .claude/ bị gitignore nên phải trộn từ file được theo dõi sang. Dùng jq để KHÔNG đè
# mất các thiết lập khác mà chủ máy đã có trong settings.json.
CS="$ROOT/.claude/settings.json"
HK="$HERE/hooks/claude-settings.json"
if ! command -v jq >/dev/null 2>&1; then
  echo "· không có jq — bỏ qua hook Claude Code. Tự chép phần \"hooks\" trong"
  echo "  tools/hooks/claude-settings.json vào $CS."
else
  mkdir -p "$ROOT/.claude"
  [ -f "$CS" ] || echo '{}' > "$CS"
  TMP=$(mktemp)
  # Lọc bỏ đúng hook cũ của chúng ta (nhận ra bằng chuỗi data-science-roadmap trong
  # command) rồi thêm lại bản mới — chạy script hai lần không sinh hook trùng.
  jq --slurpfile add "$HK" '
    .hooks //= {} |
    .hooks.PostToolUse = (
      [ (.hooks.PostToolUse // [])[]
        | .hooks = [ (.hooks // [])[] | select((.command // "") | contains("data-science-roadmap") | not) ]
        | select((.hooks | length) > 0) ]
      + $add[0].hooks.PostToolUse
    )
  ' "$CS" > "$TMP" && mv "$TMP" "$CS"
  echo "✓ Claude Code PostToolUse → tools/hooks/post-edit.sh  ($CS)"
  echo "  LƯU Ý: Claude Code chỉ nạp lại settings khi mở /hooks hoặc khởi động lại phiên."
fi

echo
echo "Thử: cd $ROOT/masters-degree/data-science-roadmap && node tools/gate.mjs"
