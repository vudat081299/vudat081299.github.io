#!/usr/bin/env python3
"""Cổng kiến thức cho pages/hidden-curriculum.html.

Vì sao cần, khác lint-pages.py: trang nói vài chục con số tính lại được — trò đồng xu của
Peters (86,4% người chơi thua, ×131,5 trung bình, mức Kelly 25%), thống kê nắm giữ cổ phiếu,
vàng, tín phiếu Mỹ 1928–2025 (0 trên 79 khung, 28 trên 79 khung), phí 1% ăn mất 24,3%, lãi
"3% mỗi tháng" là 42,6%/năm, giá trị hôm nay của vốn con người — và bảy mô hình JS sinh ra
chính những con số ấy. lint-pages.py không biết 86,4% có đúng là P(K ≤ 55), K ~ B(100, ½),
hay không; càng không biết luật ấy còn đúng sau khi ai đó sửa một dòng JS.

Bốn phần, bốn loại sai khác nhau:

  A. DỮ LIỆU NHÚNG — đối chiếu vài giá trị với nguồn (Damodaran, histretSP.xls, 01/2026) và
     kiểm độ dài, để mảng không bị cắt hay lệch năm.
  B. CON SỐ TRONG BÀI — tính lại từ đầu rồi đòi trang có đúng chuỗi ấy. Bắt được chuyện sửa
     một con số mà quên chỗ khác.
  C. LUẬT TRONG MÃ — đòi vài dòng JS then chốt còn nguyên hình: công thức của trò đồng xu, hạt
     giống cố định, cách trừ lạm phát, ma trận điểm của trò chơi lặp lại.
  D. TOÁN ĐỘC LẬP — dựng lại bằng lối khác lối trang dùng: mô phỏng Monte Carlo trò đồng xu,
     tìm cực đại Kelly bằng lưới, giá trị hiện tại bằng công thức đóng, và chạy lại giải đấu
     của mô hình 5 bằng đúng bộ sinh số ngẫu nhiên của trang để kiểm các câu lời văn nói về nó.

Chỉ dùng thư viện chuẩn, chạy dưới 5 giây.

Chạy:  python3 pages/tools/verify-hidden-curriculum.py
Exit code: 1 nếu có con số hoặc luật không khớp.
"""
import math
import pathlib
import random
import re
import statistics
import sys

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'hidden-curriculum.html'
PAGES = ['pages/hidden-curriculum.html']

fails = []
checks = 0
HTML = ''


def vi(x, d=2):
    """Số viết theo lối Việt như hàm vn() của trang: chấm hàng nghìn, phẩy thập phân, dấu trừ
    Unicode (U+2212)."""
    s = f'{abs(x):,.{d}f}'.replace(',', '\x00').replace('.', ',').replace('\x00', '.')
    return ('−' if x < 0 and round(abs(x), d) != 0 else '') + s


def need(label, text, expect=None):
    """Đòi `text` phải có mặt trong trang."""
    global checks
    checks += 1
    if text not in HTML:
        fails.append(f'{label}: không thấy "{text}"' + (f' (tính được: {expect})' if expect is not None else ''))


def claim(label, ok, why=''):
    """Đòi một LUẬT đúng, không phải một chuỗi có mặt."""
    global checks
    checks += 1
    if not ok:
        fails.append(f'{label}: {why or "luật trong bài không đúng"}')


def near(label, got, want, tol, why=''):
    global checks
    checks += 1
    if abs(got - want) > tol:
        fails.append(f'{label}: {got:.6g} lệch khỏi {want:.6g} quá {tol:.3g}. {why}')


def arr(name):
    """Đọc một mảng số trong <script> của trang: `name: [ … ]`."""
    m = re.search(name + r':\s*\[([^\]]*)\]', HTML)
    if not m:
        fails.append(f'không đọc được mảng {name}')
        return []
    return [None if v.strip() == 'null' else float(v) for v in m.group(1).split(',')]


# ══════════════════════════════════════════════════════════════════════════════
# A. Dữ liệu nhúng
# ══════════════════════════════════════════════════════════════════════════════
Y0, Y1 = 1928, 2025
SP = BILL = CPI = GOLD = []


def phan_A():
    global SP, BILL, CPI, GOLD
    SP, BILL, CPI, GOLD = arr('sp'), arr('bill'), arr('cpi'), arr('usd')
    n = Y1 - Y0 + 1
    for nm, a in (('sp', SP), ('bill', BILL), ('cpi', CPI)):
        claim(f'độ dài mảng {nm}', len(a) == n, f'có {len(a)} giá trị, phải có {n} (1928–2025)')
    claim('độ dài mảng giá vàng', len(GOLD) == 56, f'có {len(GOLD)} giá trị, phải có 56 (1970–2025)')
    need('năm đầu của dữ liệu', 'y0: 1928')
    need('năm đầu của giá vàng', 'y0: 1970')
    # Giá trị đối chiếu với histretSP.xls (làm tròn 0,01 điểm %), chọn ở những năm dễ nhớ.
    spot = [('S&P 500 năm 1931', SP, 1931, -43.84), ('S&P 500 năm 2008', SP, 2008, -36.55),
            ('S&P 500 năm 2025', SP, 2025, 17.72), ('tín phiếu năm 1981', BILL, 1981, 14.04),
            ('lạm phát năm 1946', CPI, 1946, 18.13), ('lạm phát năm 1980', CPI, 1980, 12.52),
            ('lạm phát năm 2022', CPI, 2022, 6.45)]
    for label, a, y, v in spot:
        if len(a) == n:
            near(label, a[y - Y0], v, 1e-9, 'lệch với histretSP.xls — mảng bị sửa hoặc trượt năm')
    for y, v in ((1970, 37.38), (1980, 589.75), (2001, 276.5), (2025, 4339.65)):
        if len(GOLD) == 56:
            near(f'giá vàng cuối năm {y}', GOLD[y - 1970], v, 1e-9, 'lệch với histretSP.xls')


def series(asset, real):
    """Đúng hàm series() của trang: lợi suất năm, trừ lạm phát bằng (1+r)/(1+π) − 1."""
    out = []
    for y in range(Y0, Y1 + 1):
        if asset == 'gold':
            if y < 1971:
                continue
            r = GOLD[y - 1970] / GOLD[y - 1971] - 1
        else:
            r = (SP if asset == 'sp' else BILL)[y - Y0] / 100
        if real:
            r = (1 + r) / (1 + CPI[y - Y0] / 100) - 1
        out.append((y, r))
    return out


def windows(s, h):
    res = []
    for i in range(len(s) - h + 1):
        g = 1.0
        for _, r in s[i:i + h]:
            g *= 1 + r
        res.append((s[i][0], g ** (1 / h) - 1, g))
    return res


def geo(s):
    g = 1.0
    for _, r in s:
        g *= 1 + r
    return g ** (1 / len(s)) - 1


# ══════════════════════════════════════════════════════════════════════════════
# B. Con số trong bài
# ══════════════════════════════════════════════════════════════════════════════
def up(f):
    return 1 + 0.5 * f


def dn(f):
    return 1 - 0.4 * f


def growth(f):
    return 0.5 * math.log(up(f)) + 0.5 * math.log(dn(f))


def p_lose(f, T):
    """P(K·ln(up) + (T−K)·ln(dn) < 0), K ~ B(T, ½) — cùng ngưỡng −1e-12 với trang."""
    lu, ld = math.log(up(f)), math.log(dn(f))
    return sum(math.comb(T, k) for k in range(T + 1) if k * lu + (T - k) * ld < -1e-12) / 2 ** T


def times(x):
    """Đúng hàm times() của trang."""
    if x >= 1000:
        return '×' + vi(x, 0)
    if x >= 10:
        return '×' + vi(x, 1)
    if x >= 0.1:
        return '×' + vi(x, 2)
    if x >= 0.001:
        return '×' + vi(x, 4)
    return '×' + vi(x, 6)


def pv(y0, g, r, n):
    return sum(y0 * (1 + g) ** (t - 1) / (1 + r) ** t for t in range(1, n + 1))


def phan_B():
    # ── Trò đồng xu (mô hình 1) ────────────────────────────────────────────────
    # Mỗi con số được đòi đúng ở câu chứa nó: một số xuất hiện hai nơi thì kiểm cả hai, nếu không
    # sửa một nơi mà quên nơi kia vẫn lọt (đã thử ngược: ô 86,4% ở đầu trang từng lọt như vậy).
    T = 100
    mean1, med1, pl1 = (1.05) ** T, math.exp(growth(1) * T), p_lose(1, T)
    med25, med12 = math.exp(growth(0.25) * T), math.exp(growth(0.125) * T)
    g25, g12 = math.exp(growth(0.25)) - 1, math.exp(growth(0.125)) - 1
    need('đồng xu, lời dặn dưới mô hình 1',
         f'100%: sau 100 ván, trung bình đám đông là {times(mean1)} trong khi người ở giữa còn {times(med1)} '
         f'và {vi(100 * pl1, 1)}% người chơi nghèo hơn lúc đầu')
    need('đồng xu, ô số ở đầu trang', f'<span class="n">{vi(100 * pl1, 1)}%</span>', pl1)
    need('đồng xu, mức Kelly', f'25%: người ở giữa {times(med25)} — mức Kelly')
    need('đồng xu, nửa Kelly',
         f'12,5% (nửa Kelly): người ở giữa {times(med12)}, mỗi ván tăng {vi(100 * g12, 2)}% thay vì {vi(100 * g25, 2)}%')
    need('đồng xu, số người thua sau 100 ván',
         f'số người thua sau 100 ván giảm từ {vi(100 * p_lose(0.25, T), 1)}% xuống {vi(100 * p_lose(0.125, T), 1)}%')
    claim('nửa Kelly chọn được trên thanh trượt', 'id="cg-f" min="0" max="100" step="2.5"' in HTML,
          'lời dặn bảo thử 12,5%, nên bước của thanh trượt phải chia hết 12,5')
    near('kỳ vọng mỗi ván ½·1,5 + ½·0,6', 0.5 * 1.5 + 0.5 * 0.6, 1.05, 1e-12)
    near('một ngửa một sấp 1,5 × 0,6', 1.5 * 0.6, 0.9, 1e-12)
    need('kỳ vọng mỗi ván viết trong bài', '= <b>1,05</b>')
    need('một ngửa một sấp viết trong bài', '= <b>0,9</b>')
    near('nửa Kelly giữ khoảng ba phần tư tốc độ', growth(0.125) / growth(0.25), 0.75, 0.01)
    near('mức hoà vốn 50%: (1+0,5f)(1−0,4f) = 1', up(0.5) * dn(0.5), 1.0, 1e-12)
    # Thorp: với phần c của mức Kelly, P(có lúc còn x vốn ban đầu) = x^(2/c − 1) (xấp xỉ liên tục).
    near('Thorp: Kelly đầy đủ, P(có lúc mất nửa vốn)', 0.5 ** (2 / 1 - 1), 0.5, 1e-12)
    near('Thorp: nửa Kelly, P(có lúc mất nửa vốn)', 0.5 ** (2 / 0.5 - 1), 0.125, 1e-12)
    need('Thorp trong bài', 'là 1/2; với nửa Kelly, chỉ còn 1/8')
    # Quá tay và non tay: (1 + 0,5f)(1 − 0,4f) = 1 + 0,1f − 0,2f² đối xứng quanh f = 25%, nên 12,5% và 37,5%
    # tăng đúng như nhau; chỉ độ phân tán khác.
    near('12,5% và 37,5% cùng tốc độ tăng', growth(0.125), growth(0.375), 1e-12)
    need('đồng xu, quá tay và non tay',
         f'đặt 12,5% và đặt 37,5% tăng nhanh đúng như nhau, nhưng sau 100 ván, số người thua là '
         f'{vi(100 * p_lose(0.125, T), 1)}% ở mức thứ nhất và {vi(100 * p_lose(0.375, T), 1)}% ở mức thứ hai')
    claim('mức 37,5% chọn được trên thanh trượt', 37.5 % 2.5 == 0)

    # ── Lỗ và lãi cần để hoà (hình) ────────────────────────────────────────────
    for l, txt in ((0.1, '11,1%'), (0.3, '42,9%'), (0.5, '100%'), (0.7, '233%'), (0.8, '400%'), (0.9, '900%')):
        claim(f'lỗ {int(l * 100)}% cần lãi {txt}', vi(100 * l / (1 - l), 1).replace(',0', '').startswith(txt.rstrip('%')),
              f'tính được {100 * l / (1 - l):.2f}%')
        need(f'nhãn hình lỗ {int(l * 100)}%', f'lỗ {int(l * 100)}% cần {txt}')

    # ── Cỗ máy thời gian (mô hình 2) ───────────────────────────────────────────
    w1 = windows(series('sp', True), 1)
    w20 = windows(series('sp', True), 20)
    neg1 = sum(1 for x in w1 if x[2] < 1)
    neg20 = sum(1 for x in w20 if x[2] < 1)
    need('cổ phiếu, giữ 1 năm', f'giữ 1 năm thì {neg1} trên {len(w1)} năm mất sức mua')
    need('cổ phiếu, giữ 20 năm', f'<b>{neg20} trên {len(w20)} khung</b>')
    need('ô số ở đầu trang', f'<span class="n">{neg20} / {len(w20)}</span>')
    worst = min(w20, key=lambda x: x[1])
    w10 = windows(series('sp', True), 10)
    neg10 = sum(1 for x in w10 if x[2] < 1)
    need('cổ phiếu, giữ 10 năm (bảy luật)', f'ở Mỹ vẫn có {neg10} trên {len(w10)} khung 10 năm mất sức mua')
    need('khung 20 năm tệ nhất', f'khung tệ nhất ({worst[0]}–{worst[0] + 19}, bắt đầu ngay trước Đại suy thoái) vẫn +{vi(100 * worst[1], 2)}%/năm')
    b20 = windows(series('bill', True), 20)
    nb = sum(1 for x in b20 if x[2] < 1)
    need('tín phiếu, giữ 20 năm', f'giữ 20 năm: {nb} trên {len(b20)} khung mất sức mua')
    need('ô số ở đầu trang, tín phiếu', f'tín phiếu thua ở {nb} khung')
    g20 = windows(series('gold', True), 20)
    ng = sum(1 for x in g20 if x[2] < 1)
    need('vàng, giữ 20 năm', f'giữ 20 năm: {ng} trên {len(g20)} khung mất sức mua')
    claim('vàng: "cứ khoảng ba khung 20 năm thì một khung mất sức mua"', 0.28 < ng / len(g20) < 0.4,
          f'tỉ lệ thật {ng}/{len(g20)}')
    med = statistics.median(x[1] for x in g20)
    need('vàng, khung 20 năm điển hình', f'khoảng {vi(100 * med, 1)}%/năm sau lạm phát', med)
    need('vàng 1971–2025, sau lạm phát', f'khoảng <b>{vi(100 * geo(series("gold", True)), 2)}%/năm</b>')
    g2025 = GOLD[-1] / GOLD[-2] - 1
    need('vàng năm 2025', f'một năm 2025 tăng {vi(100 * g2025, 0)}%')
    sp_nom = geo(series('sp', False))
    need('cổ phiếu Mỹ 1928–2025, danh nghĩa (mô hình 6)', f'lợi suất bình quân {vi(100 * sp_nom, 2)}%/năm (danh nghĩa, gồm cổ tức) của cổ phiếu Mỹ')

    # ── Giá vàng theo sức mua (hình) ───────────────────────────────────────────
    lvl, real = 1.0, [0.0] * 56
    for k in range(55, -1, -1):
        real[k] = GOLD[k] * lvl
        lvl *= 1 + CPI[1970 + k - Y0] / 100
    i80, i01 = 10, 31
    back = next(k for k in range(i80 + 1, 56) if real[k] > real[i80])
    drop = 1 - real[i01] / real[i80]
    need('hình giá vàng: mức giảm 1980–2001', f'giảm {vi(100 * drop, 0)}% tới cuối 2001', drop)
    need('hình giá vàng: năm vượt lại', f'vượt lại mức 1980 vào cuối {1970 + back}', 1970 + back)

    # ── Phí ───────────────────────────────────────────────────────────────────
    a8, a7, a6 = 1.08 ** 30, 1.07 ** 30, 1.06 ** 30
    need('phí: 8% trong 30 năm', f'nhân lên {vi(a8, 2)} lần', a8)
    need('phí: 7% trong 30 năm', f'chỉ nhân {vi(a7, 2)} lần', a7)
    need('phí 1% lấy mất', f'<b>phí lấy mất {vi(100 * (1 - a7 / a8), 1)}%</b>')
    need('phí 2% lấy mất', f'Với phí 2%/năm, con số là {vi(100 * (1 - a6 / a8), 1)}%')

    # ── Vàng: đơn vị và mô hình 3 ─────────────────────────────────────────────
    need('một lượng', 'là 37,5 gam, bằng 10 <b>chỉ</b>; một chỉ là 3,75 gam')
    need('một ounce', 'một ounce quốc tế (troy ounce) là 31,1035 gam')
    claim('ounce troy 31,1034768 g làm tròn thành 31,1035', f'{31.1034768:.4f}' == '31.1035')
    claim('trần lãi 20%/năm × 5 = 100%/năm (Bộ luật Hình sự, Điều 201)', 20 * 5 == 100)
    need('ngưỡng của Điều 201', 'tức từ 100%/năm — và thu lợi bất chính từ 30 triệu đồng là tội hình sự')
    # Nghị định 340/2025/NĐ-CP, Điều 30: cá nhân 100–150 triệu (1 đến dưới 10 tài khoản), 150–200 triệu (từ 10).
    need('mức phạt cho mượn tài khoản', 'bị phạt từ 100 tới 200 triệu đồng với cá nhân (Nghị định 340/2025/NĐ-CP, Điều 30)')
    # Bộ luật Hình sự, Điều 291 khoản 1: từ 20 tài khoản, hoặc thu lợi bất chính từ 20 triệu đồng.
    need('ngưỡng của Điều 291', 'từ 20 tài khoản hoặc thu lợi từ 20 triệu đồng, là tội hình sự (Bộ luật Hình sự, Điều 291)')
    need('lượng ra ounce', f'một lượng ≈ {vi(37.5 / 31.1034768, 5)} ounce')
    need('giá mua mặc định', 'id="gs-buy" value="120"')
    need('giá bán mặc định', 'id="gs-sell" value="117.5"')
    need('tăng giá mặc định', 'id="gs-g" min="0" max="15" step="1" value="5"')
    lose = 1 - 117.5 / 120
    need('chênh lệch mặc định', f'là {vi(100 * lose, 2)}%')
    months = 12 * math.log(120 / 117.5) / math.log(1.05)
    claim('"khoảng 5 tháng" để hoà vốn', 4.5 <= months < 5.5, f'tính được {months:.2f} tháng')

    # ── Vốn con người (mô hình 4) ─────────────────────────────────────────────
    for idv in ('id="hk-inc" value="25"', 'id="hk-g" min="0" max="10" step="0.5" value="4"',
                'id="hk-n" min="5" max="45" step="1" value="35"', 'id="hk-r" min="2" max="12" step="0.5" value="6"',
                'id="hk-fc" value="200"'):
        need('giá trị mặc định của mô hình 4', idv)
    hc = pv(300, 0.04, 0.06, 35)
    need('vốn con người mặc định', f'vốn con người ≈ {vi(hc / 1000, 2)} tỷ đồng', hc)
    need('tỉ trọng vốn con người', f'chiếm {vi(100 * hc / (hc + 200), 1)}% tổng tài sản', hc / (hc + 200))
    need('10% thu nhập', f'khoảng {vi(round(hc * 0.1, -1), 0)} triệu hôm nay', hc * 0.1)
    need('10% so với tài sản tài chính', f'gấp {vi(hc * 0.1 / 200, 1)} lần toàn bộ tài sản tài chính')

    # ── Lãi cam kết (mô hình 6) ───────────────────────────────────────────────
    y3, y5 = 1.03 ** 12 - 1, 1.05 ** 12 - 1
    need('3%/tháng quy ra năm', f'“3% mỗi tháng” là {vi(100 * y3, 1)}% mỗi năm')
    need('5%/tháng quy ra năm', f'“5% mỗi tháng” là {vi(100 * y5, 1)}% mỗi năm')
    claim('"hơn bốn lần" lợi suất danh nghĩa', 4 < y3 / sp_nom < 5, f'tỉ số {y3 / sp_nom:.2f}')
    claim('5%/tháng gấp đôi "chưa đầy 15 tháng"', math.log(2) / math.log(1.05) < 15)
    need('lãi mặc định của mô hình 6', 'id="pz-m" min="0.5" max="10" step="0.5" value="3"')
    claim('1%/ngày = 365%/năm, "gấp hơn 18 lần" trần 20%', 18 < 365 / 20 < 19)
    need('lãi 1% mỗi ngày trong bài', 'là 365%/năm tính đơn — gấp hơn 18 lần mức trần')

    # ── Đếm trên chính trang ──────────────────────────────────────────────────
    nsec = len(re.findall(r'<section id="s-', HTML))
    nlab = len(set(re.findall(r'Mô hình (\d) / 7', HTML)))
    need('số mục ở đầu trang', f'· {nsec} mục ·', nsec)
    claim('bảy mô hình đánh số 1–7', nlab == 7, f'thấy {nlab} số mô hình khác nhau')
    need('số mô hình ở đầu trang', '· 7 mô hình</p>')
    near('Kidd 2013: 722,43 s so với 181,57 s là "khoảng bốn lần"', 722.43 / 181.57, 4, 0.1)
    left = re.findall(r'⟦[^⟧]*⟧', HTML)
    claim('không còn chỗ chờ kiểm', not left, 'còn ' + ' '.join(sorted(set(left))))
    need('Chetty 2014', 'là <b>7,5%</b>. Nhưng con số ấy đổi theo nơi đứa trẻ lớn lên: <b>4,4%</b> ở Charlotte, <b>12,9%</b> ở San Jose')
    claim('Sử ký (khoảng năm 91 TCN) là "2.100 năm tuổi"', 2050 <= 2026 + 91 - 1 <= 2150)


# ══════════════════════════════════════════════════════════════════════════════
# C. Luật trong mã
# ══════════════════════════════════════════════════════════════════════════════
RULES = [
    ('ngửa: phần đặt +50%', 'function up(f) { return 1 + 0.5 * f; }'),
    ('sấp: phần đặt −40%', 'function dn(f) { return 1 - 0.4 * f; }'),
    ('tăng trưởng theo thời gian', 'function growth(f) { return 0.5 * Math.log(up(f)) + 0.5 * Math.log(dn(f)); }'),
    ('trung bình đám đông', 'Math.pow(1 + 0.05 * f, T)'),
    ('ngưỡng "nghèo hơn lúc đầu"', 'if (k * lu + (T - k) * ld < -1e-12) p += Math.exp(lc + half);'),
    ('một bộ đồng xu cố định cho 40 người', 'var rand = rng(20261004), flips = [], i, t;'),
    ('LCG có hạt giống', 's = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296;'),
    ('trừ lạm phát', 'if (real) r = (1 + r) / (1 + cpiOf(y)) - 1;'),
    ('lợi suất kép của khung', "res.push([s[i][0], Math.pow(g, 1 / h) - 1, g]);"),
    ('vàng chỉ từ 1971', "if (asset === 'gold') { if (y < 1971) continue; r = goldRet(y); }"),
    ('lợi suất vàng từ giá cuối năm', 'return GOLD_YE.usd[y - GOLD_YE.y0] / GOLD_YE.usd[y - 1 - GOLD_YE.y0] - 1;'),
    ('lỗ L cần lãi L/(1−L)', "lab(l) { return 'lỗ ' + vn(l * 100, 0) + '% → +' + vn(l / (1 - l) * 100, 1)"),
    ('chênh lệch mua–bán', 'var lose = 1 - s / b, need = b / s - 1;'),
    ('thời gian hoà vốn', 'var yrs = Math.log(b / s) / Math.log(1 + g);'),
    ('giá trị hiện tại của thu nhập', 's += y0 * Math.pow(1 + g, t - 1) / Math.pow(1 + r, t);'),
    ('lãi tháng quy ra năm', 'var yr = Math.pow(1 + m, 12) - 1, dbl = Math.log(2) / Math.log(1 + m)'),
    ('ma trận điểm 3/0/5/1', "var PAY = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };"),
    ('40 lần lặp, 50 thế hệ', 'var REPS = 40, GENS = 50;'),
    ('hạt giống của giải đấu', 'var rnd = rng(12345), M = S.map'),
    ('sinh thái: tỉ trọng ∝ tỉ trọng × điểm', 'x = x.map(function (v, i) { return v * f[i] / avg; });'),
]


def phan_C():
    for label, code in RULES:
        need('luật trong mã — ' + label, code)


# ══════════════════════════════════════════════════════════════════════════════
# D. Toán độc lập
# ══════════════════════════════════════════════════════════════════════════════
class LCG:
    """Đúng bộ sinh số rng() của trang."""

    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFF

    def __call__(self):
        self.s = (self.s * 1664525 + 1013904223) & 0xFFFFFFFF
        return self.s / 4294967296


def strat(name):
    if name == 'ALLC':
        return lambda me, op, r: 'C'
    if name == 'ALLD':
        return lambda me, op, r: 'D'
    if name == 'TFT':
        return lambda me, op, r: op[-1] if op else 'C'
    if name == 'TF2T':
        return lambda me, op, r: 'D' if len(op) >= 2 and op[-1] == 'D' and op[-2] == 'D' else 'C'
    if name == 'GRIM':
        return lambda me, op, r: 'D' if 'D' in op else 'C'
    if name == 'JOSS':
        def joss(me, op, r):
            base = op[-1] if op else 'C'
            return 'D' if r() < 0.1 else base
        return joss
    raise ValueError(name)


NAMES = ['ALLC', 'ALLD', 'TFT', 'TF2T', 'GRIM', 'JOSS']
PAY = {'CC': (3, 3), 'CD': (0, 5), 'DC': (5, 0), 'DD': (1, 1)}


def tournament(n, noise, reps=40):
    play = [strat(x) for x in NAMES]
    rnd = LCG(12345)
    M = [[0.0] * 6 for _ in range(6)]
    for _ in range(reps):
        for i in range(6):
            for j in range(i, 6):
                ha, hb, sa, sb = [], [], 0, 0
                for _ in range(n):
                    x, y = play[i](ha, hb, rnd), play[j](hb, ha, rnd)
                    if noise and rnd() < noise:
                        x = 'D' if x == 'C' else 'C'
                    if noise and rnd() < noise:
                        y = 'D' if y == 'C' else 'C'
                    p = PAY[x + y]
                    sa += p[0]
                    sb += p[1]
                    ha.append(x)
                    hb.append(y)
                M[i][j] += sa / n / reps
                if i != j:
                    M[j][i] += sb / n / reps
    score = [sum(v / 6 for v in row) for row in M]
    x = [1 / 6] * 6
    for _ in range(50):
        f = [sum(v * xj for v, xj in zip(row, x)) for row in M]
        avg = sum(a * b for a, b in zip(x, f))
        x = [a * b / avg for a, b in zip(x, f)]
    rank = sorted(range(6), key=lambda k: -score[k])
    return score, rank, x


def phan_D():
    # Trò đồng xu: Monte Carlo bằng bộ sinh số khác hẳn trang.
    rng = random.Random(1956)
    runs, lost = 20000, 0
    for _ in range(runs):
        k = sum(1 for _ in range(100) if rng.random() < 0.5)
        if 1.5 ** k * 0.6 ** (100 - k) < 1:
            lost += 1
    near('đồng xu, mô phỏng: số người thua ở f = 100%', lost / runs, p_lose(1, 100), 0.012,
         'mô phỏng và công thức nhị thức phải gặp nhau')
    best = max((i / 1000 for i in range(0, 1000)), key=growth)
    near('mức Kelly tìm bằng lưới', best, 0.25, 0.001, 'cực đại của ½ln(1+0,5f) + ½ln(1−0,4f)')
    near('mức Kelly theo công thức p/a − q/b', 0.5 / 0.4 - 0.5 / 0.5, 0.25, 1e-12)
    # Giá trị hiện tại: vòng lặp và công thức niên kim tăng dần phải trùng nhau.
    q = 1.04 / 1.06
    closed = 300 / 1.06 * (1 - q ** 35) / (1 - q)
    near('vốn con người: công thức đóng', pv(300, 0.04, 0.06, 35), closed, 1e-6)
    # Cỗ máy thời gian: lợi suất kép bằng tổng log phải trùng tích trực tiếp.
    s = series('sp', True)
    for h in (5, 20):
        a = windows(s, h)
        b = [math.exp(sum(math.log1p(r) for _, r in s[i:i + h]) / h) - 1 for i in range(len(s) - h + 1)]
        near(f'khung {h} năm: tích và tổng log', max(abs(x[1] - y) for x, y in zip(a, b)), 0, 1e-12)

    # Giải đấu của mô hình 5 — kiểm đúng những câu lời văn nói.
    idx = {k: i for i, k in enumerate(NAMES)}
    sc, rank, eco = tournament(1, 0)
    claim('1 lượt: Lật lọng đứng đầu', rank[0] == idx['ALLD'])
    claim('1 lượt: Lật lọng chiếm cả quần thể', eco[idx['ALLD']] > 0.99, f'chỉ {eco[idx["ALLD"]]:.3f}')
    sc, rank, eco = tournament(200, 0)
    claim('200 lượt, không nhầm: Lật lọng cuối bảng', rank[-1] == idx['ALLD'])
    nice = sum(eco[idx[k]] for k in ('ALLC', 'TFT', 'TF2T', 'GRIM'))
    claim('200 lượt, không nhầm: các kiểu tử tế chia nhau quần thể', nice > 0.95, f'chỉ {nice:.3f}')
    sc, rank, eco = tournament(200, 0.02)
    claim('200 lượt, nhầm 2%: Thù dai ngay trên Lật lọng', rank[-2:] == [idx['GRIM'], idx['ALLD']],
          'thứ tự cuối bảng: ' + ', '.join(NAMES[k] for k in rank))
    claim('200 lượt, nhầm 2%: Rộng lượng đứng đầu', rank[0] == idx['TF2T'])
    for n in (50, 200):
        for noise in (0, 0.02, 0.05, 0.1):
            sc, rank, eco = tournament(n, noise)
            claim(f'{n} lượt, nhầm {int(noise * 100)}%: Rộng lượng đứng đầu', rank[0] == idx['TF2T'],
                  'đứng đầu là ' + NAMES[rank[0]])
    need('lời văn về mô hình 5', 'Với quan hệ từ 50 lượt trở lên, Rộng lượng đứng đầu ở mọi mức nhầm lẫn')


def main():
    global HTML
    if not PAGE.exists():
        print('verify-hidden-curriculum: không thấy %s' % PAGE.name)
        return 1
    HTML = PAGE.read_text(encoding='utf-8')
    phan_A()
    if not fails:
        phan_B()
        phan_C()
        phan_D()
    print()
    if fails:
        print('verify-hidden-curriculum: %d chỗ KHÔNG khớp (trên %d phép kiểm):' % (len(fails), checks))
        for f in fails:
            print('    %s' % f)
        return 1
    print('verify-hidden-curriculum: OK — %d phép kiểm, mọi con số và luật trong trang dựng lại được.' % checks)
    return 0


if __name__ == '__main__':
    sys.exit(main())
