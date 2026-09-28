"""Bộ kiểm HTML dùng chung cho các thư mục "một file HTML = một trang": pages/ và cooking/.

Không chạy trực tiếp. `pages/tools/lint-pages.py` và `cooking/tools/lint-cooking.py` nạp file này
và giữ phần riêng của mình: chọn trang nào để kiểm, bảng nợ DEBT của thư mục, dòng tổng kết —
và riêng cooking/ còn kiểm cả `cooking/data/*.json`.

Vì sao một file: hai linter từng là hai bản chép của cùng một bộ kiểm. Khi pages/ có thêm ba
phép kiểm (svg không tên, tiêu đề nhảy cấp, nhãn tiếng Anh trên trang tiếng Việt), bản của
cooking/ không có — thư mục ấy mất phép kiểm mà không ai hay, vì cổng vẫn xanh. Sửa một lớp lỗi
ở đây là cả hai thư mục cùng được.

Hai mức, theo đúng quy ước của factlint.py:
  · LỖI  — chặn commit. Sai khách quan, sửa được ngay.
  · XEM  — chỉ cảnh báo. Đáng nhìn nhưng không đủ chắc để chặn.

Ba phép kiểm svg_vo_danh / hut_cap / nhan_tieng_anh chạy theo kiểu BÁNH CÓC. Mỗi linter truyền
vào bảng DEBT của thư mục mình, dạng {phép kiểm: {tên file: số chỗ đang nợ}}. Trang không có tên
trong bảng thì phải bằng 0; trang có tên thì chỉ được giữ nguyên hoặc giảm — tăng là LỖI. Dọn
xong một trang thì xoá dòng của nó đi, đừng nới số lên. Bảng nằm trong linter của từng thư mục,
không nằm ở đây: nợ của pages/ không được phép che cho một trang cùng tên ở cooking/.
"""
import collections
import pathlib
import re

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

# Ký tự có dấu tiếng Việt — dùng để biết một chuỗi có phải tiếng Việt hay không.
VN_CHARS = set('àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ')

RE_SVG_OPEN = re.compile(r'<svg\b[^>]*>', re.I)
RE_HEADING = re.compile(r'<(h[1-6])\b', re.I)
RE_ARIA_LABEL = re.compile(r'aria-label="([^"]{3,60})"')
# Nhãn "chỉ toàn chữ Latin không dấu" — đủ để bắt Home / Open menu / Light / dark,
# mà không đụng vào tên riêng tiếng Anh nằm trong một câu tiếng Việt.
RE_PLAIN_LATIN = re.compile(r'[\w\s\-/&().,:0-9×+%]+$')


def parse_args(argv):
    """(verbose, danh sách tên file) — mọi đối số bắt đầu bằng '-' là cờ."""
    verbose = '-v' in argv or '--verbose' in argv
    return verbose, [a for a in argv if not a.startswith('-')]


def strip_code(html: str) -> str:
    """Trả về phần markup thuần — không script, không style, không comment."""
    out = RE_COMMENT.sub(' ', html)
    out = RE_SCRIPT.sub(' ', out)
    out = RE_STYLE.sub(' ', out)
    return out


def ratchet(kind, page_name, found, debt, errors, notes):
    """Bánh cóc: trang chưa có nợ phải bằng 0; trang đang nợ chỉ được giảm."""
    allowed = debt.get(kind, {}).get(page_name, 0)
    if found > allowed:
        errors.append(f'{kind}: {found} chỗ, mức cho phép của trang này là {allowed}')
    elif found < allowed:
        notes.append(f'{kind}: còn {found}/{allowed} — đã dọn bớt, hạ số trong DEBT xuống {found}')


def check_page(path: pathlib.Path, debt=None):
    """Soi một trang. Trả về (danh sách LỖI, danh sách XEM). `debt`: bảng nợ của thư mục."""
    debt = debt or {}
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

    # ── LỖI 5: <svg> không có tên tiếp cận ─────────────────────────────────────
    # Các trang này dạy bằng hình. Một <svg> không có aria-label / <title> / aria-labelledby
    # thì trình đọc màn hình bỏ qua hẳn, và nội dung hình biến mất với người dùng đó. Icon
    # trang trí nằm trong nút đã có nhãn thì đánh aria-hidden="true" — cũng tính là đã xử lý.
    bare_svg = 0
    for m in RE_SVG_OPEN.finditer(markup):
        tag = m.group(0)
        if any(a in tag for a in ('aria-label', 'aria-labelledby', 'aria-hidden')):
            continue
        end = markup.find('</svg>', m.end())
        if end > 0 and '<title' in markup[m.end():end]:
            continue
        bare_svg += 1
    ratchet('svg_vo_danh', path.name, bare_svg, debt, errors, notes)

    # ── LỖI 6: cây tiêu đề hụt cấp ─────────────────────────────────────────────
    # h2 nhảy thẳng xuống h4 làm người duyệt trang bằng phím theo cấp tiêu đề mất phương
    # hướng. Chỉ bắt chiều đi XUỐNG quá một bậc; đi ngược lên bao nhiêu bậc cũng hợp lệ.
    # Chỉ thấy tiêu đề viết sẵn trong HTML; tiêu đề do JS dựng lúc chạy nằm ngoài tầm cổng này.
    levels = [int(t[1]) for t in RE_HEADING.findall(markup)]
    jumps = sum(1 for i in range(1, len(levels)) if levels[i] > levels[i - 1] + 1)
    ratchet('hut_cap', path.name, jumps, debt, errors, notes)

    # ── LỖI 7: nhãn điều khiển còn tiếng Anh trên trang lang="vi" ──────────────
    # aria-label là thứ người dùng NGHE. Trang tiếng Việt mà nút đọc lên thành "Open menu"
    # là lệch ngôn ngữ. Chỉ soi nhãn thuần chữ Latin không dấu, nên "Sáng / Tối" hay một câu
    # tiếng Việt có kèm tên riêng tiếng Anh đều không bị bắt nhầm.
    en_labels = 0
    if re.search(r'<html[^>]*lang="vi"', raw, re.I):
        for m in RE_ARIA_LABEL.finditer(markup):
            value = m.group(1)
            if VN_CHARS & set(value.lower()):
                continue
            if RE_PLAIN_LATIN.match(value) and re.search(r'[A-Za-z]{3}', value):
                en_labels += 1
    ratchet('nhan_tieng_anh', path.name, en_labels, debt, errors, notes)

    # ── XEM: khung trang ───────────────────────────────────────────────────────
    # Mọi trang hiện có đều đủ bốn thứ này. Để mức XEM để trang MỚI thiếu thì được nhắc,
    # không bị chặn.
    if not re.search(r'<html[^>]*\blang=', raw, re.I):
        notes.append('thiếu <html lang="…"> — trình đọc màn hình đọc sai ngôn ngữ')
    if not re.search(r'<meta[^>]+viewport', raw, re.I):
        notes.append('thiếu <meta viewport> — vỡ layout trên điện thoại')
    if not re.search(r'<title\s*>\s*\S', raw, re.I):
        notes.append('thiếu <title> có nội dung')
    if not re.search(r'charset', raw, re.I):
        notes.append('thiếu khai báo charset — tiếng Việt dễ vỡ dấu')

    return errors, notes


def print_result(label, errors, notes, verbose):
    """In kết quả của một file theo khuôn chung: khối LỖI luôn in, khối XEM chỉ khi -v."""
    if errors:
        print(f'\n{label} — LỖI ({len(errors)}):')
        for e in errors:
            print(f'    {e}')
    if notes and verbose:
        print(f'\n{label} — XEM ({len(notes)}):')
        for n in notes:
            print(f'    {n}')
