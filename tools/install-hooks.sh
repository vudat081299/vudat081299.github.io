#!/bin/sh
# Cài bộ điều phối hook git cho cả repo. Chạy được nhiều lần, không hại gì.
#
# Repo có nhiều project con, mỗi project một cổng riêng, nên .git/hooks/pre-commit không thể là
# symlink tới một project: cài project sau là xoá mất cổng của project trước. Script này dựng
# một BỘ ĐIỀU PHỐI: lúc chạy, nó gọi lần lượt mọi */tools/hooks/<event> mà git đang theo dõi.
# Mỗi hook con tự lọc theo đường dẫn của nó, nên chạy hết cũng không giẫm chân nhau.
#
# Tìm hook bằng `git ls-files`, KHÔNG bằng `find`. Trong .claude/worktrees/ và trong bản nháp
# của các phiên thường có nguyên một bản sao repo; `find` nhặt cả hook đời cũ của chúng, và mỗi
# hook con từng bị gọi 10–14 lần cho một commit.
#
# Hook nằm ở thư mục chung của mọi worktree (`git rev-parse --git-path hooks`), nên chạy từ
# checkout chính hay từ một worktree đều cài vào cùng một chỗ.
#
# Chạy:  sh tools/install-hooks.sh
set -eu

ROOT=$(git rev-parse --show-toplevel)
HOOKS=$(cd "$ROOT" && git rev-parse --git-path hooks)
case "$HOOKS" in /*) ;; *) HOOKS="$ROOT/$HOOKS" ;; esac
mkdir -p "$HOOKS"

for EVENT in pre-commit pre-push; do
  TARGET="$HOOKS/$EVENT"
  # symlink cũ trỏ thẳng vào một project → thay bằng bộ điều phối
  [ -L "$TARGET" ] && rm -f "$TARGET"
  cat > "$TARGET" <<EOF
#!/bin/sh
# Bộ điều phối — do tools/install-hooks.sh sinh ra. Đừng sửa tay.
# Gọi mọi */tools/hooks/$EVENT mà git đang theo dõi; mỗi hook con tự lọc theo đường dẫn của nó.
set -eu
ROOT=\$(git rev-parse --show-toplevel)

# pre-push nhận danh sách ref trên stdin, và stdin chỉ đọc được một lần — giữ lại một bản
# rồi rót cho từng hook con.
IN=\$(mktemp)
trap 'rm -f "\$IN"' EXIT
[ -t 0 ] || cat > "\$IN"

# Chỉ hook git đang theo dõi. Bản sao repo trong .claude/worktrees/ hay trong bản nháp không
# được chạy. Gom danh sách trước rồi lặp trong chính shell này — "ls-files | while" chạy vòng
# lặp trong subshell nên exit không thoát được hook.
LIST=\$(git -C "\$ROOT" ls-files -- 'tools/hooks/$EVENT' '*/tools/hooks/$EVENT' | sort)
OLDIFS=\$IFS
IFS='
'
for H in \$LIST; do
  IFS=\$OLDIFS
  [ -f "\$ROOT/\$H" ] || continue
  sh "\$ROOT/\$H" "\$@" < "\$IN" || exit \$?
  IFS='
'
done
IFS=\$OLDIFS
EOF
  chmod +x "$TARGET"
  echo "đã cài $TARGET"
done
echo "xong."
