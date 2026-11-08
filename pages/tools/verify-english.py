#!/usr/bin/env python3
"""Cổng kiến thức cho pages/english-from-the-ground-up.html.

Vì sao cần, khác lint-pages.py: trang nói vài chục con số tính lại được — độ phủ từ vựng của
Nation (2006), giờ học có hướng dẫn của Cambridge, vốn từ theo CEFR, lịch 30 ngày (45–90 giờ,
0,2–0,6 bậc, ba mức 180/90/40 phút), lịch một giờ, số thẻ mỗi năm, nhịp giáo trình Destination —
và 49 mục đánh số tay mà chữ "mục NN" trỏ tới. lint-pages.py chỉ biết anchor có tồn tại, không
biết "mục 43" có còn là mục 43 sau khi chèn thêm một mục.

Sáu phần:

  A. CẤU TRÚC — số mục 01..N liền nhau, bằng con số ở đầu trang; mục lục theo đúng thứ tự mục;
     số mô hình liền nhau, bằng con số ở đầu trang, mô tả và mục 05.
  B. THAM CHIẾU — mọi link có chữ "mục NN" / "NN" / "NN · Tên" phải trỏ vào đúng mục số NN
     (cả id của h3 nằm trong mục); ngoài <script> không còn "mục NN" nào chưa có link; hai chuỗi
     "mục NN" trong JS được đối chiếu riêng.
  C. DỮ LIỆU NGUỒN — mảng độ phủ của mô hình 7 so với bảng 5 và bảng 13 của Nation (2006); giờ
     học trong bảng mục 04 so với Cambridge; vốn từ so với bảng CEFR của Nation; mô hình 1 dùng
     đúng trung điểm giờ học.
  D. CON SỐ TRONG BÀI — tính lại rồi đòi trang có đúng chuỗi ấy: lede mục 27, ô đầu trang, đoạn
     "Ba con số" mục 04, số thẻ mỗi năm, nhịp Destination, lịch một giờ, khung giới hạn của lịch
     30 ngày, tổng ba mức thời lượng.
  E. LỊCH 30 NGÀY — đủ 30 ngày liền nhau, mỗi ngày có link lý thuyết, ngày đo khớp mô hình 11 và
     tiêu đề, ngày ôn đúng 7/14/21/28, bốn tuần phủ đủ 1–30.
  F. MÔ HÌNH VÀ ĐẾM — dòng JS then chốt của mô hình 9 và 11; chạy lại mô hình giãn cách bằng
     Python để kiểm "×1,15" và "×2,4–3,4"; mô hình 2 và 5 hợp lệ; các con số đếm (20 dạng nén,
     30 lỗi, ~80 động từ trong 9 nhóm, 7 bộ xương câu, 7 luật dấu câu, 20 thành ngữ, 8 bẫy,
     6 cặp to V / V-ing, 3–7–9 âm tiết của ba câu nhịp).

Không kiểm câu chữ hay ví dụ tiếng Anh có tự nhiên không: việc ấy rà bằng tay.
Chỉ dùng thư viện chuẩn, chạy dưới 1 giây.

Chạy:  python3 pages/tools/verify-english.py
Exit code: 1 nếu có con số, tham chiếu hay dòng mã then chốt không khớp.
"""
import html
import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PAGE = ROOT / 'pages' / 'english-from-the-ground-up.html'
SRC = PAGE.read_text(encoding='utf-8')
SCRIPT_AT = SRC.rfind('<script>')
BODY, JS = SRC[:SCRIPT_AT], SRC[SCRIPT_AT:]

fails = []
checks = 0


def ok(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)
    return cond


def text(fragment):
    """Bóc thẻ, giải mã thực thể, gộp khoảng trắng."""
    t = re.sub(r'<[^>]+>', '', fragment)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()


def section(sid):
    a = BODY.index('<section id="%s">' % sid)
    return BODY[a:BODY.index('</section>', a)]


def has(sid, needle, why):
    ok(needle in text(section(sid)), '%s: thiếu "%s" (%s)' % (sid, needle, why))


def vn(x, d=0):
    """Số kiểu Việt: phẩy thập phân, khoảng trắng hàng nghìn."""
    s = ('%.' + str(d) + 'f') % x
    whole, _, frac = s.partition('.')
    whole = re.sub(r'(?<=\d)(?=(\d{3})+$)', ' ', whole)
    return whole + (',' + frac if frac else '')


# ═══════════════════════════ A. CẤU TRÚC ═══════════════════════════
SECS = [(m.start(), m.group(1), int(m.group(2)))
        for m in re.finditer(r'<section id="([^"]+)">\s*<p class="ec-eyebrow-sec">(\d\d) · ', BODY)]
NUM = {sid: n for _, sid, n in SECS}
ok([n for _, _, n in SECS] == list(range(1, len(SECS) + 1)),
   'A: số mục không liền nhau 01..N: %s' % [n for _, _, n in SECS])
N_SEC = len(SECS)
ok('%d MỤC' % N_SEC in BODY, 'A: đầu trang phải ghi "%d MỤC"' % N_SEC)

toc = BODY[BODY.index('<nav class="wb-sidenav ec-toc'):BODY.index('</nav>', BODY.index('<nav class="wb-sidenav ec-toc'))]
toc_ids = [h for h in re.findall(r'href="#([^"]+)"', toc) if h in NUM]
ok(toc_ids == [sid for _, sid, _ in SECS], 'A: mục lục không theo đúng thứ tự mục')

models = [int(n) for n in re.findall(r'<p class="ec-lab__kick">Model (\d+) ·', BODY)]
ok(models == list(range(1, len(models) + 1)), 'A: số mô hình không liền nhau: %s' % models)
NM = len(models)
ok('%d MÔ HÌNH' % NM in BODY, 'A: đầu trang phải ghi "%d MÔ HÌNH"' % NM)
ok('Kèm %d mô hình' % NM in BODY, 'A: meta description phải ghi "Kèm %d mô hình"' % NM)
ok('cho bạn %d mô hình' % NM in BODY, 'A: mục 05 phải ghi "cho bạn %d mô hình"' % NM)

# ═══════════════════════════ B. THAM CHIẾU ═══════════════════════════
# id lồng trong một mục (h3, bảng…) mang số của mục bao nó; part-head thì không có số.
part_heads = [m.start() for m in re.finditer(r'<div class="ec-part-head"', BODY)]
for m in re.finditer(r'\sid="([^"]+)"', BODY):
    sid, pos = m.group(1), m.start()
    if sid in NUM:
        continue
    owner = [(p, s_, n) for p, s_, n in SECS if p <= pos]
    if not owner:
        continue
    p0, s0, n0 = owner[-1]
    end = BODY.index('</section>', p0)
    if pos < end:
        NUM[sid] = n0

REF = re.compile(r'^(?:(?:[Mm]ục|như ở mục) )?(\d\d)(?: · .*)?$')
nref = 0
for m in re.finditer(r'<a href="#([^"]+)">([^<]*)</a>', BODY):
    tid, label = m.group(1), m.group(2).strip()
    mm = REF.match(label)
    if not mm:
        continue
    nref += 1
    line = BODY.count('\n', 0, m.start()) + 1
    if ok(tid in NUM, 'B: dòng %d — "%s" trỏ #%s, không thuộc mục có số' % (line, label, tid)):
        ok(int(mm.group(1)) == NUM[tid],
           'B: dòng %d — "%s" trỏ #%s nhưng đó là mục %02d' % (line, label, tid, NUM[tid]))
ok(nref >= 120, 'B: chỉ thấy %d tham chiếu có số — regex hỏng?' % nref)
# "mục NN" chưa có link (ngoài <script>) thì cổng không kiểm được → bắt phải có link
for m in re.finditer(r'[Mm]ục (\d\d)\b', BODY):
    before = BODY[max(0, m.start() - 60):m.start()]
    linked = re.search(r'<a href="#[^"]+">(?:như ở )?$', before)
    ok(bool(linked), 'B: dòng %d — "%s" chưa có link' % (BODY.count('\n', 0, m.start()) + 1, m.group(0)))
# hai chuỗi trong JS
ok('mỗi bậc lại lùi thì thêm một nấc (xem mục %02d)' % NUM['politeness'] in JS, 'B: JS mô hình 10 phải trỏ mục %02d' % NUM['politeness'])
ok('the team</span> ở mục %02d' % NUM['variants'] in JS, 'B: JS bảng từ vựng (staff) phải trỏ mục %02d' % NUM['variants'])

# ═══════════════════════════ C. DỮ LIỆU NGUỒN ═══════════════════════════
def js_series(name):
    m = re.search(r'var %s\s*=\s*(\[\[.*?\]\]);' % name, JS)
    return [tuple(map(float, p.split(','))) for p in re.findall(r'\[([\d.]+,[\d.]+)\]', m.group(1))]


W, S = js_series('WRITTEN'), js_series('SPOKEN')
# Nation (2006) bảng 5, Lady Chatterley's Lover, cột có tính tên riêng.
NATION_T5 = {1000: 82.93, 2000: 90.14, 3000: 93.28, 4000: 95.06, 5000: 96.13, 6000: 96.88,
             7000: 97.43, 8000: 97.90, 9000: 98.22, 10000: 98.46}
for n, v in W:
    ok(abs(v - NATION_T5[int(n)]) <= 0.051, 'C: WRITTEN[%d]=%s lệch bảng 5 Nation (%s)' % (n, v, NATION_T5[int(n)]))
ok([int(n) for n, _ in W] == sorted(NATION_T5), 'C: WRITTEN phải có đủ 1 000..10 000')
# Bảng 13: hai kho hội thoại, có tên riêng ở 3/6/7 nghìn; 2 nghìn chưa tính tên riêng (≈1,16%).
T13 = {3000: (96.52, 96.03), 6000: (98.26, 97.67), 7000: (98.62, 97.95)}
Sd = dict(S)
for n, (a, b) in T13.items():
    ok(abs(Sd[n] - (a + b) / 2) <= 0.051, 'C: SPOKEN[%d]=%s lệch trung bình bảng 13 (%.3f)' % (n, Sd[n], (a + b) / 2))
pn = (1.29 + 1.03) / 2
ok(abs(Sd[2000] - ((89.41 + 89.35) / 2 + pn)) <= 0.06, 'C: SPOKEN[2000] phải là 89,38 + tên riêng ≈ 90,5')
ok(84 <= Sd[1000] <= 85.5, 'C: SPOKEN[1000] phải quanh 85% (kết luận 1 của Nation 2006)')
for series, name in ((W, 'WRITTEN'), (S, 'SPOKEN')):
    ok(all(b[1] > a[1] for a, b in zip(series, series[1:])), 'C: %s phải tăng ngặt' % name)
ok(all(Sd[n] >= dict(W)[n] for n in Sd), 'C: hội thoại phải phủ cao hơn văn viết ở mọi mức')
ok('id="fq-n" min="%d"' % int(W[0][0]) in BODY, 'C: thanh trượt mục 27 phải bắt đầu ở mức thấp nhất có số liệu')
ok('NMIN = %d' % int(W[0][0]) in JS, 'C: NMIN của mô hình 7 phải bằng mức đầu của mảng')

# Cambridge guided learning hours (cộng dồn) và bảng CEFR của Nation (họ từ).
CAMB = {'A1': '~90–100', 'A2': '~180–200', 'B1': '~350–400', 'B2': '~500–600', 'C1': '~700–800', 'C2': '~1 000–1 200'}
NATION_CEFR = {'A1': 'dưới 1 000', 'A2': '~1 000', 'B1': '~2 000–3 000', 'B2': '~4 000', 'C1': '~5 000–6 000', 'C2': '~7 000–9 000'}
lv = section('levels')
rng = {}
for lvl in CAMB:
    m = re.search(r'<tr><td><b>%s</b></td><td>[^<]*</td><td>([^<]*)</td><td>([^<]*)</td>' % lvl, lv)
    if ok(m, 'C: không thấy dòng %s trong bảng mục 04' % lvl):
        ok(m.group(1) == NATION_CEFR[lvl], 'C: vốn từ %s là "%s", Nation ghi "%s"' % (lvl, m.group(1), NATION_CEFR[lvl]))
        ok(m.group(2) == CAMB[lvl], 'C: giờ học %s là "%s", Cambridge ghi "%s"' % (lvl, m.group(2), CAMB[lvl]))
        lo, hi = [int(x.replace(' ', '')) for x in re.findall(r'[\d ]*\d', m.group(2))]
        rng[lvl] = (lo, hi)
for lvl, h in re.findall(r"\{ id: '(A1|A2|B1|B2|C1|C2)', hours: (\d+)", JS):
    ok(int(h) == sum(rng[lvl]) / 2, 'C: mô hình 1 — giờ của %s là %s, trung điểm bảng là %s' % (lvl, h, sum(rng[lvl]) / 2))
ok("Math.round((nextLv.hours - reachedHours) / 30)" in JS, 'C: mô hình 1 phải đổi giờ ra tháng bằng ÷ 30 (1 giờ/ngày)')

# ═══════════════════════════ D. CON SỐ TRONG BÀI ═══════════════════════════
w1000, w9000 = dict(W)[1000], dict(W)[9000]
first98 = next(int(n) for n, v in W if v >= 98)
has('frequency', 'khoảng %d%% số chữ' % round(w1000), 'độ phủ 1 000 họ từ')
has('frequency', 'cần khoảng %s' % vn(first98), 'mức đầu tiên chạm 98%')
has('frequency', 'chỉ mua thêm %d điểm phần trăm' % round(w9000 - w1000), '98 − 83')
ok(Sd[3000] > 95 and 'cộng tên riêng phủ hơn 95% hội thoại' in text(BODY), 'D: ô đầu trang "3 000 họ từ … hơn 95%" phải khớp SPOKEN[3000]')
yrs = 1200 / 365
ok(3 < yrs < 4 and '≈ hơn 3 năm' in BODY, 'D: ô đầu trang — 1 200 giờ ÷ 365 = %.2f năm' % yrs)
# đoạn "Ba con số" mục 04: bước cộng thêm tính từ cận trên làm tròn
tops = [100, 200, 400, 600, 800, 1200]
ok(all(abs(t - rng[l][1]) <= rng[l][1] * 0.12 for t, l in zip(tops, CAMB)), 'D: dãy 100 → … → 1 200 lệch cận trên của bảng')
steps = [b - a for a, b in zip([0] + tops, tops)]
ok(steps == [100, 100, 200, 200, 200, 400], 'D: bước cộng thêm tính lại = %s' % steps)
has('levels', 'mỗi bước cộng thêm 100, 100, 200, 200, 200 rồi 400', 'bước giờ học')
c1c2 = sum(rng['C2']) / 2 - sum(rng['C1']) / 2
ok(abs(c1c2 - sum(rng['B1']) / 2) / (sum(rng['B1']) / 2) < 0.1, 'D: "C1→C2 bằng cả quãng 0→B1": %s vs %s' % (c1c2, sum(rng['B1']) / 2))
ok(sum(rng['C1']) / 2 - sum(rng['B2']) / 2 == 200, 'D: "B2 lên C1 khoảng 200 giờ"')
has('levels', 'khoảng 200 giờ trên giấy', 'B2 → C1')
for lo_n in (5000, 6000, 7000, 8000, 9000):
    gain = dict(W)[lo_n] - dict(W)[lo_n - 1000]
    ok(gain <= 1.1, 'D: "mỗi nghìn từ vùng C thêm khoảng 1%% hoặc ít hơn" sai ở %d: +%.2f' % (lo_n, gain))
has('memory', '%s–%s thẻ' % (vn(10 * 365), vn(15 * 365)), '10–15 thẻ × 365')
# Destination
units = {'B1': 42, 'B2': 28, 'C1': 26}
for b_, u in units.items():
    ok('<b>%d unit</b>' % u in section('coursebooks'), 'D: bảng mục 05 phải ghi %d unit cho %s' % (u, b_))
has('coursebooks', 'Làm hết %d unit' % sum(units.values()), '42 + 28 + 26')
has('coursebooks', '%d chủ đề trong ba quyển' % (14 + 14 + 13), '14 + 14 + 13')
wk = 52 / 12
ok(round(42 / 2 / wk) == 5 and round(28 / 2 / wk) == 3 and round(70 / 2 / wk) == 8, 'D: nhịp 2 unit/tuần không ra 5 / 3 / 8 tháng')
has('coursebooks', 'B1 hết trong ~5 tháng · B2 thêm ~3 tháng', 'nhịp 2 unit/tuần')
has('coursebooks', '(%d unit ÷ 2 = %d tuần)' % (42 + 28, (42 + 28) // 2), 'tổng unit B1 + B2')
has('coursebooks', '2 unit/tuần = %d phút/tuần THÊM' % (2 * 55), '2 × 55')
# lịch một giờ
rt = section('routine')
mins = [int(x) for x in re.findall(r"<b>(\d+)'</b>\s+\S", rt)]
ok(sum(mins) == 60 and len(mins) == 5, 'D: năm khối mục %02d cộng lại %d phút, không phải 60' % (NUM['routine'], sum(mins)))
ok("25' + 10' + 20' + 5' = 60'" in rt and 25 + 10 + 20 + 5 == 60, 'D: tổng ở bảng ghép ngày làm việc')
ok("10' chép chính tả + 10' thẻ SRS" in rt, 'D: sàn 20 phút = 10 + 10')
# lịch 30 ngày: khung giới hạn
sp = section('sprint')
lo_h, hi_h = 30 * 1.5, 30 * 3
b1b2 = (rng['B2'][0] - rng['B1'][0], rng['B2'][1] - rng['B1'][1])
ok(b1b2 == (150, 200), 'D: B1 → B2 theo bảng là %s giờ' % (b1b2,))
has('sprint', '%d–%d giờ' % (lo_h, hi_h), '30 × 1,5–3')
has('sprint', '%d–%d giờ' % b1b2, 'B2 − B1 theo bảng Cambridge')
has('sprint', '≈ %s–%s bậc' % (vn(math.floor(lo_h / b1b2[1] * 10) / 10, 1), vn(round(hi_h / b1b2[0], 1), 1)), '45 ÷ 200 tới 90 ÷ 150')
# khung mới mỗi ngày lấy từ khối 3; ngày ôn không thêm khung mới
kmin, kmax = [int(x) for x in re.search(r'<td>(\d+)–(\d+) khung của tình huống hôm nay', sp).groups()]
new_days = 30 - 4
ok(new_days == 30 - len([7, 14, 21, 28]), 'D: số ngày học khung mới')
has('sprint', '%d–%d khung mỗi ngày × %d ngày học mới ≈ %d–%d khung' % (kmin, kmax, new_days, round(kmin * new_days, -1), kmax * new_days),
    'khối 3 × 26 ngày')
has('sprint', 'khoảng %d khung đầu tiên' % round(6 * (kmin + kmax) / 2, -1), 'tuần 1: 6 ngày học mới × 8–10')
gap = (int(NATION_CEFR['B2'].strip('~').replace(' ', '')) - 3000, int(NATION_CEFR['B2'].strip('~').replace(' ', '')) - 2000)
has('sprint', 'khoảng %s–%s họ từ giữa B1 và B2' % (vn(gap[0]), vn(gap[1])), 'B2 − B1 theo bảng Nation')
blk = sp[sp.index('id="sp-blocks"'):sp.index('</table>', sp.index('id="sp-blocks"'))]
rows = re.findall(r"<tr><td><b>(\d) · [^<]*</b></td><td>([^<]*)</td><td>([^<]*)</td><td>([^<]*)</td>", blk)
ok(len(rows) == 9, 'D: bảng một ngày phải có 9 khối, thấy %d' % len(rows))
tot = re.search(r"<td><b>Tổng</b></td><td><b>(\d+)'</b></td><td><b>(\d+)'</b></td><td><b>(\d+)'</b></td>", blk)
for k, name in enumerate(('Đủ', 'Chuẩn', 'Bận')):
    col = sum(int(r[k + 1].rstrip("'")) for r in rows if r[k + 1] != '—')
    ok(tot and col == int(tot.group(k + 1)), 'D: cột %s cộng lại %d phút, dòng Tổng ghi %s' % (name, col, tot and tot.group(k + 1)))
ok(tot and int(tot.group(2)) == 90 and int(tot.group(1)) == 180, 'D: Chuẩn phải là 1,5 giờ và Đủ là 3 giờ (đúng khung 1,5–3 giờ)')
ok('phương án <b>%s phút</b>' % tot.group(3) in BODY, 'D: hộp đầu trang phải ghi đúng số phút của cột Bận')

# ═══════════════════════════ E. LỊCH 30 NGÀY ═══════════════════════════
plan = sp[sp.index('id="sp-plan"'):sp.index('</table>', sp.index('id="sp-plan"'))]
days = re.findall(r'<tr><td><b>(\d+)</b></td><td>(.*?)</td><td>(.*?)</td></tr>', plan)
ok([int(d) for d, _, _ in days] == list(range(1, 31)), 'E: bảng từng ngày phải có đủ ngày 1..30 liền nhau')
for d, say, write in days:
    ok('<a href="#' in say, 'E: ngày %s không có link lý thuyết' % d)
    ok(text(write) != '', 'E: ngày %s thiếu bài viết' % d)
measure_days = [int(d) for d, say, _ in days if re.match(r'<b>Đo( mốc| cuối)?\.</b>', say)]
review_days = [int(d) for d, say, _ in days if say.startswith('<b>Ôn.</b>')]
m11 = [int(x) for x in re.search(r'var DAYS = \[([\d, ]+)\]', JS).group(1).split(',')]
ok(measure_days == m11 == [1, 8, 15, 22, 29], 'E: ngày đo trong bảng %s, mô hình 11 %s' % (measure_days, m11))
ok(all(b - a == 7 for a, b in zip(m11, m11[1:])), 'E: các mốc đo phải cách nhau 7 ngày')
ok('ngày %s' % ', '.join(map(str, m11[:-1])) + ', %d' % m11[-1] in text(sp), 'E: tiêu đề mục đo phải liệt kê đúng ngày đo')
ok(review_days == [7, 14, 21, 28], 'E: ngày ôn phải là 7/14/21/28, thấy %s' % review_days)
weeks = re.findall(r'ngày (\d+)–(\d+)</span>', sp[sp.index('id="sp-weeks"'):sp.index('id="sp-days"')])
cov = sorted(d for a, b in weeks for d in range(int(a), int(b) + 1))
ok(cov == list(range(1, 31)), 'E: bốn tuần phải phủ đúng ngày 1..30 không chồng: %s' % weeks)

# ═══════════════════════════ F. MÔ HÌNH VÀ ĐẾM ═══════════════════════════
# mô hình 9: chạy lại công thức bằng Python
m = re.search(r'S = S \* \(([\d.]+) \+ ([\d.]+) \* \(1 - r\)\);', JS)
ok(m, 'F: mô hình 9 mất dòng nhân độ bền')
base, k = float(m.group(1)), float(m.group(2))
spaced = [int(x) for x in re.search(r'SPACED = \[([\d, ]+)\]', JS).group(1).split(',')]
ok(spaced == [1, 3, 7, 21, 60], 'F: lịch giãn cách phải là 1–3–7–21–60 như lede mục 32')
has('memory', '1 ngày → 3 ngày → 1 tuần → 3 tuần → 2 tháng', 'lịch giãn cách')
Sx, last, fac = 1.0, 0, []
for t in spaced:
    r = math.exp(-(t - last) / Sx)
    f = base + k * (1 - r)
    fac.append(f)
    Sx *= f
    last = t
has('memory', 'chỉ ×%s' % vn(base, 2), 'ôn ngay khi vừa học: r = 1')
has('memory', 'khoảng ×%s–%s' % (vn(min(fac), 1), vn(max(fac), 1)), 'hệ số của lịch 1–3–7–21–60 = %s' % [round(f, 2) for f in fac])
# mô hình 11: dòng then chốt
for line in ("wpm: w === null ? null : w / 2", "ppm: p === null ? null : p / 2",
             "var epw = (e === null || !w) ? null : e / w * 100;", "e: epw,",
             "var dw = (b.wpm - a.wpm) / a.wpm * 100;", "if (dw >= 5 && de !== null && de > 0)",
             "if (dw >= 5 && de === null)",
             "try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {}"):
    ok(line in JS, 'F: mô hình 11 mất dòng "%s"' % line)
ok('Số từ / 2 phút' in BODY and 'Lần ngập ≥ 1 giây' in BODY, 'F: nhãn ô nhập mô hình 11 phải nói rõ bản ghi 2 phút')
# mô hình 2: chỉ số âm nhấn hợp lệ, ba từ photo- nhấn ba chỗ
W2 = re.findall(r"\{ s: \[([^\]]+)\], a: (\d+)", JS)
photo = {}
for sy, a in W2:
    syl = [x.strip(" '") for x in sy.split(',')]
    ok(int(a) < len(syl), 'F: mô hình 2 — chỉ số nhấn vượt số âm tiết: %s' % syl)
    if syl[0] == 'pho':
        photo[''.join(syl)] = int(a)
ok(len(W2) == 12 and sorted(photo.values()) == [0, 1, 2], 'F: mô hình 2 phải có 12 từ, ba từ photo- nhấn ba chỗ: %s' % photo)
has('stress', '~94% danh từ nhưng chỉ ~69% động từ', 'Kelly & Bock 1988')
# mô hình 5: đáp án hợp lệ, câu hỏi Q khớp loại đáp án
qarr = JS[JS.index('var Q = ['):JS.index('];', JS.index('var Q = ['))]
qs = re.findall(r"\['[^']*', '[^']*', '(a|an|the|—)', '([^']*)'\]", qarr)
ok(len(qs) == 12, 'F: mô hình 5 phải có 12 câu, thấy %d' % len(qs))
for ans, why in qs:
    q = re.findall(r'Q(\d)', why)
    if not q:
        continue
    want = {'the': {'1', '2'}, 'a': {'3'}, 'an': {'3'}, '—': {'4'}}[ans]
    ok(set(q) <= want, 'F: mô hình 5 — đáp án "%s" mà lời giải dẫn Q%s' % (ans, q))
art = section('articles')
order = re.findall(r'<b>Q(\d)\.</b> ([^\n]*)', art)
ok([o[0] for o in order] == ['1', '2', '3', '4'] and 'TÊN RIÊNG' in order[0][1],
   'F: quy trình mạo từ phải hỏi tên riêng trước (Q1)')
# đếm
weak = section('rhythm')
weak = weak[weak.index('Dạng nén của'):]
nweak = len(re.findall(r'→ <b>', weak[:weak.index('</div>')]))
ok(nweak == 20 and 'Dạng nén của 20 từ' in section('rhythm'), 'F: mục 09 hứa 20 dạng nén, thấy %d' % nweak)
beats = re.findall(r'<div class="ec-beat">(.*?)</div>', section('rhythm'))
ok([len(re.findall(r'<span', b)) for b in beats] == [3, 7, 9], 'F: ba câu nhịp phải có 3 / 7 / 9 âm tiết')
ok([len(re.findall(r'class="s"', b)) for b in beats] == [3, 3, 3], 'F: ba câu nhịp phải cùng 3 âm nhấn')
has('rhythm', 'gấp ba số âm tiết', '9 ÷ 3')
err = section('ref-errors')
ok(len(re.findall(r'<tr><td class="ec-bad">', err)) == 30 and '30 lỗi' in err, 'F: mục lỗi phải có đúng 30 dòng')
vb = section('ref-verbs')
groups = re.findall(r'<tr><td><b>\d\. [^<]*</b>.*?<td class="ec-mono">(.*?)</td></tr>', vb)
nverb = sum(len([x for x in text(re.sub(r'<span class="c">.*?</span>', '', g)).split('·') if x.strip()]) for g in groups)
ok(len(groups) == 9 and 75 <= nverb <= 85 and '~80 động từ' in vb and '<b>9 nhóm</b>' in vb,
   'F: bảng động từ bất quy tắc: %d nhóm, %d động từ — trang ghi 9 nhóm, ~80' % (len(groups), nverb))
cl = section('clause')
ok(len(re.findall(r'<tr><td class="ec-mono"><b>S \+ V', cl)) == 7 and 'bảy bộ xương' in cl, 'F: mục 13 phải có đúng 7 bộ xương')
ok('câu 13 chữ' in cl and len('The old dogs next door bark whenever the postman comes to the gate'.split()) == 13,
   'F: chú thích hình mục 13 phải đếm 13 chữ')
pu = section('punctuation')
ok(len(re.findall(r'<tr><td><b>', pu)) == 7 and 'Bảy luật' in pu, 'F: mục dấu câu phải có 7 luật')
idi = section('idioms')
ok(len(re.findall(r'<tr><td class="ec-mono">', idi)) == 20 and '20 thành ngữ' in idi, 'F: mục 31 phải có 20 thành ngữ')
tr = section('traps')
ok(len(re.findall(r'<tr><td>\d</td>', tr)) == 8 and 'Tám cái bẫy' in tr, 'F: mục bẫy phải có 8 dòng')
nf = section('nonfinite')
ok(len(re.findall(r'<tr><td class="ec-mono"><b>', nf)) == 6 and 'Sáu cặp' in nf, 'F: mục 23 phải có 6 cặp')

# ═══════════════════════════ kết quả ═══════════════════════════
if fails:
    print('verify-english: %d/%d phép kiểm SAI' % (len(fails), checks))
    for f in fails:
        print('  ✗', f)
    sys.exit(1)
print('verify-english: OK — %d phép kiểm, %d mục, %d tham chiếu số mục, mọi con số tính lại được.' % (checks, N_SEC, nref))
