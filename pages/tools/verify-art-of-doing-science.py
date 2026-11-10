#!/usr/bin/env python3
"""Cổng kiến thức cho pages/the-art-of-doing-science-and-engineering.html

Trang nói nhiều con số tính lại được: người say đi ngẫu nhiên (√(2n/π), 0,2n), phép tính
"90% nhà khoa học còn sống", ví dụ mã Hamming (7,4) của chương 12 và câu tự kiểm lật bit 5,
trung bình và entropy của thang chấm, và hình học n chiều (thể tích quả cầu, lớp vỏ, góc
đường chéo, nghịch lý bốn hình tròn). Cổng tính lại từng số và đòi trang có đúng chuỗi ấy.

Cổng cũng kiểm LUẬT trong JS của ba mô hình tương tác: hằng số người say (n = 400, p = 0,6),
quy tắc nhóm kiểm `(i & k)`, từ mã gửi đi và từ nhận được, công thức thể tích và lớp vỏ; và
toạ độ các đường cong trong đồ thị lớp vỏ, các vòng tròn trong hình bốn hình tròn.

Giới hạn đã biết: số trong lời văn được ghim bằng cách đòi một cụm chữ có mặt; cụm lặp lại hai
nơi thì sửa lệch một nơi vẫn xanh.

Chạy:  python3 pages/tools/verify-art-of-doing-science.py [--page khac.html]
Exit code: 1 nếu có phép kiểm không khớp.
"""
import html as _html
import math
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
PAGE = HERE / 'the-art-of-doing-science-and-engineering.html'
PAGES = ['pages/the-art-of-doing-science-and-engineering.html']  # run-verify.py đọc dòng này để biết cổng kiểm trang nào

fails = []
checks = 0
HTML = ''
TEXT = ''


def vi(x, d=2):
    """Số viết theo lối Việt: phẩy thập phân, chấm phân nhóm nghìn."""
    s = f'{x:,.{d}f}' if d else f'{int(round(x)):,}'
    return s.replace(',', '\x00').replace('.', ',').replace('\x00', '.')


def need(label, text, expect=None):
    global checks
    checks += 1
    if text not in HTML and text not in TEXT:
        fails.append(f'{label}: không thấy "{text}"' + (f' (tính được: {expect})' if expect is not None else ''))


def claim(label, ok, why=''):
    global checks
    checks += 1
    if not ok:
        fails.append(f'{label}: {why or "luật trong bài không đúng"}')


# ── Mục 1: người say, tính nhẩm 17 năm ─────────────────────────────────────────
def run_walk():
    n, p = 400, 0.6
    claim('walk · hằng số JS', 'WALK = { n: 400, pDir: 0.6' in HTML, 'JS phải chạy n = 400, p = 0,6 như lời văn')
    e_free = math.sqrt(2 * n / math.pi)  # E|S_n| ≈ √(2n/π) cho bước ±1 công bằng
    need('walk · không hướng', f'√(2n/π) ≈ {round(e_free)} bước', e_free)
    drift = (2 * p - 1) * n               # E S_n = n(2p − 1); |S_n| ≈ S_n vì lệch xa 0
    need('walk · có hướng', f'0,2n = {round(drift)} bước', drift)
    claim('walk · hệ số 0,2', abs((2 * p - 1) - 0.2) < 1e-12)
    need('walk · gấp năm', 'gấp năm lần')
    claim('walk · gấp năm đúng', round(drift / e_free) == 5, f'tỉ số {drift / e_free:.2f}')
    L = 17 * math.log2(10)
    need('17 năm · log₂10', 'log₂10 ≈ 17 × 3,32 ≈ 56 năm', L)
    claim('17 năm · 90% còn sống', abs((1 - 2 ** (-L / 17)) - 0.9) < 1e-9)


# ── Mục 4: mã Hamming (7,4) ───────────────────────────────────────────────────
def encode(data):
    w = [0] * 8
    for pos, b in zip((3, 5, 6, 7), data):
        w[pos] = b
    for k in (1, 2, 4):
        w[k] = sum(w[i] for i in range(1, 8) if i & k and i != k) % 2
    return w[1:]


def syndrome(word):
    s = 0
    for k in (1, 2, 4):
        if sum(word[i - 1] for i in range(1, 8) if i & k) % 2:
            s |= k
    return s


def bits(w):
    return ''.join(map(str, w))


def run_hamming():
    sent = encode([1, 0, 0, 1])
    need('ham · từ mã của 1001', bits(sent), bits(sent))
    claim('ham · từ mã là 0011001', bits(sent) == '0011001')
    recv = sent[:]
    recv[5] ^= 1
    need('ham · nhận', bits(recv))
    s = syndrome(recv)
    claim('ham · hội chứng = 6', s == 6, f'tính được {s}')
    need('ham · đọc 110', f'{s:03b} = {s} → lật bit {s}')
    cover = {k: [i for i in range(1, 8) if i & k] for k in (1, 2, 4)}
    need('ham · nhóm kiểm 1', '(' + ', '.join(map(str, cover[1])) + ')')
    need('ham · nhóm kiểm 2', '(' + ', '.join(map(str, cover[2])) + ')')
    need('ham · nhóm kiểm 4', '(' + ', '.join(map(str, cover[4])) + ')')
    # Mọi lỗi đơn đều đọc ra đúng vị trí.
    for pos in range(1, 8):
        w = sent[:]
        w[pos - 1] ^= 1
        claim(f'ham · lỗi ở bit {pos}', syndrome(w) == pos)
    claim('ham · 2^r = n + 1', 2 ** 3 == 7 + 1)
    # Câu tự kiểm: lật bit 5.
    q = sent[:]
    q[4] ^= 1
    need('ham · tự kiểm nhận', 'Nhận ' + bits(q))
    claim('ham · tự kiểm hội chứng', syndrome(q) == 5)
    need('ham · tự kiểm đọc', f'Đọc {syndrome(q):03b} = 5')
    # Luật trong JS.
    claim('ham · JS SENT', 'var SENT = [0, 0, 1, 1, 0, 0, 1];' in HTML)
    claim('ham · JS recv', 'var recv = [0, 0, 1, 1, 0, 1, 1];' in HTML)
    claim('ham · JS quy tắc nhóm', 'if (i & k) par ^= w[i - 1];' in HTML)
    # Hình SVG: hàng "Nhận" có bit 6 bằng 1 tô cảnh báo; ba kết quả kiểm 0, 1, 1.
    claim('ham · hình kết quả kiểm', re.search(r't-accent t-b" x="336" y="146"[^>]*>0<.*?t-warn t-b" x="336" y="176"[^>]*>1<.*?t-warn t-b" x="336" y="206"[^>]*>1<', HTML, flags=re.S) is not None)


# ── Mục 9: thang chấm ─────────────────────────────────────────────────────────
def run_scale():
    claim('scale · trung bình', (6 + 2) / 2 == 4)
    need('scale · nhãn', 'trung bình 4')
    need('scale · 10 mức', f'log₂10 ≈ {vi(math.log2(10), 2)} bit', math.log2(10))
    need('scale · 3 mức', f'log₂3 ≈ {vi(math.log2(3), 2)} bit', math.log2(3))


# ── Mục 11: n chiều ───────────────────────────────────────────────────────────
def ball(n):
    return math.pi ** (n / 2) / math.gamma(n / 2 + 1)


def shell(n, e):
    return 1 - (1 - e) ** n


def run_ndim():
    peak = max(range(1, 40), key=ball)
    claim('nd · cực đại ở 5 chiều', peak == 5, f'tính được {peak}')
    need('nd · V5', f'khoảng {vi(ball(5), 2)} ở năm chiều', ball(5))
    need('nd · V10', f'{vi(ball(10), 2)} ở mười chiều', ball(10))
    need('nd · V20', f'{vi(ball(20), 3)} ở hai mươi chiều', ball(20))
    need('nd · vỏ 10% n=3', f'{round(100 * shell(3, .1))}% ở ba chiều')
    need('nd · vỏ 10% n=10', f'{round(100 * shell(10, .1))}% ở mười chiều')
    need('nd · vỏ 10% n=100', f'{vi(100 * shell(100, .1), 3)}% ở một trăm chiều', 100 * shell(100, .1))
    need('nd · hình vỏ 1% ở 100 chiều', f'{round(100 * shell(100, .01))}%')
    need('nd · góc 3', f'{vi(math.degrees(math.acos(1 / math.sqrt(3))), 1)}° ở ba chiều')
    need('nd · góc 100', f'{vi(math.degrees(math.acos(1 / math.sqrt(100))), 1)}° ở một trăm chiều')
    need('nd · bán kính giữa 2D', f'√2 − 1 ≈ {vi(math.sqrt(2) - 1, 2)}')
    for n, d in ((3, 2), (4, 2), (9, 2), (10, 2)):
        need(f'nd · bảng bán kính n={n}', f'>{vi(math.sqrt(n) - 1, d)}')
    claim('nd · 9 chiều chạm hộp', math.sqrt(9) - 1 == 2)
    claim('nd · 10 chiều lòi ra', math.sqrt(10) - 1 > 2)
    need('nd · 2^10', vi(2 ** 10, 0) + ' quả cầu nhỏ')
    need('nd · cos 768', f'1/√768 ≈ {vi(1 / math.sqrt(768), 3)}')
    # Đồ thị lớp vỏ: X = 46 + 95·log10 n, Y = 170 − 140·f.
    ns = [1, 1.5, 2, 3, 4, 5, 7, 10, 14, 20, 30, 40, 50, 70, 100, 140, 200, 300, 400, 500, 700, 1000]
    for e in (0.1, 0.01):
        pts = ' '.join(f'{46 + 95 * math.log10(n):.1f},{170 - 140 * shell(n, e):.1f}' for n in ns)
        claim(f'nd · đường cong vỏ {e:.0%}', f'points="{pts}"' in HTML, 'toạ độ đồ thị không khớp công thức')
    # Hình bốn hình tròn: cạnh 4 = 148 px, nên 1 đơn vị = 37 px.
    claim('nd · hình tròn giữa', f'r="{37 * (math.sqrt(2) - 1):.1f}"' in HTML)
    # Luật JS.
    claim('nd · JS thể tích', 'v[k] = v[k - 2] * 2 * Math.PI / k' in HTML)
    claim('nd · JS lớp vỏ', 'return 1 - Math.pow(1 - e, n);' in HTML)
    claim('nd · JS bán kính giữa', 'Math.sqrt(n) - 1' in HTML)


# ── Mục 6, đầu trang ──────────────────────────────────────────────────────────
def run_misc():
    h = 101325 / (1000 * 9.80665)
    need('bơm · cột nước', f'chừng {vi(h, 1)} m', h)
    claim('bơm · 33 feet ≈ 10 m', abs(33 * 0.3048 - 10) < 0.1)
    m = re.search(r'class="bk-hero[^"]*" data-pages="(\d+)"', HTML)
    claim('đầu trang · 432 trang (Stripe Press 2020)', m is not None and m.group(1) == '432')


def main():
    global HTML, TEXT, PAGE
    args = sys.argv[1:]
    if '--page' in args:
        PAGE = pathlib.Path(args[args.index('--page') + 1]).resolve()
    HTML = PAGE.read_text(encoding='utf-8')
    body = re.sub(r'<(script|style)\b[^>]*>.*?</\1\s*>', ' ', HTML, flags=re.S | re.I)
    TEXT = re.sub(r'\s+', ' ', _html.unescape(re.sub(r'<[^>]+>', '', body)))
    for fn in (run_walk, run_hamming, run_scale, run_ndim, run_misc):
        fn()
    if fails:
        print(f'verify-art-of-doing-science: {len(fails)}/{checks} phép kiểm KHÔNG khớp')
        for f in fails:
            print('  ✗', f)
        sys.exit(1)
    print(f'verify-art-of-doing-science: {checks}/{checks} phép kiểm khớp')


if __name__ == '__main__':
    main()
