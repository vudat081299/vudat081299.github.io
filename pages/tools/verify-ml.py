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
PAGES = ['pages/machine-learning.html', 'pages/machine-learning-101.html']  # run-verify.py đọc dòng này để biết cổng kiểm trang nào

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

    # F1 trừng phạt mất cân bằng — ví dụ của Ng (MLS C2 W3): mô hình luôn báo dương, 2% ca dương.
    # Cặp phải đọc ra được từ một ma trận nhầm lẫn CÓ THẬT (recall 0 thì TP = 0, precision không thể 100%).
    tp3, fp3, fn3 = 20, 980, 0                                    # 1.000 ca, 20 dương, báo dương cả 1.000
    p3, r3 = tp3 / (tp3 + fp3), tp3 / (tp3 + fn3)
    claim('luôn báo dương: precision 2%, recall 100%', abs(p3 - 0.02) < 1e-12 and r3 == 1.0, f'P={p3}, R={r3}')
    claim('trung bình cộng của 2% và 100% là 51%', abs((p3 + r3) / 2 - 0.51) < 1e-12)
    f1_3 = 2 * p3 * r3 / (p3 + r3)
    claim('F1 của P=0,02, R=1 ≈ 3,9%', abs(f1_3 - 0.0392) < 1e-4, f'tính ra {f1_3:.4f}')
    need('F1 luôn báo dương', f'chỉ là <b>{vi(f1_3 * 100, 1)}%</b>', f1_3)
    need('trung bình cộng luôn báo dương', f'Trung bình cộng là {vi((p3 + r3) / 2 * 100, 0)}%')
    claim('không còn cặp precision 100% / recall 0%', 'Precision 100% và recall 0%' not in HTML,
          'recall 0 nghĩa là TP = 0, nên precision là 0 hoặc không xác định')

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

    run_ml_models()
    run_ml_r3()


def run_ml_models():
    """Lời văn và luật của 13 mô hình trên machine-learning.html — các chỗ lượt rà
    nội dung/UI đã bắt sai. Mỗi phép kiểm đọc ĐÚNG dòng JS hoặc câu chữ then chốt."""
    import re

    def js(name, start, end):
        """Cắt khối JS của một mô hình, để phép kiểm không dính sang mô hình khác."""
        i = HTML.find(start)
        j = HTML.find(end, i + 1)
        claim(f'{name}: tìm thấy khối JS', i >= 0 and j > i, f'không thấy "{start}"')
        return HTML[i:j] if i >= 0 and j > i else ''

    def js_rng(seed):
        """Bộ sinh LCG của trang (rng), chép đúng từng phép tính 32 bit."""
        s = [seed & 0xffffffff]
        def nxt():
            s[0] = (s[0] * 1664525 + 1013904223) & 0xffffffff
            return s[0] / 4294967296
        return nxt

    def js_gauss(r):
        """gauss() của trang: Box–Muller, bỏ số 0."""
        import math
        u = v = 0
        while u == 0: u = r()
        while v == 0: v = r()
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)

    m_rng = re.search(r'function rng\(seed\) \{\s*var s = seed >>> 0;\s*return function \(\) \{ s = \(s \* 1664525 \+ 1013904223\) >>> 0; return s / 4294967296; \};', HTML)
    claim('trang: rng/gauss đúng như bản chép trong cổng', m_rng is not None and
          'return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);' in HTML,
          'đổi bộ sinh ngẫu nhiên thì sửa js_rng/js_gauss trong cổng')

    # ── nguồn: chuyện dev/test của Ng (DLS C3 W1, Train/dev/test distributions) ──
    # Bài giảng kể đội duyệt khoản vay, dev lấy từ vùng thu nhập trung bình, mất "about
    # three months". Không có ảnh mèo web/điện thoại, không có 95%, không có sáu tháng.
    for bad in ('sáu tháng', 'Mô hình đạt 95% trên dev'):
        claim(f'chuyện Ng: không còn "{bad}"', bad not in HTML, 'chi tiết không có trong bài giảng')
    need('chuyện Ng: duyệt khoản vay', 'duyệt khoản vay')
    need('chuyện Ng: ba tháng', 'khoảng ba tháng công')

    # ── phụ thuộc xa của RNN: đếm đúng khoảng cách cat → was trong câu ví dụ ──
    # Đếm từ <b>cat</b> tới <b>was</b> in đậm (câu có "was" khác ở giữa), bỏ dấu "…".
    m = re.search(r'<span lang="en">(.*?)</span>', HTML[HTML.find('id="s-rnn"'):])
    s = m.group(1).replace('<b>cat</b>', ' CAT ').replace('<b>was</b>', ' WAS ') if m else ''
    words = [w for w in re.sub(r'<[^>]+>|[,.…]', ' ', s).split()]
    dist = words.index('WAS') - words.index('CAT') if 'CAT' in words and 'WAS' in words else -1
    claim('RNN: câu ví dụ có cat … was in đậm', dist > 0, 'không bóc được câu tiếng Anh ở #s-rnn')
    need('RNN: khoảng cách cat → was', f'cách nhau {dist} bước', dist)
    need('RNN: số bước gradient chảy ngược', f'ít nhất {dist} bước thời gian', dist)
    need('LSTM: nhắc lại khoảng cách', f'Thông tin từ {dist} bước trước', dist)
    # Chỉ để trong ngoặc kép đúng phần chữ Ng nói (DLS C5 W1, Vanishing gradients with RNNs).
    need('RNN: câu trích đúng lời Ng', 'which already ate a bunch of food that was delicious')

    # ── beam search: câu tốt nhất phải chung tiền tố "Jane is" với câu tham lam ──
    m = re.search(r'tốt nhất lại là "([^"]+)"', HTML)
    best = re.sub(r'<[^>]+>', '', m.group(1)) if m else ''
    claim('tham lam: câu tốt nhất bắt đầu bằng "Jane is"', best.startswith('Jane is '),
          f'câu tốt nhất là "{best}" — lập luận "khoá sau tiền tố Jane is" sập')

    # ── tích chập: dịch ảnh → bản đồ dịch theo là ĐỒNG biến, không phải bất biến ──
    claim('CNN: không gọi tính đồng biến là "bất biến tịnh tiến"', 'bất biến tịnh tiến' not in HTML)
    need('CNN: đồng biến tịnh tiến', 'đồng biến tịnh tiến')
    need('CNN: FC 224×224 hơn 150 triệu', 'hơn 150 triệu', 224 * 224 * 3 * 1000)
    claim('CNN: không còn "cần hàng tỉ"', 'tương đương cần hàng tỉ' not in HTML,
          'bảng đếm ngay trên ghi 150.528.000, không phải hàng tỉ')

    # ── batch norm: γ nhân, β cộng ──
    claim('batch norm: β là phép cộng', 'nhân lại với hai tham số' not in HTML)

    # ── M6: số tham số mạng 4 lớp × 12 nơ-ron, và của hồi quy logistic 2 đặc trưng ──
    sizes = [2, 12, 12, 12, 12, 1]
    p46 = sum(a * b + b for a, b in zip(sizes, sizes[1:]))
    claim('M6: 4 lớp × 12 nơ-ron có hơn 500 tham số', 500 < p46 < 600, f'tính ra {p46}')
    need('M6: hơn 500 tham số', 'hơn 500 tham số', p46)
    need('M6: logistic có ba tham số', 'ba tham số của hồi quy logistic', 2 + 1)

    # ── lời văn vòng rà 2: mỗi dòng một chỗ đã sửa, đọc đúng mục của nó ──
    def sec(sid):
        i = HTML.find(f'<section id="{sid}"')
        return HTML[i:HTML.find('</section>', i)] if i >= 0 else ''
    # khởi tạo: Keras Dense mặc định glorot_uniform; PyTorch nn.Linear dùng kaiming_uniform_(a=√5) = U(±1/√n)
    for sid in ('s-init', 's-cheat'):
        s = sec(sid)
        claim(f'{sid}: không nói thư viện mặc định đã chọn đúng khởi tạo', 'mặc định đã' not in s and 'kaiming_normal_' in s
              and 'Xavier' in s, 'Keras mặc định Xavier/Glorot cho mọi activation; PyTorch Linear không phải He')
    # error analysis đếm nguyên nhân; ceiling analysis thay từng chặng pipeline bằng đáp án đúng
    gl = {r[0]: r for r in gloss_records(r"\['([^']+)','([^']*)','([^']*)','(#[^']*)','([^']*)'\]")}
    ca, ea = gl.get('ceiling analysis'), gl.get('error analysis')
    claim('GLOSS: ceiling analysis = thay từng chặng bằng đáp án đúng', ca is not None and 'từng chặng' in ca[2]
          and '0,8%' not in ca[2] and 'trần lợi ích' not in ca[4])
    claim('GLOSS: "trần lợi ích" trỏ về error analysis', ea is not None and 'trần lợi ích' in ea[4].split('|'))
    owner = {}
    for en, _, _, anc, al in gl.values():
        for form in [en] + [a for a in al.split('|') if a]:
            owner.setdefault(form.lower(), anc)
    claim('GLOSS: chữ "one-hot" (vector từ ở #s-embed) mở đúng mục', owner.get('one-hot') == '#s-embed', str(owner.get('one-hot')))
    # cây: một cây không có gradient; XGBoost thì khớp gradient và có learning rate (eta, mặc định 0,3)
    st = sec('s-trees')
    claim('cây: h2 không phủ nhận gradient/learning rate cho cả họ', 'không learning rate' not in st)
    need('cây: XGBoost có learning rate', 'learning rate</b> riêng (<code>eta</code>, mặc định 0,3)')
    # M3: khe của bản chưa chuẩn hoá chạy gần như dọc trục b (dốc db/dw ≈ −µ ≈ −90)
    claim('M3: không tả khe là "nằm ngang"', 'nằm ngang' not in sec('s-scale'))
    # M9: ba con số chẩn đoán + thanh test tuỳ chọn = bốn thanh
    n9 = len(re.findall(r'id="m9-(?:h|tr|dv|te)" min=', HTML))
    claim('M9: bốn thanh trượt', n9 == 4, f'đếm được {n9}')
    need('M9: tiêu đề nói rõ thanh thứ tư', 'nhập ba con số (và sai số test nếu có)')
    # phát hiện bất thường (MLS C3 W1): 10.000 tốt → 6.000 train, 2.000 dev, 2.000 test; 20 lỗi chia dev/test
    claim('bất thường: không "để hết" dữ liệu bình thường vào train', 'Để hết dữ liệu bình thường' not in HTML)
    need('bất thường: số của Ng', '6.000 trong 10.000 động cơ tốt')
    need('#s-nn: báo đổi bộ cột so với #s-thread', 'với bộ cột Ng dùng ở bài này')
    for bad in ('phần đặc sản', 'bản tóm tắt trung thực nhất', 'không bao giờ dùng vào việc khác',
                'tìm về vùng sáng nhất', 'nhiều khả năng đạo hàm sai dấu', 'Lựa chọn duy nhất',
                'tuần CNN có cập nhật một phần năm 2021'):
        claim(f'lời văn: không còn "{bad}"', bad not in HTML)
    for good in ('vùng nhạt nhất', 'Đạo hàm sai dấu thì J tăng chứ không phẳng', 'mô hình có giám sát duy nhất'):
        need('lời văn vòng 1', good)

    # ── M7: phép so một lớp / hai lớp không cân tham số — lời văn phải nói đúng số ──
    def smax(sid):
        mm = re.search(r'id="%s" min="(\d+)" max="(\d+)"' % sid, HTML)
        return int(mm.group(2)) if mm else -1
    h1, h2 = smax('m7-h'), smax('m7-l2')
    p1 = 2 * h1 + h1 + h1 + 1
    p2 = 2 * h1 + h1 + h1 * h2 + h2 + h2 + 1
    need('M7: số tham số một lớp so với hai lớp (hết thanh)', f'({p1} so với {p2})', (p1, p2))
    claim('M7: không còn gọi xoắn ốc là ví dụ "sâu rẻ hơn rộng"', 'ví dụ trực tiếp nhất cho lập luận' not in HTML)

    # ── M2 tab a: ngưỡng phân kỳ 2/λ_max tính từ dữ liệu, báo NGAY khi α vượt (J có thể còn giảm vài bước) ──
    m2 = js('M2', 'Mô hình 2 — learning rate', 'Mô hình 3 —')
    house = js('M2: dữ liệu HOUSE', 'var HOUSE = (function', 'function costLin')
    hs = re.search(r'rng\((\d+)\)', house)
    xs = []
    if hs:
        r = js_rng(int(hs.group(1)))
        for _ in range(34):
            a = 0.42 + 0.98 * r()
            js_gauss(r); js_gauss(r)   # beds và nhiễu giá: rút đúng thứ tự như trang để x sau không lệch
            xs.append(a)
    claim('M2: dựng lại được dữ liệu HOUSE', len(xs) == 34 and "a = 0.42 + 0.98 * r()" in house
          and house.count('gauss(r)') == 2, 'đổi cách sinh dữ liệu thì sửa cả phép kiểm này')
    if xs:
        n = len(xs); p = sum(x * x for x in xs) / n; q = sum(xs) / n
        # λ_max của Hessian [[p, q], [q, 1]] tính bằng lặp luỹ thừa, độc lập với công thức trong trang
        v = [1.0, 0.3]
        for _ in range(200):
            v = [p * v[0] + q * v[1], q * v[0] + v[1]]
            s = (v[0] ** 2 + v[1] ** 2) ** .5; v = [v[0] / s, v[1] / s]
        lmax = v[0] * (p * v[0] + q * v[1]) + v[1] * (q * v[0] + v[1])
        fm = re.search(r'return 2 / \(\(p \+ 1\) / 2 \+ Math\.sqrt\(\(p - 1\) \* \(p - 1\) / 4 \+ q \* q\)\);', m2)
        amax_js = 2 / ((p + 1) / 2 + ((p - 1) ** 2 / 4 + q * q) ** .5) if fm else -1
        claim('M2: công thức AMAX trong trang = 2/λ_max', fm is not None and abs(amax_js - 2 / lmax) < 1e-9,
              f'trang {amax_js:.4f}, λ_max thật cho {2 / lmax:.4f}')
        sa = re.search(r'id="m2-a" min="(-?[\d.]+)" max="(-?[\d.]+)"', HTML)
        claim('M2: thanh α đi qua được ngưỡng phân kỳ', sa is not None and
              10 ** float(sa.group(1)) < 2 / lmax < 10 ** float(sa.group(2)))
    tern = m2[m2.find("$('m2-out').textContent"):m2.find("$('m2-a').addEventListener")]
    claim('M2: α > AMAX là nhánh đầu tiên sau phân kỳ, trước "đã hội tụ" và "tăng α"',
          'var over = a > AMAX;' in m2 and 0 <= tern.find('(over ?') < tern.find('đã hội tụ') < tern.find('hoặc tăng α'))
    claim('M2: chỉ khuyên "tăng α" khi α dưới nửa ngưỡng',
          "a < 0.5 * AMAX ? '→ còn đang đi. Bấm chạy tiếp hoặc tăng α.'" in tern)

    # ── M2 tab b: chỉ nói "rơi vào đáy" khi GD dừng thật và đáy ổn định (α·f'' < 2) ──
    def poly(name):
        mm = re.search(r'function %s\(x\) \{ return ([^;]+); \}' % name, m2)
        if not mm:
            return None
        c = {}
        for sign, coef, xs_ in re.findall(r'([+-]?)\s*([\d.]+)((?:\s*\*\s*x)*)', mm.group(1).replace(' ', ' ')):
            k = xs_.count('x')
            c[k] = c.get(k, 0) + (-1 if sign == '-' else 1) * float(coef)
        return c
    f0, f1, f2 = poly('f'), poly('df'), poly('ddf')
    der = lambda c: {k - 1: v * k for k, v in c.items() if k > 0}
    same = lambda a, b: a is not None and b is not None and all(abs(a.get(k, 0) - b.get(k, 0)) < 1e-12 for k in set(a) | set(b))
    claim("M2: df là đạo hàm của f", f0 is not None and same(der(f0), f1), f'f={f0} df={f1}')
    claim("M2: ddf là đạo hàm của df", f1 is not None and same(der(f1), f2), f'df={f1} ddf={f2}')
    if f1 and f2:
        ev = lambda c, x: sum(v * x ** k for k, v in c.items())
        lo_, hi_ = -3.0, -1.0                               # đáy sâu: nghiệm âm của f'
        for _ in range(80):
            mid = (lo_ + hi_) / 2
            lo_, hi_ = (mid, hi_) if ev(f1, lo_) * ev(f1, mid) > 0 else (lo_, mid)
        xd = lo_
        md = re.search(r'Math\.abs\(last \+ ([\d.]+)\) < ([\d.]+)', m2)
        claim('M2: hằng số "đáy sâu" trong code khớp nghiệm của f\'', md is not None and abs(float(md.group(1)) + xd) < 0.01,
              f'nghiệm thật x = {xd:.4f}')
        sa2 = re.search(r'id="m2-a2" min="([\d.]+)" max="([\d.]+)"', HTML)
        claim('M2: thanh α tab b vượt được 2/f\'\'(đáy sâu) — nhánh "không dừng" có thật',
              sa2 is not None and float(sa2.group(2)) > 2 / ev(f2, xd), f'2/f\'\' = {2 / ev(f2, xd):.3f}')
    claim('M2: nhãn đáy chỉ khi dừng thật và ổn định',
          'var stable = conv && a * ddf(last) < 2;' in m2 and 'if (Math.abs(df(x)) < 1e-5) { conv = true; break; }' in m2
          and 0 <= m2.find(': !stable ?') < m2.find("'→ rơi vào ĐÁY SÂU"))

    # ── M3: hai bên cùng nổ thì không được nói "một bên" ──
    m3 = js('M3', 'Mô hình 3 —', 'Mô hình 4 —')
    claim('M3: nhánh cả hai cùng nổ đứng trước nhánh một bên',
          0 <= m3.find('r1.bad && r2.bad') < m3.find('r1.bad || r2.bad'))
    claim('M3: không còn hứa "zigzag"', 'đường đi zigzag' not in HTML)

    # ── M4: nhãn nút đúng số vòng, và kết quả không bị kẹp vào biên thanh trượt ──
    m4 = js('M4', 'Mô hình 4 —', 'Mô hình 5 —')
    loops = re.search(r"\$\('m4-fit'\).*?k < (\d+); k\+\+", m4, re.S)
    n4 = int(loops.group(1)) if loops else -1
    need('M4: nhãn nút = số vòng trong code', f'>{n4} vòng gradient descent trên log loss<', n4)
    for sid in ('m4-w1', 'm4-w2'):
        r = re.search(r'id="%s" min="(-?[\d.]+)" max="(-?[\d.]+)"' % sid, HTML)
        claim(f'M4: thanh {sid} đủ rộng cho nghiệm GD (|w₂| ≈ 3,7)', r is not None and float(r.group(2)) >= 4,
              'nghiệm GD bị kẹp vào biên thanh trượt')
    need('M4: nhân đôi cả w và b', 'nhân đôi cả w₁, w₂ <b>và b</b>')
    # kết quả GD được kẹp vào ĐÚNG biên của thanh trượt, không hẹp hơn (kẹp hẹp hơn = nghiệm bị cắt mà thanh vẫn rộng)
    for sid, var in (('m4-w1', 'w1'), ('m4-w2', 'w2'), ('m4-b', 'b')):
        r = re.search(r'id="%s" min="(-?[\d.]+)" max="(-?[\d.]+)"' % sid, HTML)
        k = re.search(r"\$\('%s'\)\.value = Math\.max\((-?[\d.]+), Math\.min\((-?[\d.]+), %s\)\)" % (sid, var), m4)
        claim(f'M4: kẹp {var} đúng bằng biên thanh {sid}', r is not None and k is not None
              and float(k.group(1)) == float(r.group(1)) and float(k.group(2)) == float(r.group(2)),
              f'thanh {r.groups() if r else None}, kẹp {k.groups() if k else None}')
    # M11: mọi khoá khớp như nhau (truy vấn rỗng) thì không có "lấy nhiều nhất từ …"
    m11 = js('M11', 'Mô hình 11 —', 'Mô hình 12 —')
    claim('M11: nhánh trọng số chia đều đứng trước nhánh "lấy nhiều nhất"',
          0 <= m11.find('(Math.max.apply(null, w) - Math.min.apply(null, w) < 1e-6') < m11.find("'lấy nhiều nhất từ \"'"))

    # ── M5: dựng lại ĐÚNG mô hình của trang (dữ liệu, cơ sở Chebyshev, phạt λ) rồi chạy
    #    điều kiện chẩn đoán bóc từ JS — lời văn và nhãn phải khớp con số mô hình thật sự sinh ra ──
    m5 = js('M5', 'Mô hình 5 —', 'mạng nơ-ron tối giản')
    claim('M5: sàn nhiễu tính từ TEST', 'truef(TEST[i][0]) - TEST[i][1]' in m5 and 'fmt(FLOOR' in m5
          and 'fmt(SIG2' in m5 and '0.068' not in m5, 'σ² phải tính từ SD, không ghi cứng')
    mt = re.search(r'function truef\(x\) \{ return Math\.sin\(([\d.]+) \* x\) \+ ([\d.]+) \* x; \}', m5)
    msd = re.search(r'var SD = ([\d.]+), SIG2 = SD \* SD;', m5)
    seeds = [int(s) for s in re.findall(r'= rng\((\d+)\)', m5)]
    msc = re.search(r'cheb\(p\[0\] / ([\d.]+), d\)', m5)
    mcond = re.search(r'var gap = b2 - a2, hiB = ([^,]+), hiV = ([^;]+);', m5)
    mok = re.search(r": (b2 <= 2 \* FLOOR) \? 'CÂN BẰNG TỐT", m5)
    claim('M5: bóc được mô hình', all((mt, msd, msc, mcond, mok)) and len(seeds) == 2,
          'đổi cách viết mô hình thì sửa cả phép kiểm này')
    if all((mt, msd, msc, mcond, mok)) and len(seeds) == 2:
        import math
        k1, k2, SD, SC = float(mt.group(1)), float(mt.group(2)), float(msd.group(1)), float(msc.group(1))
        tf = lambda x: math.sin(k1 * x) + k2 * x
        def gen(seed):
            r, out = js_rng(seed), []
            for _ in range(60):
                x = -3 + 6 * r(); out.append((x, tf(x) + js_gauss(r) * SD))
            return out
        ALL, TEST = gen(seeds[0]), gen(seeds[1])
        FLOOR = sum((tf(x) - y) ** 2 for x, y in TEST) / len(TEST)
        SIG2 = SD * SD
        def cheb(u, d):
            row = [1.0] + ([u] if d >= 1 else [])
            for k in range(2, d + 1):
                row.append(2 * u * row[k - 1] - row[k - 2])
            return row
        def solve(A, b):          # đúng thuật toán solve() của trang: khử Gauss, chọn trụ theo cột
            n = len(b); M = [A[i][:] + [b[i]] for i in range(n)]
            for i in range(n):
                p = max(range(i, n), key=lambda j: abs(M[j][i])); M[i], M[p] = M[p], M[i]
                if abs(M[i][i]) < 1e-12: continue
                for j in range(i + 1, n):
                    f = M[j][i] / M[i][i]
                    for k in range(i, n + 1): M[j][k] -= f * M[i][k]
            w = [0.0] * n
            for i in range(n - 1, -1, -1):
                s = M[i][n] - sum(M[i][j] * w[j] for j in range(i + 1, n))
                w[i] = 0 if abs(M[i][i]) < 1e-12 else s / M[i][i]
            return w
        def fit(pts, d, lam):
            X = [cheb(x / SC, d) for x, _ in pts]; n = d + 1
            A = [[sum(r[i] * r[j] for r in X) for j in range(n)] for i in range(n)]
            b = [sum(r[i] * y for r, (_, y) in zip(X, pts)) for i in range(n)]
            for i in range(1, n): A[i][i] += (lam + 1e-9) * len(X)
            A[0][0] += 1e-9
            return solve(A, b)
        def mse(w, pts):
            return sum((sum(c * t for c, t in zip(w, cheb(x / SC, len(w) - 1))) - y) ** 2 for x, y in pts) / len(pts)
        def diag(d, m, lam=0.0):
            w = fit(ALL[:m], d, lam); a2, b2 = mse(w, ALL[:m]), mse(w, TEST); gap = b2 - a2
            env = dict(a2=a2, b2=b2, gap=gap, SIG2=SIG2, FLOOR=FLOOR)
            js2py = lambda e: e.replace('&&', ' and ').replace('||', ' or ')
            hb, hv = eval(js2py(mcond.group(1)), {}, env), eval(js2py(mcond.group(2)), {}, env)
            lab = 'BV' if hb and hv else 'V' if hv else 'B' if hb else 'OK' if eval(mok.group(1), {}, env) else 'MID'
            return a2, b2, lab
        claim('M5: sàn nhiễu của tập kiểm thử ≈ 0,045', abs(FLOOR - 0.045) < 0.0005, f'tính ra {FLOOR:.4f}')
        # thí nghiệm (3) của lời văn: bậc 14, λ tắt, 60 điểm → quá khớp biến mất
        claim('M5: bậc 14 với 60 điểm ra CÂN BẰNG TỐT', diag(14, 60)[2] == 'OK', str(diag(14, 60)))
        claim('M5: bậc 8 với 14 điểm ra VARIANCE', diag(8, 14)[2] == 'V', str(diag(8, 14)))
        claim('M5: bậc 3 với 14 điểm (sai số gấp 4 lần sàn) ra BIAS', diag(3, 14)[2] == 'B', str(diag(3, 14)))
        # lời văn ở bậc 1: thêm điểm chỉ hạ kiểm thử chút ít, vẫn > 10 lần sàn, huấn luyện lại nhích lên
        a14, b14, _ = diag(1, 14); a60, b60, l60 = diag(1, 60)
        claim('M5: bậc 1, 60 điểm: kiểm thử vẫn gấp hơn mười lần sàn', b60 / FLOOR > 10 and b60 < b14 and a60 > a14
              and l60 in ('B', 'BV'), f'14 điểm {a14:.4f}/{b14:.4f}, 60 điểm {a60:.4f}/{b60:.4f} {l60}')
        need('M5: lời văn bậc 1', 'vẫn cao gấp hơn mười lần sàn nhiễu</b>, còn sai số huấn luyện lại nhích lên')
        # quét: mọi trạng thái bị dán "CÂN BẰNG TỐT … cùng thấp" phải thật sự thấp; khi bậc đa thức đủ bám hàm thật
        # (sai số xấp xỉ trên lưới dày < 0,01) thì không được dán BIAS, và khoảng chênh lớn hơn sàn phải là VARIANCE
        dense = [(-3 + 6 * i / 400, tf(-3 + 6 * i / 400)) for i in range(401)]
        approx = {d: mse(fit(dense, d, 0.0), dense) for d in range(1, 15)}
        wrong = [(d, m) for d in range(1, 15) for m in range(6, 61)
                 for a2, b2, lab in [diag(d, m)]
                 if (lab == 'OK' and b2 > 2 * FLOOR) or (lab in ('B', 'BV') and approx[d] < 0.01)
                 or (lab not in ('V', 'BV') and approx[d] < 0.01 and b2 - a2 > FLOOR)]
        claim('M5: quét bậc × số điểm (λ tắt): nhãn khớp sai số thật', not wrong, f'sai ở {wrong}')
        # 10 tập huấn luyện khác (nút "Vẽ chồng"): bias² và variance theo nghĩa gốc, trên lưới 61 điểm x ∈ [−3, 3]
        malt = re.search(r'var R3 = rng\((\d+) \+ s5\)', m5)
        claim('M5: bóc được 10 tập khác', malt is not None and 's5 < 10' in m5
              and "V > 3 * B2 ? '  → các đường toả rộng: variance trội' : B2 > 3 * V ?" in m5)
        if malt:
            ALT = [gen(int(malt.group(1)) + s) for s in range(10)]
            def bvar(d, m, lam=0.0):
                ws = [fit(a[:m], d, lam) for a in ALT]; B2 = V = 0.0
                for q in range(61):
                    x = -3 + 6 * q / 60
                    vals = [sum(c * t for c, t in zip(w, cheb(x / SC, d))) for w in ws]
                    mu = sum(vals) / 10
                    B2 += (mu - tf(x)) ** 2; V += sum((v - mu) ** 2 for v in vals) / 10
                return B2 / 61, V / 61
            b14, v14 = bvar(14, 14); b1, v1 = bvar(1, 14)
            claim('M5: bậc 14, λ tắt, 14 điểm: variance trội (đường toả rộng)', v14 > 3 * b14, f'bias² {b14:.3f}, variance {v14:.3f}')
            claim('M5: bậc 1, 14 điểm: bias trội (đường chụm mà lệch)', b1 > 3 * v1, f'bias² {b1:.3f}, variance {v1:.3f}')
            need('M5: lời văn 10 tập khác', 'Bậc 14, λ tắt, 14 điểm: 10 đường <b>toả rộng</b> — đó là variance. Bậc 1, cùng 14 điểm: 10 đường <b>chụm sát nhau nhưng cùng lệch</b>')

    # ── M6: mạng chết báo là chết; đếm đúng số vòng đã chạy; không hứa "huấn luyện tiếp" sẽ giúp ──
    m6 = js('M6', 'Mô hình 6 —', 'Mô hình 7 —')
    vd = m6[m6.find('function verdict()'):]
    claim('M6: kết luận "bao được vòng tròn" có điều kiện độ chính xác',
          'accuracy(net, D) >= 0.97' in vd and 'chưa khép được vòng tròn' in vd)
    claim('M6: kiểm mạng chết TRƯỚC khi kết luận về ranh giới',
          0 <= vd.find("if (dl) return '→ MẠNG CHẾT") < vd.find('accuracy(net, D) >= 0.97')
          and "if (a[i] > 0) { alive = true; break; }" in m6)
    claim('M6: in đúng tổng số vòng đã chạy', 'epochs += 600;' in m6 and "'sau ' + epochs + ' vòng" in m6
          and 'sau 600 vòng' not in m6)
    claim('M6: "Khởi tạo lại" đổi hạt giống', "seed = 1 + Math.floor(Math.random() * 9999); build();" in m6)
    claim('M6: không hứa thêm lớp / huấn luyện tiếp sẽ giúp', 'thêm lớp, hoặc huấn luyện tiếp' not in m6)

    # ── M9: "Cả hai" phải ra chẩn đoán cả hai; chỉ cấm thêm dữ liệu khi variance nhỏ ──
    m9 = js('M9', 'Mô hình 9 —', 'tab b — đường cong học')
    pre = dict(re.findall(r'(\w+): \[([\d., ]+)\]', m9[m9.find('var PRE'):]))
    h, tr, dv, te = (float(x) for x in pre.get('both', '0,0,0,0').split(','))
    ab, va = tr - h, dv - tr
    claim('M9: mẫu "Cả hai" đúng là cả hai', ab > 1 and va > 1 and min(ab, va) >= 0.5 * max(ab, va),
          f'bias {ab}, variance {va}')
    claim('M9: có nhánh CẢ BIAS VÀ VARIANCE trước nhánh BIAS',
          0 <= m9.find('Math.min(ab, va) >= 0.5 * Math.max(ab, va)') < m9.find("'CHẨN ĐOÁN: BIAS là nút thắt chính.'"))
    claim('M9: "ĐỪNG thu thập thêm dữ liệu" chỉ khi variance ≤ 1',
          "if (va <= 1) acts.push('', '✗ ĐỪNG thu thập" in m9)
    steps = {sid: float(st) for sid, st in re.findall(r'id="(m9-(?:h|tr|dv|te))" min="[\d.]+" max="[\d.]+" step="([\d.]+)"', HTML)}
    order = ['m9-h', 'm9-tr', 'm9-dv', 'm9-te']
    offgrid = [f'{k}:{v}' for k, vals in pre.items() for sid, v in zip(order, (float(x) for x in vals.split(',')))
               if sid in steps and abs(v / steps[sid] - round(v / steps[sid])) > 1e-9]
    claim('M9: mẫu chỉ dùng giá trị thanh trượt có', len(steps) == 4 and not offgrid, f'lệch bước: {offgrid}')

    # ── M13: kết luận theo mỏ LỚN HƠN thật; mỏ thưởng 0 thì không quy cho γ; điều kiện thật là γ³ > r_nhỏ/r_lớn ──
    m13 = js('M13', 'Mô hình 13 —', 'TỪ ĐIỂN THUẬT NGỮ')
    claim('M13: hướng mỏ lớn tính từ hai thanh thưởng', "bigDir = r1 > r6 ? 'TRÁI' : 'PHẢI'" in m13)
    claim('M13: nhánh "mỏ thưởng 0" đứng trước nhánh "mọi ô về mỏ lớn"',
          "var lo = Math.min(r1, r6), hi = Math.max(r1, r6)" in m13
          and 0 <= m13.find(": lo === 0 ? ") < m13.find(": nBig === 4 ? "))
    claim('M13: in đúng điều kiện γ³ so với r_nhỏ/r_lớn', 'g3 = Math.pow(r.g, 3)' in m13 and "lo + '/' + hi" in m13)
    claim('M13: không còn quy mọi ca cho "γ đủ cao"', 'γ đủ cao để chờ đợi bõ công' not in m13)
    # luật: ô sát mỏ nhỏ về mỏ lớn ⇔ γ⁴·r_lớn > γ·r_nhỏ ⇔ γ³ > r_nhỏ/r_lớn; ô sát mỏ lớn luôn về mỏ lớn
    for g, lo, hi in ((0.9, 40, 100), (0.5, 40, 100), (0.05, 5, 200)):
        cells = ['big' if g ** (5 - s) * hi > g ** s * lo else 'small' for s in range(1, 5)]
        claim(f'M13: γ={g}, {lo}/{hi}: "mọi ô về mỏ lớn" ⇔ γ³ > r_nhỏ/r_lớn',
              (cells.count('big') == 4) == (g ** 3 > lo / hi) and cells[-1] == 'big', str(cells))

    # ── M12: "Khởi tạo xấu" phải kẹt THẬT — dựng lại dữ liệu và chạy k-means từ mọi góc của hộp khởi tạo ──
    m12 = js('M12', 'Mô hình 12 —', 'Mô hình 13 —')
    claim('M12: nút khởi tạo xấu đưa K về 3', "if (+$('m12-k').value !== 3)" in m12 and '>Khởi tạo xấu (K = 3)<' in HTML)
    mp = re.search(r"rng\((\d+)\), P = \[\], c = (\[\[.*?\]\]), i, k;", m12)
    msd12 = re.search(r'gauss\(r\) \* ([\d.]+)\]', m12)
    mbad = re.search(r'if \(bad\) C = (\[\[.*?\]\]);', m12)
    claim('M12: bóc được dữ liệu và bộ tâm xấu', mp and msd12 and mbad, 'đổi cách viết thì sửa cả phép kiểm này')
    if mp and msd12 and mbad:
        import itertools, json as _json
        cen = _json.loads(mp.group(2)); sd = float(msd12.group(1)); r = js_rng(int(mp.group(1)))
        PTS = [(cx + js_gauss(r) * sd, cy + js_gauss(r) * sd) for cx, cy in cen for _ in range(34)]
        boxes = re.findall(r'\[([\d.]+) \+ ([\d.]+) \* rr\(\), ([\d.]+) \+ ([\d.]+) \* rr\(\)\]', mbad.group(1))
        def lloyd(C):
            for it in range(31):
                asg = [min(range(len(C)), key=lambda k: (p[0] - C[k][0]) ** 2 + (p[1] - C[k][1]) ** 2) for p in PTS]
                if it == 30: break
                C = [(sum(p[0] for p, a in zip(PTS, asg) if a == k) / max(1, asg.count(k)),
                      sum(p[1] for p, a in zip(PTS, asg) if a == k) / max(1, asg.count(k))) if k in asg else C[k]
                     for k in range(len(C))]
            return sum((p[0] - C[a][0]) ** 2 + (p[1] - C[a][1]) ** 2 for p, a in zip(PTS, asg)) / len(PTS)
        best = lloyd([tuple(c) for c in cen])
        corners = [[(float(x0) + float(dx) * u, float(y0) + float(dy) * v) for (x0, dx, y0, dy), (u, v) in zip(boxes, uv)]
                   for uv in itertools.product(itertools.product((0, 1), repeat=2), repeat=len(boxes))]
        worst = min(lloyd(C) for C in corners) if len(boxes) == 3 else 0
        claim('M12: mọi góc của bộ tâm xấu đều kẹt (distortion > 3 lần nghiệm tốt)',
              len(boxes) == 3 and worst > 3 * best, f'tốt nhất {best:.4f}, góc thoát {worst:.4f}')

    # ── in: giấy trắng nên bản in ở theme tối phải mang ĐÚNG bộ token sáng của :root ──
    mroot = re.search(r':root \{(.*?)\n\}', HTML, re.S)
    mpr = re.search(r'@media print \{.*?html\.dark \{(.*?)\}', HTML, re.S)
    tok = lambda s: dict(re.findall(r'(--[\w-]+):\s*([^;]+);', s))
    if mroot and mpr:
        light, prn = tok(mroot.group(1)), tok(mpr.group(1))
        colours = {k: v for k, v in light.items() if v.strip().startswith('#')}
        diff = sorted(k for k in colours if prn.get(k) != colours[k])
        claim('in: html.dark trong @media print chép đủ token màu của :root', not diff and 'color-scheme:light' in mpr.group(1),
              f'thiếu hoặc lệch: {diff}')
    else:
        claim('in: có khối html.dark trong @media print', False, 'in lúc theme tối sẽ ra chữ sáng trên giấy trắng')

    # ── nhãn viết hoa (text-transform:uppercase): ký hiệu Hy Lạp phải nằm trong .nt, không thì α → Α, λ → Λ ──
    up = [m.group(1) for m in re.finditer(r'<label for="[^"]+">(.*?)</label>|<span class="k">(.*?)</span>', HTML) if m.group(1)]
    up += [m.group(1) for m in re.finditer(r'<span class="k">(.*?)</span>', HTML)]
    bare = [u for u in up if re.search(r'[α-ωµ]', re.sub(r'<span class="nt">.*?</span>', '', u))]
    claim('nhãn viết hoa: không còn ký hiệu Hy Lạp trần', not bare and '.nt { text-transform:none; }' in HTML, f'{bare[:4]}')

    # ── chú thích sáng/đen: --ink đảo theo theme, nên chữ phải trung tính ──
    for bad in ('Sáng = thấp', 'Đen = bán nhanh', 'Chấm đen', 'đen = huấn luyện', 'càng sáng thì chi phí'):
        claim(f'theme: không còn "{bad}"', bad not in HTML, 'đúng ở một theme, ngược ở theme kia')
    m10 = js('M10', 'Mô hình 10 —', 'Mô hình 11 —')
    claim('M10: ảnh và bản đồ đặc trưng dùng thang xám cố định ("Sáng = kêu to" đúng cả hai theme)',
          'function gray(' in m10 and 'var(--ink)' not in m10[m10.find('function gray('):m10.find('$(\'m10-mat\')')])



def run_ml_r3():
    """Lượt rà vòng 3 (học thuật + sư phạm) của machine-learning.html. Mỗi phép kiểm đọc đúng
    mục của nó; luật được kiểm là luật trong nguồn gốc (bài báo, tài liệu thư viện) mà trang trích."""
    import re

    def sec(sid):
        i = HTML.find(f'<section id="{sid}"')
        return HTML[i:HTML.find('</section>', i)] if i >= 0 else ''

    # Keras: from_logits=True nghĩa là y_pred CHƯA qua softmax — lớp cuối phải là tuyến tính
    rows = [r for r in re.findall(r'<tr>(.*?)</tr>', sec('s-cheat')) if 'from_logits=True' in r]
    cells = re.findall(r'<td>(.*?)</td>', rows[0]) if rows else []
    claim('bảng tra: hàng from_logits=True có lớp ra tuyến tính (logits)',
          len(cells) >= 2 and cells[1].startswith('tuyến tính') and 'logits' in cells[1],
          f'ô lớp đầu ra: {cells[1] if len(cells) > 1 else "không thấy hàng"} — softmax rồi from_logits là softmax hai lần')

    # He et al. 2015 §4.1: mạng thường 56 lớp có BN, "neither forward nor backward signals vanish"
    claim('ResNet: không gán nghịch lý 56 lớp cho gradient tan biến', 'được chữa từ gốc' not in HTML
          and 'ResNet (cho gradient)' not in HTML and 'ResNet (gradient)' not in HTML)
    need('ResNet: khó khăn tối ưu', 'là một <b>khó khăn tối ưu</b>')
    # §4.2: mạng 1202 lớp kém mạng 110 lớp trên tập kiểm thử — "thêm lớp không thể/không bao giờ tệ đi" là sai
    for bad in ('KHÔNG THỂ làm tệ đi', 'không bao giờ làm tệ đi', '<i>không thể làm nó tệ đi</i>'):
        claim(f'ResNet: không còn "{bad}"', bad not in HTML)

    # ── câu tuyệt đối hoá đã bị nguồn bác: mỗi cặp (mục, chuỗi cấm, nguồn) ──
    for sid, bad, why in (
        ('s-nn', 'chính xác là một hồi quy logistic', 'chỉ đúng khi kích hoạt là sigmoid; lớp ẩn dùng ReLU'),
        ('s-cost', 'chỉ có đúng một đáy', 'lồi: mọi đáy cục bộ là toàn cục, không phải duy nhất'),
        ('s-trees', 'giống hệt nhau', 'cây bagging khác nhau vì mẫu bootstrap; chúng tương quan (ESL 15.2)'),
        ('s-scale', 'Tính lại µ, σ trên tập kiểm thử là', 'đó là tiền xử lý không nhất quán, không phải rò rỉ'),
        ('s-overfit', 'còn gọi là ridge hoặc weight decay', 'L2 = weight decay chỉ với SGD (Loshchilov & Hutter)'),
        ('s-rl', 'Mọi câu chuyện về AI', 'goal misgeneralization: đặc tả đúng vẫn học sai mục tiêu'),
        ('s-backprop', 'một lần chạy xuôi', 'chạy ngược tốn cỡ 2–3 lần chạy xuôi (Baydin et al. 2018)'),
        ('s-transformer', 'thêm đầu', 'Kaplan 2020: hình dạng mạng gần như không ảnh hưởng'),
        ('s-regdl', 'thường hiệu quả bằng', 'ví dụ tăng cường không quý bằng ví dụ mới độc lập'),
        ('s-optim', 'mà không cần chuẩn hoá thủ công', 'co giãn theo trục không chữa được khe chéo'),
        ('s-nn', '<b>không tồn tại</b> trong não', 'câu hỏi còn mở (Lillicrap et al. 2020)'),
        ('s-detect', 'học y như mọi tham số', 'bx, by, bh, bw là đầu ra, không phải tham số'),
        ('s-act', 'Đừng dùng.</td>', 'sigmoid vẫn làm cổng LSTM/GRU'),
        ('s-split', '<b>luôn</b> lạc quan', 'lạc quan theo kỳ vọng; dropout làm sai số huấn luyện cao hơn'),
        ('s-kmeans', 'phải giảm ở mọi bước', 'hội tụ thì distortion giữ nguyên'),
        ('s-transformer', 'Chỉ hai mảnh là mới', 'self-attention và mã hoá vị trí có trước 2017'),
        ('s-gd', 'là không xong', 'Ng: phương trình chuẩn chậm khi n > 10.000, không phải bất khả'),
        ('s-machine', 'với vài triệu tham số thì không có công thức đóng', 'không có công thức đóng vì phi tuyến'),
        ('s-nn', 'Một nơ-ron là một hồi quy logistic.', 'chỉ đúng với sigmoid'),
        ('s-nn', '<p>Nơ-ron = hồi quy logistic. ', 'chỉ đúng với sigmoid'),
        ('s-gd', 'bát chỉ có một đáy', 'lồi không có nghĩa là một đáy'),
        ('s-regdl', 'trong học sâu hay gọi là', 'L2 = weight decay chỉ với SGD'),
        ('s-cheat', '(Keras: Xavier)', 'Keras dùng Glorot bản gốc 2/(n_vào + n_ra)'),
        ('s-act', '<td><b>Chỉ ở lớp đầu ra</b>, cho phân loại nhiều lớp.</td>', 'softmax có trong attention'),
        ('s-act', 'là 0 hoặc 1 — không bão hoà,', 'ReLU bão hoà ở nửa âm'),
        ('s-bias', 'Nó đo mức độ mô hình học thuộc lòng thay vì học quy luật.', 'variance là thay đổi theo tập huấn luyện (ISLR 2.2.2)'),
        ('s-kmeans', 'Mỗi bước đều giảm distortion', 'hội tụ thì distortion giữ nguyên'),
        ('s-transformer', 'Bảy mảnh cũ, hai mảnh mới', 'hai mảnh ấy có trước 2017'),
        ('s-bias', 'con người, bộ công cụ này <b>hết tác dụng</b>', 'variance vẫn đo được khi vượt mức người'),
        ('s-act', 'nhân lên theo cấp số nhân</b>. Đó là toàn bộ', 'Montúfar 2014: "có thể", không phải luôn'),
        ('s-deep', 'cùng một hàm, ít tham số hơn', 'chỉ với một số họ hàm'),
    ):
        claim(f'{sid}: không còn "{bad}"', bad not in sec(sid), why)
    gl = {r[0]: r for r in gloss_records(r"\['([^']+)','([^']*)','([^']*)','(#[^']*)','([^']*)'\]")}
    for key, bad, good in (
        ('convex', 'ĐÚNG MỘT đáy', 'mọi đáy cục bộ'), ('random forest', 'giống hệt', 'tương quan'),
        ('L2 regularization', 'λ·Σw²', '(λ/2m)·Σw²'), ('L2 regularization', 'trong học sâu gọi là', 'AdamW'),
        ('Xavier initialization', 'Phương sai 1/n. ', '2/(n_vào + n_ra)'), ('LSTM', 'Ra đời 1997', '2000'),
        ('backpropagation', 'một lần chạy xuôi', 'hai, ba lần'), ('scaling laws', 'thêm lớp', 'thêm tham số'),
        ('ResNet', 'KHÔNG THỂ', 'khó khăn tối ưu'), ('bounding box', 'tham số', 'đầu ra'),
        ('ReLU', 'không bão hoà,', 'nửa dương'), ('variance', 'Khoảng cách giữa', 'tập huấn luyện khác'),
        ('training set', 'LUÔN', 'THƯỜNG'), ('distortion', 'Phải giảm', 'không bao giờ được tăng'.capitalize()),
        ('universal approximation', 'đã xấp xỉ', 'không phải đa thức'), ('1x1 convolution', 'GIẢM số kênh, rẻ', 'Inception'),
        ('neural network', 'hồi quy logistic', 'hàm kích hoạt'), ('sigmoid', 'Chỉ nên dùng', 'cổng'),
        ('Bellman equation', 'Q(s,a) = R(s) + γ·max Q(s′,a′). ', 'tất định'),
    ):
        g = gl.get(key)
        claim(f'GLOSS {key}: bỏ "{bad}", có "{good}"', g is not None and bad not in g[2] and good in g[2],
              (g[2][:90] if g else 'không thấy mục'))
    need('LSTM: cổng quên thêm năm 2000', 'cổng quên được thêm vào năm 2000')
    need('Xavier: công thức gốc của Glorot', '<code>2 / (n[l−1] + n[l])</code>')
    need('Keras mặc định glorot_uniform', '<code>glorot_uniform</code>')
    need('Bellman: nói rõ dạng tất định', 'Dạng này giả định môi trường tất định')
    need('xấp xỉ phổ quát: hai điều kiện', 'với hàm kích hoạt không phải đa thức (ReLU, sigmoid, tanh đều được), xấp xỉ được mọi hàm liên tục trên một vùng đầu vào bị chặn')
    need('XGBoost: đạo hàm bậc hai', 'tức đạo hàm bậc hai')
    need('bất thường: mật độ, không phải xác suất', 'tính <b>mật độ xác suất</b> của nó')
    need('PCA: phân biệt điểm, không phải lớp', 'không phải phân biệt các lớp')

    # ── nền cần có (vòng 3, sư phạm): link sang trang Toán phải trỏ vào mục CÓ THẬT ──
    # lint-pages.py chỉ kiểm anchor trong cùng trang; link sang trang khác là điểm mù của nó.
    import math, pathlib
    mpage = pathlib.Path(__file__).resolve().parent.parent / 'mathematics-for-machine-learning.html'
    mids = set(re.findall(r'\bid="([^"]+)"', mpage.read_text(encoding='utf-8'))) if mpage.exists() else set()
    links = re.findall(r'href="mathematics-for-machine-learning\.html#([^"]+)"', HTML)
    gone = sorted({a for a in links if a not in mids})
    claim('link sang trang Toán: đủ mục nền và trỏ đúng', len(set(links)) >= 12 and not gone, f'{len(set(links))} mục, gãy: {gone}')
    need('hộp Kiến thức nền', '<p class="box__k">Kiến thức nền — có sẵn ở trang khác, không dạy lại ở đây</p>')
    claim('hộp Kiến thức nền nằm ở #s-thread', 'Kiến thức nền — có sẵn' in sec('s-thread'))
    need('đạo hàm riêng: giữ nguyên tham số khác', 'nhích w lên một tí, <b>giữ nguyên mọi tham số khác</b>, thì J đổi bao nhiêu')
    for key in ('gradient', 'partial derivative'):
        claim(f'GLOSS có mục "{key}"', key in gl, 'thuật ngữ nền phải có popup')
    claim('GLOSS learning rate: tên Việt "tốc độ học" (thống nhất với trang Toán)',
          gl.get('learning rate') is not None and gl['learning rate'][1] == 'tốc độ học')
    for sym in ('<span class="g">n<sup>[l]</sup></span>', '<span class="g">x<sup>&lt;t&gt;</sup></span>', '<span class="g">θ</span>'):
        need('bảng ký hiệu', sym)
    need('ký hiệu dùng lại', '<b>Vài chữ bị dùng lại với nghĩa khác.</b>')
    claim('#s-act: chỉ số lớp viết [l], không phải luỹ thừa', 'W²W¹' not in HTML and 'a¹ = W¹x' not in HTML)

    # hồi quy tuyến tính: ∂J/∂w = (1/m)Σ(f−y)x — đúng thứ gradLin của trang tính
    need('#s-gd: đạo hàm của J', '∂<i>J</i>/∂<i>w</i> = <sup>1</sup>⁄<sub>m</sub> Σ (f(x<sup>(i)</sup>) − y<sup>(i)</sup>)·x<sup>(i)</sup>')
    claim('gradLin = (1/m)Σ(f−y)x, (1/m)Σ(f−y)', 'gw += e * HOUSE.x[i]; gb += e; }' in HTML and 'return [gw / HOUSE.n, gb / HOUSE.n];' in HTML)
    m1 = HTML[HTML.find('Mô hình 1 —'):HTML.find('Mô hình 2 —')]
    # màn hình: trục b lộn ngược (sy giảm khi b tăng), nên nhân với hiệu sy(1) − sy(0) chứ không đổi dấu tay
    claim('M1: mũi tên là −gradient đổi sang toạ độ màn hình',
          'var px = -g[0] * (s.sx(1) - s.sx(0)), py = -g[1] * (s.sy(1) - s.sy(0));' in m1 and 'var g = gradLin(w, b)' in m1)
    claim('M1: in hai đạo hàm riêng', "'∂J/∂w = ' + fmt(g[0], 3) + ',  ∂J/∂b = ' + fmt(g[1], 3)" in m1)

    # quy tắc chuỗi nhiều đường: L = a·b với b = a → dL/da = b + a (cộng hai đường), không phải b
    a0 = 1.7; h = 1e-6
    fd = ((a0 + h) * (a0 + h) - (a0 - h) * (a0 - h)) / (2 * h)
    claim('quy tắc chuỗi: hai đường thì cộng', abs(fd - (a0 + a0)) < 1e-6)
    need('#s-backprop: luật cộng', '∂c/∂a = (∂c/∂b₁)(∂b₁/∂a) + (∂c/∂b₂)(∂b₂/∂a)')
    claim('GLOSS chain rule: có luật cộng', gl.get('chain rule') is not None and 'cộng tích của từng đường' in gl['chain rule'][2])

    # M4: đạo hàm theo z ở p = 0,01, y = 1 — bình phương 2(p−y)p(1−p), log loss p − y
    p, y = 0.01, 1
    sq, ll = 2 * (p - y) * p * (1 - p), p - y
    claim('M4: bình phương theo z ≈ −0,02', abs(sq + 0.0196) < 1e-4, f'{sq}')
    claim('M4: log loss gấp khoảng 50 lần', 49 < ll / sq < 52, f'{ll / sq:.1f}')
    need('M4: số theo z', 'bình phương chỉ cho ≈ −0,02, còn log loss cho −0,99, gấp khoảng 50 lần')
    # log loss: dL/df = (f − y)/(f(1 − f)); sigmoid' = f(1 − f) → triệt tiêu còn f − y
    f_, y_ = 0.37, 1
    dLdf = -y_ / f_ + (1 - y_) / (1 - f_)
    claim('log loss: dL/df · f(1−f) = f − y', abs(dLdf * f_ * (1 - f_) - (f_ - y_)) < 1e-12)
    need('#s-logistic: lý do triệt tiêu', 'với log loss, đạo hàm theo f có mẫu số f(1 − f); đạo hàm của sigmoid lại đúng bằng f(1 − f)')
    need('M8: bước nhân viết ra', '∂L/∂a · a(1−a) = −y(1−a) + (1−y)a = a − y')
    claim('M8: −y(1−a) + (1−y)a = a − y', all(abs(-yy * (1 - a) + (1 - yy) * a - (a - yy)) < 1e-12 for a in (0.1, 0.6) for yy in (0, 1)))
    # weight decay: đạo hàm của (λ/2m)w² là (λ/m)w → w := w(1 − αλ/m) − α·(phần cũ)
    lam, m_, al, w0, g0 = 0.7, 50, 0.1, 2.0, 0.3
    claim('weight decay: hai cách viết cập nhật bằng nhau',
          abs((w0 - al * (g0 + lam / m_ * w0)) - (w0 * (1 - al * lam / m_) - al * g0)) < 1e-12)
    need('#s-overfit: cập nhật có phạt', '<span class="mono">w := w·(1 − αλ/m) − α·(đạo hàm của phần cũ)</span>')
    # khởi tạo: Var(Σ wᵢxᵢ) = n·Var(w)·Var(x) khi độc lập, trung bình 0
    need('#s-init: lý do 1/n', '<span class="mono">Var(z) = n·Var(w)·Var(x)</span>')
    # trung bình trượt: khoảng 1/(1−β) giá trị
    claim('EWA: 1/(1−β)', round(1 / (1 - 0.9)) == 10 and round(1 / (1 - 0.98)) == 50)
    need('#s-optim: 1/(1−β)', 'khoảng 1/(1−β) giá trị gần nhất: β = 0,9 cho 10 giá trị, β = 0,98 cho 50')
    need('#s-optim: ba dòng cập nhật', 'w := w − α·dw / (√s + ε)')
    # tích chập bằng số: bộ lọc cạnh dọc [1 0 −1] ×3 hàng
    K = [[1, 0, -1]] * 3
    conv = lambda patch: sum(K[i][j] * patch[i][j] for i in range(3) for j in range(3))
    claim('tích chập: 9 9 0 → 27, 9 9 9 → 0', conv([[9, 9, 0]] * 3) == 27 and conv([[9, 9, 9]] * 3) == 0)
    need('tích chập bằng số', '3 × 9 + 0 − 3 × 0 = <b>27</b>')
    need('896: cách tính', '32 × 28 = 896')
    claim('896 = 32 × (3·3·3 + 1)', 32 * 28 == 896 and 3 * 3 * 3 + 1 == 28)
    need('Inception: cách tính 120 triệu', '(28 × 28 × 32 ô đầu ra, mỗi ô 5 × 5 × 192 phép nhân)')
    need('Inception: cách tính 12,4 triệu', '(28 × 28 × 16 × 192 cho bước 1×1, cộng 28 × 28 × 32 × 5 × 5 × 16 cho bước 5×5)')
    # MobileNet: chi phí tách / thường = 1/n_ra + 1/f²; f = 3, n_ra từ 128 tới 1024 → rẻ hơn 8–9 lần
    claim('MobileNet: 3×3 rẻ hơn 8–9 lần', all(8 <= 1 / (1 / n + 1 / 9) < 9 for n in (128, 256, 512, 1024)))
    need('MobileNet: tỉ lệ', 'Chi phí còn 1/n<sub>ra</sub> + 1/f² lần conv thường')
    need('MobileNet: 8–9 lần', 'khoảng <b>8–9 lần</b>')
    # entropy = log loss trung bình (log₂) khi đoán p cho mọi mẫu của nút
    pp = 0.3
    H = -(pp * math.log2(pp) + (1 - pp) * math.log2(1 - pp))
    claim('entropy = log loss trung bình', abs(H - (pp * -math.log2(pp) + (1 - pp) * -math.log2(1 - pp))) < 1e-12)
    need('#s-trees: entropy là log loss', 'nó chính là log loss trung bình (tính bằng log₂)')
    # √d: tổng d tích độc lập phương sai 1 → độ lệch chuẩn √d
    claim('√512 ≈ 23', round(math.sqrt(512)) == 23)
    need('attention: lý do √d', 'tổng có phương sai 512, độ lệch chuẩn √512 ≈ 23')
    need('LSTM: phương trình ô nhớ', 'đạo hàm của c&lt;t&gt; theo c&lt;t−1&gt; dọc đường ấy chính là Γ<sub>f</sub>')
    st_ = sec('s-metric')
    claim('#s-metric: viết tắt TP/FP đứng trước bảng', 0 <= st_.find('Viết tắt: <b>TP</b>') < st_.find('<code>TP / (TP + FP)</code>'))
    claim('quy ước dịch: overfitting không ở nhóm giữ tiếng Anh', 'overfitting, bias/variance' not in HTML)
    # softmax hai lớp = sigmoid của hiệu; b tối ưu của hằng số = trung bình
    z1, z2 = 0.8, -0.4
    claim('softmax k = 2 là σ(z₁ − z₂)', abs(math.exp(z1) / (math.exp(z1) + math.exp(z2)) - 1 / (1 + math.exp(-(z1 - z2)))) < 1e-12)
    need('#s-softmax: bước rút gọn', 'a₁ = 1/(1 + e<sup>−(z₁−z₂)</sup>) = σ(z₁ − z₂)')
    ys_ = [1.0, 2.5, 4.0]
    claim('hằng số tốt nhất cho bình phương là trung bình', abs(sum(2 * (sum(ys_) / 3 - v) for v in ys_)) < 1e-12)
    need('#s-overfit: b = trung bình', 'là 2Σ(b − y<sup>(i)</sup>), bằng 0 khi b đúng bằng trung bình của y')
    for label, s in (
        ('vector hoá: kích thước W', 'n<sup>[l]</sup> hàng (mỗi nơ-ron một hàng) × n<sup>[l−1]</sup> cột'),
        ('vector hoá: luật kiểm chiều', 'số cột của W<sup>[l]</sup> phải bằng số hàng của A<sup>[l−1]</sup>'),
        ('LSTM: hộp công thức', 'Γ<sub>f</sub></span><span class="op">⊙</span>'),
        ('variance: nghĩa gốc ở thẻ quá khớp', 'lấy một tập huấn luyện khác cùng nguồn thì đường khớp được sẽ khác hẳn'),
        ('bias: nghĩa gốc ở thẻ thiếu khớp', 'đổi sang tập huấn luyện khác thì đường vẫn lệch khỏi quy luật thật'),
        ('cross-validation set ≠ k-fold', 'tên riêng của khoá, không phải k-fold'),
        ('attention: chuyển vị', 'lật hàng thành cột, nên QK<sup>T</sup> là bảng mọi tích vô hướng'),
        ('attention: d_k', 'Chia cho √d<sub>k</sub> giữ'),
        ('#s-backprop: link quy tắc chuỗi', '#s-chain">trang Toán 2.6</a>'),
        ('batch norm: β, γ khác nghĩa', '(không phải β của momentum hay γ chiết khấu)'),
        ('M1: chú thích mũi tên', 'Mũi tên là <b>−gradient</b> tại chấm: luôn chỉ về vùng nhạt hơn, và ngắn lại khi gần đáy.'),
        ('siêu phẳng', '(siêu phẳng — "đường thẳng" của không gian nhiều chiều)'),
        ('chuẩn của gradient', 'chuẩn của gradient (độ dài của vector gradient)'),
        ('debiasing: phép chiếu', '#s-dot">trang Toán 1.5</a>'),
        ('chỉ số thứ tư', 'chặng 4 thêm loại thứ tư, ngoặc nhọn &lt;t&gt;'),
        ('#s-init: n[l−1]', 'phụ thuộc số đầu vào của lớp, n<sup>[l−1]</sup>'),
    ):
        need(label, s)
    claim('GLOSS MobileNet: hai bước và chi phí', gl.get('depthwise separable convolution') is not None
          and '1/n_ra + 1/f²' in gl['depthwise separable convolution'][2])
    # câu quá dày (vòng 3): ba danh sách đánh số trong một câu đã tách thành <ol>
    for bad in ('(1) để λ tắt', '<b>(1) chia sẻ tham số</b>', 'Hai mẹo của Ng: <b>(1)</b>'):
        claim(f'câu dày: không còn "{bad}"', bad not in HTML)
    claim('CSS: có kiểu cho danh sách trong khung mô hình', '.lab__l {' in HTML and 'class="tight lab__l"' in HTML)
    m5 = HTML[HTML.find('Mô hình 5 —'):HTML.find('mạng nơ-ron tối giản')]
    claim('M5: chip "Vẽ chồng" nối vào mô hình và ô kết quả', 'id="m5-rs"' in HTML
          and "$('m5-rs').addEventListener('click'" in m5 and "'→ ' + diag + bv" in m5)
    # J = (1/2m)Σe² nên √(2J) là RMSE, không phải sai lệch tuyệt đối trung bình
    m1 = HTML[HTML.find('Mô hình 1 —'):HTML.find('Mô hình 2 —')]
    claim('M1: √(2J) được gọi là RMSE', 'return s / (2 * HOUSE.n);' in HTML and "(RMSE) ≈ ' + fmt(Math.sqrt(2 * J)" in m1
          and 'sai lệch trung bình mỗi căn' not in m1)
    m9 = HTML[HTML.find('Mô hình 9 —'):HTML.find('Mô hình 10 —')]
    claim('M9: vượt mức người thì chỉ nửa bias mất mốc', 'Bộ chẩn đoán này hết tác dụng' not in m9
          and 'Variance (dev − train) vẫn đọc được' in m9)
    # dropout: tỉ lệ tắt + keep_prob = 1 ở cả hai đầu khoảng
    md = re.search(r'tỉ lệ tắt <b>(\d),(\d)–(\d),(\d)</b> \(keep_prob (\d),(\d)–(\d),(\d)\)', sec('s-cheat'))
    claim('bảng tra: dropout ghi tỉ lệ tắt và keep_prob khớp nhau', md is not None and
          int(md.group(1)) * 10 + int(md.group(2)) + int(md.group(7)) * 10 + int(md.group(8)) == 10 and
          int(md.group(3)) * 10 + int(md.group(4)) + int(md.group(5)) * 10 + int(md.group(6)) == 10,
          'keep_prob = 1 − tỉ lệ tắt')


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
    # công thức bỏ phần lẻ: stride 2 trên ảnh 32 ô ra 16 ô, không phải 16,5
    claim('stride 2 → 16 ô (bỏ phần lẻ)', out(32, 3, 1, 2) == 16, f'tính ra {out(32, 3, 1, 2)}')
    need('ví dụ stride 2', 'cộng 1 = <b>16 ô</b>')
    # mô hình kính lúp: ảnh 10 ô, kính 3, không viền → tấm kết quả 8×8
    claim('mô hình 10 ô, kính 3, không viền → 8 ô', out(10, 3, 0, 1) == 8, f'tính ra {out(10, 3, 0, 1)}')
    need('mô hình 8×8', '(10 − 3)/1 + 1 = 8')

    # ── kính lúp 3×3 có đúng chín núm ──────────────────────────────────────
    claim('3×3 = chín núm', 3 * 3 == 9)
    need('kính lúp 3×3', 'chín cái núm')
    # kính của lớp sau dày bằng cả chồng kênh
    claim('kính 3×3 trên chồng 32 tầng = 288 núm', 3 * 3 * 32 == 288)
    need('kính dày bằng cả chồng', '3×3×32 = 288 cái núm')
    # tách theo chiều sâu: chi phí còn 1/(số kênh ra) + 1/9 → rẻ hơn tới 8–9 lần, không bao giờ tới 9
    claim('tách chiều sâu rẻ hơn tới tám, chín lần', 8 < 1 / (1 / 512 + 1 / 9) < 9,
          f'512 kênh ra: rẻ hơn {1 / (1 / 512 + 1 / 9):.2f} lần')
    need('tách chiều sâu', 'Rẻ hơn tới tám, chín lần')

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

    # ── mô hình 9 (dẹp khung trùng): lời hứa về ngưỡng phải đúng với BOX0 ────
    # Bản cũ đặt xe thứ hai không chạm khung 0,93 (IoU 0), nên câu "hạ ngưỡng xuống 0,1
    # thì hai xe bị dẹp còn một" sai ở mọi ngưỡng — và nút "Dẹp hết" in cứng "đúng bằng
    # số xe" kể cả khi còn 6 khung. Dựng lại đúng thuật toán của nmsStep().
    import math
    import re
    m = re.search(r'var BOX0 = \[(.*?)\];', HTML, re.S)
    boxes = [tuple(float(v) for v in t) for t in re.findall(
        r'x: ([\d.]+), y: ([\d.]+), w: ([\d.]+), h: ([\d.]+), c: ([\d.]+)', m.group(1))] if m else []

    def iou(a, b):
        ix = max(0, min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0]))
        iy = max(0, min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1]))
        return ix * iy / (a[2] * a[3] + b[2] * b[3] - ix * iy)

    def nms(th):
        alive, kept = sorted(boxes, key=lambda b: -b[4]), 0
        while alive:
            best = alive.pop(0)
            kept += 1
            alive = [b for b in alive if iou(best, b) <= th]
        return kept
    claim('NMS bóc được sáu khung', len(boxes) == 6, f'bóc được {len(boxes)}')
    if boxes:
        claim('NMS ngưỡng 0,5 → 2 khung cho 2 xe', nms(0.5) == 2, f'còn {nms(0.5)}')
        claim('NMS ngưỡng 0,1 dẹp oan còn 1', nms(0.1) == 1, f'còn {nms(0.1)}')
        claim('NMS: 0,70 vẫn 2, từ 0,75 khung trùng sống sót', nms(0.7) == 2 and nms(0.75) > 2,
              f'0,70 → {nms(0.7)}, 0,75 → {nms(0.75)}')
    need('lời hứa ngưỡng thấp', 'Hạ ngưỡng dẹp xuống 0,1 thì hai chiếc xe đứng cạnh nhau sẽ bị dẹp còn một')
    need('lời hứa ngưỡng cao', 'đẩy lên từ 0,75')

    # ── mô hình 13 (γ): hai mốc lật nước đi phải đúng với solveQ() ─────────
    need('phần thưởng sáu ô', 'var N = 6, R = [100, 0, 0, 0, 0, 40];')

    def policy(g):
        R, Q = [100, 0, 0, 0, 0, 40], [[0, 0] for _ in range(6)]
        for _ in range(400):
            for i in range(6):
                for a in (0, 1):
                    if i in (0, 5):
                        Q[i][a] = R[i]
                        continue
                    j = max(0, i - 1) if a == 0 else min(5, i + 1)
                    Q[i][a] = R[i] + g * max(Q[j])
        return ''.join('←' if Q[k][0] >= Q[k][1] else '→' for k in range(1, 5))
    claim('γ 0,39: ô 4 và ô 5 sang phải', policy(0.39) == '←←→→', policy(0.39))
    claim('γ 0,40–0,73: chỉ ô 5 sang phải', policy(0.40) == policy(0.73) == '←←←→', f'{policy(0.40)} / {policy(0.73)}')
    claim('γ 0,74: mọi ô sang trái', policy(0.74) == '←←←←', policy(0.74))
    claim('ô 5 lật khi γ³ = 0,4 → 0,737', abs(0.4 ** (1 / 3) - 0.737) < 5e-4)
    need('mốc ô 5', 'qua mốc 0,74')
    need('mốc ô 4', 'dưới 0,40')

    # ── mô hình 12 (k-means): nút "Đổi chỗ xuất phát" phải cho thấy CẢ hai kết cục ──
    # Với đám điểm rng(31337), rút ba tâm bừa thì chỉ ~2/100 lần kẹt (lần đầu ở lần bấm
    # thứ 33), nên trang xen sẵn SEEDS. Dựng lại đúng rng/gauss/init/assign/move của trang.
    need('k-means dữ liệu', 'var r = rng(31337), cen = [[.28, .30], [.72, .33], [.50, .76]]')
    need('k-means độ toả', 'gauss(r) * .085')
    need('k-means cỡ cụm', 'for (k = 0; k < 3; k++) for (i = 0; i < 22; i++)')
    ms = re.search(r'SEEDS = \[([\d,\s]+)\]', HTML)
    seeds = [int(s) for s in ms.group(1).split(',')] if ms else []

    def rng(seed):
        st = [seed % 2 ** 32]

        def nxt():
            st[0] = (st[0] * 1664525 + 1013904223) % 2 ** 32
            return st[0] / 4294967296
        return nxt

    def gauss(r):
        u = v = 0
        while u == 0:
            u = r()
        while v == 0:
            v = r()
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)
    r = rng(31337)
    cen = [[.28, .30], [.72, .33], [.50, .76]]
    pts = [[cen[k][0] + gauss(r) * .085, cen[k][1] + gauss(r) * .085] for k in range(3) for _ in range(22)]

    def kmeans(seed):
        r, used, C = rng(seed), set(), []
        while len(C) < 3:
            i = math.floor(r() * len(pts))
            if i in used:
                continue
            used.add(i)
            C.append(list(pts[i]))
        asg = None
        for _ in range(26):
            new = [min(range(3), key=lambda k: ((p[0] - C[k][0]) ** 2 + (p[1] - C[k][1]) ** 2, k)) for p in pts]
            if new == asg:
                break
            asg = new
            for k in range(3):
                mine = [p for p, a in zip(pts, asg) if a == k]
                if mine:
                    C[k] = [sum(p[0] for p in mine) / len(mine), sum(p[1] for p in mine) / len(mine)]
        return sorted(asg.count(k) for k in range(3))
    ends = [kmeans(s) for s in seeds]
    claim('k-means: SEEDS có cả lần chia đúng lẫn lần kẹt',
          [22, 22, 22] in ends and any(e != [22, 22, 22] for e in ends), f'kết cục: {ends}')

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

    # ══ các câu kiến thức đã từng viết sai ═════════════════════════════════
    import html as _html
    main_i = HTML.find('<main')
    body = HTML[main_i:HTML.find('<script', main_i)] if main_i >= 0 else ''
    plain = re.sub(r'\s+', ' ', _html.unescape(re.sub(r'<[^>]+>', ' ', body)))
    WORD = {2: 'HAI', 3: 'BA', 10: 'mười', 13: 'MƯỜI BA'}

    # Mô hình 3: lời gợi ý đọc đúng số mô hình in ra khi kéo từ chỗ mặc định về đáy thanh.
    need('m3 thước cũ là bình phương', 'function sq(p) { return (p - y) * (p - y); }')
    i = HTML.find('id="m3-p"')
    tag = HTML[i:HTML.find('>', i)] if i >= 0 else ''
    lo = re.search(r'min="([\d.]+)"', tag)
    p0 = re.search(r'value="([\d.]+)"', tag)
    claim('m3 bóc được thanh trượt', bool(lo and p0))
    if lo and p0:
        lo, p0 = float(lo.group(1)), float(p0.group(1))
        claim('m3: thước cũ ở đáy thanh vẫn dưới trần 1', (1 - lo) ** 2 < 1, f'{(1 - lo) ** 2:.4f}')
        need('m3 gợi ý: thước cũ', f'cái cũ chỉ nhích từ {vi((1 - p0) ** 2)} lên {vi((1 - lo) ** 2)}, sát trần 1 mà không vượt được',
             (1 - lo) ** 2)
        need('m3 gợi ý: thước mới', f'cái mới vọt từ {vi(-math.log(p0), 1)} lên {vi(-math.log(lo), 1)}')

    # Momentum: trung bình trượt mũ với hệ số β nhớ chừng 1/(1 − β) bước gần nhất. β đọc từ
    # bảng tra (β₁ của Adam, cũng là mặc định của momentum); thân bài phải ghi đúng số bước,
    # đúng hai tỉ lệ giữ/thêm, và định nghĩa β trước lần đầu dùng chữ ấy.
    mb = re.search(r'β₁ = ([\d,]+) ·', HTML)
    claim('bóc được β₁ trong bảng tra', bool(mb))
    if mb:
        beta = float(mb.group(1).replace(',', '.'))
        n = round(1 / (1 - beta))
        need('cửa sổ của momentum', f'trung bình của chừng {WORD.get(n, n)} bước gần đây</b>', f'1/(1 − {beta}) = {n}')
        need('β định nghĩa bằng lời', f'mỗi bước giữ {round(beta * 100)}% mức trung bình cũ và thêm '
             f'{round((1 - beta) * 100)}% độ nghiêng mới — hệ số {vi(beta, 1)} ấy gọi là β')
        need('thứ tự vặn: β của momentum', f'Rồi tới β của momentum ({vi(beta, 1)} là mặc định tốt)')
    k = plain.find('β')
    claim('β định nghĩa trước lần dùng đầu', k >= 0 and plain[max(0, k - 7):k] == 'gọi là ',
          f'lần đầu gặp β trong thân bài: "…{plain[max(0, k - 60):k + 1]}"')
    ewa = [r for r in gloss_records(r"\['([^']*)',\s*'([^']*)',\s*'([^']*)'\]") if r[1] == 'exponentially weighted average']
    claim('GLOSS trung bình trượt mũ không nói "mấy chục bước"', len(ewa) == 1 and 'mấy chục' not in ewa[0][0],
          f'{ewa}')

    # Chuẩn hoá: sau z-score, độ cong của MSE là 2 × ma trận tương quan, trị riêng 1 ± r — lòng chảo
    # chỉ tròn hẳn khi r = 0, nên thân bài và GLOSS đều phải nói "gần tròn", không nói "bát tròn".
    need('bát gần tròn', 'Khe hẹp thành gần như bát tròn (tròn hẳn khi hai loại số không đi cùng nhau)')
    fs = [r for r in gloss_records(r"\['([^']*)',\s*'([^']*)',\s*'([^']*)'\]") if r[1] == 'feature scaling']
    claim('GLOSS feature scaling nói "gần tròn"', len(fs) == 1 and 'gần tròn' in fs[0][2] and 'bát tròn' not in fs[0][2], f'{fs}')

    # Normal equation: nghịch đảo ma trận n × n tốn cỡ n³; mốc của khoá gốc là ~10.000 đặc trưng.
    need('mốc normal equation', 'tốn công tăng theo (số núm)³, nên từ chừng mười nghìn núm trở lên')

    # Mặc định khởi tạo: Keras Dense = glorot_uniform; PyTorch nn.Linear = U(±1/√n).
    need('mặc định không phải He', 'Mặc định của thư viện thường không phải He (Keras: Xavier; PyTorch: rải đều trong ±1/√(số đầu vào))')

    # Mốc năm: ViT (arXiv 2010.11929) và DDPM (2006.11239) năm 2020, CLIP (2103.00020) năm 2021;
    # diffusion có gốc từ 2015 (1503.03585), nên "ra đời sau khoá học" là sai.
    claim('không còn "ra đời sau khoá học"', 'ra đời sau khoá học' not in HTML)
    need('mốc ViT / diffusion', 'chúng nổi lên từ 2020, sau bản quay 2017–2018')
    need('data-centric AI từ 2021', "'hướng Ng đẩy mạnh từ 2021'")

    # Lan truyền ngược nhân thêm độ dốc của cái bẻ — đúng như mô hình 5 làm, và chỉ một lần gán.
    i = HTML.find('MÔ HÌNH 5 — TẮT CÁI BẺ')
    m5 = HTML[i:HTML.find('MÔ HÌNH 6', i)] if i >= 0 else ''
    sets = re.findall(r'prev\[q\]\s*=(?!=)[^;]*;', m5)
    claim('m5 nhân độ dốc của cái bẻ', sets == ['prev[q] = s * dact(f.Z[k - 1][q]);'],
          f'các lệnh gán prev[q] trong m5: {sets}')
    need('lời văn nhắc độ dốc của cái bẻ', 'nếu nó đang bị bẻ về 0 thì phần trách nhiệm là 0')
    need('"cái bẻ" chỉ sang mục dưới ở lần đầu', 'rồi bóp qua cầu trượt chữ S — hoặc một <i>cái bẻ</i> khác, xem mục dưới')

    need('attention chia căn độ dài', 'cho căn của độ dài dãy số để softmax')
    need('distortion là trung bình', '<b>trung bình bình phương</b> khoảng cách')
    ds = [r for r in gloss_records(r"\['([^']*)',\s*'([^']*)',\s*'([^']*)'\]") if r[1] == 'distortion']
    claim('GLOSS distortion là trung bình', len(ds) == 1 and ds[0][0].startswith('trung bình bình phương'), f'{ds}')
    need('DQN hai kiểu lớp cuối', 'một Q cho mỗi hành động')
    need('bảng tra DQN: k giá trị Q', '<td>k giá trị Q</td>')

    # Mô hình 12 (k-means): lần kẹt nào cũng là "hai tâm chia một cụm, hai cụm kia chung một tâm"
    # — không nhóm nào rỗng, và có một nhóm cỡ gần hai cụm. Dòng phán của m9 rẽ nhánh ở ngưỡng
    # đọc từ trang; mọi lần kẹt phải rơi đúng nhánh "giành một cụm", không rơi nhánh "nhóm rỗng".
    mt = re.search(r'Math\.min\.apply\(null, sizes\) < (\d+)', HTML)
    stuck = [e for e in ends if e != [22, 22, 22]]
    claim('k-means: lần kẹt không bỏ trống cụm nào', bool(stuck) and all(min(e) > 0 for e in stuck), f'{stuck}')
    claim('k-means: lần kẹt có một nhóm gộp hai cụm', bool(stuck) and all(max(e) > 1.5 * 22 for e in stuck), f'{stuck}')
    claim('k-means: dòng phán của lần kẹt là "giành một cụm"',
          bool(mt) and all(0 < min(e) < int(mt.group(1)) for e in stuck), f'ngưỡng {mt.group(1) if mt else "?"}, {stuck}')
    need('cái bẫy k-means', 'Đặt xấu thì hai tâm chia nhau một cụm, còn hai cụm kia phải chung một tâm.')

    # Mô hình 2: ba bước chân mà gợi ý mời thử phải cho đúng điều nó hứa, trên đúng khung vẽ.
    ma = re.search(r"axes\(svg, \[56, 22, 620, 218\], \[(−?-?[\d.]+), ([\d.]+)\]", HTML)
    mc = re.search(r'var C = ([\d.]+);\s*/\* đáy thung lũng', HTML)
    mx = re.search(r'id="m2-x"[^>]*value="(-?[\d.]+)"', HTML)
    ms2 = re.search(r'Ở 1,1, kéo <b>chỗ thả bóng</b> về (−?[\d,]+) trước rồi mới Thả: mỗi cú nảy cao hơn cú trước', HTML)
    claim('m2 bóc được khung, đáy, chỗ thả', bool(ma and mc and mx and ms2))
    if ma and mc and mx and ms2:
        x_hi, C2, x0 = float(ma.group(2)), float(mc.group(1)), float(mx.group(1))
        x11 = float(ms2.group(1).replace('−', '-').replace(',', '.'))

        def path(a, w, n):
            out = [w]
            for _ in range(n):
                w = w - a * 2 * (w - C2)
                out.append(w)
            return out
        for a in (0.3, 0.7):
            claim(f'm2 α = {vi(a, 1)} từ chỗ thả mặc định: bóng ở trong khung', all(abs(w) <= x_hi for w in path(a, x0, 40)))
        claim('m2 α = 1,1 từ chỗ thả mặc định văng ngay bước đầu (lý do gợi ý dời chỗ thả)',
              abs(path(1.1, x0, 1)[1]) > x_hi, f'bước 1 tới {path(1.1, x0, 1)[1]:.2f}')
        p11 = path(1.1, x11, 5)
        claim('m2 α = 1,1 từ chỗ gợi ý: năm cú nảy đầu còn trong khung, mỗi cú cao hơn',
              all(abs(w) <= x_hi for w in p11) and all(abs(b - C2) > abs(a - C2) for a, b in zip(p11, p11[1:])), f'{p11}')
    need('m2 dòng phán so với bước trước', 'up = trail.length > 1 && j > J(trail[trail.length - 2])')
    need('m2 dòng phán dùng so sánh ấy', "(up ? '→ ĐANG ĐI LÊN. Bước chân quá dài.'")

    # Phần mở đầu: đếm mô hình và đếm mô hình dùng số đặt tay ngay trong trang.
    labs = sorted(set(int(x) for x in re.findall(r'Nghịch được · mô hình (\d+) / 13', HTML)))
    hand = len(re.findall(r'<p class="lab__f">[^<]*(?:do người đặt|được đặt ra)', HTML))
    claim('đủ mười ba mô hình', labs == list(range(1, 14)), f'{labs}')
    need('phần mở đầu: số mô hình và số mô hình đặt tay',
         f'{WORD.get(len(labs), len(labs))} MÔ HÌNH CHẠY NGAY TRONG TRÌNH DUYỆT CỦA BẠN — {WORD.get(hand, hand)} MÔ HÌNH DÙNG SỐ ĐẶT TAY, CÓ GHI RÕ',
         f'{len(labs)} mô hình, {hand} đặt tay')
    if 'ra đời sau tám khoá gốc' in HTML[HTML.find('GLOSS = ['):]:
        need('233 tên không chỉ của tám khoá', 'thuật ngữ của tám khoá gốc và vài tên mới hơn')

    # Bảng tên thật là "ví von trong trang ↔ tên chính thức": tên nào cũng phải có mặt ở thân bài.
    lowp = plain.lower()
    gone = []
    for r in gloss_records(r"\['([^']*)',\s*'([^']*)',\s*'[^']*'\]"):
        parts = [r[1]]
        mm = re.fullmatch(r'(.*?)\s*\(([^)]*)\)', r[1])
        if mm:
            parts = [mm.group(1), mm.group(2)]
        if any(t.lower() not in lowp for t in parts):
            gone.append(r[1])
    claim('mọi tên thật trong bảng đều có ở thân bài', not gone, f'thiếu: {gone}')
    claim('không câu tự khen bảng', 'quan trọng đến vậy' not in HTML)

    # ══ vòng 3: câu đúng-có-điều-kiện, không được viết thành luôn-đúng ══════
    G3 = {r[1]: r for r in gloss_records(r"\['([^']*)',\s*'([^']*)',\s*'([^']*)'\]")}
    # Lồi chỉ hứa "đáy nào cũng thấp nhất", không hứa một đáy duy nhất (Boyd–Vandenberghe §4.2.2).
    claim('lồi không phải "chỉ một cái đáy"', 'chỉ đúng một cái đáy' not in HTML and 'cái bát duy nhất' not in HTML
          and 'đáy giả' in G3.get('convex', ('', '', ''))[2], f"GLOSS convex: {G3.get('convex')}")
    need('lồi: đáy có thể là cả rãnh', 'Lồi không hứa chỉ có một điểm đáy')
    # from_logits=True đòi lớp cuối tuyến tính; ô "Lớp cuối" mà chỉ ghi softmax thì làm theo cả hàng là bóp hai lần.
    row = re.search(r'<tr><td>Một trong k loại[^\n]*?</tr>', HTML)
    claim('bảng tra: softmax + from_logits nói rõ lớp cuối tuyến tính', bool(row) and 'from_logits=True' in row.group(0)
          and 'lớp cuối để tuyến tính' in row.group(0), row.group(0)[:160] if row else 'không thấy hàng')
    # Glorot: Var = 2/(vào + ra) = 1/trung bình(vào, ra); He: Var = 2/vào. "Cả hai chia cho căn số vào" là quy ước của khoá.
    fi, fo = 300, 100
    claim('Xavier = chia cho căn trung bình số vào và số ra', abs(2 / (fi + fo) - 1 / ((fi + fo) / 2)) < 1e-15)
    need('Xavier trong thân bài', 'Xavier chia cho căn của trung bình số đầu vào và số đầu ra')
    claim('không còn "Cả hai đều là chia cho căn số đầu vào"', 'Cả hai đều là "chia cho căn số đầu vào"' not in HTML)
    # Kính 3 + padding 1 giữ nguyên cỡ (kiểm ở trên), nên "tích chập chỉ làm ảnh nhỏ đi" là sai.
    claim('tích chập không "chỉ làm ảnh nhỏ đi"', out(32, 3, 1, 1) == 32 and 'chỉ làm ảnh nhỏ đi' not in HTML
          and 'chỉ làm ảnh <i>nhỏ</i> đi' not in HTML)
    # Hệ số chặn B là lời đoán khi đầu vào bằng 0; đầu vào là "nóng hơn 20 độ mấy độ".
    need('đầu vào đo từ mốc 20 độ', 'nóng hơn 20 độ mấy độ')
    need('B là lời đoán ở đầu vào 0', 'số cốc đoán cho ngày có độ nóng bằng 0, tức đúng 20 độ')
    # Mức người chỉ là ước lượng trên của sai số Bayes: nhãn m6 không được khẳng định chắc.
    claim('m6 không gọi khoảng đầu là chắc chắn không tránh được', "['không tránh được', 0, h," not in HTML
          and 'Khoảng đầu không ai chữa được' not in HTML)
    claim('GLOSS xấp xỉ phổ quát nói "gần đúng"', 'gần đúng' in G3.get('universal approximation', ('',))[0])
    claim('scaling laws là luỹ thừa, không phải "tốt đều"', 'tăng đều thì tốt đều' not in HTML)
    need('scaling laws: gấp mười, giảm cùng tỉ lệ', 'mỗi lần gấp mười sức tính, điểm trừ giảm đi cùng một tỉ lệ')
    claim('RLHF: người so câu trả lời, mô hình chấm điểm', 'điểm thưởng do người chấm' not in HTML)
    claim('số đầu là siêu tham số, không phải hằng số tám', 'tám phép nhìn song song' not in HTML)
    claim('tách đẳng biến và bất biến', 'translation equivariance' in G3 and 'translation invariance' in G3)
    need('SGD: tên của khoá khác tên của thư viện', 'gọi cả tụt dốc theo mini-batch là SGD')
    need('ε ngưỡng khác ε làm bừa', 'ε ở đây là một ngưỡng')
    claim('learning rate chỉ một tên Việt: tốc độ học', 'độ dài bước học' not in HTML and 'tốc độ học' in HTML)
    need('Bellman: quy ước của khoá so với Sutton & Barto', 'cùng ý, lệch chỉ số một bước')
    claim('GLOSS học có giám sát nói "gần như"', G3.get('supervised learning', ('', '', ''))[2].startswith('gần như'))

    # ══ vòng 3: công thức một dòng mà người đọc cần để tự tính lại ═════════
    # Quy tắc bước và hai đạo hàm của MSE: kiểm bằng sai phân trên đúng ba mươi ngày của m1.
    need('quy tắc bước', 'w ← w − α · ∂J/∂w<br>b ← b − α · ∂J/∂b')
    need('đạo hàm MSE', '∂J/∂w = trung bình của 2(ŷ − y)·x<br>∂J/∂b = trung bình của 2(ŷ − y)')
    D1 = locals().get('D') or []
    if D1:
        Jm = lambda w, b: sum((w * x + b - y) ** 2 for x, y in D1) / len(D1)
        w0, b0, h = 1.2, 24.0, 1e-6
        gw = sum(2 * (w0 * x + b0 - y) * x for x, y in D1) / len(D1)
        gb = sum(2 * (w0 * x + b0 - y) for x, y in D1) / len(D1)
        claim('∂J/∂w, ∂J/∂b khớp sai phân trên dữ liệu m1',
              abs((Jm(w0 + h, b0) - Jm(w0 - h, b0)) / (2 * h) - gw) < 1e-3 * abs(gw)
              and abs((Jm(w0, b0 + h) - Jm(w0, b0 - h)) / (2 * h) - gb) < 1e-3 * abs(gb), f'{gw:.4f}, {gb:.4f}')
    need('m2 in độ nghiêng', "'độ nghiêng    ' + pad(Math.abs(w) > 1e6 ? 'khổng lồ' : vi(dJ(w), 3), 6)")
    need('m2 in bước', "vi(+sa.value * dJ(w), 3)")
    # Sigmoid, log loss, softmax.
    need('sigmoid', 'σ(z) = 1 / (1 + e<sup>−z</sup>)')
    claim('σ(0) = 1/2', 1 / (1 + math.exp(0)) == 0.5)
    need('log loss một dòng', 'điểm trừ = −ln p')
    for pp, shown in ((0.01, '−ln 0,01 ≈ 4,6'), (0.5, 'p = 0,5 → 0,69'), (0.0001, 'p = 0,0001 → 9,2')):
        claim(f'−ln {pp}', vi(-math.log(pp), 2 if pp == 0.5 else 1) in shown, f'{-math.log(pp):.3f}')
        need(f'log loss ví dụ {pp}', shown)
    msx = re.search(r'Ba điểm số (\d) · (\d) · (\d) thành e² ≈ ([\d,]+) · e ≈ ([\d,]+) · e⁰ = 1; tổng ([\d,]+); chia ra (\d+)% · (\d+)% · (\d+)%', HTML)
    claim('bóc được ví dụ softmax', bool(msx))
    if msx:
        z = [int(msx.group(k)) for k in (1, 2, 3)]
        ez = [math.exp(t) for t in z]
        claim('softmax: e mũ và tổng', vi(ez[0]) == msx.group(4) and vi(ez[1]) == msx.group(5) and vi(sum(ez)) == msx.group(6),
              f'{ez}, tổng {sum(ez):.3f}')
        pc = [round(100 * e / sum(ez)) for e in ez]
        claim('softmax: phần trăm', pc == [int(msx.group(k)) for k in (7, 8, 9)] and sum(pc) == 100, f'{pc}')
    # Entropy, Gini, information gain — đúng con số mô hình 7 in ra.
    H = lambda q: 0 if q in (0, 1) else -q * math.log2(q) - (1 - q) * math.log2(1 - q)
    need('entropy một dòng', 'H = −p·log₂p − (1 − p)·log₂(1 − p)<br>Gini = 1 − p² − (1 − p)²')
    need('entropy 4 mèo 1 không', f'H = 0,8 × {vi(-math.log2(0.8), 3)} + 0,2 × {vi(-math.log2(0.2), 3)} = {vi(H(0.8), 3)}')
    claim('entropy 50–50 = 1, Gini 50–50 = 0,5', H(0.5) == 1 and 1 - 0.25 - 0.25 == 0.5)
    need('information gain tai vểnh', f'1 − (5/10 × {vi(H(0.8), 3)} + 5/10 × {vi(H(0.8), 3)}) = {vi(1 - H(0.8), 3)}')
    # Accuracy và F1 của hai máy "nói một câu cho tất cả".
    P_, R_ = 3 / 1_000_000, 1.0
    claim('accuracy 99,9997%', vi(100 * (1 - P_), 4) == '99,9997')
    claim('F1 ≈ 0,0006%', vi(100 * 2 * P_ * R_ / (P_ + R_), 4) == '0,0006', f'{100 * 2 * P_ * R_ / (P_ + R_)}')
    need('F1 có công thức', 'F1 = 2·P·R / (P + R)')
    need('F1 máy báo tất cả', 'F1 = 2·P·1/(P + 1) ≈ 0,0006%')
    # Mọi link sang trang Toán phải trỏ tới một mục có thật.
    mp = HERE / 'mathematics-for-machine-learning.html'
    ids = set(re.findall(r'id="([^"]+)"', mp.read_text(encoding='utf-8'))) if mp.exists() else set()
    tg = sorted(set(re.findall(r'mathematics-for-machine-learning\.html#([\w-]+)', HTML)))
    claim('link sang trang Toán trỏ tới mục có thật', bool(ids) and all(t in ids for t in tg),
          f'gãy: {[t for t in tg if t not in ids]}')
    claim('link trang Toán: có mục 2.4 (đạo hàm riêng) và 1.5 (tích vô hướng)', {'s-partial', 's-dot', 's-inverse'} <= set(tg), f'{tg}')
    # Tên trang dùng mà trước đây không có trong bảng tên thật.
    claim('GLOSS có accuracy, fully connected, dying ReLU', {'accuracy', 'fully connected layer', 'dying ReLU'} <= set(G3))
    claim('"núm" không dùng cho siêu tham số ở bảng 2', '<h3>2 · Núm bắt đầu từ đâu</h3>' not in HTML and '<th>Núm</th>' not in HTML)
    # Hình lưới / ngẫu nhiên ở chương 7: mỗi ô 25 lần thử; số vạch chiếu xuống trục ngang = số giá trị
    # khác nhau của α, và phải đúng con số in dưới ô (5 và 25).
    i = HTML.find('id="fig-search"')
    fs = HTML[i:HTML.find('</svg>', i)] if i >= 0 else ''
    cx = [float(v) for v in re.findall(r'<circle cx="([\d.]+)"', fs)]
    left, right = [v for v in cx if v < 180], [v for v in cx if v >= 180]
    claim('hình dò: mỗi ô 25 lần thử', len(left) == 25 and len(right) == 25, f'{len(left)} / {len(right)}')
    claim('hình dò: lưới cho 5 giá trị, ngẫu nhiên cho 25', len(set(left)) == 5 and len(set(right)) == 25,
          f'{len(set(left))} / {len(set(right))}')
    claim('hình dò: số vạch đúng số giá trị', len(re.findall(r'<line x1="[\d.]+" y1="158"', fs)) == 30)
    claim('hình dò: nhãn đúng số đếm', f'>{len(set(left))} giá trị α khác nhau<' in fs and f'>{len(set(right))} giá trị α khác nhau<' in fs)

    # ══ vòng 4: câu đơn giản hoá thành sai ═════════════════════════════════
    # Momentum viết theo trung bình trượt (giữ 90%, thêm 10%): trên một dốc đều, trung bình của
    # các độ nghiêng bằng nhau vẫn là độ nghiêng ấy, nên bước không dài hơn tụt dốc thường —
    # "đi nhanh dần lên" chỉ đúng với bản cộng dồn không nhân 10%. Nó giữ đà, và triệt nhiễu.
    v, g = 0.0, 1.0
    for _ in range(200):
        v = 0.9 * v + 0.1 * g
    claim('momentum trung bình trượt: trên dốc đều bước không vượt độ nghiêng', abs(v - g) < 1e-6, f'{v}')
    claim('không còn "đi nhanh dần" cho momentum', 'đi nhanh dần' not in HTML)
    need('momentum giữ đà', 'thì giữ đà mà đi tiếp')
    # Lượt đi ngược tốn chừng gấp đôi lượt xuôi (Griewank & Walther, Evaluating Derivatives, §4.6).
    need('chi phí lan truyền ngược', 'mà chỉ tốn chừng gấp đôi một lượt đoán')
    # Cây (chương 9) và k-means (chương 12) không tụt dốc, nên Bellman không "như mọi chương trước".
    claim('không còn "tụt dốc như mọi chương trước"', 'như mọi chương trước' not in HTML)
    # Chương 12: "cách học ấy" phải trỏ về học có giám sát, nên câu tự giám sát đứng sau.
    k1, k2 = plain.find('như chương 1 đã gọi'), plain.find('self-supervised learning')
    claim('chương 12: học có giám sát gọi tên trước tự giám sát', 0 <= k1 < k2, f'{k1} / {k2}')


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
