#!/usr/bin/env python3
"""Cổng kiến thức cho pages/experimentation-causal-inference.html

Vì sao cần, khác lint-pages.py: trang này nói rất nhiều con số TÍNH LẠI ĐƯỢC — cỡ mẫu
cho một MDE, tỉ lệ báo động giả khi nhìn trộm k lần, χ² của một lần chia lệch, hệ số
thiết kế của thí nghiệm theo cụm, hệ số giảm phương sai của CUPED, ước lượng DiD đọc từ
một bảng 2×2, ước lượng Wald của biến công cụ — và vài LUẬT ("so hai nhóm = tác động +
thiên lệch chọn"). lint-pages.py kiểm được thẻ lệch nhưng không biết 3.841 người mỗi nhóm
có đúng là cỡ mẫu cho MDE 1 điểm phần trăm hay không.

Mỗi phần của trang có một bộ phép kiểm VIẾT TAY RIÊNG (run_p1, run_p2, run_p3, run_ref),
cùng đọc một file trang. Dữ liệu có hạt giống trên trang được dựng lại bằng ĐÚNG bộ sinh
ngẫu nhiên của trang (jsrng/jsgauss là bản chép của rng()/gauss() trong JS), nên con số
nào trên trang sinh từ dữ liệu ấy cũng tính lại được tới từng chữ số hiện ra.

Chỉ dùng thư viện chuẩn, để chạy được trên mọi máy (kể cả máy của GitHub Actions).

Chạy:  python3 pages/tools/verify-causal-inference.py
       python3 pages/tools/verify-causal-inference.py --page khac.html --only p1
Exit code: 1 nếu có con số không khớp.
"""
import html as _html
import math
import pathlib
import re
import statistics
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
PAGE = HERE / 'experimentation-causal-inference.html'

fails = []
checks = 0
HTML = ''
TEXT = ''


def vi(x, d=2):
    """Số viết theo lối Việt: phẩy thập phân, chấm phân nhóm nghìn, và dấu TRỪ
    Unicode (U+2212) — trang dùng ký tự ấy, Python in dấu nối ASCII."""
    s = f'{x:,.{d}f}' if d else f'{int(round(x)):,}'
    return s.replace(',', '\x00').replace('.', ',').replace('\x00', '.').replace('-', '−')


def need(label, text, expect=None):
    """Đòi `text` phải có mặt trong trang (tìm trong HTML thô, rồi trong chữ đã bóc thẻ)."""
    global checks
    checks += 1
    if text not in HTML and text not in TEXT:
        fails.append(f'{label}: không thấy "{text}"' + (f' (tính được: {expect})' if expect is not None else ''))


def num(label, value, d=0, ctx=''):
    """Tính ra `value`, đòi trang có đúng chuỗi ấy (kèm ngữ cảnh nếu cần)."""
    need(label, ctx + vi(value, d), value)


def claim(label, ok, why=''):
    """Đòi một LUẬT phải đúng, không phải một chuỗi phải có mặt."""
    global checks
    checks += 1
    if not ok:
        fails.append(f'{label}: {why or "luật trong bài không đúng"}')


def near(label, got, want, tol, why=''):
    claim(label, abs(got - want) <= tol, f'{why} tính được {got!r}, cần {want!r} ± {tol}')


# ── thống kê, chỉ bằng thư viện chuẩn ──────────────────────────────────────────
_ND = statistics.NormalDist()


def z(q):
    """Phân vị chuẩn: z(0.975) = 1.95996…"""
    return _ND.inv_cdf(q)


def Phi(x):
    return _ND.cdf(x)


def p_two_sided(zv):
    return 2 * (1 - Phi(abs(zv)))


def chi2_sf_df1(x):
    """P(χ²₁ > x) — đúng bằng P(|Z| > √x)."""
    return math.erfc(math.sqrt(x / 2))


def _lgamma(v):
    return math.lgamma(v)


def _betacf(a, b, x):
    MAXIT, EPS, FPMIN = 200, 3e-14, 1e-300
    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    if abs(d) < FPMIN:
        d = FPMIN
    d = 1 / d
    h = d
    for m in range(1, MAXIT + 1):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        d = FPMIN if abs(d) < FPMIN else d
        c = 1 + aa / c
        c = FPMIN if abs(c) < FPMIN else c
        d = 1 / d
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        d = FPMIN if abs(d) < FPMIN else d
        c = 1 + aa / c
        c = FPMIN if abs(c) < FPMIN else c
        d = 1 / d
        de = d * c
        h *= de
        if abs(de - 1) < EPS:
            break
    return h


def betai(a, b, x):
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    bt = math.exp(_lgamma(a + b) - _lgamma(a) - _lgamma(b) + a * math.log(x) + b * math.log(1 - x))
    if x < (a + 1) / (a + b + 2):
        return bt * _betacf(a, b, x) / a
    return 1 - bt * _betacf(b, a, 1 - x) / b


def tcdf(t, df):
    p = 0.5 * betai(df / 2, 0.5, df / (df + t * t))
    return 1 - p if t > 0 else p


def tcrit(conf, df):
    target, lo, hi = 1 - (1 - conf) / 2, 0.0, 80.0
    for _ in range(90):
        m = (lo + hi) / 2
        if tcdf(m, df) < target:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


# ── bản chép ĐÚNG của rng()/gauss() trong JS của trang ────────────────────────
def jsrng(seed):
    s = [seed % 4294967296]

    def r():
        s[0] = (s[0] * 1664525 + 1013904223) % 4294967296
        return s[0] / 4294967296
    return r


def jsgauss(r):
    u = 0.0
    v = 0.0
    while u == 0:
        u = r()
    while v == 0:
        v = r()
    return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)


# ── đại số nhỏ: trung bình, phương sai, hồi quy OLS có hệ số chặn ──────────────
def mean(a):
    return sum(a) / len(a)


def var(a, ddof=1):
    m = mean(a)
    return sum((x - m) ** 2 for x in a) / (len(a) - ddof)


def cov(a, b, ddof=1):
    ma, mb = mean(a), mean(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (len(a) - ddof)


def solve(A, b):
    """Khử Gauss có chọn trụ — đủ cho hệ vài biến."""
    n = len(A)
    M = [list(map(float, A[i])) + [float(b[i])] for i in range(n)]
    for c in range(n):
        p = max(range(c, n), key=lambda i: abs(M[i][c]))
        M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-15:
            raise ValueError('ma trận suy biến')
        for i in range(n):
            if i != c:
                f = M[i][c] / M[c][c]
                for j in range(c, n + 1):
                    M[i][j] -= f * M[c][j]
    return [M[i][n] / M[i][i] for i in range(n)]


def ols(cols, y):
    """Hồi quy y theo các cột `cols` (list các list), CÓ hệ số chặn. Trả [chặn, b1, b2, …]."""
    X = [[1.0] + [c[i] for c in cols] for i in range(len(y))]
    k = len(X[0])
    XtX = [[sum(X[r][i] * X[r][j] for r in range(len(y))) for j in range(k)] for i in range(k)]
    Xty = [sum(X[r][i] * y[r] for r in range(len(y))) for i in range(k)]
    return solve(XtX, Xty)


def run_p1():
    """Phần 1 — mở đầu, chặng 1 (hai tương lai), chặng 2 (tung đồng xu).

    Ba loại phép kiểm, theo CONTRACT §7:
      · con số tính được trong chữ → tính lại bằng thư viện chuẩn, đòi đúng chuỗi hiện trên trang;
      · luật (chênh lệch ngây thơ = ATT + thiên lệch chọn, Var(Y′) = Var(Y)(1 − r²), CUPED không
        chệch, bảng quyết định bốn ô…) → claim;
      · năm mô hình có hạt giống → dựng lại dữ liệu bằng jsrng/jsgauss tới từng chữ số, so với chữ
        mặc định in sẵn trong HTML (chữ ấy phải đúng bằng thứ JS sẽ in ra), và đòi vài dòng JS then
        chốt còn nguyên hình.
    Mọi hàm phụ nằm TRONG hàm này để không đụng tên của phần khác.
    """
    import html as _hh
    import math
    import re
    from decimal import Decimal, ROUND_HALF_UP
    from fractions import Fraction
    from itertools import combinations
    from statistics import NormalDist

    # ── công cụ ────────────────────────────────────────────────────────────────
    def jround(x):                      # Math.round của JS: làm tròn nửa lên phía +∞
        return math.floor(x + 0.5)

    def jfixed(x, d):                   # Number.prototype.toFixed: giá trị nhị phân CHÍNH XÁC, nửa → xa số 0
        s = format(Decimal(x).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP), 'f')
        return s

    def jfmt(x, d=2):                   # bản chép ĐÚNG của fmt() trong shell
        if not math.isfinite(x):
            return '∞'
        s = jfixed(x, d)
        neg = s.startswith('-')
        if neg:
            s = s[1:]
        if not re.search('[1-9]', s):
            neg = False
        ip, _, fp = s.partition('.')
        if len(ip) >= 4:
            ip = re.sub(r'\B(?=(\d{3})+(?!\d))', '.', ip)
        return ('−' if neg else '') + ip + (',' + fp if fp else '')

    def jpct(x, d=1):
        return jfmt(x * 100, d) + '%'

    def jshuffle(a, r):                 # shuffle() của shell
        for i in range(len(a) - 1, 0, -1):
            j = math.floor(r() * (i + 1))
            a[i], a[j] = a[j], a[i]
        return a

    def jclamp(v, a, b):
        return a if v < a else b if v > b else v

    def jsd(a):
        return math.sqrt(var(a))

    def sec_html(sid):
        m = re.search(r'<section id="%s"[^>]*>(.*?)</section>' % re.escape(sid), HTML, re.S)
        return m.group(1) if m else ''

    def sec_text(sid):
        h = re.sub(r'<(script|style)\b[^>]*>.*?</\1\s*>', ' ', sec_html(sid), flags=re.S)
        return re.sub(r'\s+', ' ', _hh.unescape(re.sub(r'<[^>]+>', '', h)))

    def needs(label, sid, s):           # chuỗi phải có trong CHỮ HIỆN RA của đúng mục ấy (không tính script)
        claim(label, s in sec_text(sid), f'mục {sid} không có "{s}"')

    def lead(eid):                      # chữ đứng đầu một phần tử có id (trước thẻ con đầu tiên)
        m = re.search(r'id="%s"[^>]*>([^<]*)' % re.escape(eid), HTML)
        return _hh.unescape(m.group(1)) if m else None

    def same(label, eid, want):         # chữ mặc định in sẵn trong HTML phải đúng bằng thứ JS sẽ in ra
        got = lead(eid)
        claim(label, got == want, f'#{eid} đang là {got!r}, JS sẽ in {want!r}')

    def pure(i):                        # đoạn "tính thuần" thứ i trong JS của PHẦN 1 (giữa hai dấu PHẦN 1 / PHẦN 2 của khung)
        a0 = HTML.find('PHẦN 1 · mở đầu, chặng 1–2')
        a1 = HTML.find('PHẦN 2 · chặng 3–4', a0)
        js = HTML[a0:a1] if a0 >= 0 and a1 > a0 else ''
        blocks = re.findall(r'/\* ── tính thuần \(không đụng DOM\) ── \*/(.*?)/\* ── hết phần tính thuần ── \*/', js, re.S)
        return blocks[i] if i < len(blocks) else ''

    def js_has(label, i, pattern):      # dòng JS then chốt còn nguyên hình (khoảng trắng tuỳ ý)
        rx = r'\s*'.join(re.escape(tok) for tok in pattern.split())
        claim(label, re.search(rx, pure(i)) is not None, f'JS không còn dòng: {pattern}')

    ND = NormalDist()
    Z975 = ND.inv_cdf(0.975)

    # ══ cấu trúc: id, thứ tự, số mục, màu chặng ═════════════════════════════════
    order = ['mo-dau', 's-cau-hoi', 's-ban-do', 'act1', 's-po', 's-ate', 's-traps3', 's-sutva',
             'act2', 's-random', 's-estimate', 's-power', 's-cuped', 's-oec', 's-analyze']
    pos = [HTML.find(f'id="{i}"') for i in order]
    claim('p1 · đủ 15 id của phần 1', all(p >= 0 for p in pos), 'thiếu: ' + ', '.join(i for i, p in zip(order, pos) if p < 0))
    claim('p1 · đúng thứ tự §3', all(p >= 0 for p in pos) and pos == sorted(pos), 'thứ tự id lệch CONTRACT §3')
    numbers = {'s-cau-hoi': '0.1', 's-ban-do': '0.2', 's-po': '1.1', 's-ate': '1.2', 's-traps3': '1.3', 's-sutva': '1.4',
               's-random': '2.1', 's-estimate': '2.2', 's-power': '2.3', 's-cuped': '2.4', 's-oec': '2.5', 's-analyze': '2.6'}
    for sid, n in numbers.items():
        claim(f'p1 · sechead {sid} = {n}', re.search(r'<p class="sechead">%s · ' % re.escape(n), sec_html(sid)) is not None, f'số mục của {sid} không phải {n}')
        want_cls = '' if sid in ('s-cau-hoi', 's-ban-do') else 'ch-x'
        m = re.search(r'<section id="%s"( class="([^"]*)")?>' % sid, HTML)
        claim(f'p1 · màu chặng {sid}', m is not None and (m.group(2) or '') == want_cls, f'{sid} phải có class="{want_cls}"')
    claim('p1 · mở đầu không màu, không viền trên',
          re.search(r'<div class="acthead" id="mo-dau" style="border-top:0;padding-top:0">', HTML) is not None)
    for a in ('act1', 'act2'):
        claim(f'p1 · {a} là acthead ch-x', f'<div class="acthead ch-x" id="{a}">' in HTML)
    # bản đồ 0.2 trỏ đúng tới mọi chặng + phần tra cứu, với số mục của chặng 5 đúng như §3
    m02 = sec_html('s-ban-do')
    for a in ('act1', 'act2', 'act3', 'act4', 'act6', 'ket'):
        claim(f'p1 · bản đồ trỏ #{a}', f'href="#{a}"' in m02)
    for sid, n in (('s-did', '5.1'), ('s-synth', '5.2'), ('s-rdd', '5.3'), ('s-iv', '5.4')):
        claim(f'p1 · bản đồ {n} → #{sid}', f'<a href="#{sid}">{n}</a>' in m02, f'bản đồ phải ghi {n} trỏ #{sid}')
    for w in ('Chặng 1', 'Chặng 2', 'Chặng 3', 'Chặng 4', 'Chặng 5', 'Chặng 6'):
        claim(f'p1 · hình bản đồ có "{w}"', w in m02)
    # mỗi ví von có "chỗ ví von hỏng"; mỗi hình có tên tiếp cận
    p1html = HTML[HTML.find('id="mo-dau"'):HTML.find('</section>', HTML.find('id="s-analyze"'))]
    n_ana, n_brk = p1html.count('class="box ana"'), p1html.count('class="k brk"')
    claim('p1 · mọi ví von có chỗ hỏng', n_ana == n_brk > 0, f'{n_ana} ví von, {n_brk} chỗ hỏng')
    for sv in re.findall(r'<svg\b[^>]*>', p1html):
        claim('p1 · svg có role="img" và aria-label', 'role="img"' in sv and 'aria-label="' in sv, sv[:80])
    # số mô hình sau khi ráp: phần 1 đứng đầu trang nên sáu mô hình mang số 1–6
    for i, (key, lab) in enumerate((('po', 'chế độ thượng đế'), ('select', '1.000 khách, 500 tin nhắn'),
                                    ('simpson', 'hai cỡ cửa hàng'), ('balance', 'bốc thăm 200 lần'), ('power', 'cỡ mẫu cho một MDE'),
                                    ('cuped', '400 khách, hai kỳ chi tiêu')), 1):
        claim(f'p1 · mô hình {i} là {key}', re.search(r'id="m-%s">\s*<div class="lab__h">\s*<p class="lab__k">Mô hình %d · %s' % (key, i, re.escape(lab)), HTML) is not None)
    needs('p1 · 2.1 nhắc mô hình 2', 's-random', 'cột giữa và cột phải của mô hình 2 bằng nhau')
    needs('p1 · 2.1 nhắc mô hình 1', 's-random', 'với mười khách ở mô hình 1')

    # ══ 0.1 ══════════════════════════════════════════════════════════════════════
    claim('p1 · 0.1 12% so với 20% là ít hơn 40%', abs((1 - Fraction(12, 100) / Fraction(20, 100)) - Fraction(2, 5)) == 0)
    for s in ('12% bỏ đi', 'ít hơn 40%', 'bỏ đi 12% thay vì 20%', 'vẫn 20%'):
        needs(f'p1 · 0.1 "{s}"', 's-cau-hoi', s)

    # ══ 1.1 · mô hình po ═════════════════════════════════════════════════════════
    js0 = pure(0)
    Y0 = [int(v) for v in re.search(r'var Y0 = \[([^\]]+)\]', js0).group(1).split(',')]
    Y1 = [int(v) for v in re.search(r'var Y1 = \[([^\]]+)\]', js0).group(1).split(',')]
    NAMES = re.findall(r"'([^']+)'", re.search(r'var NAMES = \[([^\]]+)\]', js0).group(1))
    claim('p1 · po có 10 khách', len(Y0) == len(Y1) == len(NAMES) == 10)
    ate_po = Fraction(sum(Y1) - sum(Y0), 10)
    claim('p1 · po ATE = 38', ate_po == 38, f'ATE = {ate_po}')
    tau = {n: b - a for n, a, b in zip(NAMES, Y0, Y1)}
    claim('p1 · po τ của chị Chi = 120 − 0', Y1[NAMES.index('Chi')] == 120 and Y0[NAMES.index('Chi')] == 0)
    quen = sorted(range(10), key=lambda i: (-Y0[i], i))[:5]
    m1 = Fraction(sum(Y1[i] for i in quen), 5)
    m0 = Fraction(sum(Y0[i] for i in range(10) if i not in quen), 5)
    claim('p1 · po khách quen: 390 / 36 / 354', (m1, m0, m1 - m0) == (390, 36, 354), f'{m1} / {m0} / {m1 - m0}')
    claim('p1 · po 354 gấp hơn 9 lần 38 (và chưa tới 10)', 9 < (m1 - m0) / ate_po < 10)
    needs('p1 · po gợi ý 354', 's-po', 'chênh nhau 354 nghìn ₫ — gấp hơn 9 lần tác động thật trung bình (38 nghìn ₫)')
    on = re.findall(r'<span class="chip( on)?" data-i="(\d)">([^<]+)</span>', HTML)
    claim('p1 · po chip bật sẵn = 5 khách quen', sorted(int(i) for o, i, _ in on if o) == sorted(quen) and [n for _, _, n in on] == NAMES)
    same('p1 · po ô TB nhóm nhận', 'm-po-m1', '390')
    same('p1 · po ô TB nhóm không nhận', 'm-po-m0', '36')
    same('p1 · po ô chênh lệch ngây thơ', 'm-po-naive', '354')
    same('p1 · po ô tác động thật', 'm-po-ate', '38')
    same('p1 · po câu mặc định', 'm-po-say',
         'Nhóm nhận SMS chi trung bình 390 nghìn ₫, nhóm không nhận 36 nghìn ₫: chênh 354 nghìn ₫. '
         'Tác động thật trung bình là 38 nghìn ₫, nên phép so này thổi phồng 316 nghìn ₫. '
         'Chủ cửa hàng không gian lận: ông chỉ nhắn người quen mặt, và người quen mặt vốn đã chi nhiều.')
    # cả 252 cách bốc 5 trong 10: trung bình đúng bằng ATE, chạy từ −278 tới +354
    diffs = [Fraction(sum(Y1[i] for i in T), 5) - Fraction(sum(Y0[i] for i in range(10) if i not in T), 5)
             for T in combinations(range(10), 5)]
    claim('p1 · po 252 cách chia 5–5', len(diffs) == 252)
    claim('p1 · po bốc thăm KHÔNG CHỆCH: TB trên 252 cách = 38', sum(diffs) / len(diffs) == ate_po)
    claim('p1 · po bốc thăm chạy từ −278 tới +354', (min(diffs), max(diffs)) == (-278, 354), f'{min(diffs)} … {max(diffs)}')
    claim('p1 · po "khách quen" là cách chia lệch nhất trong 252', max(diffs) == m1 - m0)
    needs('p1 · 2.1 nhắc 252 cách bốc', 's-random', 'đúng bằng 38 nghìn ₫ qua cả 252 cách bốc 5 trong 10, nhưng từng lần thì chạy từ −278 tới +354')
    claim('p1 · po câu JS về 252 cách', 'qua cả 252 cách bốc 5 trong 10, chênh lệch trung bình đúng bằng 38, còn từng lần chạy từ −278 tới +354' in HTML)
    js_has('p1 · po JS: tính nhất quán Y quan sát = Y(T)', 0, "if (T[i]) { s1 += Y1[i]; n1++; } else { s0 += Y0[i]; n0++; }")
    js_has('p1 · po JS: khách quen = 5 người Y(0) lớn nhất', 0, "sort(function (a, b) { return Y0[b] - Y0[a] || a - b; })")
    # câu tự kiểm: chỉ An nhận SMS
    an = NAMES.index('An')
    rest = Fraction(sum(Y0) - Y0[an], 9)
    claim('p1 · po chỉ An: 450 − 180 = 270, τ(An) = 30', (Y1[an], rest, Y1[an] - rest, tau['An']) == (450, 180, 270, 30))
    claim('p1 · po chỉ An: 270 gấp chín lần 30', (Y1[an] - rest) / tau['An'] == 9)
    needs('p1 · po lời giải có (2.040 − 420) / 9', 's-po', 'Chênh lệch ngây thơ là 450 − 180 = 270 nghìn ₫, trong đó 180 là trung bình của chín người không nhận: (2.040 − 420) / 9')
    claim('p1 · po tổng Y(0) = 2.040', sum(Y0) == 2040)

    # ══ 1.2 · mô hình select ═════════════════════════════════════════════════════
    def sel_pop():
        r, pop = jsrng(20260927), []
        for _ in range(1000):
            f = r()
            y0 = max(0, jround(40 + 460 * f + 70 * jsgauss(r)))
            t = jround(15 + 70 * (1 - f) + 20 * jsgauss(r))
            pop.append((f, y0, max(0, y0 + t)))
        return pop

    def sel_assign(pop, rule, k):
        r = jsrng(7001 + 7919 * k + (1 if rule == 'quen' else 2 if rule == 'bo' else 0) * 104729)
        idx = list(range(len(pop)))
        if rule == 'coin':
            jshuffle(idx, r)
        else:
            score = [(p[0] if rule == 'quen' else 1 - p[0]) + 0.15 * jsgauss(r) for p in pop]
            idx.sort(key=lambda i: (-score[i], i))
        T = [0] * len(pop)
        for i in idx[:len(pop) // 2]:
            T[i] = 1
        return T

    def sel_decomp(pop, T):             # bằng ĐỒNG, số nguyên: nhóm 500 người → tổng × 1.000 / 500
        nT = sum(T); nC = len(T) - nT
        s1T = sum(p[2] for p, t in zip(pop, T) if t); s0T = sum(p[1] for p, t in zip(pop, T) if t)
        s0C = sum(p[1] for p, t in zip(pop, T) if not t); s1C = sum(p[2] for p, t in zip(pop, T) if not t)
        a, b, c, d = (Fraction(s1T * 1000, nT), Fraction(s0T * 1000, nT), Fraction(s0C * 1000, nC), Fraction(s1C * 1000, nC))
        ate = Fraction(sum(p[2] - p[1] for p in pop) * 1000, len(pop))
        return dict(a=a, b=b, c=c, naive=a - c, att=a - b, bias=b - c, atc=d - c, ate=ate, nT=nT)

    pop = sel_pop()
    D = {rule: [sel_decomp(pop, sel_assign(pop, rule, k)) for k in range(300 if rule != 'coin' else 1000)] for rule in ('quen', 'coin', 'bo')}
    allD = D['quen'] + D['coin'] + D['bo']
    claim('p1 · select LUẬT: ngây thơ = ATT + thiên lệch, đúng tới từng đồng, mọi quy tắc × mọi lần chia',
          all(d['naive'] == d['att'] + d['bias'] and d['naive'].denominator == 1 and d['att'].denominator == 1 and d['bias'].denominator == 1 for d in allD))
    claim('p1 · select LUẬT: ngây thơ = ATE + thiên lệch + (1 − π)(ATT − ATC), π = ½',
          all(d['naive'] == d['ate'] + d['bias'] + Fraction(1, 2) * (d['att'] - d['atc']) for d in allD))
    claim('p1 · select LUẬT: ATE = ½ ATT + ½ ATC', all(d['ate'] == (d['att'] + d['atc']) / 2 for d in allD))
    claim('p1 · select mỗi quy tắc gửi đúng 500 tin', all(d['nT'] == 500 for d in allD))
    q0, b0, c0 = D['quen'][0], D['bo'][0], D['coin'][0]
    M = lambda v: jfmt(float(v), 0)
    claim('p1 · select khách quen (lần đầu): 413.056 / 378.120 / 176.742',
          (M(q0['a']), M(q0['b']), M(q0['c'])) == ('413.056', '378.120', '176.742'), f"{M(q0['a'])} / {M(q0['b'])} / {M(q0['c'])}")
    for key, want in (('naive', '236.314'), ('att', '34.936'), ('bias', '201.378'), ('ate', '49.498'), ('atc', '64.060')):
        claim(f'p1 · select khách quen {key} = {want}', M(q0[key]) == want, M(q0[key]))
    claim('p1 · select sắp bỏ đi (lần đầu): ngây thơ −133.948, ATT 64.966, thiên lệch −198.914',
          (M(b0['naive']), M(b0['att']), M(b0['bias'])) == ('−133.948', '64.966', '−198.914'))
    claim('p1 · select bốc thăm (lần đầu): 36.228 = 49.754 + (−13.526)', (M(c0['naive']), M(c0['att']), M(c0['bias'])) == ('36.228', '49.754', '−13.526'))
    for s in ('hai nhóm chênh 236.314 ₫, nhưng 201.378 ₫ trong đó', 'chỉ 34.936 ₫', 'chi thêm 64.966 ₫ mỗi người'):
        needs(f'p1 · select gợi ý "{s}"', 's-ate', s)
    same('p1 · select ô ngây thơ', 'm-select-naive', '236.314')
    same('p1 · select ô ATT', 'm-select-att', '34.936')
    same('p1 · select ô thiên lệch', 'm-select-bias', '201.378')
    same('p1 · select ô ATE', 'm-select-ate', '49.498')
    same('p1 · select câu mặc định', 'm-select-say',
         f"Chênh lệch ngây thơ {M(q0['naive'])} ₫ = ATT {M(q0['att'])} ₫ + thiên lệch chọn {M(q0['bias'])} ₫ — cộng tay là khớp tới từng đồng, vì cả ba là hiệu của ba cột. "
         f"Khách quen vốn chi nhiều hơn những người còn lại {M(q0['bias'])} ₫ dù chẳng ai nhắn gì. Và vì đằng nào họ cũng mua, SMS thêm cho họ ít: ATT {M(q0['att'])} ₫, dưới cả ATE ({M(q0['ate'])} ₫).")
    # các câu JS in ra cho từng quy tắc phải đúng ở MỌI lần chia, không chỉ lần đầu
    claim('p1 · select câu "khách quen vốn chi nhiều hơn… ATT dưới cả ATE" đúng mọi lần chia',
          all(d['bias'] > 0 and d['att'] < d['ate'] for d in D['quen']))
    claim('p1 · select câu "sắp bỏ đi vốn chi ít hơn… nhiều hơn ATE… ra số âm" đúng mọi lần chia',
          all(d['bias'] < 0 and d['att'] > d['ate'] and d['naive'] < 0 for d in D['bo']))
    claim('p1 · select bốc thăm: thiên lệch đổi dấu ngay trong 3 lần chia đầu',
          len({(d['bias'] > 0) for d in D['coin'][:3]}) == 2)
    frac20 = sum(1 for d in D['coin'] if abs(d['bias']) <= 20000) / len(D['coin'])
    claim('p1 · select bốc thăm: "thường nằm trong ±20.000 ₫" (≥ 95% của 1.000 lần chia)', frac20 >= 0.95, f'{frac20:.3f}')
    claim('p1 · select khách quen: thiên lệch "đứng quanh +200.000 ₫" ở mọi lần chia (185–215 nghìn)',
          all(185000 <= d['bias'] <= 215000 for d in D['quen']), f"{min(d['bias'] for d in D['quen'])} … {max(d['bias'] for d in D['quen'])}")
    needs('p1 · select đẳng thức Mixtape bằng số', 's-ate', '49.498 + 201.378 + ½ · (34.936 − 64.060) = 236.314 ₫')
    rk = lambda v: jround(float(v) / 1000)
    claim('p1 · select ô đời thường làm tròn nghìn: 413, 177, 236, 378, 35, 201',
          (rk(q0['a']), rk(q0['c']), rk(q0['naive']), rk(q0['b']), rk(q0['att']), rk(q0['bias'])) == (413, 177, 236, 378, 35, 201)
          and rk(q0['a']) - rk(q0['c']) == 236 and rk(q0['a']) - rk(q0['b']) == 35 and rk(q0['b']) - rk(q0['c']) == 201)
    needs('p1 · select ô đời thường', 's-ate', 'Phần SMS làm ra chỉ là 413 − 378 = 35 nghìn; 201 nghìn còn lại là họ vốn thế')
    needs('p1 · select lời giải ATC', 's-ate', '(34.936 + 64.060) / 2 = 49.498 ₫')
    needs('p1 · select lời giải ATC 64.060', 's-ate', 'ATC — tác động trên nhóm chưa được nhắn: 64.060 ₫')
    js_has('p1 · select JS: ngây thơ = a − c, ATT = a − b, thiên lệch = b − c', 1, 'naive: a - c, att: a - b, bias: b - c')
    js_has('p1 · select JS: 500 tin nhắn', 1, 'for (i = 0; i < n / 2; i++) T[idx[i]] = 1;')

    # ══ 1.3 ══════════════════════════════════════════════════════════════════════
    # chọn mẫu: 500 khách quen (ghé 80%, 450 nghìn/lần) + 500 khách thưa (150 nghìn/lần, ghé 10% → 40% nếu có SMS)
    vis_c, vis_s = 400 + 50, 400 + 200
    rev_c, rev_s = 400 * 450 + 50 * 150, 400 * 450 + 200 * 150
    claim('p1 · 1.3 số khách ghé 450 và 600', (Fraction(8, 10) * 500, Fraction(1, 10) * 500, Fraction(4, 10) * 500) == (400, 50, 200))
    ctb = re.search(r'<th>1\.000 khách mỗi bên</th>.*?</table>', sec_html('s-traps3'), re.S)
    crow = [re.sub(r'<[^>]+>', '', x) for x in re.findall(r'<td[^>]*>(.*?)</td>', ctb.group(0) if ctb else '', re.S)]
    want_c = ['Số khách ghé (quen + thưa)', '400 + 50 = 450', '400 + 200 = 600', '',
              'Chỉ nhìn người đã ghé: chi TB mỗi người (nghìn ₫)', jfmt(float(Fraction(rev_c, vis_c)), 1), jfmt(float(Fraction(rev_s, vis_s)), 1),
              jfmt(float(Fraction(rev_s, vis_s) - Fraction(rev_c, vis_c)), 1),
              'Nhìn mọi khách đã bốc, không ghé tính là 0 (nghìn ₫)', jfmt(float(Fraction(rev_c, 1000)), 1), jfmt(float(Fraction(rev_s, 1000)), 1),
              '+' + jfmt(float(Fraction(rev_s - rev_c, 1000)), 1)]
    claim('p1 · 1.3 bảng chọn mẫu đúng từng ô', crow == want_c, f'bảng: {crow}')
    claim('p1 · 1.3 bảng chọn mẫu ra 416,7 / 350,0 / −66,7 / 187,5 / 210,0 / +22,5', want_c[5:8] + want_c[9:] == ['416,7', '350,0', '−66,7', '187,5', '210,0', '+22,5'])
    needs('p1 · 1.3 "mang về thêm 22,5 nghìn ₫"', 's-traps3', 'mỗi khách được nhắn mang về thêm 22,5 nghìn ₫')
    # Simpson
    L1, L1n, L0, L0n, S1, S1n, S0, S0n = 90, 200, 320, 800, 120, 800, 20, 200
    within = (Fraction(L1, L1n) - Fraction(L0, L0n), Fraction(S1, S1n) - Fraction(S0, S0n))
    pooled = Fraction(L1 + S1, L1n + S1n) - Fraction(L0 + S0, L0n + S0n)
    claim('p1 · 1.3 Simpson: +5 điểm trong CẢ HAI cỡ, −13 điểm khi gộp', within == (Fraction(5, 100), Fraction(5, 100)) and pooled == Fraction(-13, 100))
    # bảng Simpson, đọc TỪNG DÒNG: mỗi ô "x / n = p%" phải đúng số học, cột chênh lệch = hai ô trừ nhau,
    # và các con số phải đúng bộ số của bài (mô hình simpson dùng chung bộ số này)
    tb = re.search(r'<th>Cỡ cửa hàng</th>.*?</table>', sec_html('s-traps3'), re.S)
    srows = re.findall(r'<tr><td>(?:<b>)?([^<]+?)(?:</b>)?</td><td>([\d.]+) / ([\d.]+) = (\d+)%</td><td>([\d.]+) / ([\d.]+) = (\d+)%</td>'
                       r'<td[^>]*><b>([+−]\d+) điểm</b></td></tr>', tb.group(0) if tb else '')
    toint = lambda s: int(s.replace('.', ''))
    claim('p1 · 1.3 bảng Simpson có đủ 3 dòng Lớn / Nhỏ / Gộp lại', [r[0] for r in srows] == ['Lớn', 'Nhỏ', 'Gộp lại'], str([r[0] for r in srows]))
    want_rows = {'Lớn': (L1, L1n, L0, L0n), 'Nhỏ': (S1, S1n, S0, S0n), 'Gộp lại': (L1 + S1, L1n + S1n, L0 + S0, L0n + S0n)}
    for name, a, b, pa, c_, d_, pc, dd in srows:
        a, b, c_, d_, pa, pc = toint(a), toint(b), toint(c_), toint(d_), int(pa), int(pc)
        dval = int(dd.replace('−', '-'))
        claim(f'p1 · 1.3 bảng Simpson dòng {name}: số học từng ô và cột chênh lệch',
              Fraction(a * 100, b) == pa and Fraction(c_ * 100, d_) == pc and dval == pa - pc and (a, b, c_, d_) == want_rows.get(name),
              f'{a}/{b}={pa}%, {c_}/{d_}={pc}%, chênh {dval}')
    claim('p1 · 1.3 "80% người nhận SMS là khách cửa hàng nhỏ", "80% người không nhận là khách cửa hàng lớn"',
          Fraction(S1n, S1n + L1n) == Fraction(4, 5) and Fraction(L0n, L0n + S0n) == Fraction(4, 5))
    std1 = Fraction(1, 2) * Fraction(L1, L1n) + Fraction(1, 2) * Fraction(S1, S1n)
    std0 = Fraction(1, 2) * Fraction(L0, L0n) + Fraction(1, 2) * Fraction(S0, S0n)
    claim('p1 · 1.3 chuẩn hoá theo 1.000 + 1.000 khách: 30% − 25% = +5', (L1n + L0n, S1n + S0n) == (1000, 1000) and (std1, std0) == (Fraction(30, 100), Fraction(25, 100)))
    needs('p1 · 1.3 chuẩn hoá', 's-traps3', '½ · 45% + ½ · 15% = 30%')
    needs('p1 · 1.3 chuẩn hoá (2)', 's-traps3', '½ · 40% + ½ · 10% = 25%')
    bal = (Fraction(45, 100) * 500, Fraction(40, 100) * 500, Fraction(15, 100) * 500, Fraction(10, 100) * 500)
    claim('p1 · 1.3 lời giải chia 500/500: 225, 200, 75, 50 → 30% so với 25%',
          bal == (225, 200, 75, 50) and Fraction(225 + 75, 1000) - Fraction(200 + 50, 1000) == Fraction(5, 100))
    for s in ('225 / 500 = 45%', '200 / 500 = 40%', '75 / 500 = 15%', '50 / 500 = 10%', '300 / 1.000 = 30%', '250 / 1.000 = 25%'):
        needs(f'p1 · 1.3 lời giải "{s}"', 's-traps3', s)

    # ── mô hình simpson: chênh lệch gộp theo cách chia tin nhắn giữa hai cỡ cửa hàng ──
    def sim_pool(sp, lp):
        nS1, nL1 = 10 * sp, 10 * lp
        nS0, nL0 = 1000 - nS1, 1000 - nL1
        r1 = Fraction(nL1 * 45 + nS1 * 15, 100 * (nL1 + nS1))
        r0 = Fraction(nL0 * 40 + nS0 * 10, 100 * (nL0 + nS0))
        return r1, r0, Fraction(nL1, nL1 + nS1), Fraction(nL0, nL0 + nS0)
    grid = [(sp, lp) for sp in range(5, 100, 5) for lp in range(5, 100, 5)]
    claim('p1 · simpson LUẬT: gộp = 5 + 30 × (tỉ phần lớn trong nhóm nhận − trong nhóm không) ở cả 361 vị trí thanh',
          all(r1 - r0 == Fraction(5, 100) + Fraction(30, 100) * (w1 - w0) for r1, r0, w1, w0 in (sim_pool(a, b) for a, b in grid)))
    claim('p1 · simpson LUẬT: số hạng 30 × (…) đúng là thiên lệch chọn E[Y(0)|T=1] − E[Y(0)|T=0], và ATT = +5',
          all((w1 * Fraction(40, 100) + (1 - w1) * Fraction(10, 100)) - (w0 * Fraction(40, 100) + (1 - w0) * Fraction(10, 100)) == Fraction(30, 100) * (w1 - w0)
              and (w1 * Fraction(45, 100) + (1 - w1) * Fraction(15, 100)) - (w1 * Fraction(40, 100) + (1 - w1) * Fraction(10, 100)) == Fraction(5, 100)
              for _, _, w1, w0 in (sim_pool(a, b) for a, b in grid)))
    claim('p1 · simpson: hai thanh bằng nhau (mức nào cũng được) → gộp đúng +5', all(sim_pool(a, a)[0] - sim_pool(a, a)[1] == Fraction(5, 100) for a in range(5, 100, 5)))
    r1, r0, _, _ = sim_pool(80, 20)
    claim('p1 · simpson mặc định = bảng Simpson: 21% − 34% = −13', (r1, r0) == (Fraction(21, 100), Fraction(34, 100)))
    r1b, r0b, _, _ = sim_pool(20, 80)
    claim('p1 · simpson kéo ngược (nhỏ 20%, lớn 80%): +23', r1b - r0b == Fraction(23, 100))
    same('p1 · simpson ô gộp', 'm-simpson-pool', jfmt(float(r1 - r0) * 100, 1))
    same('p1 · simpson câu mặc định', 'm-simpson-say',
         f'Nhận SMS: 800 khách cửa hàng nhỏ + 200 khách cửa hàng lớn → gộp {jfmt(float(r1) * 100, 1)}%. Không nhận: 200 + 800 → gộp {jfmt(float(r0) * 100, 1)}%. '
         f'Chênh lệch gộp {jfmt(float(r1 - r0) * 100, 1)} điểm, trong khi trong từng cỡ vẫn là +5. Phép gộp đảo cả dấu: nhóm nhận SMS toàn khách cửa hàng nhỏ.')
    for s in ('gộp ra −13 điểm', 'thì gộp ra đúng +5', 'gộp ra +23', '5 + 30 × (0,2 − 0,8) = −13'):
        needs(f'p1 · simpson "{s}"', 's-traps3', s)
    claim('p1 · simpson HTML mở ở nhỏ 80%, lớn 20%', 'id="m-simpson-s" min="5" max="95" step="5" value="80"' in HTML and 'id="m-simpson-l" min="5" max="95" step="5" value="20"' in HTML)

    # ══ 2.1 · mô hình balance ════════════════════════════════════════════════════
    def bal_pop():
        r, X, U = jsrng(4242), [], []
        for _ in range(20000):
            X.append(jround(math.exp(5 + 0.6 * jsgauss(r))))
            U.append(jround((0.3 + 7.7 * r()) * 10) / 10)
        return X, U

    def bal_sim(X, U, n, rd, R=200):    # chỉ nhánh 'coin' — nhánh khối được chạy thử bằng work-p1/harness.js
        r = jsrng(99991 + 7 * n + 100003 * rd)
        dx, du, smd = [], [], []
        while len(dx) < R:
            T = [1 if r() < 0.5 else 0 for _ in range(n)]
            sx1 = sx0 = qx1 = qx0 = su1 = su0 = 0.0
            n1 = 0
            for i in range(n):
                x, u = X[i], U[i]
                if T[i]:
                    sx1 += x; qx1 += x * x; su1 += u; n1 += 1
                else:
                    sx0 += x; qx0 += x * x; su0 += u
            n0 = n - n1
            if n1 < 2 or n0 < 2:
                continue
            m1_, m0_ = sx1 / n1, sx0 / n0
            v1 = (qx1 - n1 * m1_ * m1_) / (n1 - 1)
            v0 = (qx0 - n0 * m0_ * m0_) / (n0 - 1)
            dx.append(m1_ - m0_); du.append(su1 / n1 - su0 / n0); smd.append((m1_ - m0_) / math.sqrt((v1 + v0) / 2))
        return dx, du, smd

    BX, BU = bal_pop()
    dx, du, smd = bal_sim(BX, BU, 200, 0)
    s200 = jsd(BX[:200])
    th200 = 2 * s200 / math.sqrt(200)
    over = sum(1 for v in smd if abs(v) > 0.1) / len(smd)
    f1 = lambda v: jfmt(v, 2 if v < 10 else 1)
    fk = lambda v: jfmt(v, 3 if v < 0.1 else 2)
    same('p1 · balance ô độ vung (n = 200)', 'm-balance-sd', f1(jsd(dx)))
    same('p1 · balance ô công thức (n = 200)', 'm-balance-th', f1(th200))
    same('p1 · balance ô |SMD| > 0,1 (n = 200)', 'm-balance-over', jpct(over, 1))
    same('p1 · balance ô khoảng cách (n = 200)', 'm-balance-du', fk(jsd(du)))
    same('p1 · balance câu mặc định', 'm-balance-say',
         f'n = 200: qua 200 lần bốc, chênh lệch chi tiêu cũ giữa hai nhóm dồn quanh 0 với độ vung {f1(jsd(dx))} nghìn ₫ — '
         f'công thức 2σ/√n cho {f1(th200)}. Có {jpct(over, 1)} số lần bốc cho |SMD| vượt 0,1, dù lần nào cũng bốc đúng quy trình.')
    near('p1 · balance mô phỏng bám công thức 2σ/√n (n = 200)', jsd(dx) / th200, 1.0, 0.12)
    claim('p1 · balance √(20.000 / 200) = 10', math.sqrt(20000 / 200) == 10)
    # "khoảng 48%" và "2,5%": xác suất |SMD| > 0,1 khi SMD ~ chuẩn với độ lệch chuẩn 2/√n
    psmd = lambda n: 2 * (1 - ND.cdf(0.1 * math.sqrt(n) / 2))
    claim('p1 · 2.1 P(|SMD| > 0,1) ≈ 48% ở n = 200, 2,5% ở n = 2.000',
          jfmt(psmd(200) * 100, 0) == '48' and jfmt(psmd(2000) * 100, 1) == '2,5', f'{psmd(200):.4f} / {psmd(2000):.4f}')
    needs('p1 · 2.1 câu 48%', 's-random', 'với 200 khách khoảng 48% số lần bốc hoàn toàn đúng quy trình vẫn cho |SMD| > 0,1; với 2.000 khách còn 2,5%')
    near('p1 · 2.1 mô phỏng 49,5% gần công thức 48%', over, psmd(200), 0.06)
    # câu tự kiểm: σ = 120, n = 800
    e800 = 240 / math.sqrt(800)
    claim('p1 · 2.1 lời giải 240/√800 ≈ 8,5, ±17, 3.200 → 4,2',
          jfmt(e800, 1) == '8,5' and jfmt(Z975 * e800, 0) == '17' and jfmt(240 / math.sqrt(3200), 1) == '4,2' and 3200 == 4 * 800)
    needs('p1 · 2.1 lời giải', 's-random', '2σ/√n = 240 / √800 ≈ 8,5 nghìn ₫')
    needs('p1 · 2.1 lời giải (2)', 's-random', '3.200 khách, cho 240 / √3.200 ≈ 4,2 nghìn ₫')
    # code SMD (đã chạy bằng numpy — xem notes): số in ra đúng như chú thích, và đoạn văn đọc đúng chúng
    for s in ('{0: 1046, 1: 954}', 'chi_truoc -0.001', 'khoang_cach 0.028'):
        claim(f'p1 · 2.1 code in ra "{s}"', s in sec_html('s-random'))
    claim('p1 · 2.1 đoạn văn đọc đúng output: 954 và 1.046, cả hai |SMD| < 0,1', 1046 + 954 == 2000 and abs(-0.001) < 0.1 and abs(0.028) < 0.1)
    needs('p1 · 2.1 954 và 1.046', 's-random', '(954 và 1.046)')
    # 954/1.046 không phải "chuyện bình thường": χ² cho p ≈ 0,04 — chỉ không phải lỗi vì ngưỡng SRM của 3.3 là 0,0005
    c954 = (1046 - 1000) ** 2 / 1000 + (954 - 1000) ** 2 / 1000
    claim('p1 · 2.1 chia 954/1.046: χ² = 4,23, p = 0,04 — dưới 0,05 nhưng trên xa ngưỡng SRM 0,0005',
          jfmt(c954, 2) == '4,23' and jfmt(chi2_sf_df1(c954), 2) == '0,04' and 0.0005 < chi2_sf_df1(c954) < 0.05,
          f'χ² {c954:.4f}, p {chi2_sf_df1(c954):.4f}')
    b954 = 2 * sum(math.comb(2000, k) for k in range(955)) / 2 ** 2000     # nhị thức chính xác, hai phía
    claim('p1 · 2.1 "khoảng 4 lần trong 100": P(|X − 1.000| ≥ 46), X ~ B(2.000, ½) ∈ (0,035; 0,045)', 0.035 < b954 < 0.045, f'{b954:.4f}')
    needs('p1 · 2.1 ghi thẳng p ≈ 0,04', 's-random', 'kiểm χ² cho p ≈ 0,04, tức chỉ khoảng 4 lần trong 100 lần tung')
    needs('p1 · 2.1 dẫn sang ngưỡng của 3.3', 's-random', 'p < 0,0005')
    claim('p1 · 2.1 link sang ngưỡng SRM ở #s-srm', 'mục <a href="#s-srm">3.3</a> thấp hơn nhiều' in sec_html('s-random'))
    js_has('p1 · balance JS: tung đồng xu từng người', 3, 'for (i = 0; i < n; i++) T[i] = r() < 0.5 ? 1 : 0;')
    js_has('p1 · balance JS: khối = cặp liền nhau theo chi tiêu cũ', 3, 'T[order[i]] = h; T[order[i + 1]] = 1 - h;')
    js_has('p1 · balance JS: SMD dùng độ lệch chuẩn gộp', 3, 'smd.push((m1 - m0) / Math.sqrt((v1 + v0) / 2))')
    claim('p1 · balance JS: công thức 2σ/√n', re.search(r'th = 2 \* s / Math\.sqrt\(n\)', HTML) is not None)

    # ══ 2.2 ══════════════════════════════════════════════════════════════════════
    x1, n1, x0, n0 = 360, 2000, 300, 2000
    p1_, p0_ = x1 / n1, x0 / n0
    se_u = math.sqrt(p1_ * (1 - p1_) / n1 + p0_ * (1 - p0_) / n0)
    pb = (x1 + x0) / (n1 + n0)
    se_p = math.sqrt(pb * (1 - pb) * (1 / n1 + 1 / n0))
    zz = (p1_ - p0_) / se_p
    pp = 2 * (1 - ND.cdf(abs(zz)))
    lo, hi = p1_ - p0_ - Z975 * se_u, p1_ - p0_ + Z975 * se_u
    claim('p1 · 2.2 SE không gộp ≈ SE gộp ≈ 1,17 điểm, khác từ chữ số thứ tư',
          jfmt(se_u * 100, 2) == jfmt(se_p * 100, 2) == '1,17' and abs(se_u - se_p) < 5e-5 and abs(se_u - se_p) > 1e-6)
    claim('p1 · 2.2 KTC [0,7; 5,3], z 2,56, p 0,011, p̄ 16,5%',
          (jfmt(lo * 100, 1), jfmt(hi * 100, 1), jfmt(zz, 2), jfmt(pp, 3), jfmt(pb * 100, 1)) == ('0,7', '5,3', '2,56', '0,011', '16,5'),
          f'{lo:.5f} {hi:.5f} {zz:.4f} {pp:.5f}')
    claim('p1 · 2.2 LUẬT: với hai nhóm bằng cỡ, SE gộp ≥ SE không gộp (nên KTC không chứa 0 mà p > 0,05 là ca có thể gặp)', se_p >= se_u)
    for s in ('+3,0 điểm phần trăm', 'từ 0,7 tới 5,3 điểm', 'p = 0,011', 'p̄ = 660 / 4.000 = 16,5%', 'z = 3,0 / 1,17 ≈ 2,56', 'KTC = 3,0 ± 1,96 · 1,17 = [0,7; 5,3]'):
        needs(f'p1 · 2.2 "{s}"', 's-estimate', s)
    # lift
    lift = p1_ / p0_ - 1
    naive_l = (lo / p0_, hi / p0_)
    slog = math.sqrt(1 / x1 - 1 / n1 + 1 / x0 - 1 / n0)
    rlo, rhi = math.exp(math.log(p1_ / p0_) - Z975 * slog), math.exp(math.log(p1_ / p0_) + Z975 * slog)
    R_ = p1_ / p0_
    sd_ = R_ * math.sqrt((p1_ * (1 - p1_) / n1) / p1_ ** 2 + (p0_ * (1 - p0_) / n0) / p0_ ** 2)
    claim('p1 · 2.2 lift 20%, chia ngây thơ [4,7%; 35,3%], thang log [4,3%; 38,0%], delta [3,2%; 36,8%]',
          (jfmt(lift * 100, 0), jfmt(naive_l[0] * 100, 1), jfmt(naive_l[1] * 100, 1), jfmt((rlo - 1) * 100, 1), jfmt((rhi - 1) * 100, 1),
           jfmt((R_ - 1 - Z975 * sd_) * 100, 1), jfmt((R_ - 1 + Z975 * sd_) * 100, 1)) == ('20', '4,7', '35,3', '4,3', '38,0', '3,2', '36,8'))
    claim('p1 · 2.2 LUẬT: khoảng thang log rộng hơn phép chia và lệch lên', (rhi - rlo) > (naive_l[1] - naive_l[0]) and (rhi - 1 - lift) > (lift - (rlo - 1)))
    claim('p1 · 2.2 ln 1,2 ± 1,96 · 0,0715 → [1,043; 1,380]', (jfmt(slog, 4), jfmt(rlo, 3), jfmt(rhi, 3)) == ('0,0715', '1,043', '1,380'))
    for s in ('[0,7; 5,3] / 15 = [4,7%; 35,3%]', 'ln 1,2 ± 1,96 · 0,0715', '[1,043; 1,380]', 'lift trong [4,3%; 38,0%]', '[3,2%; 36,8%]'):
        needs(f'p1 · 2.2 "{s}"', 's-estimate', s)

    def wilson(x, n):
        p, zq = x / n, Z975
        den = 1 + zq * zq / n
        c = (p + zq * zq / (2 * n)) / den
        h = zq * math.sqrt(p * (1 - p) / n + zq * zq / (4 * n * n)) / den
        return c - h, c + h
    (l1_, u1_), (l0_, u0_) = wilson(x1, n1), wilson(x0, n0)
    nlo = (p1_ - p0_) - math.sqrt((p1_ - l1_) ** 2 + (u0_ - p0_) ** 2)
    nhi = (p1_ - p0_) + math.sqrt((p0_ - l0_) ** 2 + (u1_ - p1_) ** 2)
    claim('p1 · 2.2 Newcomb (mặc định statsmodels) cũng ra [0,70; 5,30]', (jfmt(nlo * 100, 2), jfmt(nhi * 100, 2)) == ('0,70', '5,30'), f'{nlo:.6f} {nhi:.6f}')
    for s in (f'chênh lệch {p1_ - p0_:.4f}, KTC [{lo:.4f}; {hi:.4f}]', f'z = {zz:.2f}, p = {pp:.4f}', f'lift {lift:.3f}, KTC [{rlo - 1:.3f}; {rhi - 1:.3f}]'):
        claim(f'p1 · 2.2 code in ra "{s}"', s in sec_html('s-estimate'))
    se5 = math.sqrt(0.18 * 0.82 / 500 + 0.15 * 0.85 / 500)
    claim('p1 · 2.2 lời giải n = 500: SE 2,35, ±4,6, [−1,6; 7,6], rộng gấp đôi ±2,3',
          (jfmt(se5 * 100, 2), jfmt(Z975 * se5 * 100, 1), jfmt((0.03 - Z975 * se5) * 100, 1), jfmt((0.03 + Z975 * se5) * 100, 1), jfmt(Z975 * se_u * 100, 1))
          == ('2,35', '4,6', '−1,6', '7,6', '2,3') and abs(se5 / se_u - 2) < 1e-12)
    needs('p1 · 2.2 lời giải', 's-estimate', 'KTC = 3,0 ± 4,6 = [−1,6; 7,6] điểm')

    # ══ 2.3 · mô hình power ══════════════════════════════════════════════════════
    def n_page(p0, p1, a=0.05, pw=0.8):
        pbar = (p0 + p1) / 2
        return (ND.inv_cdf(1 - a / 2) * math.sqrt(2 * pbar * (1 - pbar)) + ND.inv_cdf(pw) * math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2 / (p1 - p0) ** 2

    def n_cohen(p0, p1, a=0.05, pw=0.8):
        h = 2 * math.asin(math.sqrt(p1)) - 2 * math.asin(math.sqrt(p0))
        return 2 * ((ND.inv_cdf(1 - a / 2) + ND.inv_cdf(pw)) / h) ** 2

    nA = n_page(0.10, 0.11)
    nH = n_page(0.10, 0.105)
    n2 = n_page(0.02, 0.022)
    n90 = n_page(0.10, 0.11, pw=0.9)
    N = math.ceil(nA)
    claim('p1 · 2.3 n = 14.751 (14.750,8), tổng 29.502, 11,8 ngày → 12 → 2 tuần',
          (jfmt(nA, 1), N, 2 * N, jfmt(2 * N / 2500, 1), math.ceil(2 * N / 2500), math.ceil(math.ceil(2 * N / 2500) / 7)) == ('14.750,8', 14751, 29502, '11,8', 12, 2))
    claim('p1 · 2.3 MDE 0,5 điểm → 57.763, gấp 3,9 lần; nền 2% MDE 10% → 80.682',
          (math.ceil(nH), jfmt(math.ceil(nH) / N, 1), math.ceil(n2)) == (57763, '3,9', 80682))
    claim('p1 · 2.3 LUẬT n ∝ 1/MDE²: nửa MDE → gần 4 lần (3,5–4,5)', 3.5 < nH / nA < 4.5)
    claim('p1 · 2.3 độ mạnh 90%: 19.747, +34%, 39.494, 15,8 ngày → 3 tuần',
          (math.ceil(n90), jfmt((math.ceil(n90) / N - 1) * 100, 0), 2 * math.ceil(n90), jfmt(2 * math.ceil(n90) / 2500, 1), math.ceil(math.ceil(2 * math.ceil(n90) / 2500) / 7))
          == (19747, '34', 39494, '15,8', 3))
    for s in ('14.751 khách mỗi nhóm', '29.502 người', 'đó là 11,8 ngày', '2 tuần đủ', 'cần 57.763 khách mỗi nhóm: gấp 3,9 lần', 'n vọt lên 80.682 mỗi nhóm',
              'n = 19.747 khách mỗi nhóm — nhiều hơn 34%', 'Tổng 39.494 khách, chia 2.500 mỗi ngày là 15,8 ngày', '3 tuần đủ'):
        needs(f'p1 · 2.3 "{s}"', 's-power', s)
    # các mảnh của công thức, viết bằng 4 chữ số — và vì sao chúng cho 14.750 chứ không phải 14.750,8
    parts_ = (math.sqrt(2 * 0.105 * 0.895), math.sqrt(0.10 * 0.90 + 0.11 * 0.89), ND.inv_cdf(0.8), ND.inv_cdf(0.9))
    claim('p1 · 2.3 mảnh công thức: 0,4335 / 0,4335 / 0,8416 / 1,2816',
          tuple(jfmt(v, 4) for v in parts_) == ('0,4335', '0,4335', '0,8416', '1,2816'))
    rough = (1.96 * 0.4335 + 0.8416 * 0.4335) ** 2 / 0.01 ** 2
    claim('p1 · 2.3 làm tròn giữa chừng ra ≈ 14.750, không làm tròn ra 14.750,8', jfmt(rough, 0) == '14.750' and jfmt(nA, 1) == '14.750,8', f'{rough:.2f}')
    needs('p1 · 2.3 fx', 's-power', '(1,96 · 0,4335 + 0,8416 · 0,4335)² / 0,01² ≈ 14.750')
    nC = n_cohen(0.10, 0.11)
    claim('p1 · 2.3 Cohen\'s h: 14.744,1 — lệch chưa tới 0,1%', jfmt(nC, 1) == '14.744,1' and abs(nC / nA - 1) < 0.001, f'{nC:.3f}')
    claim('p1 · 2.3 2% → 4%: 1.141 so với 1.110, lệch 2,7%',
          (math.ceil(n_page(0.02, 0.04)), jfmt(n_cohen(0.02, 0.04), 0), jfmt((1 - n_cohen(0.02, 0.04) / n_page(0.02, 0.04)) * 100, 1)) == (1141, '1.110', '2,7'))
    for s in ('ra 14.750,8', 'nó cho 14.744,1 — lệch chưa tới 0,1%', 'cho 1.141 khách mỗi nhóm, Cohen’s h cho 1.110 — lệch 2,7%'):
        needs(f'p1 · 2.3 "{s}"', 's-power', s)
    claim('p1 · 2.3 code in ra "14750.8 14744.1" và "14751 29502 12 2"',
          f'{round(nA, 1)} {round(nC, 1)}' == '14750.8 14744.1' and '14750.8 14744.1' in sec_html('s-power') and '14751 29502 12 2' in sec_html('s-power'))
    claim('p1 · 2.3 paper CUPED: 5% → 0,5% cần gấp (5/0,5)² = 100 lần', (5 / 0.5) ** 2 == 100)
    claim('p1 · 2.3 ví von: gấp nghìn lần khách → hẹp đi chừng 32 lần', jfmt(math.sqrt(1000), 0) == '32')
    needs('p1 · 2.3 ví von 32', 's-power', 'chỉ làm khoảng tin cậy hẹp đi chừng 32 lần')
    same('p1 · power ô mỗi nhóm', 'm-power-n', '14.751')
    same('p1 · power ô tổng', 'm-power-tot', '29.502')
    same('p1 · power ô ngày', 'm-power-d', '12')
    same('p1 · power ô tuần', 'm-power-w', '2 tuần')
    same('p1 · power câu mặc định', 'm-power-say',
         'Cần 14.751 khách mỗi nhóm (29.502 tổng). Với 2.500 khách mới mỗi ngày: tối thiểu 12 ngày → chạy 2 tuần đủ (14 ngày), '
         f'tức khoảng {jfmt(14 * 2500, 0)} khách — dư ra chỉ làm độ mạnh cao hơn. Muốn thấy MDE bằng một nửa (0,5 điểm) thì cần 57.763 mỗi nhóm, gấp 3,9 lần.')
    js_has('p1 · power JS: công thức cỡ mẫu đúng dạng đã chốt', 4,
           'var za = Phinv(1 - alpha / 2), zb = Phinv(power), pb = (p0 + p1) / 2;')
    js_has('p1 · power JS: gộp dưới H0, riêng dưới H1', 4,
           'var num = za * Math.sqrt(2 * pb * (1 - pb)) + zb * Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1));')
    js_has('p1 · power JS: chia (p1 − p0)²', 4, 'return num * num / ((p1 - p0) * (p1 - p0));')
    js_has('p1 · power JS: làm tròn LÊN, ngày → tuần đủ', 4, 'var n = Math.ceil(powN(p0, p0 + mde, alpha, power)), tot = 2 * n;')
    js_has('p1 · power JS: tuần đủ', 4, 'weeks: Math.ceil(days / 7)')

    # ══ 2.4 · mô hình cuped ══════════════════════════════════════════════════════
    def cup_base():
        r, z1, z2 = jsrng(31337), [], []
        for _ in range(400):
            z1.append(jclamp(jsgauss(r), -3, 3)); z2.append(jclamp(jsgauss(r), -3, 3))
        idx = jshuffle(list(range(400)), r)
        T = [0] * 400
        for i in idx[:200]:
            T[i] = 1
        return z1, z2, T

    def cup_fit(z1, z2, T, rho, tau_=30):
        s = math.sqrt(1 - rho * rho)
        X = [500 + 150 * a for a in z1]
        Y = [500 + 150 * (rho * a + s * b) + tau_ * t for a, b, t in zip(z1, z2, T)]
        mx, my = mean(X), mean(Y)
        cxy = vx = vy = 0.0
        for a, b in zip(X, Y):
            cxy += (a - mx) * (b - my); vx += (a - mx) * (a - mx); vy += (b - my) * (b - my)
        th = cxy / vx
        Yp = [b - th * (a - mx) for a, b in zip(X, Y)]
        g = lambda v, t: [q for q, tt in zip(v, T) if tt == t]
        y1, y0, q1, q0 = g(Y, 1), g(Y, 0), g(Yp, 1), g(Yp, 0)
        return dict(theta=th, r=cxy / math.sqrt(vx * vy), ratio=var(Yp) / var(Y),
                    raw=mean(y1) - mean(y0), seRaw=math.sqrt(var(y1) / len(y1) + var(y0) / len(y0)),
                    adj=mean(q1) - mean(q0), seAdj=math.sqrt(var(q1) / len(q1) + var(q0) / len(q0)))

    z1, z2, CT = cup_base()
    F = {rho: cup_fit(z1, z2, CT, rho) for rho in (0.0, 0.3, 0.5, 0.7, 0.9, 0.95)}
    claim('p1 · cuped LUẬT (trên mẫu): Var(Y′) = Var(Y)(1 − r²) ở mọi ρ', all(abs(f['ratio'] - (1 - f['r'] ** 2)) < 1e-12 for f in F.values()))
    f7 = F[0.7]
    zc = Z975
    ci = lambda e, s: f'[{jfmt(e - zc * s, 1)}; {jfmt(e + zc * s, 1)}]'
    same('p1 · cuped ô θ', 'm-cuped-theta', jfmt(f7['theta'], 3))
    same('p1 · cuped ô phương sai còn lại', 'm-cuped-ratio', jpct(f7['ratio'], 1))
    # "cần ít hơn" tỉ lệ với phương sai → phải là 1 − (phương sai còn lại) đo trên CÙNG mẫu, để hai ô đứng cạnh nhau
    # cộng lại đúng 100% (bản cũ in ρ² của thanh trượt: 53,5% cạnh 49%). Rà soát của P3, A2.
    same('p1 · cuped ô cần ít hơn = 1 − phương sai còn lại', 'm-cuped-save', jpct(1 - f7['ratio'], 1))
    shown = lambda x: Decimal(jfmt(x * 100, 1).replace(',', '.'))
    claim('p1 · cuped ở ρ = 0,7 hai ô cộng lại đúng 100,0% (53,5 + 46,5)', shown(f7['ratio']) + shown(1 - f7['ratio']) == 100)
    claim('p1 · cuped ở mọi ρ đã thử hai ô cộng lại 100% (± 0,1 do làm tròn)',
          all(abs(shown(f['ratio']) + shown(1 - f['ratio']) - 100) <= Decimal('0.1') for f in F.values()))
    js_has('p1 · cuped JS: save = 1 − ratio, cùng mẫu', 5, 'ratio: ratio, save: 1 - ratio')
    a1_ = HTML.find('PHẦN 1 · mở đầu, chặng 1–2'); a2_ = HTML.find('PHẦN 2 · chặng 3–4', a1_)
    p1js = HTML[a1_:a2_] if a1_ >= 0 and a2_ > a1_ else ''
    claim('p1 · cuped JS: ô "cần ít hơn" in F.save, không in ρ² của thanh trượt',
          re.search(r"\$\('m-cuped-save'\)\.textContent\s*=\s*pct\(F\.save,\s*1\);", p1js) is not None and 'pct(rho * rho' not in p1js)
    same('p1 · cuped ô thô', 'm-cuped-raw', f"{jfmt(f7['raw'], 1)} ± {jfmt(f7['seRaw'], 1)}")
    same('p1 · cuped ô CUPED', 'm-cuped-adj', f"{jfmt(f7['adj'], 1)} ± {jfmt(f7['seAdj'], 1)}")
    same('p1 · cuped câu mặc định', 'm-cuped-say',
         f"ρ = 0,70, đo trên mẫu này r = {jfmt(f7['r'], 3)}; θ = {jfmt(f7['theta'], 3)}. Phương sai của Y′ bằng {jpct(f7['ratio'], 1)} phương sai của Y — đúng bằng 1 − r². "
         f"Khoảng tin cậy 95%: thô {ci(f7['raw'], f7['seRaw'])}, CUPED {ci(f7['adj'], f7['seAdj'])} nghìn ₫. Tác động thật: 30.")
    claim('p1 · cuped gợi ý ρ = 0,7: thô 27,9 ± 15,2 (KTC chứa 0), CUPED 32,7 ± 11,0 (KTC không chứa 0)',
          (jfmt(f7['raw'], 1), jfmt(f7['seRaw'], 1), jfmt(f7['adj'], 1), jfmt(f7['seAdj'], 1)) == ('27,9', '15,2', '32,7', '11,0')
          and f7['raw'] - zc * f7['seRaw'] < 0 < f7['adj'] - zc * f7['seAdj'])
    claim('p1 · cuped gợi ý ρ = 0: 33,9 và 33,7', (jfmt(F[0.0]['raw'], 1), jfmt(F[0.0]['adj'], 1)) == ('33,9', '33,7'))
    claim('p1 · cuped gợi ý ρ = 0,95: SE còn "chừng một phần ba" (0,28–0,38)', 0.28 < F[0.95]['seAdj'] / F[0.95]['seRaw'] < 0.38, f"{F[0.95]['seAdj'] / F[0.95]['seRaw']:.4f}")
    claim('p1 · cuped SE co lại gần √(1 − ρ²) (lệch < 8%)', all(abs(f['seAdj'] / f['seRaw'] / math.sqrt(1 - rho * rho) - 1) < 0.08 for rho, f in F.items()))
    for s in ('27,9 ± 15,2 nghìn ₫', '32,7 ± 11,0', '(33,9 và 33,7)', 'phương sai còn 1 − 0,49 = 51%', 'ít hơn 49%'):
        claim(f'p1 · 2.4 "{s}"', s in sec_text('s-cuped'))
    # KHÔNG CHỆCH nhờ bốc thăm: bốc lại 400 lần trên chính 400 khách ấy (Y(0) cố định, τ = 30)
    s7 = math.sqrt(1 - 0.49)
    X7 = [500 + 150 * a for a in z1]
    Y07 = [500 + 150 * (0.7 * a + s7 * b) for a, b in zip(z1, z2)]
    mx7 = mean(X7)
    vx7 = sum((a - mx7) ** 2 for a in X7)
    rr = jsrng(2013)
    est_raw, est_adj = [], []
    for _ in range(400):
        t = jshuffle(list(CT), rr)
        Yt = [b + 30 * tt for b, tt in zip(Y07, t)]
        my7 = mean(Yt)
        th = sum((a - mx7) * (b - my7) for a, b in zip(X7, Yt)) / vx7
        Yp = [b - th * (a - mx7) for a, b in zip(X7, Yt)]
        est_raw.append(mean([b for b, tt in zip(Yt, t) if tt]) - mean([b for b, tt in zip(Yt, t) if not tt]))
        est_adj.append(mean([b for b, tt in zip(Yp, t) if tt]) - mean([b for b, tt in zip(Yp, t) if not tt]))
    mr, ma = mean(est_raw), mean(est_adj)
    claim('p1 · cuped LUẬT: không chệch — TB của 400 lần bốc lại cách 30 chưa tới 3 sai số chuẩn của trung bình',
          abs(ma - 30) < 3 * jsd(est_adj) / math.sqrt(400) and abs(mr - 30) < 3 * jsd(est_raw) / math.sqrt(400), f'thô {mr:.3f}, CUPED {ma:.3f}')
    claim('p1 · cuped LUẬT: độ vung qua các lần bốc co lại cỡ √(1 − r²)', abs(jsd(est_adj) / jsd(est_raw) / math.sqrt(1 - f7['r'] ** 2) - 1) < 0.1,
          f"{jsd(est_adj) / jsd(est_raw):.3f} so với {math.sqrt(1 - f7['r'] ** 2):.3f}")
    # hồi quy Y ~ T + X gần như trùng CUPED (hai cách chỉ khác chỗ lấy θ)
    X7b = [500 + 150 * a for a in z1]
    Y7b = [b + 30 * t for b, t in zip(Y07, CT)]
    beta = ols([CT, X7b], Y7b)
    near('p1 · cuped ≈ hồi quy Y ~ T + X (ANCOVA)', beta[1], f7['adj'], 0.5 * f7['seAdj'])
    # câu tự kiểm
    claim('p1 · 2.4 lời giải: 20.000 × 0,75 = 15.000; ρ = 0,3 → 18.200, bớt 9%', (20000 * Fraction(3, 4), 20000 * Fraction(91, 100), 1 - Fraction(91, 100)) == (15000, 18200, Fraction(9, 100)))
    for s in ('cần 15.000 khách mỗi nhóm — bớt 25%', 'vẫn cần 18.200, chỉ bớt 9%'):
        needs(f'p1 · 2.4 lời giải "{s}"', 's-cuped', s)
    # code (đã chạy bằng numpy — notes): đoạn văn đọc đúng các số in ra
    for s in ('ρ = 0.698, θ = 0.719', 'thô   30.93 ± 4.80', 'CUPED 33.57 ± 3.41', 'OLS   33.57 ± 3.41', 'TB 30.01 và 29.97; độ vung 4.83 và 3.42'):
        claim(f'p1 · 2.4 code in ra "{s}"', s in sec_html('s-cuped'))
    claim('p1 · 2.4 đoạn văn: 3,42 / 4,83 ≈ 0,71; √(1 − 0,698²) ≈ 0,72', jfmt(3.42 / 4.83, 2) == '0,71' and jfmt(math.sqrt(1 - 0.698 ** 2), 2) == '0,72')
    needs('p1 · 2.4 đoạn văn', 's-cuped', 'độ vung là 4,83 so với 3,42 — tỉ số 0,71, đúng cỡ √(1 − 0,698²) ≈ 0,72')
    js_has('p1 · cuped JS: θ = cov(Y,X)/var(X) trên dữ liệu gộp', 5, 'var theta = cxy / vx;')
    js_has('p1 · cuped JS: Y′ = Y − θ(X − X̄)', 5, 'Yp.push(D.Y[i] - theta * (D.X[i] - mx));')
    js_has('p1 · cuped JS: X đo trước, không dính T', 5, 'X.push(500 + 150 * B.z1[i]);')
    js_has('p1 · cuped JS: tác động thật cộng vào Y', 5, 'Y.push(500 + 150 * (rho * B.z1[i] + s * B.z2[i]) + CTAU * B.T[i]);')

    # ══ 2.5 · bảng quyết định ═════════════════════════════════════════════════════
    def cell(lo_, hi_, mde=1.0):
        if hi_ < 0:
            return 'hại'
        if lo_ >= mde:
            return 'A'
        if lo_ > 0:
            return 'B'
        if hi_ >= mde:
            return 'C'
        return 'D'
    rows = re.findall(r'<tr><td><b>([ABCD])</b></td><td>[^<]*ví dụ \[([−\d,]+); ([−\d,]+)\]</td>', sec_html('s-oec'))
    tonum = lambda s: float(s.replace('−', '-').replace(',', '.'))
    claim('p1 · 2.5 bảng có đủ bốn ô A B C D', [r[0] for r in rows] == ['A', 'B', 'C', 'D'], str(rows))
    for L, lo_, hi_ in rows:
        claim(f'p1 · 2.5 ví dụ ô {L} [{lo_}; {hi_}] rơi đúng ô {L}', cell(tonum(lo_), tonum(hi_)) == L)
        claim(f'p1 · 2.5 hình vẽ khớp bảng ô {L}', f'[{lo_}; {hi_}]' in re.sub(r'<[^>]+>', '', sec_html('s-oec').split('<div class="tw">')[0]))
    claim('p1 · 2.5 lời giải [0,2; 0,8] rơi ô B', cell(0.2, 0.8) == 'B')
    zc5 = 0.7 / (1.1 / Z975)
    claim('p1 · 2.5 ví dụ ô C: KTC [−0,4; 1,8] (Wald, đối xứng) đi cùng p ≈ 0,21', jfmt(2 * (1 - ND.cdf(zc5)), 2) == '0,21')
    needs('p1 · 2.5 p = 0,21 đi cùng [−0,4; 1,8]', 's-oec', 'p = 0,21 chỉ nói dữ liệu chưa phân biệt được tác động với 0. Nếu khoảng tin cậy là [−0,4; 1,8] điểm')
    claim('p1 · 2.5 năm thước đo độc lập, không tác động: P(ít nhất một có ý nghĩa) = 1 − 0,95⁵ ≈ 23%', jfmt((1 - 0.95 ** 5) * 100, 0) == '23')
    needs('p1 · 2.5 câu 23%', 's-oec', '1 − 0,95⁵ ≈ 23%')
    claim('p1 · 2.5 LUẬT: bốn ô + ô gương phủ kín mọi khoảng', all(cell(a / 10, b / 10) in 'ABCDhại' for a in range(-30, 31) for b in range(a, 31)))

    # ══ 2.6 · từ đầu tới cuối ══════════════════════════════════════════════════════
    nT, xT, nC_, xC = 17688, 1946, 17526, 1760
    eT, eC = 214, 206
    tot = nT + nC_
    chi2 = (nT - tot / 2) ** 2 / (tot / 2) * 2
    claim('p1 · 2.6 SRM χ² = 0,75, p = 0,39, tổng 35.214', (jfmt(chi2, 2), jfmt(chi2_sf_df1(chi2), 2), tot) == ('0,75', '0,39', 35214))
    pT, pC = xT / nT, xC / nC_
    seu = math.sqrt(pT * (1 - pT) / nT + pC * (1 - pC) / nC_)
    pbar = (xT + xC) / tot
    z6 = (pT - pC) / math.sqrt(pbar * (1 - pbar) * (1 / nT + 1 / nC_))
    p6 = 2 * (1 - ND.cdf(abs(z6)))
    lo6, hi6 = pT - pC - Z975 * seu, pT - pC + Z975 * seu
    sl6 = math.sqrt(1 / xT - 1 / nT + 1 / xC - 1 / nC_)
    rl6, rh6 = math.exp(math.log(pT / pC) - Z975 * sl6) - 1, math.exp(math.log(pT / pC) + Z975 * sl6) - 1
    claim('p1 · 2.6 11,00% vs 10,04%, +0,96, [0,32; 1,60], z 2,93, p 0,0033, lift 9,6% [3,1%; 16,4%]',
          (jfmt(pT * 100, 2), jfmt(pC * 100, 2), jfmt((pT - pC) * 100, 2), jfmt(lo6 * 100, 2), jfmt(hi6 * 100, 2), jfmt(z6, 2), jfmt(p6, 4),
           jfmt((pT / pC - 1) * 100, 1), jfmt(rl6 * 100, 1), jfmt(rh6 * 100, 1)) == ('11,00', '10,04', '0,96', '0,32', '1,60', '2,93', '0,0033', '9,6', '3,1', '16,4'))
    ge, gc = eT / nT, eC / nC_
    gse = math.sqrt(ge * (1 - ge) / nT + gc * (1 - gc) / nC_)
    glo, ghi = ge - gc - Z975 * gse, ge - gc + Z975 * gse
    claim('p1 · 2.6 bảo vệ: 1,21% vs 1,18%, +0,03, [−0,19; 0,26], đầu trên < 0,3 → đạt',
          (jfmt(ge * 100, 2), jfmt(gc * 100, 2), jfmt((ge - gc) * 100, 2), jfmt(glo * 100, 2), jfmt(ghi * 100, 2)) == ('1,21', '1,18', '0,03', '−0,19', '0,26') and ghi < 0.003)
    claim('p1 · 2.6 quyết định: [0,32; 1,60] với MDE 1 rơi ô B', cell(lo6 * 100, hi6 * 100) == 'B')
    claim('p1 · 2.6 kế hoạch dùng đúng n của 2.3 và đủ khách: 2 tuần × 2.500 ≥ 29.502; thực tế 35.214 ≥ 29.502', 14 * 2500 >= 2 * N and tot >= 2 * N)
    for s in ('14.751 khách mỗi nhóm', '17.688 khách thấy màn hình mới, 17.526 thấy màn hình cũ — tổng 35.214', 'χ² = 0,75, p = 0,39',
              '1.946 / 17.688 = 11,00%', '1.760 / 17.526 = 10,04%', 'Chênh lệch +0,96 điểm', '[0,32; 1,60] điểm', 'z = 2,93, p = 0,0033',
              'Lift +9,6%, khoảng [3,1%; 16,4%]', '214 / 17.688 = 1,21% so với 206 / 17.526 = 1,18%, chênh +0,03 điểm, khoảng [−0,19; 0,26]',
              'từ 10,04% lên 11,00%', '+0,32 tới +1,60 điểm', '+3,1% tới +16,4%', 'khoảng tin cậy 95% tới +0,26 điểm, vẫn dưới ngưỡng 0,3 đã đặt'):
        needs(f'p1 · 2.6 "{s}"', 's-analyze', s)
    for s in (f'SRM: χ² = {chi2:.2f}, p = {chi2_sf_df1(chi2):.2f}', f'{pT:.4f} vs {pC:.4f}: chênh {pT - pC:.4f}',
              f'KTC [{lo6:.4f}; {hi6:.4f}], z = {z6:.2f}, p = {p6:.4f}', f'lift {pT / pC - 1:.3f}, KTC [{rl6:.3f}; {rh6:.3f}]',
              f'lỗi: chênh {ge - gc:.4f}, KTC [{glo:.4f}; {ghi:.4f}]'):
        claim(f'p1 · 2.6 code in ra "{s}"', s in sec_html('s-analyze'))
    c2 = (18100 - 17607) ** 2 / 17607 + (17114 - 17607) ** 2 / 17607
    claim('p1 · 2.6 lời giải SRM: 18.100 + 17.114 = 35.214, χ² ≈ 27,6, 51,4%, p < 0,0001',
          18100 + 17114 == tot and jfmt(c2, 1) == '27,6' and jfmt(18100 / tot * 100, 1) == '51,4' and chi2_sf_df1(c2) < 1e-4)
    needs('p1 · 2.6 lời giải SRM', 's-analyze', '≈ 27,6, p < 0,0001: tỉ lệ chia lệch rõ (51,4% thay vì 50%)')

    # ══ lede: câu trả lời bằng số ở đầu mục — ghim NGUYÊN CÂU, số ghép từ giá trị đã tính ═════
    def lede(sid):
        m = re.search(r'<p class="lede">(.*?)</p>', sec_html(sid), re.S)
        return re.sub(r'\s+', ' ', _hh.unescape(re.sub(r'<[^>]+>', '', m.group(1)))).strip() if m else ''
    claim('p1 · lede 2.2 đúng từng số', lede('s-estimate') ==
          f'+{jfmt((p1_ - p0_) * 100, 1)} điểm phần trăm, với khoảng tin cậy 95% từ {jfmt(lo * 100, 1)} tới {jfmt(hi * 100, 1)} điểm, p = {jfmt(pp, 3)}. '
          f'Nói theo tỉ lệ: +{jfmt(lift * 100, 0)}%, trong khoảng từ {jfmt((rlo - 1) * 100, 1)}% tới {jfmt((rhi - 1) * 100, 1)}% — không phải '
          f'{jfmt(naive_l[0] * 100, 1)}% tới {jfmt(naive_l[1] * 100, 1)}% như khi lấy khoảng trên chia cho 15%.', lede('s-estimate'))
    claim('p1 · lede 2.3 đúng từng số', lede('s-power') ==
          f'Nếu thay đổi nhỏ nhất đáng để bạn quan tâm là +1 điểm phần trăm (10% → 11%), với α = 5% và độ mạnh 80%, bạn cần {jfmt(N, 0)} khách mỗi nhóm — '
          f'{jfmt(2 * N, 0)} người. Với 2.500 khách mới vào thí nghiệm mỗi ngày, đó là {jfmt(2 * N / 2500, 1)} ngày, làm tròn lên thành '
          f'{math.ceil(math.ceil(2 * N / 2500) / 7)} tuần đủ. Muốn thấy +0,5 điểm thì cần {jfmt(math.ceil(nH), 0)} khách mỗi nhóm: gấp {jfmt(math.ceil(nH) / N, 1)} lần.', lede('s-power'))
    claim('p1 · lede 2.4 đúng từng số', f'nếu tương quan giữa hai kỳ là ρ = 0,7 thì phương sai còn 1 − {jfmt(0.49, 2)} = {jfmt(51, 0)}%, tức bạn cần ít hơn {jfmt(49, 0)}% số khách' in lede('s-cuped'))
    claim('p1 · lede 2.1: gấp 100 lần người thì lệch nhỏ đi 10 lần', 'gấp 100 lần người thì lệch nhỏ đi 10 lần' in lede('s-random') and math.sqrt(100) == 10)

    # ══ quét "nghi gõ nhầm": số ≥ 4 chữ số chỉ khác một số quan trọng ở 1–2 chữ số ═══════════
    def typo_scan(sid, keys, allow=()):
        toks = re.findall(r'\d[\d.,]*\d', sec_text(sid))
        for key in keys:
            bad = sorted({t for t in toks if t not in keys and t not in allow and len(t) == len(key)
                          and all((a == b) if not b.isdigit() else a.isdigit() for a, b in zip(t, key))
                          and sum(a != b for a, b in zip(t, key)) <= 2})
            claim(f'p1 · {sid} không có số gần giống {key}', not bad, f'nghi gõ nhầm {key}: {bad}')
    typo_scan('s-ate', ['236.314', '201.378', '34.936', '49.498', '64.060', '64.966'])
    typo_scan('s-power', ['14.751', '29.502', '57.763', '80.682', '19.747', '39.494'], allow=('14.750',))
    typo_scan('s-analyze', ['14.751', '17.688', '17.526', '35.214', '1.946', '1.760'], allow=('17.607', '1.141'))
    typo_scan('s-estimate', ['0,0715', '1,043', '1,380'])

    # ══ bản chép Python ở trên chỉ đúng khi JS của trang còn đúng những hằng số / dòng này ══
    for i, lines in enumerate((
        ['var r = rng(2718 + 7919 * k), idx = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], r);'],
        ['var r = rng(20260927), pop = [];', 'var y0 = Math.max(0, Math.round(40 + 460 * f + 70 * gauss(r)));',
         'var t = Math.round(15 + 70 * (1 - f) + 20 * gauss(r));', 'var y1 = Math.max(0, y0 + t);',
         "var r = rng(7001 + 7919 * k + (rule === 'quen' ? 1 : rule === 'bo' ? 2 : 0) * 104729)",
         "score.push((rule === 'quen' ? pop[i].f : 1 - pop[i].f) + 0.15 * gauss(r));",
         'idx.sort(function (a, b) { return score[b] - score[a] || a - b; });',
         'var a = s1T * 1000 / nT, b = s0T * 1000 / nT, c = s0C * 1000 / nC, d = s1C * 1000 / nC;'],
        ['var SR = { L1: 0.45, L0: 0.40, S1: 0.15, S0: 0.10 };', 'var nS1 = 10 * sPct, nL1 = 10 * lPct, nS0 = 1000 - nS1, nL0 = 1000 - nL1;',
         'var r1 = (nL1 * SR.L1 + nS1 * SR.S1) / (nL1 + nS1), r0 = (nL0 * SR.L0 + nS0 * SR.S0) / (nL0 + nS0);'],
        ['var BN = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], BR = 200;', 'var r = rng(4242), X = [], U = [];',
         'X.push(Math.round(Math.exp(5 + 0.6 * gauss(r))));', 'U.push(Math.round((0.3 + 7.7 * r()) * 10) / 10);',
         "var r = rng(99991 + 7 * n + 100003 * round + (design === 'block' ? 55555 : 0));",
         'if (n1 < 2 || n0 < 2) { k--; continue; }',
         'var v1 = (qx1 - n1 * m1 * m1) / (n1 - 1), v0 = (qx0 - n0 * m0 * m0) / (n0 - 1);'],
        [],
        ['var CN = 400, CTAU = 30;', 'var r = rng(31337), z1 = [], z2 = [], i;',
         'z1.push(clamp(gauss(r), -3, 3)); z2.push(clamp(gauss(r), -3, 3));', 'shuffle(idx, r);',
         'for (i = 0; i < CN / 2; i++) T[idx[i]] = 1;',
         'raw: mean(y1) - mean(y0), seRaw: Math.sqrt(variance(y1) / y1.length + variance(y0) / y0.length),',
         'adj: mean(p1) - mean(p0), seAdj: Math.sqrt(variance(p1) / p1.length + variance(p0) / p0.length)'])):
        for ln in lines:
            js_has(f'p1 · JS mô hình {i + 1} còn dòng dựng dữ liệu: {ln[:48]}', i, ln)
    p1js = HTML[HTML.find('PHẦN 1 · mở đầu, chặng 1–2'):HTML.find('PHẦN 2 · chặng 3–4')]
    for frag in ("var T = poQuen(), god = true, rule = 'quen', k = 0;", "var pop = selPop(), rule = 'quen', k = 0;",
                 "var P = null, cache = {}, sig = {}, idx = 3, design = 'coin', round = 0;", "var mode = 'abs', alpha = 0.05, power = 0.8;",
                 "var B = cupBase(), zc = Phinv(0.975);",
                 # câu chữ của các dòng "điều cần thấy" — chữ mặc định in sẵn trong HTML phải cùng khuôn với câu JS
                 "'Tác động thật trung bình là ' + nf(poAte()) + ' nghìn ₫, nên phép so này '",
                 "' ₫ + thiên lệch chọn ' + money(D.bias) + ' ₫ — cộng tay là khớp tới từng đồng, vì cả ba là hiệu của ba cột. '",
                 "' nghìn ₫ — công thức 2σ/√n cho ' + f1(th) + '. Có ' + pct(over, 1) + ' số lần bốc cho |SMD| vượt 0,1, dù lần nào cũng bốc đúng quy trình.'",
                 "' khách — dư ra chỉ làm độ mạnh cao hơn. Muốn thấy MDE bằng một nửa ('",
                 "'. Phương sai của Y′ bằng ' + pct(F.ratio, 1) + ' phương sai của Y — đúng bằng 1 − r². Khoảng tin cậy 95%: thô '"):
        claim(f'p1 · JS còn: {frag[:56]}', frag in p1js, 'JS đã đổi — sửa cả chữ mặc định trong HTML và bản chép trong checks')
    for rx, lab in (('id="m-balance-n" min="0" max="9" step="1" value="3"', 'balance mở ở n = 200'),
                    (r'id="m-cuped-rho" min="0" max="0.95" step="0.05" value="0.7"', 'cuped mở ở ρ = 0,7'),
                    (r'id="m-power-p0" min="1" max="50" step="0.5" value="10"', 'power mở ở nền 10%'),
                    (r'id="m-power-mdea" min="0.1" max="5" step="0.1" value="1"', 'power mở ở MDE 1 điểm'),
                    (r'id="m-power-v" min="100" max="20000" step="100" value="2500"', 'power mở ở 2.500 khách/ngày'),
                    (r'<span class="chip on" data-v="0.05">5%</span>', 'power mở ở α = 5%'),
                    (r'<span class="chip on" data-v="0.8">80%</span>', 'power mở ở độ mạnh 80%'),
                    (r'<span class="chip on" data-v="quen">chủ chọn khách quen</span><span class="chip" data-v="coin">', 'select mở ở khách quen')):
        claim(f'p1 · HTML: {lab}', rx in HTML)

    # ══ từ điển của phần 1 trỏ vào mục có thật của phần 1 ═════════════════════════
    gl = re.search(r'var GLOSS = \[(.*?)\n\];', HTML, re.S)
    mine = [m.group(1) for m in re.finditer(r"'(#s-[a-z0-9-]+)'", gl.group(1) if gl else '')]
    p1ids = {'#s-po', '#s-ate', '#s-traps3', '#s-sutva', '#s-random', '#s-estimate', '#s-power', '#s-cuped', '#s-oec'}
    claim('p1 · từ điển: mục của phần 1 trỏ đúng mục phần 1', sum(1 for t in mine if t in p1ids) >= 18)
    gtxt = gl.group(1) if gl else ''
    claim('p1 · từ điển: confounder trỏ #s-dag (mục 4.1 dạy kỹ nhất — P2 đề nghị, agent chính chốt)',
          "'#s-dag','confounding|biến gây nhiễu|gây nhiễu']" in gtxt)
    for en_ in ('standard error', 'confidence interval'):
        claim(f'p1 · từ điển có "{en_}" → #s-estimate (SE, KTC được mở nghĩa ở 2.2)',
              re.search(r"\['%s','[^']*','[^']*','#s-estimate'" % en_, gtxt) is not None)

    # ══ vòng sửa 27/09 — các câu đã sửa theo rà soát không được quay lại ═════════
    needs('p1 · 1.2 ba con số bằng nhau cả khi tác động không đều, nếu ai được nhắn không dính tới τ', 's-ate',
          'và cả khi tác động không đều, miễn là việc ai được nhắn chẳng dính gì tới chuyện SMS tác động lên người ấy bao nhiêu')
    claim('p1 · 1.2 không còn "chỉ bằng nhau khi" (đủ, không cần)', 'chỉ bằng nhau khi' not in sec_text('s-ate'))
    needs('p1 · 0.1 đảo chiều: chính kết quả (ở lại) gây ra việc cài app', 's-cau-hoi', 'Việc ở lại gây ra việc cài app')
    for t_ in ('1 · Đảo chiều', '2 · Gây nhiễu', '3 · Chọn mẫu'):
        needs(f'p1 · 0.1 tên thẻ khớp 1.3: "{t_}"', 's-cau-hoi', t_)
    claim('p1 · 0.1 không dùng "thiên lệch chọn" làm tên riêng của câu chuyện lọc mẫu', 'thiên lệch chọn' not in sec_text('s-cau-hoi').lower())
    needs('p1 · 1.1 cặp tên chung: nhóm can thiệp / nhóm đối chứng', 's-po', 'nhóm T = 1 là nhóm can thiệp, nhóm T = 0 là nhóm đối chứng')
    needs('p1 · 2.2 lệch lên là tính chất của khoảng trên thang log', 's-estimate', 'Khoảng trên thang log rộng hơn và lệch về phía trên')
    needs('p1 · 2.2 mở nghĩa SE', 's-estimate', 'dùng sai số chuẩn (SE) nào ở đâu')
    needs('p1 · 2.2 mở nghĩa KTC', 's-estimate', '(viết tắt KTC)')
    needs('p1 · 2.3 chạy đủ tuần là vì chu kỳ tuần, mới lạ thì đọc theo từng tuần', 's-power', 'hãy đọc tác động theo từng tuần')
    claim('p1 · 2.6 không hứa hai tuần "vượt qua" hiệu ứng mới lạ', 'vượt qua hiệu ứng mới lạ' not in sec_text('s-analyze'))
    needs('p1 · 2.6 MDE là ngưỡng đáng làm, không phải mục tiêu', 's-analyze', 'nhỏ hơn ngưỡng 1 điểm mà chúng tôi coi là đáng làm')
    needs('p1 · 2.5 Strathern diễn lại Hoskin (1996)', 's-oec', 'khi bà diễn lại một ý mà Keith Hoskin (1996) đã gọi là luật Goodhart')
    claim('p1 · nhãn viết hoa bằng CSS: θ và n bọc .lc', 'Hệ số <span class="lc">θ</span>' in HTML and 'Số khách <span class="lc">n</span>' in HTML)

def run_p2():
    """Phần 2 · chặng 3 (khi thí nghiệm nói dối) và chặng 4 (không được tung đồng xu).

    Mỗi khối ứng với một mục. Dữ liệu có hạt giống được dựng lại bằng jsrng/jsgauss — bản
    chép đúng rng()/gauss() của trang — nên con số nào mô hình hiện ra cũng tính lại được.
    Tỉ lệ báo động giả khi nhìn trộm tính bằng tích phân số (không phải mô phỏng)."""
    import math

    def sig(v):
        return 1 / (1 + math.exp(-v))

    def js_block(key):
        """Đoạn JS của một mô hình, từ tiêu đề khối tới tiêu đề khối kế tiếp."""
        i = HTML.find('mô hình · ' + key + ' ')
        if i < 0:
            return ''
        j = HTML.find('/* ═══', i + 10)
        return HTML[i:j if j > 0 else len(HTML)]

    def js_has(label, block, pattern):
        claim(label, re.search(pattern, block, re.S) is not None, f'không thấy dòng JS khớp /{pattern}/')

    # ── tích phân số: P(có ít nhất một |z_j| ≥ b_j) cho bước ngẫu nhiên chuẩn ──────────
    # Simpson trên lưới thẳng hàng với mép cắt ±b·√t, nhân Gauss cắt ở ±7 độ lệch chuẩn.
    # Đã đối chiếu với numpy (lưới 0,01) và FFT (lưới 0,002): lệch < 1e-5 ở h = 0,1.
    def cross_prob(times, bounds, h=0.1, cut=7.0):
        inv = 1 / math.sqrt(2 * math.pi)
        prev_t, grid, f = 0.0, None, None
        for t, b in zip(times, bounds):
            sd = math.sqrt(t - prev_t)
            L = b * math.sqrt(t)
            n = max(2, int(math.ceil(2 * L / h)))
            n += n % 2
            step = 2 * L / n
            g = [-L + i * step for i in range(n + 1)]
            if f is None:
                f = [inv / sd * math.exp(-0.5 * (s / sd) ** 2) for s in g]
            else:
                m = len(grid) - 1
                st0 = grid[1] - grid[0]
                fw = [f[i] * st0 / 3 * (1 if i in (0, m) else (4 if i % 2 else 2)) for i in range(m + 1)]
                g0, c, new = grid[0], cut * sd, []
                for s in g:
                    lo = max(0, int(math.floor((s - c - g0) / st0)))
                    hi = min(m, int(math.ceil((s + c - g0) / st0)))
                    acc = 0.0
                    for i in range(lo, hi + 1):
                        d = (s - grid[i]) / sd
                        acc += fw[i] * math.exp(-0.5 * d * d)
                    new.append(acc * inv / sd)
                f = new
            grid, prev_t = g, t
        m = len(grid) - 1
        st0 = grid[1] - grid[0]
        return 1 - sum(f[i] * st0 / 3 * (1 if i in (0, m) else (4 if i % 2 else 2)) for i in range(m + 1))

    ZC = 1.959963984540054
    ZC_JS = z(0.975)
    near('peek: hằng ZC trong JS = z(0,975)', ZC, ZC_JS, 1e-12)

    def armitage(k, h=0.2):
        return cross_prob(list(range(1, k + 1)), [ZC] * k, h=h)

    # ═══════════════════ 3.1 · nhìn trộm ═══════════════════
    A = {k: armitage(k) for k in (1, 2, 4, 5, 7, 10, 14, 20, 28)}
    A[100] = armitage(100, h=0.3)
    A[1000] = armitage(1000, h=0.5)       # lưới thô (sai +1e-4); FFT h = 0,002 cho 0,5299
    near('peek: 1 lần nhìn = đúng 5%', A[1], 0.05, 2e-5)
    near('peek: Armitage 5 lần = 0,142', A[5], 0.142, 5e-4)
    near('peek: Armitage 100 lần = 0,374', A[100], 0.374, 5e-4)
    near('peek: Armitage 1.000 lần = 0,530', A[1000], 0.530, 1e-3)
    for k, want in ((1, '5,0%'), (2, '8,3%'), (5, '14,2%'), (10, '19,3%'), (20, '24,8%'), (28, '27,5%'), (100, '37,4%'), (1000, '53,0%')):
        claim(f'peek: bảng — {k} lần nhìn hiện {want}', vi(A[k] * 100, 1) + '%' == want, f'tính được {A[k]:.5f}')
        need(f'peek: bảng có ô {want}', '<td>' + want + '</td>' if k not in (5, 100, 1000) else '<b>' + want + '</b>')
    num('peek: lede 28 lần', A[28] * 100, 1, '')
    need('peek: lede nói 27,5%', '<b>27,5%</b> số thí nghiệm')
    claim('peek: "gấp hơn năm lần" mức 5%', 5 < A[28] / 0.05 < 6, f'{A[28] / 0.05:.2f} lần')
    ind28 = 1 - 0.95 ** 28
    num('peek: 28 lá thăm độc lập = 1 − 0,95²⁸', ind28 * 100, 1, '= ')
    need('peek: ví von 76,2%', '1 − 0,95²⁸ = 76,2%')
    claim('peek: nhìn dày hơn thì tăng tiếp (đơn điệu)', A[1] < A[2] < A[5] < A[10] < A[20] < A[28] < A[100] < A[1000])
    # JS: bảng EXACT phải là giá trị tích phân số làm tròn 4 chữ số
    blk = js_block('peek')
    m_ex = re.search(r'var EXACT = \{([^}]*)\}', blk)
    claim('peek: JS có bảng EXACT', m_ex is not None)
    if m_ex:
        ex = {int(a): float(b) for a, b in re.findall(r'(\d+):\s*([0-9.]+)', m_ex.group(1))}
        claim('peek: EXACT đủ 6 mốc 1,2,4,7,14,28', sorted(ex) == [1, 2, 4, 7, 14, 28], str(sorted(ex)))
        for k, v in ex.items():
            near(f'peek: EXACT[{k}] trong JS = tích phân số', v, A[k], 6e-5)
        need('peek: đọc số chính xác mặc định', 'id="m-peek-exact">' + vi(ex.get(28, 0) * 100, 1) + '%')
        need('peek: bội số mặc định', 'id="m-peek-x">×' + vi(ex.get(28, 0) / 0.05, 1))
    # O'Brien–Fleming và Pocock cho 5 lần nhìn
    T5 = [1, 2, 3, 4, 5]

    def solve_c(fn):
        lo, hi = 1.9, 2.8
        for _ in range(30):
            mid = (lo + hi) / 2
            if fn(mid) > 0.05:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2
    c_obf = solve_c(lambda C: cross_prob(T5, [C * math.sqrt(5 / j) for j in T5], h=0.2))
    c_poc = solve_c(lambda c: cross_prob(T5, [c] * 5, h=0.2))
    obf = [c_obf * math.sqrt(5 / j) for j in T5]
    need('peek: hàng O\'Brien–Fleming', '<td>O\'Brien–Fleming</td>' + ''.join('<td>' + vi(b, 2) + '</td>' for b in obf) + '<td>5,0%</td>')
    need('peek: hàng Pocock', '<td>Pocock</td>' + ('<td>' + vi(c_poc, 2) + '</td>') * 5 + '<td>5,0%</td>')
    need('peek: hàng không hiệu chỉnh', '<td>Không hiệu chỉnh</td>' + '<td>1,96</td>' * 5 + '<td>' + vi(A[5] * 100, 1) + '%</td>')
    near('peek: Pocock K=3 = 2,289 (Lakens)', solve_c(lambda c: cross_prob([1, 2, 3], [c] * 3, h=0.2)), 2.289, 1e-3)
    near('peek: O\'Brien–Fleming K=3 = 2,004 (Lakens)', solve_c(lambda C: cross_prob([1, 2, 3], [C * math.sqrt(3 / j) for j in (1, 2, 3)], h=0.2)), 2.004, 1e-3)
    num('peek: p danh nghĩa lần cuối O\'Brien–Fleming', p_two_sided(c_obf), 3, 'p &lt; ')
    num('peek: p danh nghĩa Pocock', p_two_sided(c_poc), 3, 'p &lt; ')
    need('peek: câu hỏi — lần cuối cần 2,04', '|z| ≥ <b>' + vi(obf[4], 2) + '</b>')
    need('peek: câu hỏi — lần đầu 4,56', '|z| ≥ ' + vi(obf[0], 2))
    need('peek: câu hỏi — 14,2%', '<b>' + vi(A[5] * 100, 1) + '%</b> — gần gấp ba')

    # Mô phỏng của mô hình: 4.000 A/A × 28 ngày, hạt giống 1969 + 7919·lần chạy
    D, M = 28, 4000
    r = jsrng(1969)
    Zs = []
    for e in range(M):
        s, row = 0.0, []
        for d in range(D):
            s += jsgauss(r)
            row.append(s / math.sqrt(d + 1))
        Zs.append(row)

    def touched(k):
        step, cnt = D // k, 0
        for row in Zs:
            for j in range(1, k + 1):
                if abs(row[j * step - 1]) > ZC:
                    cnt += 1
                    break
        return cnt / M
    FR = {k: touched(k) for k in (1, 2, 4, 7, 14, 28)}
    need('peek: gợi ý — mô phỏng 1 lần', '<b>' + vi(FR[1] * 100, 1) + '%</b> khi chỉ nhìn một lần')
    need('peek: gợi ý — mô phỏng 28 lần', '<b>' + vi(FR[28] * 100, 1) + '%</b> khi nhìn mỗi ngày')
    need('peek: đọc số mô phỏng mặc định', 'id="m-peek-sim">' + vi(FR[28] * 100, 1) + '%')
    for k in FR:
        claim(f'peek: mô phỏng {k} lần nằm trong 3 SE quanh giá trị chính xác',
              abs(FR[k] - A[k]) < 3 * math.sqrt(A[k] * (1 - A[k]) / M), f'{FR[k]:.4f} so với {A[k]:.4f}')
    claim('peek: gợi ý "lệch khoảng một điểm phần trăm" — độ lệch lớn nhất ≤ 1,5 điểm',
          max(abs(FR[k] - A[k]) for k in FR) <= 0.015)
    Z40 = z(0.8)
    near('peek: hằng Z40 (p > 0,4)', 0.8416212335729143, Z40, 1e-12)
    feat = -1
    for e, row in enumerate(Zs):
        cross = [d for d in range(D) if abs(row[d]) > ZC]
        if len(cross) >= 5 and cross[0] >= 5 and row[cross[0]] > 0 and abs(row[-1]) < Z40:
            feat = e
            break
    claim('peek: thí nghiệm được vẽ là số 280', feat == 279, f'tính được chỉ số {feat}')
    row = Zs[feat]

    def first_stop(k):
        step = D // k
        for j in range(1, k + 1):
            if abs(row[j * step - 1]) > ZC:
                return j * step
        return None
    pday = lambda d: p_two_sided(row[d - 1])
    claim('peek: số 280 — nhìn mỗi ngày dừng ở ngày 9', first_stop(28) == 9, str(first_stop(28)))
    claim('peek: số 280 — nhìn 2 lần dừng ở ngày 14', first_stop(2) == 14, str(first_stop(2)))
    claim('peek: số 280 — nhìn 1 lần thì không dừng', first_stop(1) is None)
    claim('peek: số 280 — lần vượt đầu là chiều dương', row[8] > 0)
    need('peek: gợi ý nói ngày 9 và p cuối 0,44', 'p = ' + vi(pday(28), 2) + ', không có gì')
    need('peek: câu JS mặc định', 'ngày 9 đã thấy p = ' + vi(pday(9), 3))
    need('peek: câu JS mặc định — p ngày 28', 'ngày 28, p = ' + vi(pday(28), 2) + '.')
    need('peek: gợi ý số thí nghiệm', 'thí nghiệm số 280')
    js_has('peek: JS đếm "thắng" khi BẤT KỲ lần nhìn nào vượt ngưỡng', blk,
           r'for \(j = 1; j <= k; j\+\+\) if \(Math\.abs\(z\[e \* D \+ j \* step - 1\]\) > ZC\) \{ cnt\+\+; break; \}')
    js_has('peek: JS dựng z là tổng dồn chia √d', blk, r's \+= gauss\(r\); z\[e \* D \+ d\] = s / Math\.sqrt\(d \+ 1\);')
    js_has('peek: JS dùng hạt giống 1969 + 7919·lần chạy', blk, r'return 1969 \+ 7919 \* run;')
    js_has('peek: JS 28 ngày, 4.000 thí nghiệm, ngưỡng 1,96', blk, r'var D = 28, M = 4000, ZC = 1\.959963984540054')
    js_has('peek: JS sáu mốc số lần nhìn', blk, r'var KS = \[1, 2, 4, 7, 14, 28\];')
    js_has('peek: JS lần nhìn cách đều D/k ngày (khi đếm)', blk, r'function touchedFrac\(z, k\) \{\s*var step = D / k, cnt = 0, e, j;')
    js_has('peek: JS lần nhìn cách đều D/k ngày (khi vẽ)', blk, r'k = kNow\(\), step = D / k;')
    js_has('peek: JS quy tắc chọn thí nghiệm để vẽ', blk,
           r'if \(n >= 5 && first >= 5 && z\[e \* D \+ first\] > 0 && Math\.abs\(z\[e \* D \+ D - 1\]\) < Z40\) return e;')
    # code mẫu (numpy, chạy ngoài cổng): số in ra phải nằm trong nhiễu mô phỏng của 200.000 A/A
    for k, s_ in ((1, '0.05'), (2, '0.083'), (4, '0.126'), (7, '0.165'), (14, '0.22'), (28, '0.275')):
        claim(f'peek: code in {s_} cho {k} lần — trong 4 SE của giá trị chính xác',
              abs(float(s_) - A[k]) < 4 * math.sqrt(A[k] * (1 - A[k]) / 200000) + 0.0005)
    need('peek: dòng "in ra" của code', '# in ra: 0.05 · 0.083 · 0.126 · 0.165 · 0.22 · 0.275')

    # ═══════════════════ 3.2 · nhiều thước đo ═══════════════════
    P = [0.0008, 0.0041, 0.0060, 0.0230, 0.0240, 0.0330, 0.0460, 0.0720, 0.3100, 0.6400]
    m_ = len(P)
    claim('multi: danh sách p đã xếp tăng dần', P == sorted(P))

    def sel(method, ps, a=0.05):
        mm = len(ps)
        if method == 'none':
            return [p <= a for p in ps]
        if method == 'bonf':
            return [p <= a / mm for p in ps]
        if method == 'holm':
            out = [False] * mm
            for i, p in enumerate(ps):
                if p <= a / (mm - i):
                    out[i] = True
                else:
                    break
            return out
        kmax = 0
        for i, p in enumerate(ps):
            if p <= (i + 1) * a / mm:
                kmax = i + 1
        return [i < kmax for i in range(mm)]
    cnt = {k: sum(sel(k, P)) for k in ('none', 'bonf', 'holm', 'bh')}
    claim('multi: không hiệu chỉnh giữ 7', cnt['none'] == 7, str(cnt))
    claim('multi: Bonferroni giữ 2', cnt['bonf'] == 2, str(cnt))
    claim('multi: Holm giữ 3', cnt['holm'] == 3, str(cnt))
    claim('multi: BH giữ 5', cnt['bh'] == 5, str(cnt))
    claim('multi: Holm luôn ≥ Bonferroni, BH ≥ Holm ở bảng mẫu', cnt['holm'] >= cnt['bonf'] and cnt['bh'] >= cnt['holm'])
    claim('multi: hạng 4 VƯỢT ngưỡng BH riêng (0,020) mà vẫn được giữ', P[3] > 4 * 0.05 / 10 and sel('bh', P)[3])
    claim('multi: hạng 5 lọt ngưỡng 0,025', P[4] <= 5 * 0.05 / 10)
    # "dừng ở lần hỏng đầu tiên" với ngưỡng BH (bước xuống) → 3, không phải 5
    wrong = 0
    for i, p in enumerate(P):
        if p <= (i + 1) * 0.05 / 10:
            wrong += 1
        else:
            break
    claim('multi: code BH sai kiểu bước xuống ra 3', wrong == 3, str(wrong))
    f10 = 1 - 0.95 ** 10
    num('multi: FWER 10 phép kiểm', f10 * 100, 1, '<b>')
    need('multi: gợi ý — kéo lên 20 là 64,2%', 'kéo lên 20 là ' + vi((1 - 0.95 ** 20) * 100, 1) + '%')
    need('multi: fx — 1 − 0,95¹⁰ = 0,401', '1 − 0,95¹⁰ = ' + vi(f10, 3))
    num('multi: trang Toán — 20 phép kiểm', (1 - 0.95 ** 20) * 100, 1, '')
    need('multi: đọc số FWER mặc định', 'id="m-fwer-f">' + vi(f10 * 100, 1) + '%')
    need('multi: số báo động giả trung bình mặc định', 'id="m-fwer-e">' + vi(10 * 0.05, 2))
    for i, t in ((1, 0.05 / 10), (2, 0.05 / 9), (3, 0.05 / 8), (4, 0.05 / 7)):
        need(f'multi: ngưỡng Holm hạng {i}', vi(t, 5 if i > 1 else 3).rstrip('0'))
    need('multi: câu hỏi — Holm hạng 3 = 0,00625', '<b>' + vi(0.05 / 8, 5) + '</b>')
    P2 = P[:4] + [0.026] + P[5:]
    claim('multi: câu hỏi — hạng 5 = 0,026 thì BH giữ 3', sum(sel('bh', P2)) == 3, str(sum(sel('bh', P2))))
    for i, p in enumerate(P):
        need(f'multi: bảng có p hạng {i + 1}', '<td>' + vi(p, 4) + '</td>')
    blk = js_block('fwer')
    js_has('multi: JS BH lấy hạng LỚN NHẤT', blk, r"for \(i = 0; i < m; i\+\+\) if \(ps\[i\] <= threshold\('bh', i \+ 1, m, a\)\) kmax = i \+ 1;")
    js_has('multi: JS Holm dừng ở lần hỏng đầu', blk, r"if \(ps\[i\] <= threshold\('holm', i \+ 1, m, a\)\) out\[i\] = true; else break;")
    js_has('multi: JS ngưỡng Holm α/(m − i + 1)', blk, r"if \(method === 'holm'\) return a / \(m - i \+ 1\);")
    js_has('multi: JS ngưỡng BH i·α/m', blk, r"if \(method === 'bh'\) return i \* a / m;")
    js_has('multi: JS FWER = 1 − (1 − α)^k', blk, r'return 1 - Math\.pow\(1 - a, k\);')
    m_p = re.search(r'var P = \[([^\]]*)\]', blk)
    claim('multi: JS dùng đúng danh sách p của bảng', m_p is not None and [float(x) for x in m_p.group(1).split(',')] == P)

    # ═══════════════════ 3.3 · SRM ═══════════════════
    def chi2_5050(nt, nc):
        e = (nt + nc) / 2
        return ((nt - e) ** 2 + (nc - e) ** 2) / e
    x_big, x_small = chi2_5050(50600, 49400), chi2_5050(506, 494)
    p_big, p_small = chi2_sf_df1(x_big), chi2_sf_df1(x_small)
    near('srm: χ² ở 100.000 khách = 14,4', x_big, 14.4, 1e-9)
    near('srm: χ² ở 1.000 khách = 0,144', x_small, 0.144, 1e-12)
    need('srm: phép tính 7,2 + 7,2 = 14,4', '= 7,2 + 7,2 = <b>14,4</b>, p = ' + vi(p_big, 5))
    need('srm: phép tính 1.000 khách', '= <b>0,144</b>, p = ' + vi(p_small, 2))
    num('srm: lede — số lần trong 10.000', p_big * 10000, 1, 'khoảng <b>')
    need('srm: lede p ≈ 0,00015', '(p ≈ ' + vi(p_big, 5) + ')')
    num('srm: z tương ứng', math.sqrt(x_big), 2, 'z = ')
    z_al = z(1 - 0.0005 / 2)
    n_al = (z_al / (2 * 0.006)) ** 2
    claim('srm: ngưỡng 0,0005 cho 50,6% đạt từ "khoảng 84 nghìn" khách', 83500 < n_al < 84500, f'{n_al:.0f}')
    need('srm: câu 84 nghìn', 'từ khoảng 84 nghìn khách')
    p50k = chi2_sf_df1(chi2_5050(25300, 24700))
    need('srm: gợi ý — 50.000 khách p = 0,0073', 'ở 50.000 khách p = ' + vi(p50k, 4))
    claim('srm: 50.000 khách: đáng để ý nhưng chưa tới 0,0005', 0.0005 < p50k < 0.05)
    claim('srm: 100.000 khách dưới ngưỡng báo động', p_big < 0.0005)
    need('srm: gợi ý — 1.000 khách p = 0,70', 'ở 1.000 khách p = ' + vi(p_small, 2))
    need('srm: gợi ý — 100.000 khách', 'ở 100.000 khách p = ' + vi(p_big, 5))
    need('srm: đọc số mặc định χ²', 'id="m-srm-x">' + vi(x_big, 1))
    need('srm: đọc số mặc định p', 'id="m-srm-p">' + vi(p_big, 5))
    need('srm: câu JS mặc định', 'khoảng ' + vi(p_big * 10000, 1) + ' lần trong 10.000 thí nghiệm')
    # ví dụ của Fabijan et al.: 821.588 so với 815.482 — "dưới 1 trong 500 nghìn"
    x_fab = chi2_5050(821588, 815482)
    claim('srm: ví dụ Fabijan — p < 1/500.000', chi2_sf_df1(x_fab) < 1 / 500000, f'p = {chi2_sf_df1(x_fab):.3g}')
    # câu tự kiểm: 90/10
    x9010 = (1150 - 1000) ** 2 / 1000 + (8850 - 9000) ** 2 / 9000
    near('srm: câu hỏi — χ² kế hoạch 90/10 = 25,0', x9010, 25.0, 1e-9)
    need('srm: câu hỏi — 25,0', '= 22,5 + 2,5 = <b>25,0</b>')
    p9010 = chi2_sf_df1(x9010)
    claim('srm: câu hỏi — p ≈ 5,7·10⁻⁷', abs(p9010 - 5.7e-7) < 0.05e-7, f'{p9010:.3g}')
    need('srm: câu hỏi — p viết ra', 'p ≈ 5,7·10⁻⁷')
    x5050 = chi2_5050(5150, 4850)
    need('srm: câu hỏi — 50/50 χ² = 9,0', '= <b>' + vi(x5050, 1) + '</b>, p = ' + vi(chi2_sf_df1(x5050), 4))
    claim('srm: câu hỏi — 150 là 15% của 1.000 và 3% của 5.000', 150 / 1000 == 0.15 and 150 / 5000 == 0.03)
    blk = js_block('srm')
    js_has('srm: JS χ² = Σ (O − E)²/E với E = n/2', blk, r'var c = counts\(n, share\), e = n / 2;\s*return \(\(c\[0\] - e\) \* \(c\[0\] - e\) \+ \(c\[1\] - e\) \* \(c\[1\] - e\)\) / e;')
    js_has('srm: JS p < 0,0001 hiện "< 0,0001"', blk, r"if \(p < 0\.0001\) return '< 0,0001';")
    js_has('srm: JS ngưỡng báo động 0,0005', blk, r'var ALARM = 0\.0005')
    js_has('srm: JS số khách bản mới = làm tròn n × tỉ lệ', blk, r'function counts\(n, share\) \{ var nt = Math\.round\(n \* share\); return \[nt, n - nt\]; \}')
    js_has('srm: JS thang số khách 100 → 1.000.000', blk, r'var NS = \[100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000\];')
    js_has('srm: JS báo động khi p < ngưỡng', blk, r'if \(p < ALARM\) \{')
    near('srm: hằng ZALARM trong JS = z(1 − 0,00025)', 3.480756404, z_al, 1e-8)
    need('srm: tỉ lệ 6% ở Microsoft', 'khoảng 6% số thí nghiệm ở Microsoft')

    # ═══════════════════ 3.4 · lây & hệ số thiết kế ═══════════════════
    def deff(mm, icc):
        return 1 + (mm - 1) * icc
    d0 = deff(250, 0.02)
    near('interfere: DEFF 40×250, ICC 0,02 = 5,98', d0, 5.98, 1e-12)
    need('interfere: phép tính DEFF', 'DEFF = 1 + (250 − 1) × 0,02 = <b>5,98</b>')
    num('interfere: n hiệu dụng', 10000 / d0, 0, '10.000/5,98 ≈ <b>')
    num('interfere: √DEFF', math.sqrt(d0), 2, '√5,98 ≈ ')
    fa = 2 * (1 - Phi(ZC / math.sqrt(d0)))
    num('interfere: A/A "thắng" nếu bỏ qua cụm (gợi ý)', fa * 100, 1, '<b>')
    claim('interfere: "khoảng 42 cái" trong 100', round(fa * 100) == 42, f'{fa * 100:.2f}')
    need('interfere: câu 42 cái', 'khoảng <b>42</b> cái')
    need('interfere: trần 40/0,02 = 2.000', '40/0,02 = 2.000')
    need('interfere: lede — chừng 1.700', 'chừng <b>1.700</b>')
    claim('interfere: 1.672 làm tròn thành "chừng 1.700"', round(10000 / d0, -2) == 1700)
    need('interfere: đọc số mặc định DEFF', 'id="m-cluster-d">' + vi(d0, 2))
    need('interfere: đọc số mặc định n hiệu dụng', 'id="m-cluster-ne">' + vi(40 * 250 / d0, 0))
    need('interfere: đọc số mặc định A/A', 'id="m-cluster-fa">' + vi(fa * 100, 1) + '%')
    need('interfere: câu JS mặc định', 'SE nhỏ đi ' + vi(math.sqrt(d0), 2) + ' lần, và ' + vi(fa * 100, 0) + '%')
    near('interfere: hiểu nhầm — 10 khách, ICC 0,02 → DEFF 1,18', deff(10, 0.02), 1.18, 1e-12)
    need('interfere: hiểu nhầm — DEFF 1,18', '(DEFF 1,18)')
    dq, dq2 = deff(50, 0.05), deff(100, 0.05)
    need('interfere: câu hỏi — DEFF 3,45', '= <b>' + vi(dq, 2) + '</b>, n hiệu dụng = 5.000/3,45 ≈ <b>' + vi(5000 / dq, 0) + '</b>')
    need('interfere: câu hỏi — gom 50 cửa hàng', 'DEFF = 1 + 99 × 0,05 = ' + vi(dq2, 2) + ', n hiệu dụng ≈ <b>' + vi(5000 / dq2, 0) + '</b>')
    claim('interfere: gom lại "mất gần một nửa" độ chính xác', 0.4 < 1 - (5000 / dq2) / (5000 / dq) < 0.5, f'{1 - (5000 / dq2) / (5000 / dq):.3f}')
    claim('interfere: DEFF(m → ∞) cho trần K/ICC', abs(40 * 1e7 / deff(1e7, 0.02) - 2000) < 1e-2)
    claim('interfere: đầu mút — ICC = 1 thì DEFF = m', deff(250, 1.0) == 250 and deff(250, 0.0) == 1)
    need('interfere: code — SE thường và theo cụm', '# in ra: SE thường 0.0199 · SE theo cụm 0.0458')
    claim('interfere: code — tỉ số SE "gấp 2,3 lần"', round(0.0458 / 0.0199, 1) == 2.3)
    num('interfere: gợi ý — m = 500 thì n hiệu dụng', 40 * 500 / deff(500, 0.02), 0, 'chỉ từ 1.672 lên ')
    claim('interfere: gợi ý — m = 500 vẫn dưới trần 2.000', 40 * 500 / deff(500, 0.02) < 2000)
    band = 1.96 * math.sqrt(fa * (1 - fa) / 1000)
    claim('interfere: code — "1.000 lần: ±3 điểm" là nửa khoảng 95% của mô phỏng', round(band * 100) == 3, f'{band:.4f}')
    claim('interfere: code — 0,441 nằm trong ±3 điểm quanh 42,3%', abs(0.441 - fa) <= band)
    need('interfere: code — chú thích dải', '(công thức: 42,3%; 1.000 lần: ±3 điểm)')
    blk = js_block('cluster')
    js_has('interfere: JS DEFF = 1 + (m − 1)·ICC', blk, r'function deff\(m, icc\) \{ return 1 \+ \(m - 1\) \* icc; \}')
    js_has('interfere: JS n hiệu dụng = K·m/DEFF', blk, r'function neff\(K, m, icc\) \{ return K \* m / deff\(m, icc\); \}')
    js_has('interfere: JS báo động giả 2(1 − Φ(1,96/√DEFF))', blk, r'return 2 \* \(1 - Phi\(ZC / Math\.sqrt\(d\)\)\);')
    js_has('interfere: JS chấm = √ICC·(cửa hàng) + √(1 − ICC)·(riêng)', blk, r'var v = mu \+ Math\.sqrt\(1 - icc\) \* E\[i\]\[j\]\[0\];')
    js_has('interfere: JS trung bình cửa hàng = √ICC·A', blk, r'mu = Math\.sqrt\(icc\) \* A\[i\];')
    js_has('interfere: JS trần = số cửa hàng / ICC', blk, r'var cap = icc > 0 \? nK / icc : Infinity;')

    # ═══════════════════ 3.5 · đơn vị phân tích (phương pháp delta) ═══════════════════
    nC, Ob, Rb, sO, sR, rho = 10000, 3.0, 750.0, 2.5, 800.0, 0.9
    sRO = rho * sR * sO
    aov = Rb / Ob
    brk = sR ** 2 - 2 * aov * sRO + aov ** 2 * sO ** 2
    var_d = brk / (nC * Ob ** 2)
    near('units: s_RO = 1.800', sRO, 1800, 1e-9)
    near('units: ngoặc = 130.625', brk, 130625, 1e-6)
    need('units: phép tính trong ngoặc', '640.000 − 900.000 + 390.625 = 130.625')
    num('units: phương sai', var_d, 3, 'phương sai ')
    num('units: SE', math.sqrt(var_d), 2, '<b>SE ≈ ')
    num('units: nửa KTC', 1.96 * math.sqrt(var_d), 2, '250 ± ')
    brk2 = sR ** 2 - 2 * aov * (0.5 * sR * sO) + aov ** 2 * sO ** 2
    near('units: câu hỏi — ngoặc 530.625', brk2, 530625, 1e-6)
    num('units: câu hỏi — phương sai', brk2 / (nC * Ob ** 2), 3, '530.625/90.000 ≈ ')
    num('units: câu hỏi — SE', math.sqrt(brk2 / (nC * Ob ** 2)), 2, 'SE ≈ <b>')
    claim('units: câu hỏi — "gấp đôi"', 1.9 < math.sqrt(brk2 / brk) < 2.1, f'{math.sqrt(brk2 / brk):.3f}')
    claim('units: Deng et al. — SE thường ≈ 58% SE thật', round(0.00522 / 0.00895 * 100) == 58)
    need('units: code in ra', '#        SE thường 0.86 · delta 1.58 · bootstrap 1.60 · theo cụm 1.58')
    claim('units: code — SE thường chỉ bằng 54%', round(0.86 / 1.58 * 100) == 54)
    need('units: câu 54%', 'chỉ bằng 54%')
    js_has('units: code dùng công thức delta đúng thứ tự', HTML,
           r'var = \(c\[0, 0\] - 2 \* aov \* c\[0, 1\] \+ aov\*\*2 \* c\[1, 1\]\) / \(n \* O\.mean\(\)\*\*2\)')

    # ═══════════════════ 3.6 · mới lạ ═══════════════════
    num('novelty: √21', math.sqrt(21), 1, '√21 ≈ ')
    q1 = 2 * (1 - Phi(ZC / math.sqrt(21)))
    q2 = 2 * (1 - Phi(ZC / math.sqrt(21 / 2)))
    claim('novelty: ngày 1 ngoài dải 95% cuối kỳ quanh giá trị thật = 67%', round(q1 * 100) == 67, f'{q1:.4f}')
    claim('novelty: ngày 2 = 55%', round(q2 * 100) == 55, f'{q2:.4f}')
    need('novelty: câu 67%', 'có <b>67%</b> khả năng')
    need('novelty: câu 55%', 'ngày 2 có 55%')
    need('novelty: 67% là dải quanh giá trị thật, không phải KTC của ngày 21', 'nằm ngoài dải 95% cuối kỳ (±1,96 SE của ngày 21, quanh giá trị thật)')
    num('novelty: 14 ngày — ngày 1', 2 * (1 - Phi(ZC / math.sqrt(14))) * 100, 0, '14 ngày thì ra ')
    num('novelty: 14 ngày — ngày 2', 2 * (1 - Phi(ZC / math.sqrt(7))) * 100, 0, '60% và ')
    claim('novelty: 21 ngày là độ dài cho đúng 67% / 55% (14 ngày thì không)', round(2 * (1 - Phi(ZC / math.sqrt(14))) * 100) != 67)

    # ═══════════════════ 4.1 · DAG ═══════════════════
    def dag_gen(kind, seed=41, n=2000):
        rr = jsrng(seed)
        T, Zc, Y = [], [], []
        for _ in range(n):
            a, b, c, u = jsgauss(rr), jsgauss(rr), jsgauss(rr), rr()
            if kind == 'fork':
                zz = a
                t = 1.0 if 1.2 * zz + b > 0 else 0.0
                y = 30 + 2 * t + 4 * zz + 3 * c
            elif kind == 'chain':
                t = 1.0 if u < 0.5 else 0.0
                zz = 1.0 * t + a
                y = 30 + 0.5 * t + 1.5 * zz + 3 * c
            else:
                t = 1.0 if u < 0.5 else 0.0
                y = 30 + 2 * t + 3 * c
                zz = 1.0 * t + 0.5 * (y - 30) + a
            T.append(t)
            Zc.append(zz)
            Y.append(y)
        return T, Zc, Y
    est = {}
    for kind in ('fork', 'chain', 'collider'):
        T, Zc, Y = dag_gen(kind)
        est[kind] = (ols([T], Y)[1], ols([T, Zc], Y)[1])
    fn, fa_ = est['fork']
    cn, ca = est['chain']
    kn, ka = est['collider']
    for label, v in (('ngã ba không kiểm soát', fn), ('ngã ba kiểm soát', fa_), ('dây chuyền không kiểm soát', cn),
                     ('dây chuyền kiểm soát', ca), ('va chạm không kiểm soát', kn), ('va chạm kiểm soát', ka)):
        need(f'dag: gợi ý — {label}', '<b>' + vi(v, 2) + '</b>')
    need('dag: đọc số mặc định', 'id="m-dag-n">' + vi(fn, 2))
    need('dag: đọc số mặc định kiểm soát', 'id="m-dag-a">' + vi(fa_, 2))
    need('dag: lệch mặc định', 'id="m-dag-gap">+' + vi(fn - 2, 2))
    need('dag: câu JS mặc định', 'chênh lệch ' + vi(fn, 1) + ' triệu')
    # LUẬT mà bài dạy — đúng hướng, không chỉ đúng số
    claim('dag: gây nhiễu — không kiểm soát lệch xa (> 3 triệu)', fn - 2 > 3, f'{fn:.3f}')
    claim('dag: gây nhiễu — kiểm soát về gần thật (±0,3)', abs(fa_ - 2) < 0.3, f'{fa_:.3f}')
    claim('dag: trung gian — không kiểm soát ≈ toàn phần 2 (±0,3)', abs(cn - 2) < 0.3, f'{cn:.3f}')
    claim('dag: trung gian — kiểm soát ≈ trực tiếp 0,5 (±0,3), mất phần qua Z', abs(ca - 0.5) < 0.3 and ca < cn - 1, f'{ca:.3f}')
    claim('dag: va chạm — không kiểm soát ≈ thật (±0,3)', abs(kn - 2) < 0.3, f'{kn:.3f}')
    claim('dag: va chạm — kiểm soát TẠO thiên lệch, sai dấu', ka < 0, f'{ka:.3f}')
    # giá trị kỳ vọng của va chạm theo công thức: β − k(a + bβ), k = bσy²/(b²σy² + σz²)
    kk = 0.5 * 9 / (0.25 * 9 + 1)
    claim('dag: va chạm — ước lượng gần giá trị lý thuyết −0,77', abs(ka - (2 - kk * (1 + 0.5 * 2))) < 0.2, f'{ka:.3f}')
    claim('dag: dây chuyền — trực tiếp 0,5 + qua Z 1,0 × 1,5 = 2', abs(0.5 + 1.0 * 1.5 - 2) < 1e-12)
    for kind, v in (('nga_ba', est['fork']), ('day_chuyen', est['chain']), ('va_cham', est['collider'])):
        line = '%-10s không kiểm soát %5.2f · kiểm soát Z %5.2f' % (kind, v[0], v[1])
        need(f'dag: code in ra dòng {kind}', line)
    blk = js_block('dag')
    js_has('dag: JS ngã ba', blk, r'z = a; t = 1\.2 \* z \+ b > 0 \? 1 : 0; y = 30 \+ 2 \* t \+ 4 \* z \+ 3 \* c;')
    js_has('dag: JS dây chuyền', blk, r't = u < 0\.5 \? 1 : 0; z = 1\.0 \* t \+ a; y = 30 \+ 0\.5 \* t \+ 1\.5 \* z \+ 3 \* c;')
    js_has('dag: JS va chạm', blk, r't = u < 0\.5 \? 1 : 0; y = 30 \+ 2 \* t \+ 3 \* c; z = 1\.0 \* t \+ 0\.5 \* \(y - 30\) \+ a;')
    js_has('dag: JS ước lượng = hệ số của T trong OLS có/không Z', blk, r'b0 = ols\(\[d\.T\], d\.Y\), b1 = ols\(\[d\.T, d\.Z\], d\.Y\)')
    js_has('dag: JS hạt giống 41', blk, r'gen\(k, 41\)')

    # ═══════════════════ 4.2 · hồi quy điều chỉnh ═══════════════════
    def adj_gen(seed, a=-8.0, b=2.4, n=800):
        rr = jsrng(seed)
        X, T, Y = [], [], []
        for _ in range(n):
            x = 0.5 + 4.5 * rr()
            u = rr()
            e = jsgauss(rr)
            t = 1.0 if u < sig(a + b * x) else 0.0
            X.append(x)
            T.append(t)
            Y.append(10 + 2 * x * x + 3 * t + 3 * e)
        return X, T, Y
    X, T, Y = adj_gen(172)
    e_n, e_l, e_q = ols([T], Y)[1], ols([T, X], Y)[1], ols([T, X, [x * x for x in X]], Y)[1]
    need('adjust: bảng — chênh lệch ngây thơ', '<td>Chênh lệch ngây thơ · <code>y ~ t</code></td><td>' + vi(e_n, 2) + '</td>')
    need('adjust: bảng — tuyến tính', '<td>' + vi(e_l, 2) + '</td>')
    need('adjust: bảng — bình phương', '<td>' + vi(e_q, 2) + '</td>')
    need('adjust: lede 5,6', '<b>' + vi(e_l, 1) + ' triệu</b>')
    need('adjust: lede 3,0', '<b>' + vi(e_q, 1) + ' triệu</b>')
    need('adjust: câu hỏi 26 triệu', '<span>' + vi(e_n, 0) + ' triệu ₫ mỗi tháng</span>')
    claim('adjust: bình phương về gần thật 3 (±0,1)', abs(e_q - 3) < 0.1, f'{e_q:.4f}')
    claim('adjust: tuyến tính lệch lên hơn 2 triệu', e_l - 3 > 2, f'{e_l:.4f}')
    below = [t for x, t in zip(X, T) if x < 2.0]
    above = [t for x, t in zip(X, T) if x >= 4.0]
    claim('adjust: 271 cửa hàng dưới 2 nghìn, 1 cái bật', len(below) == 271 and sum(below) == 1, f'{len(below)}, {sum(below)}')
    claim('adjust: 175 cửa hàng từ 4 nghìn, 14 cái không bật', len(above) == 175 and len(above) - sum(above) == 14, f'{len(above)}, {len(above) - sum(above)}')
    need('adjust: câu chồng lấn', 'trong 271 cửa hàng dưới 2 nghìn mặt hàng chỉ 1 cái bật, trong 175 cửa hàng từ 4 nghìn trở lên chỉ 14 cái không bật')

    # khoảng tin cậy OLS (SE thường) — dựng lại để kiểm cột "chứa 3?"
    def ols_ci(cols, y, j=1):
        n = len(y)
        Xm = [[1.0] + [c[i] for c in cols] for i in range(n)]
        k = len(Xm[0])
        beta = ols(cols, y)
        res = [y[i] - sum(beta[q] * Xm[i][q] for q in range(k)) for i in range(n)]
        s2 = sum(v * v for v in res) / (n - k)
        XtX = [[sum(Xm[r_][a] * Xm[r_][b] for r_ in range(n)) for b in range(k)] for a in range(k)]
        ej = [1.0 if q == j else 0.0 for q in range(k)]
        inv_j = solve(XtX, ej)
        se = math.sqrt(s2 * inv_j[j])
        tq = tcrit(0.95, n - k)
        return beta[j] - tq * se, beta[j] + tq * se
    for cols, label in (([T], 'so thẳng'), ([T, X], 'tuyến tính'), ([T, X, [x * x for x in X]], 'bình phương')):
        lo, hi = ols_ci(cols, Y)
        need(f'adjust: KTC {label}', '<td>[' + vi(lo, 2) + '; ' + vi(hi, 2) + ']</td>')
        claim(f'adjust: cột "chứa 3?" — {label}', (lo <= 3 <= hi) == (label == 'bình phương'))
    need('adjust: code in ra — dòng tuyến tính', '#        y ~ t + x              5.62  [ 4.73;  6.51]')
    # câu tự kiểm: chồng lấn tốt thì thiếu X² ít hại hơn hẳn — trung bình qua 30 bộ dữ liệu
    bias_good, bias_poor = [], []
    for sd_ in range(1, 31):
        Xg, Tg, Yg = adj_gen(sd_, a=-4.0, b=1.4)
        Xp, Tp, Yp = adj_gen(sd_)
        bias_good.append(ols([Tg, Xg], Yg)[1] - 3)
        bias_poor.append(ols([Tp, Xp], Yp)[1] - 3)
    bg, bp = mean(bias_good), mean(bias_poor)
    claim('adjust: câu hỏi — thiếu X² hại ít hơn hẳn khi chồng lấn tốt (trung bình 30 bộ)', bg < bp / 3, f'{bg:.3f} so với {bp:.3f}')

    # ═══════════════════ 4.3 · điểm xu hướng ═══════════════════
    Np = 1000
    rr = jsrng(7)
    X1, X2, EPS, U = [], [], [], []
    for _ in range(Np):
        X1.append(jsgauss(rr))
        X2.append(jsgauss(rr))
        EPS.append(jsgauss(rr))
        U.append(rr())

    def logit_fit(cols, t):
        k = len(cols) + 1
        b = [0.0] * k
        for _ in range(25):
            g = [0.0] * k
            H = [[0.0] * k for _ in range(k)]
            for j in range(len(t)):
                x = [1.0] + [c[j] for c in cols]
                p = sig(sum(b[q] * x[q] for q in range(k)))
                w = p * (1 - p)
                for a in range(k):
                    g[a] += (t[j] - p) * x[a]
                    for c2 in range(k):
                        H[a][c2] += w * x[a] * x[c2]
            dlt = solve(H, g)
            b = [b[q] + dlt[q] for q in range(k)]
            if max(abs(v) for v in dlt) < 1e-12:
                break
        return b

    def ps_analyse(gamma):
        T = [1 if U[j] < sig(-0.2 + gamma * (0.9 * X1[j] + 0.5 * X2[j])) else 0 for j in range(Np)]
        Y = [60 + 8 * X1[j] + 4 * X2[j] + 5 * EPS[j] + 5 * T[j] for j in range(Np)]
        b = logit_fit([X1, X2], T)
        eh = [sig(b[0] + b[1] * X1[j] + b[2] * X2[j]) for j in range(Np)]
        tr = [j for j in range(Np) if T[j]]
        co = [j for j in range(Np) if not T[j]]
        cs = sorted(co, key=lambda q: eh[q])
        ce = [eh[q] for q in cs]
        match = []
        for t_ in tr:
            lo, hi = 0, len(ce)
            while lo < hi:
                mid = (lo + hi) // 2
                if ce[mid] < eh[t_]:
                    lo = mid + 1
                else:
                    hi = mid
            best = -1
            for q in (lo - 1, lo):
                if 0 <= q < len(ce) and (best < 0 or abs(ce[q] - eh[t_]) < abs(ce[best] - eh[t_])):
                    best = q
            match.append(cs[best])

        def smd(Xv):
            xt = [Xv[q] for q in tr]
            xc = [Xv[q] for q in co]
            xm = [Xv[q] for q in match]
            den = math.sqrt((var(xt) + var(xc)) / 2)
            return (mean(xt) - mean(xc)) / den, (mean(xt) - mean(xm)) / den
        s1, s2 = smd(X1), smd(X2)
        naive = mean([Y[q] for q in tr]) - mean([Y[q] for q in co])
        att = mean([Y[t_] - Y[c_] for t_, c_ in zip(tr, match)])
        reuse = {}
        for c_ in match:
            reuse[c_] = reuse.get(c_, 0) + 1
        return dict(s1=s1, s2=s2, naive=naive, att=att, reuse=max(reuse.values()), used=len(reuse),
                    before=max(abs(s1[0]), abs(s2[0])), after=max(abs(s1[1]), abs(s2[1])))
    o0, o1, o3 = ps_analyse(0.0), ps_analyse(1.0), ps_analyse(3.0)
    need('match: gợi ý γ = 0 — chênh lệch ngây thơ', 'chênh lệch ngây thơ là ' + vi(o0['naive'], 1) + '.')
    need('match: gợi ý γ = 1 — SMD trước', '|SMD| lớn nhất là <b>' + vi(o1['before'], 2) + '</b>')
    need('match: gợi ý γ = 1 — chênh lệch ngây thơ = 5 + thiên lệch chọn (phân rã của 1.2)',
         'chênh lệch ngây thơ là <b>' + vi(o1['naive'], 1) + '</b> — 5 của tính năng cộng ' + vi(o1['naive'] - 5, 1) + ' thiên lệch chọn')
    # tác động bằng 5 cho MỌI cửa hàng, nên ATT = 5 đúng và chênh lệch ngây thơ − 5 đúng bằng thiên lệch chọn
    # E[Y(0) | bật] − E[Y(0) | không bật] trong mẫu — không cần giả định gì thêm cho phép trừ ấy
    claim('match: γ = 1 — 13,0 − 5 in ra đúng 8,0', vi(o1['naive'], 1) == '13,0' and vi(o1['naive'] - 5, 1) == '8,0', f"{o1['naive']:.4f}")
    need('match: gợi ý γ = 1 — SMD sau', '|SMD| còn <b>' + vi(o1['after'], 2) + '</b>')
    need('match: gợi ý γ = 1 — ATT', 'ước lượng về <b>' + vi(o1['att'], 1) + '</b>')
    need('match: gợi ý γ = 3 — dùng lại', 'đứng thay cho <b>' + str(o3['reuse']) + '</b> cửa hàng bật')
    need('match: gợi ý γ = 3 — SMD sau', '|SMD| sau ghép còn <b>' + vi(o3['after'], 2) + '</b>')
    claim('match: γ = 3 — SMD sau ghép vượt quy ước 0,1', o3['after'] > 0.1)
    claim('match: γ = 1 — SMD sau ghép dưới 0,1', o1['after'] < 0.1)
    claim('match: γ = 0 — chênh lệch ngây thơ đã gần 5 (±0,5)', abs(o0['naive'] - 5) < 0.5)
    claim('match: γ = 1 — ghép cặp về gần 5 (±0,5)', abs(o1['att'] - 5) < 0.5)
    need('match: đọc số mặc định SMD trước', 'id="m-propensity-sb">' + vi(o1['before'], 2))
    need('match: đọc số mặc định SMD sau', 'id="m-propensity-sa">' + vi(o1['after'], 2))
    need('match: đọc số mặc định chênh lệch ngây thơ', 'id="m-propensity-nv">' + vi(o1['naive'], 1))
    need('match: đọc số mặc định ATT', 'id="m-propensity-av">' + vi(o1['att'], 1))
    need('match: đọc số mặc định dùng lại', 'id="m-propensity-ru">' + str(o1['reuse']))
    need('match: câu JS mặc định', 'Trước ghép: |SMD| lớn nhất ' + vi(o1['before'], 2) + ', vượt quy ước 0,1; chênh lệch ngây thơ ' + vi(o1['naive'], 1) +
         '. Sau ghép theo ê: |SMD| lớn nhất ' + vi(o1['after'], 2) + ' (đạt quy ước), ước lượng ' + vi(o1['att'], 1) + ' (thật: 5).')
    need('match: dòng chi tiết mặc định', 'SMD cỡ cửa hàng: ' + vi(o1['s1'][0], 2) + ' → ' + vi(o1['s1'][1], 2) +
         ' · SMD số năm dùng phần mềm: ' + vi(o1['s2'][0], 2) + ' → ' + vi(o1['s2'][1], 2) + ' · ' + str(o1['used']) + ' cửa hàng')
    need('match: code in ra — SMD cỡ', '# in ra: SMD cỡ: trước ' + ('%.2f' % o1['s1'][0]) + ' · sau ' + ('%.2f' % o1['s1'][1]))
    need('match: code in ra — SMD số năm', '#        SMD số năm: trước ' + ('%.2f' % o1['s2'][0]) + ' · sau ' + ('%.2f' % o1['s2'][1]))
    need('match: code in ra — ước lượng', '#        ngây thơ ' + ('%.1f' % o1['naive']) + ' · ghép cặp (ATT) ' + ('%.1f' % o1['att']))
    near('match: 3¹⁰ = 59.049', 3 ** 10, 59049, 0)
    need('match: 3¹⁰', '3¹⁰ = 59.049')
    near('match: câu hỏi — SMD trước 0,80', (3.2 - 2.4) / math.sqrt((1.0 + 1.0) / 2), 0.80, 1e-12)
    near('match: câu hỏi — SMD sau 0,05', (3.2 - 3.15) / 1.0, 0.05, 1e-12)
    blk = js_block('propensity')
    js_has('match: JS "tách hẳn" gắn với số lần dùng lại, không với SMD', blk, r"if \(o\.maxReuse >= 50\) say \+= ' Hai đám gần như tách hẳn")
    js_has('match: JS "vượt quy ước" gắn với SMD trước ghép', blk, r"\(mb >= 0\.1 \? ', vượt quy ước 0,1' : ', còn dưới quy ước 0,1'\)")
    claim('match: γ = 1,1 — hai đám vẫn chồng lấn (dùng lại < 50) dù |SMD| sau ghép > 0,1', ps_analyse(1.1)['reuse'] < 50 and ps_analyse(1.1)['after'] > 0.1)
    claim('match: câu "tách hẳn" chỉ bật từ γ ≥ 2,6 — ở γ = 2,5 chưa, ở 3,0 có', ps_analyse(2.5)['reuse'] < 50 <= o3['reuse'])
    js_has('match: JS e thật = σ(−0,2 + γ·(0,9·X1 + 0,5·X2))', blk, r'var et = sig\(-0\.2 \+ gamma \* \(0\.9 \* X1\[j\] \+ 0\.5 \* X2\[j\]\)\);')
    js_has('match: JS Y có tác động thật 5', blk, r'Y\.push\(60 \+ 8 \* X1\[j\] \+ 4 \* X2\[j\] \+ 5 \* EPS\[j\] \+ TRUE \* T\[j\]\);')
    js_has('match: JS SMD dùng độ lệch chuẩn TRƯỚC ghép cho cả hai cột', blk,
           r'var den = Math\.sqrt\(\(variance\(xt\) \+ variance\(xc\)\) / 2\);\s*return \[\(mean\(xt\) - mean\(xc\)\) / den, \(mean\(xt\) - mean\(xm\)\) / den\];')
    js_has('match: JS ATT = trung bình (Y bật − Y cặp)', blk, r'att \+= Y\[t\] - Y\[match\[q\]\]; \}\); att /= tr\.length;')
    js_has('match: JS gán T bằng cùng bộ số u cho mọi γ', blk, r'T\.push\(U\[j\] < et \? 1 : 0\);')
    js_has('match: JS ghép láng giềng gần nhất theo ê (xét hai phía điểm chia đôi)', blk,
           r'\[lo - 1, lo\]\.forEach\(function \(q\) \{\s*if \(q >= 0 && q < ce\.length && \(best < 0 \|\| Math\.abs\(ce\[q\] - eh\[t\]\) < Math\.abs\(ce\[best\] - eh\[t\]\)\)\) best = q;')
    js_has('match: JS Newton cho hồi quy logistic: gradient (t − p)·x, Hessian p(1 − p)·x·xᵀ', blk,
           r'g\[a\] \+= \(t\[j\] - p\) \* x\[a\]; for \(c = 0; c < k; c\+\+\) H\[a\]\[c\] \+= w \* x\[a\] \* x\[c\];')
    js_has('match: JS ê dùng hệ số logistic ước lượng', blk, r'eh\.push\(sig\(b\[0\] \+ b\[1\] \* X1\[j\] \+ b\[2\] \* X2\[j\]\)\);')
    js_has('match: JS dữ liệu hạt giống 7, thứ tự rút X1, X2, nhiễu, u', blk,
           r'r = rng\(7\).*?X1\.push\(gauss\(r\)\); X2\.push\(gauss\(r\)\); EPS\.push\(gauss\(r\)\); U\.push\(r\(\)\);')

    # ── mô hình ipw: cùng 1.000 cửa hàng; hai công tắc đúng/sai; cắt tỉa ──
    IPW_FIT = {}

    def ipw_model(gamma, ps='ok', mu='ok', trim=False):
        key = (round(gamma, 6), ps)
        if key not in IPW_FIT:
            T = [1 if U[j] < sig(-0.2 + gamma * (0.9 * X1[j] + 0.5 * X2[j])) else 0 for j in range(Np)]
            Y = [60 + 8 * X1[j] + 4 * X2[j] + 5 * EPS[j] + 5 * T[j] for j in range(Np)]
            cols = [X1, X2] if ps == 'ok' else [X2]
            b = logit_fit(cols, T)
            eh = [sig(b[0] + sum(b[q + 1] * cols[q][j] for q in range(len(cols)))) for j in range(Np)]
            IPW_FIT[key] = (T, Y, eh)
        T, Y, eh = IPW_FIT[key]
        keep = [j for j in range(Np) if (not trim) or (0.1 <= eh[j] <= 0.9)]
        tr = [j for j in keep if T[j]]
        co = [j for j in keep if not T[j]]
        w1 = [1 / eh[j] for j in tr]
        w0 = [1 / (1 - eh[j]) for j in co]
        ipw_ = sum(w * Y[j] for w, j in zip(w1, tr)) / sum(w1) - sum(w * Y[j] for w, j in zip(w0, co)) / sum(w0)
        if mu == 'ok':
            b1 = ols([[X1[j] for j in tr], [X2[j] for j in tr]], [Y[j] for j in tr])
            b0 = ols([[X1[j] for j in co], [X2[j] for j in co]], [Y[j] for j in co])
            m1 = lambda j: b1[0] + b1[1] * X1[j] + b1[2] * X2[j]
            m0 = lambda j: b0[0] + b0[1] * X1[j] + b0[2] * X2[j]
        else:
            a1 = mean([Y[j] for j in tr])
            a0 = mean([Y[j] for j in co])
            m1 = lambda j: a1
            m0 = lambda j: a0
        aipw_ = sum(m1(j) - m0(j) + T[j] * (Y[j] - m1(j)) / eh[j] - (1 - T[j]) * (Y[j] - m0(j)) / (1 - eh[j]) for j in keep) / len(keep)
        return dict(ipw=ipw_, aipw=aipw_, maxw=max(w1 + w0), ess0=sum(w0) ** 2 / sum(w * w for w in w0), n0=len(co), cut=Np - len(keep))
    d_ok = ipw_model(1.5)
    d_mu = ipw_model(1.5, mu='bad')
    d_ps = ipw_model(1.5, ps='bad')
    d_bb = ipw_model(1.5, ps='bad', mu='bad')
    g2 = ipw_model(2.0)
    g2t = ipw_model(2.0, trim=True)
    need('ipw-model: gợi ý — mặc định IPW, AIPW', 'hai mô hình đúng: IPW <b>' + vi(d_ok['ipw'], 2) + '</b>, AIPW <b>' + vi(d_ok['aipw'], 2) + '</b>')
    need('ipw-model: gợi ý — mô hình kết quả sai', 'AIPW vẫn <b>' + vi(d_mu['aipw'], 2) + '</b>. Đổi')
    claim('ipw-model: mô hình kết quả sai thì IPW không đổi', abs(d_mu['ipw'] - d_ok['ipw']) < 1e-12)
    need('ipw-model: gợi ý — điểm xu hướng sai', 'IPW nhảy lên <b>' + vi(d_ps['ipw'], 2) + '</b>, AIPW vẫn <b>' + vi(d_ps['aipw'], 2) + '</b>')
    need('ipw-model: gợi ý — sai cả hai', 'AIPW cũng <b>' + vi(d_bb['aipw'], 2) + '</b>')
    claim('ipw-model: sai cả hai thì AIPW gần trùng IPW (lệch < 0,005 — cùng hiện 13,23)', abs(d_bb['aipw'] - d_bb['ipw']) < 0.005
          and vi(d_bb['aipw'], 2) == vi(d_bb['ipw'], 2), f"{d_bb['aipw']:.6f} so với {d_bb['ipw']:.6f}")
    # LUẬT bền kép, đo trên chính bộ dữ liệu: một mô hình đúng → quanh 5; cả hai sai → lệch
    claim('ipw-model: bền kép — chỉ điểm xu hướng đúng: AIPW trong ±1 của 5', abs(d_mu['aipw'] - 5) < 1)
    claim('ipw-model: bền kép — chỉ mô hình kết quả đúng: AIPW trong ±1 của 5', abs(d_ps['aipw'] - 5) < 1)
    claim('ipw-model: điểm xu hướng sai làm IPW lệch > 5 triệu', d_ps['ipw'] - 5 > 5)
    claim('ipw-model: sai cả hai thì AIPW lệch > 5 triệu', d_bb['aipw'] - 5 > 5)
    need('ipw-model: gợi ý — γ = 2 trọng số lớn nhất', 'trọng số lớn nhất <b>' + vi(g2['maxw'], 0) + '</b>')
    need('ipw-model: gợi ý — γ = 2 Kish', str(g2['n0']) + ' cửa hàng không bật chỉ đáng <b>' + vi(g2['ess0'], 0) + '</b>')
    need('ipw-model: gợi ý — cắt tỉa', 'bỏ <b>' + str(g2t['cut']) + '</b> cửa hàng, trọng số lớn nhất còn <b>' + vi(g2t['maxw'], 0) +
         '</b>, cỡ mẫu hiệu dụng <b>' + vi(g2t['ess0'], 0) + '</b> trên ' + str(g2t['n0']))
    claim('ipw-model: cắt tỉa làm trọng số lớn nhất ≤ 10 (ê trong [0,1; 0,9])', g2t['maxw'] <= 10 + 1e-9)
    need('ipw-model: đọc số mặc định IPW', 'id="m-ipw-i">' + vi(d_ok['ipw'], 2))
    need('ipw-model: đọc số mặc định AIPW', 'id="m-ipw-a">' + vi(d_ok['aipw'], 2))
    need('ipw-model: đọc số mặc định trọng số lớn nhất', 'id="m-ipw-mw">' + vi(d_ok['maxw'], 1))
    need('ipw-model: đọc số mặc định Kish', 'id="m-ipw-ess">' + vi(d_ok['ess0'], 0) + '<span class="u"> / ' + str(d_ok['n0']))
    need('ipw-model: hiểu nhầm — trọng số hiền mà lệch', 'trọng số lớn nhất ' + vi(d_ps['maxw'], 1) + ' và cỡ mẫu hiệu dụng ' + vi(d_ps['ess0'], 0) +
         ' trên ' + str(d_ps['n0']) + ' — rất đẹp — mà IPW ra ' + vi(d_ps['ipw'], 2))
    blk = js_block('propensity')
    js_has('ipw-model: JS điểm xu hướng sai = logistic chỉ trên số năm', blk, r"var cols = ps === 'ok' \? \[X1, X2\] : \[X2\], b = logit\(cols, T\)")
    js_has('ipw-model: JS IPW Hájek (chia tổng trọng số từng nhóm)', blk, r'var ipw = s1 / w1 - s0 / w0')
    js_has('ipw-model: JS AIPW đúng công thức', blk,
           r'aipw \+= m1\(i\) - m0\(i\) \+ T\[i\] \* \(Y\[i\] - m1\(i\)\) / eh\[i\] - \(1 - T\[i\]\) \* \(Y\[i\] - m0\(i\)\) / \(1 - eh\[i\]\);')
    js_has('ipw-model: JS cắt tỉa giữ ê trong [0,1; 0,9]', blk, r'if \(!trim \|\| \(eh\[j\] >= 0\.1 && eh\[j\] <= 0\.9\)\)')
    js_has('ipw-model: JS Kish = (Σw)²/Σw²', blk, r'ess0: w0 \* w0 / q0')

    # ═══════════════════ 4.4 · IPW ═══════════════════
    strata = [(200, 0.2, 40, 45, 160, 40), (200, 0.5, 100, 75, 100, 70), (100, 0.9, 90, 125, 10, 120)]
    claim('ipw: mỗi tầng bật = e × số cửa hàng', all(abs(n1 - e * n) < 1e-9 and n1 + n0 == n for n, e, n1, _, n0, _ in strata))
    claim('ipw: tác động thật 5 trong mọi tầng', all(y1 - y0 == 5 for _, _, _, y1, _, y0 in strata))
    m1 = sum(n1 * y1 for _, _, n1, y1, _, _ in strata) / sum(n1 for _, _, n1, _, _, _ in strata)
    m0 = sum(n0 * y0 for _, _, _, _, n0, y0 in strata) / sum(n0 for _, _, _, _, n0, _ in strata)
    num('ipw: trung bình nhóm bật', m1, 2, '/230 = ')
    num('ipw: trung bình nhóm không bật', m0, 2, '/270 = ')
    num('ipw: chênh lệch ngây thơ', m1 - m0, 2, 'chênh <b>')
    claim('ipw: "gấp bảy lần"', round((m1 - m0) / 5) == 7)
    W1 = sum(n1 / e for _, e, n1, _, _, _ in strata)
    W0 = sum(n0 / (1 - e) for _, e, _, _, n0, _ in strata)
    near('ipw: quần thể giả nhóm bật = 500', W1, 500, 1e-9)
    near('ipw: quần thể giả nhóm không bật = 500', W0, 500, 1e-9)
    ipw = sum(n1 / e * y1 for _, e, n1, y1, _, _ in strata) / W1 - sum(n0 / (1 - e) * y0 for _, e, _, _, n0, y0 in strata) / W0
    near('ipw: ước lượng = 5', ipw, 5, 1e-9)
    need('ipw: 73 so với 68', '/500 = 73 so với')
    need('ipw: 68', '/500 = 68. Chênh <b>5</b>')
    sw2 = sum(n0 * (1 / (1 - e)) ** 2 for _, e, _, _, n0, _ in strata)
    near('ipw: Σw² nhóm không bật = 1.650', sw2, 1650, 1e-9)
    num('ipw: Kish nhóm không bật', W0 ** 2 / sw2, 1, '≈ <b>')
    claim('ipw: 151,5 "khoảng 152"', round(W0 ** 2 / sw2) == 152)
    ess99 = 500 ** 2 / (250 + 400 + 100 ** 2)
    num('ipw: Kish khi e = 0,99', ess99, 1, '10.000) ≈ <b>')
    claim('ipw: một cửa hàng trọng số 100 = một phần năm của 500', 100 / 500 == 0.2)
    ess95 = 500 ** 2 / (250 + 400 + 5 * 20 ** 2)
    near('ipw: câu hỏi — Σw khi e = 0,95', 160 * 1.25 + 100 * 2 + 5 * 20, 500, 1e-9)
    num('ipw: câu hỏi — Kish khi e = 0,95', ess95, 1, '500²/2.650 ≈ <b>')
    need('ipw: câu hỏi — trên 265', 'trên 265 cửa hàng')
    claim('ipw: câu hỏi — 5 cửa hàng lớn mang một phần năm', 5 * 20 / 500 == 0.2)
    num('ipw: P(T = 1) = 230/500', 230 / 500, 2, '230/500 = ')
    num('ipw: trọng số ổn định — quần thể giả 230', 0.46 * 500, 0, '0,46 × 500 = ')
    # bền kép với mô hình kết quả SAI (90 / 60) và điểm xu hướng đúng
    c1 = sum(n1 * (y1 - 90) / e for _, e, n1, y1, _, _ in strata) / 500
    c0 = sum(n0 * (y0 - 60) / (1 - e) for _, e, _, _, n0, y0 in strata) / 500
    near('ipw: AIPW — số hạng sửa nhóm bật = −17', c1, -17, 1e-9)
    near('ipw: AIPW — số hạng sửa nhóm không bật = +8', c0, 8, 1e-9)
    near('ipw: AIPW = 30 − 17 − 8 = 5', 30 + c1 - c0, 5, 1e-9)
    need('ipw: câu AIPW', 'Ước lượng = 30 + (−17) − 8 = <b>5</b>')
    # AIPW với mô hình kết quả ĐÚNG và điểm xu hướng SAI (e = 0,5 cho mọi cửa hàng) cũng ra 5
    c1w = sum(n1 * (y1 - y1) / 0.5 for _, _, n1, y1, _, _ in strata)
    claim('ipw: AIPW — mô hình kết quả đúng thì số hạng sửa = 0 dù e sai', c1w == 0)
    aipw_ok = sum(n * (y1 - y0) for n, _, _, y1, _, y0 in strata) / 500
    near('ipw: AIPW — mô hình kết quả đúng, e sai vẫn ra 5', aipw_ok, 5, 1e-12)
    need('ipw: code in ra', '#        IPW 5.0 · Kish nhóm không bật 151.5 trên 270')
    need('ipw: code in ra chênh lệch ngây thơ', '# in ra: ngây thơ ' + ('%.2f' % (m1 - m0)))

    # ═══════════════════ 4.5 · độ nhạy & E-value ═══════════════════
    def ev(rr_):
        if rr_ < 1:
            rr_ = 1 / rr_
        return rr_ + math.sqrt(rr_ * (rr_ - 1))
    num('sense: E-value của RR 0,70', ev(0.70), 2, '')
    need('sense: lede 2,21', 'E-value là <b>' + vi(ev(0.70), 2) + '</b>')
    need('sense: ví dụ 2,21', '≈ <b>' + vi(ev(0.70), 2) + '</b>. Nghĩa là')
    need('sense: ví dụ 1,63', 'E-value là <b>' + vi(ev(0.85), 2) + '</b>')
    num('sense: 1/0,70', 1 / 0.70, 2, '1/0,70 ≈ ')
    claim('sense: bước trung gian dùng số làm tròn vẫn ra 2,21', round(1.43 + math.sqrt(1.43 * 0.43), 2) == 2.21)
    need('sense: fx note', '1,43 + √(1,43 × 0,43) ≈ 1,43 + ' + vi(math.sqrt(1.43 * 0.43), 2) + ' = 2,21')
    near('sense: RR < 1 và 1/RR cho cùng E-value (đối xứng)', ev(0.8), ev(1 / 0.8), 1e-12)
    need('sense: code in ra', '# in ra: 2.21 1.63')
    claim('sense: ví dụ bài gốc 0,80 → 1,81 và 0,91 → 1,43', round(ev(0.80), 2) == 1.81 and round(ev(0.91), 2) == 1.43)
    need('sense: câu hỏi — 1,33', '1,33 + √(1,33 × 0,33) ≈ 1,33 + ' + vi(math.sqrt(1.33 * 0.33), 2) + ' = <b>' + vi(1.33 + 0.66, 2) + '</b>')
    claim('sense: câu hỏi — E-value 1,33 ≈ 2 (Mathur et al.)', round(ev(1.33)) == 2 and abs(ev(1.33) - 1.9925) < 1e-3)
    # bảng thiên lệch = δ·γ; ô đỏ là ô vượt 3,0
    for dlt in (0.2, 0.4, 0.6, 0.8):
        cells = []
        for gm in (1, 2, 4, 6):
            bias = dlt * gm
            cells.append('<b class="c-bad">' + vi(bias, 1) + '</b>' if bias > 3.0 + 1e-9 else vi(bias, 1))
        need(f'sense: hàng δ = {dlt}', '<td>' + vi(dlt, 1) + ' độ lệch chuẩn</td>' + ''.join('<td>' + c + '</td>' for c in cells))
    near('sense: ví dụ năng nổ 0,4 × 3 = 1,2', 0.4 * 3, 1.2, 1e-12)
    need('sense: ví dụ năng nổ', '0,4 × 3 = <b>1,2</b>')
    need('sense: 3,0 còn 1,8', 'ước lượng đã điều chỉnh 3,0 triệu có thể thật ra chỉ 1,8')
    near('sense: 3,0 − 1,2 = 1,8', 3.0 - 1.2, 1.8, 1e-12)
    js_has('sense: code E-value đúng công thức', HTML, r'return rr \+ math\.sqrt\(rr \* \(rr - 1\)\)')
    js_has('sense: code E-value nghịch đảo khi RR < 1', HTML, r'if rr &lt; 1:\s*rr = 1 / rr')

    # ═══════════════════ vòng sửa · lượt 1 — nhất quán toàn trang (review-consistency.md) ═══════════════════
    # Mỗi dòng dưới giữ một quyết định tên gọi / ký hiệu đã chốt, để nó không trôi lại lặng lẽ.
    a = HTML.find('id="act3"')
    b = HTML.find('</section>', HTML.find('id="s-sense"'))
    P2 = HTML[a:b] if 0 <= a < b else ''
    claim('nhất quán: tìm được đoạn phần 2 (act3 → hết 4.5)', len(P2) > 50000, f'{len(P2)} ký tự')

    def sec(sid):
        i = P2.find('id="' + sid + '"')
        j = P2.find('</section>', i)
        return P2[i:j] if 0 <= i < j else ''
    # T2 · A/B giữ một vai trong cả danh sách: B là nhánh can thiệp ở cả ba gạch
    need('T2 · gạch 2: B là cửa hàng bật khuyến mãi, A là đối chứng',
         'Bật khuyến mãi ở cửa hàng B, khách từ cửa hàng A (đối chứng) chuyển sang → A tụt')
    claim('T2 · không còn "cửa hàng B (đối chứng)"', 'cửa hàng B (đối chứng)' not in P2)
    # C2 · danh sách lây nói thẳng ba dạng đầu là của 1.4
    need('C2 · câu dẫn trỏ về 1.4', 'Ba dạng đầu dưới đây đã được điểm tên ở <a href="#s-sutva">mục 1.4</a>')
    li = re.findall(r'<li><b>([^<]+)</b>', sec('s-interfere'))
    claim('C2 · ba gạch đầu là ba dạng của 1.4 (hàng tồn, hai cửa hàng, người quen)',
          li[:3] == ['Hàng tồn dùng chung.', 'Hai cửa hàng tranh cùng khách.', 'Lây qua người quen.'], repr(li[:5]))
    # T3 · treatment là "can thiệp", không "điều trị" — cả văn lẫn chú thích công thức
    claim('T3 · phần 2 không còn chữ "điều trị"', 'điều trị' not in P2.lower())
    need('T3 · từ điển interference', "'interference','lây giữa hai nhóm','Kết quả của một đơn vị bị việc can thiệp lên đơn vị <b>khác</b> tác động:")
    need('T3 · từ điển E-value', 'phải có với <b>cả</b> việc nhận can thiệp lẫn kết quả')
    # T4 · effect là "tác động"; "hiệu ứng" chỉ còn trong tên riêng (mới lạ, quen cũ)
    for bad in ('cỡ hiệu ứng', 'hiệu ứng lớn', 'hiệu ứng thật lớn', 'hiệu ứng rất lớn'):
        claim('T4 · không còn "' + bad + '"', bad not in P2)
    need('T4 · mSPRT nói cỡ tác động', 'qua nhiều cỡ tác động có thể')
    # T5 · "chênh lệch ngây thơ" là tên 1.2 đặt; "so thẳng" không còn ở văn lẫn JS
    claim('T5 · văn phần 2 không còn "so thẳng"', 'so thẳng' not in P2.lower())
    claim('T5 · JS propensity/ipw không còn "so thẳng"', 'so thẳng' not in js_block('propensity').lower())
    need('T5 · nhãn đọc số', '<div class="k">Chênh lệch ngây thơ</div>')
    need('T5 · đoạn tính tay 4.4', '<p><b>Chênh lệch ngây thơ</b>: trung bình nhóm bật là')
    need('T5 · aria-label hình 4.4', 'aria-label="Ba ước lượng: chênh lệch ngây thơ, IPW và AIPW')
    # T6 · SE không tính cụm / coi mọi dòng độc lập tên là "SE thường" (như 5.1); "ngây thơ" để cho chênh lệch
    claim('T6 · phần 2 không còn "SE ngây thơ"', 'SE ngây thơ' not in P2)
    need('T6 · 3.5 định nghĩa SE thường', '<b>SE thường</b>, công thức s/√n quen thuộc')
    need('T6 · 3.4 khối code', 'SE thường và SE theo cụm')
    # T12 · "kiểm chứng giả" = placebo, có mục từ điển
    need('T12 · 4.5 gọi tên placebo test', 'Tên chung tiếng Anh là <b>placebo test</b>')
    need('T12 · 4.5 trỏ sang 5.2 và 6.5', '<a href="#s-synth">Mục 5.2</a> và <a href="#s-workflow">6.5</a>')
    need('T12 · từ điển placebo test', "['placebo test','kiểm chứng giả',")
    need('T12 · dạng gạch chân placebo', "'#s-sense','placebo|kiểm chứng giả']")
    need('T12 · can thiệp giả', '<li><b>Can thiệp giả</b>: một tính năng')
    # T13 · nhóm giữ lại (holdout), tên 2.5/2.6 đã dùng
    need('T13 · 3.6 nhóm giữ lại', '<b>Giữ một nhóm giữ lại</b> (holdout)')
    # K1 · 3.5 không mượn θ của CUPED
    claim('K1 · 3.5 không còn θ', 'θ' not in sec('s-units'))
    need('K1 · hộp Toán 3.5 viết thẳng R̄/Ō', 'Var(R̄/Ō) ≈ Var(R − (R̄/Ō)·O)/(nŌ²)')
    # K2 · 4.5 không dùng lại γ của thanh kéo 4.3–4.4
    claim('K2 · 4.5 không còn γ·δ', 'γ·δ' not in P2)
    need('K2 · hộp Toán 4.5 bằng lời', 'Thiên lệch bỏ sót biến = (U làm Y đổi bao nhiêu) × (U chênh giữa hai nhóm bao nhiêu)')
    # K7 · một đại lượng một tên trong 3.4: ICC
    claim('K7 · 3.4 không còn ρ', 'ρ' not in sec('s-interfere'))
    need('K7 · hộp Toán 3.4 dùng ICC', '[1 + (m − 1)·ICC]</span> với K cụm, m khách mỗi cụm. Khi m → ∞, n hiệu dụng → K/ICC.')
    # L4 · nguồn ngoài không đánh số bằng chữ "mục" (mục là của trang này)
    maps = re.findall(r'<p class="map">(.*?)</p>', P2, re.S)
    claim('L4 · dòng nguồn phần 2 không có chữ "mục"', maps and not any('mục' in m for m in maps), repr([m for m in maps if 'mục' in m]))
    for want in ('KDD · §3, cluster randomization', 'Five Puzzling Outcomes Explained, §3.3', 'STA 640 §3.4'):
        need('L4 · ' + want, want)
    # L5 · mục của trang Toán gọi bằng số, như phần 1
    need('L5 · 3.1 → Toán 4.8', 's-traps">mục 4.8</a> (bẫy thứ hai)')
    need('L5 · 3.1 → Toán 4.2', 's-clt">mục 4.2</a>)')
    need('L5 · 3.2 → Toán 4.8', 's-traps">mục 4.8</a>, bẫy thứ nhất')
    claim('L5 · không còn "mục CLT" / "mục bốn cái bẫy"', 'mục CLT' not in P2 and '>bốn cái bẫy<' not in P2)
    # C1 · va chạm của 4.1 nối về bảng "đã ghé" của 1.3
    need('C1 · 4.1 nối về 1.3', 'Bảng &ldquo;đã ghé&rdquo; ở <a href="#s-traps3">mục 1.3</a> cũng là một va chạm')
    need('C1 · dạng T → Z ← U → Y', 'SMS → đã ghé ← khách quen → chi tiêu')
    # G3 · G4 · dạng tự gạch chân tiếng Việt
    need('G3 · unconfoundedness gạch cả cụm tiếng Việt',
         "'conditional ignorability|không còn biến gây nhiễu nào chưa đo|không còn biến gây nhiễu chưa đo']")
    need('G4 · interference gạch "lây nhau"', "'#s-interfere','spillover|lây nhau|lây sang nhau']")
    # K10 · act4 nói rõ các thế giới tách nhau
    need('K10 · act4', 'tác động thật của cùng một tính năng đổi từ mục này sang mục khác — đừng nối con số giữa các mục')
    # review-main · ký hiệu Latin một chữ trong nhãn viết hoa phải nằm trong .lc (e → E là kỳ vọng)
    for want in ('một bảng <span class="lc">p</span>, bốn cách đọc', 'Số phép kiểm <span class="lc">k</span>',
                 '<th><span class="lc">p</span></th><th>Ngưỡng</th>', '<div class="k"><span class="lc">p</span></div><div class="v" id="m-srm-p">',
                 '<div class="k"><span class="lc">n</span> hiệu dụng</div>', '<th><span class="lc">e</span></th><th>Bật · doanh thu</th>',
                 'Trọng số bật 1/<span class="lc">e</span>', 'Trọng số không bật 1/(1 − <span class="lc">e</span>)'):
        need('chữ thường trong nhãn viết hoa · ' + re.sub(r'<[^>]+>', '', want)[:40], want)

    # ═══════════════════ vòng sửa · lượt 2 — rà đối kháng của P3 (review-of-p2.md) ═══════════════════
    # A1 · 27,5% là báo "có khác biệt" theo CẢ HAI chiều; đúng một nửa là "bản mới thắng"
    num('A1 · lede — một nửa theo chiều bản mới thắng', A[28] / 2 * 100, 1, '(<b>')
    need('A1 · lede nói rõ hai chiều', 'đúng một nửa số ấy (<b>' + vi(A[28] / 2 * 100, 1) + '%</b>) báo bản mới thắng, nửa kia báo bản mới thua')
    up = down = 0
    for row_ in Zs:
        for d_ in range(D):
            if abs(row_[d_]) > ZC:
                if row_[d_] > 0:
                    up += 1
                else:
                    down += 1
                break
    se_ud = math.sqrt(up + down)
    claim('A1 · mô phỏng 4.000 A/A: lần dừng đầu chia đều hai chiều (trong 3 SE)', abs(up - down) < 3 * se_ud, f'lên {up}, xuống {down}')
    old_win = ('thí nghiệm sẽ &ldquo;thắng&rdquo;', 'cái &ldquo;thắng&rdquo;', 'A/A &ldquo;thắng&rdquo;', 'Từng &ldquo;thắng&rdquo;',
               'báo &ldquo;thắng&rdquo;', 'mọi lần &ldquo;thắng&rdquo;', 'bị tính là &ldquo;thắng&rdquo;', 'nhiều thí nghiệm &ldquo;thắng&rdquo;')
    # (“thắng” còn lại ở 3.2 là một phân khúc thắng theo đúng một chiều — nghĩa ấy đúng)
    claim('A1 · phần 2 không còn “thắng” cho kết quả hai phía', not any(x in P2 for x in old_win), repr([x for x in old_win if x in P2]))
    need('A1 · từ điển A/A test', 'nên mọi lần báo &ldquo;có khác biệt&rdquo; là báo động giả — cái cân để đo cả quy trình phân tích')
    claim('A1 · JS peek/cluster không còn “thắng” trong ngoặc kép', '“thắng”' not in js_block('peek') and '“thắng”' not in js_block('cluster'))
    js_has('A1 · JS nói đúng chiều của lần dừng', js_block('peek'), r"var zs = Z\[feat \* D \+ stop - 1\], verdict = zs > 0 \? 'thắng' : 'thua';")
    js_has('A1 · JS câu nhắc dùng chiều ấy', js_block('peek'), r"bạn dừng và báo bản mới ' \+ verdict \+ ', dù hai bản y hệt nhau")
    for want in ('<div class="k">Báo động giả · mô phỏng</div>', '<tr><td>Thí nghiệm A/A báo động giả</td>',
                 'khoảng <b>42</b> cái báo động giả', '<div class="k">A/A báo động giả nếu bỏ qua cụm</div>',
                 'SE đúng thì khoảng 5% số A/A báo động giả', 'hơn một phần tư số thay đổi vô tác dụng sẽ bị báo &ldquo;có khác biệt&rdquo;'):
        need('A1 · ' + re.sub(r'<[^>]+>|&[a-z]+;', '', want)[:44], want)
    # A2 · FWER: khả năng có dù chỉ một báo động giả ≤ 5%, không phải "chịu được tối đa một"
    need('A2 · lede 3.2', 'muốn khả năng có dù chỉ <b>một</b> báo động giả trong cả bảng không quá 5% (giữ FWER — dùng Holm)')
    claim('A2 · không còn "chịu được tối đa một báo động giả"', 'chịu được tối đa' not in P2)
    # A4 · Deng 2018 chỉ đo 100 và 1.000 khách
    need('A4 · khoảng một trăm khách', 'với khoảng một trăm khách và đuôi phân phối nặng')
    need('A4 · 1.000 khách đã về 94–95%', '(ở 1.000 khách đã về 94–95%)')
    claim('A4 · không còn "vài trăm khách"', 'vài trăm khách' not in P2)
    # A6 · AUC cao là triệu chứng của dữ liệu
    need('A6 · AUC', 'AUC rất cao không phải là mô hình tốt')
    need('A6 · đừng bỏ biến gây nhiễu', 'bỏ bớt biến gây nhiễu cho AUC thấp xuống còn sai hơn')
    claim('A6 · không còn luật đơn điệu "càng giỏi càng tệ"', 'càng giỏi thì càng tệ' not in P2)
    # A7 · ở γ = 3 ô ước lượng gần 5 là may: 40 bộ dữ liệu cùng cơ chế, cùng thuật toán của mô hình
    def ps_att(seed, gamma):
        r_ = jsrng(seed)
        x1, x2, ep, uu = [], [], [], []
        for _ in range(Np):
            x1.append(jsgauss(r_))
            x2.append(jsgauss(r_))
            ep.append(jsgauss(r_))
            uu.append(r_())
        T_ = [1 if uu[j] < sig(-0.2 + gamma * (0.9 * x1[j] + 0.5 * x2[j])) else 0 for j in range(Np)]
        Y_ = [60 + 8 * x1[j] + 4 * x2[j] + 5 * ep[j] + 5 * T_[j] for j in range(Np)]
        b_ = logit_fit([x1, x2], T_)
        eh_ = [sig(b_[0] + b_[1] * x1[j] + b_[2] * x2[j]) for j in range(Np)]
        tr_ = [j for j in range(Np) if T_[j]]
        cs_ = sorted([j for j in range(Np) if not T_[j]], key=lambda q: eh_[q])
        ce_ = [eh_[q] for q in cs_]
        acc = 0.0
        for t_ in tr_:
            lo = bisect.bisect_left(ce_, eh_[t_])
            best = -1
            for q in (lo - 1, lo):
                if 0 <= q < len(ce_) and (best < 0 or abs(ce_[q] - eh_[t_]) < abs(ce_[best] - eh_[t_])):
                    best = q
            acc += Y_[t_] - Y_[cs_[best]]
        return acc / len(tr_)
    import bisect
    claim('A7 · ps_att dựng lại đúng mô hình ở hạt giống 7 (γ = 1 và 3)',
          abs(ps_att(7, 1.0) - o1['att']) < 1e-9 and abs(ps_att(7, 3.0) - o3['att']) < 1e-9, f"{ps_att(7, 3.0):.6f} so với {o3['att']:.6f}")
    s1_ = statistics.stdev([ps_att(1000 + q, 1.0) for q in range(40)])
    s3_ = statistics.stdev([ps_att(1000 + q, 3.0) for q in range(40)])
    need('A7 · ô ước lượng ở γ = 3', 'Ô ước lượng lúc ấy vẫn ra <b>' + vi(o3['att'], 1) + '</b>, gần 5')
    num('A7 · 40 bộ: dao động ở γ = 3 gấp bao nhiêu lần γ = 1', s3_ / s1_, 1, 'dao động gấp <b>')
    claim('A7 · dao động ở γ = 3 hơn gấp đôi γ = 1', s3_ / s1_ > 2, f'{s1_:.3f} và {s3_:.3f}')
    # A5 · câu nhắc mô hình ipw sinh từ số, ở MỌI vị trí thanh và chip
    def ipw_say(o, gamma, ps, mu, trim):
        okI, okA, thin = abs(o['ipw'] - 5) < 1, abs(o['aipw'] - 5) < 1, o['maxw'] >= 20
        weak = 'ở γ = 0 bật như tung đồng xu' if gamma == 0 else 'tự chọn còn yếu'

        def num_(v, ok):
            if ok:
                return vi(v, 1) + ' (gần 5)'
            return vi(v, 1) + ' (lệch ' + vi(abs(v - 5), 1) + ')'
        if ps == 'ok' and mu == 'ok':
            who = 'Hai mô hình đúng'
        elif ps == 'ok':
            who = 'Điểm xu hướng đúng, mô hình kết quả sai'
        elif mu == 'ok':
            who = 'Điểm xu hướng sai (bỏ cỡ cửa hàng), mô hình kết quả đúng'
        else:
            who = 'Cả hai mô hình sai'
        why = []
        if okI and okA:
            if ps == 'bad' and mu == 'bad':
                why.append('gần 5 dù hai mô hình đều sai, chỉ vì ' + weak + ' — kéo γ lên là thấy bền kép cần ít nhất MỘT mô hình đúng')
            else:
                if ps == 'ok' and mu == 'bad':
                    why.append('IPW không dùng mô hình kết quả; AIPW nhờ điểm xu hướng đúng sửa lại mô hình kết quả sai')
                if ps == 'bad':
                    why.append('AIPW nhờ mô hình kết quả đúng; IPW gần 5 chỉ vì ' + weak)
                if thin:
                    why.append('vài cửa hàng hiếm đang mang trọng số rất lớn, nên con số dựa vào chúng')
        else:
            if not okI and ps == 'bad':
                why.append('IPW lệch vì điểm xu hướng sai')
            elif not okI and thin:
                why.append('IPW lệch dù điểm xu hướng đúng: chồng lấn kém, vài cửa hàng hiếm mang trọng số rất lớn')
            elif not okI:
                why.append('IPW lệch dù điểm xu hướng đúng — nhiễu của một bộ dữ liệu')
            elif ps == 'ok':
                why.append('IPW gần 5 nhờ điểm xu hướng đúng')
            else:
                why.append('IPW gần 5 chỉ vì ' + weak)
            if okA and mu == 'ok':
                why.append('AIPW gần 5 nhờ mô hình kết quả đúng')
            elif okA and ps == 'ok':
                why.append('AIPW gần 5 nhờ điểm xu hướng đúng')
            elif okA:
                why.append('AIPW gần 5 dù hai mô hình đều sai — may của bộ dữ liệu này')
            elif ps == 'bad' and mu == 'bad':
                why.append('AIPW cũng lệch: bền kép cần ít nhất MỘT mô hình đúng')
            elif thin:
                why.append('AIPW cũng lệch dù có một mô hình đúng: chồng lấn kém thì bền kép cũng không cứu được')
            else:
                why.append('AIPW lệch dù có một mô hình đúng — nhiễu của một bộ dữ liệu')
        say = who + ': IPW ' + num_(o['ipw'], okI) + ', AIPW ' + num_(o['aipw'], okA) + '.'
        if why:
            w_ = '; '.join(why)
            say += ' ' + w_[0].upper() + w_[1:] + '.'
        say += (' Trọng số lớn nhất ' + vi(o['maxw'], 1) + '; ' + str(o['n0']) + ' cửa hàng không bật chỉ đáng ' + vi(o['ess0'], 0) +
                ' cửa hàng không trọng số' + (', sau khi cắt ' + str(o['cut']) + ' cửa hàng ngoài [0,1; 0,9] — con số giờ là tác động trên vùng chồng lấn.' if trim else '.'))
        return say
    bad_pos, seen_branch = [], set()
    for v_ in range(31):
        g_ = v_ / 10
        for ps_ in ('ok', 'bad'):
            for mu_ in ('ok', 'bad'):
                for tr_ in (False, True):
                    o_ = ipw_model(g_, ps_, mu_, tr_)
                    sy = ipw_say(o_, g_, ps_, mu_, tr_)
                    okI_, okA_ = abs(o_['ipw'] - 5) < 1, abs(o_['aipw'] - 5) < 1
                    tag = f'γ={g_:.1f} ps={ps_} mu={mu_} cắt={int(tr_)}'
                    rules = [
                        ('IPW (gần 5) ⇔ lệch < 1', ('IPW ' + vi(o_['ipw'], 1) + ' (gần 5)' in sy) == okI_),
                        ('AIPW (gần 5) ⇔ lệch < 1', ('AIPW ' + vi(o_['aipw'], 1) + ' (gần 5)' in sy) == okA_),
                        ('"chồng lấn kém" / "trọng số rất lớn" chỉ khi trọng số lớn nhất ≥ 20',
                         ('chồng lấn kém' not in sy and 'trọng số rất lớn' not in sy) or o_['maxw'] >= 20),
                        ('"tự chọn còn yếu" chỉ khi 0 < γ ≤ 0,5', 'tự chọn còn yếu' not in sy or 0 < g_ <= 0.5),
                        ('"ở γ = 0" chỉ khi γ = 0', 'ở γ = 0' not in sy or g_ == 0),
                        ('"nhờ mô hình kết quả đúng" chỉ khi nó đúng và AIPW gần 5', 'nhờ mô hình kết quả đúng' not in sy or (mu_ == 'ok' and okA_)),
                        ('"nhờ điểm xu hướng đúng" chỉ khi nó đúng', 'nhờ điểm xu hướng đúng' not in sy or ps_ == 'ok'),
                        ('"vì điểm xu hướng sai" chỉ khi nó sai', 'vì điểm xu hướng sai' not in sy or ps_ == 'bad'),
                        ('"dù điểm xu hướng đúng" chỉ khi nó đúng', 'dù điểm xu hướng đúng' not in sy or ps_ == 'ok'),
                        ('"dù hai mô hình đều sai" chỉ khi cả hai sai', 'dù hai mô hình đều sai' not in sy or (ps_ == 'bad' and mu_ == 'bad')),
                        ('"dù có một mô hình đúng" chỉ khi có ít nhất một cái đúng', 'dù có một mô hình đúng' not in sy or ps_ == 'ok' or mu_ == 'ok'),
                        ('câu mở nói đúng ô chip đang chọn', sy.startswith({('ok', 'ok'): 'Hai mô hình đúng:', ('ok', 'bad'): 'Điểm xu hướng đúng, mô hình kết quả sai:',
                                                                        ('bad', 'ok'): 'Điểm xu hướng sai (bỏ cỡ cửa hàng), mô hình kết quả đúng:', ('bad', 'bad'): 'Cả hai mô hình sai:'}[(ps_, mu_)])),
                        ('"bền kép cũng không cứu được" chỉ khi có một mô hình đúng, chồng lấn kém, AIPW lệch',
                         'bền kép cũng không cứu được' not in sy or ((ps_ == 'ok' or mu_ == 'ok') and o_['maxw'] >= 20 and not okA_)),
                        ('"cần ít nhất MỘT mô hình đúng" chỉ khi cả hai sai', 'cần ít nhất MỘT mô hình đúng' not in sy or (ps_ == 'bad' and mu_ == 'bad')),
                        ('không còn lời cố định theo ô 2×2', not any(x in sy for x in ('quanh 5', 'lệch hẳn', 'lệch xa 5'))),
                    ]
                    for name, ok in rules:
                        if not ok:
                            bad_pos.append(tag + ' · ' + name + ' · ' + sy)
                    for frag in ('nhiễu của một bộ dữ liệu', 'may của bộ dữ liệu này', 'bền kép cũng không cứu được', 'tự chọn còn yếu', 'ở γ = 0'):
                        if frag in sy:
                            seen_branch.add(frag)
    claim('A5 · câu nhắc ipw khớp số ở cả 31 × 8 vị trí', not bad_pos, '; '.join(bad_pos[:3]) + (f' … ({len(bad_pos)} chỗ)' if bad_pos else ''))
    claim('A5 · bài học "chồng lấn kém thì bền kép cũng không cứu được" hiện ra ở γ = 3, điểm xu hướng đúng, mô hình kết quả sai',
          'chồng lấn kém thì bền kép cũng không cứu được' in ipw_say(ipw_model(3.0, 'ok', 'bad'), 3.0, 'ok', 'bad', False))
    claim('A5 · lưới có đi qua nhánh "tự chọn còn yếu" và "ở γ = 0"', {'tự chọn còn yếu', 'ở γ = 0'} <= seen_branch, repr(seen_branch))
    need('A5 · câu nhắc mặc định trong HTML đúng bằng câu JS sinh ra', 'id="m-ipw-say">' + ipw_say(d_ok, 1.5, 'ok', 'ok', False) + '</p>')
    blk_ = js_block('propensity')
    js_has('A5 · JS gần 5 = lệch dưới 1, chồng lấn kém = trọng số lớn nhất ≥ 20', blk_,
           r'var okI = Math\.abs\(o\.ipw - TRUE\) < 1, okA = Math\.abs\(o\.aipw - TRUE\) < 1, thin = o\.maxw >= 20;')
    js_has('A5 · JS câu nhắc gọi ipwSay (sinh từ số)', blk_, r"\$\('m-ipw-say'\)\.textContent = ipwSay\(o, gamma\);")
    js_has('A5 · JS nhánh γ = 0', blk_, r"if \(gamma === 0\) weak = 'ở γ = 0 bật như tung đồng xu';")
    js_has('A5 · JS nhánh chồng lấn kém của AIPW', blk_,
           r"else if \(thin\) why\.push\('AIPW cũng lệch dù có một mô hình đúng: chồng lấn kém thì bền kép cũng không cứu được'\);")
    js_has('A5 · JS nhánh IPW lệch dù điểm xu hướng đúng', blk_,
           r"else if \(!okI && thin\) why\.push\('IPW lệch dù điểm xu hướng đúng: chồng lấn kém, vài cửa hàng hiếm mang trọng số rất lớn'\);")
    js_has('A5 · JS số kèm nhãn (gần 5) / (lệch …)', blk_, r"if \(ok\) return fmt\(v, 1\) \+ ' \(gần 5\)';\s*return fmt\(v, 1\) \+ ' \(lệch ' \+ fmt\(Math\.abs\(v - TRUE\), 1\) \+ '\)';")
    claim('A5 · JS không còn lời cố định "quanh 5" / "lệch hẳn" / "lệch xa 5"', not any(x in blk_ for x in ('quanh 5', 'lệch hẳn', 'lệch xa 5')))
    g3, g3m = ipw_model(3.0), ipw_model(3.0, mu='bad')
    need('A5 · gợi ý γ = 3', 'điểm xu hướng vẫn đúng mà IPW ra <b>' + vi(g3['ipw'], 2) + '</b> — trọng số lớn nhất <b>' + vi(g3['maxw'], 1) +
         '</b>; AIPW còn <b>' + vi(g3['aipw'], 2) + '</b> là nhờ mô hình kết quả đúng; đổi mô hình kết quả sang sai thì AIPW cũng <b>' + vi(g3m['aipw'], 2) + '</b>')
    claim('A5 · γ = 3: IPW lệch dù điểm xu hướng đúng, AIPW (kết quả đúng) gần 5, AIPW (kết quả sai) lệch',
          abs(g3['ipw'] - 5) >= 1 and abs(g3['aipw'] - 5) < 1 and abs(g3m['aipw'] - 5) >= 1 and g3['maxw'] >= 20)
    # A8 · E-value: yếu hơn ở CẢ HAI chiều mới không đủ; một chiều yếu thì chiều kia phải mạnh hơn
    Bt = 1 / 0.70
    bias = lambda a_, b_: a_ * b_ / (a_ + b_ - 1)
    need_b = lambda a_: Bt * (a_ - 1) / (a_ - Bt)
    near('A8 · E-value là nghiệm khi hai liên hệ bằng nhau', bias(ev(0.70), ev(0.70)), Bt, 1e-9)
    num('A8 · 2 lần với việc bật cần', need_b(2.0), 1, 'liên hệ 2 lần với việc bật cần ')
    near('A8 · 1,6 lần cần đúng 5 lần', need_b(1.6), 5.0, 1e-9)
    need('A8 · câu 1,6 lần cần 5 lần', '1,6 lần cần 5 lần')
    claim('A8 · một liên hệ yếu hơn 1/0,70 thì chiều kia mạnh mấy cũng không đủ', bias(1.42, 1e12) < Bt and bias(1.43, 1e12) > Bt)
    need('A8 · câu cả hai chiều', 'yếu hơn thế ở <b>cả hai</b> chiều thì không đủ')
    claim('A8 · không còn cách đọc sai "yếu hơn ở một trong hai chiều thì không đủ"', 'ở một trong hai chiều thì không đủ' not in P2)
    need('A8 · hệ số thiên lệch trong fx', 'a·b/(a + b − 1) ≥ RR; E-value là nghiệm của nó khi a = b')
    # A9 · lời dẫn chặng 3: 3.4 phá "chưa nhận gì", không phá "giống nhau"
    need('A9 · act3', 'Hai cách tiếp theo phá <b>chính thứ bạn mượn từ đồng xu</b>')
    need('A9 · act3 — 3.4', 'hai nhóm lây sang nhau nên nhóm đối chứng không còn là &ldquo;chưa nhận gì&rdquo; (3.4)')
    # A10 · mỗi ví von ở ô Đời thường có chỗ ví von hỏng (CONTRACT §5, luật 2)
    plays = re.findall(r'<div class="r-play"><div class="lbl">Đời thường</div><div class="v">(.*?)</div></div>', P2, re.S)
    claim('A10 · 8 ô Đời thường, 6 ô ví von có "Chỗ ví von hỏng"', len(plays) == 8 and sum('Chỗ ví von hỏng' in p_ for p_ in plays) == 6,
          f'{len(plays)} ô, {sum("Chỗ ví von hỏng" in p_ for p_ in plays)} có chỗ hỏng')

# ═══════════════════ PHẦN 3 · chặng 5–6 (DiD, đối chứng tổng hợp, RDD, IV, tác động không đều,
# uplift, meta-learner, DML, quy trình) ═══════════════════
# Mỗi mô hình có một bản chép Python của phần TÍNH THUẦN trong JS (cùng thứ tự phép tính, cùng
# bộ sinh số jsrng/jsgauss), nên con số nào mô hình hiện ra cũng tính lại được tới chữ số hiện.
# Hàm phụ mang tiền tố _p3_ để không đụng tên của phần khác.

_P3_DID_MUA = [-6, -5, -2, 4, 15, -6, -8, -4, -1, 3, 6, 4]
_P3_SY_MUA = [
    [-8, -6, -2, 2, 8, 16, 20, 16, 4, -6, -10, -8],
    [-22, -14, 4, 6, 6, 4, 2, 4, 6, 8, 10, 12],
    [-4, -10, 6, 8, 4, -14, -18, -6, 12, 10, 8, 4],
    [6, 8, 2, -6, -8, -4, 0, 2, 4, -2, 4, 6],
]
_P3_SY_NEN = [205, 178, 232, 160]
_P3_SY_DOC = [0.4, 0.9, 0.2, 0.5]


def _p3_js_array(name):
    """Đọc một mảng hằng số P3.<name> = [...] trong JS của trang (để so với bản Python)."""
    m = re.search(r'P3\.' + re.escape(name) + r'\s*=\s*(\[[^;]*?\]);', HTML, re.S)
    if not m:
        return None
    body = re.sub(r'\s+', '', m.group(1))
    return eval(body, {'__builtins__': {}})


# ── DiD ─────────────────────────────────────────────────────────────────────────
def _p3_did(tau, delta, shock):
    A, A0, B = [], [], []
    for t in range(12):
        post = 1 if t >= 6 else 0
        b = 380 + 3 * (t - 2.5) + _P3_DID_MUA[t]
        a0 = 412 + (3 + delta) * (t - 2.5) + _P3_DID_MUA[t] + (12 if (shock and post) else 0)
        B.append(b); A0.append(a0); A.append(a0 + (tau if post else 0))
    aPre = aPost = bPre = bPost = 0.0
    for t in range(6):
        aPre += A[t] / 6; bPre += B[t] / 6; aPost += A[t + 6] / 6; bPost += B[t + 6] / 6
    base = aPre - bPre
    gap = [A[t] - B[t] - base for t in range(12)]
    sxy = sxx = 0.0
    for t in range(6):
        sxy += (t - 2.5) * gap[t]; sxx += (t - 2.5) * (t - 2.5)
    return dict(A=A, A0=A0, B=B, gap=gap, aPre=aPre, aPost=aPost, bPre=bPre, bPost=bPost,
                est=(aPost - aPre) - (bPost - bPre), preSlope=sxy / sxx)


def _p3_twfe(Y, D):
    """TWFE: hồi quy y theo hiệu ứng cố định nhóm + tháng + cột đã-bật. Trả hệ số của cột ấy."""
    G = len(Y); T = len(Y[0])
    cols = [[] for _ in range((G - 1) + (T - 1) + 1)]
    ys = []
    for g in range(G):
        for t in range(T):
            k = 0
            for j in range(1, G):
                cols[k].append(1.0 if g == j else 0.0); k += 1
            for s in range(1, T):
                cols[k].append(1.0 if t == s else 0.0); k += 1
            cols[k].append(D[g][t]); ys.append(Y[g][t])
    return ols(cols, ys)[-1]


def _p3_stagger(starts, growth, bases=(400, 380, 360), T=6):
    """Bảng so le: nhóm g bật từ tháng starts[g] (None = chưa bật), Y(0) = nền + 3·tháng."""
    Y, D, eff = [], [], []
    for g, st in enumerate(starts):
        yr, dr = [], []
        for t in range(1, T + 1):
            y0 = bases[g] + 3 * t
            if st is not None and t >= st:
                tau = growth(t - st); yr.append(y0 + tau); dr.append(1.0); eff.append(tau)
            else:
                yr.append(y0); dr.append(0.0)
        Y.append(yr); D.append(dr)
    return Y, D, eff


# ── đối chứng tổng hợp ──────────────────────────────────────────────────────────
def _p3_synth_data():
    r = jsrng(2164); D = []
    for k in range(4):
        D.append([_P3_SY_NEN[k] + _P3_SY_DOC[k] * t + _P3_SY_MUA[k][t % 12] + 3 * jsgauss(r) for t in range(24)])
    P0, P = [], []
    for t in range(24):
        v = 0.5 * D[0][t] + 0.3 * D[1][t] + 0.2 * D[2][t] + 0 * D[3][t] + 2 * jsgauss(r)
        P0.append(v); P.append(v + (15 if t >= 18 else 0))
    return D, P0, P


def _p3_proj_simplex(v):
    u = sorted(v, reverse=True); css = 0.0; th = 0.0
    for j in range(len(u)):
        css += u[j]
        t = (css - 1) / (j + 1)
        if u[j] - t > 0:
            th = t
    return [max(x - th, 0.0) for x in v]


def _p3_synth_step(D, P, w, iters, T0=18):
    J = len(D); X = []; y = []
    for t in range(T0):
        m = 0.0
        for j in range(J):
            m += D[j][t]
        m /= J
        X.append([D[j][t] - m for j in range(J)]); y.append(P[t] - m)
    L = 0.0
    for t in range(T0):
        for j in range(J):
            L += X[t][j] * X[t][j]
    w = list(w)
    for _ in range(iters):
        g = [0.0] * J
        for t in range(T0):
            e = -y[t]
            for j in range(J):
                e += X[t][j] * w[j]
            for j in range(J):
                g[j] += X[t][j] * e
        w = _p3_proj_simplex([w[j] - g[j] / L for j in range(J)])
    return w


def _p3_synth_exact(D, P, T0=18):
    """Nghiệm chính xác: thử mọi tập đơn vị hiến, giải bình phương tối thiểu có Σw = 1 (KKT),
    giữ nghiệm không âm có sai số nhỏ nhất. Một cách giải KHÁC hẳn gradient chiếu của trang."""
    import itertools
    J = len(D); best = None
    for k in range(1, J + 1):
        for S in itertools.combinations(range(J), k):
            n = len(S)
            A = [[0.0] * (n + 1) for _ in range(n + 1)]; b = [0.0] * (n + 1)
            for a in range(n):
                for c in range(n):
                    A[a][c] = 2 * sum(D[S[a]][t] * D[S[c]][t] for t in range(T0))
                A[a][n] = 1.0; A[n][a] = 1.0
                b[a] = 2 * sum(D[S[a]][t] * P[t] for t in range(T0))
            b[n] = 1.0
            try:
                sol = solve(A, b)
            except ValueError:
                continue
            if min(sol[:n]) < -1e-12:
                continue
            w = [0.0] * J
            for a in range(n):
                w[S[a]] = sol[a]
            obj = sum((P[t] - sum(w[j] * D[j][t] for j in range(J))) ** 2 for t in range(T0))
            if best is None or obj < best[0]:
                best = (obj, w)
    return best[1]


def _p3_curve(D, w):
    return [sum(w[j] * D[j][t] for j in range(len(D))) for t in range(len(D[0]))]


def _p3_rmspe(P, S, a, b):
    return math.sqrt(sum((P[t] - S[t]) ** 2 for t in range(a, b)) / (b - a))


def _p3_meangap(P, S, a, b):
    return sum(P[t] - S[t] for t in range(a, b)) / (b - a)


# ── RDD ─────────────────────────────────────────────────────────────────────────
def _p3_rdd_f(x):
    return 1250 * (1 - math.exp(-(x - 300) / 350)) + 0.1 * x - 150


def _p3_rdd_data(seed, manip):
    r = jsrng(seed); X = []; Y = []
    for _ in range(1000):
        x = 400 + 1200 * r()
        e = jsgauss(r)
        m = r()
        mu = _p3_rdd_f(x)
        if manip and 930 <= x < 1000 and m < 0.6:
            x = 1000 + (x - 930) * 40 / 70
            mu += 80
        if x >= 1000:
            mu += 120
        X.append(x); Y.append(mu * (1 + 0.09 * e))
    return X, Y


def _p3_rdd_side(X, Y, h, right):
    S0 = S1 = S2 = T0 = T1 = 0.0; n = 0
    for i in range(len(X)):
        u = X[i] - 1000
        if (u >= 0) != right or abs(u) >= h:
            continue
        w = 1 - abs(u) / h
        S0 += w; S1 += w * u; S2 += w * u * u; T0 += w * Y[i]; T1 += w * u * Y[i]; n += 1
    det = S0 * S2 - S1 * S1
    b = (S0 * T1 - S1 * T0) / det
    a = (T0 - b * S1) / S0
    B00 = B01 = B11 = 0.0
    for i in range(len(X)):
        u = X[i] - 1000
        if (u >= 0) != right or abs(u) >= h:
            continue
        w = 1 - abs(u) / h
        e = Y[i] - a - b * u
        q = w * w * e * e
        B00 += q; B01 += q * u; B11 += q * u * u
    return a, (S2 * S2 * B00 - 2 * S1 * S2 * B01 + S1 * S1 * B11) / (det * det), n


def _p3_rdd_local(X, Y, h):
    aL, vL, nL = _p3_rdd_side(X, Y, h, False)
    aR, vR, nR = _p3_rdd_side(X, Y, h, True)
    return aR - aL, math.sqrt(vL + vR), nL + nR


def _p3_gsolve(A, b):
    n = len(A); M = [A[i][:] + [b[i]] for i in range(n)]
    for c in range(n):
        p = c
        for i in range(c + 1, n):
            if abs(M[i][c]) > abs(M[p][c]):
                p = i
        M[c], M[p] = M[p], M[c]
        for i in range(n):
            if i != c:
                f = M[i][c] / M[c][c]
                for j in range(c, n + 1):
                    M[i][j] -= f * M[c][j]
    return [M[i][n] / M[i][i] for i in range(n)]


def _p3_rdd_polyside(X, Y, deg, right):
    k = deg + 1
    A = [[0.0] * k for _ in range(k)]; b = [0.0] * k; rows = []
    for i in range(len(X)):
        u = (X[i] - 1000) / 600
        if (u >= 0) != right:
            continue
        p = [1.0]
        for a in range(1, k):
            p.append(p[a - 1] * u)
        rows.append((p, Y[i]))
        for a in range(k):
            b[a] += p[a] * Y[i]
            for c in range(k):
                A[a][c] += p[a] * p[c]
    coef = _p3_gsolve(A, b)
    z0 = _p3_gsolve(A, [1.0] + [0.0] * (k - 1))
    v = 0.0
    for p, y in rows:
        e = y; zp = 0.0
        for a in range(k):
            e -= coef[a] * p[a]; zp += z0[a] * p[a]
        v += e * e * zp * zp
    return coef[0], v


def _p3_rdd_poly(X, Y, deg):
    aL, vL = _p3_rdd_polyside(X, Y, deg, False)
    aR, vR = _p3_rdd_polyside(X, Y, deg, True)
    return aR - aL, math.sqrt(vL + vR)


# ── IV ──────────────────────────────────────────────────────────────────────────
def _p3_iv_rep(seed, pc, excl):
    """Bản chép P3.ivRep, LCG và Box–Muller viết thẳng vào vòng lặp (y hệt jsrng/jsgauss) cho nhanh."""
    s = seed % 4294967296
    n1 = n0 = 0; d1 = d0 = 0; y1 = y0 = 0.0; yD1 = yD0 = 0.0; nD1 = 0
    lg, cs, sq, tp = math.log, math.cos, math.sqrt, 2 * math.pi
    for i in range(2000):
        z = i % 2
        s = (s * 1664525 + 1013904223) % 4294967296; u = s / 4294967296
        a = 0.0
        while a == 0:
            s = (s * 1664525 + 1013904223) % 4294967296; a = s / 4294967296
        c = 0.0
        while c == 0:
            s = (s * 1664525 + 1013904223) % 4294967296; c = s / 4294967296
        e = sq(-2 * lg(a)) * cs(tp * c)
        if u < pc:
            d = z; y = 400 + 20 * d
        elif u < pc + 0.10:
            d = 1; y = 440 + 30
        else:
            d = 0; y = 390
        y += 60 * e
        if excl and z == 1:
            y += 2
        if z:
            n1 += 1; d1 += d; y1 += y
        else:
            n0 += 1; d0 += d; y0 += y
        if d:
            yD1 += y; nD1 += 1
        else:
            yD0 += y
    p1 = d1 / n1; p0 = d0 / n0; ittD = p1 - p0; ittY = y1 / n1 - y0 / n0
    seD = math.sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0)
    return dict(ittD=ittD, ittY=ittY, late=ittY / ittD, F=(ittD / seD) ** 2, naive=yD1 / nD1 - yD0 / (2000 - nD1))


def _p3_quantile(a, q):
    v = sorted(a); k = (len(v) - 1) * q; f = math.floor(k); c = min(f + 1, len(v) - 1)
    return v[f] + (v[c] - v[f]) * (k - f)


def _p3_iv_sim(pc, excl):
    L = [_p3_iv_rep(367 + 7919 * k, pc, excl)['late'] for k in range(100)]
    return L, _p3_quantile(L, 0.05), _p3_quantile(L, 0.95), sum(1 for x in L if x < 0)


# ── uplift ──────────────────────────────────────────────────────────────────────
def _p3_uplift(pP, pS, pD, key):
    N = 10000
    cnt = [N * pP / 100, N * pS / 100, N * (100 - pP - pS - pD) / 100, N * pD / 100]
    f = {'all': [1, 1, 1, 1], 'hist': [0, 1, 0, 1], 'resp': [1, 1, 0, 0], 'upl': [1, 0, 0, 0]}[key]
    msg = orders = coupon = buyers = 0.0
    for g in range(4):
        if not f[g]:
            continue
        msg += cnt[g]
        if g == 0:
            orders += cnt[g]; coupon += cnt[g]; buyers += cnt[g]
        if g == 1:
            coupon += cnt[g]; buyers += cnt[g]
        if g == 3:
            orders -= cnt[g]
    profit = orders * 150 - msg * 1 - coupon * 30
    return dict(msg=msg, orders=orders, coupon=coupon, cost=msg * 1 + coupon * 30, profit=profit,
                resp=buyers / msg if msg else 0.0)


# ── DML ─────────────────────────────────────────────────────────────────────────
def _p3_dml_data():
    r = jsrng(7); A, B, T, Y = [], [], [], []
    for _ in range(3000):
        a = r(); b = r()
        t = 8 + 12 * a * b + 4 * jsgauss(r)
        if t < 0:
            t = 0
        y = 4 * t + 200 + 500 * a * b + 150 * a + 30 * jsgauss(r)
        A.append(a); B.append(b); T.append(t); Y.append(y)
    return A, B, T, Y


def _p3_dml_data_seed(seed):
    """Cùng quy trình với _p3_dml_data, hạt giống tuỳ ý (để đo độ lệch trung bình qua nhiều bộ)."""
    r = jsrng(seed); A, B, T, Y = [], [], [], []
    for _ in range(3000):
        a = r(); b = r()
        t = 8 + 12 * a * b + 4 * jsgauss(r)
        if t < 0:
            t = 0
        A.append(a); B.append(b); T.append(t); Y.append(4 * t + 200 + 500 * a * b + 150 * a + 30 * jsgauss(r))
    return A, B, T, Y


def _p3_m_true(a, b):
    """E[T | X] thật: T = max(0, μ + 4ε), μ = 8 + 12ab → μΦ(μ/4) + 4φ(μ/4)."""
    mu = 8 + 12 * a * b; z = mu / 4
    return mu * Phi(z) + 4 * math.exp(-z * z / 2) / math.sqrt(2 * math.pi)


def _p3_dml_oracle(A, B, T, Y):
    """DML với hàm phụ THẬT (không làm mượt gì): ℓ(X) = E[Y | X] = 4·m(X) + 200 + 500ab + 150a."""
    m = [_p3_m_true(A[i], B[i]) for i in range(len(A))]
    l = [4 * m[i] + 200 + 500 * A[i] * B[i] + 150 * A[i] for i in range(len(A))]
    return sum((T[i] - m[i]) * (Y[i] - l[i]) for i in range(len(T))) / sum((T[i] - m[i]) ** 2 for i in range(len(T)))


def _p3_slope(x, y):
    mx = sum(x) / len(x); my = sum(y) / len(y)
    sxy = sum((x[i] - mx) * (y[i] - my) for i in range(len(x)))
    sxx = sum((x[i] - mx) ** 2 for i in range(len(x)))
    return sxy / sxx


def _p3_resid_lin(v, cols):
    c = ols(cols, v)
    return [v[i] - c[0] - sum(c[j + 1] * cols[j][i] for j in range(len(cols))) for i in range(len(v))]


def _p3_resid_bins(A, B, V, K=10):
    n = len(V); out = [0.0] * n
    for k in range(2):
        s = [0.0] * (K * K); c = [0] * (K * K); tot = 0.0; nt = 0
        for i in range(n):
            if i % 2 == k:
                continue
            cell = min(int(math.floor(A[i] * K)), K - 1) * K + min(int(math.floor(B[i] * K)), K - 1)
            s[cell] += V[i]; c[cell] += 1; tot += V[i]; nt += 1
        for i in range(n):
            if i % 2 != k:
                continue
            cell = min(int(math.floor(A[i] * K)), K - 1) * K + min(int(math.floor(B[i] * K)), K - 1)
            out[i] = V[i] - (s[cell] / c[cell] if c[cell] else tot / nt)
    return out


def _p3_thru0(x, y):
    return sum(x[i] * y[i] for i in range(len(x))) / sum(v * v for v in x)


# ── đường uplift / Qini ─────────────────────────────────────────────────────────
def _p3_qini_data():
    r = jsrng(129); rows = []
    for _ in range(4000):
        u = r(); tt = 1 if r() < 0.5 else 0; zz = jsgauss(r); tb = r()
        typ = 0 if u < 0.2 else (1 if u < 0.5 else (2 if u < 0.9 else 3))
        y = tt if typ == 0 else (1 if typ == 1 else (0 if typ == 2 else 1 - tt))
        rows.append((typ, tt, y, 1 if typ == 0 else (-1 if typ == 3 else 0), zz, tb))
    return rows


def _p3_qini_curve(rows, key, sigma):
    def score(row):
        if key == 'true':
            return row[3] + 1e-6 * row[5]
        if key == 'noisy':
            return row[3] + sigma * row[4] + 1e-9 * row[5]
        if key == 'resp':
            return (1 if row[0] <= 1 else 0) + 1e-6 * row[5]
        return row[5]
    sc = [score(row) for row in rows]
    order = sorted(range(len(rows)), key=lambda i: (-sc[i], i))
    nT = yT = nC = yC = 0; U = [0.0]; Q = [0.0]; step = len(rows) // 100
    for j, i in enumerate(order, 1):
        row = rows[i]
        if row[1]:
            nT += 1; yT += row[2]
        else:
            nC += 1; yC += row[2]
        if j % step == 0:
            U.append((yT / nT - yC / nC) * j if nT and nC else 0.0)
            Q.append(yT - yC * nT / nC if nC else 0.0)
    return U, Q, order


def run_p3():
    # ═════════════ 5.1 DiD ═════════════
    js_mua = _p3_js_array('DID_MUA')
    claim('p3 did: mảng mùa vụ trong JS = bản Python', js_mua == _P3_DID_MUA, f'JS có {js_mua}')
    claim('p3 did: mùa vụ có trung bình 0 ở cả hai nửa (điều kiện để bảng 2×2 ra số tròn)',
          sum(_P3_DID_MUA[:6]) == 0 and sum(_P3_DID_MUA[6:]) == 0)
    need('p3 did: dòng JS dựng A0 còn nguyên',
         "var a0 = 412 + (3 + delta) * (t - 2.5) + P3.DID_MUA[t] + (shock && post ? 12 : 0);")
    need('p3 did: dòng JS dựng B còn nguyên', 'var b = 380 + 3 * (t - 2.5) + P3.DID_MUA[t];')
    d0 = _p3_did(25, 0, 0)
    aPre, aPost, bPre, bPost = d0['aPre'], d0['aPost'], d0['bPre'], d0['bPost']
    claim('p3 did: trung bình các ô là số nguyên như bảng',
          all(abs(v - round(v)) < 1e-9 for v in (aPre, aPost, bPre, bPost)))
    aPre, aPost, bPre, bPost = (int(round(v)) for v in (aPre, aPost, bPre, bPost))
    need('p3 did: hàng A của bảng 2×2', f'<td>{aPre}</td><td>{aPost}</td><td>+{aPost - aPre}</td>')
    need('p3 did: hàng B của bảng 2×2', f'<td>{bPre}</td><td>{bPost}</td><td>+{bPost - bPre}</td>')
    did = (aPost - aPre) - (bPost - bPre)
    need('p3 did: hàng A − B của bảng 2×2', f'<td>{aPre - bPre}</td><td>{aPost - bPost}</td><td><b>+{did} = DiD</b></td>')
    need('p3 did: hai chiều trừ ra cùng một số',
         f'({aPost} − {aPre}) − ({bPost} − {bPre}) = ({aPost} − {bPost}) − ({aPre} − {bPre}) = {did}')
    claim('p3 did: hai chiều trừ bằng nhau', (aPost - aPre) - (bPost - bPre) == (aPost - bPost) - (aPre - bPre) == 25)
    need('p3 did: lede 43 − 18', f'Khoảng <b>{did} triệu</b>')
    need('p3 did: fx 43 − 18 = 25', f'= {aPost - aPre} − {bPost - bPre} = {did}</p>')
    # hồi quy bão hoà trên 4 ô → β₀…β₃
    Acol = [0, 0, 1, 1]; Pcol = [0, 1, 0, 1]; AP = [a * p for a, p in zip(Acol, Pcol)]
    beta = ols([Acol, Pcol, AP], [bPre, bPost, aPre, aPost])
    bt = [int(round(x)) for x in beta]
    claim('p3 did: hồi quy trên bảng 2×2 ra đúng β', all(abs(beta[i] - bt[i]) < 1e-9 for i in range(4)), f'{beta}')
    need('p3 did: β₀…β₃ trong fx__note',
         f'β₀ = {bt[0]} (vùng B trước), β₁ = {bt[1]} (khoảng cách có sẵn), β₂ = {bt[2]} (mức tăng chung), β₃ = {bt[3]} (phần chỉ vùng A sau mới có)')
    # luật của mô hình: DiD = τ + 6δ + 12·[cú sốc], độ dốc trước = δ
    ok = True
    for tau in (-10, 0, 25, 40):
        for dl in (-3, -1.5, 0, 0.5, 1, 3):
            for sh in (0, 1):
                r_ = _p3_did(tau, dl, sh)
                ok = ok and abs(r_['est'] - (tau + 6 * dl + 12 * sh)) < 1e-9 and abs(r_['preSlope'] - dl) < 1e-9
    claim('p3 did: DiD = τ + 6δ + 12·sốc và dốc trước = δ ở mọi vị trí thử', ok)
    mpost = sum(range(6, 12)) / 6 - sum(range(6)) / 6
    claim('p3 did: trung bình tháng "sau" cách tháng "trước" đúng 6', abs(mpost - 6) < 1e-12)
    r1 = _p3_did(25, 1, 0); r2 = _p3_did(25, 0, 1)
    need('p3 did: gợi ý δ = +1 → 31', f'DiD thành <b>{vi(r1["est"], 0)}</b> — lệch {vi(r1["est"] - 25, 0)} = 6 × 1')
    need('p3 did: gợi ý cú sốc → 37', f'mà DiD thành <b>{vi(r2["est"], 0)}</b>')
    claim('p3 did: cú sốc không để lại dấu vết ở các tháng trước', all(abs(g) < 1e-9 for g in r2['gap'][:6]))
    claim('p3 did: δ = +1 làm các chấm trước nghiêng', abs(r1['preSlope'] - 1) < 1e-12 and abs(r1['gap'][5] - r1['gap'][0] - 5) < 1e-9)
    need('p3 did: "lệch 12 triệu" khi có cú sốc', 'DiD lệch 12 triệu, xu hướng trước vẫn hoàn hảo')
    claim('p3 did: đường "song song với B" trùng A0 khi δ = 0 và không sốc',
          all(abs(d0['B'][t] + (d0['aPre'] - d0['bPre']) - d0['A0'][t]) < 1e-9 for t in range(12)))
    need('p3 did: readout mặc định', 'id="m-did-est">25,0<')
    need('p3 did: ví von 4 − 1,5', '4 − 1,5 = 2,5 kg')
    # câu tự kiểm
    q = (330 - 300) - (265 - 250)
    need('p3 did: câu tự kiểm', f'(330 − 300) − (265 − 250) = 30 − 15 = <b>{q}</b>')
    need('p3 did: câu tự kiểm, phần xu hướng', f'1 × 6 = <b>{1 * 6}</b> triệu, nên phần có thể quy cho tính năng chỉ còn khoảng {q} − 6 = <b>{q - 6}</b>')
    # code SE theo cụm + BDM (số in ra khi chạy code, ghi ở p3_notes)
    for sx in ('# in ra: DiD = 24.59', '#        SE thường   = 1.08', '#        SE theo cụm = 2.04'):
        need('p3 did: dòng "# in ra" của code', sx)
    need('p3 did: văn trích đúng số in ra', 'Cùng một hệ số <b>24,59</b>, hai lời hứa về độ chắc chắn khác nhau gần gấp đôi: SE thường 1,08, SE theo cụm 2,04.')
    claim('p3 did: "gần gấp đôi"', 1.7 < 2.04 / 1.08 < 2.0, f'{2.04 / 1.08:.2f}')
    # cú sốc vùng-tháng: mô phỏng ngoài trang (work-p3/fix/did_region_shock.py, 200 bộ mỗi mức, ghi ở p3_notes)
    need('p3 did: độ phủ khi mỗi vùng có cú sốc riêng', 'chỉ còn chứa 25 ở <b>87%</b> số lần; cú sốc 4 triệu thì còn <b>73,5%</b>')
    sd_e = 8 / math.sqrt(1 - 0.8 ** 2)
    claim('p3 did: "độ dao động khoảng 13 triệu" = độ lệch chuẩn dừng của nhiễu AR(1) 8/√(1 − 0,8²)', 12.5 < sd_e < 14, f'{sd_e:.2f}')
    need('p3 did: câu so với độ dao động', 'nhỏ hơn hẳn độ dao động theo tháng, khoảng 13 triệu, của một cửa hàng')
    need('p3 did: luật cụm theo cấp được gán', 'cụm phải ở cấp <b>được gán can thiệp</b>')
    need('p3 did: dẫn về cả 3.4 và 3.5', 'cùng bệnh với <a href="#s-interfere">mục 3.4</a>–<a href="#s-units">3.5</a>')
    need('p3 did: phủ 67% / 96%', 'chứa giá trị thật 25 chỉ ở <b>67%</b> số lần, dựng từ SE theo cụm là <b>96%</b>')
    need('p3 did: BDM 45%', 'với tới <b>45%</b> số luật giả')
    # TWFE so le: đợt 1 bật T3, đợt 2 bật T5, nhóm C chưa bật; tác động 5 + 10k
    grow = lambda k: 5 + 10 * k
    Y, D, eff = _p3_stagger([3, 5, None], grow)
    rows = ['Đợt 1 · bật từ T3', 'Đợt 2 · bật từ T5', 'Nhóm C · chưa bật']
    for g in range(3):
        cells = ''.join(f'<td><b>{int(Y[g][t])}</b></td>' if D[g][t] else f'<td>{int(Y[g][t])}</td>' for t in range(6))
        need(f'p3 did/TWFE: hàng {rows[g]}', f'<tr><td>{rows[g]}</td>{cells}</tr>')
    truth = sum(eff) / len(eff)
    need('p3 did/TWFE: tác động thật trung bình', f'(5 + 15 + 25 + 35 + 5 + 15) / 6 = <b>{vi(truth, 1)}</b>')
    claim('p3 did/TWFE: sáu ô đã bật đúng 5, 15, 25, 35, 5, 15', sorted(eff) == sorted([5, 15, 25, 35, 5, 15]))
    tw = _p3_twfe(Y, D)
    need('p3 did/TWFE: TWFE ra 10,0', f'TWFE ra <b>{vi(tw, 1)}</b>')
    late_ch = (sum(Y[1][4:6]) / 2 - sum(Y[1][2:4]) / 2)
    early_ch = (sum(Y[0][4:6]) / 2 - sum(Y[0][2:4]) / 2)
    need('p3 did/TWFE: phép so cấm', f'Đợt 2 tăng {vi(late_ch, 0)}. Đợt 1 tăng {vi(early_ch, 0)}')
    need('p3 did/TWFE: phép so cấm ra −10', f'{vi(late_ch, 0)} − {vi(early_ch, 0)} = <b>{vi(late_ch - early_ch, 0)}</b>')
    Y2, D2, _ = _p3_stagger([3, 5], grow)
    tw2 = _p3_twfe(Y2, D2)
    claim('p3 did/TWFE: bỏ nhóm C → TWFE ra 0', abs(tw2) < 1e-9, f'ra {tw2}')
    need('p3 did/TWFE: câu "ra 0"', 'TWFE trên đúng bảng này ra <b>0</b>')
    Y3, D3, _ = _p3_stagger([3, 5, None], lambda k: 20.0)
    claim('p3 did/TWFE: tác động không đổi 20 → TWFE ra đúng 20', abs(_p3_twfe(Y3, D3) - 20) < 1e-9)
    att16 = (Y[0][5] - Y[0][1]) - (Y[2][5] - Y[2][1])
    need('p3 did/C&S: ATT(đợt 1, T6)', f'ATT(đợt 1, T6) = ({int(Y[0][5])} − {int(Y[0][1])}) − ({int(Y[2][5])} − {int(Y[2][1])}) = <b>{int(att16)}</b>')
    cs = []
    for g, st in ((0, 3), (1, 5)):
        for t in range(st - 1, 6):
            cs.append((Y[g][t] - Y[g][st - 2]) - (Y[2][t] - Y[2][st - 2]))
    claim('p3 did/C&S: sáu ô ATT(g,t) so với nhóm chưa bật lấy lại đúng tác động', sorted(cs) == sorted(eff))
    claim('p3 did/C&S: gộp sáu ô ra 16,7', vi(sum(cs) / len(cs), 1) == '16,7')

    # ═════════════ 5.2 đối chứng tổng hợp ═════════════
    claim('p3 synth: mùa vụ trong JS = bản Python', _p3_js_array('SY_MUA') == _P3_SY_MUA)
    claim('p3 synth: nền và độ dốc trong JS = bản Python',
          _p3_js_array('SY_NEN') == _P3_SY_NEN and _p3_js_array('SY_DOC') == _P3_SY_DOC)
    need('p3 synth: dòng JS dựng P còn nguyên',
         'var v = 0.5 * D[0][t] + 0.3 * D[1][t] + 0.2 * D[2][t] + 0 * D[3][t] + 2 * gauss(r);')
    need('p3 synth: số bước gradient', 'P3.SY_ITERS = 600;')
    need('p3 synth: hạt giống của dữ liệu', 'var r = rng(2164), D = [], k, t;')
    need('p3 synth: dòng JS dựng thành phố hiến',
         'row.push(P3.SY_NEN[k] + P3.SY_DOC[k] * t + P3.SY_MUA[k][t % 12] + 3 * gauss(r));')
    need('p3 synth: tác động thật +15 từ tháng 19 trong JS', 'P.push(v + (t >= 18 ? 15 : 0));')
    need('p3 synth: bước gradient chiếu', 'u.push(w[j] - g[j] / L);')
    need('p3 synth: hoạt ảnh = 30 khung × SY_ITERS/30 bước', 'P3.synthStep(dat.D, dat.P, w, P3.SY_ITERS / 30)')
    need('p3 synth: hoạt ảnh đủ 30 khung', 'if (++frame < 30) requestAnimationFrame(step);')
    D, P0, P = _p3_synth_data()
    ex = _p3_synth_exact(D, P)
    starts = [[0.25] * 4, [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [0.1, 0.2, 0.3, 0.4],
              [0.5, 0.5, 0, 0], [0, 0, 0.5, 0.5]]
    worst = 0.0; wfit = None
    for w0 in starts:
        w = _p3_synth_step(D, P, w0, 600)
        worst = max(worst, max(abs(w[j] - ex[j]) for j in range(4)))
        if w0 == [0.25] * 4:
            wfit = w
    claim('p3 synth: gradient chiếu 600 bước về đúng nghiệm chính xác từ mọi điểm xuất phát', worst < 1e-6, f'lệch {worst:.2e}')
    # 20 khung × 30 bước = 600 bước y hệt, nên hoạt ảnh cũng về đúng chỗ ấy
    w = [0.25] * 4
    for _ in range(30):
        w = _p3_synth_step(D, P, w, 20)
    claim('p3 synth: 30 khung × 20 bước = đúng nghiệm', max(abs(w[j] - ex[j]) for j in range(4)) < 1e-6)
    wr = ' / '.join(vi(x, 2) for x in ex)
    need('p3 synth: trọng số tìm được trong gợi ý', f'máy đi dần tới {wr}')
    claim('p3 synth: trọng số tìm được gần 0,5/0,3/0,2/0 (như lab__f nói)', wr == '0,50 / 0,30 / 0,20 / 0,00', wr)
    S = _p3_curve(D, ex); Se = _p3_curve(D, [0.25] * 4)
    pre, gap = _p3_rmspe(P, S, 0, 18), _p3_meangap(P, S, 18, 24)
    epre, egap = _p3_rmspe(P, Se, 0, 18), _p3_meangap(P, Se, 18, 24)
    num('p3 synth: lede RMSPE trước', pre, 2, 'lệch điển hình <b>')
    num('p3 synth: lede khoảng hở sau', gap, 2, 'trung bình <b>')
    num('p3 synth: gợi ý RMSPE trước', pre, 2, 'RMSPE trước ')
    need('p3 synth: gợi ý khoảng hở', f'khoảng hở {vi(gap, 2)}. Chuyển sang')
    num('p3 synth: chia đều — RMSPE trước', epre, 2, 'lệch điển hình <b>')
    # A3: so MỨC với trung bình cộng khác DiD với chính nhóm ấy
    gp = [P[t] - Se[t] for t in range(24)]
    g_pre, g_post = sum(gp[:18]) / 18, sum(gp[18:]) / 6
    num('p3 synth: P cao hơn trung bình cộng ngay từ trước', g_pre, 2, 'đông khách hơn trung bình ấy <b>')
    num('p3 synth: DiD với chính nhóm chia đều', g_post - g_pre, 2, 'trừ được khoảng cách có sẵn và ra <b>')
    claim('p3 synth: so mức = DiD + khoảng cách có sẵn', abs(egap - ((g_post - g_pre) + g_pre)) < 1e-9)
    claim('p3 synth: DiD chia đều gần 15, so mức thì không', abs(g_post - g_pre - 15) < 1.5 and abs(egap - 15) > 5, f'{g_post - g_pre:.3f}')
    claim('p3 synth: RMSPE chia đều² = TB² + phương sai khoảng hở trước',
          abs(epre ** 2 - (g_pre ** 2 + sum((x - g_pre) ** 2 for x in gp[:18]) / 18)) < 1e-9)
    need('p3 synth: khoảng hở trước chạy từ … tới', f'chạy từ {vi(min(gp[:18]), 1)} tới {vi(max(gp[:18]), 1)} đơn/ngày tuỳ tháng')
    num('p3 synth: DiD với 3 tháng gần nhất làm "trước"', g_post - sum(gp[15:18]) / 3, 2, 'thì DiD còn ')
    num('p3 synth: chia đều — khoảng hở', egap, 2, 'cho &ldquo;tác động&rdquo; <b>')
    claim('p3 synth: chia đều sai hơn 60%', (egap - 15) / 15 > 0.60, f'{(egap - 15) / 15:.3f}')
    need('p3 synth: readout mặc định RMSPE', f'id="m-synth-pre">{vi(epre, 2)}<')
    need('p3 synth: readout mặc định khoảng hở', f'id="m-synth-gap">+{vi(egap, 2)}<')
    claim('p3 synth: tác động thật đúng +15 mọi tháng sau', all(abs(P[t] - P0[t] - 15) < 1e-9 for t in range(18, 24)))
    # placebo trong không gian
    ratios = []
    for k in range(4):
        others = [D[j] for j in range(4) if j != k]
        wk = _p3_synth_step(others, D[k], [1 / 3] * 3, 600)
        Sk = _p3_curve(others, wk)
        ratios.append(_p3_rmspe(D[k], Sk, 18, 24) / _p3_rmspe(D[k], Sk, 0, 18))
    rP = _p3_rmspe(P, S, 18, 24) / pre
    rank = 1 + sum(1 for x in ratios if x >= rP)
    num('p3 synth: tỉ số của P', rP, 1, 'P có tỉ số <b>')
    need('p3 synth: dải tỉ số placebo', f'chỉ từ {vi(min(ratios), 2)} tới {vi(max(ratios), 2)}')
    claim('p3 synth: P đứng đầu trong 5', rank == 1, f'hạng {rank}')
    need('p3 synth: p = 1/5', 'nên p = 1/5 = <b>0,2</b>')
    # A8: biến thể của Abadie (2021) — cho cả P vào kho của lần giả; giải bằng nghiệm chính xác (KKT)
    rat_P = []
    for k in range(4):
        donors = [D[j] for j in range(4) if j != k] + [P]
        wk = _p3_synth_exact(donors, D[k])
        Sk = _p3_curve(donors, wk)
        rat_P.append(_p3_rmspe(D[k], Sk, 18, 24) / _p3_rmspe(D[k], Sk, 0, 18))
    need('p3 synth: dải tỉ số khi cho P vào kho', f'cho cả P vào kho thì từ {vi(min(rat_P), 2)} tới {vi(max(rat_P), 2)} — P vẫn đứng đầu')
    claim('p3 synth: cho P vào kho, P vẫn đứng đầu', all(x < rP for x in rat_P), f'{[round(x, 3) for x in rat_P]}')
    need('p3 synth: nói rõ trang bỏ P khỏi kho', 'Ở đây ta bỏ P ra khỏi kho của các lần giả')
    need('p3 synth: nhãn p không bị viết hoa', '<div class="k"><span class="lc">p</span> placebo</div>')
    claim('p3 synth: cần ít nhất 19 đơn vị hiến cho p ≤ 0,05', 1 / (19 + 1) <= 0.05 < 1 / (18 + 1))
    need('p3 synth: câu 19 đơn vị', 'cần ít nhất <b>19</b> thành phố hiến')
    reS = _p3_rmspe(P, Se, 18, 24) / epre
    rankE = 1 + sum(1 for x in ratios if x >= reS)
    need('p3 synth: readout mặc định tỉ số', f'id="m-synth-ratio">{vi(reS, 1)}<')
    need('p3 synth: readout mặc định p', f'id="m-synth-p">{rankE}/5 = {vi(rankE / 5, 1)}<')
    s20 = 0.5 * 230 + 0.3 * 190 + 0.2 * 250
    need('p3 synth: câu tự kiểm', f'0,5 × 230 + 0,3 × 190 + 0,2 × 250 = 115 + 57 + 50 = <b>{vi(s20, 0)}</b>')
    need('p3 synth: câu tự kiểm, tác động', f'232 − {vi(s20, 0)} = <b>{vi(232 - s20, 0)}</b>')
    need('p3 synth: dòng "# in ra" của code', '# in ra: trọng số: [0.49 0.26 0.22 0.02]')
    need('p3 synth: dòng "# in ra" của code (2)', '#        RMSPE trước = 1.94, khoảng hở sau = 14.42')
    need('p3 synth: văn trích đúng số in ra', 'Trọng số ra 0,49 / 0,26 / 0,22 / 0,02, RMSPE trước 1,94, khoảng hở sau 14,42.')

    # ═════════════ 5.3 RDD ═════════════
    need('p3 rdd: hàm f trong JS', 'P3.rddF = function (x) { return 1250 * (1 - Math.exp(-(x - 300) / 350)) + 0.1 * x - 150; };')
    need('p3 rdd: trọng số tam giác trong JS', 'w = 1 - Math.abs(u) / h;')
    need('p3 rdd: nhiễu tỉ lệ trong JS', 'Y.push(mu * (1 + 0.09 * e));')
    need('p3 rdd: hạt giống mẫu gốc', 'P3.rddSeed = function (k) { return 13 + 7919 * k; };')
    need('p3 rdd: biến chạy đều trên 400…1.600', 'var x = 400 + 1200 * r();')
    need('p3 rdd: bước nhảy 120 trong JS', 'if (x >= 1000) mu += 120;')
    need('p3 rdd: người lách luật trong JS',
         'if (manip && x >= 930 && x < 1000 && m < 0.6) { x = 1000 + (x - 930) * 40 / 70; mu += 80; mv = true; }')
    X, Yr = _p3_rdd_data(13, False)
    e2, s2, n2 = _p3_rdd_local(X, Yr, 200)
    e6, s6, n6 = _p3_rdd_local(X, Yr, 600)
    e05, s05, n05 = _p3_rdd_local(X, Yr, 50)
    ci = lambda e, s: f'{vi(e - 1.96 * s, 0)} … {vi(e + 1.96 * s, 0)}'
    need('p3 rdd: gợi ý mặc định', f'cửa sổ ± 200 nghìn ({n2} khách): bước nhảy <b>+{vi(e2, 1)}</b>, KTC 95% {ci(e2, s2)}')
    claim('p3 rdd: KTC mặc định chứa 120', e2 - 1.96 * s2 <= 120 <= e2 + 1.96 * s2)
    need('p3 rdd: h = 600 trượt', f'KTC hẹp lại còn <b>{ci(e6, s6)}</b>')
    claim('p3 rdd: h = 600 KTC không chứa 120 và hẹp hơn h = 200', e6 + 1.96 * s6 < 120 and s6 < s2)
    claim('p3 rdd: h = 600 dùng cả 1.000 khách', n6 == 1000)
    need('p3 rdd: h = 50', f'Kéo xuống 50: còn {n05} khách, KTC {ci(e05, s05)}')
    need('p3 rdd: readout mặc định', f'id="m-rdd-est">+{vi(e2, 1)}<')
    need('p3 rdd: readout KTC mặc định', f'id="m-rdd-ci">{ci(e2, s2)}<')
    need('p3 rdd: readout số khách', f'id="m-rdd-n">{n2}<')
    vip = [y for x, y in zip(X, Yr) if x >= 1000]; thuong = [y for x, y in zip(X, Yr) if x < 1000]
    raw = sum(vip) / len(vip) - sum(thuong) / len(thuong)
    need('p3 rdd: chênh lệch thô VIP − thường', f'khách VIP quý sau chi hơn khách thường <b>{vi(raw, 0)}</b> nghìn ₫, mà tấm thẻ chỉ góp 120')
    claim('p3 rdd: "phần lớn là vì vốn chi nhiều" — thẻ góp chưa tới một nửa chênh lệch thô', 120 < raw / 2)
    polys = [_p3_rdd_poly(X, Yr, d) for d in range(1, 8)]
    need('p3 rdd: dãy ước lượng theo bậc', ' → '.join(vi(p[0], 1) for p in polys))
    w6, w2 = 2 * 1.96 * polys[5][1], 2 * 1.96 * s2
    need('p3 rdd: bề rộng KTC bậc 6 và tuyến tính cục bộ', f'rộng <b>{vi(w6, 0)}</b> nghìn, gần gấp đôi <b>{vi(w2, 0)}</b> nghìn')
    claim('p3 rdd: "gần gấp đôi"', 1.7 < w6 / w2 < 2.0, f'tỉ số {w6 / w2:.2f}')
    Xm, Ym = _p3_rdd_data(13, True)
    em, _, _ = _p3_rdd_local(Xm, Ym, 200)
    need('p3 rdd: lách luật → 158,3', f'ước lượng thành {vi(em, 1)}')
    bins = [0] * 48
    for x in Xm:
        bins[min(47, int((x - 400) // 25))] += 1
    avg = 1000 / 48
    claim('p3 rdd: lách luật → cột ngay trên vạch cao vọt, cột ngay dưới trũng',
          bins[24] > 1.8 * avg and bins[25] > 1.5 * avg and bins[23] < 0.6 * avg, f'{bins[21:27]}')
    moved = [i for i in range(1000) if X[i] != Xm[i]]
    claim('p3 rdd: bật lách luật chỉ đổi đúng những khách lách (ai khác giữ nguyên cả x lẫn y)',
          all(930 <= X[i] < 1000 for i in moved)
          and all(X[i] == Xm[i] and Yr[i] == Ym[i] for i in range(1000) if i not in set(moved))
          and len(moved) > 0, f'{len(moved)} khách lách')
    # chệch theo cửa sổ, đo trên đường trung bình không nhiễu (lưới dày)
    gx = [400 + 0.5 * i for i in range(2400)]
    gy = [_p3_rdd_f(x) + (120 if x >= 1000 else 0) for x in gx]
    b100 = _p3_rdd_local(gx, gy, 100)[0] - 120
    b600 = _p3_rdd_local(gx, gy, 600)[0] - 120
    claim('p3 rdd: cửa sổ hẹp gần như không chệch, cửa sổ rộng chệch rõ', abs(b100) < 1 and b600 < -25, f'{b100:.2f} / {b600:.2f}')
    need('p3 rdd: câu tự kiểm', f'72 / 0,6 = <b>{vi(72 / 0.6, 0)}</b> nghìn ₫')
    for sx in ('# in ra: h = 100: bước nhảy 120.3 ± 48.2 (n = 157)', '#        h = 200: bước nhảy 125.2 ± 39.6 (n = 331)',
               '#        h = 600: bước nhảy 80.1 ± 26.0 (n = 1000)'):
        need('p3 rdd: dòng "# in ra" của code', sx)
    need('p3 rdd: văn trích đúng số in ra', 'Ba cửa sổ ra 120,3 ± 48,2 (157 khách), 125,2 ± 39,6 (331 khách) và 80,1 ± 26,0 (cả 1.000 khách).')
    need('p3 rdd: RDD mờ viết theo T', '(bước nhảy của P(T = 1 | X))')
    need('p3 rdd: X và c được gọi tên', 'Ở mục này X là biến chạy (chi tiêu quý này), c là vạch 1.000.000 ₫')
    need('p3 rdd: rddensity đúng tác giả', 'Gói <span class="mono">rddensity</span> (Cattaneo, Jansson và Ma) làm một bản mới hơn của phép kiểm này.')
    claim('p3 rdd: code — cửa sổ rộng nhất trượt 120', 80.1 + 26.0 < 120 and 125.2 - 39.6 < 120 < 125.2 + 39.6)

    # ═════════════ 5.4 IV ═════════════
    need('p3 iv: loại "luôn bật" trong JS', "else if (u < pc + 0.10) { d = 1; y = 440 + 30; }")
    need('p3 iv: loại "tuân thủ" trong JS', 'if (u < pc) { d = z; y = 400 + 20 * d; }')
    need('p3 iv: vi phạm loại trừ trong JS', 'if (excl && z === 1) y += 2;')
    need('p3 iv: 100 lần làm lại', 'P3.IV_R = 100;')
    need('p3 iv: 2.000 cửa hàng, thư theo chẵn/lẻ', "for (var i = 0; i < 2000; i++) {\n    var z = i % 2, u = r(), e = gauss(r), d, y;")
    need('p3 iv: hạt giống', 'P3.ivSeed = function (k) { return 367 + 7919 * k; };')
    need('p3 iv: ngưỡng 104,7 trong câu gợi ý JS', 'else if (one.F <= 104.7) say')
    a40 = _p3_iv_rep(367, 0.40, False); a05 = _p3_iv_rep(367, 0.05, False)
    L40, p5a, p95a, ng40 = _p3_iv_sim(0.40, False)
    L05, p5b, p95b, ng05 = _p3_iv_sim(0.05, False)
    need('p3 iv: gợi ý mặc định',
         f'bước một {vi(a40["ittD"], 3)} ({vi(a40["ittD"] * 100, 1)} điểm %), ITT doanh thu +{vi(a40["ittY"], 2)}, LATE <b>{vi(a40["late"], 2)}</b>, F bước một {vi(a40["F"], 1)}')
    need('p3 iv: dải 90% ở 40%', f'90% số lần cho LATE trong <b>{vi(p5a, 0)} … {vi(p95a, 0)}</b>')
    need('p3 iv: F ở 5%', f'F còn <b>{vi(a05["F"], 1)}</b>')
    claim('p3 iv: ở 5%, F vẫn > 10', a05['F'] > 10)
    need('p3 iv: dải 90% ở 5%', f'trải từ <b>{vi(p5b, 0)} tới {vi(p95b, 0)}</b>, và {ng05} lần trong 100 ra sai dấu')
    for idv, val in (('m-iv-d', vi(a40['ittD'], 3)), ('m-iv-y', '+' + vi(a40['ittY'], 2)), ('m-iv-late', vi(a40['late'], 2)),
                     ('m-iv-f', vi(a40['F'], 1)), ('m-iv-band', f'{vi(p5a, 0)} … {vi(p95a, 0)}'), ('m-iv-neg', f'{ng40}/100')):
        need(f'p3 iv: readout mặc định {idv}', f'id="{idv}">{val}<')
    e40 = _p3_iv_rep(367, 0.40, True); e05 = _p3_iv_rep(367, 0.05, True)
    claim('p3 iv: vi phạm loại trừ lệch đúng 2 / bước một',
          abs((e40['late'] - a40['late']) - 2 / a40['ittD']) < 1e-9 and abs((e05['late'] - a05['late']) - 2 / a05['ittD']) < 1e-9)
    need('p3 iv: gợi ý loại trừ (có mốc không mẹo)',
         f'ở 40%, LATE từ {vi(a40["late"], 2)} lên {vi(e40["late"], 2)} (thêm 2 / {vi(a40["ittD"], 3)} ≈ {vi(2 / a40["ittD"], 0)}); '
         f'ở 5%, từ {vi(a05["late"], 2)} lên {vi(e05["late"], 2)} (thêm 2 / {vi(a05["ittD"], 3)} ≈ {vi(2 / a05["ittD"], 0)})')
    claim('p3 iv: ở 5%, không kèm mẹo, LATE đã lệch xa 20 (bước một yếu)', abs(a05['late'] - 20) > 10, f'{a05["late"]:.2f}')
    need('p3 iv: 2 / 0,397', f'2 / {vi(a40["ittD"], 3)} ≈ <b>{vi(2 / a40["ittD"], 0)}</b> triệu lệch')
    need('p3 iv: 2 / 0,055', f'2 / {vi(a05["ittD"], 3)} ≈ <b>{vi(2 / a05["ittD"], 0)}</b> triệu')
    claim('p3 iv: lede — 40% tuân thủ × tác động 20 = ITT 8', abs(0.40 * 20 - 8) < 1e-12)
    need('p3 iv: lede 8 / 0,40', '8 / 0,40 = <b>20 triệu</b>')
    need('p3 iv: phóng to 8 lần', 'bị phóng to 8 lần')
    claim('p3 iv: 0,40 / 0,05 = 8', abs(0.40 / 0.05 - 8) < 1e-12)
    need('p3 iv: fx', f'= {vi(a40["ittY"], 2)} / {vi(a40["ittD"], 3)} ≈ {vi(a40["late"], 2)}</p>')
    claim('p3 iv: fx làm bằng số đã làm tròn cũng ra 20,05',
          vi(round(a40['ittY'], 2) / round(a40['ittD'], 3), 2) == vi(a40['late'], 2))
    claim('p3 iv: so ngây thơ lệch lên (chủ rành công nghệ tự bật)', a40['naive'] > 2 * a40['late'])
    need('p3 iv: câu hỏi mở đầu — chênh lệch ngây thơ', f'có doanh thu cao hơn khoảng {vi(a40["naive"], 0)} triệu')
    # mức nội sinh của thí nghiệm mặc định: tương quan giữa phần dư bước hai và bước một
    _s = 367; Zs, Ds, Ys = [], [], []
    for i in range(2000):
        z = i % 2
        _s = (_s * 1664525 + 1013904223) % 4294967296; uu = _s / 4294967296
        aa = 0.0
        while aa == 0:
            _s = (_s * 1664525 + 1013904223) % 4294967296; aa = _s / 4294967296
        cc = 0.0
        while cc == 0:
            _s = (_s * 1664525 + 1013904223) % 4294967296; cc = _s / 4294967296
        ee = math.sqrt(-2 * math.log(aa)) * math.cos(2 * math.pi * cc)
        if uu < 0.40:
            dd = z; yy = 400 + 20 * dd
        elif uu < 0.50:
            dd = 1; yy = 470
        else:
            dd = 0; yy = 390
        Zs.append(z); Ds.append(dd); Ys.append(yy + 60 * ee)
    zb, db, yb = mean(Zs), mean(Ds), mean(Ys)
    b2 = cov(Zs, Ys) / cov(Zs, Ds); p1 = cov(Zs, Ds) / var(Zs)
    uu2 = [Ys[i] - (yb - b2 * db) - b2 * Ds[i] for i in range(2000)]
    vv1 = [Ds[i] - (db - p1 * zb) - p1 * Zs[i] for i in range(2000)]
    rho = cov(uu2, vv1) / math.sqrt(var(uu2) * var(vv1))
    claim('p3 iv: mức nội sinh "khoảng 0,2"', 0.1 < rho < 0.3, f'ρ = {rho:.3f}')
    claim('p3 iv: Wald của thí nghiệm mặc định = hệ số 2SLS', abs(b2 - a40['late']) < 1e-9)
    need('p3 iv: câu về mức nội sinh', 'tương quan giữa phần dư của hai bước chỉ khoảng 0,2')
    claim('p3 iv: độ vung phình ra khi bước một yếu', (p95b - p5b) > 5 * (p95a - p5a))
    need('p3 iv: Lee và cộng sự', 'F bước một phải vượt khoảng <b>104,7</b>')
    need('p3 iv: 3,43', 'nâng ngưỡng |t| từ 1,96 lên <b>3,43</b>')
    need('p3 iv: F > 10 bị siết, không phải nới', 'và nay bị xem là quá lỏng')
    claim('p3 iv: không còn "nay đã bị nới"', 'nay đã bị nới' not in HTML)
    need('p3 iv: tF nới rộng sai số chuẩn', 'thủ tục tF: nới rộng sai số chuẩn theo F')
    need('p3 iv: công thức Wald có ngoặc', 'LATE = (<span class="tm"')
    need('p3 iv: D là T của các mục trước', 'Việc bật là D — sách về IV quen gọi thế; chính là T của các mục trước.')
    need('p3 iv: Mang theo — ITT của việc áp dụng', 'LATE = ITT kết quả / ITT của việc áp dụng,')
    need('p3 iv: câu tự kiểm', 'Bước một = 0,45 − 0,15 = <b>0,30</b>; ITT = 418 − 412 = <b>6</b> triệu; LATE = 6 / 0,30 = <b>20</b> triệu')
    claim('p3 iv: câu tự kiểm tính đúng', abs((418 - 412) / (0.45 - 0.15) - 20) < 1e-9)
    for sx in ('# in ra: ITT doanh thu = 8.19, bước một = 0.407, Wald = 20.13', '#        So ngây thơ (bật − không bật) = 48.11',
               '#        F bước một = 487.9', '#        2SLS: LATE = 20.13, SE = 7.01'):
        need('p3 iv: dòng "# in ra" của code', sx)
    need('p3 iv: văn trích đúng số in ra', 'ITT doanh thu 8,19, bước một 0,407, nên Wald = 20,13; 2SLS cũng ra 20,13 (SE 7,01)')
    need('p3 iv: văn trích F và chênh lệch ngây thơ', 'F bước một 487,9. Chênh lệch ngây thơ giữa cửa hàng bật và không bật là 48,11 — lệch hơn gấp đôi.')
    claim('p3 iv: code — "lệch hơn gấp đôi"', 48.11 > 2 * 20.13)
    claim('p3 iv: code — Wald ≈ 8,19 / 0,407', abs(8.19 / 0.407 - 20.13) < 0.03)

    # ═════════════ 6.1 tác động không đều ═════════════
    seg = [(0.2, 8, 14), (0.5, 30, 32), (0.3, 25, 22)]
    base = sum(w * a for w, a, b in seg); treat = sum(w * b for w, a, b in seg)
    need('p3 hte: dòng cả tập', f'<td>Cả tập</td><td>100%</td><td>{vi(base, 1)}%</td><td>{vi(treat, 1)}%</td><td>+{vi(treat - base, 1)} điểm %</td>')
    ate = sum(w * (b - a) for w, a, b in seg)
    need('p3 hte: tổng có trọng số', f'0,2 × 6 + 0,5 × 2 + 0,3 × (−3) = 1,2 + 1,0 − 0,9 = <b>+{vi(ate, 1)}</b>')
    claim('p3 hte: tổng có trọng số = hiệu hai tỉ lệ cả tập', abs(ate - (treat - base)) < 1e-9)
    need('p3 hte: nhắn tất cả', f'nhắn tất cả thêm <b>{vi(10000 * ate / 100, 0)}</b> đơn')
    sel = 2000 * 0.06 + 5000 * 0.02
    need('p3 hte: bỏ nhóm bị hại', f'2.000 × 0,06 + 5.000 × 0,02 = 120 + 100 = <b>{vi(sel, 0)}</b> đơn')
    # A12: bao nhiêu NGƯỜI bị hại thì bảng không nói được — chỉ có cận (bốn loại khách của 6.2):
    # trong nhóm nhận nhiều tin, P(mua | không nhắn) = chắc mua + chó ngủ = 25%, P(mua | nhắn) = chắc mua + thuyết phục = 22%
    # ⇒ chó ngủ = thuyết phục + 3 điểm, và chó ngủ ≤ 25%
    lo_g, hi_g = seg[2][1] - seg[2][2], seg[2][1]   # nhóm nhận nhiều tin: 25% → 22%
    need('p3 hte: cận số người bị hại',
         f'có thể chỉ {vi(lo_g, 0)}% của nhóm, mà cũng có thể tới {vi(hi_g, 0)}% — tức từ {vi(0.3 * lo_g, 1)}% tới {vi(0.3 * hi_g, 1)}% cả tập')
    claim('p3 hte: không thể có 30% cả tập bị hại (tối đa là tỉ lệ mua khi không nhắn)', 0.3 * hi_g < 30 and base < 30)
    claim('p3 hte: không còn câu "30% khách bị hại"', '30% khách bị hại' not in HTML)
    need('p3 hte: lede nói về nhóm', 'việc nhóm 30% khách đã bị nhắn quá nhiều mua ít đi cũng là thật')
    only = 0.2 * 14 + 0.5 * 32 + 0.3 * 25
    need('p3 hte: câu tự kiểm', f'0,2 × 14 + 0,5 × 32 + 0,3 × 25 = 2,8 + 16 + 7,5 = <b>{vi(only, 1)}%</b>')
    need('p3 hte: câu tự kiểm, số đơn', f'<b>{vi(only * 100, 0)}</b> đơn so với {vi(treat * 100, 0)}')
    claim('p3 hte: 2.630 − 2.410 = 220 đơn tăng thêm, khớp đoạn trên', abs((only - base) * 100 - sel) < 1e-9)
    need('p3 hte: 20 lát cắt → 64%', f'1 − 0,95²⁰ ≈ <b>{vi((1 - 0.95 ** 20) * 100, 0)}%</b>')

    # ═════════════ 6.2 uplift ═════════════
    need('p3 uplift: cờ chiến lược trong JS', "hist: [0, 1, 0, 1],")
    need('p3 uplift: hằng số tiền trong JS', 'P3.UP_N = 10000; P3.UP_M = 150; P3.UP_C = 1; P3.UP_D = 30;')
    R = {k: _p3_uplift(20, 30, 10, k) for k in ('all', 'hist', 'resp', 'upl')}
    h, u = R['hist'], R['upl']
    need('p3 uplift: lede', f'làm mất <b>{vi(-h["orders"], 0)}</b> đơn và lỗ <b>{vi(-h["profit"] / 1000, 0)} triệu</b>')
    need('p3 uplift: lede (2)', f'nhắn đúng {vi(u["msg"], 0)} người có uplift dương thì lãi <b>{vi(u["profit"] / 1000, 0)} triệu</b>')
    need('p3 uplift: gợi ý', f'{vi(h["msg"], 0)} tin, −{vi(-h["orders"], 0)} đơn, lỗ {vi(-h["profit"] / 1000, 0)} triệu — mà <b>{vi(h["resp"] * 100, 0)}%</b>')
    hd0 = _p3_uplift(20, 30, 0, 'hist')
    need('p3 uplift: chó ngủ = 0', f'vẫn lỗ {vi(-hd0["profit"] / 1000, 0)} triệu vì trả mã')
    claim('p3 uplift: chó ngủ = 0 → không mất đơn nhưng vẫn lỗ', hd0['orders'] == 0 and hd0['profit'] < 0)
    need('p3 uplift: fx theo uplift',
         f'{vi(u["orders"], 0)} × 150 − {vi(u["msg"], 0)} × 1 − {vi(u["coupon"], 0)} × 30 = {vi(u["profit"], 0)} nghìn = {vi(u["profit"] / 1000, 0)} triệu')
    need('p3 uplift: fx hay mua nhất',
         f'{vi(h["orders"], 0)} × 150 − {vi(h["msg"], 0)} × 1 − {vi(h["coupon"], 0)} × 30 = {vi(h["profit"], 0)} nghìn = {vi(h["profit"] / 1000, 0)} triệu')
    for idv, val in (('m-uplift-msg', vi(h['msg'], 0)), ('m-uplift-ord', vi(h['orders'], 0)),
                     ('m-uplift-cost', vi(h['cost'] / 1000, 1) + ' tr. ₫'), ('m-uplift-profit', vi(h['profit'] / 1000, 1) + ' tr. ₫'),
                     ('m-uplift-resp', vi(h['resp'] * 100, 0) + '%')):
        need(f'p3 uplift: readout mặc định {idv}', f'id="{idv}">{val}<')
    claim('p3 uplift: thứ tự lãi — uplift > phản hồi > tất cả > hay mua nhất',
          R['upl']['profit'] > R['resp']['profit'] > R['all']['profit'] > R['hist']['profit'])
    claim('p3 uplift: phản hồi và uplift cùng 100% người nhận mua, lãi khác nhau',
          R['resp']['resp'] == R['upl']['resp'] == 1 and R['resp']['profit'] < R['upl']['profit'])
    # quy tắc nhắn
    g1, c1, g2, c2 = 0.05 * 150, 1 + 30 * 0.3, 0.06 * 150, 1 + 30 * 0.14
    need('p3 uplift: câu tự kiểm, khách 1', f'0,05 × 150 = <b>{vi(g1, 1)}</b> nghìn; chi phí kỳ vọng 1 + 30 × 0,3 = <b>{vi(c1, 0)}</b> nghìn')
    need('p3 uplift: câu tự kiểm, khách mới', f'lợi 0,06 × 150 = <b>{vi(g2, 0)}</b> nghìn, chi phí 1 + 30 × 0,14 = <b>{vi(c2, 1)}</b> nghìn')
    claim('p3 uplift: khách 1 không nên nhắn, khách mới nên', g1 < c1 and g2 > c2)
    ok = True
    for pP in range(0, 61, 5):
        for pS in range(0, 61, 5):
            for pD in range(0, 41, 5):
                if pP + pS + pD > 100:
                    continue
                for k in ('all', 'hist', 'resp', 'upl'):
                    rr = _p3_uplift(pP, pS, pD, k)
                    ok = ok and abs(rr['profit'] - (rr['orders'] * 150 - rr['cost'])) < 1e-6
    claim('p3 uplift: lãi = đơn × 150 − chi phí ở mọi tỉ trọng thử', ok)

    # ═════════════ 6.3 meta-learner ═════════════
    for sx in ('# in ra: Nhắn 20% khách theo mô hình: +88 đơn', '#        Nhắn 20% khách ngẫu nhiên:  +20 đơn',
               '#        mới          0.056', '#        nhiều tin   -0.038', '#        quen         0.012'):
        need('p3 learners: dòng "# in ra" của code', sx)
    need('p3 learners: văn trích đúng số in ra', 'Nhắn 20% khách theo mô hình thêm 88 đơn; nhắn 20% ngẫu nhiên thêm 20.')
    cate = {'mới': 0.056, 'nhiều tin': -0.038, 'quen': 0.012}
    need('p3 learners: CATE theo nhóm, bằng điểm % như 6.1',
         f'khách mới +{vi(cate["mới"] * 100, 1)} điểm %, nhận nhiều tin {vi(cate["nhiều tin"] * 100, 1)}, quen +{vi(cate["quen"] * 100, 1)} — so với thật +6, −3 và +2')
    need('p3 learners: X-learner dùng e(x)', 'τ̂ = e(x)·τ̂₀ + (1 − e(x))·τ̂₁, với e(x) là điểm xu hướng')
    need('p3 learners: DR-learner — pseudo-outcome, bền kép', 'Nó bền kép như AIPW: đúng khi một trong hai mô hình phụ đúng.')
    claim('p3 learners: không còn chữ "vững kép"', 'vững kép' not in HTML)
    up = (90 / 600 - 45 / 600) * 1200; qn = 90 - 45 * 600 / 600
    need('p3 learners: câu tự kiểm, đường uplift', f'(90/600 − 45/600) × 1.200 = (0,15 − 0,075) × 1.200 = <b>{vi(up, 0)}</b> đơn')
    need('p3 learners: câu tự kiểm, Qini', f'Qini: 90 − 45 × 600/600 = <b>{vi(qn, 0)}</b>')

    # ═════════════ 6.3 mô hình đường uplift / Qini ═════════════
    need('p3 qini: hạt giống', 'var r = rng(129), rows = [];')
    need('p3 qini: bốn loại 20/30/40/10', 'var typ = u < 0.2 ? 0 : (u < 0.5 ? 1 : (u < 0.9 ? 2 : 3));')
    need('p3 qini: điểm của uplift đoán', "if (key === 'noisy') return row[3] + sigma * row[4] + 1e-9 * row[5];")
    need('p3 qini: sắp xếp có phá hoà theo chỉ số', 'sc.sort(function (a, b) { return (b[0] - a[0]) || (a[1] - b[1]); });')
    need('p3 qini: công thức điểm của đường uplift', 'U.push(nT && nC ? (yT / nT - yC / nC) * (j + 1) : 0);')
    need('p3 qini: công thức Qini', 'Q.push(nC ? yT - yC * nT / nC : 0);')
    rows = _p3_qini_data()
    Ut, Qt, ordt = _p3_qini_curve(rows, 'true', 0)
    Un1, _, _ = _p3_qini_curve(rows, 'noisy', 1.0)
    Un3, _, _ = _p3_qini_curve(rows, 'noisy', 3.0)
    Ur, _, _ = _p3_qini_curve(rows, 'resp', 0)
    Ua, _, _ = _p3_qini_curve(rows, 'random', 0)
    claim('p3 qini: 20% đầu theo uplift thật toàn là người bị thuyết phục', all(rows[i][0] == 0 for i in ordt[:800]))
    claim('p3 qini: vì thế đúng 800 đơn', abs(Ut[20] - 800) < 1e-9, f'{Ut[20]}')
    need('p3 qini: gợi ý uplift thật', f'20% đầu thêm <b>{vi(Ut[20], 0)}</b> đơn — cả 800 người ấy đều bị thuyết phục — rồi đường đi ngang, và tụt về {vi(Ut[100], 0)} ở 10% cuối vì chó ngủ')
    claim('p3 qini: 10% cuối theo uplift thật là chó ngủ', sum(1 for i in ordt[3600:] if rows[i][0] == 3) >= 395)
    need('p3 qini: gợi ý có nhiễu', f'20% đầu còn {vi(Un1[20], 0)}; kéo σ lên 3 thì còn {vi(Un3[20], 0)}')
    need('p3 qini: σ = 3 so với đường ngẫu nhiên và uplift thật',
         f'— gần đường nhắn ngẫu nhiên ({vi(0.2 * Ut[100], 0)}) hơn nhiều so với {vi(Ut[20], 0)} của uplift thật')
    claim('p3 qini: σ = 3 gần đường ngẫu nhiên hơn nhiều', (Un3[20] - 0.2 * Ut[100]) < 0.15 * (Ut[20] - 0.2 * Ut[100]),
          f'{Un3[20]:.1f} so với {0.2 * Ut[100]:.1f} … {Ut[20]:.1f}')
    need('p3 qini: gợi ý phản hồi', f'{vi(Ur[20], 0)} ở 20%, bắt kịp ({vi(Ur[50], 0)}) ở 50%')
    need('p3 qini: gợi ý ngẫu nhiên', f'<b>Ngẫu nhiên</b>: {vi(Ua[20], 0)} ở 20%')
    need('p3 qini: mọi đường kết thúc ở cùng một điểm', f'Mọi đường cùng kết thúc ở {vi(Ut[100], 0)}')
    ends = [Ut[100], Un1[100], Un3[100], Ur[100], Ua[100]]
    claim('p3 qini: nhắn tất cả thì mọi cách xếp ra cùng một số', max(ends) - min(ends) < 1e-9)
    seq = [_p3_qini_curve(rows, 'noisy', sg)[0][20] for sg in (0.0, 0.5, 1.0, 2.0, 3.0)]
    claim('p3 qini: nhiễu càng lớn, 20% đầu càng ít đơn', all(seq[i] > seq[i + 1] for i in range(4)), f'{[round(x) for x in seq]}')
    claim('p3 qini: mô hình phản hồi bắt kịp uplift thật ở 50%', abs(Ur[50] - Ut[50]) < 20 and Ur[20] < 0.5 * Ut[20])
    claim('p3 qini: ngẫu nhiên ≈ 20% tổng uplift ở 20%', abs(Ua[20] - 0.2 * Ut[100]) < 10)
    claim('p3 qini: Qini ≈ một nửa đường uplift (nhóm nhắn ≈ một nửa)', abs(Qt[20] / Ut[20] - 0.5) < 0.03)
    for idv, val in (('m-qini-20', vi(Ut[20], 0)), ('m-qini-50', vi(Ut[50], 0)), ('m-qini-100', vi(Ut[100], 0))):
        need(f'p3 qini: readout mặc định {idv}', f'id="{idv}">{val}<')

    # ═════════════ 6.4 DML ═════════════
    need('p3 dml: dòng JS dựng T', 'var t = 8 + 12 * a * b + 4 * gauss(r);')
    need('p3 dml: dòng JS dựng Y', 'var y = 4 * t + 200 + 500 * a * b + 150 * a + 30 * gauss(r);')
    need('p3 dml: 10 × 10 ô', 'P3.DML_K = 10;')
    need('p3 dml: hạt giống của dữ liệu', 'var r = rng(7), A = [], B = [], T = [], Y = [];')
    need('p3 dml: kẹp giảm giá không âm', 'if (t < 0) t = 0;')
    need('p3 dml: chia chéo theo chẵn/lẻ', 'if (i % 2 === k) continue;')
    A, B, T, Yd = _p3_dml_data()
    naive = _p3_slope(T, Yd)
    rT = _p3_resid_lin(T, [A, B]); rY = _p3_resid_lin(Yd, [A, B])
    lin = _p3_thru0(rT, rY)
    bT = _p3_resid_bins(A, B, T); bY = _p3_resid_bins(A, B, Yd)
    dml = _p3_thru0(bT, bY)
    AB = [A[i] * B[i] for i in range(len(A))]
    linab = ols([T, A, B, AB], Yd)[1]
    full = ols([T, A, B], Yd)[1]
    claim('p3 dml: Frisch–Waugh–Lovell — phần dư theo phần dư = hệ số của T trong Y ~ T + X', abs(full - lin) < 1e-8, f'{full} vs {lin}')
    need('p3 dml: lede', f'Hồi quy thẳng cho <b>{vi(naive, 2)}</b>')
    need('p3 dml: lede (2)', f'vẫn ra <b>{vi(lin, 2)}</b>. Double ML cho <b>{vi(dml, 2)}</b>')
    claim('p3 dml: "gấp năm lần"', 4.6 < naive / 4 < 5.4, f'{naive / 4:.2f}')
    claim('p3 dml: ba chip đúng hướng — ngây thơ > tuyến tính > DML > 4, DML sát 4',
          naive > lin > dml > 4 and dml - 4 < 0.3)
    need('p3 dml: bước 2 "lệch lên 6,97"', f'ước lượng lệch lên {vi(lin, 2)}')
    need('p3 dml: gợi ý', f'<b>Hồi quy ngây thơ</b>: {vi(naive, 2)}. <b>Có X tuyến tính</b>: {vi(lin, 2)}')
    need('p3 dml: gợi ý (2)', f'<b>DML</b>: {vi(dml, 2)} — ô nhiệt')
    # A1: 0,20 trên màn hình phần lớn là nhiễu mẫu — hàm phụ THẬT trên đúng bộ này đã ra 4,17
    oracle = _p3_dml_oracle(A, B, T, Yd)
    need('p3 dml: lab__f — hàm phụ thật trên đúng bộ này', f'dùng hàm phụ thật, không làm mượt gì, cũng đã ra {vi(oracle, 2)}.')
    need('p3 dml: câu chip DML — hàm phụ thật', f'nhiễu của chính mẫu này — dùng hàm phụ thật, không làm mượt gì, cũng đã ra {vi(oracle, 2)}')
    claim('p3 dml: phần lớn của 0,20 là nhiễu mẫu', (oracle - 4) > 0.5 * (dml - 4), f'hàm phụ thật {oracle:.4f}, theo ô {dml:.4f}')
    need('p3 dml: lab__f — lệch trung bình của bộ làm mượt', 'cách này lệch lên khoảng <b>0,25</b>')
    need('p3 dml: câu chip — lệch trung bình', 'trung bình theo ô lệch lên khoảng 0,25')
    need('p3 dml: readout mặc định', f'id="m-dml-est">{vi(naive, 2)}<')
    need('p3 dml: readout lệch mặc định', f'id="m-dml-bias">+{vi(naive - 4, 2)}<')
    need('p3 dml: câu tự kiểm a × b', f'Ra <b>{vi(linab, 2)}</b> — gần đúng 4')
    claim('p3 dml: thêm a × b thì hồi quy tuyến tính gần đúng', abs(linab - 4) < 0.25)
    # "phần lệch còn lại phần lớn đến từ bộ làm mượt thô": trên bộ dữ liệu khác (cùng quy trình,
    # hạt giống khác), DML theo ô vẫn lệch lên một lượng cỡ ấy — tức lệch có hệ thống, không phải may rủi
    def _p3_dml_seed(sd):
        r = jsrng(sd); A2, B2, T2, Y2 = [], [], [], []
        for _ in range(3000):
            a = r(); b = r()
            t_ = 8 + 12 * a * b + 4 * jsgauss(r)
            t_ = 0 if t_ < 0 else t_
            A2.append(a); B2.append(b); T2.append(t_)
            Y2.append(4 * t_ + 200 + 500 * a * b + 150 * a + 30 * jsgauss(r))
        return _p3_thru0(_p3_resid_bins(A2, B2, T2), _p3_resid_bins(A2, B2, Y2))
    mc = [_p3_dml_seed(sd) for sd in (101, 202, 303, 404, 505, 606)]
    claim('p3 dml: DML theo ô lệch lên có hệ thống (trung bình 6 bộ dữ liệu khác ≥ 4,15)',
          sum(mc) / len(mc) >= 4.15 and min(mc) > 3.8, f'{[round(x, 3) for x in mc]}')
    # "qua nhiều bộ dữ liệu … lệch lên khoảng 0,25": 40 bộ, so với hàm phụ thật trên CÙNG bộ (bản 200 bộ ở p3_notes: +0,251)
    dd = []
    for k in range(40):
        A2, B2, T2, Y2 = _p3_dml_data_seed(100003 + 7919 * k)
        dd.append(_p3_thru0(_p3_resid_bins(A2, B2, T2), _p3_resid_bins(A2, B2, Y2)) - _p3_dml_oracle(A2, B2, T2, Y2))
    claim('p3 dml: qua 40 bộ, trung bình theo ô lệch lên cỡ 0,25 so với hàm phụ thật', 0.18 < sum(dd) / len(dd) < 0.32, f'{sum(dd) / len(dd):.3f}')
    for sx in ('# in ra: ngây thơ : 19.94', '#        tuyến tính: 6.22', '#        DML      : 3.85 (SE 0.14)'):
        need('p3 dml: dòng "# in ra" của code', sx)
    need('p3 dml: nhãn θ không bị viết hoa', '<div class="k">Ước lượng <span class="lc">θ</span></div>')
    need('p3 dml: θ ở đây là tác động', 'θ ở đây là chính tác động — vai của τ ở mục 4.2')
    need('p3 dml: dẫn ngược về 4.2', '<a href="#s-adjust">Mục 4.2</a> đã gặp định lý này ở dạng một câu')
    need('p3 dml: KTC của code', f'(khoảng {vi(3.85 - 1.96 * 0.14, 2)} … {vi(3.85 + 1.96 * 0.14, 2)})')
    claim('p3 dml: KTC của code chứa 4', 3.85 - 1.96 * 0.14 < 4 < 3.85 + 1.96 * 0.14)
    need('p3 dml: văn trích đúng số in ra', 'Ngây thơ 19,94, tuyến tính 6,22, DML 3,85 (SE 0,14)')
    # A5: một lần chứa 4 chưa nói gì — số của lần chạy lặp (work-p3/fix/dml_gb_vs_bins.py 200, ghi ở p3_notes)
    need('p3 dml: theo ô trên đúng bộ của code cũng chứa 4', f'cũng ra 4,18, KTC {vi(4.182 - 1.96 * 0.154, 2)} … {vi(4.182 + 1.96 * 0.154, 2)}, cũng chứa 4')
    claim('p3 dml: KTC theo ô của bộ code chứa 4', 4.182 - 1.96 * 0.154 < 4 < 4.182 + 1.96 * 0.154)
    need('p3 dml: 200 bộ — GB', 'gradient boosting trung bình ra 4,00, KTC 95% chứa 4 ở <b>96,5%</b> số lần')
    need('p3 dml: 200 bộ — theo ô', 'trung bình theo ô trung bình ra 4,25, KTC chỉ chứa 4 ở <b>62%</b> số lần')
    claim('p3 dml: không còn lối suy "KTC chứa 4 nên tốt hơn"', 'tốt hơn trung bình theo ô, nên KTC' not in HTML)

    # ═════════════ 6.5 quy trình ═════════════
    need('p3 workflow: báo cáo mẫu', f'tăng khoảng <b>{vi(24.59, 1)} triệu ₫/tháng</b>')
    need('p3 workflow: KTC báo cáo mẫu', f'KTC 95%: {vi(24.59 - 1.96 * 2.04, 1)} – {vi(24.59 + 1.96 * 2.04, 1)}')
    need('p3 workflow: 6 triệu cho mỗi 1 triệu mỗi tháng', 'cứ mỗi tháng vùng A tăng nhanh hơn 1 triệu ₫, nó dư ra khoảng 6 triệu ₫')
    claim('p3 workflow: "6 triệu" = DiD lệch 6 khi δ = +1', abs(_p3_did(25, 1, 0)['est'] - 25 - 6) < 1e-9)
    need('p3 workflow: giả định không có cú sốc vùng-tháng', 'và mỗi vùng không có cú sốc riêng theo tháng — nếu có, khoảng tin cậy này quá hẹp')
    need('p3 workflow: kiểm chứng giả dẫn về 4.5', 'Kiểm chứng giả — placebo: ngày giả, kết quả giả, đơn vị giả (<a href="#s-sense">mục 4.5</a>)')
    need('p3 act5: các mục là những thế giới riêng', 'đừng nối con số giữa các mục')
    # từ điển: dạng tự gạch chân không được bắt tên đồng tác giả Lee–McCrary–Moreira–Porter (G1)
    claim('p3 gloss: không còn dạng "McCrary" đứng một mình', re.search(r"'McCrary\|", HTML) is None and "'dồn cục|kiểm McCrary'" in HTML)

    # ═════════════ khung: đủ mục, đủ mô hình, số mục khớp bảng §3 ═════════════
    for sid, n in (('s-did', '5.1'), ('s-synth', '5.2'), ('s-rdd', '5.3'), ('s-iv', '5.4'), ('s-hte', '6.1'),
                   ('s-uplift', '6.2'), ('s-learners', '6.3'), ('s-dml', '6.4'), ('s-workflow', '6.5')):
        claim(f'p3 khung: {sid} mang số {n}', re.search(r'id="' + sid + r'"[^>]*>\s*<p class="sechead">' + re.escape(n) + ' ·', HTML) is not None)
    for key in ('did', 'synth', 'rdd', 'iv', 'uplift', 'qini', 'dml'):
        claim(f'p3 khung: có lab m-{key}', f'id="m-{key}"' in HTML and f'id="m-{key}-svg"' in HTML)

def run_ref():
    """Phần tra cứu + bốn phép kiểm TOÀN TRANG mà không cổng nào khác làm.

    1. Link chéo: mọi <a href="#s-…"> có số "N.M" trong chữ phải trỏ tới đúng mục mang số ấy;
       "chặng N" trỏ #actN. Sai số mục là lỗi lặng lẽ nhất khi một trang được ba người viết.
    2. Từ điển: GLOSS nằm trong <script> nên lint-pages.py (bóc script trước khi soi) không kiểm
       được đích '#s-…' của nó — ở đây kiểm.
    3. Chữ Hy Lạp thường nằm trong nhãn viết hoa bằng CSS thì hiện thành chữ HOA trông như Latin
       (α→Α, ρ→Ρ, θ→Θ). Chỉ hợp lệ khi bọc <span class="lc">. Bắt được nhãn viết sẵn trong HTML;
       nhãn do JS sinh thì không (việc ấy của smoke trong trình duyệt).
    4. Số mô hình ở đầu trang = số khối .lab thật; không sót {{ hay @@ của bộ ráp.
    Cộng: vài con số phần tra cứu nhắc lại phải còn đúng ở mục gốc của nó.
    """
    import re as _re

    def _p_sections():
        out = {}
        for m in _re.finditer(r'<section id="(s-[a-z0-9-]+)"[^>]*>(.*?)</section>', HTML, _re.S):
            out[m.group(1)] = m.group(2)
        return out

    def _p_text(s):
        s = _re.sub(r'<[^>]+>', ' ', s)
        return _re.sub(r'\s+', ' ', _html.unescape(s))

    secs = _p_sections()
    body = _re.sub(r'<script\b.*?</script>', ' ', HTML, flags=_re.S)

    # ── 1. link chéo: số trong chữ của link phải khớp số của mục đích ─────────
    num_of = {}
    for sid, inner in secs.items():
        m = _re.search(r'<p class="sechead">\s*([0-9]+\.[0-9]+)\s*·', inner)
        if m:
            num_of[sid] = m.group(1)
    # 2 mục mở đầu + 4 + 6 + 6 + 5 + 4 + 5 = 32 mục có số (5 mục tra cứu không đánh số)
    claim('ref · 32 mục chặng 0–6 đều có số trong sechead', len(num_of) == 32,
          f'đọc được số của {len(num_of)} mục')
    bad = []
    for m in _re.finditer(r'<a href="#(s-[a-z0-9-]+)">(.*?)</a>', body, _re.S):
        sid, label = m.group(1), _p_text(m.group(2))
        nums = _re.findall(r'(?<![0-9,])([0-6]\.[0-9]{1,2})(?![0-9])', label)
        if nums and sid in num_of and nums[0] != num_of[sid]:
            bad.append(f'"{label.strip()}" → #{sid} (mục ấy là {num_of[sid]})')
    for m in _re.finditer(r'<a href="#act([1-6])">(.*?)</a>', body, _re.S):
        label = _p_text(m.group(2))
        k = _re.findall(r'chặng\s+([1-6])', label, _re.I)
        if k and k[0] != m.group(1):
            bad.append(f'"{label.strip()}" → #act{m.group(1)}')
    claim('ref · link chéo "mục N.M" trỏ đúng mục', not bad, '; '.join(bad[:8]))

    # ── 2. từ điển: đích của mọi mục GLOSS phải tồn tại ─────────────────────
    ids = set(_re.findall(r'\bid="([^"]+)"', HTML))
    gi = HTML.find('var GLOSS = [')
    gj = HTML.find('\n];', gi)
    gloss = HTML[gi:gj] if gi > 0 else ''
    targets = _re.findall(r"'#([a-z0-9-]+)'\s*(?:,|\])", gloss)
    missing = sorted({t for t in targets if t not in ids})
    claim('ref · GLOSS có ≥ 50 mục', len(targets) >= 50, f'chỉ thấy {len(targets)} đích')
    claim('ref · mọi đích của GLOSS là một id có thật', not missing, ', '.join(missing))

    # ── 3. chữ Hy Lạp thường trong nhãn viết hoa bằng CSS ───────────────────
    UP_CLASS = ('lab__k', 'sechead', 'box__k', 'code__k', 'eyebrow', 'toc__g', 'lbl', 'k')
    greek, latin = [], []
    # Duyệt từng THẺ MỞ (không duyệt cặp mở–đóng: thẻ lồng nhau như <div class="read"><div class="k">
    # làm cặp ngoài nuốt mất cặp trong), lấy chữ tới thẻ đóng cùng tên gần nhất.
    for m in _re.finditer(r'<(p|div|span|th|label)\b([^>]*)>', body):
        tag, attrs = m.group(1), m.group(2)
        cls = _re.search(r'class="([^"]*)"', attrs)
        cl = cls.group(1).split() if cls else []
        if not (tag in ('th', 'label') or any(c in UP_CLASS for c in cl)):
            continue
        end = body.find('</' + tag + '>', m.end())
        inner = body[m.end():end if end > 0 else m.end()]
        plain = _re.sub(r'<span class="lc">.*?</span>', '', inner, flags=_re.S)
        plain = _re.sub(r'<[^>]+>', '', plain)
        if _re.search('[α-ω]', plain):
            greek.append(plain.strip()[:40])
        # Ký hiệu Latin một chữ thường (p, n, e, x, h…) cũng đổi nghĩa khi bị viết hoa: e(x) là
        # điểm xu hướng còn E là kỳ vọng; n là cỡ mẫu còn N là cả tổng thể; "p placebo" thành "P" —
        # đúng tên một thành phố trong mô hình. Tên có gạch nối (p-value, t-test, E-value) thì
        # viết hoa vẫn đọc đúng, nên được miễn.
        bare = _re.sub(r'(?i)\b[pte]-(value|test)\b', ' ', _html.unescape(plain))
        if _re.search(r'(?<![A-Za-zÀ-ỹ0-9_])[a-z](?![A-Za-zÀ-ỹ0-9_])', bare):
            latin.append(bare.strip()[:40])
    claim('ref · không có chữ Hy Lạp thường trần trong nhãn viết hoa', not greek,
          'bọc bằng <span class="lc">: ' + ' · '.join(greek[:8]))
    claim('ref · không có ký hiệu chữ thường một chữ trần trong nhãn viết hoa', not latin,
          'bọc bằng <span class="lc">: ' + ' · '.join(latin[:10]))

    # ── 4. số mô hình, dấu vết của bộ ráp ──────────────────────────────────
    labs = len(_re.findall(r'<div class="lab" id="m-', HTML))
    need('ref · đầu trang ghi đúng số mô hình', f'<b>{labs} mô hình</b>', labs)
    claim('ref · không sót {{ hay @@ của bộ ráp', '{{' not in HTML and '@@' not in HTML,
          'còn chuỗi placeholder chưa thay')
    lk = [x for x in _re.findall(r'class="lab__k">\s*Mô hình ([0-9]+)', HTML)]
    claim('ref · mô hình đánh số liền 1…N theo thứ tự trang',
          lk == [str(i + 1) for i in range(labs)], f'thấy {lk}')

    # ── con số phần tra cứu nhắc lại phải còn ở mục gốc ─────────────────────
    ref = ''.join(secs.get(k, '') for k in ('s-carry', 's-choose', 's-mistakes'))
    for label, value, home in (
        ('nhìn mỗi ngày 4 tuần', '27,5%', 's-peek'),
        ('một nửa của 27,5% báo bản mới thắng', '13,7%', 's-peek'),
        ('A/A thắng khi SE sai đơn vị', '42%', 's-interfere'),
        ('TWFE so le', '10,0', 's-did'),
        ('ATT thật khi so le', '16,7', 's-did'),
    ):
        claim(f'ref · "{value}" ({label}) có trong tra cứu', value in _p_text(ref), 'tra cứu không còn nhắc số này')
        claim(f'ref · "{value}" ({label}) vẫn có ở mục gốc #{home}', value in _p_text(secs.get(home, '')),
              f'mục {home} đã đổi số — sửa lại phần tra cứu cho khớp')
    # "MDE nhỏ bằng một nửa thì cần gấp bốn số người": n tỉ lệ 1/MDE²
    claim('ref · n ∝ 1/MDE²: MDE còn một nửa thì n gấp bốn', abs((1 / 0.5 ** 2) - 4) < 1e-12)
    # đường z của A/A đối xứng qua 0, nên số báo "bản mới thắng" đúng bằng một nửa số báo động giả
    claim('ref · 13,7% là một nửa của 27,5% (làm tròn)', abs(27.47 / 2 - 13.74) < 0.01 and vi(27.47 / 2, 1) == '13,7')
    claim('ref · tra cứu không còn gọi báo động giả hai phía là "thắng"',
          'vô tác dụng vẫn &ldquo;thắng&rdquo;' not in HTML, 'còn câu cũ gọi 27,5% là "thắng"')
    need('ref · câu "gấp bốn" ở mang theo', 'cần <b>gấp bốn</b> số người')
    # 13 dòng bảng chọn cách làm, 20 dòng nhầm lẫn — đếm để ai thêm/bớt dòng thì biết mà sửa lời dẫn
    rows_choose = len(_re.findall(r'<tr><td>', secs.get('s-choose', '')))
    claim('ref · bảng chọn cách làm có 13 dòng', rows_choose == 13, f'thấy {rows_choose}')
    rows_mis = len(_re.findall(r'<tr><td>', secs.get('s-mistakes', '')))
    claim('ref · bảng nhầm lẫn có 20 dòng', rows_mis == 20, f'thấy {rows_mis}')


def main():
    global HTML, TEXT, PAGE
    args = sys.argv[1:]
    only = None
    if '--page' in args:
        PAGE = pathlib.Path(args[args.index('--page') + 1]).resolve()
    if '--only' in args:
        only = args[args.index('--only') + 1].split(',')
    HTML = PAGE.read_text(encoding='utf-8')
    body = re.sub(r'<(script|style)\b[^>]*>.*?</\1\s*>', ' ', HTML, flags=re.S | re.I)
    TEXT = re.sub(r'\s+', ' ', _html.unescape(re.sub(r'<[^>]+>', '', body)))
    for name in ('p1', 'p2', 'p3', 'ref'):
        if only and name not in only:
            continue
        fn = globals().get('run_' + name)
        if fn:
            fn()
    if fails:
        print(f'verify-causal-inference: {len(fails)}/{checks} phép kiểm KHÔNG khớp')
        for f in fails:
            print('  ✗', f)
        sys.exit(1)
    print(f'verify-causal-inference: {checks}/{checks} phép kiểm khớp')


if __name__ == '__main__':
    main()
