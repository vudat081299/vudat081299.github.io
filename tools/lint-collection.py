#!/usr/bin/env python3
"""Cổng cho data/collection.json — nội dung của index.html.

Chỉ kiểm thứ đúng/sai khách quan: JSON hợp lệ, trường bắt buộc có mặt và không rỗng,
phím tắt không trùng, href trỏ tới thứ tồn tại. KHÔNG kiểm độ dài mô tả: đã đo lại
21/09/2026, 35 mô tả đang chạy dài từ 24 tới 193 ký tự (trung vị 77), nên mọi ngưỡng chung
đều là số bịa và sẽ đánh trượt nội dung thật. Chất lượng một câu là việc của người viết,
không phải của regex.

Kiểm cả chiều ngược lại: mọi .html trong pages/ và cooking/ phải được một mục trỏ tới.
Thiếu chiều này thì một trang viết xong vẫn có thể vô hình — đã xảy ra hai lần.

Và một chiều nữa, ngược lại lần nữa: vài trang cố ý không có mục trong danh mục. Hai
danh sách, khác nhau đúng ở chỗ trang có lên web hay không:

  · WITHHELD — không link, và KHÔNG deploy. Cổng bắt deploy.yml phải `--exclude`.
  · UNLISTED — không link, nhưng VẪN deploy. Cổng bắt deploy.yml KHÔNG được `--exclude`.

Cả hai đều cấm trang quay lại collection.json, vì lý do y hệt nhau.
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
# --- Trang chủ trang chốt KHÔNG công khai ---------------------------------------
# Khai một đường dẫn ở đây thì cổng làm BA việc, không phải một:
#
#   1. miễn cho nó khỏi cổng trang mồ côi ngay dưới — nó được phép không có mục
#      nào trỏ tới;
#   2. CẤM nó quay lại collection.json. Chỉ miễn trừ thôi là không đủ: ngày
#      21/09/2026 một phiên agent thấy file nằm ngoài danh mục liền "sửa giúp"
#      bằng cách niêm yết nó lên trang chủ. Cổng phải chặn cả chiều ngược lại,
#      không thì lần sau lại thế;
#   3. bắt .github/workflows/deploy.yml có --exclude cho nó. Gỡ khỏi danh mục
#      CHỈ bỏ cái link: rsync vẫn chép file lên Pages và URL trực tiếp vẫn trả
#      HTTP 200 — đã đo đúng ngày ấy.
#
# Danh sách này CỐ Ý không ghi lý do từng trang, và đừng ai thêm vào: repo public,
# nên một dòng lý do nằm cạnh đường dẫn thì chính nó là tấm biển chỉ đường. Đây là
# quyết định của chủ trang (21/09/2026); muốn bỏ một dòng ra thì HỎI chủ trang,
# đừng tự suy từ nội dung file.
WITHHELD = (
    'pages/family-insurance-benefits.html',
    'pages/wealth-roadmap.html',
)

# --- Trang cố ý không có link ở trang chủ, nhưng VẪN lên web --------------------
# Khác WITHHELD ở đúng một chiều, và đúng cái chiều đáng tiền: trang ở đây vẫn được
# rsync đẩy lên Pages và vẫn mở được bằng URL trực tiếp — chỉ là trang chủ không trỏ
# tới. Khai một đường dẫn vào đây thì cổng làm ba việc:
#
#   1. miễn cho nó khỏi cổng trang mồ côi ngay dưới;
#   2. CẤM nó xuất hiện trong collection.json. Cần y như WITHHELD và vì lý do y hệt:
#      một phiên agent thấy file nằm ngoài danh mục là muốn "sửa giúp" bằng cách
#      niêm yết nó lên trang chủ (đã xảy ra 21/09/2026);
#   3. ĐÒI deploy.yml KHÔNG có `--exclude` cho nó — chiều ngược hẳn với WITHHELD.
#      Khai vào đây là nói "trang này phải sống ở URL trực tiếp", nên ai thêm dòng
#      loại trừ vào thì cổng phải đỏ; không thì lời khai và thực tế lệch nhau mà
#      không ai biết, đúng cái bệnh mà hai danh sách này sinh ra để chữa.
#
# Một đường dẫn chỉ được nằm ở ĐÚNG MỘT trong hai danh sách — kiểm ở dưới.
UNLISTED = (
    'pages/betting-strategy-lab.html',
)

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
        if rel in listed or rel in WITHHELD or rel in UNLISTED:
            continue
        err.append('%s: có file nhưng không mục nào trong collection.json trỏ tới '
                   '— thêm một item, hoặc khai vào WITHHELD (không deploy) / '
                   'UNLISTED (vẫn deploy)' % rel)

# Một đường dẫn không được vừa "không lên web" vừa "vẫn lên web".
for h in set(WITHHELD) & set(UNLISTED):
    err.append('%s: nằm trong CẢ WITHHELD lẫn UNLISTED — hai danh sách nói ngược nhau '
               'về chuyện trang có được deploy hay không; chọn một' % h)

# Chiều ngược lại của cả hai danh sách: đã chốt không niêm yết thì không niêm yết lại.
for h in WITHHELD + UNLISTED:
    if os.path.normpath(h) in listed:
        err.append('%s: nằm trong danh sách không niêm yết nhưng collection.json vẫn có mục '
                   'trỏ tới — gỡ mục ấy đi; đừng bỏ đường dẫn khỏi danh sách để cổng xanh' % h)

# ...và deploy.yml phải loại trừ, nếu không file vẫn lên GitHub Pages.
WORKFLOW = os.path.join(ROOT, '.github', 'workflows', 'deploy.yml')
if os.path.isfile(WORKFLOW):
    wf = open(WORKFLOW, encoding='utf-8').read()
    for h in WITHHELD:
        if ("--exclude '%s'" % h) not in wf:
            err.append("deploy.yml thiếu --exclude '%s' — rsync sẽ chép file lên Pages "
                       "và URL trực tiếp mở được, dù trang chủ không còn link" % h)
    for h in UNLISTED:
        if ("--exclude '%s'" % h) in wf:
            err.append("deploy.yml có --exclude '%s', nhưng đường dẫn ấy khai trong UNLISTED "
                       "— tức là CỐ Ý vẫn cho lên web, chỉ bỏ link ở trang chủ. Muốn gỡ hẳn "
                       "khỏi web thì chuyển nó sang WITHHELD, đừng để hai chỗ nói ngược nhau" % h)

if err:
    print('collection: %d lỗi' % len(err))
    for e in err:
        print('  · %s' % e)
    sys.exit(1)

n = sum(len(s['items']) if s['kind'] == 'tiles'
        else sum(len(i['files']) for i in s['items']) for s in d['sections'])
print('collection: OK (%d section, %d mục, %d/36 phím tắt; %s không có trang mồ côi; '
      '%d trang gỡ khỏi web, %d trang vẫn lên web mà không niêm yết).'
      % (len(d['sections']), n, len(keys), '/'.join(WATCHED), len(WITHHELD), len(UNLISTED)))
