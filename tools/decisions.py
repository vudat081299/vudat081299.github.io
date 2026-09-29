#!/usr/bin/env python3
"""Sổ quyết định: kiểm, sinh mục lục, tra theo file.

  python3 tools/decisions.py              kiểm mọi DECISIONS.md
  python3 tools/decisions.py write        sinh lại mục lục
  python3 tools/decisions.py find FILE…   quyết định áp cho các file ấy

Một mục trong DECISIONS.md:

  ## PAGES-001 · Tên ngắn
  09/09/2026 · `pages/*.html`, `cooking/*.html`

  Quyết định, vài câu.

Dòng thứ hai là ngày rồi phạm vi. Phạm vi là glob tính từ gốc repo: `*` không qua `/`, `**` qua
được, `repo` là cả repo. Quyết định bị thay thì xoá mục cũ, mục mới ghi thêm `· thay cho <mã>`.
Mỗi file một tiền tố mã; mã không trùng trong cả repo.
"""
import re
import subprocess
import sys

ROOT = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()
HEAD = re.compile(r'^## ([A-Z]+-\d{3}) · (.+)$', re.M)
META = re.compile(r'^(\d{2}/\d{2}/\d{4}|\d{2}/\d{4}) · (.+)$')
START, END = '<!-- index:start -->', '<!-- index:end -->'


def git_files(*patterns):
    out = subprocess.check_output(['git', '-C', ROOT, 'ls-files', '--', *patterns], text=True)
    return out.split()


def glob_re(g):
    """`*` không qua /, `**` qua được, kết thúc bằng / là cả thư mục."""
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
        else:
            out, i = out + re.escape(g[i]), i + 1
    return re.compile(out + '$')


def parse(path):
    """Trả về (danh sách mục, danh sách lỗi). Mục = dict id, title, date, scope, line."""
    text = open(f'{ROOT}/{path}', encoding='utf-8').read()
    entries, errors = [], []
    for m in HEAD.finditer(text):
        line = text.count('\n', 0, m.start()) + 1
        rest = text[m.end():].lstrip('\n').split('\n', 1)[0]
        meta = META.match(rest)
        if not meta:
            errors.append(f'{path}:{line + 1}: {m.group(1)} — dòng sau tiêu đề phải là "dd/mm/yyyy · `phạm vi`"')
            continue
        scope_part = meta.group(2).split(' · thay cho ')[0]
        scope = re.findall(r'`([^`]+)`', scope_part)
        if not scope:
            errors.append(f'{path}:{line + 1}: {m.group(1)} — thiếu phạm vi trong dấu `')
        entries.append(dict(id=m.group(1), title=m.group(2).strip(), date=meta.group(1),
                            scope=scope, path=path, line=line))
    for m in re.finditer(r'^#{2,3} .*$', text, re.M):
        if not HEAD.match(m.group(0)):
            line = text.count('\n', 0, m.start()) + 1
            errors.append(f'{path}:{line}: tiêu đề mục phải là "## MÃ-NNN · Tên"')
    return entries, errors


def index_text(path, entries, all_files):
    lines = [f'- {e["id"]} · {e["title"]} · ' + ', '.join(f'`{s}`' for s in e['scope']) for e in entries]
    if path == 'DECISIONS.md':
        others = [f for f in all_files if f != 'DECISIONS.md']
        lines += ['', 'Sổ của từng project: ' + ', '.join(f'[`{f}`]({f})' for f in others) + '.']
    return '\n'.join(lines)


def with_index(path, entries, all_files):
    text = open(f'{ROOT}/{path}', encoding='utf-8').read()
    a, b = text.find(START), text.find(END)
    if a < 0 or b < a:
        return text, None
    return text, text[:a + len(START)] + '\n' + index_text(path, entries, all_files) + '\n' + text[b:]


def load():
    files = sorted(git_files('DECISIONS.md', '*/DECISIONS.md'), key=lambda f: (f != 'DECISIONS.md', f))
    per_file, errors = {}, []
    for f in files:
        entries, errs = parse(f)
        per_file[f] = entries
        errors += errs
    return files, per_file, errors


def check():
    files, per_file, errors = load()
    tracked = git_files()
    seen, prefix_of = {}, {}
    for f, entries in per_file.items():
        prefixes = {e['id'].split('-')[0] for e in entries}
        if len(prefixes) > 1:
            errors.append(f'{f}: một file chỉ một tiền tố mã, đang có {sorted(prefixes)}')
        for p in prefixes:
            if p in prefix_of and prefix_of[p] != f:
                errors.append(f'{f}: tiền tố {p} đã dùng ở {prefix_of[p]}')
            prefix_of[p] = f
        for e in entries:
            if e['id'] in seen:
                errors.append(f'{f}:{e["line"]}: mã {e["id"]} trùng với {seen[e["id"]]}')
            seen[e['id']] = f
            for g in e['scope']:
                if g != 'repo' and not any(glob_re(g).match(t) for t in tracked):
                    errors.append(f'{f}:{e["line"]}: {e["id"]} — phạm vi `{g}` không khớp file nào')
        text, new = with_index(f, entries, files)
        if new is None:
            errors.append(f'{f}: thiếu cặp {START} … {END}')
        elif new != text:
            errors.append(f'{f}: mục lục cũ — chạy python3 tools/decisions.py write')
    # Mã được trích trong tài liệu agent đọc phải có thật.
    prefixes = '|'.join(sorted(prefix_of)) or 'KHÔNG-CÓ'
    cite = re.compile(rf'\b(?:{prefixes})-\d{{3}}\b')
    docs = git_files('CLAUDE.md', '*/CLAUDE.md', 'HANDOFF.md', '*/HANDOFF.md', '.claude/*.md')
    for d in docs:
        for n, line in enumerate(open(f'{ROOT}/{d}', encoding='utf-8'), 1):
            for c in cite.findall(line):
                if c not in seen:
                    errors.append(f'{d}:{n}: trích {c} nhưng không có quyết định nào mang mã ấy')
    for e in errors:
        print(e)
    total = sum(len(v) for v in per_file.values())
    print(f'decisions: {"LỖI" if errors else "OK"} ({len(files)} file, {total} quyết định).')
    return 1 if errors else 0


def write():
    files, per_file, errors = load()
    for f in files:
        text, new = with_index(f, per_file[f], files)
        if new is not None and new != text:
            open(f'{ROOT}/{f}', 'w', encoding='utf-8').write(new)
            print(f'decisions: đã sinh lại mục lục — {f}')
    return 0


def find(paths):
    _, per_file, _ = load()
    for p in paths:
        hits = [e for es in per_file.values() for e in es
                if any(g == 'repo' or glob_re(g).match(p) for g in e['scope'])]
        print(f'{p}:' if hits else f'{p}: không có quyết định nào')
        for e in hits:
            print(f'  {e["id"]} · {e["title"]}  ({e["path"]})')
    return 0


if __name__ == '__main__':
    args = sys.argv[1:]
    cmd = args[0] if args else 'check'
    if cmd == 'check':
        sys.exit(check())
    if cmd == 'write':
        sys.exit(write())
    if cmd == 'find' and len(args) > 1:
        sys.exit(find(args[1:]))
    print(__doc__)
    sys.exit(2)
