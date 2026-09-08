#!/usr/bin/env python3
"""Cổng cho data/collection.json — nội dung của index.html.

Chỉ kiểm thứ đúng/sai khách quan: JSON hợp lệ, trường bắt buộc có mặt và không rỗng,
phím tắt không trùng, href trỏ tới thứ tồn tại. KHÔNG kiểm độ dài mô tả: đã đo, 31 mô tả
đang chạy dài từ 24 tới 235 ký tự (trung vị 72), nên mọi ngưỡng chung đều là số bịa và sẽ
đánh trượt nội dung thật. Chất lượng một câu là việc của người viết, không phải của regex.
"""
import json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'collection.json')
TILE_FIELDS = ('key', 'icon', 'name', 'desc', 'href')
SUBJ_FIELDS = ('icon', 'title', 'meta')
FILE_FIELDS = ('key', 'icon', 'href', 'title', 'sub')
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

if err:
    print('collection: %d lỗi' % len(err))
    for e in err:
        print('  · %s' % e)
    sys.exit(1)

n = sum(len(s['items']) if s['kind'] == 'tiles'
        else sum(len(i['files']) for i in s['items']) for s in d['sections'])
print('collection: OK (%d section, %d mục, %d phím tắt).' % (len(d['sections']), n, len(keys)))
