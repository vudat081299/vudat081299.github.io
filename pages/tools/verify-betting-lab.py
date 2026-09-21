#!/usr/bin/env python3
"""Cổng kiến thức cho pages/betting-strategy-lab.html.

Vì sao cần, khác lint-pages.py: trang này nói khoảng 30 con số cụ thể (xác suất trúng,
điểm hoà vốn, biên của nhà cái, số điểm đặt trung bình, tiền một chuỗi thua ngốn mất)
và cả một LUẬT — "gấp thếp không đổi được dấu của kỳ vọng". lint-pages.py kiểm được thẻ
lệch và anchor gãy nhưng không biết 23.528 có phải là 23,77% × 99.000 hay không, và càng
không biết luật kia còn đúng sau khi ai đó sửa một dòng JS.

Ba phần, ba loại sai khác nhau:

  A. CON SỐ TRONG BÀI — tính lại từ đầu rồi đòi trang có đúng chuỗi ấy. Bắt được chuyện
     sửa một con số mà quên chỗ khác.
  B. LUẬT TRONG MÃ — đòi vài dòng JS then chốt còn nguyên hình. Bắt được chuyện con số
     vẫn đúng nhưng máy tính phía sau đã hỏng: điểm đặt quyết định SAU khi biết kết quả,
     hay số ngẫu nhiên không còn hạt giống.
  C. TOÁN ĐỘC LẬP — dựng lại phân phối bằng một lối suy luận KHÁC lối trang dùng, và mô
     phỏng lại cả trò chơi bằng Python. Bắt được chuyện chính công thức trong bài sai.

Chỉ dùng thư viện chuẩn, chạy dưới 3 giây.

Chạy:  python3 pages/tools/verify-betting-lab.py
Exit code: 1 nếu có con số hoặc luật không khớp.
"""
import pathlib
import random
import re
import sys

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'betting-strategy-lab.html'

fails = []
checks = 0
HTML = ''


def vi(x, d=2):
    """Số viết theo lối Việt — trang dùng dấu trừ Unicode (U+2212), Python in dấu nối
    ASCII, nên phải đổi; lẫn hai ký tự này là cách một phép kiểm im lặng trôi qua."""
    s = f'{x:,.{d}f}' if d else f'{int(round(x)):,}'
    return s.replace(',', '\x00').replace('.', ',').replace('\x00', '.').replace('-', '−')


SUP = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079'


def sci(x, d=2):
    """Dạng 5,76 × 10¹⁸ — đúng hàm sci() của trang, tới từng ký tự chữ số mũ."""
    import math
    e = math.floor(math.log10(abs(x)))
    return vi(x / 10 ** e, d) + ' \u00d7 10' + ''.join(SUP[int(c)] if c.isdigit() else '\u207b'
                                                       for c in str(e))


def need(label, text, expect=None):
    """Đòi `text` phải có mặt trong trang."""
    global checks
    checks += 1
    if text not in HTML:
        fails.append(f'{label}: không thấy "{text}"' + (f' (tính được: {expect})' if expect else ''))


def num(label, value, d=0, ctx=''):
    need(label, ctx + vi(value, d), value)


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


# ══════════════════════════════════════════════════════════════════════════════
# Bộ số MẶC ĐỊNH của trang. Mọi con số viết trong bài đều nói về đúng bộ này —
# đổi một ô nhập trong HTML thì phải đổi cả ở đây, và đó là chủ ý.
# ══════════════════════════════════════════════════════════════════════════════
N, K, A = 100, 27, 1
GIA, AN = 23_000, 99_000        # giá một điểm, tiền ăn một điểm
AN_THAT = 80_000                # mức lô hai số ngoài đời, dùng để đối chiếu
B0, STEP, VONG = 1, 1, 100

P1 = 1 - (1 - 1 / N) ** K        # xác suất một con có mặt, bốc có trùng
NHAY = K / N                     # số nháy trung bình của một con
EV1 = P1 * AN - GIA              # lãi kỳ vọng mỗi điểm, luật ăn một lần
EV_NHAY_THAT = NHAY * AN_THAT - GIA


def tong_diem(n, pw, b0=B0, step=STEP):
    """Tổng điểm kỳ vọng phải đặt qua n vòng — đúng công thức trang dùng."""
    er, s = 0.0, 0.0
    for _ in range(n):
        s += b0 + step * er
        er = (1 - pw) * (er + 1)
    return s


S100 = tong_diem(VONG, P1)
NHAN = 2                          # hệ số của luật nhân đôi


def tong_diem_nhan(n, pw, m, b0=B0):
    """Tổng điểm kỳ vọng khi THUA thì nhân m. Đặt x = E[m^chuỗi thua hiện tại]:
    chuỗi sau bằng 0 (thắng) hoặc dài thêm 1 (thua), nên x sau = p + q·m·x."""
    x, s = 1.0, 0.0
    for _ in range(n):
        s += b0 * x
        x = pw + (1 - pw) * m * x
    return s


S100_NHAN = tong_diem_nhan(VONG, P1, NHAN)


def p_chuoi_trong(n, k, pw):
    """Xác suất gặp ít nhất một chuỗi thua dài ≥ k trong n vòng."""
    st = [0.0] * k
    st[0], hap = 1.0, 0.0
    for _ in range(n):
        ns = [0.0] * k
        for j, v in enumerate(st):
            if not v:
                continue
            ns[0] += v * pw
            if j + 1 >= k:
                hap += v * (1 - pw)
            else:
                ns[j + 1] += v * (1 - pw)
        st = ns
    return hap


# ══════════════════════════════════════════════════════════════════════════════
# A. CON SỐ TRONG BÀI
# ══════════════════════════════════════════════════════════════════════════════
def phan_A():
    num('xác suất một con trúng', P1 * 100, 2, ctx='')          # 23,77
    need('… kèm dấu phần trăm', vi(P1 * 100, 2) + '%')
    num('xác suất khi 27 quả khác nhau', K / N * 100, 2)        # 27,00
    need('… kèm dấu phần trăm', vi(K / N * 100, 2) + '%')

    # Điểm hoà vốn: giá một điểm phải dưới tiền ăn kỳ vọng thì người đặt mới có lợi.
    num('giá hoà vốn (ăn một lần)', P1 * AN, 0, ctx='')         # 23.528
    need('… kèm đơn vị', vi(P1 * AN, 0) + ' đ')
    num('lãi kỳ vọng mỗi điểm', EV1, 0)                         # 528
    need('biên của bộ số mặc định', '+' + vi(EV1 / GIA * 100, 2) + '%')   # +2,30%

    # Mức ngoài đời để đối chiếu: 23 ăn 80, tính theo luật ăn từng nháy.
    need('giá một điểm ngoài đời', vi(GIA, 0) + ' đ')
    need('tiền ăn ngoài đời', vi(AN_THAT, 0) + ' đ')
    need('biên ngoài đời', vi(EV_NHAY_THAT / GIA * 100, 2) + '%')         # −6,09%
    num('lỗ kỳ vọng mỗi điểm ngoài đời', abs(EV_NHAY_THAT), 0)            # 1.400

    # Chiến lược làm phình tiền đặt: 4,07 điểm mỗi vòng thay vì 1.
    need('điểm đặt trung bình mỗi vòng', vi(S100 / VONG, 2) + ' điểm mỗi vòng')
    need('… và cùng con số ấy nói dạng bội số', vi(S100 / VONG, 2) + ' lần')

    # Bảng so cược phẳng với gấp thếp, sau 100 vòng.
    need('tổng điểm khi cược phẳng', vi(VONG, 1))                          # 100,0
    num('lỗ kỳ vọng khi cược phẳng', EV_NHAY_THAT * VONG, 0, ctx='')       # −140.000
    need('tổng điểm khi gấp thếp', vi(S100, 1))                            # 407,3
    need('lỗ kỳ vọng khi gấp thếp', vi(EV_NHAY_THAT * S100, 0) + ' đ')     # −570.187

    # Chuỗi thua 15 vòng: khả năng gặp, tiền đã ngốn, và tiền vòng kế tiếp.
    tam_giac = 15 * 16 // 2
    need('khả năng gặp chuỗi thua 15 vòng', vi(p_chuoi_trong(VONG, 15, P1) * 100, 1) + '%')
    need('số điểm một chuỗi 15 vòng ngốn', vi(tam_giac, 0) + ' điểm')
    need('… quy ra tiền', vi(tam_giac * GIA, 0) + ' đ')
    need('tiền phải đặt ở vòng thứ 16', vi(16 * GIA, 0) + ' đ')
    need('công thức tam giác', 'k(k+1)/2')

    # ── Luật NHÂN ĐÔI ────────────────────────────────────────────────────────
    # Điểm đặt kỳ vọng nhân lên (1−p)·m mỗi vòng. Số ấy > 1 nên tổng phân kỳ — và đó
    # là toàn bộ chuyện của chiến lược này, nên nó phải nằm trong bài bằng chữ.
    need('hệ số phình mỗi vòng', vi((1 - P1) * NHAN, 4))                    # 1,5247
    need('… viết rõ thành phép nhân', vi(1 - P1, 4) + ' × ' + str(NHAN) + ' = ' + vi((1 - P1) * NHAN, 4))
    need('tổng điểm sau 100 vòng khi nhân đôi', sci(S100_NHAN) + ' điểm')   # 5,76 × 10¹⁸
    need('… và trong bảng so ba cách đặt', sci(S100_NHAN))
    need('lỗ kỳ vọng khi nhân đôi, mức ngoài đời', sci(EV_NHAY_THAT * S100_NHAN) + ' đ')
    need('điểm đặt kỳ vọng của luật cộng thì dừng lại', vi(1 + (1 - P1) / P1, 2) + ' điểm')

    # Chuỗi thua khi nhân đôi: tổng là 2^k − 1 điểm, vòng kế tiếp đúng 2^k điểm.
    need('chuỗi 10 vòng đen ngốn mất', vi((2 ** 10 - 1) * GIA, 0) + ' đ')   # 23.529.000
    need('… và vòng thứ 11 đòi thêm', vi(2 ** 10 * GIA, 0) + ' đ')          # 23.552.000
    need('khả năng gặp chuỗi 10 vòng', vi(p_chuoi_trong(VONG, 10, P1) * 100, 1) + '%')
    need('công thức cấp số nhân', '2^k − 1')

    # Cùng 50 triệu, hai luật đi được xa khác hẳn nhau — chỗ so sánh đáng giá nhất.
    von = 50_000_000
    k_cong = max(k for k in range(1, 400) if k * (k + 1) // 2 * GIA <= von)
    k_nhan = max(k for k in range(1, 40) if (2 ** k - 1) * GIA <= von)
    need('vốn 50 triệu, luật cộng chịu được', str(k_cong) + ' vòng đen')     # 65
    need('… tổng tiền', vi(k_cong * (k_cong + 1) // 2 * GIA, 0) + ' đ')      # 49.335.000
    need('vốn 50 triệu, luật nhân chịu được', str(k_nhan) + ' vòng đen')     # 11
    need('… tổng tiền', vi((2 ** k_nhan - 1) * GIA, 0) + ' đ')               # 47.081.000
    need('… vòng kế tiếp đòi thêm', vi(2 ** k_nhan * GIA, 0) + ' đ')         # 47.104.000
    need('khả năng cháy túi của luật nhân',
         vi(p_chuoi_trong(VONG, k_nhan + 1, P1) * 100, 1) + '%')             # 61,5%
    claim('luật cộng đi xa hơn luật nhân rất nhiều', k_cong > 5 * k_nhan,
          'cùng một số vốn mà cấp số cộng chịu được nhiều vòng đen hơn hẳn cấp số nhân')

    need('trang khai đúng tên cổng của nó', 'verify-betting-lab.py')


# ══════════════════════════════════════════════════════════════════════════════
# B. LUẬT TRONG MÃ
# Con số vẫn có thể đúng trong khi máy tính phía sau đã hỏng. Bốn dòng dưới đây là
# chỗ hỏng thì cả trang sai mà không ô nào báo.
# ══════════════════════════════════════════════════════════════════════════════
def phan_B():
    claim('xác suất trúng tính bằng phần bù',
          '1 - Math.pow(1 - 1 / p.N, p.K)' in HTML,
          'pOne phải là 1 − ((N−1)/N)^K, không phải K/N — hai con số này lệch nhau 3,23 điểm phần trăm')
    claim('số nháy trung bình là K/N ở cả hai kiểu bốc',
          re.search(r'function eHits\(p\) \{ return p\.K / p\.N; \}', HTML) is not None,
          'kỳ vọng số nháy cộng được, không phụ thuộc các quả có độc lập hay không')

    # Điều kiện sống còn của cả lập luận: điểm đặt quyết định TRƯỚC khi vòng quay.
    sim = HTML[HTML.find('function simulate(p)'):]
    sim = sim[:sim.find('function runSim')]
    i_stake = sim.find('totPts += pts')
    i_draw = sim.find("if (p.draw === 'rep')")
    claim('điểm đặt chốt trước khi quả ra',
          0 < i_stake < i_draw,
          'phải cộng điểm vào sổ trước khi bốc số; ngược lại thì kỳ vọng không còn tách ra được '
          'thành e × tổng điểm, và toàn bộ mục “Vì sao” sai')
    claim('thua thì tăng, thắng thì về mức mở đầu',
          'if (win) { pts = p.b0; streak = 0; }' in sim and 'nextStake(p, pts)' in sim,
          'đây chính là chiến lược mà trang nhận là đang thí nghiệm')
    claim('hai luật tăng định nghĩa ở đúng một chỗ',
          "(p.grow === 'mul') ? p.b0 * Math.pow(p.step, j) : p.b0 + p.step * j" in HTML
          and "(p.grow === 'mul') ? pts * p.step : pts + p.step" in HTML,
          'cộng là cấp số cộng, nhân là cấp số nhân; bàn chơi và mô phỏng phải dùng chung một định nghĩa')
    claim('tổng điểm của luật nhân dùng đúng hệ thức x sau = p + q·m·x',
          'x = pw + q * p.step * x' in HTML,
          'E[m^r] thoả hệ thức tuyến tính ấy — viết sai thì cả cột "nhân đôi" sai')
    claim('trang cảnh báo khi chuỗi nhân phân kỳ',
          "p.step * (1 - pw) >= 1" in HTML,
          '(1−p)·m ≥ 1 thì tổng điểm kỳ vọng không hội tụ, và con số in ra không phải tiền ai trả nổi')
    claim('mô phỏng dùng số ngẫu nhiên có hạt giống',
          'Math.random' not in sim and 'mulberry32(p.seed' in sim,
          'Math.random() thì hai lần chạy ra hai kết quả, và không con số nào trên trang tái lập được')

    # Phép tự kiểm của trang phải đối chiếu với số điểm ĐÃ đặt, không phải số điểm dự
    # tính: có vốn trần thì nhiều đường dừng sớm, và hai con số ấy khác nhau thật.
    claim('trang tự đối chiếu bằng số điểm đã thật sự đặt',
          'EXACT.e * p.a * s.totPts / s.runs' in HTML,
          'đối chiếu với kỳ vọng n vòng sẽ báo sai mỗi khi có đường cháy túi')
    claim('ngưỡng thắng thua không phụ thuộc số điểm đang đặt',
          'var thr = p.a * p.g / p.w' in HTML,
          'b·w·X > a·b·g rút gọn được b ở hai vế — còn b trong ngưỡng là đã sai')


# ══════════════════════════════════════════════════════════════════════════════
# C. TOÁN ĐỘC LẬP — dựng lại bằng lối khác, rồi so
# ══════════════════════════════════════════════════════════════════════════════
def bu_tru(n, a, k, d):
    """P(đúng d con trong a con được chọn có mặt) — ĐÚNG công thức bù trừ trang dùng."""
    from math import comb
    s = sum((-1) ** i * comb(d, i) * ((n - (a - d) - i) / n) ** k for i in range(d + 1))
    return comb(a, d) * s


def xich_markov(n, a, k):
    """Cùng phân phối ấy, dựng bằng một lối KHÁC: đi qua từng quả một, trạng thái là
    số con đã trúng. Trùng kết quả thì cả hai lối cùng đúng — đó mới là kiểm."""
    st = [0.0] * (a + 1)
    st[0] = 1.0
    for _ in range(k):
        ns = [0.0] * (a + 1)
        for d, v in enumerate(st):
            if not v:
                continue
            ns[d] += v * (n - a + d) / n        # quả rơi ra ngoài, hoặc trùng con đã trúng
            if d < a:
                ns[d + 1] += v * (a - d) / n    # quả rơi vào một con chưa trúng
        st = ns
    return st


def phan_C():
    # 1. Công thức bù trừ của trang vs xích Markov, ở bốn cỡ khác nhau.
    for a in (1, 2, 3, 5):
        mk = xich_markov(N, a, K)
        for d in range(a + 1):
            near(f'phân phối đầu con (a={a}, d={d})', bu_tru(N, a, K, d), mk[d], 1e-12,
                 'bù trừ và xích Markov phải ra cùng một phân phối')
        near(f'tổng xác suất (a={a})', sum(mk), 1.0, 1e-12)
        near(f'số con trúng trung bình (a={a})', sum(d * v for d, v in enumerate(mk)),
             a * (1 - (1 - 1 / N) ** K), 1e-12, 'bằng a lần xác suất một con trúng')

    # 2. Công thức đệ quy tính tổng điểm vs mô phỏng chính chuỗi thắng thua ấy.
    rng = random.Random(20260921)
    runs = 20000
    tot = 0
    for _ in range(runs):
        b = B0
        for _ in range(VONG):
            tot += b
            b = B0 if rng.random() < P1 else b + STEP
    near('tổng điểm kỳ vọng', tot / runs, S100, 3.0,
         'đệ quy E[r sau] = q(E[r]+1) phải khớp với mô phỏng')

    # 3. Luật trung tâm của trang: lãi kỳ vọng = lãi mỗi điểm × tổng điểm đã đặt.
    #    Mô phỏng lại cả trò chơi, ở mức ăn 80.000 để dấu là ÂM — nếu chiến lược đổi
    #    được dấu như lời đồn thì chỗ này đỏ.
    rng = random.Random(7)
    runs, lai = 20000, 0.0
    for _ in range(runs):
        b = B0
        for _ in range(VONG):
            trung = rng.random() < P1
            lai += (b * AN_THAT - b * GIA) if trung else (-b * GIA)
            b = B0 if trung else b + STEP
    tb = lai / runs
    ev_that = (P1 * AN_THAT - GIA) * S100
    near('gấp thếp không đổi dấu kỳ vọng', tb, ev_that, 60_000,
         'trung bình mô phỏng phải bám lấy e × tổng điểm; lệch nhiều nghĩa là một trong '
         'hai lối tính sai')
    claim('và dấu ấy là âm khi luật chơi bất lợi', tb < 0 and ev_that < 0,
          'ở mức 23 ăn 80 thì mọi cách chia tiền đặt đều lỗ về dài hạn')

    # 4. Luật NHÂN: hệ thức một biến x = p + q·m·x phải trùng với phép tính đi qua CẢ
    #    phân phối của chuỗi thua. Không mô phỏng được chỗ này ở m = 2: trung bình bị
    #    vài đường hiếm chi phối, chạy bao nhiêu cũng không hội tụ — chính là điều trang
    #    nói. Nên đối chiếu bằng một phép tính chính xác khác.
    def tong_diem_nhan_vector(n, pw, m, b0=B0):
        dist = [1.0]                      # dist[j] = xác suất chuỗi thua hiện dài j
        s = 0.0
        for _ in range(n):
            s += b0 * sum(v * m ** j for j, v in enumerate(dist))
            nd = [sum(dist) * pw] + [v * (1 - pw) for v in dist]
            dist = nd
        return s

    for m in (1.2, 1.5, 2.0, 3.0):
        a1 = tong_diem_nhan(VONG, P1, m)
        a2 = tong_diem_nhan_vector(VONG, P1, m)
        near(f'tổng điểm luật nhân (m={m})', a1, a2, abs(a2) * 1e-9,
             'hệ thức một biến và phép tính qua cả phân phối phải ra cùng một số')

    # Ở m = 1,2 thì (1−p)·m = 0,915 < 1, tổng hội tụ và mô phỏng mới có nghĩa — dùng
    # đúng chỗ ấy để kiểm cả hệ thức lẫn cách hiểu "nhân sau mỗi thua".
    rng = random.Random(1986)
    runs, tot = 40000, 0.0
    for _ in range(runs):
        b = float(B0)
        for _ in range(VONG):
            tot += b
            b = B0 if rng.random() < P1 else b * 1.2
    near('tổng điểm luật nhân, mô phỏng ở m=1,2', tot / runs, tong_diem_nhan(VONG, P1, 1.2), 6.0,
         'mô phỏng chỉ dùng được khi (1−p)·m < 1; ở m = 2 thì trung bình mẫu không hội tụ')
    claim('m = 2 làm tổng điểm phân kỳ', (1 - P1) * NHAN > 1,
          '(1−p)·m phải lớn hơn 1 ở bộ số mặc định — đó là lý do cột "nhân đôi" lớn đến thế')

    # 5. Chuỗi thua khi nhân đôi: tổng là 2^k − 1, vòng kế tiếp một mình lớn hơn cả tổng ấy.
    for k in (5, 10, 15):
        near(f'tổng chuỗi nhân đôi {k} vòng', sum(B0 * NHAN ** j for j in range(k)), 2 ** k - 1, 1e-9)
        claim(f'vòng kế tiếp đắt hơn cả chuỗi {k} vòng trước nó', NHAN ** k > 2 ** k - 1,
              'đây là câu trang nói bằng chữ, và nó phải đúng bằng số')

    # 6. Tiền một chuỗi thua ngốn mất là tổng cấp số cộng.
    for k in (10, 15, 20):
        near(f'tam giác {k} vòng', sum(B0 + STEP * j for j in range(k)), k * (k + 1) / 2, 1e-9)


def main():
    global HTML
    if not PAGE.exists():
        print('verify-betting-lab: không thấy %s' % PAGE.name)
        return 1
    HTML = PAGE.read_text(encoding='utf-8')
    phan_A()
    phan_B()
    phan_C()
    print()
    if fails:
        print('verify-betting-lab: %d chỗ KHÔNG khớp (trên %d phép kiểm):' % (len(fails), checks))
        for f in fails:
            print('    %s' % f)
        return 1
    print('verify-betting-lab: OK — %d phép kiểm, mọi con số và luật trong trang dựng lại được.' % checks)
    return 0


if __name__ == '__main__':
    sys.exit(main())
