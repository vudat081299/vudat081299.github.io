#!/usr/bin/env python3
"""Cổng chất lượng cho shop/ — trang bán hàng đọc nội dung từ shop/data/shop.json.

Vì sao cần: trang này là một storefront, tức là nơi sai một con số thì khách trả nhầm tiền.
Nội dung nằm ở JSON nên phần kiểm HTML của pages/ và cooking/ không thấy nó — cổng phải soi
thẳng vào data. Push main = deploy lên GitHub Pages, không có build step nào bắt lỗi hộ.

Ba nhóm kiểm, theo đúng quy ước của lint-cooking.py:
  · LỖI  — chặn commit. Sai khách quan, sửa được ngay.
  · XEM  — chỉ cảnh báo. Đáng nhìn nhưng không đủ chắc để chặn.

Nhóm thứ ba là thứ riêng của thư mục này và là lý do nó tồn tại: **kiểm nội dung có rò từ
data ngược lên HTML hay không**. Luật repo là "khối lặp → chữ ở data". Một người vội sẽ gõ
thẳng tên sản phẩm vào HTML cho nhanh; lúc đó JSON và trang nói hai giá khác nhau mà không
ai biết. Nên: tên sản phẩm, tên danh mục, câu hỏi FAQ, tiêu đề giá trị/quy trình KHÔNG được
xuất hiện trong index.html.

Chạy:
  python3 shop/tools/lint-shop.py        # data + trang
  python3 shop/tools/lint-shop.py -v     # in cả mức XEM

Exit code: 1 nếu có LỖI, 0 nếu không.
"""
import collections
import html as htmlmod
import json
import pathlib
import re
import sys

SHOP = pathlib.Path(__file__).resolve().parent.parent
DATA = SHOP / 'data' / 'shop.json'

FORMS = {'jar', 'set', 'bottle', 'vial', 'emblem'}
NOTE_TIERS = {'top', 'heart', 'base'}
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')


def vnd(n):
    """123456 → "123.456" — đúng cách trang hiển thị giá."""
    return '{:,}'.format(int(n)).replace(',', '.')

RE_SCRIPT = re.compile(r'<script\b[^>]*>.*?</script\s*>', re.S | re.I)
RE_STYLE = re.compile(r'<style\b[^>]*>.*?</style\s*>', re.S | re.I)
RE_COMMENT = re.compile(r'<!--.*?-->', re.S)
RE_ID = re.compile(r'\bid="([^"]+)"')
RE_ANCHOR = re.compile(r'\bhref="#([^"]*)"')
RE_ASSET = re.compile(r'\b(?:src|href)="([^"]+)"')
BALANCED_TAGS = ('div', 'section', 'ul', 'ol', 'table')
ANCHOR_WHITELIST = {'', 'top'}


def strip_code(html):
    out = RE_COMMENT.sub(' ', html)
    out = RE_SCRIPT.sub(' ', out)
    return RE_STYLE.sub(' ', out)


# ── data ──────────────────────────────────────────────────────────────────────

def need(obj, fields, where, err):
    for f in fields:
        if f not in obj:
            err.append('%s: thiếu trường "%s"' % (where, f))
        elif isinstance(obj[f], str) and not obj[f].strip():
            err.append('%s: trường "%s" rỗng' % (where, f))
        elif isinstance(obj[f], (list, dict)) and len(obj[f]) == 0:
            err.append('%s: trường "%s" rỗng' % (where, f))


def check_data(path):
    err, note = [], []
    try:
        d = json.loads(path.read_text(encoding='utf-8'))
    except Exception as e:
        return ['JSON không đọc được — %s' % e], []

    need(d, ('brand', 'categories', 'products', 'values', 'steps',
             'reviews', 'faqs', 'quiz', 'stats', 'marquee', 'shipping', 'labels'), 'gốc', err)

    brand = d.get('brand') or {}
    need(brand, ('name', 'city', 'phone', 'email', 'address', 'hours'), 'brand', err)

    # danh mục
    cats, cat_names = {}, {}
    for i, c in enumerate(d.get('categories') or []):
        w = 'categories[%d]' % i
        need(c, ('k', 'name', 'desc', 'icon'), w, err)
        k = c.get('k')
        if k in cats:
            err.append('%s: k "%s" trùng với %s' % (w, k, cats[k]))
        cats[k] = c.get('name', w)
        cat_names[k] = c.get('name', '')

    # sản phẩm
    ids, moods, used_cats = {}, set(), collections.Counter()
    for i, p in enumerate(d.get('products') or []):
        w = 'products[%d]' % i
        need(p, ('id', 'cat', 'form', 'name', 'sub', 'story', 'specs', 'mood', 'art'), w, err)
        w = 'sản phẩm "%s"' % p.get('name', i)

        pid = p.get('id', '')
        if pid in ids:
            err.append('%s: id "%s" trùng với %s' % (w, pid, ids[pid]))
        elif pid and not SLUG.match(pid):
            err.append('%s: id "%s" phải là slug thường, nối bằng dấu gạch' % (w, pid))
        ids[pid] = w

        if p.get('cat') not in cats:
            err.append('%s: cat "%s" không có trong categories' % (w, p.get('cat')))
        else:
            used_cats[p['cat']] += 1

        form = p.get('form')
        if form not in FORMS:
            err.append('%s: form "%s" phải là một trong %s' % (w, form, '/'.join(sorted(FORMS))))
        if form == 'emblem' and not str(p.get('icon', '')).strip():
            err.append('%s: form "emblem" phải có "icon" (tên Material Symbols)' % w)

        # tiền — chỗ sai đắt nhất của một storefront
        price = p.get('price')
        if not isinstance(price, int) or isinstance(price, bool) or price <= 0:
            err.append('%s: price phải là số nguyên dương, đang là %r' % (w, price))
        cmp_ = p.get('compare', 0)
        if not isinstance(cmp_, int) or isinstance(cmp_, bool) or cmp_ < 0:
            err.append('%s: compare phải là số nguyên >= 0 (0 = không gạch giá), đang là %r' % (w, cmp_))
        elif cmp_ and isinstance(price, int) and cmp_ <= price:
            err.append('%s: compare %d không lớn hơn price %d — giá gạch thành ra rẻ hơn giá bán'
                       % (w, cmp_, price))
        stock = p.get('stock')
        if not isinstance(stock, int) or isinstance(stock, bool) or stock < 0:
            err.append('%s: stock phải là số nguyên >= 0, đang là %r' % (w, stock))

        art = p.get('art') or {}
        for key in ('glass', 'wax', 'glow'):
            v = art.get(key)
            if not isinstance(v, str) or not HEX.match(v):
                err.append('%s: art.%s phải là mã màu #rrggbb, đang là %r' % (w, key, v))

        for si, s in enumerate(p.get('specs') or []):
            need(s, ('k', 'v'), '%s › specs[%d]' % (w, si), err)

        nt = p.get('notes')
        if nt is None:
            err.append('%s: thiếu "notes" (dùng {} nếu sản phẩm không có tầng hương)' % w)
        elif nt:
            for tier, lst in nt.items():
                if tier not in NOTE_TIERS:
                    err.append('%s: tầng hương "%s" phải là top/heart/base' % (w, tier))
                if not isinstance(lst, list) or not lst or any(not str(x).strip() for x in lst):
                    err.append('%s: notes.%s phải là danh sách không rỗng' % (w, tier))

        md = p.get('mood') or []
        if not isinstance(md, list) or not md:
            err.append('%s: mood phải là danh sách không rỗng — quiz chấm điểm bằng nó' % w)
        moods.update(md)

    # danh mục rỗng = một tab lọc bấm vào không ra gì
    for k, name in cats.items():
        if not used_cats[k]:
            err.append('danh mục "%s": không có sản phẩm nào — tab lọc sẽ rỗng' % name)

    # quiz: tag không khớp mood nào thì bộ chọn mùi trả về rỗng
    qs = (d.get('quiz') or {}).get('questions') or []
    if not qs:
        err.append('quiz: không có câu hỏi nào')
    for qi, q in enumerate(qs):
        w = 'quiz › câu %d' % (qi + 1)
        need(q, ('q', 'options'), w, err)
        for oi, o in enumerate(q.get('options') or []):
            need(o, ('label', 'tag'), '%s › lựa chọn %d' % (w, oi + 1), err)
            t = o.get('tag')
            if t and t not in moods:
                err.append('%s: tag "%s" không khớp mood của sản phẩm nào' % (w, t))

    # đánh giá trỏ vào sản phẩm có thật
    for ri, r in enumerate(d.get('reviews') or []):
        w = 'reviews[%d]' % ri
        need(r, ('name', 'city', 'stars', 'product', 'text'), w, err)
        if r.get('product') and r['product'] not in ids:
            err.append('%s: product "%s" không khớp sản phẩm nào' % (w, r['product']))
        st = r.get('stars')
        if not isinstance(st, int) or isinstance(st, bool) or not 1 <= st <= 5:
            err.append('%s: stars phải là số nguyên 1–5, đang là %r' % (w, st))

    for fi, f in enumerate(d.get('faqs') or []):
        need(f, ('q', 'a'), 'faqs[%d]' % fi, err)
    for vi, v in enumerate(d.get('values') or []):
        need(v, ('icon', 'title', 'desc'), 'values[%d]' % vi, err)
    for si, s in enumerate(d.get('steps') or []):
        need(s, ('n', 'title', 'desc'), 'steps[%d]' % si, err)
    for si, s in enumerate(d.get('stats') or []):
        need(s, ('n', 'label'), 'stats[%d]' % si, err)
    for si, s in enumerate(d.get('shipping') or []):
        need(s, ('title', 'desc'), 'shipping[%d]' % si, err)

    # Giỏ hàng tính bằng số, khách đọc bằng chữ. Hai chỗ lệch nhau thì thanh "mua thêm bao
    # nhiêu nữa được miễn phí ship" nói một đằng, đoạn Giao hàng nói một nẻo.
    lb = d.get('labels') or {}
    prose = ' '.join((x.get('desc') or '') for x in (d.get('shipping') or []))
    for key in ('ship_fee', 'free_ship'):
        v = lb.get(key)
        if not isinstance(v, int) or isinstance(v, bool) or v <= 0:
            err.append('labels.%s phải là số nguyên dương, đang là %r' % (key, v))
        elif vnd(v) not in prose:
            err.append('labels.%s = %s nhưng không có chỗ nào trong `shipping` nói con số đó — '
                       'giỏ hàng và đoạn Giao hàng đang nói hai giá khác nhau' % (key, vnd(v)))

    if 'Thay bằng' in str(brand.get('address', '')) or 'example' in str(brand.get('email', '')):
        note.append('brand: điện thoại/email/địa chỉ vẫn là chỗ để trống — thay trước khi phát hành')

    return err, note


# ── trang ─────────────────────────────────────────────────────────────────────

def repeated_text(d):
    """Chữ thuộc khối LẶP — thứ bắt buộc phải sống ở data, không được nằm trong HTML.

    KHÔNG kiểm tên danh mục. Đã đo: hai trong ba lần báo oan đầu tiên đến từ chúng, vì
    "Nến thơm" / "Phụ kiện" là danh từ hai chữ trùng với tiếng Việt bình thường của trang
    ("Lặng · Nến thơm thủ công"). Đổi lại, rủi ro bỏ sót gần như không có: dải tab danh mục
    được sinh từ data kèm số đếm, không ai ngồi gõ tay ra.
    """
    out = []
    for p in d.get('products') or []:
        out.append(('tên sản phẩm', p.get('name', '')))
    for f in d.get('faqs') or []:
        out.append(('câu hỏi FAQ', f.get('q', '')))
    for v in d.get('values') or []:
        out.append(('tiêu đề giá trị', v.get('title', '')))
    for s in d.get('steps') or []:
        out.append(('tiêu đề bước', s.get('title', '')))
    for r in d.get('reviews') or []:
        out.append(('đánh giá', (r.get('text', '') or '')[:40]))
    return [(kind, t) for kind, t in out if len(t.strip()) >= 4]


def check_page(path, data):
    raw = path.read_text(encoding='utf-8', errors='replace')
    markup = strip_code(raw)
    err, note = [], []

    ids = RE_ID.findall(markup)
    for name, count in sorted(collections.Counter(ids).items()):
        if count > 1:
            err.append('id trùng %d lần: id="%s"' % (count, name))

    idset = set(ids)
    for target in sorted(set(RE_ANCHOR.findall(markup))):
        if target not in ANCHOR_WHITELIST and target not in idset:
            err.append('anchor gãy: href="#%s" — không có id nào tên vậy' % target)

    for ref in sorted(set(RE_ASSET.findall(markup))):
        if ref.startswith(('#', 'http://', 'https://', '//', 'mailto:', 'data:', 'tel:')):
            continue
        t = (path.parent / ref.split('?', 1)[0].split('#', 1)[0]).resolve()
        if not t.exists():
            err.append('asset thiếu: %s' % ref)

    for tag in BALANCED_TAGS:
        o = len(re.findall(r'<%s\b' % tag, markup, re.I))
        c = len(re.findall(r'</%s\s*>' % tag, markup, re.I))
        if o != c:
            err.append('<%s> lệch: mở %d / đóng %d' % (tag, o, c))

    # ── nội dung rò từ data lên HTML — lý do cổng này tồn tại ──────────────────
    # Soi TEXT NODE, không soi cả file: "Nến thơm" trong <title> hay "Rót tay" trong câu
    # eyebrow của hero là tiếng Việt bình thường, không phải một mục bị chép ra. Một mục
    # thật sự bị chép ra thì luôn chiếm gần trọn phần tử chứa nó — <h3>Bước 3 — Rót tay</h3>
    # — nên ngưỡng là tỉ lệ "chuỗi / text node". Con số 0.40 là số ĐO được, không phải số
    # bịa: trên trang thật, chỗ trùng hợp lệ cao nhất là 28% ("Rót tay" trong câu eyebrow
    # của hero), còn một mục cố tình chép vào đo được 44%. Luật substring thô trước đó báo
    # 3 lỗi và cả 3 đều oan. Nếu sau này có câu văn vượt ngưỡng, hãy ĐO lại rồi chỉnh, đừng
    # đoán một số mới.
    nodes = []
    for chunk in re.split(r'<[^>]*>', markup):
        t = ' '.join(htmlmod.unescape(chunk).split())
        if len(t) >= 4:
            nodes.append(t)
    for kind, text in repeated_text(data):
        for node in nodes:
            if text in node and len(text) >= .40 * len(node):
                err.append('nội dung lặp nằm trong HTML: %s "%s" — chữ này phải ở '
                           'data/shop.json, không thì hai chỗ sẽ lệch nhau' % (kind, text))
                break

    if not re.search(r'<html[^>]*\blang=', raw, re.I):
        note.append('thiếu <html lang="…">')
    if not re.search(r'<meta[^>]+viewport', raw, re.I):
        note.append('thiếu <meta viewport>')
    if not re.search(r'<title\s*>\s*\S', raw, re.I):
        note.append('thiếu <title> có nội dung')
    if not re.search(r'charset', raw, re.I):
        note.append('thiếu khai báo charset — tiếng Việt dễ vỡ dấu')
    if 'prefers-reduced-motion' not in raw:
        note.append('không thấy @media (prefers-reduced-motion) — trang nhiều animation nên phải có')

    return err, note


def main(argv):
    verbose = '-v' in argv or '--verbose' in argv

    data_err, data_note = check_data(DATA)
    try:
        data = json.loads(DATA.read_text(encoding='utf-8'))
    except Exception:
        data = {}

    pages = sorted(SHOP.glob('*.html'))
    total_err, total_note = len(data_err), len(data_note)

    if data_err:
        print('\ndata/shop.json — LỖI (%d):' % len(data_err))
        for e in data_err:
            print('    %s' % e)
    if data_note and verbose:
        print('\ndata/shop.json — XEM (%d):' % len(data_note))
        for n in data_note:
            print('    %s' % n)

    for p in pages:
        e, n = check_page(p, data)
        total_err += len(e)
        total_note += len(n)
        if e:
            print('\n%s — LỖI (%d):' % (p.name, len(e)))
            for x in e:
                print('    %s' % x)
        if n and verbose:
            print('\n%s — XEM (%d):' % (p.name, len(n)))
            for x in n:
                print('    %s' % x)

    print()
    if total_note and not verbose:
        print('%d mục mức XEM (thêm -v để xem).' % total_note)
    if total_err:
        print('shop: %d LỖI.' % total_err)
        return 1
    print('shop: OK (%d sản phẩm, %d danh mục, %d trang).'
          % (len(data.get('products') or []), len(data.get('categories') or []), len(pages)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
