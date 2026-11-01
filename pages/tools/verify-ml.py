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

    run_ml_models()


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

    # ── M2: J tăng là đủ biết α vượt 2/λ_max — không được khuyên "tăng α" lúc ấy ──
    m2 = js('M2', 'Mô hình 2 — learning rate', 'Mô hình 3 —')
    claim('M2: có nhánh "J đang tăng"', 'hist[L - 1] > hist[L - 2]' in m2 and 'rising ?' in m2,
          'ô kết quả phải báo J tăng thay vì "còn đang đi … tăng α"')

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

    # ── M5: sàn nhiễu đo trên tập kiểm thử đang dùng, không ghi cứng σ² ──
    m5 = js('M5', 'Mô hình 5 —', 'mạng nơ-ron tối giản')
    claim('M5: sàn nhiễu tính từ TEST', 'truef(TEST[i][0]) - TEST[i][1]' in m5 and 'fmt(FLOOR' in m5)
    claim('M5: điều kiện variance đủ chặt', 'b2 > 2 * a2' in m5,
          'bậc 8 với 14 điểm (kiểm thử gấp 8 lần huấn luyện) từng bị dán "CÂN BẰNG TỐT"')

    # ── M6: câu kết luận theo độ chính xác, không theo tên hàm kích hoạt ──
    m6 = js('M6', 'Mô hình 6 —', 'Mô hình 7 —')
    claim('M6: kết luận "bao được vòng tròn" có điều kiện độ chính xác',
          'accuracy(net, D) >= 0.97' in m6 and 'chưa khép được vòng tròn' in m6)

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

    # ── M13: kết luận theo mỏ LỚN HƠN thật, không mặc định ô 1 ──
    m13 = js('M13', 'Mô hình 13 —', 'TỪ ĐIỂN THUẬT NGỮ')
    claim('M13: hướng mỏ lớn tính từ hai thanh thưởng', "bigDir = r1 > r6 ? 'TRÁI' : 'PHẢI'" in m13)

    # ── chú thích sáng/đen: --ink đảo theo theme, nên chữ phải trung tính ──
    for bad in ('Sáng = thấp', 'Đen = bán nhanh', 'Chấm đen', 'đen = huấn luyện', 'càng sáng thì chi phí'):
        claim(f'theme: không còn "{bad}"', bad not in HTML, 'đúng ở một theme, ngược ở theme kia')
    m10 = js('M10', 'Mô hình 10 —', 'Mô hình 11 —')
    claim('M10: ảnh và bản đồ đặc trưng dùng thang xám cố định ("Sáng = kêu to" đúng cả hai theme)',
          'function gray(' in m10 and 'var(--ink)' not in m10[m10.find('function gray('):m10.find('$(\'m10-mat\')')])



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

    need('attention chia căn độ dài', 'chia cho căn của độ dài dãy số để softmax')
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
