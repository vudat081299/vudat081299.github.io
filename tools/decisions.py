#!/usr/bin/env python3
"""Sổ quyết định của repo — kiểm định dạng, sinh mục lục, tra theo đường dẫn.

Mỗi project (và gốc repo) có thể có một DECISIONS.md. Một mục là MỘT quyết định chủ trang đã
xác nhận — thường là câu trả lời của chủ trang cho một câu hỏi của agent. Luật đang áp dụng vẫn
nằm ở CLAUDE.md; file này ghi ai chốt, khi nào, vì sao, và áp dụng tới đâu.

Lệnh:
  python3 tools/decisions.py check              kiểm mọi DECISIONS.md (mặc định)
  python3 tools/decisions.py write              sinh lại mục lục trong mọi DECISIONS.md
  python3 tools/decisions.py find <đường dẫn>…  quyết định đang áp dụng cho các file ấy
  python3 tools/decisions.py find --all <…>     kể cả quyết định đã thay / đã bỏ
  python3 tools/decisions.py grep <từ khoá>     tìm trong tiêu đề và nội dung

Định dạng một file:

  # Quyết định — <tên project>

  <!-- decisions: prefix=PAGES; index=phạm-vi; nhóm=nội dung, giao diện, cổng, xuất bản -->

  (vài dòng giới thiệu tuỳ ý)

  <!-- index:start -->
  (mục lục — do `write` sinh, đừng sửa tay)
  <!-- index:end -->

  ### PAGES-001 — Tiêu đề ngắn
  - **Ngày:** 07/09/2026          dd/mm/yyyy; chỉ biết tháng thì mm/yyyy
  - **Phạm vi:** pages/*.html, cooking/*.html
                                  glob tính từ gốc repo, cách nhau dấu phẩy; `repo` = cả repo;
                                  `*` không qua dấu /, `**` qua được, thư mục kết thúc bằng /
  - **Nhóm:** nội dung            một trong các nhóm khai ở dòng decisions của file
  - **Trạng thái:** đang áp dụng  hoặc "đã thay bằng PAGES-004", hoặc "đã bỏ"
  - **Quyết định:** …
  - **Vì sao:** …                 từ đây trở xuống là tuỳ chọn
  - **Đừng:** …                   điều agent sau không được tự làm
  - **Thay cho:** PAGES-001
  - **Nguồn:** câu trả lời của chủ trang ở phiên nào / commit nào
  - **Chi tiết:** docs/adr/0001-static-site.md   (đường dẫn tính từ thư mục của DECISIONS.md)

Trường dài được viết tiếp ở dòng sau, thụt vào hai dấu cách. Sau các trường có thể viết thêm
đoạn văn tự do.

index=nhóm (mặc định) gom mục lục theo nhóm; index=phạm-vi gom theo từng đường dẫn — hợp với bộ
sưu tập nhiều trang độc lập như pages/. DECISIONS.md ở gốc có thêm danh sách các file quyết định
của cả repo, để agent đứng ở gốc biết phải tìm ở đâu.

Mã PREFIX-NNN là duy nhất trong cả repo. Trích một mã ở bất cứ đâu (CLAUDE.md, code, HANDOFF…)
thì `check` đòi mã ấy phải có thật.

Repo public và được deploy nguyên cây, nên DECISIONS.md cũng công khai. Quyết định dính chuyện
riêng tư (tên người thật, nơi làm việc, tiền, vì sao một trang bị ẩn) KHÔNG ghi vào đây.
"""
import os
import re
import subprocess
import sys

ROOT = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()

REQUIRED = ['Ngày', 'Phạm vi', 'Nhóm', 'Trạng thái', 'Quyết định']
OPTIONAL = ['Vì sao', 'Đừng', 'Thay cho', 'Nguồn', 'Chi tiết']
FIELDS = REQUIRED + OPTIONAL

RE_HEADER = re.compile(r'<!--\s*decisions:(.*?)-->', re.S)
RE_ENTRY = re.compile(r'^###\s+([A-Z][A-Z0-9]*)-(\d{3})\s+[—–-]\s+(.+?)\s*$')
RE_FIELD = re.compile(r'^- \*\*(.+?):\*\*\s*(.*)$')
RE_DATE = re.compile(r'^(?:(\d{2})/)?(\d{2})/(\d{4})$')
RE_ID = re.compile(r'\b([A-Z][A-Z0-9]*)-(\d{3})\b')
IDX_START, IDX_END = '<!-- index:start -->', '<!-- index:end -->'
SCAN_EXT = ('.md', '.py', '.mjs', '.js', '.sh', '.yml', '.yaml')


def repo_files():
    """File git theo dõi, cộng file mới chưa add (chưa bị .gitignore loại)."""
    out = subprocess.check_output(
        ['git', '-C', ROOT, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        text=True)
    return sorted({p for p in out.split('\0') if p and os.path.isfile(os.path.join(ROOT, p))})


def glob_re(pattern):
    g = pattern.strip().strip('`')
    if g.endswith('/'):
        g += '**'
    out, i = '', 0
    while i < len(g):
        if g.startswith('**/', i):
            out, i = out + '(?:.*/)?', i + 3
        elif g.startswith('**', i):
            out, i = out + '.*', i + 2
        elif g[i] == '*':
            out, i = out + '[^/]*', i + 1
        elif g[i] == '?':
            out, i = out + '[^/]', i + 1
        elif g[i] == '{' and '}' in g[i:]:
            j = g.index('}', i)
            out += '(?:' + '|'.join(re.escape(x) for x in g[i + 1:j].split(',')) + ')'
            i = j + 1
        else:
            out, i = out + re.escape(g[i]), i + 1
    return re.compile('^' + out + '$')


def scopes_of(entry):
    raw = entry['fields'].get('Phạm vi', '')
    return [s.strip().strip('`') for s in raw.split(',') if s.strip().strip('`')]


def applies(entry, path):
    return any(s == 'repo' or glob_re(s).match(path) for s in entry['scopes'])


class Book:
    """Mọi DECISIONS.md trong repo, đã đọc."""

    def __init__(self):
        self.files = repo_files()
        self.docs = []      # [{path, text, cfg, entries}]
        self.errors = []    # [(path, line, msg)]
        for p in self.files:
            if os.path.basename(p) == 'DECISIONS.md':
                self._read(p)
        self.by_id = {}
        for d in self.docs:
            for e in d['entries']:
                if e['id'] in self.by_id:
                    other = self.by_id[e['id']]
                    self.err(d['path'], e['line'],
                             f'{e["id"]} trùng mã với {other["file"]}:{other["line"]}')
                else:
                    self.by_id[e['id']] = e
        self.prefixes = sorted({d['cfg']['prefix'] for d in self.docs if d['cfg']['prefix']})

    def err(self, path, line, msg):
        self.errors.append((path, line, msg))

    def _read(self, path):
        text = open(os.path.join(ROOT, path), encoding='utf-8').read()
        cfg = {'prefix': None, 'index': 'nhóm', 'nhóm': []}
        m = RE_HEADER.search(text)
        if not m:
            self.err(path, 1, 'thiếu dòng <!-- decisions: prefix=…; nhóm=… --> ở đầu file')
        else:
            hline = text[:m.start()].count('\n') + 1
            for part in m.group(1).split(';'):
                if not part.strip():
                    continue
                if '=' not in part:
                    self.err(path, hline, f'dòng decisions: "{part.strip()}" thiếu dấu =')
                    continue
                k, v = (x.strip() for x in part.split('=', 1))
                if k == 'prefix':
                    cfg['prefix'] = v
                elif k == 'index':
                    cfg['index'] = v
                elif k == 'nhóm':
                    cfg['nhóm'] = [x.strip() for x in v.split(',') if x.strip()]
                else:
                    self.err(path, hline, f'dòng decisions: khoá lạ "{k}" (chỉ có prefix, index, nhóm)')
            if not cfg['prefix'] or not re.fullmatch(r'[A-Z][A-Z0-9]*', cfg['prefix']):
                self.err(path, hline, 'dòng decisions: prefix phải là chữ in hoa, ví dụ prefix=PAGES')
            if cfg['index'] not in ('nhóm', 'phạm-vi'):
                self.err(path, hline, 'dòng decisions: index phải là "nhóm" hoặc "phạm-vi"')
            if not cfg['nhóm']:
                self.err(path, hline, 'dòng decisions: phải khai ít nhất một nhóm, ví dụ nhóm=nội dung, cổng')

        entries, cur, field, in_index = [], None, None, False
        for n, line in enumerate(text.split('\n'), 1):
            s = line.strip()
            if s == IDX_START:
                in_index = True
                continue
            if s == IDX_END:
                in_index = False
                continue
            if in_index:
                continue
            em = RE_ENTRY.match(line)
            if em:
                cur = {'id': f'{em.group(1)}-{em.group(2)}', 'prefix': em.group(1),
                       'title': em.group(3), 'line': n, 'file': path, 'fields': {}, 'body': []}
                entries.append(cur)
                field = None
                continue
            if line.startswith('### '):
                self.err(path, n, 'tiêu đề mục phải có dạng "### PREFIX-NNN — tiêu đề"')
                cur = field = None
                continue
            if line.startswith('#'):
                cur = field = None
                continue
            if cur is None:
                continue
            fm = RE_FIELD.match(line)
            if fm:
                field = fm.group(1).strip()
                if field not in FIELDS:
                    self.err(path, n, f'{cur["id"]}: trường lạ "{field}" — chỉ có: {", ".join(FIELDS)}')
                if field in cur['fields']:
                    self.err(path, n, f'{cur["id"]}: trường "{field}" ghi hai lần')
                cur['fields'][field] = fm.group(2).strip()
                continue
            if field and line.startswith('  ') and s:
                cur['fields'][field] = (cur['fields'][field] + ' ' + s).strip()
                continue
            field = None
            if s:
                cur['body'].append(s)
        for e in entries:
            e['scopes'] = scopes_of(e)
            e['active'] = e['fields'].get('Trạng thái', '') == 'đang áp dụng'
        self.docs.append({'path': path, 'text': text, 'cfg': cfg, 'entries': entries})

    # ---- kiểm -------------------------------------------------------------------------
    def validate(self):
        for d in self.docs:
            cfg = d['cfg']
            for e in d['entries']:
                f, p, n, eid = e['fields'], d['path'], e['line'], e['id']
                for r in REQUIRED:
                    if not f.get(r):
                        self.err(p, n, f'{eid}: thiếu trường "{r}"')
                if cfg['prefix'] and e['prefix'] != cfg['prefix']:
                    self.err(p, n, f'{eid}: mã trong file này phải bắt đầu bằng {cfg["prefix"]}-')
                day = f.get('Ngày', '')
                dm = RE_DATE.match(day)
                if day and not dm:
                    self.err(p, n, f'{eid}: Ngày "{day}" phải là dd/mm/yyyy hoặc mm/yyyy')
                elif dm and not (1 <= int(dm.group(2)) <= 12 and
                                 (dm.group(1) is None or 1 <= int(dm.group(1)) <= 31)):
                    self.err(p, n, f'{eid}: Ngày "{day}" không có thật')
                if f.get('Nhóm') and cfg['nhóm'] and f['Nhóm'] not in cfg['nhóm']:
                    self.err(p, n, f'{eid}: Nhóm "{f["Nhóm"]}" không có trong dòng decisions '
                                   f'({", ".join(cfg["nhóm"])})')
                st = f.get('Trạng thái', '')
                if st.startswith('đã thay bằng'):
                    ids = ['-'.join(x) for x in RE_ID.findall(st)]
                    if not ids:
                        self.err(p, n, f'{eid}: "đã thay bằng" phải kèm mã quyết định mới')
                    for x in ids:
                        if x not in self.by_id:
                            self.err(p, n, f'{eid}: thay bằng {x} — mã này không có')
                elif st and st != 'đang áp dụng' and not st.startswith('đã bỏ'):
                    self.err(p, n, f'{eid}: Trạng thái phải là "đang áp dụng", '
                                   f'"đã thay bằng <mã>" hoặc "đã bỏ"')
                for x in ('-'.join(y) for y in RE_ID.findall(f.get('Thay cho', ''))):
                    if x not in self.by_id:
                        self.err(p, n, f'{eid}: thay cho {x} — mã này không có')
                if f.get('Phạm vi') and not e['scopes']:
                    self.err(p, n, f'{eid}: Phạm vi rỗng')
                if e['active']:
                    for s in e['scopes']:
                        if s != 'repo' and not any(glob_re(s).match(x) for x in self.files):
                            self.err(p, n, f'{eid}: Phạm vi "{s}" không khớp file nào trong repo')
                for link in re.findall(r'[\w./-]+\.(?:md|html|py|mjs|json)\b', f.get('Chi tiết', '')):
                    base = os.path.dirname(os.path.join(ROOT, p))
                    if not (os.path.exists(os.path.join(base, link)) or
                            os.path.exists(os.path.join(ROOT, link))):
                        self.err(p, n, f'{eid}: Chi tiết trỏ tới "{link}" — không có file ấy')
            want = self.render_index(d)
            got = current_index(d['text'])
            if got is None:
                self.err(d['path'], 1, f'thiếu cặp {IDX_START} … {IDX_END} — chạy: python3 tools/decisions.py write')
            elif got.strip() != want.strip():
                self.err(d['path'], 1, 'mục lục cũ — chạy: python3 tools/decisions.py write')
        self._check_refs()

    def _check_refs(self):
        if not self.prefixes:
            return
        rx = re.compile(r'\b(' + '|'.join(self.prefixes) + r')-(\d{3})\b')
        for p in self.files:
            if not p.endswith(SCAN_EXT) or p == 'tools/decisions.py':
                continue
            try:
                text = open(os.path.join(ROOT, p), encoding='utf-8').read()
            except (UnicodeDecodeError, OSError):
                continue
            for m in rx.finditer(text):
                eid = f'{m.group(1)}-{m.group(2)}'
                if eid not in self.by_id:
                    line = text[:m.start()].count('\n') + 1
                    self.err(p, line, f'trích {eid} — không có quyết định nào mang mã này')

    # ---- mục lục ----------------------------------------------------------------------
    def render_index(self, d):
        out = []
        entries = d['entries']
        if not entries:
            out.append('_Chưa có mục nào._')
        elif d['cfg']['index'] == 'phạm-vi':
            groups = {}
            for e in entries:
                for s in e['scopes'] or ['(chưa ghi phạm vi)']:
                    groups.setdefault(s, []).append(e)
            for s in sorted(groups):
                out.append(f'**`{s}`**')
                out.extend(index_line(e, False) for e in groups[s])
                out.append('')
        else:
            groups = {n: [] for n in d['cfg']['nhóm']}
            for e in entries:
                groups.setdefault(e['fields'].get('Nhóm', '(chưa ghi nhóm)'), []).append(e)
            for name, es in groups.items():
                if es:
                    out.append(f'**{name}**')
                    out.extend(index_line(e, True) for e in es)
                    out.append('')
        if d['path'] == 'DECISIONS.md':
            out.append('**Các file quyết định trong repo** — tra theo file: '
                       '`python3 tools/decisions.py find <đường dẫn>`')
            out.append('')
            for other in sorted(self.docs, key=lambda x: x['path']):
                out.append(f'- `{other["path"]}` — mã `{other["cfg"]["prefix"]}-…`')
        return '\n'.join(out).rstrip()

    def write(self):
        changed = []
        for d in self.docs:
            block = f'{IDX_START}\n{self.render_index(d)}\n{IDX_END}'
            text = d['text']
            if IDX_START in text and IDX_END in text:
                a = text.index(IDX_START)
                b = text.index(IDX_END) + len(IDX_END)
                new = text[:a] + block + text[b:]
            else:
                m = RE_HEADER.search(text)
                cut = m.end() if m else 0
                new = text[:cut] + '\n\n' + block + text[cut:]
            if new != text:
                open(os.path.join(ROOT, d['path']), 'w', encoding='utf-8').write(new)
                d['text'] = new
                changed.append(d['path'])
        return changed


def current_index(text):
    if IDX_START not in text or IDX_END not in text:
        return None
    return text[text.index(IDX_START) + len(IDX_START):text.index(IDX_END)]


def index_line(e, show_scope):
    s = f'- {e["id"]} — {e["title"]}'
    if show_scope and e['scopes']:
        s += ' · ' + ', '.join(f'`{x}`' for x in e['scopes'])
    st = e['fields'].get('Trạng thái', '')
    if st and st != 'đang áp dụng':
        s += f' _({st})_'
    return s


def rel(path):
    p = os.path.abspath(path) if (os.path.isabs(path) or os.path.exists(path)) else path
    if os.path.isabs(p):
        p = os.path.relpath(p, ROOT)
    return p.replace(os.sep, '/')


def main(argv):
    cmd = argv[0] if argv else 'check'
    args = argv[1:]
    book = Book()
    if cmd == 'check':
        book.validate()
        if book.errors:
            for p, n, msg in book.errors:
                print(f'decisions: {p}:{n}: {msg}')
            print(f'decisions: {len(book.errors)} lỗi.')
            return 1
        total = sum(len(d['entries']) for d in book.docs)
        active = sum(e['active'] for d in book.docs for e in d['entries'])
        print(f'decisions: OK ({len(book.docs)} file, {total} mục, {active} đang áp dụng).')
        return 0
    if cmd == 'write':
        changed = book.write()
        print('decisions: đã sinh lại mục lục — ' + (', '.join(changed) if changed else 'không file nào đổi'))
        return 0
    if cmd == 'find':
        show_all = '--all' in args
        paths = [a for a in args if a != '--all']
        if not paths:
            print('dùng: python3 tools/decisions.py find [--all] <đường dẫn>…')
            return 2
        for raw in paths:
            path = rel(raw)
            hits = [e for d in book.docs for e in d['entries']
                    if (show_all or e['active']) and applies(e, path)]
            local = [e for e in hits if 'repo' not in e['scopes']]
            repo_wide = len(hits) - len(local)
            print(f'{path}: {len(local)} quyết định' + ('' if show_all else ' đang áp dụng')
                  + (f' (+{repo_wide} cho cả repo, xem DECISIONS.md)' if repo_wide else ''))
            for e in local:
                st = '' if e['active'] else f' [{e["fields"].get("Trạng thái", "")}]'
                print(f'  {e["id"]}{st}  {e["title"]}  — {e["file"]}:{e["line"]}')
                q = e['fields'].get('Quyết định', '')
                if q:
                    print('      ' + (q if len(q) <= 160 else q[:157] + '…'))
        return 0
    if cmd == 'grep':
        if not args:
            print('dùng: python3 tools/decisions.py grep <từ khoá>')
            return 2
        kw = ' '.join(args).lower()
        for d in book.docs:
            for e in d['entries']:
                hay = ' '.join([e['title']] + list(e['fields'].values()) + e['body']).lower()
                if kw in hay:
                    print(f'{e["id"]}  {e["title"]}  — {e["file"]}:{e["line"]}')
        return 0
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
