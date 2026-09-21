#!/bin/sh
# Claude Code PostToolUse hook — cổng lớp 1 cho shop/.
#
# Vì sao cần, khi đã có pre-commit: agent thường sửa 20 lần rồi mới commit một lần. Bắt lỗi
# ở lần commit nghĩa là phải lần ngược 20 bước để tìm chỗ hỏng. Bắt ngay ở lần sửa thì nó tự
# sửa trong cùng một lượt, còn nhớ mình vừa viết gì.
#
# Lớp này CÓ LỖ và phải biết là có: thay đổi viết bằng `python3 - <<EOF` hay `sed` không đi
# qua tool Edit/Write nên hook không thấy. Lớp 2 (pre-commit) bịt lỗ đó. Đừng bỏ lớp 2.
#
# Nhận JSON của hook trên stdin. Hợp đồng thoát:
#   0  không liên quan, hoặc cổng qua
#   2  cổng CHẶN → stderr được đưa lại cho model đọc và tự sửa
set -u

FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)
[ -n "$FILE" ] || exit 0

case "$FILE" in
  */shop/*) ;;
  *) exit 0 ;;
esac

ROOT=${FILE%%/shop/*}/shop
[ -f "$ROOT/tools/lint-shop.py" ] || exit 0
command -v python3 >/dev/null 2>&1 || exit 0

# Cổng soi cả thư mục chứ không soi riêng file vừa sửa — cố ý. Ba phép kiểm đắt nhất của nó
# là phép so CHÉO giữa các file: shell phải giống nhau giữa 5 trang, chữ trong data không được
# rò lên HTML, liên kết markdown phải tới đích. Soi một file thì không thấy được cái nào.
if OUT=$(python3 "$ROOT/tools/lint-shop.py" 2>&1); then
  exit 0
fi

printf 'CỔNG SHOP KHÔNG QUA — sửa trước khi làm tiếp:\n\n%s\n' "$OUT" >&2
printf '\nNhắc: cổng này chỉ bắt được cú pháp và dữ liệu. Sửa xong thì chạy\n' >&2
printf '  sh shop/tools/check.sh\n' >&2
printf 'để kiểm cả hành vi trong trình duyệt thật.\n' >&2
exit 2
