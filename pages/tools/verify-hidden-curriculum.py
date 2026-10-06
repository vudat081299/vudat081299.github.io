#!/usr/bin/env python3
"""Cổng kiến thức cho pages/hidden-curriculum.html và thư viện mô hình pages/data/hidden-curriculum.json.

Vì sao cần, khác lint-pages.py: trang nói vài chục con số tính lại được — trò đồng xu của
Peters (86,4% người chơi thua, ×131,5 trung bình, mức Kelly 25%), thống kê nắm giữ cổ phiếu,
vàng, tín phiếu Mỹ 1928–2025 (0 trên 79 khung, 28 trên 79 khung), phí 1% ăn mất 24,4%, lãi
"3% mỗi tháng" là 42,6%/năm, giá trị hôm nay của vốn con người, điểm hoà vốn và đòn bẩy hoạt
động của quán ví dụ, lợi suất cho thuê và quy tắc 72, bảng nhà trẻ Haifa của Gneezy và
Rustichini, các phép Bayes, độ lệch chuẩn của một danh mục — và mười mô hình JS sinh ra chính
những con số ấy. lint-pages.py không biết 86,4% có đúng là P(K ≤ 55), K ~ B(100, ½), hay không;
càng không biết luật ấy còn đúng sau khi ai đó sửa một dòng JS.

Sáu phần, sáu loại sai khác nhau:

  A. DỮ LIỆU NHÚNG — đối chiếu vài giá trị với nguồn (Damodaran, histretSP.xls, 01/2026) và
     kiểm độ dài, để mảng không bị cắt hay lệch năm.
  B. CON SỐ TRONG BÀI — tính lại từ đầu rồi đòi trang có đúng chuỗi ấy. Bắt được chuyện sửa
     một con số mà quên chỗ khác.
  C. LUẬT TRONG MÃ — đòi vài dòng JS then chốt còn nguyên hình: công thức của trò đồng xu, hạt
     giống cố định, cách trừ lạm phát, ma trận điểm của trò chơi lặp lại.
  D. TOÁN ĐỘC LẬP — dựng lại bằng lối khác lối trang dùng: mô phỏng Monte Carlo trò đồng xu,
     tìm cực đại Kelly bằng lưới, giá trị hiện tại bằng công thức đóng, và chạy lại giải đấu
     của mô hình trò chơi lặp lại bằng đúng bộ sinh số ngẫu nhiên của trang để kiểm các câu lời
     văn nói về nó.
  E. THƯ VIỆN MÔ HÌNH — đủ trường, khoá hợp lệ, id duy nhất, mọi related và sections trỏ tới thứ
     có thật, không có HTML trong dữ liệu, mọi con số trong thẻ có mặt trên trang, số thẻ khớp đầu trang.
  F. VỐN, NGHỀ, GIA ĐÌNH — các mục rủi ro, tạo của, doanh nghiệp, danh mục, tài sản, nghề, gia đình:
     chuỗi lấy từ nguồn (luật, số liệu chính thức, tác giả và năm) giữ nguyên văn trong đúng mục, mỗi
     câu hỏi của hai bảng luật đi với đúng điều đã đối chiếu, năm can chi tính lại từ năm dương lịch,
     và mọi con số suy ra được tính lại trên chữ đã bóc thẻ của trang (bảng, công thức, kỳ vọng ẩn
     trong giá, thứ tự lợi suất, trái phiếu…).

Chỉ dùng thư viện chuẩn, chạy dưới 5 giây.

Chạy:  python3 pages/tools/verify-hidden-curriculum.py
Exit code: 1 nếu có con số hoặc luật không khớp.
"""
import collections
import html
import json
import math
import pathlib
import random
import re
import statistics
import sys

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'hidden-curriculum.html'
DATA = PAGE.parent / 'data' / 'hidden-curriculum.json'
PAGES = ['pages/hidden-curriculum.html']

fails = []
checks = 0
HTML = ''
TEXT = ''   # chữ đã bóc thẻ và chú thích, gộp khoảng trắng — cho các phép kiểm chạy qua ô bảng


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


def need_t(label, text, expect=None):
    """Như need(), nhưng tìm trong chữ đã bóc thẻ (TEXT): một hàng bảng thành một chuỗi liền."""
    global checks
    checks += 1
    if text not in TEXT:
        fails.append(f'{label}: không thấy "{text}" trong chữ' + (f' (tính được: {expect})' if expect is not None else ''))


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


def muc(sid):
    """HTML của một mục <section id="sid">; rỗng nếu mục không có."""
    m = re.search(r'<section id="%s">(.*?)</section>' % re.escape(sid), HTML, flags=re.S)
    return m.group(1) if m else ''


def chu(h):
    """Chữ hiển thị của một đoạn HTML: thẻ khối thành khoảng trắng, thẻ dòng bỏ hẳn (để “<b>tiền</b>,”
    thành “tiền,”), giải mã thực thể, gộp khoảng trắng."""
    h = re.sub(r'</?(?:p|div|td|th|tr|li|ol|ul|h2|h3|h4|table|thead|tbody|figure|figcaption|blockquote)\b[^>]*>', ' ', h)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', h))).strip()


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
    # ── Trò đồng xu (lab-coin) ─────────────────────────────────────────────────
    # Mỗi con số được đòi đúng ở câu chứa nó: một số xuất hiện hai nơi thì kiểm cả hai, nếu không
    # sửa một nơi mà quên nơi kia vẫn lọt (đã thử ngược: ô 86,4% ở đầu trang từng lọt như vậy).
    T = 100
    mean1, med1, pl1 = (1.05) ** T, math.exp(growth(1) * T), p_lose(1, T)
    med25, med12 = math.exp(growth(0.25) * T), math.exp(growth(0.125) * T)
    g25, g12 = math.exp(growth(0.25)) - 1, math.exp(growth(0.125)) - 1
    need('đồng xu, lời dặn dưới mô hình',
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
    # Không dùng xác suất drawdown của xấp xỉ liên tục cho trò đồng xu rời rạc.
    # So trực tiếp tốc độ tăng trưởng và xác suất thua của hai mức đặt trong trò này.
    # Quá tay và non tay: (1 + 0,5f)(1 − 0,4f) = 1 + 0,1f − 0,2f² đối xứng quanh f = 25%, nên 12,5% và 37,5%
    # tăng đúng như nhau; chỉ độ phân tán khác.
    near('12,5% và 37,5% cùng tốc độ tăng', growth(0.125), growth(0.375), 1e-12)
    need('đồng xu, quá tay và non tay',
         f'đặt 12,5% và 37,5% có cùng tốc độ tăng trưởng dài hạn, nhưng sau 100 ván, số người thua là '
         f'{vi(100 * p_lose(0.125, T), 1)}% và {vi(100 * p_lose(0.375, T), 1)}%')
    claim('mức 37,5% chọn được trên thanh trượt', 37.5 % 2.5 == 0)

    # ── Lỗ và lãi cần để hoà (hình) ────────────────────────────────────────────
    for l, txt in ((0.1, '11,1%'), (0.3, '42,9%'), (0.5, '100%'), (0.7, '233%'), (0.8, '400%'), (0.9, '900%')):
        claim(f'lỗ {int(l * 100)}% cần lãi {txt}', vi(100 * l / (1 - l), 1).replace(',0', '').startswith(txt.rstrip('%')),
              f'tính được {100 * l / (1 - l):.2f}%')
        need(f'nhãn hình lỗ {int(l * 100)}%', f'lỗ {int(l * 100)}% cần {txt}')

    # ── Cỗ máy thời gian (lab-time) ──────────────────────────────────────────
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
    need('cổ phiếu, giữ 10 năm', f'ở Mỹ có {neg10} trên {len(w10)} khung 10 năm mất sức mua')
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
    need('cổ phiếu Mỹ 1928–2025, danh nghĩa (lời dặn của lab-pz)', f'lợi suất bình quân {vi(100 * sp_nom, 2)}%/năm (danh nghĩa, gồm cổ tức) của cổ phiếu Mỹ')

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

    # ── Vàng: đơn vị và lab-gold ─────────────────────────────────────────────
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

    # ── Vốn con người (lab-hk) ──────────────────────────────────────────────
    for idv in ('id="hk-inc" value="25"', 'id="hk-g" min="0" max="10" step="0.5" value="4"',
                'id="hk-n" min="5" max="45" step="1" value="35"', 'id="hk-r" min="2" max="12" step="0.5" value="6"',
                'id="hk-fc" value="200"'):
        need('giá trị mặc định của lab-hk', idv)
    hc = pv(300, 0.04, 0.06, 35)
    need('vốn con người mặc định', f'vốn con người ≈ {vi(hc / 1000, 2)} tỷ đồng', hc)
    need('tỉ trọng vốn con người', f'chiếm {vi(100 * hc / (hc + 200), 1)}% tổng tài sản', hc / (hc + 200))
    need('10% thu nhập', f'khoảng {vi(round(hc * 0.1, -1), 0)} triệu hôm nay', hc * 0.1)
    need('10% so với tài sản tài chính', f'gấp {vi(hc * 0.1 / 200, 1)} lần toàn bộ tài sản tài chính')

    # ── Lãi cam kết (lab-pz) ────────────────────────────────────────────────
    y3, y5 = 1.03 ** 12 - 1, 1.05 ** 12 - 1
    need('3%/tháng quy ra năm', f'“3% mỗi tháng” là {vi(100 * y3, 1)}% mỗi năm')
    need('5%/tháng quy ra năm', f'“5% mỗi tháng” là {vi(100 * y5, 1)}% mỗi năm')
    claim('"hơn bốn lần" lợi suất danh nghĩa', 4 < y3 / sp_nom < 5, f'tỉ số {y3 / sp_nom:.2f}')
    claim('5%/tháng gấp đôi "chưa đầy 15 tháng"', math.log(2) / math.log(1.05) < 15)
    need('lãi mặc định của lab-pz', 'id="pz-m" min="0.5" max="10" step="0.5" value="3"')
    claim('1%/ngày = 365%/năm, "gấp hơn 18 lần" trần 20%', 18 < 365 / 20 < 19)
    need('lãi 1% mỗi ngày trong bài', 'là 365%/năm tính đơn — gấp hơn 18 lần mức trần')

    # ── Thu nhập (s-thunhap): 7,4% của giá trị hôm nay ở lab-hk ────────────────
    need('7,4% thu nhập cả đời', f'7,4% thu nhập cả đời đáng giá khoảng <b>{vi(round(0.074 * hc, -1), 0)} triệu đồng hôm nay</b>',
         0.074 * hc)

    # ── Điểm hoà vốn (lab-be): nghìn đồng, chi phí cố định 60 triệu = 60.000 nghìn ──
    for idv in ('id="be-p" value="35"', 'id="be-v" value="12"', 'id="be-f" value="60"', 'id="be-q" value="3000"'):
        need('giá trị mặc định của lab-be', idv)
    p, v, F, q = 35, 12, 60_000, 3000
    cm = p - v
    be = F / cm
    prof = q * cm - F
    mos = (q - be) / q
    dol = q * cm / prof
    rest = (prof - 0.1 * q * cm) / 1000
    need('lab-be, lời dặn',
         f'hoà vốn ở {vi(math.ceil(be), 0)} đơn vị mỗi tháng, khoảng {vi(be / 30, 0)} đơn vị mỗi ngày; '
         f'lãi {vi(prof / 1000, 0)} triệu mỗi tháng; biên an toàn {vi(100 * mos, 1)}%. '
         f'Đòn bẩy hoạt động {vi(dol, 2)}: doanh số giảm 10% thì lãi giảm {vi(10 * dol, 1)}%, còn {vi(rest, 1)} triệu.')
    near('đòn bẩy hoạt động = %Δlãi ÷ %Δdoanh số', ((0.9 * q * cm - F) / prof - 1) / -0.1, dol, 1e-9)

    # ── Định giá (mục 1.11) ───────────────────────────────────────────────────
    price, rent = 4000, 12                          # triệu đồng
    gross = rent * 12 / price
    net_m = rent * 11 - 0.01 * price                # trống 1 tháng, chi phí 1% giá nhà mỗi năm
    interest = 2000 * 0.09
    need('lợi suất cho thuê gộp', f'Căn hộ 4 tỷ cho thuê 12 triệu/tháng: {vi(100 * gross, 1)}%/năm')
    need('lợi suất cho thuê ròng', f'còn {vi(net_m, 0)} triệu, tức {vi(100 * net_m / price, 1)}%/năm')
    need('vay để mua cho thuê', f'tiền lãi {vi(interest, 0)} triệu một năm, dòng tiền cho thuê ròng {vi(net_m, 0)} triệu — '
                                f'mỗi năm hụt {vi(interest - net_m, 0)} triệu')
    need('quy tắc 72', f'6%/năm: khoảng {vi(72 / 6, 0)} năm (tính chính xác: {vi(math.log(2) / math.log(1.06), 1)} năm)')
    need('P/E 20', f'lợi suất lợi nhuận 1/20 = {vi(100 / 20, 0)}%/năm')

    # ── Phạt là giá (mục 4.4): bảng 1 của Gneezy & Rustichini (2000), lượt đón muộn mỗi tuần ──
    TEST = [[8, 8, 7, 6, 8, 9, 9, 12, 13, 13, 15, 13, 14, 16, 14, 15, 16, 13, 15, 17],
            [6, 7, 3, 5, 2, 11, 14, 9, 16, 12, 10, 14, 14, 16, 12, 17, 14, 10, 14, 15],
            [8, 9, 8, 9, 3, 5, 15, 18, 16, 14, 20, 18, 25, 22, 27, 19, 20, 23, 23, 22],
            [10, 3, 14, 9, 6, 24, 8, 22, 22, 19, 25, 18, 23, 22, 24, 17, 15, 23, 25, 18],
            [13, 12, 9, 13, 15, 10, 27, 28, 35, 10, 24, 32, 29, 29, 26, 31, 26, 35, 29, 28],
            [5, 8, 7, 5, 5, 9, 12, 14, 19, 17, 14, 13, 10, 15, 14, 16, 6, 12, 17, 13]]
    CTRL = [[7, 10, 12, 6, 4, 13, 7, 8, 5, 12, 3, 5, 6, 13, 7, 4, 7, 10, 4, 6],
            [12, 9, 14, 18, 10, 11, 6, 15, 14, 13, 7, 12, 9, 9, 17, 8, 5, 11, 8, 13],
            [3, 4, 9, 3, 3, 5, 9, 5, 2, 7, 6, 6, 9, 4, 9, 2, 3, 8, 3, 5],
            [15, 13, 13, 12, 10, 9, 15, 15, 15, 10, 17, 12, 13, 11, 14, 17, 12, 9, 15, 13]]
    wk = lambda M, ws: sum(sum(r[w] for r in M) for w in ws) / len(ws)
    first, last = range(4), range(16, 20)            # tuần 1–4 (chưa phạt), 17–20 (đã bỏ phạt)
    need('nhà trẻ Haifa, nhóm bị phạt', f'tăng từ trung bình {vi(wk(TEST, first), 0)} trong bốn tuần đầu lên '
                                        f'{vi(wk(TEST, last), 0)} trong bốn tuần cuối')
    need('nhà trẻ Haifa, nhóm đối chứng', f'nhóm không phạt đi từ {vi(wk(CTRL, first), 0)} xuống {vi(wk(CTRL, last), 0)}')

    # ── Lời cảm ơn (mục 3.3): bảng 3 của Grant & Gino (2010), thí nghiệm 3 ──────
    g0, g1, c0, c1 = 41.40, 62.60, 39.76, 41.38
    claim('cảm ơn: "hơn 50%"', g1 / g0 - 1 > 0.5, f'tính được {g1 / g0 - 1:.3f}')
    need('cảm ơn, số cuộc gọi', f'từ trung bình {vi(g0, 1)} lên {vi(g1, 1)} — hơn 50%; nhóm không được cảm ơn gần như '
                                f'đứng yên, từ {vi(c0, 1)} lên {vi(c1, 1)}')

    # ── Luthans (1988) và tỉ lệ sống của doanh nghiệp (SBA 2026) ────────────────
    claim('Luthans: nhóm lên chức nhanh cộng đủ 100%', 48 + 28 + 13 + 11 == 100)
    claim('Luthans: nhóm hiệu quả cộng đủ 100%', 44 + 26 + 19 + 11 == 100)
    need('Luthans trong bài', 'dành 48% thời gian cho giao thiệp')
    need('Luthans, ô số ở đầu trang', '<span class="n">48% / 11%</span>')
    surv = [67.7, 49.2, 33.9, 25.5]
    claim('tỉ lệ sống giảm dần theo thời gian', all(a > b for a, b in zip(surv, surv[1:])))
    need('tỉ lệ sống trong bài', '<b>67,7%</b> sống qua 2 năm, <b>49,2%</b> qua 5 năm, <b>33,9%</b> qua 10 năm và '
                                 '<b>25,5%</b> qua 15 năm')

    # ── Cập nhật niềm tin (s-bayes, lab-bayes) ────────────────────────────────
    tp, fpos = 1000 * 0.01 * 0.9, 1000 * 0.99 * 0.09
    need('Bayes: người lành dương tính', f'990 người lành thì khoảng {vi(fpos, 0)} người dương tính', fpos)
    need('Bayes: phần dương tính thật', f'Trong khoảng {vi(tp + fpos, 0)} kết quả dương tính, chỉ {vi(tp, 0)} người thật '
                                       f'sự bệnh — <b>khoảng {vi(100 * tp / (tp + fpos), 0)}%</b>', tp / (tp + fpos))
    claim('nhũ ảnh: 4 xuống 3 trên 1.000 là “giảm 25%”', (4 - 3) / 4 == 0.25)
    need('nhũ ảnh trong bài', 'cứ 1.000 phụ nữ đi chụp thì có thêm 1 người không chết vì bệnh này')
    ls, ll = 0.7 ** 3, 0.5 ** 3
    post = 0.05 * ls / (0.05 * ls + 0.95 * ll)
    need('Bayes: quỹ thắng ba năm', f'Ba năm thắng liên tiếp có xác suất {vi(100 * ls, 1)}% và {vi(100 * ll, 1)}%, nên sức nặng bằng chứng là {vi(ls / ll, 2)}')
    need('Bayes: tỉ số cược sau', f'Tỉ số cược từ 5:95 lên khoảng {vi(5 * ls / ll, 0)}:95: xác suất giỏi tăng từ 5% lên <b>{vi(100 * post, 1)}%</b>', post)

    def trail(p0, a, b, seq):
        odds = p0 / (1 - p0)
        for o in seq:
            odds *= (1 - a) / (1 - b) if o else a / b
        return odds / (1 + odds)
    a, b = 0.05, 0.5
    for idv in ('id="by-prior" min="1" max="99" step="1" value="90"', 'id="by-ft" min="1" max="40" step="1" value="5"',
                'id="by-fu" min="10" max="95" step="1" value="50"'):
        need('giá trị mặc định của lab-bayes', idv)
    need('lab-bayes: người quen lâu năm', f'niềm tin từ {vi(100 * trail(0.9, a, b, [1] * 10), 2)}% xuống '
                                         f'{vi(100 * trail(0.9, a, b, [1] * 10 + [0]), 2)}%')
    need('lab-bayes: người mới thất hứa', f'thất hứa ngay lần đầu: còn {vi(100 * trail(0.5, a, b, [0]), 1)}%')
    need('lab-bayes: thất hứa xen giữ lời', f'từ mức tin 90%: còn {vi(100 * trail(0.9, a, b, [0, 1, 0, 1, 0]), 1)}%')
    need('lab-bayes: hai hệ số', f'Mỗi lần giữ lời nhân tỉ số cược với {vi((1 - a) / (1 - b), 1)}; mỗi lần thất hứa '
                                f'nhân với {vi(a / b, 1)}')
    claim('lab-bayes: một lần thất hứa nặng hơn một lần giữ lời', abs(math.log(a / b)) > abs(math.log((1 - a) / (1 - b))))

    # ── Đa dạng hoá (s-danhmuc, lab-div) ─────────────────────────────────────
    def sd(sig, r, n):
        return sig * math.sqrt(r + (1 - r) / n)
    for idv in ('id="dv-s" min="10" max="60" step="1" value="30"', 'id="dv-r" min="0" max="100" step="5" value="30"',
                'id="dv-n" min="1" max="50" step="1" value="10"'):
        need('giá trị mặc định của lab-div', idv)
    floor = 0.3 * math.sqrt(0.3)
    nmin = next(n for n in range(1, 1000) if sd(0.3, 0.3, n) <= 1.1 * floor)
    need('lab-div: mười tài sản', f'mười tài sản còn {vi(100 * sd(0.3, 0.3, 10), 2)}%')
    need('lab-div: cái sàn', f'không xuống dưới {vi(100 * floor, 2)}%')
    need('lab-div: số tài sản để vào trong 10% trên sàn', f'Chỉ cần {nmin} tài sản là đã vào trong khoảng 10% trên cái sàn')
    claim('lab-div: công thức tìm N trong mã khớp phép đếm', math.ceil((1 - 0.3) / (0.21 * 0.3) - 1e-9) == nmin)
    need('lab-div: khủng hoảng', f'mười tài sản vẫn dao động {vi(100 * sd(0.3, 0.8, 10), 2)}%')

    # ── Quyền chọn (s-quyenchon) ─────────────────────────────────────────────
    need('mười phép thử, ít nhất một lần trúng', f'<b>{vi(100 * (1 - 0.9 ** 10), 1)}%</b> cơ hội trúng ít nhất một lần')
    claim('mỗi phép thử có kỳ vọng dương', 0.1 * 300 - 10 > 0)
    need('chi phí mười phép thử', 'Mười thử nghiệm độc lập tốn 100 triệu')

    # ── Các con số dẫn từ nguồn ở các mục mới (giữ khỏi bị sửa lệch) ─────────────
    need('Tetlock 2005', 'theo dõi 284 chuyên gia với 82.361 dự báo')
    need('Lewicki 2016', 'qua hai thí nghiệm với 333 người lớn và 422 sinh viên')
    need('Marsh và Hau 2003', 'khảo sát 103.558 học sinh 15 tuổi ở 26 nước và thấy ở cả 26 nước')
    need('Resnick 2006', 'người mua trả cho tên quen cao hơn <b>8,1%</b> giá bán')

    # ── Đếm trên chính trang ──────────────────────────────────────────────────
    nsec = len(re.findall(r'<section id="s-', HTML))
    heads = re.findall(r'<div class="hc-part-head" id="([a-z]+)"', HTML)
    kicks = re.findall(r'<p class="hc-lab__kick">Mô hình (\d+) / (\d+) ·', HTML)
    nlab = len(kicks)
    need('số phần ở đầu trang', f'· {len(heads) - 1} phần ·', len(heads) - 1)
    need('số mục ở đầu trang', f'· {nsec} mục ·', nsec)
    need('số mô hình ở đầu trang', f'· {nlab} mô hình ·', nlab)
    claim('mô hình đánh số 1…N theo thứ tự xuất hiện, mẫu số N',
          [int(x) for x, _ in kicks] == list(range(1, nlab + 1)) and all(int(y) == nlab for _, y in kicks), f'thấy {kicks}')
    claim('mười mô hình', nlab == 10, f'thấy {nlab}')

    # Số mục trong eyebrow chạy liền theo phần; mỗi đầu phần đếm đúng và kể đủ các mục của nó.
    VN = {'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10}
    eyebrow = dict(re.findall(r'<section id="(s-[a-z]+)">\s*<p class="hc-eyebrow-sec"><b>([^<]+)</b>', HTML))
    claim('mọi mục có số ở eyebrow', len(eyebrow) == nsec, f'{len(eyebrow)} trên {nsec}')
    bad_eb, bad_head = [], []
    for i, h in enumerate(heads):
        a0 = HTML.index(f'<div class="hc-part-head" id="{h}"')
        b0 = HTML.index('<div class="hc-part-head" id=', a0 + 10) if i + 1 < len(heads) else HTML.index('</main>')
        secs = re.findall(r'<section id="(s-[a-z]+)">', HTML[a0:b0])
        for k, sid in enumerate(secs, 1):
            want = f'Khung {k}/{len(secs)}' if i == 0 else f'{i}.{k}'
            if eyebrow.get(sid) != want:
                bad_eb.append(f'{sid}: {eyebrow.get(sid)} ≠ {want}')
        ph = re.search(r'<h2>(.*?)</h2>\s*<p>(.*?)</p>', HTML[a0:b0], flags=re.S)
        h2, pp = (re.sub(r'<[^>]+>', '', x) for x in ph.groups())
        m = re.search(r'(\S+) mục: ([^.]*)\.', pp)
        if m:
            ok = VN.get(m.group(1).lower()) == len(secs) == len(m.group(2).split('; '))
        else:
            m, m2 = re.match(r'(\S+) công cụ nghĩ: (.*)$', h2), re.search(r'; (\S+) mục sau', pp)
            ok = bool(m and m2) and VN.get(m.group(1).lower()) == len(secs) == len(m.group(2).split(', ')) \
                and VN.get(m2.group(1)) == len(secs) - 1
        if not ok:
            bad_head.append(h)
    claim('eyebrow đánh số liền theo phần', not bad_eb, '; '.join(bad_eb[:6]))
    claim('đầu phần đếm đúng và kể đủ các mục', not bad_head, 'sai ở ' + ', '.join(bad_head))

    # Mọi liên kết mang số (mục 3.2, Khung 1/3, mô hình 4) phải khớp số của đích; không còn số trơn.
    labno = {lab: int(k) for lab, k in re.findall(
        r'<div class="hc-lab" id="(lab-[a-z]+)">\s*<div class="hc-lab__head">\s*<p class="hc-lab__kick">Mô hình (\d+) /', HTML)}
    bad = []
    for href, text in re.findall(r'<a class="hc-x" href="#([a-z-]+)">([^<]*)</a>', HTML):
        mm = re.fullmatch(r'(?:mục )?(\d+\.\d+|Khung \d+/\d+)', text)
        if mm and eyebrow.get(href) != mm.group(1):
            bad.append(f'#{href} “{text}”')
        mm = re.fullmatch(r'[Mm]ô hình (\d+)', text)
        if mm and labno.get(href) != int(mm.group(1)):
            bad.append(f'#{href} “{text}”')
        mm = re.fullmatch(r'Phần (\d+)', text)
        if mm and (href not in heads or heads.index(href) != int(mm.group(1))):
            bad.append(f'#{href} “{text}”')
    claim('số trong liên kết khớp số của đích', not bad, ', '.join(bad[:8]))
    prose = re.sub(r'<script>.*?</script>|<a [^>]*>.*?</a>|<p class="hc-lab__kick">.*?</p>|<b>[^<]*</b> ·', '', HTML, flags=re.S)
    plain = re.findall(r'[Mm]ô hình \d+|mục \d+\.\d+', prose)
    claim('không còn số mục, số mô hình viết trơn (không bấm được, dễ lệch)', not plain, ', '.join(plain[:8]))

    groups = collections.Counter(re.findall(r'<input type="checkbox" id="au-([a-z]+)\d" data-k="\1">', HTML))
    nau = len(re.findall(r'id="au-[a-z]+\d"', HTML))
    claim('tự soát: 7 nhóm × 5 câu, id khớp nhóm', len(groups) == 7 and set(groups.values()) == {5} and sum(groups.values()) == nau,
          f'{dict(groups)}, {nau} ô')
    keys = re.search(r"var KEYS = \[([^\]]*)\];", HTML)
    claim('tự soát: KEYS trong mã đúng các nhóm, đúng thứ tự', bool(keys) and [k.strip(" '") for k in keys.group(1).split(',')] == list(groups))
    need('bài tự soát, tiêu đề', 'Ba mươi lăm câu: năm loại vốn, quyền lực và gia đình')
    need('bài tự soát ở đầu phần Thực hành', 'bài tự soát ba mươi lăm câu')
    need('bài tự soát ở thẻ phần', f'tự soát {nau} câu')
    npl = len(re.findall(r'id="pl-[a-c]\d"', HTML))
    claim('lộ trình: 23 việc', npl == 23, f'thấy {npl} ô')
    books = re.search(r'Mười cuốn để đọc theo nhu cầu</h3>\s*<ol class="hc-ol">(.*?)</ol>', HTML, flags=re.S)
    claim('mười sách tham khảo theo nhu cầu', bool(books) and books.group(1).count('<li>') == 10)
    need('lộ trình chọn sách theo vấn đề và áp dụng', 'Chọn cuốn đáp đúng câu hỏi đang gặp và thử áp dụng một ý')
    tt = re.search(r'<section id="s-tomtat">.*?<tbody>(.*?)</tbody>', HTML, flags=re.S).group(1)
    rows = re.findall(r'<tr><td class="hc-num">(\d+)</td><td>.*?</td><td><a class="hc-x" href="#(s-[a-z]+)">', tt)
    skip = {'s-cach', 's-tusoat', 's-lotrinh', 's-tomtat', 's-thuvien', 's-nguon'}
    order = [x for x in re.findall(r'<section id="(s-[a-z]+)">', HTML) if x not in skip]
    claim('bảng tóm tắt: mỗi mục một dòng, đúng thứ tự trang, đánh số liền',
          [x for _, x in rows] == order and [int(k) for k, _ in rows] == list(range(1, len(rows) + 1)),
          f'{len(rows)} dòng, {len(order)} mục')
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
    ('lab-be: đổi triệu ra nghìn đồng', 'var p = +pEl.value, v = +vEl.value, F = +fEl.value * 1000, q = +qEl.value;'),
    ('lab-be: hoà vốn và lãi', 'var be = F / cm, profit = q * cm - F;'),
    ('lab-be: đòn bẩy hoạt động', 'var dol = q * cm / profit, drop = 0.1 * dol;'),
    ('tự soát: bảy nhóm', "var KEYS = ['kt', 'cn', 'xh', 'vh', 'kd', 'ql', 'gd'];"),
    ('lab-bayes: nhân tỉ số cược sau mỗi lần quan sát',
     's.forEach(function (o) { odds *= o ? (1 - a) / (1 - b) : a / b; out.push(odds / (1 + odds)); });'),
    ('lab-div: độ lệch chuẩn của danh mục', 'function sd(s, r, n) { return s * Math.sqrt(r + (1 - r) / n); }'),
    ('lab-div: số tài sản để vào trong 10% trên sàn', 'var need = Math.ceil((1 - r) / (0.21 * r) - 1e-9);'),
    ('lab-div: khủng hoảng đẩy tương quan lên 0,8', 'crisis = false, RC = 0.8'),
    ('thư viện: chữ vào DOM bằng textContent', 'if (text !== undefined) e.textContent = text;'),
    ('thư viện: đọc dữ liệu từ file JSON', "fetch('data/hidden-curriculum.json', { cache: 'no-cache' })"),
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

    # Đa dạng hoá: phương sai = (1/N²)·ΣΣ σ²ρ_ij, cộng từng cặp, không dùng công thức gọn của trang.
    for sig, r, n in ((0.3, 0.3, 10), (0.3, 0.8, 10), (0.45, 0.1, 37)):
        var = sum(sig * sig * (1 if i == j else r) for i in range(n) for j in range(n)) / n ** 2
        near(f'danh mục σ={sig}, ρ={r}, N={n}: cộng từng cặp', math.sqrt(var), sig * math.sqrt(r + (1 - r) / n), 1e-12)
    # Bayes: đếm trên một đám đông giả lập phải gặp công thức tỉ số cược.
    rng2 = random.Random(1763)
    good = [rng2.random() < 0.05 for _ in range(200000)]
    wins = [all(rng2.random() < (0.7 if g else 0.5) for _ in range(3)) for g in good]
    hit = sum(1 for g, w in zip(good, wins) if g and w) / max(1, sum(wins))
    near('quỹ thắng ba năm: đếm trên 200.000 quỹ giả lập', hit, 0.05 * 0.343 / (0.05 * 0.343 + 0.95 * 0.125), 0.01)

    # Giải đấu của lab-ipd — kiểm đúng những câu lời văn nói.
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
    need('lời văn về lab-ipd', 'với quan hệ từ 50 lượt trở lên, Rộng lượng đứng đầu ở mọi mức nhầm lẫn')


# ══════════════════════════════════════════════════════════════════════════════
# E. Thư viện mô hình
# ══════════════════════════════════════════════════════════════════════════════
CARD = ['id', 'name', 'en', 'layer', 'kind', 'idea', 'why', 'mechanism', 'mistake', 'example', 'use', 'limits',
        'remember', 'related', 'sections']
KINDS = {'math', 'solid', 'mixed', 'theory', 'hist', 'lore', 'custom'}


def phan_E():
    if not DATA.exists():
        fails.append('không thấy ' + str(DATA))
        return
    try:
        cards = json.loads(DATA.read_text(encoding='utf-8'))['concepts']
    except (ValueError, KeyError) as e:
        fails.append(f'không đọc được {DATA.name}: {e}')
        return
    ids = [c.get('id') for c in cards]
    claim('thư viện: id duy nhất', len(ids) == len(set(ids)), 'trùng ' + ', '.join(sorted(set(i for i in ids if ids.count(i) > 1))))
    idset, secs = set(ids), set(re.findall(r'<section id="(s-[a-z]+)">', HTML))
    layers = set(re.findall(r'<button class="wb-btn wb-btn--outline wb-btn--sm[^"]*" data-l="([a-z]+)">', HTML)) - {'all'}
    bad = collections.defaultdict(list)
    for c in cards:
        cid = c.get('id')
        if list(c) != CARD:
            bad['đủ và đúng thứ tự các trường'].append(cid)
        if c.get('layer') not in layers:
            bad['tầng có nút lọc'].append(cid)
        if not c.get('kind') or not set(c['kind']) <= KINDS:
            bad['nhãn độ tin hợp lệ'].append(cid)
        if not all(isinstance(c.get(f), str) and c[f].strip() and not re.search(r'[<>]', c[f]) for f in CARD
                   if f not in ('kind', 'related', 'sections')):
            bad['chữ thuần, không rỗng, không HTML'].append(cid)
        rel = c.get('related', [])
        if not (2 <= len(rel) <= 4) or len(set(rel)) != len(rel) or cid in rel or not set(rel) <= idset:
            bad['2–4 mô hình liên quan có thật'].append(cid)
        sec = c.get('sections', [])
        if not (1 <= len(sec) <= 4) or not set(sec) <= secs:
            bad['1–4 mục có thật'].append(cid)
    for what in ('đủ và đúng thứ tự các trường', 'tầng có nút lọc', 'nhãn độ tin hợp lệ', 'chữ thuần, không rỗng, không HTML',
                 '2–4 mô hình liên quan có thật', '1–4 mục có thật'):
        claim('thư viện: ' + what, not bad[what], 'sai ở ' + ', '.join(map(str, bad[what][:10])))
    claim('thư viện: mỗi tầng trong bộ lọc có thẻ', layers == set(c.get('layer') for c in cards))
    claim('thư viện: không có trường _html (REPO-001)', not any(k.endswith('_html') for c in cards for k in c))
    # Thẻ không được mang số riêng: mỗi con số trong thẻ phải có mặt trên trang (chữ hoặc aria-label của hình),
    # để sửa một con số ở mục mà quên thẻ thì cổng đỏ. Bỏ qua các số nhỏ dùng như chữ (một, hai, mười…).
    pool = TEXT + ' ' + ' '.join(re.findall(r'aria-label="([^"]*)"', HTML))
    num = re.compile(r'[×−]?\d[\d.]*(?:,\d+)?%?')
    stray = sorted(set((c.get('id'), m.group(0).rstrip('.')) for c in cards
                       for f in ('idea', 'why', 'mechanism', 'mistake', 'example', 'use', 'limits', 'remember')
                       for m in num.finditer(str(c.get(f, '')))
                       if m.group(0).rstrip('.').lstrip('×−') not in ('0', '1', '2', '3', '4', '5', '6', '10', '100')
                       and m.group(0).rstrip('.') not in pool and m.group(0).rstrip('.').lstrip('×−') not in pool))
    claim('thư viện: mọi con số trong thẻ có mặt trên trang', not stray, ', '.join(f'{i}: {x}' for i, x in stray[:12]))
    need('số khái niệm ở đầu trang', f'· {len(cards)} khái niệm</p>', len(cards))
    claim('thư viện: ít nhất 60 khái niệm', len(cards) >= 60, f'có {len(cards)}')


# ══════════════════════════════════════════════════════════════════════════════
# F. Vốn, nghề, gia đình
# ══════════════════════════════════════════════════════════════════════════════
def phan_F():
    vn = vi
    # Chuỗi lấy từ nguồn: mỗi chuỗi ứng một dòng kiểm nguồn; sửa thì mở lại nguồn.
    for x in ('Luật Bảo hiểm tiền gửi 2025 (Luật 111/2025/QH15)', '350 triệu đồng', 'Thông tư 05/2026/TT-NHNN',
              '125 triệu đồng', 'tối đa 45 ngày', 'bằng đồng Việt Nam của cá nhân', 'trên 5% vốn điều lệ',
              'giấy tờ có giá vô danh', '139 doanh nghiệp', '83.600 tỉ đồng', '50,7%', '9,9% GDP',
              'Nghị định 08/2023/NĐ-CP', 'tối đa hai năm', 'Nghị định 200/2026/NĐ-CP', '2 tỷ đồng', '180 ngày', '39,2%',
              '25.967', '42,6%', '1.092', '34,82 nghìn tỷ USD', '2,4%', '75,7 nghìn tỷ USD', '40% năm 1982',
              '69% năm 2011', '60% xuống 32%', '5,8 triệu USD', 'gần ba phần tư nhận 0', '62%', '89%', '2/12/2001',
              '39,70%', '10,37%', 'owner earnings', '29 công ty', '39 công ty', 'khoảng 1%/năm', 'trên 12%/năm',
              '97 biến', '58%', 'ít nhất 10 năm', '36,55%', '20,10%', '−18,04%', '−17,83%', '−0,82', '−0,31',
              '−1,04%', '2,24%', '1.820,1', '2.610,85', '1.000 tấn', '473 tấn', '863 tấn', '15.858,92', '24.164,89',
              '3,92%', 'Luật 71/2025/QH15', 'Nghị quyết 05/2025/NQ-CP', '109/2025/QH15', '0,1%', '1,84%', '3,15%',
              '3,25%', '3,63%', '3,31%', '12,73%', '23,12%'):
        need_t('vốn, chuỗi từ nguồn', x)

    need_t('bảo hiểm tiền gửi: hạn mức mới so với cũ', f'gấp {vn(350 / 125, 1)} lần', 350 / 125)
    claim('Bessembinder: 57,4% thua tín phiếu là “hơn bốn trên bảy”', 1 - 0.426 > 4 / 7)
    claim('Bessembinder: 1.092 trên khoảng 25.300 công ty là “hơn 4%”', 0.04 < 1092 / 25300 < 0.05)
    need_t('Bessembinder trong bài', 'vượt tín phiếu kho bạc một tháng')

    # Giá trị = lợi nhuận năm tới × (1 − g/ROIC) / (chi phí vốn − g); lợi nhuận 100, chi phí vốn 10%, g = 5%.
    for roic in (0.20, 0.10, 0.08):
        val, ir = 100 * (1 - 0.05 / roic) / (0.10 - 0.05), 0.05 / roic * 100
        need_t(f'bảng giá trị, ROIC {roic:.0%}', f'Tăng 5%/năm, ROIC {round(roic * 100)}% {vn(ir, 1 if ir % 1 else 0)}% {vn(val, 0)}', val)
    need_t('bảng giá trị, không tăng trưởng', f'Không tăng trưởng 0% {vn(100 / 0.10, 0)}')

    # Kỳ vọng ẩn trong giá: P/E 40, người mua đòi 9%/năm.
    PE, r = 40, 0.09
    need_t('E/P của P/E 40', f'E/P = {vn(100 / PE, 1)}%')
    need_t('g hàm ý khi trả hết lợi nhuận', f'khoảng {vn((r - 1 / PE) * 100, 1)}%/năm mãi mãi')
    g15 = (1 - PE * r) / (1 / 0.15 - PE)          # PE = (1 − g/ROIC)/(r − g), ROIC 15%
    need_t('g hàm ý khi tái đầu tư với ROIC 15%', f'khoảng {vn(g15 * 100, 1)}%/năm', g15)

    def price2(g1, g2=0.03, n=10):
        pv, e = 0.0, 1.0
        for t in range(1, n + 1):
            pv += e / (1 + r) ** t
            if t < n:
                e *= 1 + g1
        return pv + (e * (1 + g1) / (r - g2)) / (1 + r) ** n
    lo, hi = 0.0, 0.5
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (lo, mid) if price2(mid) > PE else (mid, hi)
    need_t('tăng trưởng mười năm đầu rồi 3%/năm', f'khoảng {vn(lo * 100, 1)}%/năm', lo)
    claim('lợi nhuận sau mười năm “gấp khoảng 4 lần”', round((1 + lo) ** 10) == 4, f'{(1 + lo) ** 10:.2f}')
    need_t('gấp khoảng 4 lần trong bài', 'gấp khoảng 4 lần')

    # Đa dạng hoá: bảng và đoạn đọc mô hình (σ = 30%).
    s0 = 30.0
    for rho, label in ((0, '0 (độc lập)'), (0.3, '0,3 (ngày thường)'), (0.8, '0,8 (khủng hoảng)')):
        cells = [vn(s0 * math.sqrt(rho + (1 - rho) / N), 1) + '%' for N in (1, 5, 10, 20)]
        last = 'về 0' if rho == 0 else vn(s0 * math.sqrt(rho), 1) + '%'
        need_t(f'bảng đa dạng hoá, ρ = {rho}', f'ρ = {label} ' + ' '.join(cells) + ' ' + last)
    n10, n50 = s0 * math.sqrt(0.37), s0 * math.sqrt(0.3 + 0.7 / 50)
    need_t('đọc mô hình: N 10 → 50', f'từ {vn(n10, 2)}% xuống {vn(n50, 2)}%')
    claim('đọc mô hình: bớt “chưa tới 1,5 điểm phần trăm”', n10 - n50 < 1.5, f'{n10 - n50:.2f}')
    need_t('đọc mô hình: ρ = 0, N = 20', f'hai mươi tài sản còn {vn(s0 / math.sqrt(20), 2)}%')
    need_t('đọc mô hình: sàn khi khủng hoảng', f'sàn lên {vn(s0 * math.sqrt(0.8), 2)}%')
    share10 = (s0 - n10) / (s0 - s0 * math.sqrt(0.3))
    need_t('mười tài sản bỏ được bao nhiêu phần rủi ro bỏ được', f'bỏ đi {round(share10 * 100)}%', share10)

    st = 60 * 1.3
    need_t('tái cân bằng 60/40 sau một năm cổ phiếu +30%', f'{vn(st / (st + 40) * 100, 1)}% / {vn(40 / (st + 40) * 100, 1)}%')
    need_t('khoản 5% về 0', f'lãi {vn(0.05 / 0.95 * 100, 1)}%')
    need_t('khoản 40% mất một nửa', f'cần lãi {vn(0.2 / 0.8 * 100, 0)}%')

    # Thứ tự lợi suất: 1.000 triệu, rút (hoặc góp) 60 triệu cuối mỗi năm.
    good, bad = [0.2, 0.1, -0.2, -0.1], [-0.1, -0.2, 0.1, 0.2]

    def run(seq, c=-60.0):
        w, out = 1000.0, []
        for x in seq:
            w = w * (1 + x) + c
            out.append(w)
        return out
    for i, (a, b) in enumerate(zip(run(good), run(bad)), start=1):
        need_t(f'thứ tự lợi suất, năm {i}', f'{i} {vn(a, 1)} {vn(b, 1)}')
    prod = 1.2 * 1.1 * 0.8 * 0.9
    need_t('thứ tự lợi suất: tích bốn thừa số', vn(prod, 4))
    need_t('thứ tự lợi suất: không rút', vn(1000 * prod, 1))
    need_t('thứ tự lợi suất: chênh hai kết cục', vn(run(good)[-1] - run(bad)[-1], 2))
    need_t('góp đều, năm xấu trước', vn(run(bad, 60)[-1], 2))
    need_t('góp đều, năm tốt trước', vn(run(good, 60)[-1], 2))
    claim('góp đều thì năm xấu trước lại tốt hơn', run(bad, 60)[-1] > run(good, 60)[-1])

    def bond(c, n, y):
        return sum(c / (1 + y) ** t for t in range(1, n + 1)) + 100 / (1 + y) ** n
    need_t('trái phiếu 10 năm khi lãi lên 7%', vn(bond(5, 10, 0.07), 2))
    need_t('trái phiếu 10 năm: mức giảm', f'mất {vn(100 - bond(5, 10, 0.07), 2)}%')
    need_t('trái phiếu 10 năm khi lãi xuống 3%', vn(bond(5, 10, 0.03), 2))
    need_t('trái phiếu 2 năm', f'giá giảm {vn(100 - bond(5, 2, 0.07), 2)}%')

    need_t('lợi suất thực với 5% và 3,31%', f'{vn((1.05 / 1.0331 - 1) * 100, 2)}%/năm')
    need_t('phép trừ nhanh', f'{vn(5 - 3.31, 2)}%')
    need_t('lợi suất thực năm 2008', f'{vn((1.1273 / 1.2312 - 1) * 100, 1)}%')
    need_t('phép trừ năm 2008', f'{vn(12.73 - 23.12, 1)}%')
    fx = 24164.89 / 15858.92
    need_t('đồng mất giá so với USD 2005 → 2024', f'mất {vn((1 - 1 / fx) * 100, 1)}%')
    need_t('mất giá bình quân năm', f'khoảng {vn((fx ** (1 / 19) - 1) * 100, 2)}% mỗi năm')
    need_t('giá vàng cuối 2021 → cuối 2024', f'tức {vn((2610.85 / 1820.1 - 1) * 100, 1)}%')
    # Lãi tiền gửi và lạm phát Việt Nam 2005–2023 (World Bank FR.INR.DPST, FP.CPI.TOTL.ZG), bình quân nhân.
    dep = [7.145, 7.63, 7.492, 12.73, 7.91, 11.194, 13.993, 10.504, 7.14, 5.758, 4.747, 5.035, 4.809, 4.738,
           4.975, 4.12, 3.375, 3.817, 4.781]
    inf = [8.285, 7.418, 8.344, 23.115, 6.717, 9.207, 18.678, 9.095, 6.593, 4.085, 0.631, 2.668, 3.52, 3.54,
           2.796, 3.221, 1.835, 3.157, 3.253]
    pd_, pi_ = math.prod(1 + x / 100 for x in dep), math.prod(1 + x / 100 for x in inf)
    n = len(dep)
    claim('chuỗi tiền gửi 2005–2023 đủ 19 năm', n == len(inf) == 19)
    need_t('lãi tiền gửi bình quân', f'khoảng {vn((pd_ ** (1 / n) - 1) * 100, 1)}%/năm và giá')
    need_t('lạm phát bình quân', f'khoảng {vn((pi_ ** (1 / n) - 1) * 100, 1)}%/năm: lãi thực')
    need_t('lãi thực bình quân', f'chỉ khoảng {vn(((pd_ / pi_) ** (1 / n) - 1) * 100, 1)}%/năm')
    for ltv, x in ((0.5, 'mất 40%'), (0.7, 'mất 66,7%')):
        claim(f'vay {ltv:.0%}, giá −20%: vốn tự có {x}', vn((1 - (0.8 - ltv) / (1 - ltv)) * 100, 1).rstrip('0').rstrip(',') == x[4:-1])
        need_t(f'vay {ltv:.0%} trong bài', x)
    need_t('phí 1%/năm trong 30 năm', f'{vn((1 - (1.07 / 1.08) ** 30) * 100, 1)}% số tiền cuối cùng')
    phan_F2()


def phan_F2():
    """Nghề và gia đình: các phép tính trong bài và vài con số dẫn từ nguồn."""
    vn = vi
    # Quỹ đạo lương (s-tichluy): A 20 triệu +3%/năm, B 15 triệu +10%/năm; lương năm = 12 × lương tháng.
    A = [20 * 1.03 ** (n - 1) for n in range(1, 21)]
    B = [15 * 1.10 ** (n - 1) for n in range(1, 21)]
    first = next(n for n in range(1, 21) if B[n - 1] > A[n - 1])
    cum = next(n for n in range(1, 21) if sum(B[:n]) > sum(A[:n]))
    need_t('lương tháng của B vượt A', f'Lương tháng của B vượt A từ năm thứ {first}', first)
    need_t('tổng thu nhập của B vượt A', f'tổng thu nhập cộng dồn của B vượt A từ năm thứ {cum}', cum)
    need_t('năm thứ 20', f'A nhận khoảng {vn(A[-1], 1)} triệu/tháng, B khoảng {vn(B[-1], 1)} triệu')
    need_t('cộng 20 năm', f'A nhận khoảng {vn(12 * sum(A) / 1000, 2)} tỷ đồng, B khoảng {vn(12 * sum(B) / 1000, 2)} tỷ')
    b20 = 15 * 1.10 ** 10 * 1.03 ** 9          # mười lần tăng 10%, rồi 3% như A
    need_t('giả định khắc nghiệt hơn', f'B vẫn nhận khoảng {vn(b20, 1)} triệu/tháng, cao hơn A khoảng {round(100 * (b20 / A[-1] - 1))}%')
    # “khoảng cách ấy giữ nguyên tới cuối”: từ năm 11 cả hai cùng tăng 3%/năm, nên tỉ số B/A không đổi.
    ba = [15 * 1.10 ** min(n - 1, 10) * 1.03 ** max(n - 11, 0) / (20 * 1.03 ** (n - 1)) for n in range(11, 41)]
    claim('từ năm 11, tỉ số lương B/A không đổi', max(ba) - min(ba) < 1e-9, f'{min(ba):.6f}…{max(ba):.6f}')
    need_t('khoảng cách giữ nguyên', 'và khoảng cách ấy giữ nguyên tới cuối, vì các lần tăng sau đều tính theo phần trăm')
    # Thừa kế (s-giayto): phần di sản 1,2 tỷ, bốn người hàng thứ nhất, Điều 644 Bộ luật Dân sự: 2/3 một suất.
    suat = 1200 / 4
    need_t('một suất theo luật', f'một suất theo luật là {vn(suat, 0)} triệu', suat)
    need_t('hai phần ba suất', f'tức {vn(suat * 2 / 3, 0)} triệu, cộng lại {vn(4 * suat * 2 / 3, 0)} triệu; em trai nhận {vn(1200 - 4 * suat * 2 / 3, 0)} triệu')
    # Ngành học (s-daycon): 0,561 điểm log là khoảng 75%.
    claim('0,561 điểm log ≈ cao hơn 75%', round(100 * (math.exp(0.561) - 1)) == 75, f'{100 * (math.exp(0.561) - 1):.1f}%')
    need_t('Altonji, Blom và Meghir', '(0,561 điểm log, tức cao hơn khoảng 75%)')
    # Ý kiến thứ hai (s-giayto): Van Such và cộng sự (2017), 286 ca.
    claim('Van Such: 36 + 188 + 62 = 286', 36 + 188 + 62 == 286)
    need_t('Van Such trong bài', 'Chẩn đoán cuối giống chẩn đoán lúc chuyển ở 36 ca (12%), được làm rõ hơn ở 188 ca (66%), và khác hẳn ở 62 ca (21%)')
    # Bảng luật: mỗi câu hỏi đi với đúng điều đã đối chiếu văn bản, đúng thứ tự (s-honnhan: Luật Hôn nhân và
    # gia đình 2014; s-giayto: Bộ luật Dân sự 2015).
    LAW = {
        's-honnhan': [
            ('Tài sản nào là chung?', '33'), ('Không chứng minh được là riêng?', '33'),
            ('Tài sản nào là riêng?', '43'), ('Bán, thế chấp nhà đất chung', '35, 31'),
            ('Giấy chứng nhận đứng tên ai?', '34'), ('Nợ nào là nợ chung?', '37, 27'), ('Nợ nào là nợ riêng?', '45'),
            ('Tự đặt chế độ tài sản', '47, 48'), ('Chia tài sản chung khi còn hôn nhân', '38, 42'),
            ('Khi ly hôn', '59'), ('Khi một người mất', '66'),
        ],
        's-giayto': [
            ('Ai lập được di chúc?', '625, 630'), ('Hình thức', '627, 629'), ('Di chúc miệng', '629, 630'),
            ('Tự viết, không người làm chứng', '631, 633'), ('Có người làm chứng', '632, 634'),
            ('Thế nào là hợp pháp?', '630'), ('Sửa, thay, gửi giữ', '640, 643, 641'),
            ('Ai vẫn được hưởng dù di chúc không cho?', '644'), ('Di sản thờ cúng', '645'),
            ('Không có di chúc', '650, 651'), ('Di sản gồm gì?', '612'), ('Nợ của người mất', '615'),
            ('Thời hiệu', '623'),
        ],
    }
    for sid, want in LAW.items():
        tb = re.search(r'<th>Điều</th>.*?<tbody>(.*?)</tbody>', muc(sid), flags=re.S)
        got = [(chu(r[0]), chu(r[-1])) for r in (re.findall(r'<td[^>]*>(.*?)</td>', tr, flags=re.S)
               for tr in re.findall(r'<tr>(.*?)</tr>', tb.group(1) if tb else '', flags=re.S)) if r]
        claim(f'{sid}: bảng luật có {len(want)} dòng', len(got) == len(want), f'thấy {len(got)} dòng')
        for i, (q, d) in enumerate(want):
            r = got[i] if i < len(got) else ('—', '—')
            claim(f'{sid}: “{q}” → Điều {d}', r == (q, d), f'trang ghi “{r[0]}” → Điều {r[1]}')
    # Mọi điều luật dẫn trong bài, kể cả cột Điều của hai bảng, có trong danh sách nguồn của đúng văn bản ấy.
    # Mỗi mục có một văn bản mặc định ('*'); điều dẫn từ văn bản khác thì gán riêng. Điều mới chưa gán thì đỏ.
    VB = {'BLDS': 'Bộ luật Dân sự 2015', 'BLHS': 'Bộ luật Hình sự 2015', 'NĐ340': 'Nghị định 340/2025/NĐ-CP',
          'BHTG': 'Luật Bảo hiểm tiền gửi 2025', 'TT05': 'Thông tư 05/2026/TT-NHNN',
          'NĐ200': 'Nghị định 200/2026/NĐ-CP', 'CNS': 'Luật Công nghiệp công nghệ số',
          'TNCN': 'Luật Thuế thu nhập cá nhân 2025', 'HNGĐ': 'Luật Hôn nhân và gia đình 2014',
          'ĐĐ': 'Luật Đất đai 2024', 'NO': 'Luật Nhà ở 2023', 'KDBH': 'Luật Kinh doanh bảo hiểm 2022',
          'HP': 'Hiến pháp 2013'}
    GAN = {
        's-no': {'468': 'BLDS', '201': 'BLHS'},
        's-ruiro': {'*': 'BHTG', '3': 'TT05'},
        's-dungtien': {'*': 'BLHS'},
        's-taisan': {'9': 'NĐ200', '46': 'CNS', '47': 'CNS', '3': 'TNCN', '4': 'TNCN', '13': 'TNCN'},
        's-vanminh': {'*': 'HP'},
        's-thehe': {'*': 'BLDS'},
        's-honnhan': {'*': 'HNGĐ'},
        's-giayto': {'*': 'BLDS', '66': 'HNGĐ', '27': 'ĐĐ', '164': 'NO', '4': 'KDBH', '41': 'KDBH', '46': 'CNS'},
        's-muoihai': {'335': 'BLDS', '336': 'BLDS', '30': 'NĐ340', '291': 'BLHS'},
    }

    def dieu(s):
        """'629–634, 636' → {'629', …, '634', '636'}."""
        out = set()
        for a in re.split(r',\s*', s):
            lo, _, hi = a.partition('–')
            out |= {str(k) for k in range(int(lo), int(hi or lo) + 1)}
        return out

    m = re.search(r'<b>Luật\.</b>(.*?)</li>', muc('s-nguon'), flags=re.S)
    luat = chu(m.group(1)) if m else ''
    REF = {}
    for k, v in VB.items():
        m = re.search(re.escape(v) + r'[^.]*?\(Điều ([\d–, ]+)\)', luat)
        claim(f'nguồn: {v} có danh sách điều', bool(m))
        REF[k] = dieu(m.group(1)) if m else set()
    for sid in re.findall(r'<section id="(s-[a-z]+)">', HTML):
        if sid == 's-nguon':
            continue
        arts = set()
        for g in re.findall(r'Điều (\d+(?:–\d+)?(?:, \d+(?:–\d+)?)*)', chu(muc(sid))):
            arts |= dieu(g)
        for _, d in LAW.get(sid, []):
            arts |= dieu(d)
        for a in sorted(arts, key=int):
            k = GAN.get(sid, {}).get(a) or GAN.get(sid, {}).get('*')
            claim(f'{sid}: Điều {a} được gán một văn bản', k is not None, 'thêm vào GAN')
            if k:
                claim(f'{sid}: Điều {a} {VB[k]}', a in REF[k], f'danh sách nguồn của {VB[k]} không có Điều {a}')
    # Bảng “Mười sáu ý tưởng làm nền” (s-vanminh): số dòng khớp chữ “mười sáu” của tiêu đề.
    tb = re.search(r'Mười sáu ý tưởng làm nền</h3>.*?<tbody>(.*?)</tbody>', muc('s-vanminh'), flags=re.S)
    n = tb.group(1).count('<tr>') if tb else 0
    claim('s-vanminh: bảng “Mười sáu ý tưởng làm nền” có 16 dòng', n == 16, f'thấy {n} dòng')
    # Năm can chi đi kèm năm dương lịch: can = (năm − 4) mod 10, chi = (năm − 4) mod 12; năm 4 là Giáp Tý.
    CAN = 'Giáp Ất Bính Đinh Mậu Kỷ Canh Tân Nhâm Quý'.split()
    CHI = 'Tý Sửu Dần Mão Thìn Tỵ Ngọ Mùi Thân Dậu Tuất Hợi'.split()
    cc = re.findall(r'\b(%s) (%s) (\d{3,4})\b' % ('|'.join(CAN), '|'.join(CHI)), TEXT)
    claim('năm can chi trong bài (Đinh Mùi 1427, Kỷ Mùi 1919)', len(cc) >= 2, f'chỉ thấy {len(cc)} chỗ')
    for c, h, y in cc:
        k = int(y) - 4
        claim(f'{c} {h} {y}', (CAN[k % 10], CHI[k % 12]) == (c, h), f'năm {y} là {CAN[k % 10]} {CHI[k % 12]}')
    # Chuỗi lấy từ nguồn, trong đúng mục: tác giả, năm, tạp chí, cỡ mẫu, số đo, ngày tháng, số hiệu luật.
    NGUON = {
        's-tichluy': [
            'Robert Merton (1968) gọi là hiệu ứng Matthew',
            'Jacob Mincer (Schooling, Experience, and Earnings, 1974)', 'ghép số liệu điều tra của 18 nước',
            '(Mỹ, Đức, Canada, Anh)', 'dưới 5 năm kinh nghiệm 89,3%', '(Brazil, Chile, Mexico, Jamaica) chỉ 47,6%',
            'có Việt Nam với số liệu năm 1998 và 2002, đều dưới 50%', 'A khởi điểm 20 triệu/tháng, mỗi năm tăng 3%',
            'B khởi điểm 15 triệu ở một chỗ học nhanh hơn, mỗi năm tăng 10%',
            'Brynjolfsson, Li và Raymond (Quarterly Journal of Economics, 2025) theo dõi 5.172 nhân viên',
            'tăng trung bình 15%', 'Gary Becker (1962)',
        ],
        's-moitruong': [
            'Lazear, Shaw và Stanton (Journal of Labor Economics, 2015)',
            '23.878 nhân viên và 1.940 người quản lý, 2006–2010', 'nhiều hơn việc thêm một người vào nhóm chín người',
            'khoảng một phần tư hiệu ứng riêng của một người quản lý vẫn còn một năm sau',
            'Mas và Moretti (American Economic Review, 2009)', 'Bản làm việc năm 2006 (370 thu ngân, sáu cửa hàng)',
            'tăng 10% kéo nỗ lực của một người tăng 1,7%', '(Cornelissen, Dustmann và Schönberg, 2017)',
            'Jarosch, Oberfield và Rossi-Hansberg (Econometrica, 2021)',
            '4–9% tổng thù lao của người lao động là việc học từ đồng nghiệp',
            'Kahneman và Klein (American Psychologist, 2009)', 'Robin Hogarth (Educating Intuition, 2001)',
            'gộp 51 báo cáo về 6.096 vận động viên, 772 người thuộc hàng đầu thế giới',
            'Topel và Ward (Quarterly Journal of Economics, 1992)', 'nam thanh niên Mỹ 1957–1972',
            'một người điển hình làm bảy việc, khoảng hai phần ba số việc của cả đời', 'ít nhất một phần ba',
            'trong khoảng 91% số tháng từ 1/1997 tới 8/2026, trung bình hơn khoảng 0,7 điểm phần trăm',
            'Rộng nhất vào 11/2022, lúc thị trường lao động rất căng: 7,7% so với 5,5%', '(6/2025: 4,3% so với 4,4%)',
            '8/2026: 4,4% so với 3,6%',
        ],
        's-vanminh': [
            'E. D. Hirsch (Cultural Literacy, 1987)', 'Recht và Leslie (1988) cho 64 học sinh trung học cơ sở',
            'Aronowitz và Giroux (Harvard Educational Review, 1988)',
            '“các truyền thống cốt lõi của văn minh phương Tây”', 'Mười sáu ý tưởng làm nền',
            'Socrates (469–399 TCN), qua Plato', 'Khổng Tử (551–479 TCN theo truyền thống), Mạnh Tử',
            '“Biết đủ là giàu”', 'Đức Phật (khoảng thế kỷ 5 TCN; niên đại còn tranh luận)',
            'Epictetus (sinh khoảng thập niên 50, mất khoảng năm 135; từng là nô lệ)',
            'Ý, từ thế kỷ 14; chính yếu thế kỷ 15–16', 'Pascal và Fermat, năm lá thư mùa hè 1654',
            'họp lần đầu 28/11/1660; khẩu hiệu Nullius in verba từ hiến chương 1662',
            'Kant, “Khai sáng là gì?”, 12/1784', 'Adam Smith, Của cải của các quốc gia (1776)',
            'Mười người chia công đoạn làm hơn 48.000 cây ghim mỗi ngày', 'Darwin, Nguồn gốc các loài (24/11/1859)',
            'Tuyên ngôn của Đảng Cộng sản (2/1848)', 'Hiến pháp 2013, Điều 4',
            'Monet, Ấn tượng, mặt trời mọc (1872), bày năm 1874', '(25/4/1874)',
            'Bình Ngô đại cáo (tháng Chạp năm Đinh Mùi 1427, âm lịch)', '“Việc nhân nghĩa cốt ở yên dân”',
            'Tuyên ngôn Độc lập (2/9/1945)', 'Đại hội VI của Đảng, 15–18/12/1986',
            '求則得之，舍則失之，是求有益於得也，求在我者也。求之有道，得之有命，是求無益於得也，求在外者也。',
            'Mạnh Tử · thiên Tận tâm thượng',
            '938 Ngô Quyền đánh tan quân Nam Hán trên sông Bạch Đằng',
            '1802 Nguyễn Ánh lên ngôi, lấy niên hiệu Gia Long', 'gần 300 năm chia cắt Trịnh – Nguyễn',
            '1/9/1858 Liên quân Pháp – Tây Ban Nha nổ súng vào thành Đà Nẵng', '2/9/1945 Tuyên ngôn Độc lập',
            '7/5/1954 Chiến thắng Điện Biên Phủ; Hiệp định Genève ký tháng 7/1954',
            '30/4/1975 Chiến dịch Hồ Chí Minh kết thúc', '12/1986 Đại hội VI đề ra đường lối Đổi mới',
            'Phan Kế Bính, Việt Nam phong tục (1915)', 'Đào Duy Anh, Việt Nam văn hoá sử cương (1938)',
            'Văn minh An Nam (1944)', 'E. H. Gombrich, The Story of Art (1950)',
            'Bill Bryson, A Short History of Nearly Everything (2003)',
        ],
        's-thehe': [
            'Gia huấn ca (tương truyền của Nguyễn Trãi, tác giả còn tồn nghi)', 'Lẽ tục phú',
            'Adermon, Lindahl và Waldenström (Economic Journal, 2018)',
            'tương quan thứ hạng tài sản giữa cha mẹ và con là 0,3–0,4, giữa ông bà và cháu chỉ 0,1–0,2',
            'ít nhất một nửa', 'khoảng một phần tư', 'Gregory Clark (The Son Also Rises, 2014)',
            'Với 18.869 người mang họ hiếm ở Anh và xứ Wales', 'từ 1858 tới 2012',
            'hệ số truyền ẩn 0,70–0,75 mỗi đời', 'Torche và Corvalán (2018)',
            '“70% mất ở đời thứ hai, 90% ở đời thứ ba”', '(Williams và Preisser, 2003)', '3.250 gia đình giàu',
            '“tỉ lệ thất bại 70%”', 'James Grubman (2022)', 'nghiên cứu năm 1987 của John Ward',
            'tỉ lệ 30% doanh nghiệp', 'Holtz-Eakin, Joulfaian và Rosen (Quarterly Journal of Economics, 1993)',
            'khoảng 150.000 USD', 'cao gấp khoảng bốn lần người nhận dưới 25.000 USD', '(Điều 645;',
        ],
        's-daycon': [
            'Whitebread và Bingham (Đại học Cambridge, 2013)', 'tới khoảng 7 tuổi', 'PISA 2022 (OECD, 2024)',
            'học sinh 15 tuổi ở 20 nước và vùng; Việt Nam không có trong phần này', 'cao hơn 12 điểm',
            'thấp hơn 13 điểm',
            '83% học sinh nói mình có thể tự quyết tiêu tiền vào gì; nhóm này cao hơn khoảng 30 điểm',
            '70% học sinh tự tiêu khoản nhỏ', 'Lý thuyết tự quyết (Ryan và Deci, 2000)',
            'Hart và Risley (1995) quan sát 42 gia đình Mỹ, mỗi tháng một giờ, trong hai năm rưỡi; chỉ 6 gia đình',
            'một tuần 100 giờ thức, rồi thành bốn năm',
            'khoảng 45 triệu từ ở nhà làm nghề chuyên môn so với 13 triệu ở nhà nhận trợ cấp',
            '“Khoảng cách 30 triệu từ.”', 'Sperry, Sperry và Miller (2019) quan sát 42 trẻ ở năm cộng đồng Mỹ',
            'Nhóm Golinkoff (2019)', 'Romeo và cộng sự (2018), trên 36 trẻ 4–6 tuổi',
            'năm 1885, Mrs. Dymond của Anne Isabella Thackeray Ritchie', 'chỉ xuất hiện từ năm 1976', '臨河而羨魚，不如歸家織網。',
            'Hoài Nam Tử · thiên Thuyết lâm huấn', 'Altonji, Blom và Meghir (Annual Review of Economics, 2012)',
            'Với số liệu Mỹ năm 2009', '(0,561 điểm log, tức cao hơn khoảng 75%)', '(0,577 điểm log)',
            'Deci, Koestner và Ryan (1999)',
        ],
        's-honnhan': [
            'Karney và Bradbury (Psychological Bulletin, 1995) tổng quan 115 nghiên cứu theo dõi dài hạn với hơn 45.000 cuộc hôn nhân',
            'Gottman và Levenson (2000) theo dõi các cặp vợ chồng trong 14 năm', '“dự báo đúng hơn 90%”',
            'Heyman và Smith Slep (2001)', 'các cặp mới cưới năm 1998', '(Stanley, Bradbury và Markman, 2000)',
            'Dew, Britt và Huston (2012), theo dõi 4.574 cặp vợ chồng Mỹ', 'số 52/2014/QH13, hiệu lực từ 01/01/2015',
            'Luật số 81/2025/QH15', '121/VBHN-VPQH (2025)', '(Điều 33, 43)', '(Điều 47)', '(Điều 49)', '(Điều 38)',
            'Nếu đã có thoả thuận hợp lệ, vợ chồng có thể sửa, bổ sung nội dung theo đúng hình thức',
        ],
        's-giayto': [
            'tới tháng 10/2026', 'người 15–18 tuổi được lập', 'trong 5 ngày làm việc', 'sau 3 tháng',
            '30 năm với bất động sản, 10 năm với động sản',
            'xác nhận hoặc bác bỏ quyền thừa kế: 10 năm; đòi người thừa kế trả nợ của người mất: 3 năm',
            'Bộ luật Dân sự số 91/2015/QH13, hiệu lực từ 01/01/2017', 'Luật số 142/2025/QH15',
            'phần di sản là 1,2 tỷ đồng', 'một suất theo luật là 300 triệu',
            'tức 200 triệu, cộng lại 800 triệu; em trai nhận 400 triệu', '(Điều 140)',
            'chỉ có hiệu lực một năm (Điều 563)', '(Luật Đất đai 2024, Điều 27)', '(Luật Nhà ở 2023, Điều 164)',
            'kỳ họp Quốc hội tháng 10/2026', '(Luật Kinh doanh bảo hiểm 2022, Điều 4)', '(Điều 41)',
            'Từ 01/01/2026, Luật Công nghiệp công nghệ số (số 71/2025/QH15, Điều 46)', '(Điều 615)', '(Điều 643)',
            '(Điều 647)', '(Điều 636)', 'Van Such và cộng sự (2017) xem 286 bệnh nhân', 'năm 2009–2010',
            '36 ca (12%)', '188 ca (66%)', '62 ca (21%)', 'Luật Công chứng 2024 (hiệu lực từ 01/07/2025)',
            '04/2026/QH16, hiệu lực từ 01/01/2027',
        ],
    }
    for sid, xs in NGUON.items():
        t = chu(muc(sid))
        for x in xs:
            claim(f'{sid}: chuỗi từ nguồn', x in t, f'không thấy “{x}”')


def main():
    global HTML, TEXT
    if not PAGE.exists():
        print('verify-hidden-curriculum: không thấy %s' % PAGE.name)
        return 1
    HTML = PAGE.read_text(encoding='utf-8')
    TEXT = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', re.sub(r'<!--.*?-->|<script>.*?</script>|<style>.*?</style>', ' ', HTML, flags=re.S)))
    TEXT = re.sub(r'&amp;', '&', re.sub(r'&nbsp;', ' ', TEXT))
    phan_A()
    if not fails:
        phan_B()
        phan_C()
        phan_D()
        phan_E()
        phan_F()
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
