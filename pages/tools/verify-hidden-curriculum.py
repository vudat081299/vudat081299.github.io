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

Bảy phần, bảy loại sai khác nhau:

  A. DỮ LIỆU NHÚNG — đối chiếu vài giá trị với nguồn (Damodaran, histretSP.xls, 01/2026) và
     kiểm độ dài, để mảng không bị cắt hay lệch năm.
  B. CON SỐ TRONG BÀI — tính lại từ đầu rồi đòi trang có đúng chuỗi ấy. Bắt được chuyện sửa
     một con số mà quên chỗ khác.
  C. DÒNG MÃ THEN CHỐT — đòi vài dòng JS then chốt còn nguyên hình: công thức của trò đồng xu, hạt
     giống cố định, cách trừ lạm phát, ma trận điểm của trò chơi lặp lại.
  D. TOÁN ĐỘC LẬP — dựng lại bằng lối khác lối trang dùng: mô phỏng Monte Carlo trò đồng xu,
     tìm cực đại Kelly bằng lưới, giá trị hiện tại bằng công thức đóng, và chạy lại giải đấu
     của mô hình trò chơi lặp lại bằng đúng bộ sinh số ngẫu nhiên của trang để kiểm các câu lời
     văn nói về nó.
  E. THƯ VIỆN MÔ HÌNH — đủ trường, khoá hợp lệ, id duy nhất, mọi related và sections trỏ tới thứ
     có thật, không có HTML trong dữ liệu, số thẻ khớp đầu trang, và mỗi con số trong thẻ có mặt
     nguyên số trong chính các mục thẻ trỏ tới (không chỉ ở đâu đó trên trang). Lộ trình, mẫu quyết
     định và bài tập phải đủ trường, khoá duy nhất, mọi liên kết mục có thật; tiêu đề bài tập đếm đúng
     số tình huống.
  F. DỮ KIỆN TỪ NGUỒN — mọi phần, từ tiền, vốn, nghề tới lời nói, yêu đương, quyền lực, văn hoá, gia đình,
     lừa đảo, an toàn giao thông và thói quen: dữ kiện lấy từ nguồn (con số kèm đơn vị, tác giả và năm,
     số tổng đài) phải có mặt và đứng gần nhau trong đúng
     mục — kiểm số, không kiểm câu văn (du_kien) —, thân bài không dẫn số điều luật hay số hiệu văn bản
     (PAGES-015), năm can chi tính lại từ năm dương lịch,
     và mọi con số suy ra được tính lại trên chữ đã bóc thẻ của trang (bảng, công thức, kỳ vọng ẩn
     trong giá, thứ tự lợi suất, trái phiếu…).
  G. BẢN GỌN — định nghĩa và điều kiện quan trọng phải còn ngoài phần chi tiết; mỗi mục nội dung có
     đúng một khung “Luật của mục này”. Không thay được review ngữ nghĩa; bắt hồi quy khi gấp nhầm
     điều kiện vào details hoặc bỏ lời giải nghĩa của mười hai luật ở mục 11.2,
     hoặc để lời ấy dài quá 25 chữ.

Cổng không kiểm bảng tóm tắt (s-tomtat) khớp lời từng khung luật, cũng không kiểm mỗi nguồn trong
s-nguon còn được thân bài dẫn: hai việc ấy rà bằng tay khi sửa một mục.

Chỉ dùng thư viện chuẩn, chạy dưới 5 giây.

Chạy:  python3 pages/tools/verify-hidden-curriculum.py
Exit code: 1 nếu có con số, dòng mã then chốt hay chuỗi nguồn không khớp.
"""
import collections
import html
from html.parser import HTMLParser
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


def du_kien(sid, label, *xs, w=200):
    """Đòi một DỮ KIỆN trong mục sid: mọi chuỗi xs (con số kèm đơn vị, tên nguồn, năm) có mặt trong chữ
    của mục và cách chuỗi đầu không quá w ký tự. Kiểm số và nguồn, không kiểm câu văn: viết lại câu thì
    vẫn xanh, sửa lệch một số thì đỏ."""
    global checks
    checks += 1
    t = chu(muc(sid))
    for m in re.finditer(re.escape(xs[0]), t):
        win = t[max(0, m.start() - w):m.end() + w]
        if all(x in win for x in xs[1:]):
            return
    fails.append(f'{sid}: {label}: không thấy ' + ' … '.join(f'“{x}”' for x in xs) + ' gần nhau')


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
    need('cổ phiếu Mỹ 1928–2025, danh nghĩa (lời dặn của lab-pz)', f'lợi suất kép bình quân {vi(100 * sp_nom, 2)}%/năm (danh nghĩa, gồm cổ tức) của cổ phiếu Mỹ')

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
    claim('1%/ngày tính đơn = 365%/năm', 1 * 365 == 365)
    need('lãi 1% mỗi ngày trong bài', '“chỉ 1% mỗi ngày” là 365%/năm tính đơn')
    # Lãi trên dư nợ ban đầu (s-no): 1,5%/tháng, 12 kỳ, mỗi kỳ trả P/12 + 1,5%·P → lãi thật theo dư nợ giảm dần.
    pay, lo, hi = 1 / 12 + 0.015, 0.0, 0.1
    for _ in range(100):
        r = (lo + hi) / 2
        lo, hi = (r, hi) if sum(pay / (1 + r) ** k for k in range(1, 13)) > 1 else (lo, r)
    need_t('lãi phẳng 1,5%/tháng quy ra dư nợ thật', f'khoảng {vi(100 * r, 2)}%/tháng trên số còn nợ thật, tức khoảng {vi(1200 * r, 1)}%/năm', r)

    # ── Thu nhập (s-thunhap): 7,4% của giá trị hôm nay ở lab-hk ────────────────
    need('7,4% thu nhập cả đời', f'phần chênh ấy đáng khoảng <b>{vi(round(0.074 * hc, -1), 0)} triệu đồng hôm nay</b>',
         0.074 * hc)
    need('7,4% là mức nâng khởi điểm của ví dụ ấy', 'thương lượng nâng mức khởi điểm 7,4%')

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
    # 48% và 11% là phần đóng góp tương đối của giao thiệp vào tốc độ lên chức và vào hiệu quả, không phải phần thời gian
    # (Luthans, Real Managers, 1988; trung bình người quản lý dành khoảng một phần năm thời gian cho giao thiệp).
    need('Luthans trong bài', 'góp phần lớn nhất vào tốc độ lên chức (48%) nhưng nhỏ nhất vào hiệu quả của đơn vị (11%)')
    need('Luthans: không đọc thành phần thời gian', 'Đó là phần đóng góp tương đối, không phải phần thời gian')
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
    need('Atanasov và cộng sự 2020 (s-bayes)', 'người sửa từng bước nhỏ thường đoán đúng hơn (Atanasov và cộng sự, 2020)')
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
        # Số đứng đầu một nhãn dài hơn ("6.7: tự trọng") cũng phải khớp đích.
        mm = re.match(r'(?:mục )?(\d+\.\d+|Khung \d+/\d+)(?![\d/])', text)
        if mm and eyebrow.get(href) != mm.group(1):
            bad.append(f'#{href} “{text}”')
        mm = re.fullmatch(r'[Mm]ô hình (\d+)', text)
        if mm and labno.get(href) != int(mm.group(1)):
            bad.append(f'#{href} “{text}”')
        mm = re.fullmatch(r'Phần (\d+)', text)
        if mm and (href not in heads or heads.index(href) != int(mm.group(1))):
            bad.append(f'#{href} “{text}”')
    claim('số trong liên kết khớp số của đích', not bad, ', '.join(bad[:8]))
    # Bảng "Bắt đầu từ đâu" (Khung 3/3): chữ số ở tiêu đề phần mở rộng khớp số dòng của bảng.
    sk = re.search(r'<summary>(\S+) tình huống khác:[^<]*</summary>.*?<tbody>(.*?)</tbody>', muc('s-cach'), flags=re.S)
    claim('Khung 3/3: số tình huống khác khớp số dòng của bảng',
          bool(sk) and VN.get(sk.group(1).lower()) == sk.group(2).count('<tr>'),
          f'{sk.group(1) if sk else "?"} so với {sk.group(2).count("<tr>") if sk else "?"} dòng')
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
# C. Dòng mã then chốt
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
        data = json.loads(DATA.read_text(encoding='utf-8'))
        cards = data['concepts']
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
    # Thẻ không được mang số riêng: mỗi con số trong thẻ phải có mặt, nguyên một số, trong chính các mục thẻ trỏ
    # tới (chữ, aria-label của hình, giá trị mặc định của mô hình). Tìm cả trang thì “180” khớp tình cờ ở chỗ khác.
    # Bỏ qua các số nhỏ dùng như chữ (một, hai, mười…).
    def pool_of(sids):
        out = []
        for sid in sids:
            h = muc(sid)
            out += [chu(h)] + re.findall(r'aria-label="([^"]*)"', h) + re.findall(r'<input [^>]*value="([^"]*)"', h)
        return ' '.join(out)

    def co(x, pool):
        return re.search(r'(?<![\d.,])' + re.escape(x) + r'(?![\d]|[.,]\d)', pool) is not None

    num = re.compile(r'[×−]?\d[\d.]*(?:,\d+)?%?')
    stray = []
    for c in cards:
        pool = pool_of(c.get('sections', []))
        for f in ('idea', 'why', 'mechanism', 'mistake', 'example', 'use', 'limits', 'remember'):
            for m in num.finditer(str(c.get(f, ''))):
                x = m.group(0).rstrip('.')
                if x.lstrip('×−') in ('0', '1', '2', '3', '4', '5', '6', '10', '100'):
                    continue
                if not (co(x, pool) or co(x.lstrip('×−'), pool)):
                    stray.append(f'{c.get("id")}: {x}')
    claim('thư viện: mọi con số trong thẻ có mặt ở mục thẻ trỏ tới', not stray, ', '.join(sorted(set(stray))[:12]))
    need('số khái niệm ở đầu trang', f'· {len(cards)} khái niệm</p>', len(cards))
    claim('thư viện: ít nhất 60 khái niệm', len(cards) >= 60, f'có {len(cards)}')

    # Lộ trình và bài tập cũng dùng cùng file: lỗi dữ liệu không được làm dừng buildPractice().
    for key, fields in (
        ('reading_paths', ('id', 'title', 'action')),
        ('decision_fields', ('name', 'prompt')),
        ('practice_cases', ('id', 'title', 'prompt', 'answer')),
    ):
        entries = data.get(key)
        valid = isinstance(entries, list) and bool(entries) and all(isinstance(e, dict) for e in entries)
        claim(f'{key}: danh sách không rỗng, mỗi mục là object', valid)
        if not valid:
            continue
        claim(f'{key}: đủ chữ thuần, không rỗng', all(
            isinstance(e.get(f), str) and e[f].strip() and not re.search(r'[<>]', e[f])
            for e in entries for f in fields))
        identity = 'name' if key == 'decision_fields' else 'id'
        names = [e.get(identity) for e in entries]
        claim(f'{key}: khoá duy nhất', all(isinstance(n, str) for n in names)
              and len(names) == len(set(names)))
        if key != 'decision_fields':
            refs = [e.get('sections') for e in entries]
            claim(f'{key}: mục đọc có thật và không trùng', all(
                isinstance(s, list) and bool(s) and all(isinstance(x, str) for x in s)
                and len(s) == len(set(s)) and set(s) <= secs for s in refs))
            if key == 'reading_paths':
                claim('lộ trình: mỗi lần đọc 3–5 mục', all(isinstance(s, list) and 3 <= len(s) <= 5 for s in refs))
    # Tiêu đề khối bài tập đếm số tình huống bằng chữ; thêm hay bớt một tình huống trong file thì phải sửa theo.
    ncase = len(data.get('practice_cases') or [])
    need('tiêu đề bài tập đếm đúng số tình huống trong dữ liệu',
         '<h3 class="hc-h3">%s tình huống để thử</h3>' % {2: 'Hai', 3: 'Ba', 4: 'Bốn', 5: 'Năm', 6: 'Sáu'}.get(ncase, ncase), ncase)


# ══════════════════════════════════════════════════════════════════════════════
# F. Vốn, nghề, gia đình
# ══════════════════════════════════════════════════════════════════════════════
def phan_F():
    vn = vi
    # Chuỗi lấy từ nguồn: mỗi chuỗi ứng một dòng kiểm nguồn; sửa thì mở lại nguồn.
    for x in ('350 triệu đồng', 'bằng đồng Việt Nam của cá nhân', '139 doanh nghiệp', '83.600 tỉ đồng', '50,7%',
              'tối đa hai năm', '39,2%', '25.967', '42,6%', '1.092', 'khoảng 35 nghìn tỷ USD', '5,8 triệu USD', 'gần ba phần tư nhận 0', '62%', '89%', '2/12/2001',
              '39,70%', '10,37%', 'owner earnings', '29 công ty', '39 công ty', 'khoảng 1%/năm', 'trên 12%/năm',
              '97 biến', '58%', 'ít nhất 10 năm', '36,55%', '20,10%', '−18,04%', '−17,83%', '−0,82', '−0,31',
              '−1,04%', '2,24%', '1.820,1', '2.610,85', '1.000 tấn', '473 tấn', '15.858,92', '24.164,89',
              '3,31%', '12,73%', '23,12%'):
        need_t('vốn, chuỗi từ nguồn', x)

    claim('Bessembinder: 57,4% thua tín phiếu là “hơn bốn trên bảy”', 1 - 0.426 > 4 / 7)
    claim('Bessembinder: 1.092 trên khoảng 25.300 công ty là “hơn 4%”', 0.04 < 1092 / 25300 < 0.05)
    need_t('Bessembinder trong bài', 'vượt tín phiếu kho bạc một tháng')

    # Giá trị = lợi nhuận năm tới × (1 − g/ROIC) / (chi phí vốn − g); lợi nhuận 100, chi phí vốn 10%, g = 5%.
    for roic in (0.20, 0.10, 0.08):
        val, ir = 100 * (1 - 0.05 / roic) / (0.10 - 0.05), 0.05 / roic * 100
        need_t(f'bảng giá trị, ROIC {roic:.0%}', f'Tăng 5%/năm, vốn giữ lại lời {round(roic * 100)}%/năm {vn(ir, 1 if ir % 1 else 0)}% {vn(val, 0)}', val)
    need_t('bảng giá trị, không tăng trưởng', f'Không tăng trưởng 0% {vn(100 / 0.10, 0)}')

    # Kỳ vọng ẩn trong giá: P/E 40, người mua đòi 9%/năm.
    PE, r = 40, 0.09
    need_t('lợi nhuận hôm nay so với giá ở P/E 40', f'chỉ bằng {vn(100 / PE, 1)}% giá (1 ÷ 40)')
    need_t('g hàm ý khi trả hết lợi nhuận', f'khoảng {vn((r - 1 / PE) * 100, 1)}%/năm mãi mãi')
    g15 = (1 - PE * r) / (1 / 0.15 - PE)          # PE = (1 − g/ROIC)/(r − g), ROIC 15%
    claim('giữ lại lợi nhuận thì tăng trưởng phải cao hơn 6,5%', g15 > r - 1 / PE, f'{g15:.4f}')
    need_t('cao hơn khi phải giữ lại lợi nhuận', 'và cao hơn nữa nếu phải giữ lại lợi nhuận để làm ăn')

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

    # Đa dạng hoá: bảng và đoạn đọc bảng (σ = 30%).
    s0 = 30.0
    for rho, label in ((0, '0 (không tương quan tuyến tính)'), (0.3, '0,3 (ngày thường)'), (0.8, '0,8 (khủng hoảng)')):
        cells = [vn(s0 * math.sqrt(rho + (1 - rho) / N), 1) + '%' for N in (1, 5, 10, 20)]
        last = 'về 0' if rho == 0 else vn(s0 * math.sqrt(rho), 1) + '%'
        need_t(f'bảng đa dạng hoá, ρ = {rho}', f'Tương quan {label} ' + ' '.join(cells) + ' ' + last)
    # Đọc bảng: khủng hoảng (ρ = 0,8) thì hai mươi tài sản vẫn lên xuống “gần bằng một” tài sản.
    claim('đọc bảng: khủng hoảng, hai mươi tài sản gần bằng một', math.sqrt(0.8 + 0.2 / 20) > 0.85,
          f'tỉ số {math.sqrt(0.8 + 0.2 / 20):.3f}')
    need_t('đọc bảng trong bài', 'khủng hoảng đẩy tương quan lên 0,8 thì hai mươi tài sản vẫn lên xuống gần bằng một')

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
    need_t('thứ tự lợi suất: không rút', vn(1000 * prod, 1))
    need_t('thứ tự lợi suất: chênh hai kết cục', vn(run(good)[-1] - run(bad)[-1], 2))
    claim('góp đều thì năm xấu trước lại tốt hơn', run(bad, 60)[-1] > run(good, 60)[-1])

    def bond(c, n, y):
        return sum(c / (1 + y) ** t for t in range(1, n + 1)) + 100 / (1 + y) ** n
    need_t('trái phiếu 10 năm khi lãi lên 7%', vn(bond(5, 10, 0.07), 2))
    need_t('trái phiếu 10 năm: mức giảm', f'mất {vn(100 - bond(5, 10, 0.07), 2)}%')
    need_t('trái phiếu 2 năm', f'kỳ hạn 2 năm chỉ giảm {vn(100 - bond(5, 2, 0.07), 2)}%')

    # Mua để ở hay đi thuê (s-dinhgia): căn 4 tỷ, trả trước 2 tỷ, vay 2 tỷ lãi 9%; khoản trả trước lẽ ra gửi
    # tiết kiệm 5%/năm; phí quản lý và sửa chữa 1% giá mỗi năm; thuê 12 triệu/tháng. Gốc trả dần là để dành, không tính.
    h_price, h_down, h_loan, h_dep, h_keep, h_rent = 4000, 2000, 0.09, 0.05, 0.01, 12      # triệu đồng
    h_int, h_lost, h_fee = (h_price - h_down) * h_loan, h_down * h_dep, h_price * h_keep
    h_own, h_rent_y = h_int + h_lost + h_fee, 12 * h_rent
    du_kien('s-dinhgia', 'mua để ở: chi phí sở hữu mỗi năm', f'lãi vay {vn(h_int, 0)} triệu',
            f'vay {vn((h_price - h_down) / 1000, 0)} tỷ lãi {vn(100 * h_loan, 0)}%',
            f'gửi tiết kiệm {vn(100 * h_dep, 0)}%/năm lẽ ra lời {vn(h_lost, 0)} triệu',
            f'{vn(100 * h_keep, 0)}% giá là {vn(h_fee, 0)} triệu', f'tổng {vn(h_own, 0)} triệu',
            f'hết {vn(h_rent_y, 0)} triệu', w=400)
    h_be = (h_own - h_rent_y) / h_price
    need_t('mua để ở: khoảng chênh', f'Khoảng chênh {vn(h_own - h_rent_y, 0)} triệu bằng {vn(100 * h_be, 1)}% giá nhà')
    need_t('mua để ở: giá nhà phải tăng nhanh hơn', f'nếu giá nhà tăng nhanh hơn {vn(100 * h_be, 1)}%/năm')

    du_kien('s-taisan', 'lãi thực với lãi 5% và lạm phát 3,31%', '3,31%', f'{vn((1.05 / 1.0331 - 1) * 100, 2)}%/năm')
    du_kien('s-taisan', 'lãi thực năm 2008', '2008', '12,73%', '23,12%', f'{vn((1.1273 / 1.2312 - 1) * 100, 1)}%')
    fx = 24164.89 / 15858.92
    need_t('đồng mất giá so với USD 2005 → 2024', f'mất {vn((1 - 1 / fx) * 100, 1)}%')
    need_t('mất giá bình quân năm', f'khoảng {vn((fx ** (1 / 19) - 1) * 100, 2)}% mỗi năm')
    du_kien('s-vang', 'giá vàng cuối 2021 → cuối 2024', 'cuối 2024', f'tăng {vn((2610.85 / 1820.1 - 1) * 100, 1)}%')
    du_kien('s-vang', 'lãi thực TIPS cuối 2021 → cuối 2024', '−1,04%', '2,24%', 'TIPS', w=400)
    du_kien('s-vang', 'Erb và Harvey', 'Erb và Harvey', '2013', '−0,82', '−0,31', '1997–2012', w=600)
    # Lãi tiền gửi và lạm phát Việt Nam 2005–2023 (World Bank FR.INR.DPST, FP.CPI.TOTL.ZG), bình quân nhân.
    dep = [7.145, 7.63, 7.492, 12.73, 7.91, 11.194, 13.993, 10.504, 7.14, 5.758, 4.747, 5.035, 4.809, 4.738,
           4.975, 4.12, 3.375, 3.817, 4.781]
    inf = [8.285, 7.418, 8.344, 23.115, 6.717, 9.207, 18.678, 9.095, 6.593, 4.085, 0.631, 2.668, 3.52, 3.54,
           2.796, 3.221, 1.835, 3.157, 3.253]
    pd_, pi_ = math.prod(1 + x / 100 for x in dep), math.prod(1 + x / 100 for x in inf)
    n = len(dep)
    claim('chuỗi tiền gửi 2005–2023 đủ 19 năm', n == len(inf) == 19)
    du_kien('s-taisan', 'lãi tiền gửi, lạm phát và lãi thực bình quân 2005–2023', '2005–2023',
            f'{vn((pd_ ** (1 / n) - 1) * 100, 1)}%/năm', f'{vn((pi_ ** (1 / n) - 1) * 100, 1)}%/năm',
            f'{vn(((pd_ / pi_) ** (1 / n) - 1) * 100, 1)}%/năm')
    du_kien('s-taisan', 'nguồn lãi tiền gửi 2005–2023', 'World Bank', '2005–2023')
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
    du_kien('s-tichluy', 'lương tháng của B vượt A', 'Lương tháng', f'năm thứ {first}', w=60)
    du_kien('s-tichluy', 'tổng tiền đã nhận của B vượt A', 'đã nhận', f'năm thứ {cum}', w=60)
    du_kien('s-tichluy', 'năm thứ 20', 'Năm thứ 20', f'{vn(A[-1], 1)} triệu/tháng', f'{vn(B[-1], 1)} triệu', w=120)
    b20 = 15 * 1.10 ** 10 * 1.03 ** 9          # mười lần tăng 10%, rồi 3% như A
    du_kien('s-tichluy', 'giả định khắc nghiệt hơn', f'{vn(b20, 1)} triệu/tháng', f'khoảng {round(100 * (b20 / A[-1] - 1))}%', w=80)
    # “khoảng cách ấy giữ nguyên tới cuối”: từ năm 11 cả hai cùng tăng 3%/năm, nên tỉ số B/A không đổi.
    ba = [15 * 1.10 ** min(n - 1, 10) * 1.03 ** max(n - 11, 0) / (20 * 1.03 ** (n - 1)) for n in range(11, 41)]
    claim('từ năm 11, tỉ số lương B/A không đổi', max(ba) - min(ba) < 1e-9, f'{min(ba):.6f}…{max(ba):.6f}')
    du_kien('s-tichluy', 'khoảng cách giữ nguyên', 'giữ nguyên tới cuối', 'theo phần trăm', w=80)
    # Ý kiến thứ hai (s-giayto): Van Such và cộng sự (2017), 62 trên 286 ca.
    claim('Van Such: 62 trên 286 ca là 21%', int(100 * 62 / 286) == 21, f'{100 * 62 / 286:.1f}%')
    # Odean (1998), bảng I: tỉ lệ lãi được bán 0,148, tỉ lệ lỗ được bán 0,098 → cao hơn khoảng 50% (luật 10, s-muoihai).
    claim('Odean: 0,148 so với 0,098 là cao hơn khoảng 50%', 45 <= 100 * (0.148 / 0.098 - 1) <= 55,
          f'{100 * (0.148 / 0.098 - 1):.1f}%')
    du_kien('s-giayto', 'Van Such: 62 trên 286 ca', 'Van Such', '2017', '286 bệnh nhân', '62 ca (21%)')
    # Rút bảo hiểm xã hội một lần (s-baohiem), Luật Bảo hiểm xã hội 2024: mỗi năm đóng từ 2014 được 2 tháng lương
    # bình quân; người lao động 8% và chủ 14% lương mỗi tháng vào quỹ hưu trí và tử tuất, tức 12 × 22% tháng lương
    # mỗi năm; lương hưu cần đủ 15 năm đóng; chỉ người có thời gian đóng trước 1/7/2025 được rút khi nghỉ việc.
    bhxh = 12 * (0.08 + 0.14)
    du_kien('s-baohiem', 'BHXH một lần so với số đã nộp', 'rút một lần', 'khoảng 2 tháng lương bình quân',
            f'{vn(bhxh, 2)} tháng lương', f'{vn(100 * (0.08 + 0.14), 0)}% lương mỗi tháng', w=260)
    du_kien('s-baohiem', 'BHXH: điều kiện lương hưu, mốc 1/7/2025', 'đủ 15 năm đóng', 'bắt đầu đóng từ 1/7/2025',
            'kiểm quy định hiện hành', w=260)
    # Bảo hiểm tiền gửi (s-ruiro): hạn mức 350 triệu đồng từ 13/7/2026 (Bảo hiểm tiền gửi Việt Nam, 7/2026).
    du_kien('s-ruiro', 'hạn mức bảo hiểm tiền gửi và ngày áp dụng', '350 triệu đồng', 'từ 13/7/2026', 'kiểm mức hiện hành', w=260)
    # Thân bài không dẫn số điều luật hay số hiệu văn bản (PAGES-015); chi tiết ấy chỉ ở dòng Luật của s-nguon.
    so_hieu = re.compile(r'Điều \d|\b\d+/\d{4}/(?:QH|NĐ|TT|NQ|VBHN|UBTVQH)')
    lo = sorted({f'{sid}: {m.group(0)}' for sid in re.findall(r'<section id="(s-[a-z]+)">', HTML) if sid != 's-nguon'
                 for m in so_hieu.finditer(chu(muc(sid)))})
    claim('thân bài không dẫn số điều luật, số hiệu văn bản', not lo, ', '.join(lo[:8]))
    # Bảng “Mười bốn ý tưởng làm nền” (s-vanminh): số dòng khớp chữ “mười bốn” của tiêu đề.
    tb = re.search(r'Mười bốn ý tưởng làm nền</h3>.*?<tbody>(.*?)</tbody>', muc('s-vanminh'), flags=re.S)
    n = tb.group(1).count('<tr>') if tb else 0
    claim('s-vanminh: bảng “Mười bốn ý tưởng làm nền” có 14 dòng', n == 14, f'thấy {n} dòng')
    # Năm can chi đi kèm năm dương lịch: can = (năm − 4) mod 10, chi = (năm − 4) mod 12; năm 4 là Giáp Tý.
    CAN = 'Giáp Ất Bính Đinh Mậu Kỷ Canh Tân Nhâm Quý'.split()
    CHI = 'Tý Sửu Dần Mão Thìn Tỵ Ngọ Mùi Thân Dậu Tuất Hợi'.split()
    cc = re.findall(r'\b(%s) (%s) (\d{3,4})\b' % ('|'.join(CAN), '|'.join(CHI)), TEXT)
    claim('năm can chi trong bài (Đinh Mùi 1427, Kỷ Mùi 1919)', len(cc) >= 2, f'chỉ thấy {len(cc)} chỗ')
    for c, h, y in cc:
        k = int(y) - 4
        claim(f'{c} {h} {y}', (CAN[k % 10], CHI[k % 12]) == (c, h), f'năm {y} là {CAN[k % 10]} {CHI[k % 12]}')
    # Dữ kiện lấy từ nguồn, trong đúng mục: tác giả, năm, cỡ mẫu, số đo, ngày tháng. Một chuỗi phải có nguyên văn;
    # một bộ là một dữ kiện (du_kien): các phần phải đứng gần nhau, số nguyên cuối bộ (nếu có) là cỡ cửa sổ.
    NGUON = {
        's-tichluy': [
            ('hiệu ứng Matthew', 'Merton', '1968', 'Khung 2/3'), ('Mincer', '1974'), ('Lagakos', '2018', '18 nước', 'toàn thời gian'),
            ('Mỹ, Đức, Canada, Anh', '20–24 năm', 'dưới 5 năm', '89,3%'), ('Brazil, Chile, Mexico, Jamaica', '47,6%'),
            ('Việt Nam', '1998', '2002', 'dưới 50%'), ('A khởi điểm 20 triệu/tháng', 'tăng 3%'),
            ('B khởi điểm 15 triệu', 'tăng 10%'), ('Brynjolfsson', '2025', '15%'), ('Becker', '1962'),
        ],
        # Bằng chứng về chọn mã và giữ lâu (s-cophieu): Barber, Lee, Liu và Odean (2014); Chague, De-Losso và
        # Giovannetti (2020); SPIVA Year-End 2024; Morningstar Mind the Gap 2026; đỉnh VN-Index 2007, 2022.
        's-cophieu': [
            ('Đài Loan, 1992–2006', '450.000', 'Khoảng 20%', 'chưa tới 1%'), ('Brazil, 2013–2015', 'ít nhất 300 ngày', '97% lỗ'),
            ('tới cuối 2024, 84%', 'trong 10 năm', 'gần 90% trong 15 năm'),
            ('10 năm tới cuối 2025', '8,7%/năm', '9,9%/năm', 'Morningstar'), ('Jorion và Goetzmann', '1999'),
            ('Nikkei', 'cuối năm 1989', 'hơn 34 năm'),
            ('VN-Index từ đỉnh tháng 3/2007', 'khoảng 80%', 'tháng 2/2009', '11 năm sau', 'đỉnh đầu năm 2022', 'ba năm rưỡi'),
            'Sharpe (1991)',
        ],
        's-dinhgia': [
            ('Buffett', 'năm 1996'), 'Graham coi đây là ý trung tâm của đầu tư', 'lời của Bạch Khuê',
        ],
        's-thunhap': [('Babcock và Laschever, 2003', '7,4%')],
        's-moitruong': [
            '(Lazear, Shaw và Stanton, 2015)', 'nhiều hơn việc thêm một người vào nhóm chín người',
            'Khoảng một phần tư tác dụng của người quản lý vẫn còn một năm sau khi nhân viên thôi làm với họ',
            'Jarosch, Oberfield và Rossi-Hansberg (2021)',
            '4–9% tổng thù lao của người lao động là việc học từ đồng nghiệp',
            '(Kahneman và Klein, 2009)', 'Hogarth (2001)',
            '6.096 vận động viên, trong đó 772 người thuộc hàng đầu thế giới',
            'Topel và Ward (1992)', 'nam thanh niên Mỹ 1957–1972',
            'một người điển hình làm bảy việc, khoảng hai phần ba số việc của cả đời', 'ít nhất một phần ba',
            'bảng số liệu Fed Atlanta bản tháng 10/2026', '325 trên 356 tháng có dữ liệu từ 1/1997 tới 9/2026',
            'hơn trung bình khoảng 0,7 điểm phần trăm', 'trung bình 12 tháng', 'thiếu tháng 10/2025',
            # Gallup, State of the American Manager (2015); ô số ≥ 70% ở đầu trang trỏ về câu này.
            ('Gallup', 'ít nhất 70% chênh lệch mức gắn bó'),
        ],
        # Bohns (2016): hơn 14.000 người lạ được nhờ, người nhờ đoán thấp mức nhận lời trung bình 48%.
        's-chudong': [('hơn 14.000 người lạ', 'trung bình 48%', 'Bohns, 2016')],
        # Curhan và cộng sự (2022): quãng im từ 3 giây, không giành phần lớn hơn; khi địa vị chênh rõ, chỉ quãng im
        # của bên địa vị cao tạo thêm giá trị.
        's-imlang': [('ba giây', 'Curhan và cộng sự, 2022', 'chỉ quãng im của bên địa vị cao')],
        # Văn hoá: Ambady và Rosenthal (1993) nghiên cứu 1 — 13 giảng viên, ba đoạn 10 giây, r(11) = 0,76; Emily Post
        # Institute — khăn ăn “loosely to the left”, dao dĩa ăn xong ở số 4; Recht và Leslie (1988) — 64 học sinh, nửa hiệp.
        's-vonvanhoa': [
            ('Ambady và Rosenthal', '1993', '30 giây'), ('13 giảng viên', '0,76', 40), ('Veblen', '1899'),
            ('Currid-Halkett', '2017', 'hưu trí'),
        ],
        's-quocte': ['Emily Post Institute', 'gấp lỏng khăn, đặt bên trái đĩa', 'cán chỉ về số 4'],
        's-vanminh': [
            ('Hirsch', 'Cultural Literacy', '1987'), ('Recht và Leslie', '1988', '64 học sinh', 'nửa hiệp'),
            ('Aronowitz và Giroux', '1988'), 'Mười bốn ý tưởng làm nền',
            ('Socrates', '469–399 TCN', 'Plato'), ('Khổng Tử', '551–479 TCN', 'Mạnh Tử'), '“Biết đủ là giàu”',
            ('Đức Phật', 'thế kỷ 5 TCN'), ('Epictetus', '50–135', 'nô lệ'),
            ('Pascal và Fermat', '1654'), ('Hội Hoàng gia Anh', '1660', 'Nullius in verba'), ('Kant', '1784'),
            ('Adam Smith', 'Của cải của các quốc gia', '1776', '48.000 cây ghim'), ('Darwin', 'Nguồn gốc các loài', '1859'),
            ('Tuyên ngôn của Đảng Cộng sản', '1848'), 'nền tảng tư tưởng của Đảng, ghi trong Hiến pháp',
            ('Bình Ngô đại cáo', 'Đinh Mùi 1427', 'âm lịch'),
            '“Việc nhân nghĩa cốt ở yên dân”', ('Hồ Chí Minh, Tuyên ngôn Độc lập', '2/9/1945', 20),
            ('Đại hội VI của Đảng', '12/1986', 20),
            ('Phan Kế Bính', 'Việt Nam phong tục', '1915'),
            ('Bryson', 'A Short History of Nearly Everything', '2003'),
        ],
        's-thehe': [
            ('Gia huấn ca', 'Nguyễn Trãi', 'tồn nghi'), 'Lẽ tục phú',
            ('Adermon, Lindahl và Waldenström', '2018', 'Thuỵ Điển'), ('cha mẹ và con 0,3–0,4', 'ông bà và cháu chỉ 0,1–0,2', 60),
            ('thừa kế và quà tặng', 'Ít nhất một nửa'), ('học vấn', 'khoảng một phần tư', 40),
            ('Gregory Clark', 'The Son Also Rises', '2014'), ('18.869', 'Anh và xứ Wales', '1858', '2012'),
            ('0,70–0,75', 'ba phần tư'), ('Torche và Corvalán', '2018'),
            ('Holtz-Eakin, Joulfaian và Rosen', '1993'), ('150.000 USD', 'bốn lần', '25.000 USD', 120),
        ],
        # PISA 2022 tập IV (OECD, 2024), trung bình các nước OECD tham gia: +12 điểm (nói với cha mẹ về chi tiêu của
        # mình hằng tuần, hằng tháng so với không bao giờ), +30 điểm (tự quyết tiêu tiền) — đối chiếu qua bài của ACER
        # (Teacher, 2024) vì oecd.org chặn truy cập tự động; Deci, Koestner và Ryan (1999): 128 nghiên cứu.
        's-daycon': [
            ('PISA 2022', 'OECD, 2024'),
            ('15 tuổi', '20 nước và vùng', 'không có Việt Nam'), ('chi tiêu của chính mình', 'cao hơn 12 điểm', 80),
            ('tự quyết tiêu tiền', 'khoảng 30 điểm', 60), ('Ryan và Deci', '2000'),
            ('Hart và Risley', '1995', '42 gia đình', 'mỗi tháng một giờ'), ('45 triệu từ', '13 triệu', 80),
            ('Sperry', '2019'), ('Romeo', '2018'), ('trò chuyện qua lại', 'Romeo', 120),
            ('128 nghiên cứu', 'Deci, Koestner và Ryan', '1999'),
        ],
        's-honnhan': [
            ('115 nghiên cứu', '45.000 cuộc hôn nhân', 'Karney và Bradbury', '1995'),
            ('14 năm', 'Gottman và Levenson', '2000'), '“dự báo đúng hơn 90%”', ('Heyman và Smith Slep', '2001'),
            ('4.574 cặp', 'Dew, Britt và Huston', '2012'), ('388 cặp', 'Ross và cộng sự', '2022'),
            'cả ba nhóm đều dự báo mức hài lòng', 'giàu hay nghèo không còn liên quan',
        ],
        # Yêu đương: abstract của từng bài (PubMed, Crossref, Semantic Scholar), 10/2026.
        's-tinhyeu': [
            'Gộp 43 nghiên cứu theo dõi 11.196 cặp, Joel và cộng sự (2020)', 'giải thích khoảng 45% mức hài lòng hiện tại',
            ('Eastwick và Finkel', '2008'), ('Dai và cộng sự', '2014'),
            ('ba nghiên cứu với người lạ', 'Birnbaum, Zholtack và Reis', '2020'),
            ('hồ sơ Facebook của bốn nam sinh viên', 'Whitchurch, Wilson và Gilbert', '2011'),
            ('bốn nghiên cứu trò chuyện qua mạng', 'Birnbaum và cộng sự', '2018', 400),
        ],
        's-nhantin': ['Patel, Mahar và Webster (2022) khảo sát 302 sinh viên Mỹ'],
        's-henho': [
            'Aron và cộng sự (1997)', 'trong 45 phút', ('Laurenceau và cộng sự', '1998'), 'Bộ Công an, 2025',
        ],
        's-quanhe': [
            'một phần ba số cặp đã đoàn tụ chia tay trong ba tháng',
        ],
        's-dunglai': [
            'gọi 113', 'Tổng đài quốc gia 117, 24/7', 'tổng hợp trên hơn 50.000 người xác nhận cả ba, mạnh nhất là mức hài lòng',
            'nghiên cứu ở 11 thành phố Mỹ',
        ],
        # Bộ luật Dân sự 2015: Điều 650–651 (hàng thừa kế thứ nhất), 644 (hai phần ba suất), 615 (nợ trong phạm vi
        # di sản), 140 (uỷ quyền chấm dứt khi người uỷ quyền chết); Luật Đất đai 2024 Điều 27, Luật Nhà ở 2023 Điều 164
        # (công chứng); Luật Kinh doanh bảo hiểm 2022 Điều 4, 41 (người thụ hưởng). Trang chỉ giữ việc cần làm, không số điều.
        's-giayto': [
            'tới tháng 10/2026', 'hàng thừa kế đầu gồm vợ hoặc chồng, cha mẹ và các con, kể cả con nuôi',
            'vẫn nhận ít nhất hai phần ba phần họ được hưởng nếu chia theo luật',
            'chỉ trả nợ của người mất trong phạm vi tài sản được nhận',
            'Giấy uỷ quyền hết hiệu lực khi người uỷ quyền mất',
            'Mua bán, tặng cho, thế chấp nhà đất phải công chứng hoặc chứng thực',
            'Tiền bảo hiểm trả cho người thụ hưởng ghi trong hợp đồng, không chia theo di chúc',
            'Van Such và cộng sự, 2017', 'kiểm quy định hiện hành trước khi ký',
            'Nhiều bản cùng định đoạt một tài sản thì bản sau cùng có hiệu lực',
        ],
        # Thói quen (s-lotrinh): Gollwitzer và Sheeran (2006), abstract: 94 phép thử, d = 0,65; Sheeran, Listrom và
        # Gollwitzer (2024), abstract: 642 phép thử, 0,27 ≤ d ≤ 0,66; Lally và cộng sự (2010), abstract: 96 người, 18–254
        # ngày; trung bình 66 ngày theo Gardner, Lally và Wardle (2012). Luật đối luật: Tetlock (2005); Atanasov và cộng sự (2020).
        's-lotrinh': [
            ('94 phép thử', 'd = 0,65', 'Gollwitzer và Sheeran', '2006'),
            ('642 phép thử', '0,27 tới 0,66', 'Sheeran, Listrom và Gollwitzer', '2024'),
            ('96 người', 'khoảng 66 ngày', '18 ngày', '254 ngày', 'Lally và cộng sự, 2010', 320),
        ],
        's-mauthuan': [('Tetlock', '2005'), ('Atanasov và cộng sự', '2020'), '執中無權，猶執一也'],
        # Lừa đảo: bài “25 kịch bản lừa đảo trên không gian mạng năm 2026” (bocongan.gov.vn, 8/9/2026) và cảnh báo
        # “phạt nguội” (baochinhphu.vn, 10/9/2026): công an không yêu cầu nộp phạt hay đưa mật khẩu, OTP qua link lạ.
        's-luadao': [
            'Công an không yêu cầu nộp phạt hay đưa mật khẩu, mã OTP qua đường link trong tin nhắn lạ',
            ('Bộ Công an', '2026'), ('cho rút tiền vài lần đầu', 'dụ nạp số lớn', 60),
        ],
        # Luật 12: WHO, “Road traffic injuries” (20/7/2026) — hàng đầu ở 5–29 tuổi; mũ đúng cách giảm nguy cơ tử
        # vong hơn 6 lần, chấn thương não tới 74%. Cấm lái khi có nồng độ cồn: luật trật tự, an toàn giao thông
        # đường bộ (bản hợp nhất 2026), áp cho mọi phương tiện, kể cả xe thô sơ. Odean (1998) bảng I: PGR 0,148, PLR 0,098.
        's-muoihai': [
            ('người 5–29 tuổi', 'hơn 6 lần', '74%', 'WHO'), 'kể cả xe đạp, khi trong máu hoặc hơi thở có nồng độ cồn',
            ('Odean (1998)', '10.000 tài khoản', 'khoảng 50%'), ('Shefrin và Statman', '1985'), ('Cochrane', '2019'),
        ],
        # Tâm kế: bảng 2 của O'Boyle và cộng sự (2012) — riêng Machiavellianism: hiệu suất ρ −0,07 (k = 57), hành vi
        # gây hại ρ 0,25 (k = 13); 245 mẫu là của cả ba nét “đen tối”, không phải của riêng một nét. Abstract của Spurk
        # và cộng sự (2016), Harsey và Freyd (2020); phép thử công khai theo Kant (bản Campbell Smith).
        's-thecuoc': [
            ('O’Boyle và cộng sự (2012)', 'tương quan −0,07 với hiệu suất công việc', '57 mẫu'),
            ('tương quan 0,25', '13 mẫu', 'gây hại cho tổ chức và đồng nghiệp'), 'khảo sát 793 người mới đi làm ở Đức',
            'thang Mach IV gồm 20 câu', 'Kant (Bàn về hoà bình vĩnh cửu, 1795)', ('Schelling', '1960'), ('Akerlof', '1970'),
            'chỉ có chiều phủ định', 'Jennifer Freyd (1997) đặt tên DARVO', ('Harsey và Freyd', '2020'),
        ],
        # Quyền lực: Emerson (1962) bốn cách cân lại; Burt (2004) 673 quản lý; Ibarra, Carter và Silva (2010);
        # Krackhardt và Hanson (1993); Cheng và cộng sự (2013); Sabey và cộng sự (2025) 813 mẫu; Many Labs 3 (2016), 20 trường.
        's-nguonquyen': [('Richard Emerson', '1962'), ('French và Raven', '1959', 'Raven (1965)')],
        's-quyenluc': [('Burt', '2004', '673 quản lý'), ('Ibarra và cộng sự', '2010')],
        's-tochuc': [('Krackhardt và Hanson', '1993'), ('Chesterton', '1929')],
        's-diavi': [('Henrich và Gil-White', '2001'), ('Cheng và cộng sự', '2013')],
        's-hoaquyen': [('Phân tích gộp 813 mẫu', 'Sabey và cộng sự', '2025'), ('Galinsky và cộng sự', '2006'),
                       ('20 trường', '2016')],
    }
    for sid, xs in NGUON.items():
        t = chu(muc(sid))
        for x in xs:
            if isinstance(x, tuple) and isinstance(x[-1], int):
                du_kien(sid, 'dữ kiện từ nguồn', *x[:-1], w=x[-1])
            elif isinstance(x, tuple):
                du_kien(sid, 'dữ kiện từ nguồn', *x)
            else:
                claim(f'{sid}: chuỗi từ nguồn', x in t, f'không thấy “{x}”')


def phan_G():
    class CompactText(HTMLParser):
        """Đọc phần còn lại của mỗi mục khi mọi details bị loại khỏi bản in gọn."""
        def __init__(self):
            super().__init__()
            self.sid = None
            self.depth = 0
            self.sections = {}
            self.law_notes = 0

        def handle_starttag(self, tag, attrs):
            attrs = dict(attrs)
            if tag == 'section':
                self.sid = attrs.get('id')
                self.sections[self.sid] = []
            if tag == 'details':
                self.depth += 1
            if self.sid == 's-muoihai' and not self.depth and 'hc-item__brief' in attrs.get('class', '').split():
                self.law_notes += 1

        def handle_endtag(self, tag):
            if tag == 'details':
                self.depth -= 1
            if tag == 'section':
                self.sid = None

        def handle_data(self, data):
            if self.sid and not self.depth:
                self.sections[self.sid].append(data)

    compact = CompactText()
    compact.feed(HTML)
    essential = {
        's-von': ['vốn kinh tế', 'vốn văn hoá', 'vốn xã hội', 'vốn con người', 'khoảng đệm'],
        's-no': ['Khoản vay mua thứ gì?', 'Ai có quyền đổi luật giữa chừng?', 'Nếu mất thu nhập sáu tháng', 'tổng tiền phải trả'],
        's-baohiem': ['đủ trả một sự cố hay gặp', '3–6 tháng chi tiêu thiết yếu', 'thu nhập bấp bênh hoặc có người phụ thuộc'],
        's-dongxu': ['không phải tỉ lệ an toàn chung'],
        's-khanhiem': ['bằng chứng chưa thống nhất'],
        's-phanphoi': ['Xác suất chỉ là ước lượng', 'dùng kết quả để học'],
        's-bayes': ['Tỉ số cược là xác suất', 'tần suất trong những trường hợp tương tự', 'nếu mình sai, mình có thấy điều này không'],
        's-heth': ['Dự đoán có thể sai', 'Một bước lùi không tự dẫn'],
        's-cophieu': ['dữ liệu quá khứ của Mỹ, không bảo đảm tương lai'],
        's-danhmuc': ['Khi đang rút tiền', 'không để bảo đảm lợi nhuận'],
        's-vonnguoi': ['không chứng minh mọi khoá học sinh lời', 'không phải tiền có thể rút hôm nay'],
        's-chutin': ['hai bên còn coi trọng tương lai', 'Giao dịch lớn vẫn cần bảo đảm'],
        's-thecuoc': ['họ sẽ phản đối nếu biết, là thao túng', 'ép công khai vẫn là ép', 'khi còn gặp lại và chuyện lan được'],
        's-thuongluong': ['phương án tốt nhất ấy là BATNA', 'không dùng làm lời đe doạ'],
        's-memcung': ['chênh lệch quyền lực', 'Chuyện an toàn hoặc sai luật'],
        's-ranhgioi': ['Từ chối bằng một nguyên tắc chung', 'vừa bị giục vừa được chiều chuộng'],
        's-quyenluc': ['Cố vấn cho lời khuyên', 'người bảo trợ dùng uy tín để đề cử'],
        's-vonvanhoa': ['không đo đúng năng lực hay nhân cách'],
        's-lenghia': ['khác theo vùng và từng nhà', 'nhập gia tuỳ tục'],
        's-kinhdien': ['trăm trận không nguy', 'hai lần là đủ', 'chưa rõ xuất xứ'],
        's-giayto': ['nên công chứng', 'di chúc không gạt được hết vợ, chồng, cha mẹ, con chưa thành niên',
                     'con thành niên không có khả năng lao động', 'trừ người từ chối nhận hoặc không có quyền hưởng'],
        's-luadao': ['chưa tự chứng minh lừa đảo', 'không thấy dấu hiệu cũng chưa bảo đảm an toàn',
                     'Không đưa mã OTP, mật khẩu', 'gọi ngay ngân hàng của mình để khoá tài khoản'],
        's-muoihai': ['đã uống rượu bia thì không lái xe nào', 'cài quai đúng cách'],
        's-lotrinh': ['“nếu [lúc, chỗ] thì tôi [việc nhỏ]”', 'vài tuần tới vài tháng', 'lỡ một lần thì làm lại'],
        's-tinhyeu': ['Không có kỹ thuật bảo đảm khiến một người yêu mình', 'có quyền đổi ý'],
        's-nhantin': ['ngừng nhắc'],
        's-henho': ['mời theo cách dễ từ chối'],
        's-quanhe': ['đừng coi kiểm soát là bằng chứng yêu'],
        's-batdong': ['không coi là lỗi đôi bên'],
        's-dunglai': ['gọi 113', 'Tổng đài quốc gia 117', 'Không phải chứng minh người kia xấu mới được rời đi'],
        's-honnhan': ['Bạo lực cần ưu tiên an toàn', 'Sống chung mà không đăng ký kết hôn thì không có quyền, nghĩa vụ vợ chồng'],
    }
    for sid, phrases in essential.items():
        visible = ' '.join(' '.join(compact.sections.get(sid, [])).split())
        for phrase in phrases:
            claim(f'bản gọn {sid}: điều kiện luôn hiện', phrase in visible, f'không thấy “{phrase}” ngoài details')
    claim('bản gọn: cả 12 luật có giải nghĩa luôn hiện', compact.law_notes == 12, str(compact.law_notes))
    dai = [n for n, x in enumerate(re.findall(r'<p class="hc-item__brief">(.*?)</p>', muc('s-muoihai'), flags=re.S), 1)
           if len(chu(x).split()) > 25]
    claim('bản gọn: dòng giải nghĩa của mỗi luật tối đa 25 chữ', not dai, 'luật ' + ', '.join(map(str, dai)))
    # Tiêu đề mục thiếu class thì mất cỡ chữ và luật ngắt trang của bản in (Phần 7 từng thiếu cả sáu).
    bare = [sid for sid, h2 in re.findall(r'<section id="(s-[a-z]+)">\s*<p class="hc-eyebrow-sec">.*?</p>\s*(<h2[^>]*>)', HTML, flags=re.S)
            if 'hc-sec-title' not in h2]
    claim('mọi tiêu đề mục có class hc-sec-title', not bare, ', '.join(bare))
    # Mỗi mục nội dung có đúng một khung luật, cùng một nhãn, để người đọc bản gọn tìm thấy luật ở cùng chỗ.
    khung = {'s-cach', 's-muoihai', 's-tusoat', 's-lotrinh', 's-tomtat', 's-thuvien', 's-nguon'}
    for sid, body in re.findall(r'<section id="(s-[a-z]+)">(.*?)</section>', HTML, flags=re.S):
        if sid in khung:
            continue
        ks = re.findall(r'<div class="hc-key">\s*<span class="k">([^<]*)</span>', body)
        claim(f'{sid}: một khung “Luật của mục này”', ks == ['Luật của mục này'], f'thấy {ks}')


    # Điều kiện đã mất khi rút gọn: kiểm các thành phần cần để hiểu đúng, không khoá cả câu văn.
    no = chu(muc('s-no'))
    claim('nợ: trả góp 0% so bằng tổng tiền; thẻ chỉ miễn lãi khi trả đủ, trả tối thiểu vẫn là vay',
          all(x in no for x in ['so tổng tiền phải trả với giá trả ngay', 'trả đủ dư nợ sao kê đúng hạn', 'kể cả trả mức tối thiểu']))
    # Caplovitz (1963) đo người nghèo trả giá và lãi mua chịu cao hơn; "mua đồ rẻ nhiều lần" không phải của ông.
    claim('nợ: Caplovitz gắn với mua chịu, giá và lãi cao, không gắn với “mua đồ rẻ nhiều lần”',
          'mua chịu' in no and 'mua đồ rẻ nhiều lần' not in no)
    # Mani và cộng sự (2013): lời phê bình của Wicherts và Zand Scholten nhắm các thí nghiệm trong phòng, không phải
    # nghiên cứu mía; Kidd và cộng sự (2013) là một biến thể của thí nghiệm kẹo dẻo, không phải bản làm lại.
    kh = chu(muc('s-khanhiem'))
    claim('khan hiếm: phê bình 2013 nhắm thí nghiệm trong phòng, không nhắm nghiên cứu mía',
          'thí nghiệm trong phòng thí nghiệm của cùng bài báo' in kh and 'phân tích nghiên cứu mía' not in kh)
    claim('kẹo dẻo: Kidd 2013 là biến thể, không phải bản làm lại', 'biến thể của thí nghiệm' in kh and 'làm lại năm 2013' not in kh)
    bh = chu(muc('s-baohiem'))
    claim('bảo hiểm: phạm vi, mốc tính thời hạn và khấu trừ hoàn phí',
          all(x in bh for x in ['hợp đồng trên một năm', '21 ngày từ ngày nhận hợp đồng', 'trừ chi phí hợp lý']))
    dm = chu(muc('s-danhmuc'))
    claim('tương quan 0 được giải nghĩa là chưa chắc độc lập', 'không có liên hệ tuyến tính (chưa chắc là độc lập)' in dm)
    claim('tương quan bằng 0 không được đồng nhất với độc lập', 'Tương quan 0 (độc lập)' not in dm)
    rep = chu(muc('s-giakienthuc'))
    claim('36% là tiêu chí thống kê, không phải chứng minh hiệu ứng không tồn tại',
          'ngưỡng ý nghĩa thống kê' in rep and 'Không đạt ngưỡng chưa chứng minh hiệu ứng không tồn tại' in rep)
    row = re.search(r'<tr><td class="hc-num">59</td><td>(.*?)</td>', muc('s-tomtat'), re.S)
    claim('ôn tập tâm kế: giữ điều kiện tự do lựa chọn và giới hạn phép thử',
          bool(row) and all(x in chu(row.group(1)) for x in ['hiểu sai', 'tự do lựa chọn', 'chưa chứng minh']))
    cards = {c['id']: c for c in json.loads(DATA.read_text(encoding='utf-8'))['concepts']}
    cm = cards['compounding']['mistake']
    claim('thẻ lãi kép: 24,4% giữ giả định lợi suất và thời hạn',
          all(x in cm for x in ['8%', '7%', '30 năm', '24,4%']))
    unit = cards['unit-economics']['mechanism']
    claim('thẻ hoà vốn dùng chi phí biến đổi, không thay bằng chi phí trực tiếp',
          'chi phí biến đổi' in unit and 'chi phí trực tiếp' not in unit)
    estate = cards['estate']['mechanism']
    claim('thẻ di chúc giữ ngoại lệ khẩn cấp và điều kiện luật định',
          all(x in estate for x in ['Di chúc miệng', 'tính mạng bị đe doạ', 'không thể lập văn bản', 'đủ điều kiện']))
    claim('thẻ đổi việc: khoản đệm không tự tạo khả năng quay lại',
          'lối quay lại thật' in cards['reversibility']['example'])
    claim('thẻ khoảng đệm không hứa biến quyết định thành quay lại được',
          'không tự tạo lại' in cards['buffer']['mechanism']
          and 'trở thành quay lại được' not in cards['buffer']['mechanism'])
    fee = chu(muc('s-taisan'))
    claim('bản đồ tài sản: 24,4% cũng giữ giả định lợi suất',
          all(x in fee for x in ['8%/năm trước phí', '7% sau phí', '30 năm', '24,4%']))
    # Fed Atlanta, wage-growth-data.xlsx sửa ngày 8/10/2026, sheet Job Switcher (12 tháng), cột B/C, 1/1997–9/2026:
    # 325 trên 356 tháng có số liệu nhóm đổi việc cao hơn, chênh bình quân 0,729 điểm; tháng 10/2025 trống.
    need_t('tỷ lệ tháng nhóm đổi việc cao hơn = 325 / 356', f'({vi(100 * 325 / 356, 1)}%)')
    ditf = chu(muc('s-thuyetphuc'))
    claim('Genschow bảng 1: so nhóm sau yêu cầu lớn với nhóm chỉ yêu cầu nhỏ',
          '51%' in ditf and '38%' in ditf and '34%' not in ditf)
    # Galinsky và Mussweiler (2001): lợi thế ra giá trước mất khi bên nhận giá nghĩ tới lựa chọn khác của BÊN RA GIÁ.
    tl = chu(muc('s-thuongluong'))
    claim('con số neo: lựa chọn khác là của bên ra giá, không phải của bên nhận giá',
          'lựa chọn khác của bên ra giá' in tl and 'lựa chọn khác của mình' not in tl)
    # Kim và cộng sự (2004): với lỗi gian dối, xin lỗi hàn gắn kém hơn chối; chối rồi bị lộ thì mất tin nặng hơn.
    dn = chu(muc('s-docnguoi'))
    claim('đọc người: Kim và cộng sự (2004) giữ đúng chiều của lỗi gian dối',
          all(x in dn for x in ['Kim và cộng sự, 2004', 'hàn gắn kém hơn', 'chối rồi bị lộ']))
    # Câu cho những lần nói khó (6.2): một bảng 7–9 dòng, mỗi dòng ba ô — tình huống, câu nói, điều kiện.
    tk = re.search(r'Câu cho những lần nói khó</h3>.*?<tbody>(.*?)</tbody>', muc('s-imlang'), flags=re.S)
    rows = re.findall(r'<tr>(.*?)</tr>', tk.group(1), flags=re.S) if tk else []
    claim('6.2: bảng câu cho những lần nói khó có 7–9 dòng, mỗi dòng ba ô',
          7 <= len(rows) <= 9 and all(r.count('<td>') == 3 for r in rows), f'{len(rows)} dòng')
    claim('6.2: bằng chứng của bảng câu nói khó còn dẫn nguồn',
          all(x in chu(muc('s-imlang')) for x in ['Zhao và Epley, 2021', 'Kardas, Kumar và Epley, 2022',
                                                  'Lewicki và cộng sự, 2016']))
    wage = chu(muc('s-moitruong'))
    claim('đổi việc: mức tăng lương là trung vị, không phải tác dụng riêng của chuyển chỗ',
          'trung vị' in wage and 'không đo tác dụng riêng' in wage)


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
        phan_G()
    print()
    if fails:
        print('verify-hidden-curriculum: %d chỗ KHÔNG khớp (trên %d phép kiểm):' % (len(fails), checks))
        for f in fails:
            print('    %s' % f)
        return 1
    print('verify-hidden-curriculum: OK — %d phép kiểm, mọi con số và dòng mã then chốt trong trang dựng lại được.' % checks)
    return 0


if __name__ == '__main__':
    sys.exit(main())
