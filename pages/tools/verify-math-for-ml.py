#!/usr/bin/env python3
"""Cổng kiến thức cho pages/mathematics-for-machine-learning.html.

Vì sao cần một cổng riêng, khác lint-pages.py: trang ấy nói khoảng 90 con số cụ thể
(định thức, trị riêng, tỉ lệ PCA, dãy Newton, xác suất nhị thức, kết quả Bayes,
phân vị t, p-value…). lint-pages.py kiểm được cấu trúc HTML nhưng KHÔNG biết
0,0546875 có phải là P(X≥8 | n=10, p=0,5) hay không. Script này tính lại từ đầu
bằng Python rồi đòi con số ấy phải có mặt trong trang, viết theo lối Việt.

Nên khi ai sửa một con số trong bài mà không sửa phép tính, commit bị chặn — và
ngược lại, thấy cổng xanh là biết mọi con số trong trang đều tính lại được.

Chỉ dùng thư viện chuẩn (math, statistics, itertools) để chạy được ở mọi máy:
numpy có thể chưa cài trên máy người khác, và cổng không được phụ thuộc vào may mắn.

Chạy:  python3 pages/tools/verify-math-for-ml.py
Exit code: 1 nếu có con số không khớp.
"""
import math
import pathlib
import sys
from itertools import combinations
from statistics import NormalDist

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'mathematics-for-machine-learning.html'
N = NormalDist()
fails = []
checks = 0


def vi(x, d=2):
    """Số viết theo lối Việt: dấu phẩy thập phân, và dấu TRỪ Unicode (U+2212) —
    trang dùng ký tự ấy, còn Python in dấu nối ASCII, nên không đổi thì mọi số âm
    đều báo trượt."""
    return f'{x:.{d}f}'.replace('.', ',').replace('-', '\u2212')


def need(label, text, expect=None):
    """Đòi `text` có mặt trong trang. `expect` chỉ để in ra khi trượt."""
    global checks
    checks += 1
    if text not in HTML:
        fails.append(f'{label}: không thấy "{text}"' + (f' (tính được: {expect})' if expect else ''))


def num(label, value, d=2, ctx=''):
    """Tính ra `value`, đòi trang có đúng chuỗi ấy (kèm ngữ cảnh nếu cần)."""
    s = vi(value, d)
    need(label, ctx + s if ctx else s, value)


# ─────────────────────────────── đại số tuyến tính ───────────────────────────
def det2(m):
    return m[0][0] * m[1][1] - m[0][1] * m[1][0]


def solve(A, b):
    """Khử Gauss có chọn trụ — cùng thuật toán mà mục 1.3 mô tả."""
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        if abs(M[i][i]) < 1e-12:
            return None
        for j in range(i + 1, n):
            f = M[j][i] / M[i][i]
            for k in range(i, n + 1):
                M[j][k] -= f * M[i][k]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / M[i][i]
    return x


def rank(A):
    M = [row[:] for row in A]
    rows, cols = len(M), len(M[0])
    r = 0
    for c in range(cols):
        piv = None
        for i in range(r, rows):
            if abs(M[i][c]) > 1e-9:
                piv = i
                break
        if piv is None:
            continue
        M[r], M[piv] = M[piv], M[r]
        for i in range(rows):
            if i != r and abs(M[i][c]) > 1e-12:
                f = M[i][c] / M[r][c]
                for k in range(cols):
                    M[i][k] -= f * M[r][k]
        r += 1
    return r


def eig2(a, b, c, d):
    tr, dt = a + d, a * d - b * c
    disc = tr * tr / 4 - dt
    if disc < 0:
        return None
    s = math.sqrt(disc)
    return tr / 2 + s, tr / 2 - s


def run_algebra():
    # 1.1 — bánh + kẹo
    x = solve([[1, 1], [1, 2]], [10, 13])
    assert_close('nghiệm hệ 2 ẩn', x, [7, 3])
    need('1.1 giá kẹo', '<b>3 nghìn</b>')
    need('1.1 giá bánh', '10 − 3 = 7 nghìn')
    num('1.2 det [[1,1],[1,2]]', det2([[1, 1], [1, 2]]), 0, ctx='1·2 − 1·1 = <b>')
    num('1.2 det [[1,1],[2,2]]', det2([[1, 1], [2, 2]]), 0, ctx='1·2 − 1·2 = <b>')

    # 1.3 — ba loại quả
    A3 = [[1, 1, 1], [1, 2, 1], [1, 1, 2]]
    q = solve(A3, [9, 12, 14])
    assert_close('nghiệm hệ 3 ẩn (táo, chuối, cam)', q, [1, 3, 5])
    need('1.3 kết quả', 'táo 1, chuối 3, cam 5')
    need('1.3 thử lại', '1+3+5 = 9')
    need('1.3 thử lại 2', '1+6+5 = 12')
    need('1.3 thử lại 3', '1+3+10 = 14')
    if rank(A3) != 3:
        fails.append('1.3: hạng của hệ đủ tin phải là 3')
    dep = [[1, 1, 1], [1, 2, 1], [2, 3, 2]]
    if rank(dep) != 2:
        fails.append('1.3: hạng của hệ có hàng phụ thuộc phải là 2')
    need('1.3 hạng 2', 'hạng = 2')
    if 9 + 12 != 21:
        fails.append('1.3: 21 phải bằng 9 + 12')

    # 1.4 — chuẩn
    v = (3, 4)
    if math.hypot(*v) != 5:
        fails.append('1.4: L2 của (3,4) phải là 5')
    need('1.4 L2', '<b>5 ô</b>')
    if abs(v[0]) + abs(v[1]) != 7:
        fails.append('1.4: L1 của (3,4) phải là 7')
    need('1.4 L1', '<b>3 + 4 = 7 ô</b>')

    # 1.5 — nhân vô hướng: cả bảng bốn dòng
    for u, w, dot, cos, ang in [((3, 4), (3, 4), 25, 1.0, 0.0),
                                ((3, 4), (4, 3), 24, 0.96, 16.26),
                                ((3, 4), (-4, 3), 0, 0.0, 90.0),
                                ((3, 4), (-3, -4), -25, -1.0, 180.0)]:
        d = u[0] * w[0] + u[1] * w[1]
        if d != dot:
            fails.append(f'1.5: {u}·{w} phải bằng {dot}, tính ra {d}')
        cc = d / (math.hypot(*u) * math.hypot(*w))
        num(f'1.5 cos {u}·{w}', cc, 2)
        deg = math.degrees(math.acos(max(-1, min(1, cc))))
        if abs(deg - ang) > 0.01:
            fails.append(f'1.5: góc giữa {u} và {w} là {deg:.2f}°, bảng ghi {ang}°')
        # góc tròn thì bảng viết "90°", góc lẻ thì viết đủ hai chữ số thập phân
        need(f'1.5 góc {u}·{w}', (vi(deg, 2) if abs(deg - round(deg)) > 1e-9 else str(round(deg))) + '°')

    # 1.6 — định thức là hệ số phóng diện tích
    if det2([[2, 0], [0, 2]]) != 4:
        fails.append('1.6: det của phép giãn 2× phải là 4 (cạnh gấp đôi, diện tích gấp bốn)')
    need('1.6 det giãn 2×', '<b>gấp 4</b>')
    if det2([[0, 1], [1, 0]]) != -1:
        fails.append('1.6: det của phép gương phải là −1')
    need('1.6 det gương', 'det = <b>\u22121</b>')
    need('1.6 det bóp phẳng', 'det = <b>0</b>')
    sh, sc = [[1, 1], [0, 1]], [[2, 0], [0, 1]]
    prod = [[sum(sh[i][k] * sc[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
    if prod != [[2, 1], [0, 1]]:
        fails.append(f'1.6: trượt∘giãn phải là [[2,1],[0,1]], tính ra {prod}')
    need('1.6 tích hai máy', '[[2,1],[0,1]]')
    prod2 = [[sum(sc[i][k] * sh[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
    if prod2 != [[2, 2], [0, 1]]:
        fails.append(f'1.6: giãn∘trượt phải là [[2,2],[0,1]], tính ra {prod2}')
    need('1.6 tích đảo thứ tự', '[[2,2],[0,1]]')
    if det2([[3, 6], [1, 2]]) != 0:
        fails.append('1.6: det [[3,6],[1,2]] phải bằng 0')

    # 1.7 — nghịch đảo
    M = [[3, 1], [1, 2]]
    dt = det2(M)
    inv = [[M[1][1] / dt, -M[0][1] / dt], [-M[1][0] / dt, M[0][0] / dt]]
    assert_close('1.7 nghịch đảo', [inv[0][0], inv[0][1], inv[1][0], inv[1][1]], [0.4, -0.2, -0.2, 0.6])
    need('1.7 det = 5', 'det A = 5')
    for cell in ['0,4', '−0,2', '0,6']:
        need('1.7 ô nghịch đảo ' + cell, '>' + cell + '<')

    # 1.8 — trị riêng
    lam = eig2(3, 1, 1, 3)
    assert_close('1.8 trị riêng [[3,1],[1,3]]', list(lam), [4, 2])
    need('1.8 λ = 4', '<b>4 lần</b>')
    need('1.8 λ = 2', '<b>2 lần</b>')

    # 1.9 — PCA trên đúng 10 điểm của bảng
    X = [(1, 2), (2, 3), (3, 5), (4, 4), (5, 7), (6, 6), (7, 9), (8, 8), (9, 11), (10, 10)]
    n = len(X)
    mx = sum(p[0] for p in X) / n
    my = sum(p[1] for p in X) / n
    assert_close('1.9 trung bình', [mx, my], [5.5, 6.5])
    sxx = sum((p[0] - mx) ** 2 for p in X) / (n - 1)
    syy = sum((p[1] - my) ** 2 for p in X) / (n - 1)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in X) / (n - 1)
    l1, l2 = eig2(sxx, sxy, sxy, syy)
    num('1.9 λ1', l1, 2)
    num('1.9 λ2', l2, 2)
    num('1.9 giữ lại được', l1 / (l1 + l2) * 100, 1, ctx='<b>')
    r = sxy / math.sqrt(sxx * syy)
    num('1.9 tương quan', r, 2, ctx='r = ')
    # trục chính nằm đúng 45° vì hai phương sai bằng nhau
    ang = math.degrees(math.atan2(1, 1))
    if abs(ang - 45) > 1e-9 or abs(sxx - syy) > 1e-9:
        fails.append('1.9: trục chính chỉ đúng 45° khi hai phương sai bằng nhau')
    need('1.9 góc trục', 'đúng 45°')
    ratio = l1 / l2
    if not 39.5 <= ratio <= 40.5:
        fails.append(f'1.9: tỉ số λ1/λ2 = {ratio:.2f}, trang nói "40 lần"')
    need('1.9 gấp 40 lần', '<b>40 lần</b>')


# ─────────────────────────────────── giải tích ───────────────────────────────
def sig(z):
    return 1 / (1 + math.exp(-z))


def run_calculus():
    # 2.1 — dây cung co về đạo hàm
    f = lambda x: x * x
    for h, want in [(1, 7.0), (0.1, 6.1), (0.01, 6.01), (0.001, 6.001)]:
        got = (f(3 + h) - f(3)) / h
        if abs(got - want) > 1e-9:
            fails.append(f'2.1: dây cung với h={h} phải là {want}, tính ra {got}')
        num(f'2.1 dây cung h={h}', want, 3)
    for h, val in [(0.1, 9.61), (0.01, 9.0601), (0.001, 9.006001)]:
        if abs(f(3 + h) - val) > 1e-9:
            fails.append(f'2.1: f(3+{h}) phải là {val}')
    need('2.1 f(3,1)', '9,61')
    need('2.1 f(3,01)', '9,0601')
    need('2.1 f(3,001)', '9,006001')
    need('2.1 đạo hàm', '<b>6,000</b>')

    # 2.2 — sigmoid
    num('2.2 σ(1)', sig(1), 4)
    num("2.2 σ'(1)", sig(1) * (1 - sig(1)), 4, ctx='<b>')
    numeric = (sig(1 + 1e-6) - sig(1 - 1e-6)) / 2e-6
    if abs(numeric - sig(1) * (1 - sig(1))) > 1e-9:
        fails.append("2.2: công thức σ' không khớp phép đo hai bên")
    need("2.2 σ' cực đại", '<b>0,25</b>')
    if abs(sig(0) * (1 - sig(0)) - 0.25) > 1e-15:
        fails.append("2.2: σ'(0) phải bằng đúng 0,25")

    # 2.3 — cực tiểu
    g = lambda x: x * x - 4 * x + 7
    if g(2) != 3 or g(1) != 4 or g(3) != 4:
        fails.append('2.3: f(2), f(1), f(3) của x²−4x+7 phải là 3, 4, 4')
    need('2.3 đáy', '<b>x = 2</b>')
    need('2.3 giá trị đáy', '<b>3</b>')
    need('2.3 hai bên', 'f(1) = 4, f(3) = 4')

    # 2.4 — gradient
    grad = (2 * 2, 6 * 1)
    if grad != (4, 6):
        fails.append('2.4: gradient của x²+3y² tại (2,1) phải là (4,6)')
    need('2.4 gradient', 'tại (2, 1)')

    # 2.5 — bảng gradient descent
    for a, x10 in [(0.1, None), (0.5, None), (0.9, None), (1.0, None), (1.1, None)]:
        x = 5.0
        traj = [x]
        for _ in range(10):
            x = x - a * 2 * x
            traj.append(x)
        num(f'2.5 hệ số α={a}', 1 - 2 * a, 1)
        num(f'2.5 x sau 10 bước α={a}', abs(traj[-1]), 2)
    x = 5.0
    for _ in range(3):
        x = x - 0.1 * 2 * x
    if abs(x - 2.56) > 1e-9:
        fails.append('2.5: α=0,1 sau 3 bước phải là 2,56')
    need('2.5 đường đi α=0,1', '5 → 4 → 3,2 → 2,56')
    need('2.5 phân kỳ', '5 → −6 → 7,2 → −8,64')

    # 2.6 — quy tắc chuỗi
    h3 = lambda x: (2 * x + 1) ** 3
    if h3(1) != 27:
        fails.append('2.6: (2x+1)³ tại x=1 phải là 27')
    der = 3 * (2 * 1 + 1) ** 2 * 2
    numeric = (h3(1 + 1e-6) - h3(1 - 1e-6)) / 2e-6
    if der != 54 or abs(numeric - 54) > 1e-5:
        fails.append(f'2.6: đạo hàm phải là 54, công thức {der}, đo được {numeric}')
    need('2.6 đạo hàm chuỗi', '<b>54</b>')
    need('2.6 bánh răng', '<b>Sáu vòng.</b>')
    if 2 * 3 != 6:
        fails.append('2.6: 2 × 3 phải bằng 6')
    v = 0.25 ** 10
    need('2.6 gradient tan biến', '<b>0,00000095</b>')
    if abs(v - 9.5367431640625e-07) > 1e-20:
        fails.append('2.6: 0,25¹⁰ tính sai')
    if f'{v:.8f}'.replace('.', ',') != '0,00000095':
        fails.append(f'2.6: 0,25¹⁰ làm tròn 8 chữ số là {v:.8f}, trang ghi 0,00000095')
    if 2 ** 10 != 1024:
        fails.append('2.6: 2¹⁰ phải bằng 1024')
    need('2.6 gradient nổ', '<b>1.024</b>')

    # 2.7 — Newton tìm căn 2
    x = 1.0
    seq = [x]
    for _ in range(4):
        x = x - (x * x - 2) / (2 * x)
        seq.append(x)
    for i, val in enumerate(seq):
        num(f'2.7 Newton bước {i}', val, 10)
    if abs(seq[-1] - math.sqrt(2)) > 1e-9:
        fails.append('2.7: Newton phải hội tụ về căn 2')
    # đáy của x⁴−3x² nằm ở căn 1,5
    num('2.7 đáy x⁴−3x²', math.sqrt(1.5), 4)

    # 2.8 — đạo hàm hai hàm mất mát
    xx, yy, w = 2.0, 5.0, 1.0
    if (w * xx - yy) ** 2 != 9 or 2 * xx * (w * xx - yy) != -12:
        fails.append('2.8: MSE một điểm phải là 9 và đạo hàm −12')
    need('2.8 MSE', '<b>9</b>')
    need('2.8 đạo hàm MSE', '<b>−12</b>')
    z = w * xx
    num('2.8 σ(2)', sig(z), 4)
    num('2.8 đạo hàm log-loss', (sig(z) - 1) * xx, 4, ctx='<b>')


# ───────────────────────────── xác suất & thống kê ───────────────────────────
def C(n, k):
    return math.comb(n, k)


def binom(n, k, p):
    return C(n, k) * p ** k * (1 - p) ** (n - k)


def tpdf(x, df):
    lc = math.lgamma((df + 1) / 2) - 0.5 * math.log(df * math.pi) - math.lgamma(df / 2)
    return math.exp(lc - (df + 1) / 2 * math.log1p(x * x / df))


def tcdf(t, df, n=2000):
    """Simpson trên [0, |t|] — hàm mật độ trơn nên 2.000 điểm là quá đủ."""
    a, b = 0.0, abs(t)
    if b == 0:
        return 0.5
    h = (b - a) / n
    s = tpdf(a, df) + tpdf(b, df)
    for i in range(1, n):
        s += (4 if i % 2 else 2) * tpdf(a + i * h, df)
    area = h / 3 * s
    return 0.5 + area if t > 0 else 0.5 - area


def tcrit(conf, df):
    lo, hi = 0.0, 80.0
    for _ in range(60):
        m = (lo + hi) / 2
        if tcdf(m, df) < 1 - (1 - conf) / 2:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


def run_stats():
    # 3.1–3.2
    num('3.1 P(6)', 1 / 6 * 100, 1, ctx='<b>')
    if C(2, 1) * 0 + sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == 7) != 6:
        fails.append('3.1: tổng 7 phải có 6 cách trên 36')
    need('3.1 tổng 7', '<b>6 cách</b>')
    num('3.2 hai mặt 6', 1 / 36 * 100, 1)
    num('3.2 hai bi đỏ', 3 / 5 * 2 / 4 * 100, 0, ctx='<b>')

    # 3.4 Bayes
    prev, sens, spec = 0.001, 0.99, 0.99
    post = prev * sens / (prev * sens + (1 - prev) * (1 - spec))
    num('3.4 hậu nghiệm', post * 100, 1, ctx='<b>9,0%</b>'[:3])
    need('3.4 kết quả', '<b>9,0%</b>')
    need('3.4 một trên mười một', '<b>1 trên 11</b>')
    fp = (1 - prev) * (1 - spec) * 1000
    if not 9.9 <= fp <= 10.0:
        fails.append(f'3.4: dương giả trên 1.000 là {fp:.2f}, trang nói "10 bạn"')
    post10 = 0.1 * sens / (0.1 * sens + 0.9 * (1 - spec))
    num('3.4 hậu nghiệm khi prev=10%', post10 * 100, 1, ctx='<b>')
    need('3.4 số học prev=10%', '99/108')
    if round(99 / 108 * 1000) / 10 != round(post10 * 1000) / 10:
        fails.append('3.4: 99/108 phải khớp con số hậu nghiệm khi prev = 10%')

    # 3.5 naive Bayes
    ns, nh = 0.4 * 0.6 * 0.1, 0.6 * 0.02 * 0.5
    num('3.5 tử số rác', ns, 3, ctx='<b>')
    num('3.5 tử số thật', nh, 3, ctx='<b>')
    num('3.5 tổng', ns + nh, 3)
    num('3.5 hậu nghiệm', ns / (ns + nh) * 100, 0, ctx='rác: ')

    # 3.7 nhị thức
    if C(10, 5) != 252:
        fails.append('3.7: C(10,5) phải là 252')
    need('3.7 số cách', '252 cách')
    num('3.7 P(5 ngửa)', binom(10, 5, 0.5) * 100, 1, ctx='<b>')
    num('3.7 P(10 ngửa)', binom(10, 10, 0.5) * 100, 3, ctx='<b>')
    pge8 = sum(binom(10, k, 0.5) for k in (8, 9, 10))
    num('3.7 P(≥8)', pge8 * 100, 2)
    need('3.7 mẫu số', '1.024')
    num('3.7 độ lệch chuẩn', math.sqrt(10 * 0.25), 2, ctx='lệch chuẩn ')

    # 3.8 phân phối chuẩn
    for k, d in [(1, 2), (2, 2), (3, 2), (1.96, 2)]:
        p = (N.cdf(k) - N.cdf(-k)) * 100
        num(f'3.8 ±{k}σ', p, d, ctx='<b>')
    lo, hi = 168 - 6, 168 + 6
    if (lo, hi) != (162, 174):
        fails.append('3.8: μ±σ với 168±6 phải là 162–174')
    need('3.8 khoảng một sigma', '162–174 cm')
    one_tail = 1 - N.cdf(3)
    if not 735 <= 1 / one_tail <= 745:
        fails.append(f'3.8: trên μ+3σ là 1 trên {1/one_tail:.0f}, trang nói 740')
    need('3.8 một trên 740', '1 trên 740')

    # 3.9 kỳ vọng & phương sai
    vals = range(1, 7)
    ev = sum(vals) / 6
    var = sum((v - ev) ** 2 for v in vals) / 6
    num('3.9 kỳ vọng', ev, 1, ctx='<b>3,5</b>'[:3])
    need('3.9 kỳ vọng', '<b>3,5</b>')
    num('3.9 phương sai', var, 4, ctx='<b>')
    num('3.9 độ lệch chuẩn', math.sqrt(var), 3, ctx='<b>')
    if abs(var - 35 / 12) > 1e-12:
        fails.append('3.9: phương sai xúc xắc phải là 35/12')
    need('3.9 phân số', '35/12')

    # 3.10 tương quan
    hh = [120, 125, 130, 135, 140, 145, 150, 155]
    ww = [22, 25, 26, 30, 31, 35, 38, 40]
    n = len(hh)
    mh, mw = sum(hh) / n, sum(ww) / n
    shh = sum((a - mh) ** 2 for a in hh)
    sww = sum((a - mw) ** 2 for a in ww)
    shw = sum((a - mh) * (b - mw) for a, b in zip(hh, ww))
    r = shw / math.sqrt(shh * sww)
    num('3.10 hiệp phương sai', shw / (n - 1), 1, ctx='<b>')
    if round(r, 2) != 0.99:
        fails.append(f'3.10: r = {r:.4f}, trang nói 0,99')
    need('3.10 r', '<b>r = 0,99</b>')

    # 4.2 giới hạn trung tâm
    sd_dice = math.sqrt(35 / 12)
    num('4.2 σ/√30', sd_dice / math.sqrt(30), 3, ctx='<b>')

    # 4.3 MLE
    for p, want_pct in [(0.5, 11.7), (0.7, 26.7), (0.9, 5.7)]:
        got = binom(10, 7, p) * 100
        if abs(got - want_pct) > 0.05:
            fails.append(f'4.3: P(7 ngửa | p={p}) = {got:.2f}%, trang nói {want_pct}%')
        num(f'4.3 hợp lý p={p}', got, 1)
    D = [167, 170, 172, 169, 177]
    m = sum(D) / len(D)
    sd_mle = math.sqrt(sum((v - m) ** 2 for v in D) / len(D))
    sd_unb = math.sqrt(sum((v - m) ** 2 for v in D) / (len(D) - 1))
    num('4.3 μ̂', m, 1, ctx='<b>μ̂ = ')
    num('4.3 σ̂ chia n', sd_mle, 2, ctx='<b>σ̂ = ')
    num('4.3 σ chia n−1', sd_unb, 2)

    # 4.6 khoảng tin cậy
    nn, xb, s = 100, 170.0, 8.0
    se = s / math.sqrt(nn)
    num('4.6 sai số chuẩn', se, 1, ctx='8/√100 = <b>')
    num('4.6 nửa khoảng', 1.96 * se, 2, ctx='± ')
    lo, hi = xb - 1.96 * se, xb + 1.96 * se
    need('4.6 khoảng', '[168,4; 171,6]')
    if round(lo, 1) != 168.4 or round(hi, 1) != 171.6:
        fails.append(f'4.6: khoảng tính ra [{lo:.1f}; {hi:.1f}]')
    t99 = tcrit(0.95, nn - 1)
    num('4.6 t* df=99', t99, 3, ctx='t* = ')
    gap99 = (t99 - 1.96) / 1.96 * 100
    if not 1.0 <= gap99 <= 1.4:
        fails.append(f'4.6: t* df=99 chênh z {gap99:.2f}%, trang nói 1,2%')
    t4 = tcrit(0.95, 4)
    num('4.6 t* df=4', t4, 3, ctx='t* = ')
    gap4 = (t4 - 1.96) / 1.96 * 100
    if not 41 <= gap4 <= 43:
        fails.append(f'4.6: t* df=4 chênh z {gap4:.1f}%, trang nói 42%')
    need('4.6 chênh 42%', '<b>42%</b>')

    # 4.7 A/B test
    nA = nB = 1000
    cA, cB = 100, 130
    pp = (cA + cB) / (nA + nB)
    se2 = math.sqrt(pp * (1 - pp) * (1 / nA + 1 / nB))
    z = (cB / nB - cA / nA) / se2
    pv = 2 * (1 - N.cdf(abs(z)))
    num('4.7 p-value', pv * 100, 1, ctx='<b>')
    num('4.7 p-value dạng thập phân', pv, 3, ctx='<b>')
    seU = math.sqrt(0.1 * 0.9 / nA + 0.13 * 0.87 / nB)
    num('4.7 CI dưới', (0.03 - 1.96 * seU) * 100, 1, ctx='[')
    num('4.7 CI trên', (0.03 + 1.96 * seU) * 100, 1)
    if not 2.09 <= z <= 2.11:
        fails.append(f'4.7: z = {z:.4f}')

    # 4.8 nhiều so sánh
    for k, d in [(20, 1), (100, 1)]:
        num(f'4.8 {k} kiểm định', (1 - 0.95 ** k) * 100, d, ctx='<b>')

    # ── hằng số nằm trong JS của các mô hình ──────────────────────────────────
    # Mô hình 15 phải dùng ĐÚNG bộ dữ liệu mà mục 4.3 kể, nếu không hai chỗ nói
    # hai chuyện: bài viết bảo μ̂ = 171 mà mô hình lại đặt đỉnh ở chỗ khác.
    need('mô hình 15 dùng đúng dữ liệu của mục 4.3', 'DATA = [167, 170, 172, 169, 177]')
    # Mô hình 16 in ra phân vị chuẩn mà t* tiến tới khi n lớn — phải là phân vị thật.
    for conf, lbl in [(0.95, '1,960'), (0.99, '2,576'), (0.80, '1,282')]:
        z = N.inv_cdf(1 - (1 - conf) / 2)
        if vi(z, 3) != lbl:
            fails.append(f'mô hình 16: phân vị chuẩn cho mức {conf} là {vi(z, 3)}, JS ghi {lbl}')
        need(f'mô hình 16 phân vị {conf}', "'" + lbl + "'")


def assert_close(label, got, want, tol=1e-9):
    global checks
    checks += 1
    if got is None or len(got) != len(want) or any(abs(a - b) > tol for a, b in zip(got, want)):
        fails.append(f'{label}: tính ra {got}, phải là {want}')


def main():
    global HTML
    if not PAGE.exists():
        print('verify-math: không thấy %s' % PAGE.name)
        return 1
    HTML = PAGE.read_text(encoding='utf-8')
    run_algebra()
    run_calculus()
    run_stats()
    print()
    if fails:
        print('verify-math: %d con số KHÔNG khớp (trên %d phép kiểm):' % (len(fails), checks))
        for f in fails:
            print('    %s' % f)
        return 1
    print('verify-math: OK — %d phép kiểm, mọi con số trong trang đều tính lại được.' % checks)
    return 0


HTML = ''
if __name__ == '__main__':
    sys.exit(main())
