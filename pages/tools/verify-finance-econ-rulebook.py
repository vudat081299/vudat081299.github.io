#!/usr/bin/env python3
"""Cổng kiến thức cho pages/finance-econ-rulebook.html (Economics Handbook).

lint-pages.py bắt thẻ lệch và anchor gãy, nhưng không biết 26.935 có đúng là 25.652 × 1,05 không,
không biết mô hình nhà cho thuê còn tính g* = L·i + (1−L)·d − y không, và không biết số quy tắc in
trong bài còn khớp với danh mục không. Cổng này kiểm bốn phần:

  A. CON SỐ TRONG BÀI — tính lại từ đầu rồi đòi trang có đúng chuỗi ấy: số nhân, căn nhà ở A2,
     P/E × EPS, biên độ, margin, quy đổi vàng, hàng rào tỷ giá, nhà cho thuê, bốn phép so với tiền
     gửi, giải ngân dần, VN-Index 2022, Kelly, đuôi dày.
  B. SỐ HIỆN HÀNH NHẤT QUÁN — cùng một con số (tỷ giá trung tâm, giá vàng, lãi tiết kiệm, P/E) phải
     giống nhau ở mọi chỗ trang dùng nó: bảng, ô nhập mặc định, lời văn.
  C. LUẬT TRONG MÃ — các dòng JS then chốt còn nguyên hình (trần/sàn ±5%, công thức g*, phần bù rủi ro,
     quy đổi vàng, đếm quy tắc), và lời kết luận vàng đã sửa ("cả hai cùng vượt" không còn là "cầu trú
     ẩn thật").
  D. CẤU TRÚC SỔ TAY — mỗi thẻ quy tắc có id duy nhất, nhãn T khớp màu chip, nhóm có chip lọc, mọi mã
     R-… được trích trong bài đều tồn tại; chương A1…A12 đúng thứ tự, mục lục khớp tiêu đề.

Số hiện hành (lãi điều hành, tỷ giá, giá vàng…) có nguồn và ngày ghi ngay trong trang; cổng không tra
lại nguồn, chỉ giữ cho chúng nhất quán và tính đúng từ nhau. Chỉ dùng thư viện chuẩn.

Chạy:  python3 pages/tools/verify-finance-econ-rulebook.py
Exit code: 1 nếu có con số hoặc luật không khớp.
"""
import html as H
import math
import pathlib
import re
import sys
from decimal import Decimal, ROUND_HALF_UP

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'finance-econ-rulebook.html'
PAGES = ['pages/finance-econ-rulebook.html']  # run-verify.py đọc dòng này để biết cổng kiểm trang nào

fails = []
checks = 0
HTML = ''
TEXT = ''


def vi(x, d=0):
    """Số kiểu vi-VN như toLocaleString của trang: làm tròn nửa lên (Intl), chấm ngăn nghìn, phẩy
    thập phân, dấu trừ Unicode. Python round() làm tròn nửa về chẵn — 8,25 ra 8,2 trong khi trang in
    8,3 — nên phải dùng Decimal."""
    q = Decimal(1).scaleb(-d)
    v = Decimal(repr(abs(x))).quantize(q, rounding=ROUND_HALF_UP)
    s = f'{v:,.{d}f}'.replace(',', '\x00').replace('.', ',').replace('\x00', '.')
    return ('−' if x < 0 and v != 0 else '') + s


def pct(x, d=1):
    """Đúng hàm pct() của trang: dấu + / − rồi số tuyệt đối."""
    return ('+' if x > 0 else '−' if x < 0 else '') + vi(abs(x), d) + '%'


def need(label, text, expect=None):
    global checks
    checks += 1
    if text not in HTML:
        fails.append(f'{label}: không thấy "{text}"' + (f' (tính được: {expect})' if expect is not None else ''))


def claim(label, ok, why=''):
    global checks
    checks += 1
    if not ok:
        fails.append(f'{label}: {why or "không đúng"}')


def near(label, got, want, tol, why=''):
    global checks
    checks += 1
    if abs(got - want) > tol:
        fails.append(f'{label}: {got:.6g} lệch khỏi {want:.6g} quá {tol:.3g}. {why}')


def attr(id_, name='value'):
    m = re.search(r'id="%s"[^>]*\b%s="([^"]*)"' % (re.escape(id_), name), HTML)
    if not m:
        fails.append(f'không thấy thuộc tính {name} của #{id_}')
        return None
    return float(m.group(1))


# ---------------------------------------------------------------- A. CON SỐ TRONG BÀI
def phan_A():
    # A1 — số nhân chi tiêu
    need('số nhân 0,7', '100 / (1 − 0,7) = 333')
    need('số nhân, ô mặc định', 'id="multTotal">' + vi(100 / (1 - 0.7)) + ' triệu')
    need('số nhân 40%→90%', 'tổng nhảy từ ' + vi(100 / 0.6) + ' lên ' + vi(100 / 0.1) + ' triệu')

    # A2 — căn nhà: tiền thuê 100, đòi 10% / 11%, tự tăng 4%
    p0, p1 = 100 / 0.06, 100 / 0.07
    need('nhà ban đầu', '100 / 0,06 = <b>' + vi(p0) + ' tr')
    need('nhà sau +1 điểm', '100 / 0,07 = <b>' + vi(p1) + ' tr')
    need('nhà mất', vi((p1 / p0 - 1) * 100) + '%')
    a, b = 100 / 0.07 / (100 / 0.06) - 1, (100 / 0.03) / (100 / 0.02) - 1
    need('A/B mức gốc', 'id="discValG">' + vi(100 / 0.02) + ' tr')
    need('A mất 14%, B mất 33%', 'A mất ' + vi(-a * 100) + '% còn B mất ' + vi(-b * 100) + '%')

    # A7 — P/E × EPS
    need('giá năm nay', vi(5000 * 12) + ' đ')
    need('giá năm sau', vi(6000 * 9) + ' đ')
    claim('−10%', abs(6000 * 9 / (5000 * 12) - 0.9) < 1e-12)

    # A7 — biên độ: tin xấu −25%, HoSE ±7%
    lv, n = 100.0, 0
    while lv > 75 + 1e-9:
        lv, n = max(75, lv * 0.93), n + 1
    need('số phiên giảm sàn', 'id="bandN">%d phiên' % n, n)

    # A7 — margin: 100 tr tự có, vay 100, duy trì 30%
    brk = (1 - 100 / (0.7 * 200)) * 100
    need('quãng an toàn margin', 'Giá chỉ cần giảm <b>' + vi(brk, 1) + '%</b> nữa', brk)

    # A8 — quy đổi vàng (số mặc định sáng 17/11/2026)
    oz = 37.5 / 31.1034768
    need('lượng → ounce', vi(oz, 5) + ' ounce', oz)
    xau, fx, sjc, ring = attr('gXau'), attr('gFx'), attr('gSjc'), attr('gRing')
    if None not in (xau, fx, sjc, ring):
        world = xau * 1.20565 * fx / 1e6
        need('giá thế giới quy đổi', 'id="gWorld">' + vi(world, 1) + ' tr/lượng', world)
        need('SJC trả thêm', 'id="gGapS">+' + vi(sjc - world, 1) + ' tr')
        need('nhẫn trả thêm', 'id="gGapR">+' + vi(ring - world, 1) + ' tr')
        claim('mặc định là trường hợp cả hai cùng vượt', sjc - world > world * 0.03 and ring - world > world * 0.03,
              'lời văn A8 nói sáng 17/11/2026 SJC và nhẫn cùng vượt; số mặc định phải cho đúng trường hợp ấy')
        need('chênh vàng trong lời văn', 'khoảng 16–17 triệu đồng/lượng')
        need('R-I04: chênh theo %', 'khoảng ' + vi(round(sjc - world)) + ' triệu đồng/lượng, tức 13–14%')
        claim('13–14% đúng', 13 <= (sjc / world - 1) * 100 <= 14, f'{(sjc / world - 1) * 100:.2f}%')

    # B03 — xăng 10% × 3,6%
    need('xăng → CPI', vi(10 * 0.036, 2) + ' điểm')

    # A5 — hàng rào tỷ giá
    c, p = attr('fxCentral'), attr('fxBank')
    if c and p:
        ceil, floor = c * 1.05, c * 0.95
        need('trần, sàn trong bảng', 'trần ' + vi(ceil) + ', sàn ' + vi(floor))
        need('trần, sàn trong mô hình', 'trần ' + vi(ceil) + ' · sàn ' + vi(floor))
        need('còn tới trần', 'id="fxRoom">' + vi((ceil / p - 1) * 100, 1) + '%')
        need('so với trung tâm', 'id="fxPos">' + pct((p / c - 1) * 100))
        need('1 tỷ USD', '1 tỷ USD ↔ ' + vi(p) + ' tỷ đồng')
        need('R-C08: 1 tỷ USD', 'giá ' + vi(p) + ' đ là ' + vi(p) + ' tỷ đồng')
        claim('hàng rào "gần 2.600 đồng"', 2500 <= ceil - floor <= 2600, f'{ceil - floor:.0f} đ')
        need('mua 1 tỷ USD ở 25.500', 'Mỗi tỷ USD mua vào là ' + vi(25500) + ' tỷ đồng')

    # A9 — nhà cho thuê
    P, R = attr('hPrice') * 1000, attr('hRent') * 12
    L, i, d = attr('hLoan') / 100, attr('hRate') / 100, attr('hDep') / 100
    y, k = R / P, L * i + (1 - L) * d
    g = k - y
    need('lợi suất thuê trong gợi ý', '(lợi suất ' + vi(y * 100, 1) + '%)')
    need('hY', 'id="hY">' + vi(y * 100, 1) + '%')
    need('hK', 'id="hK">' + vi(k * 100, 1) + '%', k * 100)
    need('hG', 'id="hG">' + vi(g * 100, 1) + '%')
    need('hBreak', 'id="hBreak">' + vi(g * 100, 1) + '%/năm')
    need('hCash', 'id="hCash">' + vi(R - L * P * i) + ' triệu')
    need('hCashSub', vi(R) + ' triệu tiền thuê − ' + vi(L * P * i) + ' triệu lãi vay.')

    # A10 — bốn phép so
    v = {k_: attr(k_) for k_ in ('sDep', 'sInf', 'sPe', 'sRent', 'sMort', 'sGold', 'sWorld', 'sUsdBank', 'sUsdFree', 'sCentral')}
    real = v['sDep'] - v['sInf']
    erp = 100 / v['sPe'] - real
    need('sigReal', 'id="sigReal">' + pct(real))
    need('sigErp', 'id="sigErp">' + pct(erp))
    need('sigHouse', 'id="sigHouse">' + vi(v['sMort'] - v['sRent'], 1) + ' điểm')
    need('sigGold', 'id="sigGold">' + pct((v['sGold'] / v['sWorld'] - 1) * 100))
    fg, room = (v['sUsdFree'] / v['sUsdBank'] - 1) * 100, (v['sCentral'] * 1.05 / v['sUsdBank'] - 1) * 100
    need('sigUsd', 'id="sigUsd">' + pct(fg) + ' · ' + vi(room, 1) + '%')
    need('R-I06 lời văn', 'giá tự do cao hơn ngân hàng ' + vi(fg, 1) + '%, ngân hàng còn ' + vi(room, 1) + '% tới trần')
    need('A9 lời văn USD', 'cao hơn ngân hàng ' + vi(fg, 1) + '%')
    need('E/P trong lời văn', 'khoảng ' + vi(100 / v['sPe'], 1) + ' đồng lợi nhuận')
    need('lãi thực trong lời văn', 'còn khoảng ' + vi(real, 1) + '%')
    need('ERP trong lời văn', 'khoảng ' + vi(erp, 1) + ' điểm')
    lo, hi = 6.1 - 4.57, 7 - 4.57
    need('R-I02 vùng lãi thực', 'khoảng ' + vi(lo, 1) + '–' + vi(hi, 1) + '%/năm')

    # A10 — giải ngân dần: tiền bằng nhau mỗi đợt → giá vốn = trung bình điều hoà
    for prices, end, lump in (([100, 90, 80, 90], 100, '0%'), ([100, 105, 110, 115], 115, '+15,0%')):
        hm = len(prices) / sum(1 / x for x in prices)
        units = sum(25 / x for x in prices)              # mô phỏng: 4 đợt × 25 đồng
        near('giá vốn = trung bình điều hoà', 100 / units, hm, 1e-9)
        claim('điều hoà ≤ cộng', hm <= sum(prices) / len(prices))
        need('giá vốn bình quân', '<td>' + vi(hm, 1) + '</td><td>' + str(end) + '</td>')
        dca = (end / hm - 1) * 100
        need('lãi khi chia đợt', vi(dca, 1) + '%')
        need('mua một lần', '<td>' + (lump if lump == '0%' else '<span class="wb-num wb-num--pos">' + lump + '</span>') + '</td>')

    # VN-Index 2022
    need('VN-Index 2022', 'mất ' + vi((1007.09 / 1498.28 - 1) * -100, 1) + '%')
    need('R-I01 note', vi(1498.28, 2) + ' xuống ' + vi(1007.09, 2) + ' điểm, tức ' + vi((1007.09 / 1498.28 - 1) * 100, 1) + '%')

    # 06 — Kelly cho cược +50% / −40%
    kelly = 0.5 / 0.4 - 0.5 / 0.5
    near('Kelly', kelly, 0.25, 1e-12)
    typ, avg = 100 * math.sqrt(1.5 * 0.6) ** 100, 100 * 1.05 ** 100
    need('đường đời điển hình', 'style="color:var(--wb-danger-text)">' + vi(typ, 2) + ' triệu')
    need('trung bình cộng', 'id="kMean" style="color:var(--wb-fg-subtle)">' + vi(avg / 1000, 1) + ' tỷ')

    # 06 — đuôi dày, phiên −5%, σ = 1,2%, 250 phiên/năm
    pn = 0.5 * math.erfc(5 / 1.2 / math.sqrt(2))
    s = 1.2 / math.sqrt(2)
    t0 = 5 / s
    # đuôi của t(4) theo công thức đóng, x = t/√(4+t²): P(T > t) = (1 − 1,5·x + 0,5·x³)/2. Trang tích
    # phân số Simpson; hai lối phải ra cùng số lần làm tròn.
    x = t0 / math.sqrt(4 + t0 * t0)
    pt = 0.5 * (1 - 1.5 * x + 0.5 * x ** 3)
    need('đường hình chuông', 'id="tailNorm" style="color:var(--wb-fg-subtle)">1 lần / ' + vi(1 / (pn * 250)) + ' năm')
    need('đuôi dày', 'id="tailFat" style="color:var(--wb-danger-text)">1 lần / ' + vi(1 / (pt * 250), 1) + ' năm')
    need('gấp bao nhiêu', 'Gấp <b>' + vi(pt / pn) + ' lần</b>')


# ---------------------------------------------------------------- B. SỐ HIỆN HÀNH NHẤT QUÁN
def phan_B():
    c1, c2 = attr('fxCentral'), attr('sCentral')
    claim('tỷ giá trung tâm: hai mô hình', c1 == c2 == 25652, f'{c1} / {c2}')
    need('tỷ giá trung tâm trong bảng', vi(25652) + ' đ/USD ngày 17/11/2026')
    claim('giá USD ngân hàng: ba chỗ', attr('fxBank') == attr('sUsdBank') == attr('gFx'))
    claim('giá SJC: hai mô hình', attr('gSjc') == attr('sGold'))
    world = attr('gXau') * 1.20565 * attr('gFx') / 1e6
    near('giá thế giới quy đổi: hai mô hình', attr('sWorld'), round(world, 1), 1e-9)
    claim('lãi tiết kiệm: hai mô hình', attr('hDep') == attr('sDep') == 6.5)
    claim('6,5% nằm giữa vùng 6,1–7%', 6.1 <= attr('sDep') <= 7)
    claim('P/E: mô hình và lời văn', attr('sPe') == 10.7 and 'P/E 10,70' in HTML and 'Lấy P/E 10,7' in HTML)
    need('CPI bình quân 10 tháng', '4,57%')
    claim('CPI vượt mục tiêu như lời văn nói', 4.57 > 4.5)
    need('lãi điều hành', '4,5% · 3,0% · 5,0%/năm')
    need('trần tiền gửi', '1 đến dưới 6 tháng 4,75%')
    need('Fed', '3,75–4,00%')
    need('bảo hiểm tiền gửi', '350 triệu đồng')
    need('ngày số liệu', 'CẬP NHẬT 17·11·2026')
    # số quy tắc in trong bài = số thẻ trong danh mục
    cards = re.findall(r'<div class="wb-card rb-rule" id="(R-[A-Z]+\d+)" data-tag="(T\d)" data-cat="([A-Z])"', HTML)
    shown = set(re.findall(r'<span data-rule-total>(\d+)</span>', HTML))
    claim('số quy tắc in tĩnh = số thẻ', shown == {str(len(cards))}, f'in {shown}, có {len(cards)} thẻ')
    claim('meta ~N quy tắc', ('~%d quy tắc' % len(cards)) in HTML, f'meta phải nói ~{len(cards)}')
    claim('ít nhất 75 quy tắc', len(cards) >= 75)


# ---------------------------------------------------------------- C. LUẬT TRONG MÃ
def phan_C():
    for label, line in [
        ('trần, sàn ±5%', 'var ceil = c * 1.05, floor = c * 0.95;'),
        ('công thức g*', 'var y = R / P, k = L * i + (1 - L) * d, g = k - y'),
        ('lãi thực', "var real = v('sDep') - v('sInf');"),
        ('phần bù rủi ro', "var erp = 100 / v('sPe') - real"),
        ('còn tới trần ở A10', "room = (v('sCentral') * 1.05 / v('sUsdBank') - 1) * 100"),
        ('quy đổi vàng', 'var world = xau * OZ * fx / 1e6;'),
        ('hằng số ounce', 'var OZ = 1.20565;'),
        ('số nhân', 'total = 100 / (1 - c)'),
        ('đếm quy tắc', "document.querySelectorAll('[data-rule-total]'), function (el) { el.textContent = cards.length; }"),
    ]:
        need('mã: ' + label, line)
    # luật vàng đã sửa: "cả hai vượt" không được kết luận là "cầu trú ẩn thật"
    claim('kết luận vàng đã sửa', "t = 'Cầu trú ẩn thật'" not in HTML and "t = 'Cầu trong nước lớn hơn lượng vàng nhập được'" in HTML)
    claim('R-D06 đã sửa', 'đó là cầu trú ẩn <b>thật</b>' not in HTML)

    # dựng lại g* bằng lối khác: so tài sản cuối năm của hai lựa chọn, tìm g bằng chia đôi
    def wealth_gap(g, P=5000, R=144, L=0.5, i=0.10, d=0.065):
        house = P * (1 + g) - L * P + R - L * P * i
        bank = (1 - L) * P * (1 + d)
        return house - bank
    lo, hi = -1.0, 1.0
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if wealth_gap(mid) < 0 else (lo, mid)
    near('g* bằng chia đôi', lo, 0.5 * 0.10 + 0.5 * 0.065 - 144 / 5000, 1e-9,
         'công thức trong bài phải trùng với phép so tài sản cuối năm')


# ---------------------------------------------------------------- D. CẤU TRÚC SỔ TAY
def phan_D():
    cards = re.findall(r'<div class="wb-card rb-rule" id="(R-[A-Z]+\d+)" data-tag="(T\d)" data-cat="([A-Z])"><div class="rb-rule-head"><span class="rb-id">([^<]+)</span><span class="wb-cap([^"]*) wb-cap--sm">(T\d)</span>', HTML)
    allcards = re.findall(r'class="wb-card rb-rule" id="(R-[A-Z]+\d+)" data-tag', HTML)
    claim('mọi thẻ trong danh mục đọc được', len(cards) == len(re.findall(r'<div class="wb-card rb-rule" id="R-[A-Z]+\d+" data-tag="T\d" data-cat=', HTML)))
    claim('id quy tắc không trùng', len(allcards) == len(set(allcards)))
    tone = {'T0': ' wb-cap--success', 'T1': ' wb-cap--info', 'T2': '', 'T3': ' wb-cap--warning'}
    chips = set(re.findall(r'class="wb-cap wb-cap--elevated rb-chip" data-cat="([A-Z])"', HTML))
    heads = set(re.findall(r'class="wb-divider--label rb-cat-head" data-cat="([A-Z])"', HTML))
    for rid, tag, cat, shown, cls, chip in cards:
        claim(f'{rid}: tên hiển thị', shown == rid)
        claim(f'{rid}: nhãn khớp data-tag', chip == tag, f'{chip} ≠ {tag}')
        claim(f'{rid}: màu chip khớp nhãn', cls == tone[tag], f'"{cls}"')
        claim(f'{rid}: nhóm khớp mã', rid[2] == cat or rid.startswith('R-' + cat), f'{rid} nằm ở nhóm {cat}')
        claim(f'{rid}: nhóm có chip lọc và tiêu đề', cat in chips and cat in heads)
    # mọi mã được trích phải tồn tại
    defined = set(re.findall(r'id="(R-[A-Z]+\d+)"', HTML)) | set(re.findall(r'(R-M\d\d) ·', HTML))
    cited = set(re.findall(r'\b(R-[A-Z]+\d+)\b', TEXT))
    for code in sorted(cited - defined):
        claim('mã được trích phải có thẻ: ' + code, False)
    # chương A1…A12 đúng thứ tự, mục lục khớp
    eyebrows = re.findall(r'<p class="rb-sec-eyebrow"><b>(A\d+)</b>', HTML)
    claim('chương A1…A12 theo thứ tự', eyebrows == ['A%d' % k for k in range(1, 13)], str(eyebrows))
    toc = re.findall(r'<a class="wb-sidenav__link" href="#(a\d+-[a-z-]+)">(A\d+) ·', HTML)
    ids = re.findall(r'<section id="(a\d+-[a-z-]+)"', HTML)
    claim('mục lục trỏ đúng thứ tự chương', [t[0] for t in toc] == ids and [t[1] for t in toc] == eyebrows,
          f'{toc} / {ids}')
    for sid in ids:
        claim(f'id {sid} mang đúng số chương', sid.split('-')[0].upper() == eyebrows[ids.index(sid)])
    need('số chương trong lời dẫn', 'Mười hai chương dưới đây')
    need('số chương ở chế độ người mới', 'Chỉ còn 12 chương của Phần A')


def main():
    global HTML, TEXT
    if not PAGE.exists():
        print('verify-finance-econ-rulebook: không thấy %s' % PAGE.name)
        return 1
    HTML = PAGE.read_text(encoding='utf-8')
    body = HTML[HTML.find('<body'):]
    body = re.sub(r'<script\b.*?</script>', ' ', body, flags=re.S)
    TEXT = H.unescape(re.sub(r'<[^>]+>', ' ', body))
    for part in (phan_A, phan_B, phan_C, phan_D):
        part()
    if fails:
        print('verify-finance-econ-rulebook: %d chỗ KHÔNG khớp (trên %d phép kiểm):' % (len(fails), checks))
        for f in fails:
            print('    %s' % f)
        return 1
    print('verify-finance-econ-rulebook: OK — %d phép kiểm, mọi con số, luật và cấu trúc sổ tay dựng lại được.' % checks)
    return 0


if __name__ == '__main__':
    sys.exit(main())
