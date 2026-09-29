#!/bin/sh
# Cài cả BA lớp tự động cho thư mục này. Chạy một lần cho mỗi máy / mỗi bản clone:
#
#   sh masters-degree/data-science-roadmap/tools/install-hooks.sh
#
# Ba lớp, ba thời điểm khác nhau có chủ ý (xem CLAUDE.md §3):
#   sau mỗi Edit/Write  → Claude Code PostToolUse  → agent tự sửa trong cùng một lượt
#   lúc commit          → git pre-commit           → không để lỗi vào lịch sử
#   lúc push            → git pre-push             → push main là DEPLOY, chặn lần cuối
#
# Hai lớp git KHÔNG được cài riêng ở đây. Repo có nhiều project con, nên .git/hooks/<tên>
# phải là BỘ ĐIỀU PHỐI chung (tools/install-hooks.sh ở gốc repo): một vòng lặp gọi mọi
# */tools/hooks/<tên> mà git theo dõi — tools/hooks/pre-commit và pre-push của thư mục này
# nằm trong số đó. Script này từng tự đặt symlink .git/hooks/<tên> → tools/hooks/<tên>, và
# symlink đó xoá mất cổng của mọi project khác (CLAUDE.md gốc repo, luật bất di bất dịch 3). Giờ nó gọi
# bộ điều phối, nên chạy nó bao nhiêu lần cũng không phá gì.
#
# Hai thứ còn lại vẫn là việc của script này, vì chúng không phải git hook:
#   · hook PostToolUse trong .claude/settings.json — file đó ở gốc repo được git theo dõi
#     và đã mang sẵn hook của thư mục này; bước trộn ở đây giữ cho bản trên máy đúng dù
#     nó từng bị sửa tay, và chạy lại không sinh hook trùng;
#   · .claude/launch.json cho preview — KHÔNG được git theo dõi (của .claude/ chỉ có
#     settings.json, skills/ và rules/ được theo dõi), nên phải cài từ tools/hooks/launch.json sang.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(git -C "$HERE" rev-parse --show-toplevel)

chmod +x "$HERE/hooks/pre-commit" "$HERE/hooks/pre-push" "$HERE/hooks/post-edit.sh" 2>/dev/null || true

# ---- 1. git pre-commit + pre-push: bộ điều phối chung của repo ---------------
# Chạy từ gốc repo: script đó tìm gốc bằng `git rev-parse` theo thư mục đang đứng, và nó
# cài vào `git rev-parse --git-path hooks` — chỗ chung của mọi worktree.
if [ -f "$ROOT/tools/install-hooks.sh" ]; then
  (cd "$ROOT" && sh tools/install-hooks.sh)
  echo "✓ git pre-commit + pre-push → bộ điều phối chung (gọi cả tools/hooks/ của thư mục này)"
else
  echo "· không thấy $ROOT/tools/install-hooks.sh — bỏ qua git hook."
  echo "  Bản clone này cũ hơn bộ điều phối chung: pull rồi chạy lại."
fi

# ---- 2. Claude Code PostToolUse --------------------------------------------
# Trộn từ tools/hooks/claude-settings.json sang .claude/settings.json. Dùng jq để KHÔNG đè
# mất các thiết lập khác trong settings.json (hook của facts/, shop/…).
CS="$ROOT/.claude/settings.json"
HK="$HERE/hooks/claude-settings.json"
if ! command -v jq >/dev/null 2>&1; then
  echo "· không có jq — bỏ qua hook Claude Code. Tự chép phần \"hooks\" trong"
  echo "  tools/hooks/claude-settings.json vào $CS."
else
  mkdir -p "$ROOT/.claude"
  [ -f "$CS" ] || echo '{}' > "$CS"
  # settings.json ở gốc được git theo dõi và là NGUỒN SỰ THẬT của hook này: đã có một hook
  # của thư mục này (nhận ra bằng chuỗi data-science-roadmap trong command) thì KHÔNG ghi lại
  # file. Ghi lại là hai cái hại: dời hook xuống cuối danh sách, sinh một diff vô nghĩa trong
  # file mọi project dùng chung — và nếu ai đó đã sửa hook ở file gốc, thì ĐÈ bản sửa đó bằng
  # bản cũ trong tools/hooks/claude-settings.json.
  if jq -e 'any(.hooks.PostToolUse[]?.hooks[]?; (.command // "") | contains("data-science-roadmap"))' \
       "$CS" >/dev/null 2>&1; then
    echo "✓ Claude Code PostToolUse → tools/hooks/post-edit.sh — đã có sẵn trong $CS"
  else
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
fi

# ---- 3. Cấu hình preview (.claude/launch.json) -----------------------------
# launch.json không được git theo dõi (của .claude/ chỉ settings.json và skills/ được theo
# dõi), nên nó không theo repo về máy mới, và bản cũ còn viết cứng cả đường dẫn repo lẫn /opt/homebrew/bin/python3.11
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
