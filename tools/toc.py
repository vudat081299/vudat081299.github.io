#!/usr/bin/env python3
"""Bản đồ mục của một file HTML dài — để agent mở đúng đoạn thay vì đọc cả file.

Nhiều trang trong repo dài vài nghìn dòng, nặng vài trăm KB: đọc cả file tốn hàng trăm nghìn
token mà gần như luôn là việc thừa. Bản đồ này SINH TỪ CHÍNH FILE mỗi lần chạy, nên không bao
giờ cũ và không phải commit gì thêm.

Lệnh:
  python3 tools/toc.py <file.html>                 các mục <h2>: dải dòng, id, tiêu đề
  python3 tools/toc.py <file.html> --depth 3       thêm <h3>
  python3 tools/toc.py <file.html> --where <id>    dải dòng của đúng một mục, kèm offset/limit
                                                   để Read

Cách tính: mỗi mục bắt đầu ở <section id=…> ngay trước tiêu đề của nó (hoặc ở chính tiêu đề),
và kết thúc ngay trước mục kế tiếp. Nội dung trong <script>, <style>, <template> và comment
được bỏ qua khi tìm tiêu đề, nên chuỗi "<h2>" nằm trong JS không bị tính nhầm.
"""
import html
import os
import re
import sys

RE_BLANK = re.compile(r'<(script|style|template)\b.*?</\1\s*>|<!--.*?-->', re.S | re.I)
RE_SECTION = re.compile(r'<section\b[^>]*\bid="([^"]+)"', re.I)
RE_HEAD = re.compile(r'<h([23])\b([^>]*)>(.*?)</h\1\s*>', re.S | re.I)
RE_ID = re.compile(r'\bid="([^"]+)"')
RE_TAG = re.compile(r'<[^>]+>')


def blank(m):
    return re.sub(r'[^\n]', ' ', m.group(0))


def outline(text, depth):
    clean = RE_BLANK.sub(blank, text)
    starts = [0]
    for i, ch in enumerate(clean):
        if ch == '\n':
            starts.append(i + 1)

    def line_of(pos):
        lo, hi = 0, len(starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if starts[mid] <= pos:
                lo = mid
            else:
                hi = mid - 1
        return lo + 1

    sections = [(m.start(), m.group(1)) for m in RE_SECTION.finditer(clean)]
    entries = []
    for m in RE_HEAD.finditer(clean):
        level = int(m.group(1))
        if level > depth:
            continue
        title = ' '.join(html.unescape(RE_TAG.sub(' ', m.group(3))).split())
        own = RE_ID.search(m.group(2))
        start, anchor = m.start(), own.group(1) if own else ''
        if not own:
            prev = [s for s in sections if s[0] < m.start()]
            last_head = entries[-1]['pos'] if entries else -1
            if prev and prev[-1][0] > last_head:
                start, anchor = prev[-1]
        entries.append({'level': level, 'title': title, 'id': anchor,
                        'pos': m.start(), 'start': line_of(start)})
    total = len(text.split('\n'))
    for i, e in enumerate(entries):
        nxt = next((x for x in entries[i + 1:] if x['level'] <= e['level']), None)
        e['end'] = (nxt['start'] - 1) if nxt else total
    return entries, total


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    path, depth, where = argv[0], 2, None
    rest = argv[1:]
    while rest:
        a = rest.pop(0)
        if a == '--depth' and rest:
            depth = int(rest.pop(0))
        elif a == '--where' and rest:
            where = rest.pop(0).lstrip('#')
        else:
            print(f'toc: không hiểu tham số "{a}"')
            return 2
    text = open(path, encoding='utf-8').read()
    entries, total = outline(text, depth)
    if where:
        hit = next((e for e in entries if e['id'] == where), None)
        if not hit:
            print(f'toc: không có mục #{where} trong {path}')
            return 1
        n = hit['end'] - hit['start'] + 1
        print(f'{path} #{where}: dòng {hit["start"]}–{hit["end"]} ({n} dòng) — {hit["title"]}')
        print(f'Read: offset={hit["start"]} limit={n}')
        return 0
    kb = os.path.getsize(path) / 1024
    print(f'{path}: {total} dòng, {kb:.0f} KB, {sum(e["level"] == 2 for e in entries)} mục <h2>')
    for e in entries:
        pad = '  ' * (e['level'] - 2)
        rng = f'{e["start"]}–{e["end"]}'
        anchor = f'#{e["id"]}' if e['id'] else '(không id)'
        print(f'  {rng:>13}  {pad}{anchor:<32} {e["title"]}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
