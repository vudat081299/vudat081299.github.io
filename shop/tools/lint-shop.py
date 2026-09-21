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
import itertools
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

    need(d, ('brand', 'scents', 'products', 'payment', 'values', 'faqs',
             'shipping', 'labels', 'marquee', 'placeholder_banner'), 'gốc', err)

    brand = d.get('brand') or {}
    need(brand, ('name', 'city', 'phone', 'email', 'address', 'hours'), 'brand', err)

    # ── mùi hương: trục phân loại của trang sản phẩm ───────────────────────────
    scents, used = {}, collections.Counter()
    for i, c in enumerate(d.get('scents') or []):
        w = 'scents[%d]' % i
        need(c, ('k', 'n', 'name', 'slot', 'tagline', 'feel', 'when', 'notes', 'mood', 'art'), w, err)
        w = 'mùi "%s"' % c.get('name', i)
        k = c.get('k')
        if k in scents:
            err.append('%s: k "%s" trùng với %s' % (w, k, scents[k]))
        scents[k] = w

        art = c.get('art') or {}
        for key in ('glass', 'wax', 'glow'):
            v = art.get(key)
            if not isinstance(v, str) or not HEX.match(v):
                err.append('%s: art.%s phải là mã màu #rrggbb, đang là %r' % (w, key, v))

        nt = c.get('notes')
        if not isinstance(nt, dict) or not nt:
            err.append('%s: thiếu "notes" (top/heart/base)' % w)
        else:
            for tier, lst in nt.items():
                if tier not in NOTE_TIERS:
                    err.append('%s: tầng hương "%s" phải là top/heart/base' % (w, tier))
                if not isinstance(lst, list) or not lst or any(not str(x).strip() for x in lst):
                    err.append('%s: notes.%s phải là danh sách không rỗng' % (w, tier))

    # ── sản phẩm ───────────────────────────────────────────────────────────────
    ids = {}
    for i, pr in enumerate(d.get('products') or []):
        w = 'products[%d]' % i
        need(pr, ('id', 'scent', 'form', 'name', 'sub', 'story', 'specs'), w, err)
        w = 'sản phẩm "%s"' % pr.get('name', i)

        pid = pr.get('id', '')
        if pid in ids:
            err.append('%s: id "%s" trùng với %s' % (w, pid, ids[pid]))
        elif pid and not SLUG.match(pid):
            err.append('%s: id "%s" phải là slug thường, nối bằng dấu gạch' % (w, pid))
        ids[pid] = w

        if pr.get('scent') not in scents:
            err.append('%s: scent "%s" không có trong scents' % (w, pr.get('scent')))
        else:
            used[pr['scent']] += 1

        if pr.get('form') not in FORMS:
            err.append('%s: form "%s" phải là một trong %s' % (w, pr.get('form'), '/'.join(sorted(FORMS))))
        if pr.get('form') == 'emblem' and not str(pr.get('icon', '')).strip():
            err.append('%s: form "emblem" phải có "icon"' % w)

        price = pr.get('price')
        if not isinstance(price, int) or isinstance(price, bool) or price <= 0:
            err.append('%s: price phải là số nguyên dương, đang là %r' % (w, price))
        cmp_ = pr.get('compare', 0)
        if not isinstance(cmp_, int) or isinstance(cmp_, bool) or cmp_ < 0:
            err.append('%s: compare phải là số nguyên >= 0, đang là %r' % (w, cmp_))
        elif cmp_ and isinstance(price, int) and cmp_ <= price:
            err.append('%s: compare %d không lớn hơn price %d — giá gạch thành ra rẻ hơn giá bán'
                       % (w, cmp_, price))
        stock = pr.get('stock')
        if not isinstance(stock, int) or isinstance(stock, bool) or stock < 0:
            err.append('%s: stock phải là số nguyên >= 0, đang là %r' % (w, stock))

        for si, sp in enumerate(pr.get('specs') or []):
            need(sp, ('k', 'v'), '%s › specs[%d]' % (w, si), err)

    # Mùi không có sản phẩm nào = một section ở trang sản phẩm không có gì để mua.
    for k, w in scents.items():
        if not used[k]:
            err.append('%s: không có sản phẩm nào trỏ vào — section sẽ không có nút mua' % w)

    # ── Tìm mùi ────────────────────────────────────────────────────────────────
    # Đây là cổng đáng giá nhất của trang này. Bộ câu hỏi chấm điểm bằng trọng số, mà
    # trọng số thì sửa một con số là lệch cả kết quả — và lệch KHÔNG kêu: trang vẫn chạy,
    # vẫn ra một mùi, chỉ là mùi ấy sai. Nên cổng duyệt TOÀN BỘ tổ hợp đáp án (vài trăm,
    # máy làm trong mili-giây) rồi hỏi ba câu mà mắt người không tự trả lời được:
    #   · mùi nào KHÔNG BAO GIỜ thắng? → cửa hàng có một mùi mà trang này không bao giờ
    #     giới thiệu cho ai. Đó là lỗi, không phải lựa chọn thiết kế.
    #   · mùi nào thắng QUÁ NỬA số tổ hợp? → bộ câu hỏi chỉ là một cái phễu đổ về một mùi.
    #   · bao nhiêu tổ hợp hoà ở đỉnh mà câu phân xử cũng không gỡ được? → số đó rơi vào
    #     thứ tự khai trong `scents`, tức là thiên vị mùi đứng trước.
    quiz = d.get('quiz') or {}
    qs = quiz.get('questions') or []
    if not qs:
        err.append('quiz: không có câu hỏi nào')
    scoring, intent = [], []
    seen_q = set()
    for i, q in enumerate(qs):
        w = 'quiz.questions[%d]' % i
        need(q, ('k', 'q', 'hint', 'options'), w, err)
        w = 'câu hỏi "%s"' % (q.get('k') or i)
        if q.get('k') in seen_q:
            err.append('%s: k trùng' % w)
        seen_q.add(q.get('k'))
        opts = q.get('options') or []
        if len(opts) < 2:
            err.append('%s: phải có ít nhất 2 đáp án' % w)
        seen_o = set()
        for j, o in enumerate(opts):
            ow = '%s › đáp án[%d]' % (w, j)
            need(o, ('k', 't'), ow, err)
            if o.get('k') in seen_o:
                err.append('%s: k "%s" trùng trong cùng câu' % (ow, o.get('k')))
            seen_o.add(o.get('k'))
            if q.get('scoring') is False:
                if not str(o.get('go', '')).strip():
                    err.append('%s: câu không chấm điểm thì mỗi đáp án phải có "go"' % ow)
            else:
                wt = o.get('w')
                if not isinstance(wt, dict) or not wt:
                    err.append('%s: thiếu trọng số "w"' % ow)
                    continue
                for k, v in wt.items():
                    if k not in scents:
                        err.append('%s: trọng số trỏ vào mùi "%s" không có trong scents' % (ow, k))
                    if not isinstance(v, int) or isinstance(v, bool) or v <= 0:
                        err.append('%s: trọng số của "%s" phải là số nguyên dương, đang là %r' % (ow, k, v))
                # Đáp án không đẩy về mùi nào là một đáp án chết: bấm vào nó không đổi gì.
                if not any(isinstance(v, int) and v > 0 for v in wt.values()):
                    err.append('%s: mọi trọng số đều bằng 0 — chọn đáp án này không đổi kết quả' % ow)
        (intent if q.get('scoring') is False else scoring).append(q)

    # mỗi "go" phải có một mục outro tương ứng, nếu không trang kết quả không có nút nào
    outro = {x.get('k') for x in (quiz.get('outro') or [])}
    for oi, o in enumerate(quiz.get('outro') or []):
        need(o, ('k', 't', 'd'), 'quiz.outro[%d]' % oi, err)
    for q in intent:
        for o in q.get('options') or []:
            if o.get('go') and o['go'] not in outro:
                err.append('câu ý định: "go": "%s" không có mục nào trong quiz.outro — '
                           'trang kết quả sẽ không có nút dẫn đi đâu' % o['go'])

    tb = quiz.get('tiebreak')
    if qs and tb not in [q.get('k') for q in scoring]:
        err.append('quiz.tiebreak "%s" phải là k của một câu CÓ chấm điểm — hoà ở đỉnh sẽ '
                   'không có gì phân xử ngoài thứ tự khai trong scents' % tb)

    if scoring and not err:
        combos = 1
        for q in scoring:
            combos *= len(q.get('options') or [])
        if combos > 200000:
            note.append('quiz: %d tổ hợp, quá nhiều để duyệt hết — bỏ qua phần kiểm mùi thắng' % combos)
        else:
            order = {k: i for i, k in enumerate(scents)}
            tw_q = [q for q in scoring if q.get('k') == tb]
            tb_i = scoring.index(tw_q[0]) if tw_q else 0
            wins = collections.Counter()
            ties = unresolved = 0
            for combo in itertools.product(*[q['options'] for q in scoring]):
                sc = collections.Counter()
                for o in combo:
                    for k, v in (o.get('w') or {}).items():
                        sc[k] += v
                best = max(sc.values()) if sc else 0
                top = [k for k in scents if sc.get(k, 0) == best]
                if len(top) > 1:
                    ties += 1
                    tw = combo[tb_i].get('w') or {}
                    m = max(tw.get(k, 0) for k in top)
                    top2 = [k for k in top if tw.get(k, 0) == m]
                    if len(top2) > 1:
                        unresolved += 1
                    top = top2
                wins[sorted(top, key=lambda k: order[k])[0]] += 1

            for k in scents:
                if not wins[k]:
                    err.append('quiz: %s KHÔNG BAO GIỜ thắng trong %d tổ hợp đáp án — '
                               'trang Tìm mùi sẽ không bao giờ giới thiệu nó cho ai. Sửa trọng số '
                               'hoặc bỏ mùi này khỏi cửa hàng.' % (scents[k], combos))
                elif wins[k] * 2 > combos:
                    err.append('quiz: %s thắng %d/%d tổ hợp (%.0f%%) — bộ câu hỏi đang là '
                               'một cái phễu đổ về một mùi, không phải một phép chọn'
                               % (scents[k], wins[k], combos, 100.0 * wins[k] / combos))
            spread = (max(wins.values()) - min(wins.values())) * 100.0 / combos if wins else 0
            names = {c.get('k'): (c.get('name') or c.get('k')) for c in (d.get('scents') or [])}
            note.append('quiz: %d tổ hợp · %s · chênh lệch cao–thấp %.1f điểm phần trăm'
                        % (combos, ' · '.join('%s %.0f%%' % (names.get(k, k), 100.0 * wins[k] / combos)
                                              for k in scents), spread))
            if unresolved:
                note.append('quiz: %d/%d tổ hợp (%.1f%%) hoà ở đỉnh mà câu "%s" cũng không gỡ được — '
                            'số này rơi vào thứ tự khai trong scents, tức là thiên vị mùi đứng trước'
                            % (unresolved, combos, 100.0 * unresolved / combos, tb))

    # ── hộp quà ────────────────────────────────────────────────────────────────
    gift = d.get('gift') or {}
    if gift:
        need(gift, ('boxes', 'cards', 'wraps', 'steps', 'labels', 'msg_max'), 'gift', err)
        mx = gift.get('msg_max')
        if not isinstance(mx, int) or isinstance(mx, bool) or not (20 <= mx <= 500):
            err.append('gift.msg_max phải là số nguyên 20–500, đang là %r' % mx)
        sizes = set()
        for i, b in enumerate(gift.get('boxes') or []):
            w = 'gift.boxes[%d]' % i
            need(b, ('k', 'n', 'name', 'desc'), w, err)
            n = b.get('n')
            if not isinstance(n, int) or isinstance(n, bool) or n < 1:
                err.append('%s: n phải là số nguyên >= 1, đang là %r' % (w, n))
            else:
                sizes.add(n)
            off = b.get('off', 0)
            if not isinstance(off, int) or isinstance(off, bool) or not (0 <= off <= 50):
                err.append('%s: off phải là số nguyên 0–50 (phần trăm), đang là %r' % (w, off))
        if sizes and 1 not in sizes:
            err.append('gift.boxes: không có hộp nào chứa 1 ngọn — hộp rẻ nhất phải mua được')
        # Mỗi nhóm phụ kiện phải có một lựa chọn 0 đồng, nếu không hộp rẻ nhất bị ép mua thêm.
        for key, label in (('cards', 'thiệp'), ('wraps', 'cách gói')):
            items = gift.get(key) or []
            for i, x in enumerate(items):
                w = 'gift.%s[%d]' % (key, i)
                need(x, ('k', 'name', 'desc'), w, err)
                pr = x.get('price')
                if not isinstance(pr, int) or isinstance(pr, bool) or pr < 0:
                    err.append('%s: price phải là số nguyên >= 0, đang là %r' % (w, pr))
                if key == 'wraps':
                    for c in ('paper', 'ribbon'):
                        v = x.get(c)
                        if not isinstance(v, str) or not HEX.match(v):
                            err.append('%s: %s phải là mã màu #rrggbb, đang là %r' % (w, c, v))
            if items and not any(x.get('price') == 0 for x in items):
                err.append('gift.%s: không có lựa chọn nào 0 đồng — hộp rẻ nhất bị ép mua thêm %s'
                           % (key, label))
        for i, st in enumerate(gift.get('steps') or []):
            need(st, ('k', 't', 'd'), 'gift.steps[%d]' % i, err)
        # Hộp quà lấy sản phẩm theo mùi và chỉ lấy CÁI ĐẦU TIÊN. Mùi có hai sản phẩm thì
        # nó lặng lẽ chọn hộ, và không ai biết nó chọn cái nào.
        for k, w in scents.items():
            if used[k] > 1:
                note.append('%s: có %d sản phẩm trỏ vào — hộp quà chỉ lấy sản phẩm ĐẦU TIÊN '
                            'của mỗi mùi, hai cái còn lại không bao giờ vào được hộp' % (w, used[k]))

    # ── thanh toán ─────────────────────────────────────────────────────────────
    pay = d.get('payment') or {}
    methods = pay.get('methods') or []
    if not methods:
        err.append('payment: không có cách thanh toán nào')
    seen_m = set()
    for i, m in enumerate(methods):
        w = 'payment.methods[%d]' % i
        need(m, ('k', 'name', 'icon', 'desc'), w, err)
        w = 'cách thanh toán "%s"' % m.get('name', i)
        if m.get('k') in seen_m:
            err.append('%s: k "%s" trùng' % (w, m.get('k')))
        seen_m.add(m.get('k'))
        if 'ready' not in m:
            err.append('%s: thiếu "ready" (true/false)' % w)
        # Một cách CHƯA bật mà không nói thiếu gì thì trang chỉ hiện "chưa cấu hình"
        # rỗng không — người đọc không biết phải làm gì tiếp.
        if m.get('ready') is False and not (m.get('need') or []):
            err.append('%s: ready=false thì "need" phải liệt kê thứ còn thiếu' % w)
        if m.get('k') == 'bank' and m.get('ready'):
            bank = m.get('bank') or {}
            for f in ('name', 'bin', 'account', 'holder'):
                if not str(bank.get(f, '')).strip():
                    err.append('%s: ready=true nhưng bank.%s còn rỗng — mã VietQR sẽ sai' % (w, f))
            if not re.fullmatch(r'\d{6}', str(bank.get('bin', ''))):
                err.append('%s: bank.bin phải là 6 chữ số (mã ngân hàng của Napas)' % w)
            if not re.fullmatch(r'\d{6,20}', str(bank.get('account', ''))):
                err.append('%s: bank.account phải là 6–20 chữ số' % w)

    for fi, f in enumerate(d.get('faqs') or []):
        need(f, ('q', 'a'), 'faqs[%d]' % fi, err)
    for vi, v in enumerate(d.get('values') or []):
        need(v, ('icon', 'title', 'desc'), 'values[%d]' % vi, err)
    for ti, t in enumerate(d.get('hero_trust') or []):
        need(t, ('icon', 'text'), 'hero_trust[%d]' % ti, err)
    for si, sh in enumerate(d.get('shipping') or []):
        need(sh, ('title', 'desc'), 'shipping[%d]' % si, err)

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

    # Ngưỡng miễn phí ship phải quy ra được một SỐ CÂY NẾN hợp lý. Đây là phép kiểm
    # liên-trường: `free_ship` và `products[].price` sống ở hai chỗ khác nhau trong file, và
    # đổi một cái mà quên cái kia thì không có gì kêu — trang vẫn chạy, chỉ là lời hứa "mua
    # thêm X nữa được miễn phí ship" thành vô nghĩa.
    #
    # Lỗi gốc, 21/09/2026: giá mẫu để 100.000 ₫ trong khi ngưỡng để 500.000 ₫, tức là khách
    # phải mua NĂM cây nến thủ công mới được miễn ship. Cùng lúc đó bản đề xuất ở pitch/ lại
    # tính toàn bộ lập luận trên giá 300.000 ₫ — con số thật duy nhất biết về shop này. Mở
    # bản đề xuất rồi bấm sang cửa hàng là thấy hai giá lệch nhau ba lần.
    #
    # Ngưỡng phải nằm trong 2–4 cây. Khoảng này từng viết là 1–4 và thử ngược đã bác: để giá
    # 600.000 ₫ thì k = 1, cổng im, nhưng k = 1 nghĩa là MỘT cây nến đã vượt ngưỡng — tức đơn
    # nào cũng miễn ship và thanh "mua thêm bao nhiêu nữa" không bao giờ hiện gì. Đó đúng là
    # ca hỏng mà phép kiểm này sinh ra để bắt, nên chặn dưới phải là 2.
    prices = [x.get('price') for x in (d.get('products') or []) if isinstance(x.get('price'), int)]
    fs = lb.get('free_ship')
    if prices and isinstance(fs, int) and fs > 0:
        lo = min(prices)
        k = -(-fs // lo)
        if k < 2:
            err.append('ngưỡng miễn phí ship %s <= giá nến rẻ nhất %s — đơn nào cũng được miễn '
                       'ship, nên thanh "mua thêm bao nhiêu nữa" không bao giờ hiện gì. Bỏ hẳn '
                       'phí ship, hoặc nâng ngưỡng lên' % (vnd(fs), vnd(lo)))
        elif k > 4:
            err.append('ngưỡng miễn phí ship %s / nến rẻ nhất %s = phải mua %d cây mới được '
                       'miễn ship — gần như không ai với tới, một lời hứa để trưng chứ không '
                       'để dùng' % (vnd(fs), vnd(lo), k))

    # ── nội dung mẫu còn lại ───────────────────────────────────────────────────
    n = 1 if brand.get('placeholder') else 0
    for key in ('scents', 'products', 'values', 'faqs', 'shipping'):
        n += sum(1 for x in (d.get(key) or []) if x.get('placeholder'))
    n += sum(1 for m in methods if m.get('placeholder'))
    n += sum(1 for x in (d.get('hero_trust') or []) if x.get('placeholder'))
    if n:
        note.append('còn %d mục mang cờ placeholder — nội dung máy dựng, thay trước khi bán thật '
                    '(dải cảnh báo trên trang sẽ tự tắt khi hạ hết cờ)' % n)

    return err, note


# ── trang ─────────────────────────────────────────────────────────────────────

def repeated_text(d):
    """Chữ thuộc khối LẶP — thứ bắt buộc phải sống ở data, không được nằm trong HTML.

    KHÔNG kiểm tên mùi hương dạng ngắn. Đã đo ở bản trước: danh từ hai chữ kiểu
    "Nến thơm" trùng với tiếng Việt bình thường của trang và báo oan. Chỉ kiểm chuỗi
    đủ dài để không thể trùng ngẫu nhiên.
    """
    out = []
    for p in d.get('products') or []:
        out.append(('tên sản phẩm', p.get('name', '')))
        out.append(('mô tả sản phẩm', p.get('story', '')))
    for c in d.get('scents') or []:
        out.append(('cảm giác của mùi', c.get('feel', '')))
        out.append(('câu một dòng của mùi', c.get('tagline', '')))
    for f in d.get('faqs') or []:
        out.append(('câu hỏi FAQ', f.get('q', '')))
    for v in d.get('values') or []:
        out.append(('tiêu đề giá trị', v.get('title', '')))
    for t in d.get('hero_trust') or []:
        out.append(('dòng tin cậy ở hero', t.get('text', '')))
    for m in (d.get('payment') or {}).get('methods') or []:
        out.append(('mô tả cách thanh toán', m.get('desc', '')))
    return [(kind, t) for kind, t in out if len(t.strip()) >= 8]


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

    return err, note


RE_NAV = re.compile(r'<header class="nav[^"]*".*?</header>', re.S)
RE_FOOT = re.compile(r'<footer class="foot".*?</footer>', re.S)
RE_SHEET = re.compile(r'<div class="sheet".*?</div>\s*\n', re.S)


def check_shell(pages):
    """Thanh điều hướng, menu và chân trang phải giống hệt nhau ở cả ba trang.

    Shop có ba trang tĩnh, không có build step nào ghép shell hộ. Sửa menu ở một trang
    rồi quên hai trang kia là cách hỏng phổ biến nhất của web tĩnh nhiều trang — và nó
    im lặng, vì mỗi trang mở riêng vẫn trông đúng. Lớp `is-active` được bỏ ra trước khi
    so, vì nó ĐƯỢC PHÉP khác nhau: đó là mục đang đứng.
    """
    err = []
    shots = {}
    for path in pages:
        raw = path.read_text(encoding='utf-8', errors='replace')
        for name, rx in (('thanh điều hướng', RE_NAV), ('menu điện thoại', RE_SHEET), ('chân trang', RE_FOOT)):
            m = rx.search(raw)
            if not m:
                err.append('%s: không tìm thấy %s' % (path.name, name))
                continue
            shots.setdefault(name, {})[path.name] = m.group(0).replace(' is-active', '').replace(' nav--over', '')

    for name, by_page in shots.items():
        vals = set(by_page.values())
        if len(vals) > 1:
            names = ', '.join(sorted(by_page))
            err.append('%s lệch nhau giữa các trang (%s) — ba trang phải dùng chung một shell, '
                       'sửa một trang thì sửa cả ba' % (name, names))
    return err


# Thành phần khối — mỗi cái phải có một quy tắc gốc ".<tên> {" trong CSS dùng chung.
# Danh sách này tồn tại vì một lần dọn CSS bằng regex đã nuốt mất ".drawer { }" mà vẫn để
# lại ".drawer.is-open": ngăn kéo giỏ hàng thành một khối nằm chình ình cuối trang, không
# ai thấy cho tới lúc chụp ảnh. Lỗi kiểu đó im lặng, nên nó cần một phép đếm.
CSS_BLOCKS = ('nav', 'hero', 'candle', 'veil', 'drawer', 'line', 'toast', 'fly', 'ship', 'sum',
              'order', 'notes', 'specs', 'scent', 'rail', 'scard', 'strip', 'buy', 'co', 'pay',
              'paypanel', 'qr', 'todo', 'phb', 'emblem', 'field', 'faq', 'foot', 'val', 'vals',
              'marquee', 'tag', 'btn', 'wrap', 'grain', 'sheet', 'iconbtn', 'crumb', 'phead',
              # Tìm mùi
              'sf', 'sfmid', 'sfstep', 'sfhead', 'sfq', 'sfhint', 'sfbar', 'sfopts', 'sfopt',
              'sfback', 'sfres', 'sfmatch', 'sfname', 'sfslot', 'sffeel', 'sfwhy', 'sfacts', 'sfalt',
              # Hộp quà
              'gb', 'gbstep', 'gbpick', 'gbopt', 'gbslot', 'gbdots', 'gbdot', 'gbmsg', 'gbcount',
              'gbside', 'gbbox', 'gbsum', 'gbrow', 'gbnote')


RE_RULE = re.compile(r'^([.#][^\n{]+)\{([^}]*)\}', re.M)


def centring_classes(css):
    """Lớp nào căn giữa bằng grid mà KHÔNG khai hướng cột.

    Loại rule này chỉ đúng khi bên trong có một con: grid mặc định xếp theo HÀNG, nên con
    thứ hai rơi xuống dưới thay vì đứng cạnh. Nó im lặng — mọi chỗ dùng một con vẫn đẹp.
    """
    out = set()
    for m in RE_RULE.finditer(css):
        sel, body = m.group(1).strip(), m.group(2)
        if not sel.startswith('.') or ' ' in sel or ':' in sel or ',' in sel:
            continue
        if 'display: grid' not in body or 'place-items: center' not in body:
            continue
        if 'grid-auto-flow: column' in body or 'grid-template-columns' in body:
            continue
        out.add(sel[1:])
    return out


RE_TAG = re.compile(r'<(\w+)([^>]*)>', re.S)


def check_centring(pages, css):
    """Phần tử nào mang lớp "căn giữa bằng grid" mà có nhiều hơn một con.

    Đây là cổng sinh ra từ một lỗi có thật: .iconbtn viết bằng display:grid + place-items,
    ba nút một-con thì đẹp, riêng nút giỏ hàng có hai con (icon + số đếm) nên bị xếp thành
    hai hàng nhồi trong 38px. Chỉ soi HTML tĩnh — chỗ đếm được số con.
    """
    names = centring_classes(css)
    if not names:
        return []
    err = []
    for path in pages:
        raw = strip_code(path.read_text(encoding='utf-8', errors='replace'))
        for m in re.finditer(r'<(\w+)\s[^>]*class="([^"]*)"[^>]*>', raw):
            classes = set(m.group(2).split())
            hit = classes & names
            if not hit:
                continue
            tag = m.group(1)
            # đếm con trực tiếp: quét từ sau thẻ mở tới thẻ đóng cùng cấp
            rest, depth, kids = raw[m.end():], 0, 0
            for t in re.finditer(r'<(/?)(\w+)([^>]*?)(/?)>', rest):
                closing, name, attrs, self_close = t.group(1), t.group(2), t.group(3), t.group(4)
                if closing:
                    if depth == 0:
                        break
                    depth -= 1
                    continue
                if depth == 0:
                    kids += 1
                if not self_close and name.lower() not in ('br', 'img', 'input', 'hr', 'meta', 'link'):
                    depth += 1
            if kids > 1:
                err.append('%s: <%s class="%s"> có %d con nhưng lớp .%s căn giữa bằng grid '
                           'không khai hướng cột — con thứ hai sẽ rơi xuống hàng dưới'
                           % (path.name, tag, m.group(2), kids, sorted(hit)[0]))
    return err


def check_css(path):
    """Soi CSS dùng chung: thiếu quy tắc gốc, và selector gốc bị khai hai lần."""
    err, note = [], []
    css = path.read_text(encoding='utf-8')

    for name in CSS_BLOCKS:
        if not re.search(r'^\.%s\s*\{' % re.escape(name), css, re.M):
            err.append('thiếu quy tắc gốc ".%s { }" — thành phần này sẽ hiện ra không có kiểu' % name)

    sels = re.findall(r'^(\.[A-Za-z][\w-]*(?:__[\w-]+)?)\s*\{', css, re.M)
    for sel, cnt in sorted(collections.Counter(sels).items()):
        if cnt > 1:
            err.append('selector gốc "%s" khai %d lần — một trong hai bản đang bị bản kia đè, '
                       'gần như luôn là dấu vết của một lần cắt-dán hỏng' % (sel, cnt))

    if 'prefers-reduced-motion' not in css:
        note.append('không có @media (prefers-reduced-motion) — trang nhiều animation nên phải có')
    return err, note


# ── tài liệu ──────────────────────────────────────────────────────────────────

RE_MDLINK = re.compile(r'\[([^\]]+)\]\(([^)\s]+)\)')


def check_docs(shop):
    """Liên kết markdown trong shop/ phải trỏ tới file có thật.

    Thư mục docs/ có mười file trỏ chéo lẫn nhau, cộng năm ADR. Đổi tên một file là làm gãy
    một nắm liên kết ở chỗ khác, và markdown gãy thì IM LẶNG — trên GitHub nó vẫn hiện ra
    như một liên kết bình thường, bấm vào mới ra 404. Cổng này sinh ra vì một lần đúng như
    vậy: 15 liên kết cùng trỏ vào một file chưa được viết.

    Chỉ kiểm liên kết nội bộ; http và mailto bỏ qua vì cổng không nên phụ thuộc vào mạng.
    """
    err = []
    for md in sorted(shop.rglob('*.md')):
        for m in RE_MDLINK.finditer(md.read_text(encoding='utf-8', errors='replace')):
            tgt = m.group(2).split('#', 1)[0]
            if not tgt or tgt.startswith(('http://', 'https://', 'mailto:', 'tel:')):
                continue
            if not (md.parent / tgt).resolve().exists():
                err.append('%s: liên kết gãy [%s](%s)'
                           % (md.relative_to(shop), m.group(1)[:34], m.group(2)))
    return err


def check_publish(shop):
    """Tài liệu nội bộ của shop/ KHÔNG được lên public.

    Sinh ra từ một ca thật ngày 20/09/2026: `shop/docs/04-DAM-PHAN.md` — kịch bản đàm phán
    với một người có thật, gồm cả mục "dấu hiệu nên rút" và mức giá định chào — đã nằm trên
    GitHub Pages ở một URL đoán được, trả HTTP 200. Không ai cố ý publish nó; workflow deploy
    rsync cả repo và chẳng ai nghĩ tới thư mục mới.

    Markdown trên GitHub Pages phục vụ nguyên văn, không cần render, nên chỉ cần biết đường
    dẫn là đọc được. Với một tài liệu đàm phán thì đó là trao cả thế bài cho phía bên kia.

    `shop/pitch/` CỐ Ý vẫn công khai: trang đó viết CHO chị ấy và cần một đường link để gửi.
    """
    err = []
    wf = shop.parent / '.github' / 'workflows' / 'deploy.yml'
    if not wf.exists():
        return err
    body = wf.read_text(encoding='utf-8', errors='replace')
    for pat in ("--exclude 'shop/docs'", "--exclude 'shop/*.md'"):
        if pat not in body:
            err.append("deploy.yml thiếu %s — tài liệu nội bộ của shop/ sẽ lên public. "
                       "docs/04-DAM-PHAN.md là kịch bản đàm phán với một người có thật; "
                       "publish nó là đưa thế bài cho phía bên kia." % pat)
    return err


def main(argv):
    verbose = '-v' in argv or '--verbose' in argv

    data_err, data_note = check_data(DATA)
    try:
        data = json.loads(DATA.read_text(encoding='utf-8'))
    except Exception:
        data = {}

    pages = sorted(p for p in SHOP.glob('*.html') if not p.name.startswith('__'))
    skipped = sorted(p.name for p in SHOP.glob('__*.html'))
    if skipped:
        print('bỏ qua file tạm: %s' % ', '.join(skipped))
    total_err, total_note = len(data_err), len(data_note)

    if data_err:
        print('\ndata/shop.json — LỖI (%d):' % len(data_err))
        for e in data_err:
            print('    %s' % e)
    if data_note and verbose:
        print('\ndata/shop.json — XEM (%d):' % len(data_note))
        for n in data_note:
            print('    %s' % n)

    shell_err = check_shell(pages)
    total_err += len(shell_err)
    if shell_err:
        print('\nshell chung — LỖI (%d):' % len(shell_err))
        for x in shell_err:
            print('    %s' % x)

    css = SHOP / 'assets' / 'shop.css'
    if not css.exists():
        total_err += 1
        print('\nassets/shop.css — LỖI: thiếu file CSS dùng chung')
    else:
        ce, cn = check_css(css)
        ce += check_centring(pages, css.read_text(encoding='utf-8'))
        total_err += len(ce); total_note += len(cn)
        if ce:
            print('\nassets/shop.css — LỖI (%d):' % len(ce))
            for x in ce:
                print('    %s' % x)
        if cn and verbose:
            print('\nassets/shop.css — XEM (%d):' % len(cn))
            for x in cn:
                print('    %s' % x)

    doc_err = check_docs(SHOP) + check_publish(SHOP)
    total_err += len(doc_err)
    if doc_err:
        print('\ntài liệu — LỖI (%d):' % len(doc_err))
        for x in doc_err:
            print('    %s' % x)

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
    print('shop: OK (%d mùi hương, %d sản phẩm, %d câu hỏi Tìm mùi, %d cỡ hộp quà, '
          '%d cách thanh toán, %d trang, %d tài liệu).'
          % (len(data.get('scents') or []), len(data.get('products') or []),
             len(((data.get('quiz') or {}).get('questions')) or []),
             len(((data.get('gift') or {}).get('boxes')) or []),
             len(((data.get('payment') or {}).get('methods')) or []), len(pages),
             len(list(SHOP.rglob('*.md')))))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
