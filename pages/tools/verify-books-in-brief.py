#!/usr/bin/env python3
"""Cổng kiến thức cho pages/books-in-brief.html.

lint-pages.py bắt thẻ lệch và anchor gãy, nhưng không biết mỗi cuốn còn đi đúng khuôn template-brief, số
"Cuốn n" còn khớp thứ tự, hay một con số trong bài còn tính lại được. Ba phần:

  A. KHUÔN — mỗi article.bk-unit nằm trong một section.bk-shelf, có data-pages, data-toc, tác giả, ý chính
     một dòng ≤ 110 ký tự; năm ô theo đúng thứ tự Luận điểm → Ý chính → Mô hình tư duy → Đọc bản đầy đủ khi
     → Phản biện; Ý chính có 3–7 ý; "Cuốn n" khớp thứ tự trong trang. Mọi id mà trang khác trỏ tới
     (books-in-brief.html#…) phải còn.
  B. CON SỐ TRONG BÀI — tính lại rồi đòi trang có đúng chuỗi ấy: bảng điểm Brier, ví dụ báo mưa, ví dụ tỉ lệ
     nền, giá trị mặc định của các mô hình Sagan, Tetlock, Diamond, Acemoglu, phân phối tinh tinh của Rosling.
  C. LUẬT TRONG MÃ — vài dòng JS then chốt còn nguyên: hằng số đọc của BK CORE, tỉ số hợp lý 10 của Sagan,
     công thức phạt Brier hai phía, hằng số của mô hình độ dài ngày và vòng hồi tiếp.

Chạy:  python3 pages/tools/verify-books-in-brief.py
Exit code: 1 nếu có điều không khớp.
"""
import math
import pathlib
import re
import subprocess
import sys
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[2]
PAGE = ROOT / 'pages' / 'books-in-brief.html'
PAGES = ['pages/books-in-brief.html']
HTML = PAGE.read_text(encoding='utf-8')

fails = []
checks = 0


def ok(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)


def vi(x, d):
    """Số viết kiểu Việt: dấu phẩy thập phân, dấu chấm hàng nghìn."""
    s = f'{x:,.{d}f}'
    return s.replace(',', '_').replace('.', ',').replace('_', '.')


def has(s, msg=None):
    ok(s in HTML, msg or f'thiếu chuỗi trong trang: {s!r}')


# ---------------------------------------------------------------- A. khuôn
VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'track', 'param'}


class Tree(HTMLParser):
    """Dựng cây tối giản: (tag, attrs, children, text)."""

    def __init__(self):
        super().__init__()
        self.root = {'tag': 'root', 'a': {}, 'c': [], 't': []}
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        n = {'tag': tag, 'a': dict(attrs), 'c': [], 't': []}
        self.stack[-1]['c'].append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]['tag'] == tag:
                del self.stack[i:]
                break

    def handle_data(self, d):
        self.stack[-1]['c'].append(d)


def cls(n):
    return (n['a'].get('class') or '').split() if isinstance(n, dict) else []


def walk(n):
    yield n
    if isinstance(n, dict):
        for c in n['c']:
            yield from walk(c)


def text(n):
    return ''.join(x if isinstance(x, str) else text(x) for x in n['c']) if isinstance(n, dict) else n


def find(n, pred):
    return [x for x in walk(n) if isinstance(x, dict) and pred(x)]


t = Tree()
t.feed(HTML)
ids = {x['a']['id'] for x in walk(t.root) if isinstance(x, dict) and 'id' in x['a']}

LABELS = ['Luận điểm', 'Ý chính', 'Mô hình tư duy', 'Đọc bản đầy đủ khi', 'Phản biện']
shelves = find(t.root, lambda x: x['tag'] == 'section' and 'bk-shelf' in cls(x))
ok(len(shelves) >= 4, f'cần ít nhất 4 kệ chủ đề, có {len(shelves)}')
units = find(t.root, lambda x: x['tag'] == 'article' and 'bk-unit' in cls(x))
ok(len(units) >= 10, f'cần ít nhất 10 cuốn, có {len(units)}')
in_shelf = {id(u) for s in shelves for u in find(s, lambda x: x['tag'] == 'article' and 'bk-unit' in cls(x))}
for i, u in enumerate(units, 1):
    uid = u['a'].get('id', f'#{i}')
    ok(id(u) in in_shelf, f'{uid}: không nằm trong section.bk-shelf')
    ok(re.fullmatch(r'[1-9]\d*', u['a'].get('data-pages', '')) is not None, f'{uid}: thiếu data-pages')
    ok(bool(u['a'].get('data-toc')), f'{uid}: thiếu data-toc')
    num = find(u, lambda x: 'bk-unit__num' in cls(x))
    ok(bool(num) and re.match(rf'\s*Cuốn {i}\b', text(num[0])) is not None,
       f'{uid}: số "Cuốn" phải là {i} (thứ tự trong trang), đang là {text(num[0]).split()[:2] if num else None}')
    ok(bool(find(u, lambda x: 'bk-unit__by' in cls(x))), f'{uid}: thiếu .bk-unit__by (tác giả · năm)')
    gist = find(u, lambda x: 'bk-unit__gist' in cls(x))
    ok(bool(gist) and len(text(gist[0]).strip()) <= 110, f'{uid}: .bk-unit__gist thiếu hoặc dài hơn 110 ký tự')
    slots = [c for c in u['c'] if isinstance(c, dict) and 'bk-slot' in cls(c)]
    labels = [text(find(s, lambda x: 'bk-slot__label' in cls(x))[0]).strip() for s in slots]
    ok(labels == LABELS, f'{uid}: các ô phải là {LABELS}, đang là {labels}')
    if len(slots) == 5:
        ok('bk-slot--idea' in cls(slots[0]), f'{uid}: ô Luận điểm thiếu bk-slot--idea')
        ok('bk-slot--limit' in cls(slots[4]), f'{uid}: ô Phản biện thiếu bk-slot--limit')
        ideas = find(slots[1], lambda x: x['tag'] == 'ol' and 'bk-ideas' in cls(x))
        n = len([c for c in ideas[0]['c'] if isinstance(c, dict) and c['tag'] == 'li']) if ideas else 0
        ok(3 <= n <= 7, f'{uid}: Ý chính phải có 3–7 ý, có {n}')
        ok(bool(find(slots[2], lambda x: x['tag'] == 'aside' and 'bk-model' in cls(x))), f'{uid}: thiếu aside.bk-model')

# id mà trang khác trỏ tới
try:
    files = subprocess.run(['git', '-C', str(ROOT), 'ls-files', '*.html', '*.json', '*.md'],
                           capture_output=True, text=True, check=True).stdout.split()
except Exception:
    files = []
for f in files:
    if f.startswith('stuff/') or f == 'pages/books-in-brief.html':
        continue
    try:
        s = (ROOT / f).read_text(encoding='utf-8')
    except Exception:
        continue
    for frag in re.findall(r'books-in-brief\.html#([\w-]+)', s):
        ok(frag in ids, f'{f} trỏ tới books-in-brief.html#{frag}, id ấy không còn')
for b in ['kahneman', 'galef', 'manson', 'cialdini', 'haidt', 'sagan', 'tetlock', 'rosling', 'diamond', 'acemoglu']:
    ok(b in ids, f'mất id #{b} (link cũ và các mục khác trỏ tới)')

# ---------------------------------------------------------------- B. con số
# Bảng Brier: một phía (p − o)², hai phía gấp đôi.
for p, o, one, two in [(0.7, 1, '0,09', '0,18'), (0.7, 0, '0,49', '0,98'), (0.5, None, '0,25', '0,5'), (1.0, 0, '1', '2')]:
    b1 = (p - o) ** 2 if o is not None else 0.25
    ok(abs(b1 - float(one.replace(',', '.'))) < 1e-9 and abs(2 * b1 - float(two.replace(',', '.'))) < 1e-9,
       f'bảng Brier sai ở dòng p={p}')
    has(f'<td>{one}</td><td>{two}</td>')

# Báo mưa: mười ngày mưa ba.
rain = 2 * (3 * (1 - 0.3) ** 2 + 7 * 0.3 ** 2) / 10
sharp = 2 * (3 * (1 - 0.8) ** 2 + 7 * 0.1 ** 2) / 10
has(f'chẳng giúp ai biết hôm nào mang áo mưa: {vi(rain, 2)} điểm')
has(f'10% cho bảy hôm nắng được {vi(sharp, 2)}')

# Tỉ lệ nền: 1% của 13,8 triệu lao động nông nghiệp so với 84 nghìn giảng viên.
farm = round(13.8e6 * 0.01 / 1000)
ok(farm * 1000 > 84000, 'ví dụ tỉ lệ nền không còn đúng chiều')
has(f'là đã có {farm} nghìn người, đông hơn toàn bộ giảng viên')

# Sagan, mặc định: hiếm 1 trong 10.000, 3 bằng chứng tỉ số hợp lý 10.
def bayes(n, k):
    odds = 10 ** k / (n - 1)
    return odds / (1 + odds)
has(f'id="sagan-big">{vi(100 * bayes(10_000, 3), 1)}%<')
need50 = next(k for k in range(20) if bayes(10_000, k) >= 0.5)
need95 = next(k for k in range(20) if bayes(10_000, k) > 0.95)
has(f'Cần {need50} bằng chứng độc lập như thế mới tới 50%, {need95} cái mới qua 95%')
has(f'một chuyện thường ngày (1 trong 10) đã lên {vi(100 * bayes(10, 3), 1)}%')

# Tetlock, mặc định: nghiêng đúng 7/10, nói chắc 90%.
hit, c = 7, 0.9
avg = (hit * 2 * (1 - c) ** 2 + (10 - hit) * 2 * c ** 2) / 10
has(f'id="tetlock-big">{vi(avg, 2)}<')
best = 2 * (0.7 * 0.3 ** 2 + 0.3 * 0.7 ** 2)
has(f'thì nói 70% mới được điểm tốt nhất: {vi(best, 2)}')

# Diamond, mặc định: 2.000 km chếch 50° lên bắc từ 18° Bắc.
north = 2000 * math.sin(math.radians(50))
has(f'2.000 × sin 50° ≈ {vi(north, 0)} km')
has(f'18,0° → {vi(18 + north / 111, 1)}° Bắc')

# Acemoglu, mặc định: A 52, B 48, bước ngoặt ×5 ở thế hệ 4, K = 0,12, 16 thế hệ.
def run(gap, amp):
    """Bước từ thế hệ 4 sang 5 là bước ngoặt (nhân d), các bước khác là vòng hồi tiếp."""
    d = gap / 2
    for step in range(16):
        if step == 4 and amp > 1:
            d = max(-49, min(49, d * amp))
        else:
            d = d + 0.12 * d * (1 - (d / 50) ** 2)
    return 50 + d
a = run(4, 5)
has(f'Thế hệ 16: A {vi(a, 1)} · B {vi(100 - a, 1)}')
has(f'A dừng ở {round(a)}, B ở {round(100 - a)}')
has(f'cách nhau {2 * round(run(4, 1)) - 100} điểm')

# Rosling: số câu đúng của tinh tinh, 5 câu, mỗi câu 1/3.
dist = [100 * math.comb(5, k) * (1 / 3) ** k * (2 / 3) ** (5 - k) for k in range(6)]
shown = ', '.join(str(round(x)) for x in dist[:5]) + ' và ' + vi(dist[5], 1)
has(f'là khoảng {shown}'.replace(', 4 và', ', 4 và'))

# ---------------------------------------------------------------- C. luật trong mã
for s, why in [
    ('wpm: 200,', 'BK CORE: 200 từ/phút'),
    ('wordsPerBookPage: 300', 'BK CORE: 300 từ/trang sách'),
    ('var LR = 10,', 'Sagan: mỗi bằng chứng tốt có tỉ số hợp lý 10'),
    ('var pen = isMiss[i] ? 2 * c * c : 2 * (1 - c) * (1 - c)', 'Tetlock: phạt Brier hai phía'),
    ('var LAT0 = 18, KM_PER_DEG = 111, TILT = 23.44, H0 = -0.833', 'Diamond: hằng số độ dài ngày'),
    ('var K = 0.12, T = 16, J = 4;', 'Acemoglu: vòng hồi tiếp và thế hệ bước ngoặt'),
]:
    ok(s in HTML, f'mất dòng JS then chốt ({why}): {s!r}')
ok('web-builder.css' not in HTML, 'khuôn sách không dùng web-builder.css')

if fails:
    print(f'verify-books-in-brief: {len(fails)} lỗi trên {checks} phép kiểm')
    for f in fails:
        print('  -', f)
    sys.exit(1)
print(f'verify-books-in-brief: OK — {checks} phép kiểm, khuôn từng cuốn và mọi con số tính lại được.')
