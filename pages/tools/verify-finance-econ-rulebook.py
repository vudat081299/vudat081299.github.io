#!/usr/bin/env python3
"""Cổng kiến thức cho pages/finance-econ-rulebook.html (Economics Handbook).

lint-pages.py bắt thẻ lệch và anchor gãy, nhưng không biết 26.935 có đúng là 25.652 × 1,05 không,
không biết mô hình nhà cho thuê còn tính g* = L·i + (1−L)·d − y không, và không biết số quy tắc in
trong bài còn khớp với danh mục không. Cổng này kiểm bốn phần:

  A. CON SỐ TRONG BÀI — tính lại từ đầu rồi đòi trang có đúng chuỗi ấy: số nhân, căn nhà ở A2,
     P/E × EPS, biên độ, margin, quy đổi vàng, hàng rào tỷ giá, nhà cho thuê, chi phí một vòng mua–bán
     (A10), đa dạng hoá, tỷ trọng theo mức lỗ, tái cân bằng (A11), lạm phát kỳ vọng, bốn phép so với
     tiền gửi có trừ phí, ví dụ 500 triệu chạy trọn bốn câu hỏi (A12), giải ngân dần, VN-Index 2022,
     Kelly, đuôi dày.
  B. SỐ HIỆN HÀNH NHẤT QUÁN — cùng một con số (tỷ giá trung tâm, giá vàng, lãi tiết kiệm, P/E, lợi suất
     cho thuê, USD tự do) phải giống nhau ở mọi chỗ trang dùng nó: bảng, ô nhập mặc định, lời văn; bội
     chi, nợ công, thuế quan Mỹ ở A6 khớp nhau.
  C. LUẬT TRONG MÃ — các dòng JS then chốt còn nguyên hình (trần/sàn ±5%, công thức g*, phần bù rủi ro,
     phí trong phép so, c/H + f, σ danh mục, quy đổi vàng, đếm quy tắc, nút Đọc liền, margin một chữ
     số), mũi tên sơ đồ A6 chạm đúng mép, và lời kết luận vàng đã sửa ("cả hai cùng vượt" không còn là
     "cầu trú ẩn thật").
  D. CẤU TRÚC SỔ TAY — mỗi thẻ quy tắc có id duy nhất, nhãn T khớp màu chip, nhóm có chip lọc, mọi mã
     R-… được trích trong bài đều tồn tại; chương A1…An đúng thứ tự (n đếm từ trang), mục lục, chân
     trang và các câu nói số chương khớp tiêu đề.

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
        # chênh lệch mua–bán SJC: mua 134,2, bán = giá bán trong ô nhập
        buy = 134.2
        need('SJC mua–bán', 'SJC mua ' + vi(buy, 1) + ', bán ' + vi(sjc, 1) + ' triệu')
        need('mất khi bán lại ngay', 'mất ' + vi(sjc - buy) + ' triệu đồng/lượng, khoảng ' + vi((sjc - buy) / sjc * 100, 1) + '%')

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
    # phép so có phí (A10): một vòng chia số năm giữ + phí quỹ năm; ô phí quỹ điền sẵn đúng tỷ lệ chi phí ETF VN30
    hold, fee = attr('sHold'), attr('sFee')
    claim('phí quỹ mặc định = tỷ lệ chi phí ETF VN30', fee == 0.8 and 'Quỹ ETF VN30 · 0,4% + 0,8%/năm' in HTML)
    net = erp - (0.4 / hold + fee)
    need('sigErpNet', 'id="sigErpNet">sau phí ' + pct(net))
    gap = net - attr('sErp')
    verdict = 'Rẻ hơn mức bạn đòi' if gap > 1 else 'Ngang mức bạn đòi' if gap >= -1 else 'Đắt hơn mức bạn đòi'
    need('sigErpV theo số sau phí', 'id="sigErpV">' + verdict)
    house_need = v['sMort'] - v['sRent'] + 2.5 / hold
    need('sigHouseV có phí', 'id="sigHouseV">Vay toàn bộ thì giá phải tăng ' + vi(house_need, 1) + '%/năm mới bù lãi và phí vào–ra')
    # A12 — ví dụ chạy trọn: 500 triệu, 150 triệu cần sau 12 tháng, chịu mất 40 triệu một năm xấu. Mọi số tính
    # từ ô nhập của bảng bốn phép so, nên đổi số điền sẵn mà quên ví dụ thì đỏ.
    need('vd câu 1', 'Lãi %s%% cho %s triệu' % (vi(v['sDep'], 1), vi(150 * v['sDep'] / 100, 2)))
    lo_r, hi_r = v['sDep'] - 5.09, v['sDep'] - 4.5
    need('vd câu 3: chờ', 'Chờ: lãi thực %s (%s đến %s tuỳ ô lạm phát)' % (pct(real), pct(lo_r), pct(hi_r)))
    need('vd câu 3: cổ phiếu', 'phần bù %s, sau phí %s, %s mức đòi %s%%'
         % (pct(erp), pct(net), verdict.split()[0].lower(), vi(attr('sErp'))))
    need('vd câu 3: nhà', 'giá phải tăng %s%%/năm mới hoà' % vi(house_need, 1))
    need('vd câu 3: vàng', 'đắt hơn giá thế giới %s%%, cộng %s%% chênh mua–bán'
         % (vi((v['sGold'] / v['sWorld'] - 1) * 100, 1), vi(3 / 137.2 * 100, 1)))
    need('vd câu 3: USD', 'tự do cao hơn ngân hàng %s%%, còn %s%% tới trần' % (vi(fg, 1), vi(room, 1)))
    d22 = 1 - 1007.09 / 1498.28
    cap, buy = 40 / d22, 120
    claim('vd: 120 triệu nằm dưới trần', buy <= cap)
    need('vd câu 4: trần', '40 / %s ≈ %s triệu' % (vi(round(d22, 3), 3), vi(cap)))
    need('vd câu 4: năm xấu', 'lấy đi %s triệu, phí khoảng %s triệu/năm' % (vi(buy * d22, 1), vi(buy * (0.4 / hold + fee) / 100, 1)))
    dep_total = 500 - buy
    need('vd: tiền gửi', 'tiền gửi %s triệu, lãi năm đầu khoảng %s triệu' % (vi(dep_total), vi(dep_total * v['sDep'] / 100, 1)))
    claim('vd: mỗi ngân hàng dưới hạn mức bảo hiểm 350 triệu', 150 <= 350 and dep_total - 150 <= 350 and dep_total - 150 == 230)
    for x0, w0, amt in ((2, 107, 150), (109, 164, 230), (273, 85, 120)):
        claim('vd: vạch %d triệu' % amt, f'x="{x0}" y="8" width="{w0}" height="30"' in HTML and abs(amt / 500 * 356 - w0) < 1)
    # ngưỡng P/E để kết luận đổi: sau phí lệch mức đòi quá 1 điểm (cùng ngưỡng với cột "Đọc là")
    cost_y = 0.4 / hold + fee
    pe_hi, pe_lo = 100 / (attr('sErp') - 1 + real + cost_y), 100 / (attr('sErp') + 1 + real + cost_y)
    need('vd: P/E trên', 'P/E VN-Index vượt %s' % vi(pe_hi, 1))
    need('vd: P/E dưới', 'P/E xuống dưới %s' % vi(pe_lo, 1))
    claim('vd: P/E hiện tại nằm giữa hai ngưỡng', pe_lo < v['sPe'] < pe_hi)
    need('vd: lãi thực âm khi lạm phát vượt lãi gửi', 'lạm phát kỳ vọng vượt %s%%' % vi(v['sDep'], 1))
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

    # A10 — chi phí một vòng mua–bán, quy ra %/năm. Chênh mua–bán lấy từ đúng các giá trong bài
    # (SJC 134,2–137,2; nhẫn PNJ 132,4–136,6; Vietcombank 25.540–25.950), mặc định giữ 12 tháng.
    need('giá mua–bán trong bảng nguồn', 'SJC 134,2–137,2 tr; nhẫn PNJ 132,4–136,6 tr')
    need('USD mua–bán trong bảng nguồn', 'Vietcombank 25.540–25.950 đ')
    claim('chênh vàng, USD trong mã khớp ô nhập A8', attr('gSjc') == 137.2 and attr('gRing') == 136.6 and attr('gFx') == 25950)
    one = {'stock': 0.15 * 2 + 0.1, 'usd': (25950 - 25540) / 25950 * 100, 'sjc': (137.2 - 134.2) / 137.2 * 100,
           'ring': (136.6 - 132.4) / 136.6 * 100, 'house': 2 + 0.5}

    def costs(m):
        h = m / 12
        fund = (2 if m < 12 else 1.5 if m < 24 else 0.5) + (0.1 if m < 24 else 0)
        return {'Dep': 0, 'Stock': one['stock'] / h, 'Etf': one['stock'] / h + 0.8, 'Fund': fund / h + 1.75,
                'Usd': one['usd'] / h, 'Sjc': one['sjc'] / h, 'Ring': one['ring'] / h, 'House': one['house'] / h}
    m0 = int(attr('costH'))
    claim('chi phí: mặc định giữ 12 tháng', m0 == 12)
    c0 = costs(m0)
    for k_, val in c0.items():
        need('chi phí ' + k_, 'id="cost%s">%s%%/năm' % (k_, vi(val, 1)), val)
    top = max(c0.values())
    for k_, val in c0.items():
        mm = re.search(r'id="costBar%s" style="width:(\d+)%%"' % k_, HTML)
        claim('vạch chi phí ' + k_, bool(mm) and abs(int(mm.group(1)) - val / top * 100) < 1, mm and mm.group(1))
    need('nhãn USD', 'USD ở ngân hàng · %s%% một vòng' % vi(one['usd'], 1))
    need('nhãn SJC', 'Vàng miếng SJC · %s%% một vòng' % vi(one['sjc'], 1))
    need('nhãn nhẫn', 'Vàng nhẫn PNJ · %s%% một vòng' % vi(one['ring'], 1))
    need('R-I07: số một vòng', 'vàng nhẫn PNJ %s%%, SJC %s%%, USD ở Vietcombank %s%%' % (vi(one['ring'], 1), vi(one['sjc'], 1), vi(one['usd'], 1)))
    c6, c60 = costs(6), costs(60)
    claim('giữ năm năm thì cổ phiếu tự mua rẻ nhất',
          min((v_, k_) for k_, v_ in c60.items() if k_ != 'Dep')[1] == 'Stock')
    claim('chân hình: giữ ngắn vàng đắt hơn ETF, giữ dài quỹ phí năm đắt hơn vàng', c60['Fund'] > c60['Ring'] and c6['Ring'] > c6['Etf'])

    def lose(f, n):
        return (1 - (1 - f) ** n) * 100
    need('phí 1,75% sau 10 năm', 'mất <b>%s%%</b> tài sản cuối kỳ' % vi(lose(0.0175, 10), 1))
    need('phí 0,8% sau 10 năm', 'mất %s%%. Quỹ chủ động' % vi(lose(0.008, 10), 1))
    need('R-I07: phí sau 10 năm', 'lấy đi %s%% tài sản cuối kỳ' % vi(lose(0.0175, 10), 1))
    # rút trước hạn: 100 triệu, kỳ 12 tháng, rút sau 6 tháng ở lãi không kỳ hạn 0,1%; so với kỳ 6 tháng ở trần 4,75%
    need('rút trước hạn', 'nhận %s triệu tiền lãi' % vi(100 * 0.001 * 0.5, 2))
    need('kỳ 6 tháng ở trần', 'thì nhận %s triệu' % vi(100 * 0.0475 * 0.5, 3))
    need('trần 4,75% khớp A5', '1 đến dưới 6 tháng 4,75%')
    need('thuế: chứng khoán 0,1%', 'bán chứng khoán chịu <b>0,1% giá bán</b>')
    need('thuế: nhà 2%', 'bán nhà đất chịu <b>2% giá chuyển nhượng</b>')
    need('thuế: cổ tức 5%', 'chịu <b>5%</b>, khấu trừ')

    # A11 — đa dạng hoá. Hai tài sản: σp² = wc²σc² + wv²σv² + 2·wc·wv·ρ·σc·σv; số điền sẵn 17,6 / 15 / ρ = 0 / 30% vàng
    sc, sv, wv, rho = attr('divSs'), attr('divSg'), attr('divW') / 100, attr('divR') / 100

    def sig(x, r=rho):
        return math.sqrt(max(0.0, (1 - x) ** 2 * sc * sc + x * x * sv * sv + 2 * (1 - x) * x * r * sc * sv))
    sp, avg = sig(wv), (1 - wv) * sc + wv * sv
    need('đa dạng hoá: dao động phần rủi ro', 'id="divSp">' + vi(sp, 1) + '%')
    need('đa dạng hoá: lời dưới số', 'Trung bình có trọng số của hai dao động là ' + vi(avg, 1) + '%; trộn bớt được ' + vi(avg - sp, 1) + ' điểm.')
    claim('ρ < 1 thì luôn dưới trung bình có trọng số', all(sig(k / 20, r / 10) <= (1 - k / 20) * sc + k / 20 * sv + 1e-9
                                                               for k in range(21) for r in range(-10, 11)))
    claim('ρ = 1 thì bằng đúng trung bình (đường đứt là đường thẳng)', all(abs(sig(k / 20, 1) - ((1 - k / 20) * sc + k / 20 * sv)) < 1e-9 for k in range(21)))
    need('dao động cổ phiếu có nguồn', 'Cổ phiếu 17,6%: độ biến động năm của quỹ ETF VN30 (E1VFVN30)')
    claim('ô dao động cổ phiếu = số có nguồn', sc == 17.6)
    # N mã cùng σ = 30%, tương quan bình quân 0,35
    def sig_n(n, s1=30, rb=0.35):
        return s1 * math.sqrt(1 / n + (1 - 1 / n) * rb)
    need('N mã trong bài', 'một mã %s%%, mười mã %s%%, ba mươi mã %s%%, và không bao giờ xuống dưới %s%%'
         % (vi(sig_n(1)), vi(sig_n(10), 1), vi(sig_n(30), 1), vi(30 * math.sqrt(0.35), 1)))
    need('R-I10: số', 'mười mã %s%%, sàn %s%%' % (vi(sig_n(10), 1), vi(30 * math.sqrt(0.35), 1)))
    # tỷ trọng theo mức lỗ chịu được: 300 triệu, chịu mất 30 triệu, năm xấu −32,8% (VN-Index 2022)
    d22 = 1 - 1007.09 / 1498.28
    need('năm xấu = VN-Index 2022', 'VN-Index mất ' + vi(d22 * 100, 1) + '%: cổ phiếu tối đa 30 / ' + vi(round(d22, 3), 3))
    need('tỷ trọng tối đa', '≈ %s triệu, khoảng %s%% khoản tiền; %s triệu còn lại'
         % (vi(30 / round(d22, 3)), vi(round(30 / round(d22, 3) / 300 * 100, -1)), vi(300 - round(30 / round(d22, 3)))))
    need('chịu mất 100 triệu', '(300 × 0,328 ≈ %s triệu)' % vi(300 * 0.328))
    claim('100 triệu đủ cho toàn bộ bằng cổ phiếu', 300 * 0.328 <= 100)
    need('R-I11: số', 'cổ phiếu tối đa khoảng %s triệu' % vi(30 / 0.328))
    # tái cân bằng 60/40, cổ phiếu +30%, tiền gửi +6,5%; bán chịu 0,15% môi giới + 0,1% thuế
    st, dp = 60 * 1.3, 40 * 1.065
    tot = st + dp
    sell = st - 0.6 * tot
    need('tái cân bằng: cuối năm', '%s · %s%%</text><text class="rb-dg-ts" x="311" y="65" text-anchor="middle">%s</text>'
         % (vi(st), vi(st / tot * 100, 1), vi(dp, 1)))
    need('tái cân bằng: kéo về', '%s · 60%%</text><text class="rb-dg-ts" x="305" y="107" text-anchor="middle">%s · 40%%'
         % (vi(0.6 * tot, 2), vi(0.4 * tot, 2)))
    need('tái cân bằng: phải bán', 'bán %s triệu cổ phiếu, mất khoảng %s nghìn đồng' % (vi(sell, 2), vi(sell * 0.0025 * 1000)))
    need('R-I12: số', 'cuối năm cổ phiếu chiếm %s%%' % vi(st / tot * 100, 1))
    for lbl, frac, x0, w0 in (('đầu năm', 0.6, 92, 160), ('cuối năm', st / tot, 92, 172), ('kéo về', 0.6, 92, 160)):
        claim('vạch tái cân bằng ' + lbl, abs(266 * frac - w0) < 1, f'{266 * frac:.1f} ≠ {w0}')
    # quỹ: số có nguồn
    need('E1VFVN30 phí quản lý', 'phí quản lý 0,65%/năm, tỷ lệ chi phí 12 tháng khoảng 0,8%')
    need('sai số bám SSIAM', 'lệch chỉ số 0,29% tính tới 25/12/2025')
    need('2025: VN30 và NAV', 'chỉ số VN30 tăng 51,00% trong khi giá trị tài sản ròng mỗi chứng chỉ quỹ ETF VN30 của SSIAM tăng 51,28%')

    # A12 — lạm phát kỳ vọng: không có thước đo thị trường; ba con số thay thế cho ba mức lãi thực
    dep = attr('sDep')
    proxies = [('Mục tiêu CPI 2026 của Quốc hội: 4,5%', 4.5), ('CPI bình quân 10 tháng: 4,57%', 4.57),
               ('CPI tháng 10 so cùng kỳ: 5,09%', 5.09)]
    reals = [dep - x for _, x in proxies]
    for (name, x), r_ in zip(proxies, reals):
        mm = re.search(re.escape(name) + r'</span><span class="rb-cmp__track"><span class="rb-cmp__fill[^"]*" style="width:(\d+)%"></span></span><span class="rb-cmp__val">([^<]+)</span>', HTML)
        claim('lạm phát thay thế: ' + name, bool(mm) and mm.group(2) == pct(r_) and abs(int(mm.group(1)) - r_ / max(reals) * 100) < 1,
              mm and mm.groups())
    need('khoảng xê dịch', 'lãi thực xê dịch %s điểm' % vi(max(reals) - min(reals), 1))
    claim('cả ba lãi thực đều dương như lời văn', min(reals) > 0.25)
    need('R-I13: khoảng', 'lãi thực %s đến %s' % (pct(min(reals)), pct(max(reals))))
    need('CPI tháng 10 có trong bảng nguồn', 'tháng 10 +5,09% so với cùng kỳ')
    need('TPCP 10 năm', 'trái phiếu chính phủ 10 năm cuối tháng 10/2026 là 4,43%/năm')
    claim('TPCP 10 năm thấp hơn CPI như lời văn', 4.43 < 4.57 and '10 năm 4,43%' in HTML)

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
    # điều đã sai ở bản trước: NHNN có chào bán USD kỳ hạn (8/2025, 3/2026); Nghị định 390/2026 hạ ngưỡng
    # thanh toán vàng không dùng tiền mặt từ 20 xuống 5 triệu; FTSE đưa vào rổ theo bốn đợt
    claim('can thiệp ngoại tệ: không còn câu "chưa phải bán" trống trơn',
          'từ 2025 tới 10/2026 chưa phải bán ngoại tệ can thiệp' not in HTML)
    need('chào bán USD kỳ hạn 8/2025', '26.550 đ (25/8/2025)')
    need('chào bán USD kỳ hạn 3/2026', '26.850 đ (24/3/2026)')
    need('Nghị định 390/2026', 'hạ ngưỡng này xuống 5 triệu đồng/ngày')
    need('FTSE bốn đợt', 'bốn đợt từ 9/2026 tới 9/2027')
    need('ngày số liệu', 'CẬP NHẬT 17·11·2026')
    # số đã đối chiếu lần hai (17/11/2026): lãi qua đêm 13/11 khoảng 5,6% (5,54% không có nguồn nào ghi);
    # USD tự do 25.980–26.030; lợi suất cho thuê quý III/2026 — 3,1% là số TP.HCM quý I/2025, không phải Hà Nội
    need('lãi qua đêm 13/11', 'Phiên 13/11/2026 lãi qua đêm liên ngân hàng khoảng 5,6%')
    claim('không còn số 5,54%', '5,54' not in HTML)
    claim('USD tự do: mô hình và bảng nguồn', attr('sUsdFree') == 26030 and 'khoảng 25.980–26.030 đ (mô hình dùng 26.030)' in HTML)
    claim('lợi suất cho thuê: mô hình dùng số TP.HCM quý III/2026', attr('sRent') == 3.4)
    need('lợi suất cho thuê trong bài', '<b>khoảng 3,4%/năm ở TP.HCM cũ và 2,4% ở Hà Nội (quý III/2026)</b>')
    need('lợi suất cho thuê trong gợi ý A10', 'lợi suất cho thuê 3,4% (TP.HCM cũ, quý III/2026)')
    claim('3,1% không còn gán cho Hà Nội', '3,1% ở Hà Nội' not in HTML and '3,1% (Hà Nội)' not in HTML)
    # ngân sách 2026 và thuế quan Mỹ hiện hành (A6): 605.800 tỷ là 4,2% GDP thì GDP danh nghĩa dự toán
    # khoảng 14,4 triệu tỷ; 598,3 nghìn tỷ trên cùng GDP phải ra khoảng 4,1%
    gdp = 605800 / 0.042
    claim('bội chi: 598,3 nghìn tỷ ≈ 4,1% GDP', vi(598300 / gdp * 100, 1) == '4,1', f'{598300 / gdp * 100:.2f}%')
    claim('bội chi: trung ương 583.700 + địa phương 22.100 = 605.800', 583700 + 22100 == 605800)
    need('bội chi dự toán trong bài', 'bội chi 605.800 tỷ đồng, tức 4,2% GDP')
    need('bội chi ước 2026', 'ước cả năm 598,3 nghìn tỷ, khoảng 4,1% GDP')
    need('nợ công trong khung xương', 'nợ công cuối năm dự kiến 33–34% GDP, xa trần 60%')
    need('nợ công trong chi tiết', 'nợ công cuối năm khoảng 33–34% GDP')
    need('thuế Mục 301', 'từ 24/7/2026 thuế Mục 301 12,5% cộng trên thuế MFN')
    need('điều tra sở hữu trí tuệ', 'được gia hạn tới 28/2/2027')
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
        ('đa dạng hoá: công thức', 'function sp(x) { return Math.sqrt(Math.max(0, (1 - x) * (1 - x) * sc * sc + x * x * sv * sv + 2 * (1 - x) * x * r * sc * sv)); }'),
        ('phí trong phép so', "var hold = Math.max(v('sHold'), 0.25), stockCost = 0.4 / hold + v('sFee'), houseCost = 2.5 / hold;"),
        ('cổ phiếu so sau phí', "net = erp - stockCost, gap = net - v('sErp');"),
        ('chi phí một vòng: cổ phiếu', 'stock: 0.15 * 2 + 0.1,'),
        ('chi phí: c/H + f', "return { dep: 0, stock: ONE.stock / h, etf: ONE.stock / h + 0.8, fund: fundOne(m) / h + 1.75,"),
        ('chi phí: phí bán quỹ mở', 'function fundOne(m) { return (m < 12 ? 2 : m < 24 ? 1.5 : 0.5) + (m < 24 ? 0.1 : 0); }'),
        ('đếm quy tắc', "document.querySelectorAll('[data-rule-total]'), function (el) { el.textContent = cards.length; }"),
    ]:
        need('mã: ' + label, line)
    # Đọc liền (REPO-026): một nút trên thanh trên, mở mọi khối gập trong <main>, tắt thì về trạng thái lúc tải,
    # nhớ ở 'rb-read-all'. Chi tiết nằm trong khối gập nên nút này là lối duy nhất để đọc trọn một mạch.
    need('Đọc liền: nút', 'id="readBtn" aria-pressed="false" aria-label="Đọc liền"')
    need('Đọc liền: mở mọi khối trong main', "var folds = [].slice.call(document.querySelectorAll('main details'));")
    need('Đọc liền: tắt thì về trạng thái lúc tải', 'folds.forEach(function (d, i) { d.open = on || foldDefault[i]; });')
    need('Đọc liền: nhớ lựa chọn', "localStorage.setItem('rb-read-all', on ? '1' : '0')")
    need('Đọc liền: lời dẫn', 'nút <b>Đọc liền</b> ở thanh trên mở mọi khối')
    # margin: số hiện ra và điều kiện "đã thủng" dùng cùng một số làm tròn một chữ số. Trước kia 29,6%
    # hiện "30%" ngay cạnh câu "đã thủng mức tối thiểu" (D = 100, giá giảm 29%).
    need('mã: margin hiện một chữ số', "$('mgRatio').textContent = vn(r1, 1) + '%';")
    need('mã: margin xét điều kiện trên số đã làm tròn', 'else if (r1 < 30)')
    claim('margin: không còn làm tròn số nguyên', "$('mgRatio').textContent = vn(Math.max(ratio, 0)) + '%'" not in HTML)
    r = 1 - 100 / (200 * (1 - 0.29))
    claim('margin: ví dụ 29,6% nằm dưới ngưỡng', vi(r * 100, 1) == '29,6' and round(r * 100, 1) < 30)
    # sơ đồ A6: lớp "Bên ngoài" có mũi tên vào lớp "Nhà nước"; đầu mũi tên chạm đúng mép phải thanh Nhà nước
    m = re.search(r'id="actorsExtIn" x1="(\d+)" y1="(\d+)" x2="(\d+)" y2="(\d+)" marker-end', HTML)
    bar = re.search(r'<rect class="rb-dg-boxa" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" rx="5"></rect><text class="rb-dg-t" x="160" y="101"', HTML)
    claim('A6: có mũi tên Bên ngoài → Nhà nước', bool(m and bar))
    if m and bar:
        x1, y1, x2, y2 = map(int, m.groups())
        bx, by, bw, bh = map(int, bar.groups())
        claim('A6: mũi tên chạm mép phải thanh Nhà nước', x2 == bx + bw and by < y2 < by + bh and y1 == y2,
              f'đầu ({x2},{y2}), thanh x {bx}–{bx + bw}, y {by}–{by + bh}')
    # luật vàng đã sửa: "cả hai vượt" không được kết luận là "cầu trú ẩn thật"
    claim('kết luận vàng đã sửa', "t = 'Cầu trú ẩn thật'" not in HTML and "t = 'Cầu trong nước lớn hơn lượng vàng nhập được'" in HTML)
    claim('R-D06 đã sửa', 'đó là cầu trú ẩn <b>thật</b>' not in HTML)
    # P/E = 1/(r − g): P/E co lại có thể do g kỳ vọng, không chỉ do lãi suất
    claim('P/E không bị gán trọn cho lãi suất',
          'không liên quan gì tới doanh nghiệp' not in HTML and 'tín hiệu về lãi suất, không phải về doanh nghiệp' not in HTML)
    # vàng–lãi thực và USD–hàng hoá là quan hệ thống kê (vỡ 2023–2025, 2022), không phải no-arbitrage
    for rid in ('R-D01', 'R-B07'):
        claim(f'{rid} là T3', f'id="{rid}" data-tag="T3"' in HTML)
    # khi cửa nhập mở, chênh lệch co về chi phí nhập khẩu (R-D07), không về 0
    claim('khoản mất của vàng miếng là phần vượt chi phí nhập', 'Khoản mất ngay nếu cửa nhập mở' not in HTML)

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
    nchap = len(eyebrows)
    claim('chương A1…A%d theo thứ tự' % nchap, eyebrows == ['A%d' % k for k in range(1, nchap + 1)], str(eyebrows))
    toc = re.findall(r'<a class="wb-sidenav__link" href="#(a\d+-[a-z-]+)">(A\d+) ·', HTML)
    ids = re.findall(r'<section id="(a\d+-[a-z-]+)"', HTML)
    claim('mục lục trỏ đúng thứ tự chương', [t[0] for t in toc] == ids and [t[1] for t in toc] == eyebrows,
          f'{toc} / {ids}')
    for sid in ids:
        claim(f'id {sid} mang đúng số chương', sid.split('-')[0].upper() == eyebrows[ids.index(sid)])
    words = {10: 'Mười', 11: 'Mười một', 12: 'Mười hai', 13: 'Mười ba', 14: 'Mười bốn', 15: 'Mười lăm'}
    need('số chương trong lời dẫn', words[nchap] + ' chương dưới đây')
    need('số chương ở chế độ người mới', 'Chỉ còn %d chương của Phần A' % nchap)
    # hai chương cuối là tự kiểm và từ điển; còn lại là chương nội dung
    need('số chương nội dung ở thẻ Phần A', words[nchap - 2] + ' chương nội dung kể một mạch')
    need('thẻ Phần A trỏ đúng hai chương cuối', 'rồi <b>A%d</b> để bạn tự kiểm và <b>A%d</b> là từ điển' % (nchap - 1, nchap))
    foot = re.findall(r'<a class="wb-footer__link" href="#(a\d+-[a-z-]+)">', HTML)
    claim('chân trang có mọi chương', foot == ids, f'{foot} / {ids}')


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
