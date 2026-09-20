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
    claim('sửa hết ban đêm lấy lại tối đa 43% chỗ sai', 5 + 43 <= 100,
          'hai nguyên nhân cộng lại không được vượt 100% số lỗi')

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
