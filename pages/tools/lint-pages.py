#!/usr/bin/env python3
"""Cổng chất lượng cho pages/ — 8 trang HTML tự chứa, mỗi trang một file.

Vì sao cần: mỗi trang ở đây là một tài liệu dài (1.000–4.700 dòng), tự chứa cả CSS lẫn JS
inline, và push main = deploy thẳng lên GitHub Pages. Không có build step nào bắt lỗi hộ,
nên một anchor gãy hay một id trùng sẽ ra web mà không ai biết.

Hai mức, theo đúng quy ước của factlint.py:
  · LỖI  — chặn commit. Sai khách quan, sửa được ngay.
  · XEM  — chỉ cảnh báo. Đáng nhìn nhưng không đủ chắc để chặn.

Chạy:
  python3 pages/tools/lint-pages.py          # tất cả trang
  python3 pages/tools/lint-pages.py a.html   # vài trang cụ thể
  python3 pages/tools/lint-pages.py -v       # in cả mức XEM

Exit code: 1 nếu có LỖI, 0 nếu không.
"""
import collections
import pathlib
import re
import sys

PAGES_DIR = pathlib.Path(__file__).resolve().parent.parent

# Bóc script/style/comment TRƯỚC khi soi markup. Bắt buộc: các trang này sinh HTML bằng JS
# nên trong <script> có những chuỗi kiểu "href='#' + id + '" — soi thẳng sẽ báo nhầm hàng loạt.
RE_SCRIPT = re.compile(r'<script\b[^>]*>.*?</script\s*>', re.S | re.I)
RE_STYLE = re.compile(r'<style\b[^>]*>.*?</style\s*>', re.S | re.I)
RE_COMMENT = re.compile(r'<!--.*?-->', re.S)

RE_ID = re.compile(r'\bid="([^"]+)"')
RE_ANCHOR = re.compile(r'\bhref="#([^"]*)"')
RE_ASSET = re.compile(r'\b(?:src|href)="([^"]+)"')

# Thẻ container hay bị quên đóng khi cắt-dán một đoạn dài. Không kiểm mọi thẻ: void element
# (<br>, <img>…) và thẻ tự đóng làm phép đếm vô nghĩa.
BALANCED_TAGS = ('div', 'section', 'table', 'ul', 'ol')

# Anchor tới các đích này luôn hợp lệ, không cần id tương ứng.
ANCHOR_WHITELIST = {'', 'top'}


def strip_code(html: str) -> str:
    """Trả về phần markup thuần — không script, không style, không comment."""
    out = RE_COMMENT.sub(' ', html)
    out = RE_SCRIPT.sub(' ', out)
    out = RE_STYLE.sub(' ', out)
    return out


def check_page(path: pathlib.Path):
    """Soi một trang. Trả về (danh sách LỖI, danh sách XEM)."""
    raw = path.read_text(encoding='utf-8', errors='replace')
    markup = strip_code(raw)
    errors, notes = [], []

    # ── LỖI 1: id trùng ────────────────────────────────────────────────────────
    # id phải duy nhất trong một document. Trùng thì getElementById chỉ thấy cái đầu,
    # và anchor #id nhảy sai chỗ.
    ids = RE_ID.findall(markup)
    for name, count in sorted(collections.Counter(ids).items()):
        if count > 1:
            errors.append(f'id trùng {count} lần: id="{name}"')

    # ── LỖI 2: anchor nội bộ gãy ───────────────────────────────────────────────
    idset = set(ids)
    for target in sorted(set(RE_ANCHOR.findall(markup))):
        if target in ANCHOR_WHITELIST:
            continue
        if target not in idset:
            errors.append(f'anchor gãy: href="#{target}" — không có id nào tên vậy')

    # ── LỖI 3: asset nội bộ không tồn tại ──────────────────────────────────────
    for ref in sorted(set(RE_ASSET.findall(markup))):
        if ref.startswith(('#', 'http://', 'https://', '//', 'mailto:', 'data:', 'tel:')):
            continue
        target = (path.parent / ref.split('?', 1)[0].split('#', 1)[0]).resolve()
        if not target.exists():
            errors.append(f'asset thiếu: {ref}')

    # ── LỖI 4: thẻ container lệch mở/đóng ──────────────────────────────────────
    for tag in BALANCED_TAGS:
        opened = len(re.findall(rf'<{tag}\b', markup, re.I))
        closed = len(re.findall(rf'</{tag}\s*>', markup, re.I))
        if opened != closed:
            errors.append(f'<{tag}> lệch: mở {opened} / đóng {closed}')

    # ── XEM: khung trang ───────────────────────────────────────────────────────
    # Cả 8 trang hiện có đủ. Để mức XEM để trang MỚI thiếu thì được nhắc, không bị chặn.
    if not re.search(r'<html[^>]*\blang=', raw, re.I):
        notes.append('thiếu <html lang="…"> — trình đọc màn hình đọc sai ngôn ngữ')
    if not re.search(r'<meta[^>]+viewport', raw, re.I):
        notes.append('thiếu <meta viewport> — vỡ layout trên điện thoại')
    if not re.search(r'<title\s*>\s*\S', raw, re.I):
        notes.append('thiếu <title> có nội dung')
    if not re.search(r'charset', raw, re.I):
        notes.append('thiếu khai báo charset — tiếng Việt dễ vỡ dấu')

    return errors, notes


def main(argv):
    verbose = '-v' in argv or '--verbose' in argv
    names = [a for a in argv if not a.startswith('-')]

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
        errors, notes = check_page(path)
        total_err += len(errors)
        total_note += len(notes)
        if errors:
            print(f'\n{path.name} — LỖI ({len(errors)}):')
            for e in errors:
                print(f'    {e}')
        if notes and verbose:
            print(f'\n{path.name} — XEM ({len(notes)}):')
            for n in notes:
                print(f'    {n}')

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
