#!/usr/bin/env python3
"""Cổng kiến thức cho hai trang học máy:

  · pages/machine-learning.html       (~179 con số có đơn vị)
  · pages/machine-learning-101.html   (~89 con số có đơn vị)

Vì sao cần, khác lint-pages.py: hai trang này nói rất nhiều con số *tính lại được*
— số tham số của một lớp tích chập, cỡ đầu ra sau padding/stride, precision/recall/F1
đọc ra từ một ma trận nhầm lẫn, bias tránh được và variance đọc ra từ ba mức sai số,
trần lợi ích của một nguyên nhân lỗi, chi phí nhân của khối Inception. lint-pages.py
kiểm được thẻ lệch và anchor gãy nhưng KHÔNG biết 896 có phải là 32×(3·3·3+1) hay không.

Vì sao một file cho hai trang, trong khi luật ở CLAUDE.md nói "mỗi trang một cổng":
luật ấy cấm *nới một cổng thành cổng chung* — một script đoán mò áp cho mọi trang.
File này không làm thế. Nó có hai bộ số VIẾT TAY RIÊNG, mỗi bộ đọc đúng file của nó,
và không có một phép kiểm nào dùng chung giữa hai bộ. Gộp vào một file chỉ để hai
trang anh em không phải chép lại cùng một đoạn hàm trợ giúp.

Chỉ dùng thư viện chuẩn, để chạy được trên mọi máy.

Chạy:  python3 pages/tools/verify-ml.py
Exit code: 1 nếu có con số không khớp.
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
PAGE_ML = HERE / 'machine-learning.html'
PAGE_101 = HERE / 'machine-learning-101.html'

fails = []
checks = 0
HTML = ''


def vi(x, d=2):
    """Số viết theo lối Việt: phẩy thập phân, chấm phân nhóm nghìn, và dấu TRỪ
    Unicode (U+2212) — hai trang dùng ký tự ấy, Python in dấu nối ASCII."""
    s = f'{x:,.{d}f}' if d else f'{int(round(x)):,}'
    return s.replace(',', '\x00').replace('.', ',').replace('\x00', '.').replace('-', '−')


def need(label, text, expect=None):
    """Đòi `text` phải có mặt trong trang đang xét."""
    global checks
    checks += 1
    if text not in HTML:
        fails.append(f'{label}: không thấy "{text}"' + (f' (tính được: {expect})' if expect else ''))


def num(label, value, d=0, ctx=''):
    """Tính ra `value`, đòi trang có đúng chuỗi ấy (kèm ngữ cảnh nếu cần)."""
    need(label, ctx + vi(value, d), value)


def claim(label, ok, why=''):
    """Đòi một LUẬT phải đúng, không phải một chuỗi phải có mặt. need() bắt được
    chuyện ai sửa con số; claim() bắt được chuyện chính cái luật bị viết sai."""
    global checks
    checks += 1
    if not ok:
        fails.append(f'{label}: {why or "luật trong bài không đúng"}')


def gloss_records(pattern):
    """Bóc các bản ghi từ điển ra khỏi ĐÚNG khối GLOSS của trang đang xét.

    Phải cắt khối trước khi tìm: quét cả trang thì dính cả những mảng ba phần tử
    khác (một cặp biến CSS, một cặp đặc điểm mèo trong mô hình tương tác) và đếm
    thừa 2 mục — đúng loại lỗi làm cổng báo sai rồi mất tin."""
    import re
    i = HTML.find('GLOSS = [')
    if i < 0:
        return []
    j = HTML.find('\n  ];', i)
    if j < 0:
        j = HTML.find('\n];', i)
    return re.findall(pattern, HTML[i:j + 6] if j > i else HTML[i:])


# ══════════════════════════ machine-learning.html ══════════════════════════
def run_ml():
    # ── kích thước đầu vào & số tham số ────────────────────────────────────
    px = 224 * 224 * 3
    num('ảnh 224×224×3', px)                                    # 150.528
    claim('224×224×3', px == 150528, f'tính ra {px}')

    # lớp kết nối đầy đủ 1.000 nơ-ron đặt lên chính tấm ảnh ấy
    num('FC 1.000 nơ-ron trên 224×224×3', px * 1000)             # 150.528.000

    # mạng đồ chơi 4 đầu vào → 3 ẩn → 1 ra
    w = 4 * 3 + 3 * 1
    b = 3 + 1
    claim('trọng số mạng 4-3-1', w == 15, f'4×3 + 3×1 = {w}')
    claim('độ chệch mạng 4-3-1', b == 4, f'3 + 1 = {b}')
    need('tổng tham số mạng 4-3-1', '19 tham số', w + b)

    # một lớp tích chập 32 bộ lọc 3×3 trên ảnh RGB — KỂ CẢ độ chệch
    conv = 32 * (3 * 3 * 3 + 1)
    claim('32 bộ lọc 3×3 trên RGB', conv == 896, f'32×(3·3·3+1) = {conv}')
    need('tham số lớp tích chập', '896 tham số', conv)

    # ảnh 1000×1000 RGB nối vào lớp ẩn 1.000 nơ-ron
    flat = 1000 * 1000 * 3
    claim('1000×1000 RGB', flat == 3_000_000, f'tính ra {flat}')
    claim('FC trên 1000×1000 RGB', flat * 1000 == 3_000_000_000,
          f'tính ra {flat * 1000}, bài nói 3 tỉ')
    need('3 tỉ trọng số', '3 tỉ trọng số', flat * 1000)

    # ── khối Inception: nút thắt cổ chai 1×1 ───────────────────────────────
    # 5×5 trực tiếp: 192 kênh → 32 kênh, bản đồ 28×28
    direct = 28 * 28 * 32 * (5 * 5 * 192)
    claim('Inception 5×5 trực tiếp ≈ 120 triệu', 118e6 < direct < 122e6,
          f'tính ra {direct:,} phép nhân')
    need('Inception trực tiếp', '120 triệu')
    # chèn 1×1 hạ 192 → 16 kênh, rồi mới 5×5 lên 32 kênh
    bottleneck = 28 * 28 * 16 * (1 * 1 * 192) + 28 * 28 * 32 * (5 * 5 * 16)
    claim('Inception qua nút thắt ≈ 12,4 triệu', 12.3e6 < bottleneck < 12.5e6,
          f'tính ra {bottleneck:,} phép nhân')
    need('Inception nút thắt', '12,4 triệu')
    claim('nút thắt rẻ hơn ~10 lần', 9 < direct / bottleneck < 11,
          f'tỉ lệ thật {direct / bottleneck:.2f}')

    # ── hình dạng CNN: không gian giảm nửa, kênh gấp đôi ───────────────────
    shape = [(32, 3), (16, 32), (8, 64), (4, 128)]
    for i, ((s1, c1), (s2, c2)) in enumerate(zip(shape, shape[1:])):
        claim(f'CNN {s1}×{s1}×{c1} → {s2}×{s2}×{c2} (không gian)', s2 * 2 == s1,
              'mỗi bước pool phải làm cạnh còn một nửa')
        # bước đầu là RGB 3 kênh → 32 bộ lọc, KHÔNG phải gấp đôi; từ đó trở đi mới gấp đôi
        claim(f'CNN {s1}×{s1}×{c1} → {s2}×{s2}×{c2} (kênh)',
              c2 > c1 if i == 0 else c2 == c1 * 2,
              'bước đầu chỉ cần dày lên; các bước sau phải gấp đôi số kênh')
    for s, c in shape:
        need(f'chuỗi hình dạng CNN {s}×{s}×{c}', f'{s}×{s}×{c}')

    # ── ma trận nhầm lẫn: TP 15 · FP 15 · FN 5 · TN 965 ────────────────────
    tp, fp, fn, tn = 15, 15, 5, 965
    claim('tổng ma trận nhầm lẫn = 1000', tp + fp + fn + tn == 1000,
          f'tính ra {tp + fp + fn + tn}')
    acc = (tp + tn) / 1000
    prec = tp / (tp + fp)
    rec = tp / (tp + fn)
    f1 = 2 * prec * rec / (prec + rec)
    claim('chính xác 98%', abs(acc - 0.98) < 1e-9, f'tính ra {acc:.4f}')
    claim('precision 50%', abs(prec - 0.50) < 1e-9, f'tính ra {prec:.4f}')
    claim('recall 75%', abs(rec - 0.75) < 1e-9, f'tính ra {rec:.4f}')
    claim('F1 60%', abs(f1 - 0.60) < 1e-9, f'tính ra {f1:.4f}')
    for s in ('(15+965)/1000 = <b>98%</b>', '15/30 = <b>50%</b>', '15/20 = <b>75%</b>'):
        need('ma trận nhầm lẫn', s)
    # bài nói "bỏ sót 1/4 số bệnh nhân" — đúng vì recall 75%
    claim('bỏ sót 1/4', abs((1 - rec) - 0.25) < 1e-9, f'tính ra {1 - rec:.4f}')

    # F1 trừng phạt mất cân bằng: P=100%, R=0% → trung bình cộng 50%, F1 = 0
    claim('trung bình cộng của 100% và 0% là 50%', (1.0 + 0.0) / 2 == 0.5)
    claim('F1 của P=1, R=0 bằng 0', 2 * 1.0 * 0.0 / (1.0 + 0.0 + 1e-300) < 1e-9,
          'trung bình điều hoà phải sập về 0, đó là lý do bài chọn nó')

    # ── chẩn đoán bias / variance ──────────────────────────────────────────
    human, train, dev = 7.5, 8.0, 10.0
    claim('bias tránh được 0,5%', abs((train - human) - 0.5) < 1e-9,
          f'8 − 7,5 = {train - human}')
    claim('variance 2%', abs((dev - train) - 2.0) < 1e-9, f'10 − 8 = {dev - train}')
    need('bias tránh được', 'Bias tránh được chỉ 0,5%')

    # ── phân tích lỗi: trần lợi ích ────────────────────────────────────────
    claim('chó 8% lỗi, dev 10% → trần 9,2%', abs(10 * (1 - 0.08) - 9.2) < 1e-9,
          f'tính ra {10 * (1 - 0.08)}')
    need('trần lợi ích sửa lỗi chó', '9,2')
    claim('nhãn sai 6% của 10% → 0,6%', abs(10 * 0.06 - 0.6) < 1e-9,
          f'tính ra {10 * 0.06}')
    need('nhiễu nhãn', '0,6%')

    # ── chia tập & bệnh hiếm ───────────────────────────────────────────────
    num('20% của 1.000.000', 1_000_000 * 0.20)                   # 200.000
    claim('bệnh 0,5% → luôn-nói-không đạt 99,5%', abs((1 - 0.005) - 0.995) < 1e-9)
    need('bệnh hiếm', '99,5%')

    # ── mini-batch ─────────────────────────────────────────────────────────
    num('5 triệu ví dụ, lô 1.000', 5_000_000 // 1000, ctx='')     # 5.000
    need('số bước mỗi epoch', '5.000 bước', 5000)

    # ── gradient tan biến / bùng nổ qua 50 lớp ─────────────────────────────
    claim('0,8^50 gần như bằng 0', 0.8 ** 50 < 1e-4, f'0,8^50 = {0.8 ** 50:.3e}')
    claim('1,2^50 bùng nổ', 1.2 ** 50 > 9000, f'1,2^50 = {1.2 ** 50:.3e}')

    # ── học tăng cường: hệ số chiết khấu ───────────────────────────────────
    claim('γ=0,3 sau 3 bước còn 2,7%', abs(0.3 ** 3 - 0.027) < 1e-12,
          f'0,3³ = {0.3 ** 3}')
    need('chiết khấu γ=0,3', '2,7%')
    claim('γ=0,99 gần như không giảm', 0.99 ** 3 > 0.97, f'0,99³ = {0.99 ** 3:.4f}')

    # ── từ điển EN↔VI: mỗi mục trỏ tới một mục CÓ THẬT trên trang ──────────
    # lint-pages.py kiểm href="#x" trong HTML, nhưng anchor của từ điển nằm
    # trong chuỗi JS nên nó không thấy. Đây là điểm mù, và cổng này bịt.
    import re as _re
    recs = gloss_records(r"\['([^']{2,70})','([^']{0,70})','.*?','(#[^']*)'")
    claim('từ điển ML bóc được', len(recs) > 150, f'chỉ bóc được {len(recs)} mục')
    ids = set(_re.findall(r'\bid="([^"]+)"', HTML))
    broken = sorted({a for _, _, a in recs if a not in ('', '#') and a.lstrip('#') not in ids})
    claim('anchor từ điển ML', not broken, f'trỏ vào mục không tồn tại: {broken}')
    en = [r[0] for r in recs]
    dup = sorted({t for t in en if en.count(t) > 1})
    claim('từ điển ML không trùng tên EN', not dup, f'trùng: {dup}')



# ════════════════════════ machine-learning-101.html ════════════════════════
def run_101():
    # ── softmax: bốn phần tin tưởng phải cộng đủ 100% ──────────────────────
    parts = [70, 25, 4, 1]
    claim('softmax cộng đủ 100%', sum(parts) == 100, f'tính ra {sum(parts)}%')
    need('ví dụ softmax', '70% mèo')
    for p, name in zip(parts[1:], ('thỏ', 'chó', 'hamster')):
        need(f'softmax {name}', f'{p}% {name}')

    # ── công thức cỡ đầu ra của tích chập ──────────────────────────────────
    def out(n, f, p, s):
        return (n + 2 * p - f) // s + 1
    claim('(32 + 2·1 − 3)/1 + 1 = 32', out(32, 3, 1, 1) == 32,
          f'tính ra {out(32, 3, 1, 1)}')
    need('công thức cỡ đầu ra', '(32 + 2 − 3)/1 + 1 = <b>32 ô</b>')
    # chính là lý do cặp "kính 3, padding 1" giữ nguyên cỡ
    claim('kính 3 + padding 1 giữ nguyên cỡ', all(out(n, 3, 1, 1) == n for n in (8, 28, 32, 224)),
          'padding 1 với kính 3 phải giữ nguyên cỡ ở mọi n')
    # stride 2 → mỗi chiều còn một nửa → số ô ra còn 1/4 → "nhanh gấp bốn"
    claim('stride 2 làm nhanh gấp bốn', out(32, 3, 1, 1) ** 2 / out(32, 3, 1, 2) ** 2 == 4.0,
          f'tỉ lệ ô ra thật: {out(32, 3, 1, 1) ** 2 / out(32, 3, 1, 2) ** 2}')
    need('stride 2', 'nhanh gấp bốn')

    # ── kính lúp 3×3 có đúng chín núm ──────────────────────────────────────
    claim('3×3 = chín núm', 3 * 3 == 9)
    need('kính lúp 3×3', 'chín cái núm')

    # ── mốc kiến trúc ──────────────────────────────────────────────────────
    need('LeNet-5', 'LeNet-5</span> (1998, 60 nghìn núm')
    need('AlexNet', 'AlexNet</span> (2012, 60 triệu núm')
    claim('AlexNet lớn hơn LeNet-5 khoảng 1.000 lần',
          900 < 60_000_000 / 60_000 < 1100,
          f'tỉ lệ thật {60_000_000 / 60_000:.0f} lần')

    # ── trần Bayes: máy sai 9%, người sai 8% → chỉ 1% tránh được ───────────
    claim('phần tránh được 1%', abs((9 - 8) - 1) < 1e-9)
    need('trần Bayes', 'phần tránh được chỉ có <b>1%</b>')

    # ── bảng đếm nguyên nhân lỗi ───────────────────────────────────────────
    need('ảnh mờ', 'ảnh mờ chiếm 5%')
    need('ảnh ban đêm', 'ảnh ban đêm chiếm 43%')
    # Trần lợi ích: máy sai 12% (đầu chương); sửa hết một nhóm lỗi thì lấy lại đúng phần
    # của nhóm ấy, không hơn. Nhóm lỗi được phép CHỒNG nhau (một ảnh vừa mờ vừa chụp đêm,
    # nên các phần trăm có thể cộng quá 100%), vì vậy ở đây không kiểm tổng.
    base, night, blur = 12, 0.43, 0.05
    claim('trần ban đêm: 12% × (1 − 0,43) = 6,84%', abs(base * (1 - night) - 6.84) < 1e-9,
          f'tính ra {base * (1 - night):.4f}')
    claim('trần ảnh mờ: 12% × (1 − 0,05) = 11,4%', abs(base * (1 - blur) - 11.4) < 1e-9,
          f'tính ra {base * (1 - blur):.4f}')
    need('máy sai 12% ở đầu chương', 'Máy của bạn sai 12%')
    need('trần ban đêm', 'xuống tốt nhất 6,8%')
    need('trần ảnh mờ', 'chỉ xuống được 11,4%')

    # ── rút thăm ngẫu nhiên thắng kẻ lưới ──────────────────────────────────
    claim('lưới 5×5 = 25 lần thử', 5 * 5 == 25)
    claim('lưới 5×5 chỉ cho 5 giá trị mỗi núm', 5 < 25,
          'đó là toàn bộ luận điểm: cùng 25 lần thử, rút thăm cho 25 giá trị mỗi núm')
    need('kẻ lưới', 'kẻ lưới 5×5')

    # ── từ điển: số mục phải đúng bằng con số trang tự khai ────────────────
    recs = gloss_records(r"\['([^']*)',\s*'([^']*)',\s*'[^']*'\]")
    claim('từ điển ML-101 bóc được', len(recs) > 150, f'chỉ bóc được {len(recs)} mục')
    need('trang tự khai số tên thật', f'{len(recs)}</span> tên thật')
    en = [r[1] for r in recs]
    dup = sorted({t for t in en if en.count(t) > 1})
    claim('từ điển ML-101 không trùng tên EN', not dup, f'trùng: {dup}')


    # ── k-means: điểm trừ phải là BÌNH PHƯƠNG khoảng cách ─────────────────
    # move() dời tâm về TRUNG BÌNH, mà trung bình chỉ cực tiểu hoá tổng bình
    # phương. Nếu inertia() cộng Math.sqrt(...) thì con số in ra không phải đại
    # lượng thuật toán đang giảm — và nó TĂNG thật ở 2/12 vị trí xuất phát mà
    # nút "Đổi chỗ xuất phát" sinh ra, phá đúng câu trang hứa "không bao giờ tăng".
    i = HTML.find('function inertia()')
    body = HTML[i:i + 420] if i >= 0 else ''
    claim('k-means đo bình phương', bool(body) and 'Math.sqrt' not in body
          and 'dx * dx + dy * dy' in body,
          'inertia() phải cộng dx*dx + dy*dy, không được lấy căn')
    need('nhãn điểm trừ k-means', "'tổng bình phương '")

    # ══ chương 1–5 và phụ lục ══════════════════════════════════════════════
    import math
    import re

    def lcg(seed):
        """Bộ sinh ngẫu nhiên có hạt giống của trang — rng() trong script, từng bit."""
        s = seed & 0xFFFFFFFF

        def r():
            nonlocal s
            s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
            return s / 4294967296
        return r

    def gauss(r):
        u = 0.0
        while u == 0:
            u = r()
        v = 0.0
        while v == 0:
            v = r()
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)

    # ── chương 4: tự tin mà sai bị trừ bao nhiêu ──────────────────────────
    # Bản trước viết "Tin 99,99% mà sai → điểm trừ gần như vô cực", trong khi
    # −ln(0,0001) chỉ là 9,2: log loss tăng rất chậm, mỗi chữ số 9 thêm vào độ tự tin
    # chỉ cộng ln 10 ≈ 2,3. Người đọc mang về nhịp tăng ấy, nên nó phải đúng.
    for p, shown, text in ((0.5, 0.7, 'Tin 50% mà sai → trừ 0,7 điểm'),
                           (0.01, 4.6, 'Tin 99% mà sai → trừ 4,6 điểm'),
                           (0.0001, 9.2, 'Tin 99,99% mà sai → 9,2')):
        claim(f'log loss khi đáp án đúng chỉ được {p}', abs(-math.log(p) - shown) < 0.05,
              f'tính ra {-math.log(p):.3f}, trang ghi {shown}')
        need(f'log loss {shown}', text)
    claim('4,6 là "gần gấp năm lần" mức trần 1 của thước cũ', 4.5 < -math.log(0.01) < 5,
          f'tính ra {-math.log(0.01):.2f}')
    claim('mỗi chữ số 9 thêm chừng 2,3 điểm', abs(math.log(10) - 2.3) < 0.01, f'ln 10 = {math.log(10):.4f}')
    need('mỗi chữ số 9', 'thêm chừng 2,3 điểm trừ')

    # Mô hình 3 in HIỆU hai thước, không in tỉ số: tỉ số −ln p/(1−p)² lớn nhất khi máy
    # đoán GẦN ĐÚNG (100,5 lần ở 99%) và chỉ 4,7 lần khi tự tin mà sai — nó dạy ngược
    # đúng điều mô hình tồn tại để dạy.
    ratio = lambda q: -math.log(q) / (1 - q) ** 2
    claim('tỉ số hai thước dạy ngược (lý do m3 in hiệu)', ratio(0.99) > 20 * ratio(0.01),
          f'{ratio(0.99):.1f} ở 99% so với {ratio(0.01):.1f} ở 1%')
    i = HTML.find('MÔ HÌNH 3 — HAI THƯỚC ĐO')
    j = HTML.find('MÔ HÌNH 4', i)
    m3 = HTML[i:j] if 0 <= i < j else ''
    claim('m3 in hiệu hai thước', bool(m3) and 'vi(a - b, 4)' in m3 and 'a / Math.max(b' not in m3,
          'dòng thứ ba của m3 phải là thước mới trừ thước cũ, không phải tỉ số')

    # ── chương 3, mô hình 2: hai ranh giới của bước chân ─────────────────
    # Thung lũng J(w) = (w − C)², độ nghiêng 2(w − C): mỗi bước nhân khoảng cách tới đáy
    # với (1 − 2α). Không nảy khi 1 − 2α ≥ 0, tức α ≤ 0,5; văng khi |1 − 2α| > 1, tức
    # α > 1. Chữ nói đúng hai ranh giới ấy và mời thử ba giá trị nằm ở ba vùng.
    need('m2 thung lũng', 'function J(w) { return (w - C) * (w - C); }')
    need('m2 độ nghiêng', 'function dJ(w) { return 2 * (w - C); }')
    need('m2 luật bước', 'w = w - a * dJ(w);')
    need('m2 hai ranh giới', 'ranh giới nằm ở 0,5 (dưới đó bóng không nảy) và 1 (trên đó bóng văng)')
    need('m2 ba thử nghiệm', 'Thử lần lượt <b>bước chân</b> 0,3 · 0,7 · 1,1')
    for a, kind, ok in ((0.3, 'lăn một phía', lambda f: 0 <= f < 1),
                        (0.7, 'nảy qua lại mà vẫn về đáy', lambda f: -1 < f < 0),
                        (1.1, 'văng', lambda f: f < -1)):
        claim(f'α = {vi(a, 1)}: {kind}', ok(1 - 2 * a), f'hệ số (1 − 2α) = {vi(1 - 2 * a, 1)}')

    # ── chương 2, mô hình 1: "chừng 45 cốc" và "dưới hai trăm bước" ────────
    # Dựng lại đúng ba mươi ngày của trang (cùng bộ sinh, cùng hạt giống đọc từ trang),
    # tính đường bình phương tối thiểu, rồi chạy tụt dốc y như nút "Để máy tự vặn" từ
    # mọi chỗ xuất phát trên lưới hai thanh trượt. Bản trước không có điều kiện dừng,
    # nên luôn in "máy đã vặn 240 bước" ngay dưới câu "dưới hai trăm bước".
    need('m1 dừng khi tới đáy', 'if (k >= 240 || mse(a, c - a * xm) <= bestMse * 1.001)')
    need('m1 lời hứa', 'mất dưới hai trăm bước')
    need('m1 câu trả lời', 'với đường tốt nhất, chừng 45 cốc')
    ms = re.search(r'var r = rng\((\d+)\), D = \[\], i;', HTML)
    claim('m1 bóc được hạt giống', bool(ms))
    if ms:
        r = lcg(int(ms.group(1)))
        D = []
        for k in range(30):
            x = 0.6 + (k / 29) * 17.2 + (r() - 0.5) * 0.9
            D.append((x, 2.6 * x + 8 + gauss(r) * 4.2))
        xm = sum(d[0] for d in D) / len(D)
        A = sum((x - xm) * y for x, y in D) / sum((x - xm) ** 2 for x, y in D)
        B = sum(y for x, y in D) / len(D) - A * xm

        def mse(a, b):
            return sum((a * x + b - y) ** 2 for x, y in D) / len(D)
        best = mse(A, B)
        claim('đường tốt nhất đoán chừng 45 cốc cho ngày nóng hơn 20 độ 14 độ',
              round(A * 14 + B) == 45, f'tính ra {A * 14 + B:.2f}')
        worst, worst_at = 0, None
        for ia in range(21):
            for ib in range(21):
                a, c, k = ia * 0.25, ib * 1.5 + ia * 0.25 * xm, 0
                while True:
                    for _ in range(6):
                        da = sum(2 * (a * (x - xm) + c - y) * (x - xm) for x, y in D)
                        dc = sum(2 * (a * (x - xm) + c - y) for x, y in D)
                        a -= 0.02 * da / len(D)
                        c -= 0.02 * dc / len(D)
                        k += 1
                    if k >= 240 or mse(a, c - a * xm) <= best * 1.001:
                        break
                if k > worst:
                    worst, worst_at = k, (ia * 0.25, ib * 1.5)
        claim('từ mọi chỗ xuất phát, máy tới đáy dưới hai trăm bước', worst < 200,
              f'chậm nhất {worst} bước, xuất phát ở {worst_at}')

    # ── chương 5, mô hình 4: ba thí nghiệm mà chữ hứa ─────────────────────
    # Bản trước xét "thuộc lòng" trước "chưa học đủ", nên bậc 2 — sai cả trên đề ôn —
    # bị phán "giỏi đề ôn"; đề thử zíc-zắc theo bậc; và đúng thí nghiệm "bậc 10, kéo 8→40
    # bài" vọt từ 0,126 lên 251. Dữ liệu lại xáo bằng sort với hàm so sánh ngẫu nhiên,
    # mà đặc tả để thứ tự ấy cho trình duyệt tự quyết. Ở đây dựng lại dữ liệu bằng đúng bộ
    # sinh và hạt giống của trang, giải đúng hệ trang giải, rồi đòi cả ba thí nghiệm ra
    # MỘT chiều, không lật qua lật lại.
    i = HTML.find('MÔ HÌNH 4 — HỌC THUỘC HAY HIỂU')
    j = HTML.find('HÌNH: BỐN TẦNG', i)
    m4 = HTML[i:j] if 0 <= i < j else ''
    claim('m4 không xáo bằng sort', bool(m4) and '.sort(' not in m4, 'dùng Fisher–Yates với rng có hạt giống')
    claim('m4 xáo Fisher–Yates', 'Math.floor(r() * (i + 1))' in m4)
    need('m4 quy luật thật', 'function truth(u) { return 0.55 * Math.sin(3.05 * u + 0.4) + 0.22 * u; }')
    under = m4.find("(eTr > FLOOR * 2.8 ? '→ CHƯA HỌC ĐỦ")
    over = m4.find("eTe > Math.max(eTr * 3, FLOOR * 3) ? '→ HỌC THUỘC LÒNG")
    claim('m4 xét chưa học đủ TRƯỚC thuộc lòng', 0 <= under < over,
          'máy đã sai trên chính đề ôn thì đề thử tệ là lẽ đương nhiên, không phải thuộc lòng')
    need('m4 lời gợi ý', 'Điểm trên đề thử tốt tới một chỗ rồi <b>quay đầu xấu đi</b>')
    need('m4 thí nghiệm 2', 'Kéo <b>độ vặn vẹo</b> lên 10 rồi kéo <b>số bài trong đề ôn</b> từ 8 lên 40')
    need('m4 thí nghiệm 3', 'Kéo <b>λ</b> lên là cách chữa số 2')
    ms = re.search(r'var r = rng\((\d+)\), POOL = \[\], TEST = \[\], i;', m4)
    claim('m4 bóc được hạt giống', bool(ms))
    if ms:
        r = lcg(int(ms.group(1)))

        def truth(u):
            return 0.55 * math.sin(3.05 * u + 0.4) + 0.22 * u
        POOL, TEST = [], []
        for k in range(40):
            u = -1 + 2 * (k + 0.5) / 40 + (r() - 0.5) * 0.03
            POOL.append((u, truth(u) + gauss(r) * 0.1))
        for k in range(len(POOL) - 1, 0, -1):
            jj = math.floor(r() * (k + 1))
            POOL[k], POOL[jj] = POOL[jj], POOL[k]
        for k in range(45):
            v = -1 + 2 * r()
            TEST.append((v, truth(v) + gauss(r) * 0.1))

        def solve(A, b):
            """Khử Gauss có chọn trụ — cùng thứ tự phép tính với solve() của trang."""
            n = len(b)
            M = [A[q][:] + [b[q]] for q in range(n)]
            for q in range(n):
                p = q
                for t in range(q + 1, n):
                    if abs(M[t][q]) > abs(M[p][q]):
                        p = t
                M[q], M[p] = M[p], M[q]
                if abs(M[q][q]) < 1e-12:
                    continue
                for t in range(q + 1, n):
                    f = M[t][q] / M[q][q]
                    for c in range(q, n + 1):
                        M[t][c] -= f * M[q][c]
            w = [0.0] * n
            for q in range(n - 1, -1, -1):
                s = M[q][n]
                for t in range(q + 1, n):
                    s -= M[q][t] * w[t]
                w[q] = 0 if abs(M[q][q]) < 1e-12 else s / M[q][q]
            return w

        def fit(pts, d, lam):
            n = d + 1
            A = [[0.0] * n for _ in range(n)]
            b = [0.0] * n
            for x, y in pts:
                ph = [x ** q for q in range(n)]
                for s in range(n):
                    for t in range(n):
                        A[s][t] += ph[s] * ph[t]
                    b[s] += ph[s] * y
            for s in range(n):
                A[s][s] += (0 if s == 0 else lam * len(pts)) + 1e-9
            return solve(A, b)

        def err(w, pts):
            return sum((sum(c * x ** q for q, c in enumerate(w)) - y) ** 2 for x, y in pts) / len(pts)

        def verdict(d, lam, m):
            tr = POOL[:m]
            w = fit(tr, d, lam)
            e_tr, e_te = err(w, tr), err(w, TEST)
            return ('C' if e_tr > 0.028 else 'T' if e_te > max(3 * e_tr, 0.03) else 'v'), e_tr, e_te

        runs = [verdict(d, 0, 12) for d in range(1, 13)]
        seq1 = ''.join(x[0] for x in runs)
        te = [min(x[2], 0.9) for x in runs]
        tr = [x[1] for x in runs]
        best_d = te.index(min(te))
        claim('m4 thí nghiệm 1: kéo bậc → chưa học đủ, vừa phải, rồi thuộc lòng', re.fullmatch(r'C+v+T+', seq1) is not None,
              f'dòng phán theo bậc 1…12 là {seq1}')
        claim('m4 thí nghiệm 1: đề ôn tốt dần, không dừng', all(b <= a + 1e-12 for a, b in zip(tr, tr[1:])),
              'điểm trừ đề ôn phải không tăng theo bậc')
        claim('m4 thí nghiệm 1: đề thử tốt tới một chỗ rồi quay đầu', 0 < best_d < 11 and te[-1] > te[best_d]
              and all(b <= a for a, b in zip(te[:best_d + 1], te[1:best_d + 1])),
              f'đề thử theo bậc: {" · ".join(vi(x, 4) for x in te)}')
        seq2 = ''.join(verdict(10, 0, m)[0] for m in range(8, 41))
        claim('m4 thí nghiệm 2: bậc 10, kéo 8→40 bài → thuộc lòng rồi vừa phải', re.fullmatch(r'T+v+', seq2) is not None,
              f'dòng phán theo số bài 8…40 là {seq2}')
        seq3 = ''.join(verdict(10, 0 if s <= -70 else 10 ** (s / 10), 12)[0] for s in range(-70, 11))
        claim('m4 thí nghiệm 3: kéo λ → thuộc lòng, vừa phải, rồi chưa học đủ', re.fullmatch(r'T+v+C+', seq3) is not None,
              f'dòng phán theo λ là {seq3}')


def main():
    global HTML
    for name, page, run in (('machine-learning', PAGE_ML, run_ml),
                            ('machine-learning-101', PAGE_101, run_101)):
        if not page.exists():
            print('verify-ml: không thấy %s' % page.name)
            return 1
        HTML = page.read_text(encoding='utf-8')
        before = len(fails)
        run()
        if len(fails) > before:
            fails[before:] = ['[%s] %s' % (name, f) for f in fails[before:]]
    print()
    if fails:
        print('verify-ml: %d con số KHÔNG khớp (trên %d phép kiểm):' % (len(fails), checks))
        for f in fails:
            print('    %s' % f)
        return 1
    print('verify-ml: OK — %d phép kiểm, mọi con số tính lại được trên cả hai trang ML.' % checks)
    return 0


if __name__ == '__main__':
    sys.exit(main())
