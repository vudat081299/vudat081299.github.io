#!/usr/bin/env python3
"""Cổng kiến thức cho pages/jazz-piano-theory.html — tính lại từng nốt nhạc trang nói ra.

Vì sao cần: trang dạy bằng hàng trăm khẳng định kiểm được — "bậc 7 của Dm7 trượt nửa cung
xuống bậc 3 của G7", "G/B chỉ là G đổi bass", "mỗi nốt của gam thuộc đúng ba hợp âm ba",
"bảy nốt mốc chia khuông kép thành đoạn không quá 3 bậc". lint-pages.py kiểm được thẻ lệch
nhưng không biết nốt A♭ có phải ♭9 của G7 hay không. Và trang có năm trụ đánh số "PHẦN NN"
tay: chèn một mục mới là mọi chữ "phần 07" phía sau lệch âm thầm — đã xảy ra hai lần trước
khi cổng này có (20+ tham chiếu trỏ sai lúc rà ngày 27/09/2026).

Dữ liệu của các demo mới nằm trong các khối <script type="application/json"> ngay trong trang
(trang phải chạy cả khi mở bằng file://, nên không tách ra data/*.json được). Cổng đọc đúng
những khối đó — cùng một nguồn với thứ người đọc nghe thấy.

Chạy:  python3 pages/tools/verify-jazz-piano.py        (exit 1 nếu có LỖI)
"""
import json
import pathlib
import re
import sys

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'jazz-piano-theory.html'
PAGES = ['pages/jazz-piano-theory.html']  # run-verify.py đọc dòng này để biết cổng kiểm trang nào

ERR = []
N_OK = 0


def ok(cond, msg):
    global N_OK
    if cond:
        N_OK += 1
    else:
        ERR.append(msg)
    return cond


# ─────────────────────────── nhạc lý: ký hiệu hợp âm ───────────────────────────
LET = 'CDEFGAB'
NAT = [0, 2, 4, 5, 7, 9, 11]


def acc(a):
    return {'♯': 1, '#': 1, '♭': -1, 'b': -1}.get(a, 0)


QUALS = {
    '': [0, 4, 7], 'm': [0, 3, 7], '°': [0, 3, 6], '+': [0, 4, 8], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7],
    '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9], 'add9': [0, 4, 7, 2], '69': [0, 4, 7, 9, 2],
    'maj7': [0, 4, 7, 11], 'maj9': [0, 4, 7, 11, 2], 'm7': [0, 3, 7, 10], 'm(maj7)': [0, 3, 7, 11],
    'm7♭5': [0, 3, 6, 10], '°7': [0, 3, 6, 9], '7': [0, 4, 7, 10], '7♭9': [0, 4, 7, 10, 1],
    '7sus4': [0, 5, 7, 10], '9': [0, 4, 7, 10, 2], '13': [0, 4, 7, 10, 2, 9],
}
QALIAS = {'6/9': '69', 'ø7': 'm7♭5', 'm7b5': 'm7♭5', 'dim7': '°7'}
KIND = {'m': 'min', 'm6': 'min', 'm7': 'min', 'm(maj7)': 'min', 'm7♭5': 'hdim', '°': 'dim', '°7': 'dim',
        '7': 'dom', '7♭9': 'dom', '7sus4': 'dom', '9': 'dom', '13': 'dom'}
LABEL_OVR = {'': {2: '2', 5: '4', 9: '6'}, 'm': {2: '2', 5: '4', 8: '♭6', 9: '6'}, '6': {9: '6'}, 'm6': {9: '6'},
             'add9': {5: '4'}, '69': {9: '6'}, '°7': {9: '𝄫7'}, '7sus4': {5: '4'}, 'sus4': {2: '2', 5: '4'},
             'sus2': {2: '2'}, '+': {8: '♯5'}}
DL = {0: '1', 1: '♭9', 2: '9', 3: '♯9', 4: '3', 5: '11', 6: '♯11', 7: '5', 8: '♭13', 9: '13', 10: '♭7', 11: '7'}
# bậc (nhãn) → số nửa cung — để kiểm mọi nhãn ghi đè trong dữ liệu
DEG_SEMI = {'1': 0, '♭9': 1, '9': 2, '♯9': 3, '2': 2, '♭3': 3, '3': 4, '4': 5, '11': 5, '♯11': 6, '♭5': 6,
            '5': 7, '♯5': 8, '♭6': 8, '♭13': 8, '6': 9, '13': 9, '𝄫7': 9, '♭7': 10, '7': 11}
RE_SYM = re.compile(r'^([A-G])([♯#♭b]?)(.*?)(?:/([A-G])([♯#♭b]?))?$')


def parse(sym):
    m = RE_SYM.match(sym.strip())
    if not m:
        return None
    q = QALIAS.get(m.group(3), m.group(3))
    if q not in QUALS:
        return None
    root = (NAT[LET.index(m.group(1))] + acc(m.group(2))) % 12
    c = {'sym': sym, 'pc': root, 'q': q, 'ct': [x % 12 for x in QUALS[q]], 'kind': KIND.get(q, 'maj')}
    c['pcs'] = {(root + x) % 12 for x in c['ct']}
    c['bass'] = root
    if m.group(4):
        c['bass'] = (NAT[LET.index(m.group(4))] + acc(m.group(5))) % 12
    return c


def deg(c, midi):
    iv = (midi - c['pc']) % 12
    o = LABEL_OVR.get(c['q'], {})
    if iv in o:
        return o[iv]
    if c['kind'] in ('min', 'hdim', 'dim') and iv == 3:
        return '♭3'
    if c['kind'] in ('hdim', 'dim') and iv == 6:
        return '♭5'
    return DL[iv]


def is_ct(c, midi):
    return (midi - c['pc']) % 12 in c['ct']


def note_name(midi):
    return ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][midi % 12] + str(midi // 12 - 1)


def check_voicing(where, sym, bass, up):
    c = parse(sym)
    if not ok(c is not None, f'{where}: không đọc được ký hiệu "{sym}"'):
        return None
    ok(bass % 12 == c['bass'], f'{where}: {sym} — bass {note_name(bass)} không phải {"bass gạch chéo" if c["bass"] != c["pc"] else "gốc"} của hợp âm')
    stray = [note_name(n) for n in up if n % 12 not in c['pcs']]
    ok(not stray, f'{where}: {sym} — voicing có nốt ngoài hợp âm: {", ".join(stray)}')
    missing = [x for x in c['ct'] if x in (3, 4) and (c['pc'] + x) % 12 not in {n % 12 for n in up} | {bass % 12}]
    ok(not missing, f'{where}: {sym} — voicing thiếu bậc 3 (mất tính trưởng/thứ)')
    return c


# ─────────────────────────── đọc trang ───────────────────────────
raw = PAGE.read_text(encoding='utf-8')
blocks = {m.group(1): m.group(2) for m in re.finditer(
    r'<script type="application/json" id="([^"]+)">(.*?)</script>', raw, re.S)}
DATA = {}
for k, v in blocks.items():
    try:
        DATA[k] = json.loads(v)
        ok(True, '')
    except ValueError as e:
        ok(False, f'khối JSON #{k} không hợp lệ: {e}')

# ═══════════ A. Đánh số "PHẦN NN" và tham chiếu chéo ═══════════
docs = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="doc[^"]*" id="(doc-[^"]+)"', raw)]


def doc_at(pos):
    cur = None
    for p, d in docs:
        if p <= pos:
            cur = d
    return cur


sections = {}
per_doc = {}
for m in re.finditer(r'<section class="concept" id="([^"]+)"', raw):
    sid = m.group(1)
    eb = re.search(r'sec-eyebrow">PHẦN (\d{2})', raw[m.end():m.end() + 600])
    if eb is None:          # vd. mục "TIẾP THEO" cuối trụ ① — không đánh số, không ai trỏ tới bằng số
        continue
    sections[sid] = (doc_at(m.start()), int(eb.group(1)))
    per_doc.setdefault(doc_at(m.start()), []).append(int(eb.group(1)))
for d, nums in per_doc.items():
    ok(nums == list(range(1, len(nums) + 1)), f'{d}: số "PHẦN" không liền mạch 01..{len(nums):02d}: {nums}')

xrefs = re.findall(r'<a class=\\?"xref\\?" href=\\?"#([^"\\]+)\\?">(.*?)</a>', raw)
ok(len(xrefs) > 80, f'chỉ thấy {len(xrefs)} tham chiếu xref — regex hỏng?')
for target, text in xrefs:
    if not ok(target in sections, f'xref trỏ tới #{target}: không có mục nào như vậy'):
        continue
    num = re.search(r'\d{2}', text)
    if num:
        ok(int(num.group(0)) == sections[target][1],
           f'xref "{text}" → #{target} nhưng mục đó là PHẦN {sections[target][1]:02d} ({sections[target][0]})')

# chữ "phần NN / mục NN" trơn, không nằm trong xref: sẽ lệch âm thầm lần chèn mục sau
plain = re.sub(r'<a class=\\?"xref\\?"[^>]*>.*?</a>', '', raw)
loose = [m.group(0) for m in re.finditer(r'(?<![A-ZĐ])(?:[Pp]hần|[Mm]ục)\s+(?:<b>)?\d{2}', plain)]
ok(not loose, f'{len(loose)} tham chiếu "phần/mục NN" chưa thành link xref: {loose[:5]}')

# ═══════════ B. Sáu lớp đệm (lay-data) ═══════════
L = DATA.get('lay-data')
if L:
    segs = {}
    for key, rows in L['seg'].items():
        t = 0
        segs[key] = []
        for sym, beats, bass, up in rows:
            c = check_voicing(f'lay-data {key} ô {t // 4 + 1}', sym, bass, up)
            segs[key].append((t, beats, sym, bass, up, c))
            t += beats
        ok(t == 36, f'lay-data {key}: tổng {t} phách, phải là 36 (9 ô)')
    mel = L['mel']
    ms = sorted(mel, key=lambda x: x[1])
    ok(all(a[1] + a[2] <= b[1] + 1e-9 for a, b in zip(ms, ms[1:])), 'lay-data: hai nốt hát chồng lên nhau')
    ok(abs(ms[-1][1] + ms[-1][2] - 36) < 1e-9, 'lay-data: giai điệu phải kết đúng hết ô 9 (phách 36)')

    def chord_at(key, beat):
        cur = None
        for s in segs[key]:
            if s[0] <= beat + 1e-9:
                cur = s
        return cur

    # giai điệu "vừa" bảng hợp âm gốc: nốt ở phách 1 và phách 3 của mỗi ô là nốt hợp âm
    for n, t, d in mel:
        if abs(t % 2) < 1e-9:
            s = chord_at('L0', t)
            ok(is_ct(s[5], n), f'lay-data: nốt {note_name(n)} ở phách {t} không thuộc {s[2]} (bảng gốc)')
    # mốc 1: "nốt trên cùng đi G–G–A–G–F–E–F–G–G, không nốt nào nhảy quá một bước"
    top = [max(s[4]) for s in segs['L1']]
    ok(top == [67, 67, 69, 67, 65, 64, 65, 67, 67], f'lay-data L1: nốt trên cùng là {[note_name(x) for x in top]}, bài nói G–G–A–G–F–E–F–G–G')
    ok(max(abs(a - b) for a, b in zip(top, top[1:])) <= 2, 'lay-data L1: nốt trên cùng có bước nhảy quá một bậc')
    ok([s[2] for s in segs['L0']] == [s[2] for s in segs['L1']], 'lay-data: mốc 1 phải cùng bảng hợp âm với mốc 0 ("cùng chín hợp âm")')
    # mốc 2: "chỉ đổi nốt thấp nhất: C–B–A–G–F–E–D rồi G–C; ba hợp âm thành gạch chéo"
    ok([s[4] for s in segs['L1']] == [s[4] for s in segs['L2']], 'lay-data: mốc 2 phải giữ nguyên tay phải của mốc 1 ("chỉ đổi nốt thấp nhất")')
    ok([s[3] % 12 for s in segs['L2']] == [0, 11, 9, 7, 5, 4, 2, 7, 0], 'lay-data L2: bass phải là C–B–A–G–F–E–D–G–C')
    ok(all(0 < s[3] - n <= 2 for s, n in zip(segs['L2'][:6], [x[3] for x in segs['L2'][1:7]])), 'lay-data L2: bass C→D phải đi xuống từng bậc')
    ok(sum('/' in s[2] for s in segs['L2']) == 3, 'lay-data L2: bài nói đúng ba hợp âm gạch chéo')
    for s1, s2 in zip(segs['L1'], segs['L2']):
        ok(s1[5]['pcs'] == s2[5]['pcs'], f'lay-data: {s2[2]} phải cùng bộ nốt với {s1[2]} (chỉ đổi bass)')
    # mốc 4: màu nằm bên trong — không nốt tay phải nào lọt vào vùng giọng hát
    # "không nốt màu nào lọt vào vùng giọng hát": trong từng ô, tay phải nằm dưới mọi nốt đang hát ở ô đó
    for s in segs['L4']:
        sung = [n for n, a, d in mel if a < s[0] + s[1] and a + d > s[0]]
        if sung:
            ok(max(s[4]) < min(sung), f'lay-data L4: {s[2]} có nốt tay phải chạm tới nốt đang hát')
    l4 = {s[2]: s for s in segs['L4']}
    ok(60 in l4['G7sus4'][4] and 59 in l4['G7'][4] and 60 not in l4['G7'][4], 'lay-data L4: G7sus4 phải treo Đô rồi nhả về Si')
    b = [s[3] for s in segs['L4']]
    ok(b[5:8] == [40, 39, 38], 'lay-data L4: E♭°7 phải cho bass đi E → E♭ → D')
    # quãng 9 thứ (nốt hát trên một nốt tay phải đúng 13 nửa cung) ở phách mạnh — chỗ chói dễ sót
    for n, t, d in mel:
        if abs(t % 1) < 1e-9:
            s = chord_at('L4', t)
            ok(not any(n - x == 13 for x in s[4]), f'lay-data L4: nốt hát {note_name(n)} ở phách {t} cách {s[2]} một quãng 9 thứ')
    # mốc 5: fill đúng ba chỗ ca sĩ nghỉ, cao hơn phần đệm, xong trước khi ca sĩ vào lại
    onsets = sorted(t for _, t, _ in mel)
    bars = sorted({int(t // 4) + 1 for _, t, _ in L['fills']})
    ok(bars == [2, 4, 8], f'lay-data: fill nằm ở ô {bars}, bài nói ô 2, 4 và 8')
    for n, t, d in L['fills']:
        nxt = min(x for x in onsets if x > t)
        ok(t + d <= nxt + 1e-9, f'lay-data: fill {note_name(n)} ở phách {t} lấn sang câu hát (vào lại ở {nxt})')
        ok(not any(a <= t < a + dd - 1e-9 for _, a, dd in mel), f'lay-data: fill {note_name(n)} ở phách {t} đè lên nốt đang hát')
        ok(n > max(max(s[4]) for s in segs['L4']), f'lay-data: fill {note_name(n)} không cao hơn phần đệm')
    sung6 = sum(d for _, t, d in mel if 20 <= t < 24)
    ok(sung6 < 4, 'lay-data: bài nói ô 6 "cũng có một phách trống"')
    # mốc 6: to dần tới ô 7, chậm dần ở cuối
    ok(L['dyn'].index(max(L['dyn'])) == 6, 'lay-data: bài nói sắc thái lớn nhất ở ô 7')
    ok(all(a <= b for a, b in zip(L['rit'], L['rit'][1:])) and L['rit'][0] >= 1, 'lay-data: ritardando phải chậm dần')

# ═══════════ C. Hợp âm nối (pass-data) ═══════════
P = DATA.get('pass-data') or []
for it in P:
    for part in ('before', 'after'):
        for sym, beats, bass, up in it[part]:
            check_voicing(f'pass-data "{it["label"]}" ({part})', sym, bass, up)
    ok(sum(x[1] for x in it['before']) == sum(x[1] for x in it['after']), f'pass-data "{it["label"]}": trước và sau phải cùng độ dài')
byl = {it['label']: it for it in P}


def bassline(label):
    return [x[2] for x in byl[label]['after']]


def tops(label):
    return [max(x[3]) for x in byl[label]['after']]


if P:
    ok([b % 12 for b in bassline('Bass đi xuống')] == [0, 11, 9], 'pass-data: "bass đi xuống" phải là C → B → A')
    ok([b % 12 for b in bassline('Bass đi lên')] == [0, 4, 5, 6, 7], 'pass-data: "bass đi lên" phải là C → E → F → F♯ → G')
    ok(all(b > a for a, b in zip(bassline('Bass đi lên'), bassline('Bass đi lên')[1:])), 'pass-data: bass đi lên phải thật sự đi lên')
    s4 = byl['Treo rồi nhả']['after']
    ok(0 in {n % 12 for n in s4[0][3]} and 11 in {n % 12 for n in s4[1][3]}, 'pass-data: Gsus4 giữ C rồi nhả xuống B')
    ok(11 not in parse('F/G')['pcs'], 'pass-data: bài nói F/G không có nốt dẫn Si')
    ok(tops('Át phụ E7 → Am')[1:] == [68, 69], 'pass-data: nốt trên cùng phải là G♯ → A')
    ok(tops('iv thứ mượn') == [69, 68, 67], 'pass-data: đường A → A♭ → G phải nằm ở nốt trên cùng')
    ok(tops('Line cliché') == [69, 68, 67, 66], 'pass-data: line cliché A → G♯ → G → F♯ ở nốt trên cùng')
    ok([b % 12 for b in bassline('°7 nối')] == [0, 1, 2], 'pass-data: °7 nối phải cho bass C → C♯ → D')

# ═══════════ D. Fill (fill-data) ═══════════
F = DATA.get('fill-data')
if F:
    fch, t = [], 0
    for sym, beats, bass, up in F['ch']:
        fch.append((t, beats, check_voicing('fill-data', sym, bass, up)))
        t += beats
    fmel = F['mel']
    fon = sorted(x[1] for x in fmel)

    def fchord(beat):
        return [c for a, bb, c in fch if a <= beat < a + bb][0]

    for v in F['v']:
        if v.get('loud'):
            ok(any(any(a <= x[1] < a + d for _, a, d in fmel) for x in v['n']), 'fill-data: ví dụ "quá tay" phải thật sự đè lên câu hát')
            continue
        for n, a, d in v['n']:
            nxt = min(x for x in fon if x > a)
            ok(a + d <= nxt + 1e-9, f'fill-data "{v["label"]}": nốt ở phách {a} lấn sang câu hát')
            ok(any(g0 <= a < g1 for g0, g1 in F['gaps']), f'fill-data "{v["label"]}": nốt ở phách {a} nằm ngoài chỗ trống')
    vv = {v['label']: v for v in F['v']}
    for n, a, d in vv['Rải hợp âm']['n']:
        ok(is_ct(fchord(a), n), f'fill-data: "rải hợp âm" có nốt {note_name(n)} ngoài hợp âm')
    for g0, g1 in F['gaps']:
        tail = [n for n, a, d in sorted(fmel, key=lambda x: x[1]) if a < g0][-3:]
        echo = [n for n, a, d in vv['Nhại đuôi câu']['n'] if g0 <= a < g1]
        ok(echo == [x - 12 for x in tail], f'fill-data: "nhại đuôi câu" ở phách {g0} phải là 3 nốt cuối vừa hát, thấp một quãng 8')
        nb = [c for a, bb, c in fch if a == g1][0]['bass']
        walk = [n for n, a, d in vv['Bass đi']['n'] if g0 <= a < g1]
        ok(walk[-1] % 12 == (nb + 1) % 12, f'fill-data: "bass đi" ở phách {g0} phải dừng nửa cung trên bass kế')
        pent = [n for n, a, d in vv['Ngũ cung chạy']['n'] if g0 <= a < g1]
        nxt = min(n for n, a, d in fmel if a >= g1)
        ok(abs(pent[-1] - nxt) <= 2, f'fill-data: "ngũ cung chạy" ở phách {g0} phải kết cách nốt hát kế một bước')

# ═══════════ E. Tự đặt hợp âm (hz-data + bảng "đúng ba hợp âm") ═══════════
H = DATA.get('hz-data')
if H:
    opt = {o[0]: check_voicing('hz-data', o[0], o[1], o[2]) for o in H['opts']}
    strong = [[n for n, a, d in H['mel'] if a == 2 * i][0] for i in range(8)]
    for i, sym in enumerate(H['common']):
        ok(strong[i] % 12 in opt[sym]['pcs'], f'hz-data: đáp án phổ biến ô {i + 1} ({sym}) không chứa nốt ở phách mạnh')
    ok(H['common'][0] == 'C' and H['common'][-1] == 'C' and H['common'][-2] == 'G', 'hz-data: đáp án phải có I ở đầu/cuối, V trước ô cuối')
diat = {'C': 'C', 'Dm': 'Dm', 'Em': 'Em', 'F': 'F', 'G': 'G', 'Am': 'Am', 'B°': 'B°'}
triads = {k: parse(k) for k in diat}
for pc, letter in zip(NAT, LET):
    homes = [k for k, c in triads.items() if pc in c['pcs']]
    ok(len(homes) == 3, f'"mỗi nốt thuộc đúng ba hợp âm ba": nốt {letter} thuộc {homes}')
    row = re.search(r'<tr><td><b>[^<]*\(' + letter + r'\)</b></td><td>([^<]+)</td><td>([^<]+)</td><td>([^<]+)</td></tr>', raw)
    if ok(row is not None, f'bảng "ba hợp âm" thiếu dòng cho nốt {letter}'):
        want = {}
        for k, c in triads.items():
            if pc not in c['pcs']:
                continue
            iv = (pc - c['pc']) % 12
            want[{0: 0, 3: 1, 4: 1, 6: 2, 7: 2}.get(iv, -1)] = k
        ok([row.group(1), row.group(2), row.group(3)] == [want.get(0), want.get(1), want.get(2)],
           f'bảng "ba hợp âm", nốt {letter}: ghi {row.groups()}, tính ra gốc/3/5 = {want.get(0)}/{want.get(1)}/{want.get(2)}')

# ═══════════ F. Kho lick (lick-data) ═══════════
LD = DATA.get('lick-data')
if LD:
    ok(len(LD['licks']) == 15, f'lick-data: bài nói "mười lăm câu", dữ liệu có {len(LD["licks"])}')
    for lk in LD['licks']:
        name = f'lick "{lk["name"]}"'
        chords, t = [], 0
        for sym, beats in lk['ch']:
            c = parse(sym)
            ok(c is not None, f'{name}: không đọc được "{sym}"')
            chords.append((t, beats, c))
            t += beats
        total = t
        notes, u = [], 0
        for x in lk['n']:
            notes.append((u, x))
            u += x[1]
        ok(abs(u - total) < 1e-9, f'{name}: câu dài {u} phách nhưng hợp âm dài {total}')

        def at(beat):
            return [c for a, b, c in chords if a <= beat + 1e-9][-1]

        info = []
        for on, x in notes:
            if x[0] is None:
                info.append(None)
                continue
            c = at(on)
            ok(40 <= x[0] <= 90, f'{name}: nốt {x[0]} ngoài tầm tay phải')
            d = x[2] if len(x) > 2 else deg(c, x[0])
            if len(x) > 2:
                ok(DEG_SEMI.get(d) == (x[0] - c['pc']) % 12, f'{name}: nhãn "{d}" gắn cho {note_name(x[0])} trên {c["sym"]} là sai')
            if len(x) > 3:
                ok(x[3] in ('ct', 'tn', 'ap'), f'{name}: loại nốt "{x[3]}" không hợp lệ')
                ok(x[3] != 'ct' or is_ct(c, x[0]), f'{name}: {note_name(x[0])} bị ghi là nốt hợp âm của {c["sym"]}')
            info.append({'on': on, 'n': x[0], 'c': c, 'deg': d})
        chk = lk.get('chk', {})
        if chk.get('strong') == 'ct':
            for i, it in enumerate(info):
                if it and abs(it['on'] % 1) < 1e-9 and i not in chk.get('allow', []):
                    ok(is_ct(it['c'], it['n']), f'{name}: nốt {i} ({note_name(it["n"])}) rơi phách mạnh mà không thuộc {it["c"]["sym"]}')
        for i, j, semi in chk.get('joins', []):
            ok(info[j] and info[i] and info[j]['n'] - info[i]['n'] == semi, f'{name}: bước {i}→{j} không phải {semi:+d} nửa cung')
            ok(info[j]['c'] is not info[i]['c'] and any(abs(a - info[j]['on']) < 1e-9 for a, _, _ in chords),
               f'{name}: nốt {j} phải là nốt đầu tiên của hợp âm mới')
        for i, j, semi in chk.get('steps', []):
            ok(info[j]['n'] - info[i]['n'] == semi, f'{name}: bước {i}→{j} không phải {semi:+d} nửa cung')
        for a, b, tg in chk.get('encl', []):
            ok(info[a]['n'] - info[tg]['n'] == 1 and info[b]['n'] - info[tg]['n'] == -1, f'{name}: {a},{b} không bao vây nốt {tg} (trên rồi dưới, nửa cung)')
        if 'set' in chk:
            s = chk['set']
            bad = [note_name(info[i]['n']) for i in range(s['from'], s['to'] + 1) if info[i] and info[i]['n'] % 12 not in s['pcs']]
            ok(not bad, f'{name}: nốt ngoài gam bài nói: {bad}')
        for cl in chk.get('claims', []):
            i, d = cl[0], cl[1]
            ok(info[i] is not None and info[i]['deg'] == d, f'{name}: nốt {i} là {info[i]["deg"] if info[i] else "nghỉ"}, bài/dữ liệu nói {d}')
            if len(cl) > 2:
                ok(abs(info[i]['on'] - cl[2]) < 1e-9, f'{name}: nốt {i} phải vào ở phách {cl[2]}')

# ═══════════ G. Phòng tập (jam-data) ═══════════
J = DATA.get('jam-data') or []
SC = {'ion': [0, 2, 4, 5, 7, 9, 11], 'dor': [0, 2, 3, 5, 7, 9, 10], 'mixo': [0, 2, 4, 5, 7, 9, 10], 'aeol': [0, 2, 3, 5, 7, 8, 10],
      'lyd': [0, 2, 4, 6, 7, 9, 11], 'loc': [0, 1, 3, 5, 6, 8, 10], 'mmin': [0, 2, 3, 5, 7, 9, 11], 'phrdom': [0, 1, 4, 5, 7, 8, 10],
      'mixb13': [0, 2, 4, 5, 7, 8, 10]}
for p in J:
    union = set()
    for sym, sc in p['bars']:
        c = parse(sym)
        if not ok(c is not None, f'jam-data "{p["name"]}": không đọc được "{sym}"'):
            continue
        ok(sc in SC, f'jam-data "{p["name"]}": gam "{sc}" không tồn tại')
        rel = {(x) % 12 for x in c['ct']}
        ok(rel <= set(SC.get(sc, [])), f'jam-data "{p["name"]}": gam {sc} của {sym} không chứa đủ nốt hợp âm')
        union |= c['pcs']
    if p.get('one') is None:
        ok(len(union) > 7, f'jam-data "{p["name"]}": bài nói không gam 7 nốt nào chứa đủ nốt hợp âm, nhưng chỉ có {len(union)} nốt')
    elif len(p['one']['pcs']) == 7:
        ok(union <= set(p['one']['pcs']), f'jam-data "{p["name"]}": "{p["one"]["name"]}" không chứa hết nốt hợp âm')

# ═══════════ H. Bản đồ đường đi (rmap-data): chạy lại luật nhắc/nhảy ═══════════
R = DATA.get('rmap-data')
if R:
    bars = R['bars']
    tags = {b['n']: set(b['tags']) for b in bars}
    order, i, taken, after_ds, guard = [], 0, set(), False, 0
    start_rep = 0
    while i < len(bars) and guard < 200:
        guard += 1
        n = bars[i]['n']
        t = tags[n]
        if 'repStart' in t:
            start_rep = i
        if 'volta1' in t and ('rep' in taken or after_ds):
            i += 1
            continue
        order.append(n)
        if 'repEnd' in t and 'rep' not in taken and not after_ds:
            taken.add('rep')
            i = start_rep
            continue
        if 'toCoda' in t and after_ds:
            i = [k for k, b in enumerate(bars) if 'coda' in tags[b['n']]][0]
            continue
        if 'dsAlCoda' in t and not after_ds:
            after_ds = True
            i = [k for k, b in enumerate(bars) if 'segno' in tags[b['n']]][0]
            continue
        if 'end' in t:
            break
        i += 1
    ok(order == R['order'], f'rmap-data: chạy luật ra {order}, bài ghi {R["order"]}')
    ok(len(R['order']) == 16, 'rmap-data: bài nói tổng cộng 16 ô được chơi')

# ═══════════ I. Nốt mốc (lm-data + bảng) ═══════════
M = DATA.get('lm-data')
if M:
    def pos(d):
        tl = {30: 1, 32: 2, 34: 3, 36: 4, 38: 5}
        ts = {31: 1, 33: 2, 35: 3, 37: 4}
        bl = {18: 1, 20: 2, 22: 3, 24: 4, 26: 5}
        bs = {19: 1, 21: 2, 23: 3, 25: 4}
        if d in tl:
            return f'dòng {tl[d]} khóa Sol'
        if d in ts:
            return f'khe {ts[d]} khóa Sol'
        if d in bl:
            return f'dòng {bl[d]} khóa Fa'
        if d in bs:
            return f'khe {bs[d]} khóa Fa'
        if d == 28:
            return '1 gạch phụ giữa hai khuông'
        if d > 38 and d % 2 == 0:
            return f'{(d - 38) // 2} gạch phụ trên khóa Sol'
        if d < 18 and d % 2 == 0:
            return f'{(18 - d) // 2} gạch phụ dưới khóa Fa'
        return '?'
    for name, d, where in M['landmarks']:
        ok(d == int(name[1]) * 7 + LET.index(name[0]), f'lm-data: {name} không ở chỉ số bậc {d}')
        ok(pos(d) == where, f'lm-data: {name} nằm ở "{pos(d)}", dữ liệu ghi "{where}"')
        row = re.search(r'<tr><td><b>[^<]*\(' + name + r'\)</b></td><td>([^<]+)</td>', raw)
        if ok(row is not None, f'bảng nốt mốc thiếu dòng {name}'):
            ok(row.group(1) == where.replace('1 gạch phụ giữa hai khuông', '1 gạch phụ, nằm giữa hai khuông'),
               f'bảng nốt mốc, {name}: ghi "{row.group(1)}", đúng phải là "{where}"')
    lm = [d for _, d, _ in M['landmarks']]
    far = max(min(abs(x - d) for d in lm) for x in range(M['range'][0], M['range'][1] + 1))
    ok(far == M['maxSteps'] == 3, f'lm-data: nốt xa mốc nhất cách {far} bậc, bài nói "không quá 3"')
    near = sum(1 for x in range(M['range'][0], M['range'][1] + 1) if min(abs(x - d) for d in lm) <= 2)
    ok(near * 2 > M['range'][1] - M['range'][0] + 1, 'lm-data: bài nói "phần lớn chỉ cách 1–2 bậc"')
    for a, b in (('G4', 'F3'), ('C5', 'C3'), ('C6', 'C2')):
        da = [d for n, d, _ in M['landmarks'] if n == a][0]
        db = [d for n, d, _ in M['landmarks'] if n == b][0]
        ok(da + db == 56, f'lm-data: {a} và {b} không đối xứng qua Đô giữa')

# ═══════════ J. Các bảng cũ của trang (tính lại, không tin chữ) ═══════════
MAJ = [0, 2, 4, 5, 7, 9, 11]
MODES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian']
for i, mname in enumerate(MODES):
    rot = sorted(((x - MAJ[i]) % 12) for x in MAJ)
    want = '·'.join(str(x) for x in rot)
    for m in re.finditer(r'<td><b>' + mname + r'</b>[^<]*</td><td>([0-9·<>/b]+)</td>', raw):
        got = re.sub(r'</?b>', '', m.group(1))
        ok(got == want, f'bảng mode: {mname} ghi {got}, tính ra {want}')
INTS = {'2 thứ': 1, '2 trưởng': 2, '3 thứ': 3, '3 trưởng': 4, '4 đúng': 5, '5 đúng': 7, '6 thứ': 8, '6 trưởng': 9, '7 thứ': 10, '7 trưởng': 11}
for nm, semi in INTS.items():
    m = re.search(r'<tr><td><b>' + nm + r'</b>[^<]*</td><td>(\d+)</td>', raw)
    if ok(m is not None, f'bảng quãng thiếu dòng "{nm}"'):
        ok(int(m.group(1)) == semi, f'bảng quãng: {nm} ghi {m.group(1)} nửa cung, đúng là {semi}')
# bảng ký hiệu hợp âm (tab Đệm hát): nốt trên Đô ↔ bậc
# (?!/tr>): không cho một lần khớp chạy qua hết dòng — trước đây nó ghép tên dòng "Chấm dôi" với nốt
# của dòng C, và tên "C°7" với nốt của dòng C6/9, nên thông báo lỗi chỉ sai dòng.
NOTE_SEMI = {'C': 0, 'D': 2, 'E♭': 3, 'E': 4, 'F': 5, 'G♭': 6, 'G': 7, 'G♯': 8, 'A': 9, 'B♭': 10, 'B': 11, 'D♭': 1}
DEG_TXT = {'1': 0, '2': 2, '♭3': 3, '3': 4, '4': 5, '♭5': 6, '5': 7, '♯5': 8, '6': 9, '♭7': 10, '7': 11, '9': 2, '♭♭7': 9}
for m in re.finditer(r'<tr><td><b>(C[^<]*)</b>[^<]*</td><td>[^<]*(?:<(?!/tr>)[^>]+>[^<]*)*?</td><td>([A-G♭♯ ]+)</td><td>([0-9♭♯ ]+)</td></tr>', raw):
    ns, ds = m.group(2).split(), m.group(3).split()
    if len(ns) != len(ds) or not all(n in NOTE_SEMI for n in ns) or not all(d in DEG_TXT for d in ds):
        continue
    ok([NOTE_SEMI[n] for n in ns] == [DEG_TXT[d] for d in ds], f'bảng ký hiệu hợp âm: {m.group(1)} — nốt {ns} không khớp bậc {ds}')

# ─────────────────────────── kết quả ───────────────────────────
if ERR:
    print(f'verify-jazz-piano: {len(ERR)} LỖI ({N_OK} phép kiểm qua)')
    for e in ERR:
        print('  ✗', e)
    sys.exit(1)
print(f'verify-jazz-piano: OK — {N_OK} phép kiểm')
