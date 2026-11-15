#!/usr/bin/env python3
"""Đo hai chế độ đọc của một trang bài học (khung xương / Đọc liền).

Chạy (ở gốc repo, tay, không phải cổng):
  python3 masters-degree/data-management-visualization/tools/measure-modes.py <file.html> [-v] [--only b4,b5]

Mỗi bài (section.chap[data-no]) in:
  mở      số chữ luôn thấy khi mọi khối gập đều đóng (gồm đầu bài, nhãn bản đồ bài, recap, câu hỏi quiz)
  gập     số chữ nằm trong khối gập (details không phải quiz), không tính summary của nó
  đáp án  số chữ trong đáp án quiz (details.quiz, trừ summary) — tính riêng, không vào tỉ lệ
  tỉ lệ   mở / (mở + gập)
  tl nút  như trên nhưng chỉ tính phần trong .nodes (các mục)
  khối    số khối gập
  cả mục  khối gập bọc cả một mục (quy ước cũ: details.node)
  cuối    khối gập không còn nội dung luôn mở nào sau nó trong mục
  giữa    khối gập có nội dung luôn mở phía sau trong cùng mục

Bỏ SVG, script, style, template. Chữ = chuỗi tách theo khoảng trắng (như JS đếm phút).
Quy ước mới: mục là phần tử .node không phải details; khối gập là details.more (mọi details không phải
quiz đều được tính là khối gập, kể cả details.node của quy ước cũ).
-v: in thêm từng mục (số câu ý lõi, có hình lõi không, nhãn từng khối gập) và cảnh báo.
"""
import re
import sys
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source',
        'track', 'wbr'}
SKIP = {'svg', 'script', 'style', 'template', 'noscript'}


class Node:
    __slots__ = ('tag', 'attrs', 'children', 'parent')

    def __init__(self, tag, attrs, parent):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []
        self.parent = parent

    @property
    def cls(self):
        return (self.attrs.get('class') or '').split()

    def has(self, c):
        return c in self.cls

    def els(self):
        return [c for c in self.children if isinstance(c, Node)]

    def iter(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.iter()


class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('#root', {}, None)
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        p = self.cur
        while p is not None and p.tag != tag:
            p = p.parent
        if p is not None and p.parent is not None:
            self.cur = p.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def words(s):
    return len(s.split())


def text(n, skip_summary=False):
    """Toàn bộ chữ của n, bỏ SVG/script/style."""
    out = []

    def walk(x):
        for c in x.children:
            if isinstance(c, str):
                out.append(c)
            elif c.tag in SKIP:
                continue
            elif skip_summary and c.tag == 'summary' and c.parent is n:
                continue
            else:
                walk(c)
    if isinstance(n, str):
        return n
    walk(n)
    return ' '.join(out)


def is_fold(n):
    return isinstance(n, Node) and n.tag == 'details' and not n.has('quiz')


def is_quiz(n):
    return isinstance(n, Node) and n.tag == 'details' and n.has('quiz')


def split_counts(n, acc):
    """Cộng chữ của n vào acc['open'|'fold'|'ans'] theo trạng thái mặc định (mọi details đóng)."""
    def walk(x, state):
        for c in x.children:
            if isinstance(c, str):
                acc[state] += words(c)
                continue
            if c.tag in SKIP:
                continue
            if c.tag == 'details' and state == 'open':
                inner = 'ans' if c.has('quiz') else 'fold'
                for cc in c.children:
                    if isinstance(cc, Node) and cc.tag == 'summary':
                        walk(cc, 'open')
                    elif isinstance(cc, str):
                        acc[inner] += words(cc)
                    elif cc.tag not in SKIP:
                        walk_one(cc, inner)
                continue
            walk(c, state)

    def walk_one(c, state):
        holder = Node('#t', {}, None)
        holder.children = [c]
        walk(holder, state)
    walk(n, 'open')


def sentences(s):
    s = re.sub(r'\s+', ' ', s).strip()
    if not s:
        return 0
    # Câu kết bằng . ? ! (không tính dấu chấm trong số thập phân / viết tắt kiểu "vd." ở giữa câu ngắn).
    parts = re.split(r'(?<=[.?!…])\s+(?=[A-ZÀ-Ỹ0-9“"(])', s)
    return len([p for p in parts if p.strip()])


def node_report(node):
    """Một mục: thân mục (bỏ header/summary của mục), phân ra phần mở và các khối gập."""
    old = node.tag == 'details'
    k = t = ''
    for d in node.iter():
        if d.has('node-k') and not k:
            k = ' '.join(text(d).split())
        if d.has('node-t') and not t:
            t = ' '.join(text(d).split())
    body = None
    for d in node.iter():
        if d.has('node-body'):
            body = d
            break
    if body is None:
        body = node
    if old:
        return {'id': node.attrs.get('id', ''), 'k': k, 't': t, 'old': True, 'core_fig': False,
                'core_words': 0, 'core_sent': 0,
                'blocks': [{'label': t, 'words': words(text(body)), 'pos': 'cả mục', 'nested': False}],
                'tag_names': [c.tag + ('.' + '.'.join(c.cls) if c.cls else '') for c in body.els()]}
    blocks = []
    core_txt = []
    core_fig = False
    core_words = 0

    # duyệt anh em trực tiếp trong thân mục, theo thứ tự
    seq = [c for c in body.children if isinstance(c, Node) or c.strip()]

    def visible_after(i):
        for c in seq[i + 1:]:
            if isinstance(c, str):
                return True
            if not is_fold(c):
                return True
        return False

    for i, c in enumerate(seq):
        if isinstance(c, str):
            core_txt.append(c)
            core_words += words(c)
            continue
        if is_fold(c):
            label = ''
            for s in c.els():
                if s.tag == 'summary':
                    label = ' '.join(text(s).split())
            acc = {'open': 0, 'fold': 0, 'ans': 0}
            holder = Node('#t', {}, None)
            holder.children = [x for x in c.children if not (isinstance(x, Node) and x.tag == 'summary')]
            fw = words(text(holder))
            blocks.append({'label': label, 'words': fw, 'pos': 'giữa' if visible_after(i) else 'cuối',
                           'nested': any(is_fold(d) for d in c.iter())})
            continue
        if c.tag in ('figure', 'div') and (c.has('dg') or c.has('demo')):
            if c.has('dg'):
                core_fig = True
            core_words += words(text(c))
            continue
        if c.tag in SKIP:
            continue
        if c.tag in ('p', 'ul', 'ol') and not c.has('slide-note'):
            core_txt.append(text(c))
        core_words += words(text(c))
    return {'id': node.attrs.get('id', ''), 'k': k, 't': t, 'old': old, 'core_fig': core_fig,
            'core_words': core_words, 'core_sent': sentences(' '.join(core_txt)), 'blocks': blocks,
            'tag_names': [c.tag + ('.' + '.'.join(c.cls) if c.cls else '') for c in seq if isinstance(c, Node)]}


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 2
    path = argv[0]
    verbose = '-v' in argv
    only = None
    if '--only' in argv:
        only = set(argv[argv.index('--only') + 1].split(','))
    b = Builder()
    with open(path, encoding='utf-8') as f:
        b.feed(f.read())
    chaps = [n for n in b.root.iter() if n.tag == 'section' and n.has('chap') and 'data-no' in n.attrs]
    rows = []
    tot = {'open': 0, 'fold': 0, 'ans': 0, 'nopen': 0, 'nfold': 0, 'blocks': 0, 'whole': 0, 'end': 0, 'mid': 0}
    warnings = []
    print(f'# {path.split("/")[-1]}')
    print()
    hdr = '| bài | mở | gập | đáp án | tỉ lệ | tl nút | khối | cả mục | cuối | giữa | mục |'
    print(hdr)
    print('|' + '---|' * (hdr.count('|') - 1))
    details_rows = []
    for sec in chaps:
        sid = sec.attrs['id']
        if only and sid not in only:
            continue
        acc = {'open': 0, 'fold': 0, 'ans': 0}
        split_counts(sec, acc)
        nacc = {'open': 0, 'fold': 0, 'ans': 0}
        nodes_wrap = [n for n in sec.iter() if n.has('nodes')]
        for w in nodes_wrap:
            split_counts(w, nacc)
        nodes = [n for n in sec.iter() if n.has('node')]
        folds = [n for n in sec.iter() if is_fold(n)]
        whole = sum(1 for n in nodes if n.tag == 'details')
        reps = [node_report(n) for n in nodes]
        end = sum(1 for r in reps if not r['old'] for bl in r['blocks'] if bl['pos'] == 'cuối')
        mid = sum(1 for r in reps if not r['old'] for bl in r['blocks'] if bl['pos'] == 'giữa')
        # khối gập nằm ngoài mục (vd. ngay trong .nodes) cũng tính vào "khối"
        ratio = acc['open'] / max(1, acc['open'] + acc['fold'])
        nratio = nacc['open'] / max(1, nacc['open'] + nacc['fold'])
        print(f"| {sec.attrs.get('data-no')} | {acc['open']} | {acc['fold']} | {acc['ans']} | {ratio:.0%} | "
              f"{nratio:.0%} | {len(folds)} | {whole} | {end} | {mid} | {len(nodes)} |")
        for k2 in ('open', 'fold', 'ans'):
            tot[k2] += acc[k2]
        tot['nopen'] += nacc['open']
        tot['nfold'] += nacc['fold']
        tot['blocks'] += len(folds)
        tot['whole'] += whole
        tot['end'] += end
        tot['mid'] += mid
        details_rows.append((sec, reps))
        for r in reps:
            if r['old']:
                continue
            if r['core_sent'] > 3:
                warnings.append(f"{r['id']}: ý lõi ~{r['core_sent']} câu (> 3)")
            if r['core_sent'] == 0:
                warnings.append(f"{r['id']}: không có câu ý lõi luôn mở")
            for bl in r['blocks']:
                if not bl['label']:
                    warnings.append(f"{r['id']}: khối gập không có summary")
                elif re.fullmatch(r'(xem thêm|chi tiết|thêm|mở rộng)\W*', bl['label'].lower()):
                    warnings.append(f"{r['id']}: nhãn trơn \"{bl['label']}\"")
                if bl['nested']:
                    warnings.append(f"{r['id']}: khối gập lồng trong khối gập")
        for d in folds:
            if d.has('node') or d.has('more'):
                continue
            warnings.append(f"{sid}: details không rõ loại (class={' '.join(d.cls)!r})")
    ratio = tot['open'] / max(1, tot['open'] + tot['fold'])
    nratio = tot['nopen'] / max(1, tot['nopen'] + tot['nfold'])
    print(f"| **cả trang** | {tot['open']} | {tot['fold']} | {tot['ans']} | {ratio:.0%} | {nratio:.0%} | "
          f"{tot['blocks']} | {tot['whole']} | {tot['end']} | {tot['mid']} | |")
    if verbose:
        for sec, reps in details_rows:
            print()
            print(f"## {sec.attrs['id']} · bài {sec.attrs.get('data-no')}")
            print()
            print('| mục | k | quy ước | hình lõi | câu lõi | chữ lõi | khối gập (chữ, vị trí, nhãn) |')
            print('|---|---|---|---|---|---|---|')
            for r in reps:
                bl = '; '.join(f"{x['words']} {x['pos']} “{x['label'][:60]}”" for x in r['blocks'])
                print(f"| {r['id']} | {r['k']} | {'cũ' if r['old'] else 'mới'} | {'có' if r['core_fig'] else '—'} | "
                      f"{r['core_sent'] if not r['old'] else '—'} | {r['core_words'] if not r['old'] else '—'} | {bl} |")
        if warnings:
            print()
            print('## Cảnh báo')
            print()
            for w in warnings:
                print('- ' + w)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
