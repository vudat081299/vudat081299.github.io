#!/usr/bin/env python3
"""Cổng cấu trúc của repo — giữ cho "mỗi loại tri thức một chỗ" không trôi đi.

Luật nằm ở CLAUDE.md gốc, mục "Cấu trúc bắt buộc". Script này kiểm phần đo được của luật ấy:

  1. Bản đồ project ở CLAUDE.md gốc đủ và đúng: mọi thư mục project trong repo có một dòng, mọi
     dòng trỏ vào thứ có thật.
  2. Mỗi project trong bản đồ có CLAUDE.md của nó; trang chủ (không có thư mục) có
     .claude/rules/home.md.
  3. CLAUDE.md và .claude/rules/*.md không quá 200 dòng — hướng dẫn chính thức của Claude Code: file
     dài hơn tốn ngữ cảnh và bị tuân thủ kém hơn. Không có ngày tháng dd/mm/yyyy: ngày là dấu hiệu
     của nhật ký, và nhật ký thuộc HISTORY.md / DECISIONS.md.
  4. HANDOFF.md chỉ có bốn mục cấp 2: ĐANG LÀM, CHƯA LÀM, NỢ, CHỜ CHỦ TRANG.
  5. Mỗi .claude/rules/*.md có `paths:` và mọi mẫu trong đó khớp ít nhất một file — rule không có
     `paths` bị nạp vào MỌI phiên, rule có mẫu chết thì không bao giờ được nạp.

Mục 3 chạy theo kiểu bánh cóc, như bảng DEBT của lint-pages.py: file có tên trong DEBT được giữ
nguyên hoặc giảm, tăng là lỗi; xuống dưới ngưỡng thì xoá dòng của nó đi, đừng nới số lên.

Sổ quyết định có cổng riêng: python3 tools/decisions.py check.

Chạy:  python3 tools/lint-structure.py
"""
import os
import re
import subprocess
import sys

# Tắt .pyc như lint-pages.py: repo không bỏ qua __pycache__/, và chạy cổng không được để lại file
# lạ trong cây làm việc.
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from decisions import glob_re  # noqa: E402  (cùng cú pháp glob với sổ quyết định)

ROOT = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()

MAX_LINES = 200
# Bánh cóc: số dòng / số mốc ngày đang nợ của từng file. Chỉ được giảm.
DEBT_LINES = {
}
DEBT_DATES = {
}
KINDS = {'trang chủ', 'bộ sưu tập', 'project', 'gác xép'}
HANDOFF_SECTIONS = {'ĐANG LÀM', 'CHƯA LÀM', 'NỢ', 'CHỜ CHỦ TRANG'}
# Thư mục ở gốc không phải project: hạ tầng dùng chung, dữ liệu của trang chủ, và nhóm chứa.
NOT_PROJECTS = {'.claude', '.github', 'data', 'tools', 'masters-degree'}
RE_DATE = re.compile(r'\b\d{1,2}/\d{1,2}/20\d{2}\b|\b20\d{2}-\d{2}-\d{2}\b')
# Ngày nằm trong tên file (`thesis-topic-review-2026-09-24.md`) là một tham chiếu, không phải nhật ký.
RE_FILENAME_WITH_DATE = re.compile(r'[\w./-]*20\d{2}-\d{2}-\d{2}[\w.-]*\.(?:md|html|json|py|mjs|js|csv)\b')

errors = []


def err(path, msg):
    errors.append(f'{path}: {msg}')


def files():
    # Chỉ file git theo dõi, kể cả file vừa `git add`. File chưa track thì không: một thư mục nháp
    # hay node_modules/ chưa bị .gitignore loại sẽ thành "thư mục thiếu dòng bản đồ" và chặn mọi
    # push từ checkout ấy, dù nó không bao giờ lên repo.
    out = subprocess.check_output(['git', '-C', ROOT, 'ls-files', '-z', '--cached'], text=True)
    return sorted({p for p in out.split('\0') if p and os.path.isfile(os.path.join(ROOT, p))})


def read(path):
    return open(os.path.join(ROOT, path), encoding='utf-8').read()


def project_map(text):
    """Các dòng của bảng dưới tiêu đề '## Bản đồ project': [(đường dẫn, loại)]."""
    m = re.search(r'^## Bản đồ project\s*$(.*?)(?=^## |\Z)', text, re.M | re.S)
    if not m:
        err('CLAUDE.md', 'thiếu mục "## Bản đồ project"')
        return []
    rows = []
    for line in m.group(1).split('\n'):
        if not line.startswith('|') or set(line) <= set('|-: '):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        path = re.search(r'`([^`]+)`', cells[0]) if cells else None
        if not path or len(cells) < 2:
            continue
        rows.append((path.group(1).rstrip('/'), cells[1]))
    return rows


def check_map(all_files):
    rows = project_map(read('CLAUDE.md'))
    mapped = {p for p, _ in rows}
    for p, kind in rows:
        if kind not in KINDS:
            err('CLAUDE.md', f'bản đồ: "{p}" có loại "{kind}" — chỉ có: {", ".join(sorted(KINDS))}')
        if not os.path.exists(os.path.join(ROOT, p)):
            err('CLAUDE.md', f'bản đồ: "{p}" không tồn tại')
            continue
        if kind == 'trang chủ':
            if '.claude/rules/home.md' not in all_files:
                err('.claude/rules/home.md', 'trang chủ không có thư mục riêng nên luật của nó phải ở đây')
        elif kind in KINDS and f'{p}/CLAUDE.md' not in all_files:
            err(f'{p}/', 'project trong bản đồ mà không có CLAUDE.md')
    dirs = set()
    for f in all_files:
        parts = f.split('/')
        if len(parts) > 1 and parts[0] not in NOT_PROJECTS:
            dirs.add(parts[0])
        if len(parts) > 2 and parts[0] == 'masters-degree':
            dirs.add('/'.join(parts[:2]))
    for d in sorted(dirs - mapped):
        err('CLAUDE.md', f'bản đồ thiếu thư mục "{d}/" — thêm một dòng vào mục "Bản đồ project"')
    return rows


def ratchet(path, value, limit, table, what):
    allowed = table.get(path)
    if allowed is None:
        if value > limit:
            err(path, f'{what}: {value} (tối đa {limit})')
    elif value > allowed:
        err(path, f'{what}: {value}, bảng nợ cho phép {allowed} — chỉ được giảm')
    elif value <= limit:
        err(path, f'{what}: {value} — đã hết nợ, xoá dòng của file này khỏi bảng nợ trong tools/lint-structure.py')
    elif value < allowed:
        err(path, f'{what}: còn {value}/{allowed} — đã giảm, hạ số trong bảng nợ xuống {value}')


def check_docs(all_files):
    docs = [f for f in all_files if os.path.basename(f) == 'CLAUDE.md' or
            (f.startswith('.claude/rules/') and f.endswith('.md'))]
    for f in docs:
        text = read(f)
        ratchet(f, len(text.rstrip('\n').split('\n')), MAX_LINES, DEBT_LINES, 'số dòng')
        ratchet(f, len(RE_DATE.findall(RE_FILENAME_WITH_DATE.sub('', text))), 0, DEBT_DATES,
                'mốc ngày (nhật ký thuộc HISTORY.md, quyết định thuộc DECISIONS.md)')
    for f in all_files:
        if os.path.basename(f) != 'HANDOFF.md':
            continue
        for n, line in enumerate(read(f).split('\n'), 1):
            if line.startswith('## ') and line[3:].strip() not in HANDOFF_SECTIONS:
                err(f'{f}:{n}', f'mục "{line[3:].strip()}" — HANDOFF chỉ có: '
                                f'{", ".join(sorted(HANDOFF_SECTIONS))}; nhật ký thuộc HISTORY.md')
    for f in docs:
        if not f.startswith('.claude/rules/'):
            continue
        text = read(f)
        fm = re.match(r'^---\n(.*?)\n---\n', text, re.S)
        pats = re.findall(r'^\s*-\s*["\']?([^"\'\n]+?)["\']?\s*$', fm.group(1), re.M) if fm else []
        if not fm or 'paths:' not in fm.group(1) or not pats:
            err(f, 'thiếu frontmatter `paths:` — rule không có paths bị nạp vào MỌI phiên')
            continue
        for p in pats:
            if not any(glob_re(p).match(x) for x in all_files):
                err(f, f'mẫu paths "{p}" không khớp file nào — rule này sẽ không bao giờ được nạp')


def main():
    all_files = files()
    rows = check_map(all_files)
    check_docs(all_files)
    if errors:
        for e in errors:
            print(f'structure: {e}')
        print(f'structure: {len(errors)} lỗi.')
        return 1
    print(f'structure: OK ({len(rows)} dòng bản đồ).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
