#!/bin/sh
# Cài cả BA lớp tự động cho repo này. Chạy một lần cho mỗi máy / mỗi bản clone:
#
#   masters-degree/data-science-roadmap/tools/install-hooks.sh
#
# Ba lớp, ba thời điểm khác nhau có chủ ý (xem CLAUDE.md §3):
#   sau mỗi Edit/Write  → Claude Code PostToolUse  → agent tự sửa trong cùng một lượt
#   lúc commit          → git pre-commit           → không để lỗi vào lịch sử
#   lúc push            → git pre-push             → push main là DEPLOY, chặn lần cuối
#
# Vì sao phải có script: cả .git/hooks/ và .claude/ đều KHÔNG được git theo dõi
# (.claude/ nằm trong .gitignore), nên hook không thể tự theo repo về máy mới. Nguồn sự
# thật là các file được theo dõi trong tools/hooks/; script này chỉ nối chúng vào chỗ
# git và Claude Code thật sự đọc.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$HERE" rev-parse --show-toplevel)

chmod +x "$HERE/hooks/pre-commit" "$HERE/hooks/pre-push" "$HERE/hooks/post-edit.sh" 2>/dev/null || true

# ---- 1. git pre-commit + pre-push ------------------------------------------
for H in pre-commit pre-push; do
  SRC="$HERE/hooks/$H"
  DST="$ROOT/.git/hooks/$H"
  if [ -e "$DST" ] && ! [ -L "$DST" ]; then
    echo "· đã có $DST (không phải symlink) — KHÔNG ghi đè."
    echo "  tự thêm dòng này vào hook hiện có:"
    echo "    sh masters-degree/data-science-roadmap/tools/hooks/$H || exit 1"
  else
    ln -sf "$SRC" "$DST"
    echo "✓ git $H → tools/hooks/$H"
  fi
done

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

# ---- 3. Cấu hình preview (.claude/launch.json) -----------------------------
# Cùng vấn đề như settings.json: .claude/ bị gitignore nên launch.json không theo repo
# về máy mới, và bản cũ còn viết cứng cả đường dẫn repo lẫn /opt/homebrew/bin/python3.11
# — hai thứ chỉ đúng trên đúng một máy. Nguồn giờ là tools/hooks/launch.json (được git
# theo dõi), chỗ này thay __REPO_ROOT__ rồi trộn vào, giữ nguyên configuration khác.
# Cài vào HAI chỗ, và đó là chỗ bản trước làm sai. Preview đọc .claude/launch.json
# theo THƯ MỤC LÀM VIỆC của phiên, mà thư mục đó không cố định: phiên mở ở
# masters-degree/data-science-roadmap thì đọc bản của project, phiên mở ở gốc repo
# (rất thường, vì repo này nhiều project) thì đọc bản ở gốc. Bản trước chỉ ghi vào
# project, nên một phiên mở ở gốc repo gọi preview_start "ds-review" sẽ không tìm
# thấy config và rơi vào config đầu tiên của project khác — đã dính đúng ca đó
# 2026-08-12: nó khởi động "pages-mirror" và trang trả về Error response.
# (git hook và settings.json thì luôn của cả repo nên chỉ đi vào $ROOT.)
PROJ=$(dirname "$HERE")
LSRC="$HERE/hooks/launch.json"
if ! command -v jq >/dev/null 2>&1; then
  echo "· không có jq — bỏ qua launch.json. Tự chép tools/hooks/launch.json sang"
  echo "  $PROJ/.claude/launch.json và $ROOT/.claude/launch.json,"
  echo "  thay __REPO_ROOT__ bằng $ROOT."
else
  SRC=$(mktemp)
  sed "s#__REPO_ROOT__#$ROOT#g" "$LSRC" > "$SRC"
  for D in "$PROJ" "$ROOT"; do
    LJ="$D/.claude/launch.json"
    mkdir -p "$D/.claude"
    [ -f "$LJ" ] || echo '{"version":"0.0.1","configurations":[]}' > "$LJ"
    TMP=$(mktemp)
    # Bỏ configuration cùng tên rồi thêm lại bản mới → chạy nhiều lần không sinh
    # trùng, và KHÔNG chạm config của project khác đang nằm cùng file.
    jq --slurpfile add "$SRC" '
      .version = ($add[0].version // .version // "0.0.1") |
      .configurations = (
        [ (.configurations // [])[] | select(.name != $add[0].configurations[0].name) ]
        + $add[0].configurations
      )
    ' "$LJ" > "$TMP" && mv "$TMP" "$LJ"
    echo "✓ preview ds-review → $LJ  (serve từ $ROOT)"
  done
  rm -f "$SRC"
fi

echo
echo "Thử: cd $ROOT/masters-degree/data-science-roadmap && node tools/gate.mjs"
