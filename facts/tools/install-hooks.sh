#!/bin/sh
# Cài cổng git cho facts/.
#
# Repo này chứa nhiều project con, mỗi project có cổng riêng, nên .git/hooks/pre-commit
# không thể là symlink tới một project. Script này dựng một BỘ ĐIỀU PHỐI: nó gọi lần lượt
# mọi */tools/hooks/<event> tìm được. Mỗi hook con tự lọc theo đường dẫn nên chạy hết cũng
# không giẫm chân nhau, và hook cũ của data-science-roadmap vẫn chạy y như trước.
#
# Lưu ý: chạy masters-degree/data-science-roadmap/tools/install-hooks.sh sẽ đặt lại symlink
# và làm mất bộ điều phối. Chạy lại script này là xong.
#
# Chạy:  sh facts/tools/install-hooks.sh
set -eu

ROOT=$(git rev-parse --show-toplevel)
HOOKS="$ROOT/.git/hooks"
mkdir -p "$HOOKS"

for EVENT in pre-commit pre-push; do
  TARGET="$HOOKS/$EVENT"
  # symlink cũ trỏ thẳng vào một project → thay bằng bộ điều phối
  [ -L "$TARGET" ] && rm -f "$TARGET"
  cat > "$TARGET" <<EOF
#!/bin/sh
# Bộ điều phối — do facts/tools/install-hooks.sh sinh ra. Đừng sửa tay.
# Gọi mọi */tools/hooks/$EVENT trong repo; mỗi hook con tự lọc theo đường dẫn của nó.
set -eu
ROOT=\$(git rev-parse --show-toplevel)

# pre-push nhận danh sách ref trên stdin, và stdin chỉ đọc được một lần — giữ lại một bản
# rồi rót cho từng hook con.
IN=\$(mktemp)
trap 'rm -f "\$IN"' EXIT
[ -t 0 ] || cat > "\$IN"

# Không dùng "find | while" — vòng lặp sau ống chạy trong subshell nên exit không thoát
# được hook. Gom danh sách trước rồi lặp trong chính shell này.
LIST=\$(find "\$ROOT" -path "\$ROOT/.git" -prune -o -path '*/tools/hooks/$EVENT' -type f -print | sort)
OLDIFS=\$IFS
IFS='
'
for H in \$LIST; do
  IFS=\$OLDIFS
  sh "\$H" "\$@" < "\$IN" || exit \$?
  IFS='
'
done
IFS=\$OLDIFS
EOF
  chmod +x "$TARGET"
  echo "đã cài $TARGET"
done

chmod +x "$ROOT/facts/tools/hooks/pre-commit" 2>/dev/null || true
chmod +x "$ROOT/facts/tools/hooks/post-edit.sh" 2>/dev/null || true
echo "xong."
