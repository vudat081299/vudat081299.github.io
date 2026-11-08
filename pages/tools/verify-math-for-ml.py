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
Riêng câu nhắc tự sinh của mô hình 8 và 9 thì cổng chạy chính JS của trang bằng node
(xem run_js_models); CI có node, máy cục bộ cần node trong PATH.

Chạy:  python3 pages/tools/verify-math-for-ml.py
Exit code: 1 nếu có con số không khớp.
"""
import math
import pathlib
import sys
from itertools import combinations
from statistics import NormalDist

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'mathematics-for-machine-learning.html'
PAGES = ['pages/mathematics-for-machine-learning.html']  # run-verify.py đọc dòng này để biết cổng kiểm trang nào
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
def claim(label, ok, why=''):
    """Đòi một LUẬT phải đúng, không phải một chuỗi phải có mặt. Dùng cho những
    khẳng định mà bài phát biểu bằng lời — ví dụ (AB)ᵀ = BᵀAᵀ. need() bắt được
    chuyện ai sửa con số; claim() bắt được chuyện chính cái luật bị viết sai."""
    global checks
    checks += 1
    if not ok:
        fails.append(f'{label}: {why or "luật trong bài không đúng"}')


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


def T(M):
    """Chuyển vị: đổi chỗ hai chỉ số."""
    return [list(r) for r in zip(*M)]


def matmul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))]
            for i in range(len(A))]


def mono(M):
    """Ma trận nguyên, viết đúng lối trang dùng trong <span class="mono">."""
    return '[[' + '],['.join(','.join(str(x) for x in r) for r in M) + ']]'


def mxspans(M):
    """Ma trận trong khối .mx: mỗi ô một <span>, đọc theo hàng."""
    return ''.join(f'<span>{x}</span>' for r in M for x in r)


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
    # det 3×3 tính bằng khử: chỉ trừ bội của hàng khác thì det = tích các trụ
    def det3(M):
        return (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
                - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
                + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]))
    claim('1.3 det = tích các trụ', det3(A3) == 1 * 1 * 1 and det3(dep) == 0,
          f'det bảng táo–chuối–cam = {det3(A3)}, bảng hạng 2 = {det3(dep)}')
    need('1.3 det bảng đủ tin', 'có ba trụ bằng 1, nên det = 1')
    need('1.3 det bảng hạng 2', 'thành toàn 0, nên det = 0')
    h3 = [a - 2 * b for a, b in zip(dep[2] + [21], dep[0] + [9])]
    h2 = [a - b for a, b in zip(dep[1] + [12], dep[0] + [9])]
    claim('1.3 bước khử bội 2', h3 == h2 == [0, 1, 0, 3], f'H3 − 2·H1 = {h3}, H2 − H1 = {h2}')
    need('1.3 bước khử bội 2 trong bài', 'Hàng 3 trừ 2 lần hàng 1 còn (0, 1, 0 | 3)')
    if 9 + 12 != 21:
        fails.append('1.3: 21 phải bằng 9 + 12')
    # hạng 3 chỉ nói "nhiều nhất một bộ giá": tờ thứ tư cãi nhau thì hệ vô nghiệm
    A4 = A3 + [[1, 1, 1]]
    claim('1.3 tờ thứ tư cãi nhau',
          rank(A4) == 3 and rank([r + [t] for r, t in zip(A4, [9, 12, 14, 10])]) == 4,
          'tờ "1 táo, 1 chuối, 1 cam, hết 10 nghìn" phải giữ hạng 3 mà làm hệ vô nghiệm')
    need('1.3 tờ thứ tư', 'hết 10 nghìn&rdquo; trong khi tờ một ghi 9')

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
    # luật hàng nhân cột, in thành ví dụ tính tay; và chữ "giãn" phải chỉ đúng máy giãn ngang
    need('1.6 luật hàng nhân cột', mxspans(prod))
    need('1.6 giãn ngang', '[[2,0],[0,1]]')
    if det2([[3, 6], [1, 2]]) != 0:
        fails.append('1.6: det [[3,6],[1,2]] phải bằng 0')

    # 1.8 — nghịch đảo
    M = [[3, 1], [1, 2]]
    dt = det2(M)
    inv = [[M[1][1] / dt, -M[0][1] / dt], [-M[1][0] / dt, M[0][0] / dt]]
    assert_close('1.8 nghịch đảo', [inv[0][0], inv[0][1], inv[1][0], inv[1][1]], [0.4, -0.2, -0.2, 0.6])
    need('1.8 det = 5', 'det A = 5')
    for cell in ['0,4', '−0,2', '0,6']:
        need('1.8 ô nghịch đảo ' + cell, '>' + cell + '<')
    # det không đo điều kiện: nhân 0,01 thì det nhỏ 10.000 lần mà số điều kiện (M đối xứng:
    # trị riêng lớn / trị riêng nhỏ) giữ nguyên
    Ms = [[x / 100 for x in r] for r in M]
    eb, es = eig2(*M[0], *M[1]), eig2(*Ms[0], *Ms[1])
    claim('1.8 det không đo điều kiện',
          abs(det2(Ms) - det2(M) / 10000) < 1e-12 and abs(eb[0] / eb[1] - es[0] / es[1]) < 1e-9,
          'nhân 0,01: det phải nhỏ đi 10.000 lần, số điều kiện phải giữ nguyên')
    need('1.8 ví dụ nhân 0,01', 'với 0,01 thì det nhỏ đi 10.000 lần')

    # 1.9 — trị riêng
    lam = eig2(3, 1, 1, 3)
    assert_close('1.9 trị riêng [[3,1],[1,3]]', list(lam), [4, 2])
    need('1.9 λ = 4', '<b>4 lần</b>')
    need('1.9 λ = 2', '<b>2 lần</b>')
    # vì sao det(A − λI) = 0, giải tay cho đúng máy mặc định
    need('1.9 phương trình đặc trưng', '(3 \u2212 λ)² \u2212 1 = 0')
    for lm, v in [(4, (1, 1)), (2, (1, -1))]:
        Ml = [[3 - lm, 1], [1, 3 - lm]]
        claim(f'1.9 (A − {lm}I)v = 0', det2(Ml) == 0 and all(r[0] * v[0] + r[1] * v[1] == 0 for r in Ml),
              f'v = {v} phải thoả (A − {lm}I)v = 0 và hệ ấy phải suy biến')
    need('1.9 tìm v cho λ = 4', mono([[3 - 4, 1], [1, 3 - 4]]).replace('-', '\u2212') + '</span>v = 0')
    need('1.9 v cho λ = 4', 'nên v₂ = v₁ và v = (1, 1)')
    need('1.9 v cho λ = 2', 'nên v = (1, \u22121)')
    # λ được phép âm: máy gương lật (1, −1)
    claim('1.9 gương có λ = −1', eig2(0, 1, 1, 0) == (1.0, -1.0), 'máy gương phải có trị riêng 1 và −1')
    need('1.9 gương', 'vector riêng với λ = \u22121')
    # không đối xứng: đủ hai hướng riêng nhưng không vuông góc
    ns = eig2(2, 1, 0, 3)
    va, vb = (1, ns[0] - 2), (1, ns[1] - 2)
    lech = math.degrees(math.acos((va[0] * vb[0] + va[1] * vb[1]) / (math.hypot(*va) * math.hypot(*vb))))
    claim('1.9 không đối xứng', ns == (3.0, 2.0) and abs(lech - 45) < 1e-9,
          '[[2,1],[0,3]] phải có trị riêng 3 và 2, hai hướng riêng lệch nhau 45°')
    need('1.9 ví dụ không đối xứng', '[[2,1],[0,3]]')
    need('1.9 lệch 45°', 'hai hướng ấy lệch nhau 45°')

    # 1.10 — PCA trên đúng 10 điểm của bảng
    X = [(1, 2), (2, 3), (3, 5), (4, 4), (5, 7), (6, 6), (7, 9), (8, 8), (9, 11), (10, 10)]
    n = len(X)
    mx = sum(p[0] for p in X) / n
    my = sum(p[1] for p in X) / n
    assert_close('1.10 trung bình', [mx, my], [5.5, 6.5])
    sxx = sum((p[0] - mx) ** 2 for p in X) / (n - 1)
    syy = sum((p[1] - my) ** 2 for p in X) / (n - 1)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in X) / (n - 1)
    l1, l2 = eig2(sxx, sxy, sxy, syy)
    num('1.10 λ1', l1, 2)
    num('1.10 λ2', l2, 2)
    num('1.10 giữ lại được', l1 / (l1 + l2) * 100, 1, ctx='<b>')
    r = sxy / math.sqrt(sxx * syy)
    num('1.10 tương quan', r, 2, ctx='r = ')
    # trục chính nằm đúng 45° vì hai phương sai bằng nhau
    ang = math.degrees(math.atan2(1, 1))
    if abs(ang - 45) > 1e-9 or abs(sxx - syy) > 1e-9:
        fails.append('1.10: trục chính chỉ đúng 45° khi hai phương sai bằng nhau')
    need('1.10 góc trục', 'đúng 45°')
    ratio = l1 / l2
    if not 39.5 <= ratio <= 40.5:
        fails.append(f'1.10: tỉ số λ1/λ2 = {ratio:.2f}, trang nói "40 lần"')
    need('1.10 gấp 40 lần', '<b>40 lần</b>')
    # ma trận hiệp phương sai in ra trang: tổng bình phương, tổng tích, dạng [[a,b],[b,a]]
    Sxx = sum((p[0] - mx) ** 2 for p in X)
    Syy = sum((p[1] - my) ** 2 for p in X)
    Sxy = sum((p[0] - mx) * (p[1] - my) for p in X)
    claim('1.10 dạng [[a,b],[b,a]]', abs(Sxx - Syy) < 1e-9, 'hai tổng bình phương phải bằng nhau')
    need('1.10 ma trận hiệp phương sai', ''.join('<span>' + vi(v, 1) + '</span>' for v in (Sxx, Sxy, Sxy, Syy)))
    claim('1.10 λ = (a ± b)/(n − 1)',
          abs(l1 - (Sxx + Sxy) / (n - 1)) < 1e-9 and abs(l2 - (Sxx - Sxy) / (n - 1)) < 1e-9,
          'trị riêng của [[a,b],[b,a]] phải là a + b và a − b')
    need('1.10 λ1 phân số', '= %d/9' % round(Sxx + Sxy))
    need('1.10 λ2 phân số', '= %d/9' % round(Sxx - Sxy))
    # "0,40" đứng một mình thì trang có sẵn ở chỗ khác — đòi cả cặp để phép kiểm bắt được
    need('1.10 trị riêng chia n', 'ra ' + vi(l1 * (n - 1) / n) + ' và ' + vi(l2 * (n - 1) / n))
    # bóng lên trục 1: phương sai của mười cái bóng đúng bằng λ1
    z = [((p[0] - mx) + (p[1] - my)) / math.sqrt(2) for p in X]
    num('1.10 bóng bạn 1', z[0], 2)
    def var_dir(a, b):
        return sum((a * (p[0] - mx) + b * (p[1] - my)) ** 2 for p in X) / (n - 1)
    r2 = 1 / math.sqrt(2)
    num('1.10 uᵀCu trục x', var_dir(1, 0), 2, ctx='<b>')
    num('1.10 uᵀCu hướng −45°', var_dir(r2, -r2), 2, ctx='cho 4/9 ≈ <b>')
    num('1.10 uᵀCu hướng 45°', var_dir(r2, r2), 2, ctx='cho 161/9 ≈ <b>')
    claim('1.10 khai triển uᵀCu', abs(2 * Sxy - 157) < 1e-9 and abs(Sxx - 82.5) < 1e-9,
          'Σdx² phải là 82,5 và 2·Σdx·dy phải là 157')
    need('1.10 khai triển trong bài', '82,5a² + 157ab + 82,5b² = 82,5 + 157ab')
    best = max(range(0, 360), key=lambda d: var_dir(math.cos(math.radians(d)), math.sin(math.radians(d))))
    claim('1.10 hướng tãi rộng nhất là u₁', best in (45, 225) and abs(var_dir(r2, r2) - l1) < 1e-9,
          f'quét mọi hướng: rộng nhất ở {best}°, phải là 45° và bằng λ1')
    claim('1.10 phương sai của bóng = λ1', abs(sum(t * t for t in z) / (n - 1) - l1) < 1e-9,
          'phương sai của bóng lên trục 1 phải bằng λ1')
    # quên trừ trung bình thì trục 1 lệch khỏi 45°
    Rxx = sum(p[0] ** 2 for p in X)
    Ryy = sum(p[1] ** 2 for p in X)
    Rxy = sum(p[0] * p[1] for p in X)
    lr = eig2(Rxx, Rxy, Rxy, Ryy)[0]
    vx, vy = Rxy, lr - Rxx
    nr = math.hypot(vx, vy)
    need('1.10 quên trừ trung bình', '(' + vi(vx / nr) + '; ' + vi(vy / nr) + ')')

    # ── 1.7 chuyển vị ────────────────────────────────────────────────────────
    # Lật bảng: hàng thành cột. Kiểm cả chuỗi hiển thị lẫn CHÍNH LUẬT mà mục dạy.
    A23 = [[1, 2, 3], [4, 5, 6]]
    need('1.7 A cỡ 2×3', mxspans(A23), A23)
    need('1.7 Aᵀ cỡ 3×2', mxspans(T(A23)), T(A23))
    claim('1.7 lật hai lần', T(T(A23)) == A23, '(Aᵀ)ᵀ phải bằng A')
    claim('1.7 cỡ đổi chỗ', (len(T(A23)), len(T(A23)[0])) == (len(A23[0]), len(A23)),
          'm×n phải lật thành n×m')

    # det(Aᵀ) = det(A) — lật không đổi hệ số phóng diện tích
    Ad = [[3, 1], [4, 2]]
    num('1.7 det A', det2(Ad), 0, ctx='det = 3·2 \u2212 1·4 = <b>')
    num('1.7 det Aᵀ', det2(T(Ad)), 0, ctx='det = 3·2 \u2212 4·1 = <b>')
    claim('1.7 det bất biến', det2(Ad) == det2(T(Ad)), 'det(Aᵀ) phải bằng det(A)')

    # (AB)ᵀ = BᵀAᵀ, còn AᵀBᵀ thì KHÁC — chỗ mục này nói ai cũng nhớ sai lần đầu
    A2, B2 = [[1, 2], [3, 4]], [[5, 6], [7, 8]]
    AB = matmul(A2, B2)
    need('1.7 AB', mono(AB), AB)
    need('1.7 (AB)ᵀ', mono(T(AB)), T(AB))
    need('1.7 BᵀAᵀ', mono(matmul(T(B2), T(A2))), matmul(T(B2), T(A2)))
    need('1.7 AᵀBᵀ (khác)', mono(matmul(T(A2), T(B2))), matmul(T(A2), T(B2)))
    claim('1.7 đảo thứ tự', matmul(T(B2), T(A2)) == T(AB),
          '(AB)ᵀ = BᵀAᵀ không đúng với ví dụ đang in trong bài')
    claim('1.7 phản chứng', matmul(T(A2), T(B2)) != T(AB),
          'ví dụ phản chứng vô dụng — AᵀBᵀ lại trùng (AB)ᵀ')

    # aᵀb ra một SỐ, abᵀ ra một MA TRẬN
    av, bv = [2, 3], [4, 5]
    num('1.7 aᵀb', sum(x * y for x, y in zip(av, bv)), 0, ctx='2·4 + 3·5 = <b>')
    outer = [[x * y for y in bv] for x in av]
    need('1.7 abᵀ', mono(outer), outer)

    # XᵀX: vuông theo số đặc trưng, và luôn đối xứng
    Xg = [[1, 2], [3, 1], [2, 4]]
    G = matmul(T(Xg), Xg)
    need('1.7 X cỡ 3×2', mxspans(Xg), Xg)
    need('1.7 XᵀX', mxspans(G), G)
    claim('1.7 XᵀX đối xứng', G == T(G), 'XᵀX phải đối xứng')
    claim('1.7 XᵀX vuông', len(G) == len(G[0]) == len(Xg[0]),
          'XᵀX phải vuông theo số đặc trưng')

    # hình mà mô hình 4 gán nhãn "đối xứng 3×3" phải thật sự đối xứng
    SYM = [[4, 1, 2], [1, 5, 3], [2, 3, 6]]
    claim('mô hình 4 nhãn đối xứng', SYM == T(SYM),
          'hình gán nhãn "đối xứng 3×3" nhưng lật ra khác')


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
    claim("2.2 σ' = e⁻ˣ/(1 + e⁻ˣ)² = σ(1 − σ)",
          all(abs(math.exp(-t) / (1 + math.exp(-t)) ** 2 - sig(t) * (1 - sig(t))) < 1e-12
              and abs(math.exp(-t) / (1 + math.exp(-t)) - (1 - sig(t))) < 1e-12 for t in (-3, -0.5, 0, 1, 4)),
          'hai bước suy đạo hàm sigmoid phải đúng tại mọi x')
    need("2.2 suy σ'", 'σ′ = e⁻ˣ/(1 + e⁻ˣ)²')
    need("2.2 suy σ' bước cuối", 'e⁻ˣ/(1 + e⁻ˣ) = 1 − 1/(1 + e⁻ˣ) = 1 − σ')

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
    # 2.4 — vì sao ∇f là hướng dốc nhất: dốc theo hướng ∇f bằng ‖∇f‖, hơn cả hai trục
    num('2.4 dốc theo ∇f', math.hypot(4, 6), 2, ctx='√(4² + 6²) ≈ ')
    claim('2.4 dốc nhất theo ∇f', math.hypot(4, 6) > max(grad),
          'dốc theo hướng ∇f phải lớn hơn dốc dọc từng trục')
    # 2.4 — Hessian: dấu các trị riêng phân loại điểm dừng, và nhìn hai trục là chưa đủ
    assert_close('2.4 Hessian của x² − y²', eig2(2, 0, 0, -2), (2, -2))
    assert_close('2.4 Hessian của x² + 3xy + y²', eig2(2, 3, 3, 2), (5, -1))
    q = lambda x, y: x * x + 3 * x * y + y * y
    claim('2.4 x² + 3xy + y² là yên ngựa', q(1, 0) > 0 and q(0, 1) > 0 and q(1, -1) < 0,
          'phải cong lên dọc hai trục mà cong xuống dọc y = −x')
    need('2.4 trị riêng yên ngựa', 'trị riêng 2 và −2')
    need('2.4 trị riêng yên ngựa xoay', 'trị riêng 2 + 3 = 5 và 2 − 3 = −1')
    # từng ô của Hessian bằng sai phân bậc hai, và ∇f = 0 tại gốc (chỗ phép thử được dùng)
    e = 1e-4
    hxx = (q(e, 0) - 2 * q(0, 0) + q(-e, 0)) / e ** 2
    hyy = (q(0, e) - 2 * q(0, 0) + q(0, -e)) / e ** 2
    hxy = (q(e, e) - q(e, -e) - q(-e, e) + q(-e, -e)) / (4 * e * e)
    assert_close('2.4 Hessian từng ô', [hxx, hxy, hyy], [2, 3, 2], tol=1e-5)
    need('2.4 bước tính Hessian', '∂f/∂x = 2x + 3y, lấy tiếp theo x được 2, theo y được 3')
    need('2.4 bước tính Hessian 2', '∂f/∂y = 3x + 2y, lấy tiếp theo x được 3, theo y được 2')
    # x² + 3y² tại (2, 1): Hessian dương mà không phải đáy, vì ∇f ≠ 0 — nên câu điều kiện phải có
    claim('2.4 Hessian dương chưa đủ', grad != (0, 0) and min(eig2(2, 0, 0, 6)) > 0,
          'x² + 3y² tại (2, 1) phải có Hessian dương mà gradient khác 0')
    need('2.4 điều kiện ∇f = 0', 'Phép thử chỉ dùng tại chỗ <b>∇f = 0</b>')
    need('2.4 trị riêng 0 chưa kết luận', 'có trị riêng bằng 0 thì chưa kết luận được, y như f″ = 0 ở mục 2.3')

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
    # 2.5 — ngưỡng của mô hình 9, đọc trên thanh trượt (bước 0,01). Theo trục y, mỗi bước
    # nhân chỗ đứng với (1 − 6α) trên cái bát và (1 − 24α) trên máng hẹp.
    grid = [k / 100 for k in range(1, 61)]
    zig_bat = next(a for a in grid if 1 - 6 * a < 0)
    div_bat = next(a for a in grid if abs(1 - 6 * a) > 1)
    div_mang = next(a for a in grid if abs(1 - 24 * a) > 1)
    need('2.5 bát zíc-zắc', f'từ <b>{vi(zig_bat)}</b> đường đi bắt đầu zíc-zắc', zig_bat)
    need('2.5 bát phân kỳ', f'từ <b>{vi(div_bat)}</b> thì <b>phân kỳ</b>', div_bat)
    need('2.5 máng phân kỳ', f'phân kỳ ngay từ <b>{vi(div_mang)}</b>', div_mang)
    need('2.5 ngưỡng bát', 'α tới 1/3 ≈ ' + vi(1 / 3))
    need('2.5 ngưỡng máng', 'α vượt 1/12 ≈ ' + vi(1 / 12, 3))
    # 2.5 — câu nhắc tự sinh của mô hình 8 và 9: chạy chính JS của trang (run_js_models).
    run_js_models()

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
    W, gL = [[1, 2], [3, 4]], [1, 2]
    by_path = [sum(W[i][j] * gL[i] for i in range(2)) for j in range(2)]   # nhân dọc từng đường rồi cộng
    WTg = [r[0] for r in matmul(T(W), [[gL[0]], [gL[1]]])]
    claim('2.6 cộng các đường = Wᵀg', by_path == WTg == [7, 10], f'theo đường {by_path}, Wᵀg {WTg}')
    need('2.6 ∂L/∂x₁', '∂L/∂x₁ = 1·1 + 3·2 = 7')
    need('2.6 ∂L/∂x₂', '∂L/∂x₂ = 2·1 + 4·2 = 10')
    need('2.6 Wᵀ trong khối công thức', mxspans(T(W)))
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
        num(f'2.7 Newton bước {i}', val, 12)
    if abs(seq[-1] - math.sqrt(2)) > 1e-9:
        fails.append('2.7: Newton phải hội tụ về căn 2')
    # đáy của x⁴−3x² nằm ở căn 1,5
    num('2.7 đáy x⁴−3x²', math.sqrt(1.5), 4)
    # 2.7 — cột "chữ số thập phân đúng": k lớn nhất để |x − √2| ≤ 0,5·10⁻ᵏ, cắt ở 12
    # chữ số đang hiện; bước 4 đúng 11 chữ số, nên bảng phải in đủ 12.
    x = 1.0
    ks = []
    for i in range(5):
        k = min(12, max(0, math.floor(-math.log10(2 * abs(x - math.sqrt(2))))))
        cell = (f'<td>{vi(x, 12)}</td><td>{k}</td>' if i < 4
                else f'<td><b>{vi(x, 12)}</b></td><td><b>{k}</b></td>')
        need(f'2.7 chữ số đúng bước {i}', cell, k)
        ks.append(k)
        x = x - (x * x - 2) / (2 * x)
    need('2.7 gần gấp đôi', 'gần gấp đôi mỗi bước</b> (%d → %d → %d)' % tuple(ks[2:]), ks[2:])
    need('2.7 mười một chữ số', 'tới mười một chữ số')
    # 2.7 — vùng hỏng của Newton trên x⁴ − 3x², chạy đúng vòng lặp của mô hình 11
    # (độ cong dưới 0,05 thì chia cho ±0,05). Lời gợi ý của mô hình nói vùng ấy.
    def newton_m11(x0, steps=60):
        x = x0
        for _ in range(steps):
            h = 12 * x * x - 6
            if abs(h) < 0.05:
                h = 0.05 if h >= 0 else -0.05
            x = x - (4 * x ** 3 - 6 * x) / h
        return x
    hong = [k / 100 for k in range(-200, 201)
            if abs(newton_m11(k / 100) - math.copysign(math.sqrt(1.5), k / 100)) > 1e-6]
    rong = max(abs(v) for v in hong) if hong else None
    claim('2.7 vùng hỏng của Newton', rong == 0.70,
          f'Newton phải chỉ hỏng khi |x0| ≤ 0,70, tính ra tới {rong}')
    nhay = 0.71 - (4 * 0.71 ** 3 - 6 * 0.71) / 0.05
    claim('2.7 sát ±0,71 thì nhảy xa', abs(nhay) > 10, f'x0 = 0,71 nhảy tới {nhay}')
    # Chia vùng hỏng cho đúng như lời gợi ý: leo về đỉnh tới |x0| = 0,54; từ 0,55 tới 0,70 bước đầu nhảy
    # qua đỉnh và phần lớn lần dừng ở đáy bên kia (0,56 và 0,57 dội về cùng phía — lưu vực của Newton
    # không liền một khối).
    dinh = [k / 100 for k in range(0, 201) if abs(newton_m11(k / 100)) < 1e-6]
    ben_kia = [k / 100 for k in range(0, 201)
               if abs(newton_m11(k / 100) + math.sqrt(1.5)) < 1e-6]
    claim('2.7 leo về đỉnh tới đúng 0,54', dinh and max(dinh) == 0.54 and min(dinh) == 0.0,
          f'x0 về đỉnh: {dinh[:1]}…{dinh[-1:]}')
    claim('2.7 đáy bên kia chỉ trong 0,55–0,70, và là phần lớn', ben_kia and min(ben_kia) == 0.55
          and max(ben_kia) == 0.70 and len(ben_kia) > 16 / 2, f'đáy bên kia: {ben_kia}')
    need('2.7 vùng leo đỉnh', 'Trong khoảng từ −0,54 tới 0,54')
    need('2.7 vùng nhảy qua đỉnh', 'Từ 0,55 tới 0,70')
    need('2.7 nhảy xa', 'sát ±0,71')

    # 2.8 — đạo hàm hai hàm mất mát
    xx, yy, w = 2.0, 5.0, 1.0
    if (w * xx - yy) ** 2 != 9 or 2 * xx * (w * xx - yy) != -12:
        fails.append('2.8: MSE một điểm phải là 9 và đạo hàm −12')
    need('2.8 MSE', '<b>9</b>')
    need('2.8 đạo hàm MSE', '<b>−12</b>')
    z = w * xx
    num('2.8 σ(2)', sig(z), 4)
    num('2.8 đạo hàm log-loss', (sig(z) - 1) * xx, 4, ctx='<b>')
    # 2.8 — công thức log-loss viết trong bài, và phép rút gọn, kiểm bằng đạo hàm số
    need('2.8 công thức log-loss', 'L = −[y·ln p + (1 − y)·ln(1 − p)]')
    num('2.8 phạt khi tin p = 0,1', -math.log(0.1), 2, ctx='−ln 0,1 ≈ ')
    num('2.8 phạt khi tin p = 0,9', -math.log(0.9), 2, ctx='chỉ bị phạt ')
    L = lambda w_: -(yl * math.log(sig(w_ * xl)) + (1 - yl) * math.log(1 - sig(w_ * xl)))
    xl, yl = 2.0, 1.0
    so = (L(1 + 1e-6) - L(1 - 1e-6)) / 2e-6
    claim('2.8 rút gọn log-loss', abs(so - (sig(2) - 1) * 2) < 1e-6,
          f'đạo hàm số {so} không khớp (σ(z) − y)·x')
    pts = [(1, 2), (2, 5)]
    w_hat = sum(a * b for a, b in pts) / sum(a * a for a, _ in pts)
    Lw = lambda w_: sum((w_ * a - b) ** 2 for a, b in pts)
    claim('2.8 đáy của tổng bình phương', abs((Lw(w_hat + 1e-6) - Lw(w_hat - 1e-6)) / 2e-6) < 1e-6,
          f'w = {w_hat} phải làm L′(w) = 0')
    need('2.8 w = Σxy/Σx²', '(1·2 + 2·5)/(1 + 4) = 12/5 = ' + vi(w_hat, 1))
    need('2.8 phương trình chuẩn', '<b>X<sup>T</sup>Xw = X<sup>T</sup>y</b>')
    claim('2.8 quy đồng dL/dp', all(abs(-(yy / pp - (1 - yy) / (1 - pp)) - (pp - yy) / (pp * (1 - pp))) < 1e-12
                                     for pp in (0.1, 0.5, 0.88) for yy in (0, 1)),
          '−[y/p − (1 − y)/(1 − p)] phải bằng (p − y)/(p(1 − p))')
    need('2.8 bước dL/dp', 'dL/dp = −[y/p − (1 − y)/(1 − p)]')


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
    # "36, không phải 21": 21 là số cặp KHÔNG kể thứ tự — và chúng không đồng khả năng
    pairs = {tuple(sorted((a, b))) for a in range(1, 7) for b in range(1, 7)}
    claim('3.1 cặp không thứ tự', len(pairs) == C(6, 2) + 6 == 21, f'đếm được {len(pairs)} cặp')
    claim('3.1 {2,5} hai cách, {3,3} một cách',
          sum(1 for a in range(1, 7) for b in range(1, 7) if {a, b} == {2, 5}) == 2
          and sum(1 for a in range(1, 7) for b in range(1, 7) if (a, b) == (3, 3)) == 1)
    need('3.1 21', '36 cách rơi, không phải 21')
    need('3.1 21 trong GLOSS', '36 phần tử, không phải 21')
    num('3.2 hai mặt 6', 1 / 36 * 100, 1)
    num('3.2 hai bi đỏ', 3 / 5 * 2 / 4 * 100, 0, ctx='<b>')
    # "cơ" và "át" độc lập mà không loại trừ nhau: đếm trên bộ 52 lá
    deck = [(r_, su) for r_ in range(13) for su in range(4)]
    p_co = sum(1 for d in deck if d[1] == 0) / 52
    p_at = sum(1 for d in deck if d[0] == 0) / 52
    p_atco = sum(1 for d in deck if d == (0, 0)) / 52
    claim('3.2 át cơ', p_co == 1 / 4 and p_at == 1 / 13 and abs(p_co * p_at - p_atco) < 1e-15)
    need('3.2 át cơ', '1/4 × 1/13 = 1/52')

    # 3.3 lớp 30 bạn, 12 mang hộp màu, 8 trong số đó học vẽ
    num('3.3 có điều kiện', 8 / 12 * 100, 0, ctx='8/12 ≈ ')
    claim('3.3 gấp đôi 1/3', abs((8 / 12) / (10 / 30) - 2) < 1e-12)

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
    pboth = pge8 + sum(binom(10, k, 0.5) for k in (0, 1, 2))
    num('3.7 hai phía', pboth * 100, 1, ctx='hai đuôi: ')
    # cỡ của phép kiểm nhị thức n = 10 không bao giờ đúng bằng 5%: k ≥ 8 vượt, k ≥ 9 hụt xa
    tails = [sum(binom(10, j, 0.5) for j in range(k, 11)) for k in range(11)]
    claim('4.7 dữ liệu đếm không ra đúng α', 0.05 not in tails and tails[8] > 0.05 > tails[9],
          f'P(X ≥ 8) = {tails[8]}, P(X ≥ 9) = {tails[9]}')
    need('4.7 sai lầm loại I tối đa α', 'Xác suất tối đa là α: đúng bằng α khi thống kê kiểm định liên tục')
    # C(n, k) đếm tay ở cỡ nhỏ, và giai thừa của n = 10
    seqs = sorted(''.join(t) for t in {tuple('N' if i in c else 'S' for i in range(4)) for c in combinations(range(4), 2)})
    claim('3.7 sáu dãy 2 ngửa trong 4 lần', seqs == ['NNSS', 'NSNS', 'NSSN', 'SNNS', 'SNSN', 'SSNN'] and C(4, 2) == 24 // (2 * 2) == 6)
    need('3.7 sáu dãy', 'C(4, 2) = 24/(2·2) = 6 cách — NNSS, NSNS, NSSN, SNNS, SNSN, SSNN')
    claim('3.7 10!', math.factorial(10) == 3628800 and 3628800 // (120 * 120) == 252 and math.factorial(5) == 120)
    need('3.7 10!', '3.628.800/(120·120) = 252')
    need('3.7 mẫu số', '1.024')
    num('3.7 độ lệch chuẩn', math.sqrt(10 * 0.25), 2, ctx='lệch chuẩn ')
    claim('3.7 phương sai một lần tung', all(abs((1 - pp) ** 2 * pp + pp ** 2 * (1 - pp) - pp * (1 - pp)) < 1e-15
                                            for pp in (0.1, 0.5, 0.7)), 'phải ra p(1 − p)')
    need('3.7 bước phương sai', '(1 − p)²·p + (0 − p)²·(1 − p) = p(1 − p)')

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
    claim('3.9 tính tay 35/12', sum((v - ev) ** 2 for v in vals) == 17.5 and 2 * 6.25 + 2 * 2.25 + 2 * 0.25 == 17.5)
    need('3.9 tính tay', '(2·6,25 + 2·2,25 + 2·0,25)/6 = 17,5/6')
    # 3.7 dùng μ, σ trước 3.9: hộp định nghĩa ngắn ở đầu 3.7 phải đứng TRƯỚC mô hình 13 và
    # mang đúng số của xúc xắc mà 3.9 tính.
    num('3.7 hộp định nghĩa: σ xúc xắc', math.sqrt(var), 2, ctx='μ = 3,5 và σ ≈ ')
    box37, m13 = HTML.find('Ba chữ dùng từ đây, định nghĩa đủ ở mục 3.9'), HTML.find('id="m13"')
    claim('3.7 hộp định nghĩa đứng trước mô hình 13', 0 <= box37 < m13 and HTML.find('id="s-binom"') < box37,
          'hộp định nghĩa kỳ vọng / phương sai / σ phải nằm trong 3.7, trước mô hình 13')
    # 3.6 mật độ lớn hơn 1: đều trên [0; 0,5] thì cao 2 để diện tích bằng 1
    claim('3.6 mật độ 2', 2 * 0.5 == 1)
    need('3.6 mật độ 2', 'độ cao <b>2</b>')

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
    need('3.10 dữ liệu', ', '.join(f'{a}/{b}' for a, b in zip(hh, ww)))
    sh, sw = math.sqrt(shh / (n - 1)), math.sqrt(sww / (n - 1))
    num('3.10 Cov hai chữ số', shw / (n - 1), 2, ctx='Cov = ')
    num('3.10 σ cao', sh, 2, ctx='σ = ')
    num('3.10 σ nặng', sw, 2, ctx='cm và ')
    # phép chia in trong bài dùng số đã làm tròn — nó cũng phải ra 0,99
    claim('3.10 phép chia làm tròn', round(round(shw / (n - 1), 2) / (round(sh, 2) * round(sw, 2)), 2) == 0.99)

    # 4.2 giới hạn trung tâm
    sd_dice = math.sqrt(35 / 12)
    num('4.2 σ/√30', sd_dice / math.sqrt(30), 3, ctx='<b>')
    num('4.2 sai số ±3%', 1.96 * 0.5 / math.sqrt(1000) * 100, 1, ctx='1,96·0,5/√1.000 ≈ ')
    claim('4.2 gấp bốn mẫu thì sai số còn một nửa', round(1.96 * 0.5 / math.sqrt(4000) * 100, 1) == 1.5,
          '4.000 người phải cho ±1,5%')
    need('4.2 gấp bốn', 'Muốn ±1,5% thì phải hỏi gấp bốn, 4.000 người')
    need('4.2 tên sai số chuẩn', 'gọi là <b>sai số chuẩn</b> (standard error, SE) của trung bình')

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
    num('4.3 phương sai chia n−1', sum((v - m) ** 2 for v in D) / (len(D) - 1), 1, ctx='(ở đây ')

    # 4.5 MAP với tiên nghiệm Beta(a, a) — "như thể đã thấy trước a − 1 ngửa, a − 1 sấp"
    for a, d, ctx in [(2, 2, '(2 + 1)/(2 + 2) = <b>'), (11, 2, '(2 + 10)/(2 + 20) = ')]:
        k_, n_ = 2, 2
        num(f'4.5 MAP a={a}', (k_ + a - 1) / (n_ + 2 * a - 2), d, ctx=ctx)

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
    need('4.7 tỉ lệ gộp', f'{cA + cB}/2.000 = ' + vi(pp * 100, 1) + '%')
    num('4.7 SE gộp', se2 * 100, 2, ctx='<span class="op">≈</span> <b>')
    num('4.7 z trong khối công thức', z, 2, ctx='z = 3,0 / ' + vi(se2 * 100, 2) + ' = <b>')
    # 4.7 — bước z → p làm lại được: một đuôi 1 − Φ(z) với z giữ ba chữ số, nhân hai ra đúng p
    z3 = round(z, 3)
    tail = 1 - N.cdf(z3)
    num('4.7 z ba chữ số', z3, 3, ctx='z = ')
    num('4.7 một đuôi', tail, 4, ctx='1 − Φ(' + vi(z3, 3) + ') ≈ ')
    claim('4.7 hai đuôi từ một đuôi', vi(2 * round(tail, 4), 3) == vi(pv, 3),
          f'2·{round(tail, 4)} không ra {vi(pv, 3)}')
    need('4.7 lệnh Python', f'2*scipy.stats.norm.sf({z3})')
    need('4.7 lệnh Excel', f'=2*(1-NORM.S.DIST({z3},TRUE))')

    # 4.8 nhiều so sánh
    for k, d in [(20, 1), (100, 1)]:
        num(f'4.8 {k} kiểm định', (1 - 0.95 ** k) * 100, d, ctx='<b>')
    # 4.8 ý nghĩa thống kê ≠ ý nghĩa thực tế: 10 triệu mỗi bản, 10,00% so với 10,05%
    mm_ = 10 ** 7
    p1, p2 = 0.1000, 0.1005
    pg = (p1 + p2) / 2
    zz = (p2 - p1) / math.sqrt(pg * (1 - pg) * 2 / mm_)
    pz = 2 * (1 - N.cdf(zz))
    claim('4.8 ý nghĩa thực tế', pz < 0.001, f'p = {pz:.5f}')
    num('4.8 p', pz, 4, ctx='p ≈ ')
    need('4.8 ví dụ', '10,00% so với 10,05%')

    # ── hằng số nằm trong JS của các mô hình ──────────────────────────────────
    # Mô hình 16 (MLE) phải dùng ĐÚNG bộ dữ liệu mà mục 4.3 kể, nếu không hai chỗ nói
    # hai chuyện: bài viết bảo μ̂ = 171 mà mô hình lại đặt đỉnh ở chỗ khác.
    need('mô hình 16 dùng đúng dữ liệu của mục 4.3', 'DATA = [167, 170, 172, 169, 177]')
    # Mô hình 17 (khoảng tin cậy) in ra phân vị chuẩn mà t* tiến tới khi n lớn — phải là phân vị thật.
    for conf, lbl in [(0.95, '1,960'), (0.99, '2,576'), (0.80, '1,282')]:
        z = N.inv_cdf(1 - (1 - conf) / 2)
        if vi(z, 3) != lbl:
            fails.append(f'mô hình 17: phân vị chuẩn cho mức {conf} là {vi(z, 3)}, JS ghi {lbl}')
        need(f'mô hình 17 phân vị {conf}', "'" + lbl + "'")
    run_m17()


def run_m17():
    """Mô hình 17: ô tĩnh trong HTML (95 / 5 / 6,6 cm) phải là đúng cái mà JS vẽ ra ở lần mở
    đầu. Chép rng/gauss của trang (cùng phép tính số nguyên 32 bit, cùng Box–Muller) rồi chạy
    lại 100 khoảng với hạt giống đang ghi trong JS. Đổi hạt giống mà không đổi ô tĩnh — hoặc
    ngược lại — là cổng đỏ."""
    import re
    m_seed = re.search(r'level = 95, seed = (\d+)', HTML)
    m_n = re.search(r'id="m17-n" min="\d+" max="\d+" step="\d+" value="(\d+)"', HTML)
    m_hit = re.search(r'id="m17-hit">(\d+)<', HTML)
    m_miss = re.search(r'id="m17-miss">(\d+)<', HTML)
    m_w = re.search(r'id="m17-w">([\d,]+)<', HTML)
    claim('mô hình 17 đọc được hạt giống, n, ô tĩnh', all([m_seed, m_n, m_hit, m_miss, m_w]))
    if not all([m_seed, m_n, m_hit, m_miss, m_w]):
        return
    seed, n = int(m_seed.group(1)), int(m_n.group(1))
    # hạt giống này phải là hạt sau đúng một lần "Lấy mẫu lại" kể từ 12345, như comment nói
    claim('mô hình 17 hạt giống = một lần lấy lại từ 12345', (12345 * 1103515245 + 12345) % 2 ** 32 == seed)
    s = [seed % 2 ** 32]

    def r():
        s[0] = (s[0] * 1664525 + 1013904223) % 2 ** 32
        return s[0] / 4294967296

    def gauss():
        u = v = 0.0
        while u == 0:
            u = r()
        while v == 0:
            v = r()
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)

    tc = tcrit(0.95, n - 1)
    hit, wsum = 0, 0.0
    for _ in range(100):
        xs = [170 + 8 * gauss() for _ in range(n)]
        mu = sum(xs) / n
        sd = math.sqrt(sum((x - mu) ** 2 for x in xs) / (n - 1))
        half = tc * sd / math.sqrt(n)
        hit += abs(mu - 170) <= half
        wsum += 2 * half
    claim('mô hình 17 ô "chứa đúng"', int(m_hit.group(1)) == hit, f'JS cho {hit}, HTML ghi {m_hit.group(1)}')
    claim('mô hình 17 ô "bắn trượt"', int(m_miss.group(1)) == 100 - hit, f'JS cho {100 - hit}, HTML ghi {m_miss.group(1)}')
    claim('mô hình 17 ô bề rộng', m_w.group(1) == vi(wsum / 100, 1), f'JS cho {vi(wsum / 100, 1)}, HTML ghi {m_w.group(1)}')


# ─────────────────────── mô hình 8, 9: chạy JS của trang ───────────────────────
# Câu nhắc của hai mô hình này là nhánh điều kiện, không phải con số: ghim chuỗi mã thì sửa
# nhánh mà giữ chuỗi vẫn xanh. Nên cổng cắt khối "cổng: đầu … cổng: cuối" (SURF, m8Say,
# m9Status) cùng hàm fmt ra khỏi trang, chạy bằng node, rồi tự tính số phận thật của từng
# đường đi bằng Python và đòi trạng thái trang in ra không mâu thuẫn với nó.
SURF_PY = [  # bốn mặt như chip và lời văn ghi: x² + 3y², x² + 12y², x² − y², hai đáy
    (lambda x, y: x * x + 3 * y * y, lambda x: 2 * x, lambda y: 6 * y),
    (lambda x, y: x * x + 12 * y * y, lambda x: 2 * x, lambda y: 24 * y),
    (lambda x, y: x * x - y * y, lambda x: 2 * x, lambda y: -2 * y),
    (lambda x, y: 0.25 * (x * x - 4) ** 2 + y * y, lambda x: x * (x * x - 4), lambda y: 2 * y),
]
BOX = (-4, 4, -2.3, 2.3)
M9_ALPHAS = [k / 100 for k in range(1, 61)]  # thanh trượt α: 1…60, chia 100
M9_STARTS = [(x, y) for x in (-4, -3, -2.15, -1, 0, 1, 2, 2.5, 3.5) for y in (-2.3, 0, 1.6)]
M9_STEPS = 120
JS_HARNESS = r"""
const out = { surf: [], m8: [], m9: [] };
const H = 1e-5, P = [[-3, -1.7], [-1.2, 0.4], [0, 0], [0.5, 2], [2, -0.3], [3.7, 1.1]];
SURF.forEach(function (S) { out.surf.push(P.map(function (p) {
  return [S.f(p[0], p[1]), S.gx(p[0]), S.gy(p[1])]; })); });
CASES.m8.forEach(function (c) { out.m8.push(m8Say(c[0], c[1], c[2])); });
CASES.m9.forEach(function (c) {
  var si = c[0], a = c[1], S = si === 2 ? SURF[3] : SURF[si], path = [c[2].slice()];
  var f0 = S.f(c[2][0], c[2][1]), sts = [], says = [];
  for (var k = 0; k <= c[3]; k++) {
    if (k) {  /* đúng phép bước của step() trong mô hình 9 */
      var p = path[path.length - 1], nx = p[0] - a * S.gx(p[0]), ny = p[1] - a * S.gy(p[1]);
      if (!isFinite(nx) || Math.abs(nx) > 1e6) nx = Math.sign(nx || 1) * 1e6;
      if (!isFinite(ny) || Math.abs(ny) > 1e6) ny = Math.sign(ny || 1) * 1e6;
      path.push([nx, ny]); if (path.length > 400) path.shift();
    }
    var r = m9Status(si, a, path, f0, k, BOX);
    sts.push(r.st); if (c[4]) says.push(r.say);
  }
  out.m9.push({ st: sts, say: says, last: path[path.length - 1] });
});
process.stdout.write(JSON.stringify(out));
"""


def run_js_models():
    import json
    import re
    import shutil
    import subprocess
    global checks
    checks += 1
    node = shutil.which('node')
    if not node:
        fails.append('mô hình 8, 9: cần node để chạy JS của trang (CI có sẵn; máy cục bộ cài node)')
        return
    a0, a1 = HTML.find('/* ── cổng: đầu'), HTML.find('/* ── cổng: cuối')
    mf = re.search(r'function fmt\(n, d\) \{.*?\n\}\n', HTML, re.S)
    if a0 < 0 or a1 < a0 or not mf:
        fails.append('mô hình 8, 9: không thấy khối "cổng: đầu … cổng: cuối" hoặc hàm fmt trong trang')
        return
    m8cases = [(1, 2 * x / 4, 24 * y / 4) for x in range(-16, 17) for y in range(-9, 10)]
    m8cases += [(s, 2 * x, g * y) for s, g in ((0, 6), (2, -2)) for x in (-3, 0, 1.5) for y in (-1, 0, 2)]
    m9cases = [(si, a, list(st), M9_STEPS, 0) for si in (0, 1, 2) for a in M9_ALPHAS for st in M9_STARTS]
    named = {  # ca cụ thể: (si, α, chỗ xuất phát, số bước) → trạng thái phải in
        'hai đáy (0; 1,6) α 0,10 → yên ngựa': ((2, 0.10, [0, 1.6], 40), 'yên ngựa'),
        'bát (0; 1,6) α 0,34, bước 2 → sắp phân kỳ': ((0, 0.34, [0, 1.6], 2), 'sắp phân kỳ'),
        'bát (2,5; 1,6) α 0,10 → tới đáy': ((0, 0.10, [2.5, 1.6], 40), 'tới đáy'),
        'hai đáy (2,5; 1,6) α 0,28 → kẹt nảy': ((2, 0.28, [2.5, 1.6], 80), 'kẹt nảy'),
        'hai đáy (−2,15; 0) α 0,28 → kẹt nảy': ((2, 0.28, [-2.15, 0], 80), 'kẹt nảy'),
    }
    for (si, a, st, n), _ in named.values():
        m9cases.append((si, a, st, n, 1))
    js = ('"use strict";\nvar BOX = ' + json.dumps(list(BOX)) + ', CASES = ' +
          json.dumps({'m8': m8cases, 'm9': m9cases}) + ';\n' + mf.group(0) + HTML[a0:a1] + JS_HARNESS)
    r = subprocess.run([node, '-'], input=js, capture_output=True, text=True, timeout=120)
    if r.returncode:
        fails.append('mô hình 8, 9: node lỗi khi chạy khối của trang: ' + r.stderr.strip()[:300])
        return
    out = json.loads(r.stdout)

    # 1. Bốn mặt trong JS đúng là bốn mặt bài viết nói, và gx, gy đúng là đạo hàm riêng của f.
    pts = [(-3, -1.7), (-1.2, 0.4), (0, 0), (0.5, 2), (2, -0.3), (3.7, 1.1)]
    for i, (f, gx, gy) in enumerate(SURF_PY):
        claim(f'mô hình 8/9 mặt {i}', all(abs(v[0] - f(x, y)) < 1e-9 and abs(v[1] - gx(x)) < 1e-9 and
              abs(v[2] - gy(y)) < 1e-9 for v, (x, y) in zip(out['surf'][i], pts)),
              'SURF trong JS không khớp f và đạo hàm riêng của nó')

    # 2. Mô hình 8: câu nhắc theo tỉ số |∂f/∂y| / |∂f/∂x| (máng hẹp), không mâu thuẫn mũi tên.
    bad8 = []
    for (si, gx, gy), say in zip(m8cases, out['m8']):
        if math.hypot(gx, gy) < 0.15:
            want = 'Gradient gần bằng 0'
        elif si != 1:
            want = 'Yên ngựa:' if si == 2 else 'Mũi tên nâu'
        elif abs(gy) > 3 * abs(gx):
            want = 'gần như chỉ ngang vào tường'
        elif 3 * abs(gy) < abs(gx):
            want = 'gần như dọc theo máng'
        else:
            want = 'chỉ chéo'
        if want not in say:
            bad8.append((si, gx, gy))
    claim('mô hình 8 câu nhắc', not bad8, f'{len(bad8)} chỗ đứng nói sai hướng mũi tên, ví dụ {bad8[:3]}')

    # 3. Mô hình 9: số phận thật của từng đường đi, tính lại bằng Python.
    def fxx(si, x):
        gx = SURF_PY[3 if si == 2 else si][1]
        return (gx(x + 1e-6) - gx(x - 1e-6)) / 2e-6

    def fate(si, a, st):
        """'conv', 'div' hay 'bounded' (nảy mãi mà không bay ra)."""
        f, gx, gy = SURF_PY[3 if si == 2 else si]
        if si < 2:  # mặt bậc hai: mỗi trục nhân với một hệ số cố định mỗi bước
            ks = [(st[0], 1 - a * gx(1)), (st[1], 1 - a * gy(1))]
            return 'div' if any(v and abs(k) > 1 for v, k in ks) else 'conv'
        x, y = st
        A1 = A2 = 0
        for i in range(2000):
            px = x
            x, y = x - a * gx(x), y - a * gy(y)
            if not (abs(x) < 1e6 and abs(y) < 1e6):
                return 'div'
            if 800 <= i < 1000:
                A1 = max(A1, abs(x - px))
            if i >= 1800:
                A2 = max(A2, abs(x - px))
        if math.hypot(gx(x), gy(y)) < 1e-6:
            return 'conv'
        # biên độ nảy còn co dần (α = 0,25: co rất chậm) thì vẫn là hội tụ
        return 'conv' if A2 < 0.85 * A1 and A2 < 0.2 else 'bounded'

    bad9 = []
    for (si, a, st, n, _), res in zip(m9cases, out['m9']):
        F_ = fate(si, a, st)
        f, gx, gy = SURF_PY[3 if si == 2 else si]
        x, y = st
        hist = [(x, y)]
        for k, s in enumerate(res['st']):
            if k:
                x, y = x - a * gx(x), y - a * gy(y)
                hist.append((x, y))
            flat = math.hypot(gx(x), gy(y)) < 0.02
            if s == 'tới đáy':
                ok = flat and fxx(si, x) > 0
            elif s == 'yên ngựa':
                ok = flat and fxx(si, x) < 0
            elif F_ == 'conv':
                ok = s not in ('PHÂN KỲ', 'sắp phân kỳ', 'kẹt nảy', 'không dừng')
            elif F_ == 'div':
                ok = s != 'kẹt nảy'
            elif s == 'kẹt nảy':
                ok = k >= 2 and math.dist(hist[-1], hist[-3]) < 1e-3
            else:
                ok = s == 'không dừng'
            if not ok:
                bad9.append((si, a, st, k, s, F_))
                break
    claim('mô hình 9 trạng thái', not bad9,
          f'{len(bad9)} đường đi có bước báo sai, ví dụ (mặt, α, xuất phát, bước, in ra, thật) {bad9[:3]}')
    k0 = len(m9cases) - len(named)
    for (label, ((si, a, st, n), want)), res in zip(named.items(), out['m9'][k0:]):
        claim('mô hình 9 ' + label, res['st'][-1] == want, f'in ra "{res["st"][-1]}"')
    sayd = out['m9'][k0 + 2]['say'][-1]
    claim('mô hình 9 đếm bước trong câu "tới đáy"', 'sau 40 bước' in sayd, sayd[:80])


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
