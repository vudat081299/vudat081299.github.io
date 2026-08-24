#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
factlint — bộ kiểm tra cho thư viện fact.

Bốn việc:
  check            kiểm tra cấu trúc (id trùng, cat/sub sai, thiếu src, viz không tồn tại)
                   + quét cả thư viện tìm cặp fact gần trùng nhau.
  verify           cổng ĐỊNH NGHĨA (CLAUDE.md §1): loại fact tường thuật, fact lời khuyên,
                   fact meta về nghiên cứu, định luật đặt tên, xu hướng hành vi không mỏ neo.
                   Mức LOẠI là chặn commit; mức XEM là phải đọc bằng mắt.
  near "<văn bản>" tra một fact SẮP thêm: in ra các fact có sẵn giống nó nhất,
                   để quyết định thêm mới / gộp vào cái cũ. Đây là bước 3 của pipeline
                   trong CLAUDE.md.
  stats            đếm fact theo chủ đề và theo cụm; cảnh báo cụm phình quá to.

Cách tránh trùng khi thư viện lớn (n rất lớn thì so từng cặp là bất khả thi):
  1. Mỗi fact có (cat, sub) — sub là cụm nhỏ trong chủ đề, khai báo ở manifest.clusters.
     So sánh chặt chỉ diễn ra TRONG cụm: n_cụm ≈ n/120, và cụm nào quá to thì tách.
  2. Lưới an toàn cho trường hợp đặt sai cụm: chỉ mục nghịch đảo trên các token *hiếm*
     (document frequency thấp) — hai fact chỉ được so nếu dùng chung một từ hiếm hoặc
     một con số. Chi phí gần như tuyến tính, không phải bậc hai.

Chạy:  python3 facts/tools/factlint.py check
"""

import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from math import log, sqrt

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', 'data'))
VIZ_JS = os.path.normpath(os.path.join(HERE, '..', 'viz.js'))

# Ngưỡng báo cáo. Trên NEAR_HARD gần như chắc là trùng; giữa hai mốc thì phải đọc bằng mắt.
NEAR_SOFT = 0.42
NEAR_HARD = 0.62
# Ngưỡng riêng cho cặp KHÁC chủ đề — thấp hơn NEAR_HARD có chủ ý, xem scan_dupes.
NEAR_CROSS = 0.52
# Lưới riêng chỉ so TIÊU ĐỀ. Hai fact trùng tiêu đề từng chữ vẫn có thể chỉ đạt 0,545 trên
# toàn văn nếu hai phần tóm tắt dùng từ vựng khác nhau — sh-113/sh-210 đúng là ca đó và đã
# lọt qua cả đợt rà. TITLE_MIN_SHARE lọc nhiễu tiêu đề ngắn: hai tiêu đề 6 chữ chung 3 chữ
# phổ thông cho điểm rất cao mà chẳng liên quan.
NEAR_TITLE = 0.70
TITLE_MIN_SHARE = 4

# Cụm quá to thì việc "chỉ so trong cụm" mất tác dụng — tách cụm khi vượt mốc này.
CLUSTER_MAX = 90

# Token xuất hiện ở nhiều fact hơn mức này thì coi là phổ thông, không dùng để bắt cặp.
RARE_DF_MAX = 40

STOP = set("""
a ai anh ban bang bao bay bi bien boi bo bon bang cac cai can cang cao chi chinh cho chu chua chung chuyen co con cua cung cuoi
da dan dang danh dau day de den deu di dieu do doi don dong du dua duoc duy gan gi gia giua gio hay hem hen hoac hon hay hai ho
khi kho khong la lai lam lan len loai luc luon ly ma mai mang mat may mo moi mot mua muc muon nam nao nay nen neu ngay nghia
nghe ngoai nguoi nhu nhung nhieu no noi non nua o oi phai phan qua quan ra rang rat roi sau se so su ta tai tam tao te thang
thanh the theo thi thoi thu thuoc tinh to toi tren trong truoc tu tuy tuong va vao vay ve vi viec voi vua vung xa xong y yeu
bat cham chac chac_chan con_lai cua_ban day_la dieu_nay hau_het hoan_toan khoang lai_la lam_cho mac_du minh nhat nhieu_hon
tat_ca thuc_te thuong tot tu_do van van_con vi_sao vua_moi
""".split())


# ---------------------------------------------------------------- chuẩn hoá text

def strip_tones(s):
    """Bỏ dấu để 'nao' và 'não' cùng một token — chống lệch do gõ thiếu dấu."""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return unicodedata.normalize('NFC', s).replace('đ', 'd').replace('Đ', 'd')


NUM_RE = re.compile(r'\d[\d.,]*')
WORD_RE = re.compile(r'[a-z]+')


def tokens(text):
    """Trả về Counter token. Con số giữ nguyên dạng chuẩn hoá và được đánh dấu '#'."""
    low = strip_tones(text.lower())
    out = Counter()
    for m in NUM_RE.finditer(low):
        raw = m.group(0).rstrip('.,')
        # 384.400 và 384400 là một; 0,5 và 0.5 là một
        norm = raw.replace('.', '').replace(',', '.')
        norm = norm.rstrip('.')
        if norm:
            out['#' + norm] += 1
    for w in WORD_RE.findall(low):
        if len(w) < 2 or w in STOP:
            continue
        out[w] += 1
    return out


def fact_tokens(f):
    """Tiêu đề nặng gấp đôi tóm tắt: trùng tiêu đề là dấu hiệu mạnh hơn nhiều."""
    c = Counter()
    for w, n in tokens(f.get('t', '')).items():
        c[w] += 2 * n
    for w, n in tokens(f.get('s', '')).items():
        c[w] += n
    return c


# ---------------------------------------------------------------- nạp dữ liệu

def load():
    man = json.load(open(os.path.join(DATA, 'manifest.json'), encoding='utf-8'))
    facts = []
    for name in man['files']:
        path = os.path.join(DATA, name)
        with open(path, encoding='utf-8') as fh:
            arr = json.load(fh)
        if not isinstance(arr, list):
            raise SystemExit('%s: phải là một mảng' % name)
        for it in arr:
            it['_file'] = name
            facts.append(it)
    return man, facts


def viz_keys():
    """Đọc registry ở cuối viz.js để biết khoá viz nào thật sự tồn tại."""
    if not os.path.exists(VIZ_JS):
        return None
    src = open(VIZ_JS, encoding='utf-8').read()
    m = re.search(r'window\.FactViz\s*=\s*\{(.*?)\n\s*\};', src, re.S)
    if not m:
        return None
    return set(re.findall(r"'([a-z0-9-]+)'\s*:", m.group(1)))


# ---------------------------------------------------------------- kiểm tra cấu trúc

REQUIRED = ('id', 'cat', 't', 's', 'src')


def check_shape(man, facts, vk):
    errs, warns = [], []
    cats = {c['id'] for c in man['categories']}
    clusters = man.get('clusters', {})
    seen = {}

    for f in facts:
        where = '%s / %s' % (f['_file'], f.get('id', '???'))
        for k in REQUIRED:
            if not f.get(k) or not str(f[k]).strip():
                errs.append('%s: thiếu "%s"' % (where, k))
        fid = f.get('id')
        if fid in seen:
            errs.append('%s: id trùng với %s' % (where, seen[fid]))
        elif fid:
            seen[fid] = where
        if f.get('cat') not in cats:
            errs.append('%s: cat "%s" không có trong manifest' % (where, f.get('cat')))
        elif clusters:
            allowed = clusters.get(f['cat'], [])
            if 'sub' not in f:
                errs.append('%s: thiếu "sub" (cụm)' % where)
            elif f['sub'] not in allowed:
                errs.append('%s: sub "%s" không thuộc cat %s' % (where, f['sub'], f['cat']))
        if f.get('viz') and vk is not None and f['viz'] not in vk:
            errs.append('%s: viz "%s" không có hàm trong viz.js' % (where, f['viz']))
        if not f.get('tags'):
            warns.append('%s: không có tags' % where)
        if len(f.get('s', '')) < 40:
            warns.append('%s: tóm tắt quá ngắn (%d ký tự)' % (where, len(f.get('s', ''))))
        if 'xem_ok' in f:
            known = all_warn_rule_ids()
            if not isinstance(f['xem_ok'], list) or not f['xem_ok']:
                errs.append('%s: "xem_ok" phải là mảng rule id không rỗng' % where)
            else:
                for rid in f['xem_ok']:
                    if rid not in known:
                        errs.append('%s: xem_ok "%s" không phải luật nào — %s'
                                    % (where, rid, ', '.join(sorted(known))))
                    elif not rule_still_hits(f, rid):
                        errs.append('%s: xem_ok "%s" đã CHẾT — luật đó không còn khớp fact '
                                    'này, xoá dòng khai đi (nó đang bịt miệng cổng cho một '
                                    'lần sửa sau)' % (where, rid))
        if 'khac_voi' in f:
            if not isinstance(f['khac_voi'], list) or not f['khac_voi']:
                errs.append('%s: "khac_voi" phải là mảng id fact không rỗng' % where)

    ids = {f.get('id') for f in facts}
    for f in facts:
        for other in f.get('khac_voi') or []:
            if other not in ids:
                errs.append('%s / %s: khac_voi trỏ tới id không tồn tại "%s"'
                            % (f['_file'], f.get('id'), other))
    return errs, warns


# ---------------------------------------------------------------- tương đồng

def build_index(facts):
    """IDF + vector token cho từng fact, và df để biết token nào hiếm."""
    toks = [fact_tokens(f) for f in facts]
    df = Counter()
    for c in toks:
        for w in c:
            df[w] += 1
    n = max(1, len(facts))
    idf = {w: log(1 + n / d) for w, d in df.items()}
    vecs = []
    for c in toks:
        v = {w: cnt * idf[w] for w, cnt in c.items()}
        norm = sqrt(sum(x * x for x in v.values())) or 1.0
        vecs.append({w: x / norm for w, x in v.items()})
    return vecs, df, idf


def cosine(a, b):
    if len(a) > len(b):
        a, b = b, a
    return sum(x * b[w] for w, x in a.items() if w in b)


def candidate_pairs(facts, df):
    """
    Sinh cặp cần so, chia làm hai hạng vì độ chính xác của chúng khác nhau.

    Hạng CHẶT — báo từ NEAR_SOFT trở lên:
      - cùng (cat, sub): so hết trong cụm. Trùng thật gần như luôn nằm ở đây.
      - dùng chung một token hiếm: bắt trường hợp đặt sai cụm.

    Hạng RỘNG — chỉ báo từ NEAR_HARD trở lên:
      - cùng cat, khác sub. Lưới token hiếm bỏ sót khi hai fact trùng ý nhưng chỉ
        dùng chung các từ phổ thông: cn-140 và cn-206 đạt 0,71 mà không cặp nào bắt
        được, vì mọi từ chung của chúng ('năng lượng', 'tìm kiếm') đều có df > 40.
        So hết trong chủ đề đắt thêm ~115% số cặp nhưng chỉ tốn thêm ~0,1s ở quy mô
        2.000 fact, nên rẻ hơn nhiều so với việc để một fact trùng lọt ra trang.
        Ngưỡng ở đây cao hơn vì trong cùng chủ đề, hai fact khác cụm dùng chung nhiều
        từ vựng là chuyện thường — hạ xuống NEAR_SOFT thì thêm ~99 cặp gần như toàn
        nhiễu, mà cổng ồn là cổng không ai đọc.
    """
    tight = set()

    by_cluster = defaultdict(list)
    for i, f in enumerate(facts):
        by_cluster[(f.get('cat'), f.get('sub'))].append(i)
    for idxs in by_cluster.values():
        for a in range(len(idxs)):
            for b in range(a + 1, len(idxs)):
                tight.add((idxs[a], idxs[b]))

    by_rare = defaultdict(list)
    for i, f in enumerate(facts):
        for w in fact_tokens(f):
            if 1 < df.get(w, 0) <= RARE_DF_MAX:
                by_rare[w].append(i)
    for idxs in by_rare.values():
        if len(idxs) > 60:      # token vẫn còn phổ thông quá, bỏ
            continue
        for a in range(len(idxs)):
            for b in range(a + 1, len(idxs)):
                tight.add((min(idxs[a], idxs[b]), max(idxs[a], idxs[b])))

    return tight


def title_pairs(facts):
    """
    Lưới thứ ba: so RIÊNG tiêu đề, bỏ hẳn phần tóm tắt.

    Lý do tồn tại: điểm toàn văn là bình quân của tiêu đề (trọng số 2) và tóm tắt, nên hai
    fact cùng một tiêu đề mà tóm tắt viết bằng từ khác nhau sẽ bị tóm tắt kéo xuống dưới mọi
    ngưỡng. sh-113 và sh-210 trùng tiêu đề TỪNG CHỮ mà chỉ đạt 0,545 toàn văn.

    Đo ở quy mô 1.989 fact: 26 cặp vượt (0,70 + chung ≥ 4 token), trong đó 22 cặp là trùng
    thật — 6 cặp trùng tiêu đề tuyệt đối. Độ chính xác 85%, đủ cao để chặn commit.
    """
    vt = []
    for f in facts:
        c = Counter(tokens(f.get('t') or ''))
        n = sqrt(sum(x * x for x in c.values())) or 1.0
        vt.append((set(c), {k: x / n for k, x in c.items()}))
    out = {}
    for i in range(len(facts)):
        for j in range(i + 1, len(facts)):
            if len(vt[i][0] & vt[j][0]) < TITLE_MIN_SHARE:
                continue
            s = cosine(vt[i][1], vt[j][1])
            if s >= NEAR_TITLE:
                out[(i, j)] = s
    return out


def scan_dupes(facts, limit=None):
    """
    Quét MỌI cặp, nhưng ngưỡng báo khác nhau theo hạng — vì cùng một điểm tương đồng mang
    nghĩa khác nhau tuỳ hai fact ở đâu:

      cùng cụm, hoặc chung token hiếm  → NEAR_SOFT (0,42). Chỗ trùng thật hay nằm.
      cùng cat, khác cụm              → NEAR_HARD (0,62). Khác cụm trong cùng chủ đề thì
                                        dùng chung nhiều từ vựng là chuyện thường.
      khác cat                        → NEAR_CROSS (0,52). Ngược lại, hai chủ đề khác nhau
                                        gần như không có từ vựng chung, nên 0,52 ở đây
                                        *đáng ngờ hơn* 0,52 trong cùng chủ đề.

    Ngưỡng khác-cat thấp hơn ngưỡng cùng-cat nghe ngược, nhưng đo mới thấy đúng: ở 0,52
    lưới khác-cat chỉ thêm 14 cặp mà trong đó có 5 cặp trùng thẳng (so-hoc với toan-hoc
    nhân bản nhau: trung bình của tỉ lệ, nghịch lý bạn bè, xác suất ít nhất một lần), còn
    lưới cùng-cat hạ xuống 0,42 thì thêm 99 cặp gần như toàn nhiễu.

    Quét hết 2.000 fact là ~1,8 triệu cặp và tốn ~1,6 giây, nên không cần chỉ mục gì thêm.

    Cặp nào đã có người đọc và kết luận là hai claim khác nhau thì khai bằng field "khac_voi"
    ở một trong hai fact: "khac_voi": ["sk-205"]. Cùng lý do với "xem_ok" ở verify — không có
    cách ghi lại thì danh sách cặp không bao giờ hội tụ, và phiên sau không phân biệt được
    cặp đã soi với cặp chưa soi.
    """
    vecs, df, _ = build_index(facts)
    tight = candidate_pairs(facts, df)
    tpairs = title_pairs(facts)
    cat = [f.get('cat') for f in facts]
    ok = set()
    for i, f in enumerate(facts):
        for other in f.get('khac_voi') or []:
            ok.add(frozenset((f.get('id'), other)))
    out = []
    for i in range(len(facts)):
        for j in range(i + 1, len(facts)):
            if frozenset((facts[i].get('id'), facts[j].get('id'))) in ok:
                continue
            s = cosine(vecs[i], vecs[j])
            if (i, j) in tpairs:
                # Trùng tiêu đề: báo bất kể điểm toàn văn, và báo theo điểm TIÊU ĐỀ vì đó
                # mới là con số nói lên vấn đề.
                out.append((tpairs[(i, j)], i, j, 'TT'))
                continue
            if (i, j) in tight:
                floor = NEAR_SOFT
            elif cat[i] == cat[j]:
                floor = NEAR_HARD
            else:
                floor = NEAR_CROSS
            if s >= floor:
                out.append((s, i, j, ''))
    out.sort(reverse=True)
    return out if limit is None else out[:limit]


# ---------------------------------------------------------------- lệnh

def cmd_check(argv):
    man, facts = load()
    vk = viz_keys()
    errs, warns = check_shape(man, facts, vk)

    print('%d fact · %d file · %d chủ đề' % (len(facts), len(man['files']), len(man['categories'])))
    if vk is not None:
        print('%d minh hoạ trong viz.js · %d fact có viz'
              % (len(vk), sum(1 for f in facts if f.get('viz'))))

    dupes = scan_dupes(facts)
    titles = [d for d in dupes if d[3] == 'TT']
    hard = [d for d in dupes if d[3] == 'TT' or d[0] >= NEAR_HARD]

    if dupes:
        print('\n— Cặp gần trùng (%d cặp ≥ %.2f, trong đó %d cặp ≥ %.2f, %d cặp trùng tiêu đề) —'
              % (len(dupes), NEAR_SOFT, len(hard) - len(titles), NEAR_HARD, len(titles)))
        for s, i, j, kind in dupes:
            mark = 'TT' if kind == 'TT' else ('!!' if s >= NEAR_HARD else '..')
            print('%s %.2f  %s [%s/%s]  %s' % (mark, s, facts[i]['id'],
                                               facts[i].get('cat'), facts[i].get('sub', '-'),
                                               facts[i]['t']))
            print('        %s [%s/%s]  %s' % (facts[j]['id'], facts[j].get('cat'),
                                              facts[j].get('sub', '-'), facts[j]['t']))
    else:
        print('\nKhông có cặp nào vượt ngưỡng gần trùng.')

    if warns and '-v' in argv:
        print('\n— Nhắc nhở (%d) —' % len(warns))
        for w in warns:
            print('  ' + w)
    elif warns:
        print('\n%d nhắc nhở (thêm -v để xem).' % len(warns))

    if errs:
        print('\n— LỖI (%d) —' % len(errs))
        for e in errs:
            print('  ' + e)
        return 1
    print('\nCấu trúc: OK.')
    return 1 if hard else 0


def cmd_near(argv):
    if not argv:
        print('Dùng: factlint.py near "tiêu đề + tóm tắt fact sắp thêm" [--cat X] [--sub Y] [-n 8]')
        return 2
    text = argv[0]
    cat = sub = None
    n = 8
    i = 1
    while i < len(argv):
        if argv[i] == '--cat':
            cat = argv[i + 1]; i += 2
        elif argv[i] == '--sub':
            sub = argv[i + 1]; i += 2
        elif argv[i] == '-n':
            n = int(argv[i + 1]); i += 2
        else:
            i += 1

    _, facts = load()
    probe = {'t': text, 's': ''}
    pool = facts + [probe]
    vecs, _, _ = build_index(pool)
    pv = vecs[-1]

    scored = []
    for k, f in enumerate(facts):
        if cat and f.get('cat') != cat:
            continue
        if sub and f.get('sub') != sub:
            continue
        scored.append((cosine(pv, vecs[k]), k))
    scored.sort(reverse=True)

    if not scored:
        print('Không có fact nào trong phạm vi đó — thêm mới thoải mái.')
        return 0
    print('Giống nhất (%s):' % (('cat=%s' % cat if cat else 'toàn thư viện')
                                + (' sub=%s' % sub if sub else '')))
    for s, k in scored[:n]:
        f = facts[k]
        flag = 'TRÙNG' if s >= NEAR_HARD else ('XEM ' if s >= NEAR_SOFT else '    ')
        print('%s %.2f  %s [%s/%s]  %s' % (flag, s, f['id'], f.get('cat'),
                                           f.get('sub', '-'), f['t']))
    top = scored[0][0]
    print('\n=> %s' % ('gần chắc đã có, GỘP vào fact trên chứ đừng thêm.' if top >= NEAR_HARD
                       else 'đọc lại 2–3 fact đầu rồi tự quyết.' if top >= NEAR_SOFT
                       else 'chưa có fact nào tương tự, thêm được.'))
    return 0


# ---------------------------------------------------------------- cổng định nghĩa (§1)
#
# Một fact phải qua ba cổng: nói về THẾ GIỚI (không phải về người đọc), có MỎ NEO cứng
# (số / cơ chế / mốc thời gian), và gọn trong MỘT CÂU. §1.1 của CLAUDE.md liệt kê sáu loại
# bị loại thẳng. Phần dưới bắt máy móc những loại nhận diện được bằng mặt chữ.
#
# Hai mức: 'LOẠI' = vi phạm chắc chắn, phải xoá hoặc viết lại. 'XEM' = nghi ngờ, đọc bằng mắt.
# Quy tắc chỉ soi TIÊU ĐỀ khi việc nhắc tới nghiên cứu/tranh cãi trong phần tóm tắt là hợp lệ
# (§4 quy tắc 3 bắt buộc nêu tranh cãi trong "s"/"d").

HAS_DIGIT = re.compile(r'\d')

# "nên" nghĩa "should" chứ không phải liên từ "cho nên". Chỉ tính khi ngay sau nó là một
# động từ hành động — cách này bỏ sót vài trường hợp nhưng gần như không báo nhầm.
NEN_VERB = ('mua|bán|chọn|làm|dùng|nói|hỏi|viết|đọc|ăn|uống|ngủ|tập|chạy|đi|đến|gọi|nhắn'
            '|đầu tư|tiết kiệm|tính|đặt|để|tránh|bắt đầu|dừng|giữ|gửi|trả|xin|đợi|chờ'
            '|kiểm tra|đo|ghi|học|nghỉ|thử|xem|chia|gộp|tắt|bật')
RE_NEN = re.compile(r'\b(nên|không nên) (%s)\b' % NEN_VERB)

RULES_REJECT = [
    ('loi-khuyen', 'lời khuyên / câu mệnh lệnh', 't', [
        RE_NEN,
        re.compile(r'\b(hãy|đừng|chớ)\b'),
        re.compile(r'(cái|việc|điều|những gì) nên làm'),
        re.compile(r'cách (tốt|nhanh|hiệu quả|dễ|an toàn|chắc) nhất'),
        re.compile(r'\bmẹo\b'),
    ]),
    ('tuong-thuat', 'tường thuật một vụ việc / thí nghiệm', 't', [
        re.compile(r'^(Vụ|Câu chuyện|Chuyện|Thí nghiệm|Bài báo|Trường hợp|Sự kiện) '),
        re.compile(r'(thí nghiệm|nghiên cứu) (nhà tù|của [A-ZÀ-ỸĐ])'),
    ]),
    ('meta-nghien-cuu', 'nói về số phận một nghiên cứu, không nói về thế giới', 't', [
        re.compile(r'không nhân bản|không lặp lại được|bị rút lại'),
        re.compile(r'(bài báo|nghiên cứu|kết quả) gốc'),
        re.compile(r'hiểu sai một nghiên cứu'),
        re.compile(r'không phải bằng chứng'),
        re.compile(r'(yếu|mạnh) hơn (nhiều )?khi tính đến'),
    ]),
]

# Ba quy tắc dưới LOẠI khi fact không có MỎ NEO THẬT, và chỉ hạ xuống XEM khi có.
# "Mỏ neo thật" = có con số VÀ con số đó không nằm trọn trong câu giả định (§1.3).
#
# Đừng nâng ba luật này lên LOẠI vô điều kiện — đã đo ngày 24/08/2026 và số liệu bác:
# nâng thẳng chặn 28 fact, và đọc tay cả 28 thì KHÔNG cái nào sai. Riêng
# 'dinh-luat-dat-ten' bản rộng chính là dạng mà CLAUDE.md §1.6 ghi "đã đo và RỚT, đừng
# dựng lại" (13 fact, cả 13 nêu luôn nội dung ngay sau tên). Bản thắt theo mỏ neo dưới
# đây chặn 0 fact hôm nay mà vẫn bịt được lớp lỗi thật — xem HANDOFF.md đợt 24/08.
RULES_REJECT_IF_NO_ANCHOR = [
    ('dinh-luat-dat-ten', 'định luật/nguyên lý đặt theo tên người, không mỏ neo', 't', [
        re.compile(r'\b(Định luật|Nguyên lý|Dao cạo|Quy tắc|Nghịch lý|Hiệu ứng) [A-ZÀ-ỸĐ]'),
    ]),
    ('so-sanh-cach-lam', 'so sánh hai cách làm mà không có con số', 't', [
        re.compile(r'(hiệu quả|tác dụng|ăn thua|có ích|hữu hiệu|ổn|đúng|chuẩn) hơn'),
        re.compile(r'\b(tốt|dở|tệ|nhanh|dễ) hơn (hẳn )?(khi|nếu|nhiều)'),
    ]),
    ('xu-huong-mo-ho', 'xu hướng hành vi không mỏ neo', 'ts', [
        re.compile(r'(người ta|con người|ta|bạn) (thường|hay|có xu hướng|dễ)\b'),
        re.compile(r'\bcó xu hướng\b'),
        re.compile(r'(phần lớn|nhiều|đa số) người (ta )?(thấy|tin|cảm|nghĩ)'),
    ]),
]

RULES_WARN = [
    ('huong-dan-doc', 'câu hướng dẫn người đọc thao tác — tách khỏi tiêu đề', 't', [
        re.compile(r'(thử ngay|thử đọc|thử xem|kéo thanh trượt|bấm nút|tự kiểm tra|nhìn vào đây)'),
    ]),
    ('ngoi-thu-hai', 'viết cho người đọc thay vì về thế giới', 't', [
        re.compile(r'(giúp bạn|để bạn|làm bạn dễ|khiến bạn nên|bạn nên|của bạn sẽ)'),
    ]),
    ('do-du', 'câu tự hạ mức chắc chắn ngay ở tiêu đề', 't', [
        re.compile(r'(có thể đã|có lẽ|dường như|hình như|được cho là)'),
    ]),
    # Fact nói về khoảng cách giữa cái người đọc tưởng và cái có thật thì mỏ neo phải là
    # con số của cái có thật, không phải "hơn bạn nghĩ". cn-139 và cn-206 sống sót nhiều
    # tháng chỉ nhờ chỗ này. Vẫn là XEM chứ không LOẠI: hiệu ứng đèn chiếu và vài fact
    # tâm lý khác có claim thật nằm đúng ở khoảng cách đó — nhưng chúng phải kèm số.
    ('tuong-tuong-nguoi-doc', 'so với cái người đọc tưởng, không so với một con số', 'ts', [
        re.compile(r'(hơn|khác với|trái với) (những gì )?'
                   r'(người ta|nhiều người|phần lớn|đa số|bạn|chúng ta|ai|người dùng|mọi người)'
                   r'[^.]{0,25}(nghĩ|tưởng|hình dung|ngờ|biết|tin|đoán|mong)'),
        re.compile(r'ít ai (biết|ngờ|nghĩ)|không ai (ngờ|nghĩ)'),
        # Phải có "như"/"so với" dẫn vào, nếu không thì bắt oan những chỗ niềm tin của
        # người tham gia là thứ thí nghiệm điều khiển: kt-143 "khi người ta tưởng nó mua
        # ở khách sạn sang" là biến độc lập của Thaler, không phải lời tự nhận xét.
        re.compile(r'(như|so với) (người ta|nhiều người) (vẫn )?(tưởng|nghĩ)'),
    ]),
]

# Khẳng định một độ lớn bằng chữ trong khi không có con số nào — "đáng kể" là chỗ đúng ra
# phải có số. Cổng 'thieu-mo-neo' bỏ sót vì nó chỉ nổ khi t+s ngắn hơn 220 ký tự, mà 811
# fact không có chữ số nào dài hơn mức đó; phần lớn trong số đó neo bằng cơ chế nên hợp lệ,
# nên không thể bỏ ngưỡng dài — chỉ có thể hỏi thẳng: có từ chỉ độ lớn mà không có số?
MO_HO_DO_LON = re.compile(
    r'(đáng kể|rất nhiều|rất ít|rất lớn|rất nhỏ|khá lớn|khá nhiều|không nhỏ'
    r'|nhỏ tới mức|lớn tới mức|nhiều tới mức|một lượng lớn|nhiều hơn hẳn|lớn hơn hẳn'
    r'|hàng loạt|ít được)')
# Họ từ chỉ tỉ lệ chỉ tính khi nằm ở TIÊU ĐỀ: ở đó chúng là claim, còn trong phần tóm tắt
# chúng thường chỉ là văn nói bình thường (đo được: tính cả phần tóm tắt thì 150 fact bị
# gắn cờ thay vì 87, và phần thêm gần như toàn nhiễu).
MO_HO_TI_LE = re.compile(r'(phần lớn|đa số|hầu hết)')

# Mọi con số đều nằm trong một khung giả định thì không có con số nào là mỏ neo: bỏ nó đi
# mà câu vẫn nguyên nghĩa. Bản sh-125 cũ ("Nếu phải cho 100 người uống thuốc…") là ca mẫu.
# Không tính "có thể" vì trong tiếng Việt nó thường là tình thái của một khả năng thật
# ("sai số có thể tới 20%"), không phải khung giả định.
KHUNG_GIA_DINH = re.compile(r'(nếu|giả sử|giả dụ|ví dụ|chẳng hạn|cứ cho là|thử tưởng tượng)')
SO_TRONG_CAU = re.compile(r'\d[\d.,]*')

# Cổng TỰ CHỨA (CLAUDE.md §1.5): fact vay kiến thức mà người đọc chưa chắc có thì không đọc
# được. Đây là danh sách những từ phải học đúng ngành đó mới hiểu — không phải mọi từ khó.
#
# Danh sách này đã được thu gọn hai lần bằng cách đo. Bản đầu có 'số nguyên tố', 'luỹ thừa',
# 'logarit', 'đồng vị', 'động lượng', 'biên độ', 'chiết suất' → gắn cờ 150 fact mà phần lớn
# đọc được bình thường, vì đó là chương trình phổ thông. Cũng đã bỏ 'hiệu lực' và 'độ tin cậy'
# vì chúng có nghĩa thường ("hiệu lực pháp lý", "mức tin tưởng") nên bắt oan.
#
# Không dùng bộ lọc "có dấu giải thích trong câu" (dấu —, :, ngoặc, "tức là"): đã đo, nó chia
# 150 fact thành 70/80 mà cả hai nhóm đều lẫn fact lành với fact hỏng. Bậc của từ quyết định,
# không phải dấu câu.
THUAT_NGU = [
    # thống kê & phương pháp nghiên cứu
    'p-value', 'giá trị p', 'ý nghĩa thống kê', 'giả thuyết không', 'phân loại nhị phân',
    'phương sai', 'độ lệch chuẩn', 'sai số chuẩn', 'khoảng tin cậy', 'bậc tự do',
    'công suất thống kê', 'hệ số tương quan', 'hồi quy', 'biến kiểm soát', 'biến gây nhiễu',
    'mô hình nhân quả', 'hồi quy về trung bình', 'phân phối chuẩn', 'phân bố chuẩn',
    'tứ phân vị', 'phân tích tổng hợp', 'meta-analysis', 'mù đôi', 'ngẫu nhiên hoá',
    'ngẫu nhiên hóa', 'độ lớn hiệu ứng', 'hiệu ứng d', 'cỡ hiệu ứng',
    # y tế & dịch tễ
    'tỉ số chênh', 'tỷ số chênh', 'nguy cơ tương đối', 'nguy cơ tuyệt đối',
    'số cần điều trị', 'tương đương sinh học', 'dược động học',
    # 'độ nhạy' trần đã bị bỏ: đo mới thấy nó đa nghĩa như 'hiệu lực' — "độ nhạy của micro",
    # "độ nhạy mũi chó" là tiếng Việt thường. Chỉ giữ hai nghĩa chuyên môn thật.
    'độ đặc hiệu', 'độ nhạy insulin', 'tỉ lệ nền', 'tỷ lệ nền',
    # bị bỏ sót ở bản đầu, tìm ra khi đọc tay cụm so-hoc: sh-019 dùng cả ba từ này
    # trong một tiêu đề mà không giải thích từ nào.
    'biến ngẫu nhiên', 'thiên lệch xuất bản',
    # kinh tế
    'độ co giãn', 'ngoại ứng', 'cận biên', 'hiệu suất giảm dần', 'giá trị kỳ vọng',
    # khoa học tự nhiên
    'áp suất thẩm thấu', 'áp suất riêng phần', 'biểu hiện gen', 'methyl hoá', 'methyl hóa',
    'entropy',
    # toán — chỉ những thứ ngoài chương trình phổ thông. 'ma trận' và 'tích phân' đã bị bỏ:
    # cả hai học ở lớp 10–12, và 'tích phân' còn bắt oan chuỗi con ("Phân tích phân tử").
    'vectơ riêng', 'vector riêng', 'tiệm cận', 'kỳ vọng toán',
]
_VN = (r'\wàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ')
THUAT_NGU_PATS = [(t, re.compile(r'(?<![' + _VN + r'])' + re.escape(t) + r'(?![' + _VN + r'])',
                                 re.I))
                  for t in sorted(set(THUAT_NGU), key=len, reverse=True)]


def _thuat_ngu(t, ts):
    for term, p in THUAT_NGU_PATS:
        if p.search(ts):
            return term
    return None


def _mo_neo_gia_dinh(t, ts):
    nums = list(SO_TRONG_CAU.finditer(ts))
    if not nums:
        return False
    return all(KHUNG_GIA_DINH.search(ts[max(0, m.start() - 45):m.start()].lower())
               for m in nums)


def _do_lon_bang_chu(t, ts):
    if HAS_DIGIT.search(ts):
        return False
    return bool(MO_HO_DO_LON.search(ts.lower()) or MO_HO_TI_LE.search(t.lower()))


def verify_fact(f):
    """
    Trả về (severity, rule_id, note) hoặc None nếu đạt. severity: 'LOẠI' | 'XEM'.

    Một fact có thể miễn một luật mức XEM bằng field "xem_ok": ["rule-id", …]. Chỉ dùng
    field đó SAU KHI đã đọc fact và kết luận luật báo oan — nó là ghi chép "người thật đã
    soi cái này", không phải cách làm cổng im lặng. Không miễn được mức LOẠI: nếu một fact
    thật sự cần vượt mức LOẠI thì luật sai, đi sửa luật.
    """
    t = f.get('t', '')
    ts = t + ' ' + f.get('s', '')
    has_digit = bool(HAS_DIGIT.search(ts))
    mien = f.get('xem_ok') or []

    for rid, note, field, pats in RULES_REJECT:
        hay = t if field == 't' else ts
        for p in pats:
            if p.search(hay):
                return ('LOẠI', rid, note)

    for rid, note, field, pats in RULES_REJECT_IF_NO_ANCHOR:
        hay = t if field == 't' else ts
        for p in pats:
            if p.search(hay):
                if not has_digit:
                    return ('LOẠI', rid, note)
                # Có chữ số chưa phải có mỏ neo (§1.3). Con số nằm trọn trong câu giả
                # định là số bịa để minh hoạ — bỏ nó đi câu vẫn nguyên nghĩa. Với ba luật
                # này thì đó là LOẠI, không phải XEM: một "xu hướng hành vi" mà mỏ neo duy
                # nhất là số giả định thì không còn mỏ neo nào.
                if _mo_neo_gia_dinh(t, ts):
                    return ('LOẠI', rid,
                            note + ' — có chữ số nhưng mọi số đều nằm trong câu giả định')
                if rid not in mien:
                    return ('XEM', rid, note)

    for rid, note, field, pats in RULES_WARN:
        if rid in mien:
            continue
        hay = t if field == 't' else ts
        for p in pats:
            if p.search(hay):
                return ('XEM', rid, note)

    if 'mo-neo-gia-dinh' not in mien and _mo_neo_gia_dinh(t, ts):
        return ('XEM', 'mo-neo-gia-dinh',
                'mọi con số đều nằm trong câu giả định — chưa đo gì thật')

    if 'do-lon-bang-chu' not in mien and _do_lon_bang_chu(t, ts):
        return ('XEM', 'do-lon-bang-chu',
                'khẳng định một độ lớn bằng chữ mà không có con số nào')

    if 'thieu-mo-neo' not in mien and not has_digit and len(ts) < 220:
        return ('XEM', 'thieu-mo-neo', 'không có con số nào trong t+s — kiểm tra cổng mỏ neo')

    if 'thuat-ngu' not in mien:
        term = _thuat_ngu(t, ts)
        if term:
            return ('XEM', 'thuat-ngu',
                    'dùng "%s" — thuật ngữ phải học ngành đó mới hiểu; fact có tự giải thích '
                    'bằng lời thường không?' % term)
    return None


def all_warn_rule_ids():
    """Mọi rule id có thể xuất hiện ở mức XEM — dùng để soát field xem_ok."""
    ids = {rid for rid, _, _, _ in RULES_WARN}
    ids |= {rid for rid, _, _, _ in RULES_REJECT_IF_NO_ANCHOR}
    ids |= {'mo-neo-gia-dinh', 'do-lon-bang-chu', 'thieu-mo-neo', 'thuat-ngu'}
    return ids


def rule_still_hits(f, rid):
    """
    Luật `rid` có còn khớp fact này không — dùng để bắt khai miễn xem_ok đã CHẾT.

    Một `xem_ok` là ghi chép "người thật đã đọc fact này và kết luận luật báo oan". Khi
    fact được viết lại và luật thôi khớp, dòng khai đó không còn nói về cái gì nữa. Nó
    không sai ngay, nhưng nó là một cái bẫy đã cài sẵn: sửa tiêu đề về lại hình dạng cũ
    thì luật khớp trở lại mà cổng đã bị bịt miệng từ trước, và không ai biết.

    Đo ngày 24/08/2026: 6 khai miễn đã chết, tất cả sinh ra ở đợt viết lại 12/08.
    """
    t = f.get('t', '')
    ts = t + ' ' + f.get('s', '')
    for rid2, _, field, pats in list(RULES_REJECT_IF_NO_ANCHOR) + list(RULES_WARN):
        if rid2 == rid:
            hay = t if field == 't' else ts
            return any(p.search(hay) for p in pats)
    if rid == 'mo-neo-gia-dinh':
        return _mo_neo_gia_dinh(t, ts)
    if rid == 'do-lon-bang-chu':
        return _do_lon_bang_chu(t, ts)
    if rid == 'thieu-mo-neo':
        return not HAS_DIGIT.search(ts) and len(ts) < 220
    if rid == 'thuat-ngu':
        return _thuat_ngu(t, ts) is not None
    return True


def cmd_verify(argv):
    man, facts = load()
    only_cat = only_file = None
    show_warn = '-v' in argv or '--all' in argv
    if '--cat' in argv:
        only_cat = argv[argv.index('--cat') + 1]
    if '--file' in argv:
        only_file = os.path.basename(argv[argv.index('--file') + 1])

    def in_scope(f):
        if only_cat and f.get('cat') != only_cat:
            return False
        if only_file and os.path.basename(f.get('_file', '')) != only_file:
            return False
        return True

    rej, warn = [], []
    for f in facts:
        if not in_scope(f):
            continue
        v = verify_fact(f)
        if not v:
            continue
        (rej if v[0] == 'LOẠI' else warn).append((f, v))

    scanned = sum(1 for f in facts if in_scope(f))
    mien = sum(1 for f in facts if in_scope(f) and f.get('xem_ok'))
    print('%d fact được soi · %d LOẠI · %d XEM · %d đã soi và cố ý giữ (xem_ok)'
          % (scanned, len(rej), len(warn), mien))

    if rej:
        by_rule = defaultdict(list)
        for f, v in rej:
            by_rule[v[1]].append((f, v))
        print('\n— LOẠI (%d) — phải xoá hoặc viết lại —' % len(rej))
        for rid in sorted(by_rule, key=lambda k: -len(by_rule[k])):
            items = by_rule[rid]
            print('\n  [%s] %s — %d fact' % (rid, items[0][1][2], len(items)))
            for f, _ in items:
                print('    %-8s %s  %s' % (f['id'], '[%s]' % f.get('cat'), f['t']))

    if warn:
        if show_warn:
            by_rule = defaultdict(list)
            for f, v in warn:
                by_rule[v[1]].append((f, v))
            print('\n— XEM (%d) — đọc bằng mắt rồi tự quyết —' % len(warn))
            for rid in sorted(by_rule, key=lambda k: -len(by_rule[k])):
                items = by_rule[rid]
                print('\n  [%s] %s — %d fact' % (rid, items[0][1][2], len(items)))
                for f, _ in items:
                    print('    %-8s %s  %s' % (f['id'], '[%s]' % f.get('cat'), f['t']))
        else:
            print('\n%d fact mức XEM (thêm -v để xem).' % len(warn))

    if rej:
        print('\nCổng định nghĩa: TRƯỢT. Xem CLAUDE.md §1.1.')
        return 1
    print('\nCổng định nghĩa: OK.')
    return 0


def cmd_stats(argv):
    man, facts = load()
    by_cat = Counter(f.get('cat') for f in facts)
    by_sub = Counter((f.get('cat'), f.get('sub')) for f in facts)
    clusters = man.get('clusters', {})

    print('%d fact\n' % len(facts))
    fat = []
    for c in man['categories']:
        cid = c['id']
        print('%-11s %4d  %s' % (cid, by_cat.get(cid, 0), c['label']))
        for sub in clusters.get(cid, []):
            k = by_sub.get((cid, sub), 0)
            warn = '  ← tách cụm' if k > CLUSTER_MAX else ''
            if k > CLUSTER_MAX:
                fat.append((cid, sub, k))
            print('   · %-26s %4d%s' % (sub, k, warn))
        unknown = [s for (c2, s) in by_sub if c2 == cid and s not in clusters.get(cid, [])]
        for s in sorted(set(unknown)):
            print('   · %-26s %4d  ← sub lạ' % (str(s), by_sub[(cid, s)]))
    print('\nviz: %d fact có minh hoạ' % sum(1 for f in facts if f.get('viz')))
    if fat:
        print('Cụm vượt %d fact, nên tách nhỏ: %s'
              % (CLUSTER_MAX, ', '.join('%s/%s (%d)' % x for x in fat)))
    return 0


def main():
    argv = sys.argv[1:]
    cmd = argv[0] if argv else 'check'
    rest = argv[1:]
    if cmd == 'check':
        return cmd_check(rest)
    if cmd == 'near':
        return cmd_near(rest)
    if cmd == 'verify':
        return cmd_verify(rest)
    if cmd == 'stats':
        return cmd_stats(rest)
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main())
