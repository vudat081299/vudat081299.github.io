#!/usr/bin/env python3
"""Cổng cho data/collection.json — nội dung của index.html.

Chỉ kiểm thứ đúng/sai khách quan: JSON hợp lệ, trường bắt buộc có mặt và không rỗng,
phím tắt không trùng, href trỏ tới thứ tồn tại. KHÔNG kiểm độ dài mô tả: đã đo, 31 mô tả
đang chạy dài từ 24 tới 235 ký tự (trung vị 72), nên mọi ngưỡng chung đều là số bịa và sẽ
đánh trượt nội dung thật. Chất lượng một câu là việc của người viết, không phải của regex.

Kiểm cả chiều ngược lại: mọi .html trong pages/ và cooking/ phải được một mục trỏ tới.
Thiếu chiều này thì một trang viết xong vẫn có thể vô hình — đã xảy ra hai lần.
"""
import json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'collection.json')
# `key` KHÔNG bắt buộc: keyspace phím tắt chỉ có 36 ô (0-9 + a-z) và đã dùng hết
# 20/09/2026. Mục thêm sau đó không có phím riêng và đi bằng ô tìm kiếm — vẫn hợp lệ.
# Có `key` thì vẫn phải đúng một ký tự thường và không trùng (kiểm ở dưới).
TILE_FIELDS = ('icon', 'name', 'desc', 'href')
SUBJ_FIELDS = ('icon', 'title', 'meta')
FILE_FIELDS = ('icon', 'href', 'title', 'sub')
err = []


def need(obj, fields, where):
    for f in fields:
        if f not in obj:
            err.append('%s: thiếu trường "%s"' % (where, f))
        elif not str(obj[f]).strip():
            err.append('%s: trường "%s" rỗng' % (where, f))


def href_ok(h):
    p = os.path.join(ROOT, h)
    return os.path.isfile(p) or (os.path.isdir(p) and os.path.isfile(os.path.join(p, 'index.html')))


try:
    d = json.load(open(DATA, encoding='utf-8'))
except Exception as e:
    print('collection: JSON không đọc được — %s' % e)
    sys.exit(1)

if not d.get('sections'):
    err.append('gốc: thiếu hoặc rỗng "sections"')

keys, sec_ids = {}, {}
for si, sec in enumerate(d.get('sections', [])):
    w = 'section[%d]' % si
    need(sec, ('id', 'icon', 'label', 'desc', 'kind'), w)
    w = 'section "%s"' % sec.get('label', si)
    if sec.get('kind') not in ('tiles', 'subjects'):
        err.append('%s: kind phải là tiles hoặc subjects, đang là %r' % (w, sec.get('kind')))
    if sec.get('id') in sec_ids:
        err.append('%s: id "%s" trùng với %s' % (w, sec['id'], sec_ids[sec['id']]))
    sec_ids[sec.get('id')] = w
    if not sec.get('items'):
        err.append('%s: không có item nào' % w)

    for ii, it in enumerate(sec.get('items', [])):
        if sec.get('kind') == 'tiles':
            need(it, TILE_FIELDS, '%s › item[%d]' % (w, ii))
            entries = [(it, '%s › %s' % (w, it.get('name', ii)))]
        else:
            need(it, SUBJ_FIELDS, '%s › subject[%d]' % (w, ii))
            if not it.get('files'):
                err.append('%s › subject "%s": không có file nào' % (w, it.get('title', ii)))
            entries = []
            for fi, f in enumerate(it.get('files', [])):
                need(f, FILE_FIELDS, '%s › %s › file[%d]' % (w, it.get('title', ii), fi))
                entries.append((f, '%s › %s › %s' % (w, it.get('title', ii), f.get('title', fi))))

        for obj, where in entries:
            k = str(obj.get('key', '')).strip()
            if k:
                if len(k) != 1:
                    err.append('%s: key "%s" phải đúng một ký tự (phím tắt)' % (where, k))
                if k != k.lower():
                    err.append('%s: key "%s" phải viết thường — JS so bằng e.key.toLowerCase()' % (where, k))
                if k in keys:
                    err.append('%s: key "%s" trùng với %s' % (where, k, keys[k]))
                keys[k] = where
            h = str(obj.get('href', '')).strip()
            if h and not h.startswith(('http://', 'https://')) and not href_ok(h):
                err.append('%s: href "%s" không tồn tại' % (where, h))

# --- Trang mồ côi: có file nhưng không ai trỏ tới ------------------------------
# Hai trang đã viết xong nằm im ngoài danh mục suốt nhiều tháng mà không cổng nào
# kêu: pages/family-insurance-benefits.html và pages/jazz-piano-theory.html (phát
# hiện 20/09/2026 khi rà tay). Lỗi này không tự lộ — trang vẫn mở được bằng URL
# trực tiếp, chỉ là không ai tìm thấy nó từ trang chủ. Nên phải có máy kiểm.
#
# Chỉ soi hai thư mục mà "một file .html = một trang của danh mục" là đúng theo
# định nghĩa. KHÔNG soi masters-degree/, portfolio/, stuff/, poem/: ở đó một thư
# mục có thể chứa file phụ, bản nháp hoặc trang con, nên vắng mặt không phải lỗi.
WATCHED = ('pages', 'cooking')
# Cố ý không niêm yết — mỗi dòng phải kèm lý do, đừng thêm chỉ để cổng xanh.
ALLOW_UNLISTED = {
    # Chủ trang cho gỡ khỏi danh mục ngày 21/09/2026. Trang nói về hai hợp đồng bảo
    # hiểm nhân thọ CÓ THẬT của gia đình — quyền lợi, phí, dòng tiền — nên không
    # thuộc về một trang chủ công khai. File vẫn nằm trong repo và vẫn mở được bằng
    # URL trực tiếp; muốn nó thật sự không công khai thì phải loại trừ trong
    # .github/workflows/deploy.yml, y như shop/docs.
    'pages/family-insurance-benefits.html': 'riêng tư — chủ trang cho gỡ 21/09/2026',
}

listed = set()
for sec in d.get('sections', []):
    for it in sec.get('items', []):
        for obj in ([it] if sec.get('kind') == 'tiles' else it.get('files', [])):
            h = str(obj.get('href', '')).strip()
            if h:
                listed.add(os.path.normpath(h))

for folder in WATCHED:
    dirpath = os.path.join(ROOT, folder)
    if not os.path.isdir(dirpath):
        continue
    for name in sorted(os.listdir(dirpath)):
        if not name.endswith('.html'):
            continue
        rel = os.path.normpath(os.path.join(folder, name))
        if rel in listed or rel in ALLOW_UNLISTED:
            continue
        err.append('%s: có file nhưng không mục nào trong collection.json trỏ tới '
                   '— thêm một item, hoặc ghi vào ALLOW_UNLISTED kèm lý do' % rel)

if err:
    print('collection: %d lỗi' % len(err))
    for e in err:
        print('  · %s' % e)
    sys.exit(1)

n = sum(len(s['items']) if s['kind'] == 'tiles'
        else sum(len(i['files']) for i in s['items']) for s in d['sections'])
print('collection: OK (%d section, %d mục, %d/36 phím tắt; %s không có trang mồ côi).'
      % (len(d['sections']), n, len(keys), '/'.join(WATCHED)))
