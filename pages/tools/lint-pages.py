#!/usr/bin/env python3
"""Cổng chất lượng cho pages/ — các trang HTML tự chứa, mỗi trang một file.

Vì sao cần: mỗi trang ở đây là một tài liệu dài hàng nghìn dòng, tự chứa cả CSS lẫn JS inline,
và push main = deploy thẳng lên GitHub Pages. Không có build step nào bắt lỗi hộ, nên một anchor
gãy hay một id trùng sẽ ra web mà không ai biết.

Các phép kiểm nằm ở tools/htmlcheck.py, dùng chung với cooking/tools/lint-cooking.py. File này
giữ phần của riêng pages/: bảng nợ DEBT và cách chọn trang để kiểm.

Hai mức, theo đúng quy ước của factlint.py:
  · LỖI  — chặn commit. Sai khách quan, sửa được ngay.
  · XEM  — chỉ cảnh báo. Đáng nhìn nhưng không đủ chắc để chặn.

Chạy:
  python3 pages/tools/lint-pages.py          # tất cả trang
  python3 pages/tools/lint-pages.py a.html   # vài trang cụ thể
  python3 pages/tools/lint-pages.py -v       # in cả mức XEM

Exit code: 1 nếu có LỖI, 0 nếu không.
"""
import pathlib
import sys

# Nạp bộ kiểm chung ở tools/ của gốc repo. Tắt .pyc: repo không bỏ qua __pycache__/, và mỗi lần
# chạy cổng không được để lại file lạ trong cây làm việc.
sys.dont_write_bytecode = True
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'tools'))
import htmlcheck  # noqa: E402

PAGES_DIR = pathlib.Path(__file__).resolve().parent.parent

# ── Nợ kỹ thuật, ghi thẳng vào repo thay vì để trong đầu ai ────────────────────
# Ba phép kiểm bánh cóc (svg_vo_danh, hut_cap, nhan_tieng_anh — xem tools/htmlcheck.py) đã
# sạch trên phần lớn trang. Vài trang cũ còn nợ; ghi đúng số đang nợ ở đây: trang KHÔNG có tên
# trong bảng thì phải bằng 0, trang có tên thì chỉ được phép giữ nguyên hoặc giảm — tăng là LỖI.
# Dọn xong một trang thì xoá dòng của nó đi, đừng nới số lên.
DEBT = {
    'svg_vo_danh': {'scooter-maintenance-guide.html': 63},
    'hut_cap':     {'cryptography.html': 15, 'relativity.html': 3,
                    'scooter-maintenance-guide.html': 2},
    'nhan_tieng_anh': {'cryptography.html': 3},
}


def main(argv):
    verbose, names = htmlcheck.parse_args(argv)

    if names:
        targets = []
        for n in names:
            p = pathlib.Path(n)
            if not p.is_absolute():
                p = PAGES_DIR / pathlib.Path(n).name
            if p.suffix == '.html' and p.exists():
                targets.append(p)
    else:
        targets = sorted(PAGES_DIR.glob('*.html'))

    if not targets:
        print('lint-pages: không có trang nào để kiểm.')
        return 0

    total_err = 0
    total_note = 0
    for path in targets:
        errors, notes = htmlcheck.check_page(path, DEBT)
        total_err += len(errors)
        total_note += len(notes)
        htmlcheck.print_result(path.name, errors, notes, verbose)

    print()
    if total_note and not verbose:
        print(f'{total_note} mục mức XEM (thêm -v để xem).')
    if total_err:
        print(f'pages: {total_err} LỖI trên {len(targets)} trang.')
        return 1
    print(f'pages: OK ({len(targets)} trang).')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
