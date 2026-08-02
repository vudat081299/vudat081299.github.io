#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
factlint — bộ kiểm tra cho thư viện fact.

Ba việc:
  check            kiểm tra cấu trúc (id trùng, cat/sub sai, thiếu src, viz không tồn tại)
                   + quét cả thư viện tìm cặp fact gần trùng nhau.
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
    Sinh cặp cần so, theo hai đường:
      - cùng (cat, sub): so hết trong cụm.
      - dùng chung một token hiếm: bắt trường hợp đặt sai cụm.
    """
    pairs = set()

    by_cluster = defaultdict(list)
    for i, f in enumerate(facts):
        by_cluster[(f.get('cat'), f.get('sub'))].append(i)
    for idxs in by_cluster.values():
        for a in range(len(idxs)):
            for b in range(a + 1, len(idxs)):
                pairs.add((idxs[a], idxs[b]))

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
                pairs.add((min(idxs[a], idxs[b]), max(idxs[a], idxs[b])))
    return pairs


def scan_dupes(facts, limit=None):
    vecs, df, _ = build_index(facts)
    out = []
    for i, j in candidate_pairs(facts, df):
        s = cosine(vecs[i], vecs[j])
        if s >= NEAR_SOFT:
            out.append((s, i, j))
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
    hard = [d for d in dupes if d[0] >= NEAR_HARD]

    if dupes:
        print('\n— Cặp gần trùng (%d cặp ≥ %.2f, trong đó %d cặp ≥ %.2f) —'
              % (len(dupes), NEAR_SOFT, len(hard), NEAR_HARD))
        for s, i, j in dupes:
            mark = '!!' if s >= NEAR_HARD else '..'
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
    if cmd == 'stats':
        return cmd_stats(rest)
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main())
