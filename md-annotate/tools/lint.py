#!/usr/bin/env python3
"""Cổng của md-annotate/: dữ liệu gợi ý, luật an toàn và cấu trúc file của trang.

  1. data/hints.json: có `hints` là danh sách chuỗi (và `renamed` cũ → mới trỏ đúng gợi ý), không rỗng, ≤ 80 ký tự (MAX_HINT trong trang),
     không trùng sau khi chuẩn hoá như trang làm (chữ thường, gộp khoảng trắng, bỏ dấu chấm cuối),
     đủ 6 mục để hộp nhận xét có đủ gợi ý ở lần mở đầu.
  2. js/**/*.js + index.html: chỉ một chỗ gán innerHTML, và chỗ ấy nhận HTML đã qua DOMPurify.
  3. index.html: script ngoài ghim đúng phiên bản và có integrity; script cục bộ duy nhất là js/main.js (module).
  4. index.html chỉ là markup: không <style>, tối đa hai <script> inline (theme, báo file://).
  5. Không file mồ côi: mọi css/*.css được index.html link, mọi js/**/*.js được index.html hoặc một module khác
     import; mọi link / import trỏ tới file có thật.
  6. js/core/ là logic thuần: code (bỏ chú thích) không nhắc document, window, localStorage, querySelector,
     classList, getBoundingClientRect, và không import từ js/ui/ hay js/main.js.
  7. Token (MDAN-009): css/*.css ngoài tokens.css không có mã màu (hex, rgb, hsl, white, black), không cỡ chữ px
     (font-size, font), không bán kính px trừ 0 / 1px / 999px. Token xanh đã bỏ (--green*, --toast-act) không
     xuất hiện ở css/, js/, index.html.
  8. data/shortcuts.json, data/search-help.json (bảng của Help): `groups` không rỗng; mỗi nhóm có `title` và `rows` không rỗng; mỗi hàng có `action` là chuỗi
     và `keys` là danh sách cách bấm, mỗi cách là danh sách phím (chuỗi không rỗng). Mọi data/*.json được js/ nạp
     (chuỗi 'data/<tên>.json' trong một module), không thì là file mồ côi.

Chạy:  python3 md-annotate/tools/lint.py
"""
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_HINT = 80
errors = []


def norm(t):
    t = re.sub(r'\s+', ' ', unicodedata.normalize('NFC', t).lower()).strip()
    return re.sub(r'[.!…]+$', '', t).strip()


try:
    data = json.load(open(os.path.join(ROOT, 'data/hints.json'), encoding='utf-8'))
except Exception as e:  # noqa: BLE001
    data = None
    errors.append(f'data/hints.json: không đọc được JSON ({e})')

if data is not None:
    hints = data.get('hints') if isinstance(data, dict) else None
    if not isinstance(hints, list):
        errors.append('data/hints.json: thiếu danh sách "hints"')
        hints = []
    seen = {}
    for i, h in enumerate(hints):
        if not isinstance(h, str) or not h.strip():
            errors.append(f'data/hints.json: hints[{i}] rỗng hoặc không phải chuỗi')
            continue
        if len(h.strip()) > MAX_HINT:
            errors.append(f'data/hints.json: "{h}" dài {len(h)} ký tự (tối đa {MAX_HINT})')
        k = norm(h)
        if k in seen:
            errors.append(f'data/hints.json: "{h}" trùng với "{seen[k]}"')
        seen[k] = h
    renamed = data.get('renamed', {}) if isinstance(data, dict) else {}
    if not isinstance(renamed, dict):
        errors.append('data/hints.json: "renamed" phải là bảng cũ → mới')
        renamed = {}
    for old, new in renamed.items():
        if norm(new) not in seen:
            errors.append(f'data/hints.json: renamed "{old}" → "{new}" không trỏ tới gợi ý nào trong "hints"')
        if norm(old) in seen:
            errors.append(f'data/hints.json: renamed "{old}" vẫn còn trong "hints"')
    if len(seen) < 6:
        errors.append(f'data/hints.json: {len(seen)} gợi ý — cần ít nhất 6')

html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
JS_DIR, CSS_DIR = os.path.join(ROOT, 'js'), os.path.join(ROOT, 'css')
js_files = sorted(os.path.relpath(os.path.join(d, f), JS_DIR).replace(os.sep, '/')
                  for d, _, fs in os.walk(JS_DIR) for f in fs if f.endswith('.js'))
css_files = sorted(f for f in os.listdir(CSS_DIR) if f.endswith('.css')) if os.path.isdir(CSS_DIR) else []
js_src = {f: open(os.path.join(JS_DIR, f), encoding='utf-8').read() for f in js_files}

# 2. Một chỗ innerHTML, nhận HTML đã qua DOMPurify.
inner = [(name, ln) for name, text in [('index.html', html)] + [('js/' + f, t) for f, t in js_src.items()]
         for ln in text.split('\n') if re.search(r'\.innerHTML\s*=', ln)]
if len(inner) != 1 or 'DOMPurify' not in inner[0][1]:
    errors.append('chỉ được một chỗ gán innerHTML (trong index.html và js/*.js), có chú thích "DOMPurify" — '
                  + (f'{len(inner)} chỗ: ' + ', '.join(n for n, _ in inner) if inner else 'không thấy chỗ nào'))

# 3. Script ngoài ghim phiên bản + integrity; script cục bộ chỉ js/main.js.
local_js = []
for tag in re.findall(r'<script\b[^>]*\bsrc="[^"]+"[^>]*>', html):
    src = re.search(r'src="([^"]+)"', tag).group(1)
    if not re.match(r'https?://', src):
        local_js.append(src)
        if src != 'js/main.js' or 'type="module"' not in tag:
            errors.append(f'index.html: script cục bộ {src} — chỉ được <script type="module" src="js/main.js">')
        continue
    if not re.search(r'/\d+\.\d+\.\d+/', src):
        errors.append(f'index.html: {src} không ghim phiên bản x.y.z')
    if 'integrity="sha' not in tag:
        errors.append(f'index.html: {src} thiếu integrity')

# 4. index.html chỉ là markup.
if re.search(r'<style\b', html):
    errors.append('index.html: có <style> — CSS thuộc css/*.css')
inline = [t for t in re.findall(r'<script\b([^>]*)>', html) if 'src=' not in t and 'text/plain' not in t]
if len(inline) > 2:
    errors.append(f'index.html: {len(inline)} <script> inline — chỉ được theme và báo file://; JS thuộc js/*.js')

# 5. Không file mồ côi, không link / import chết.
linked_css = re.findall(r'<link\b[^>]*\bhref="css/([^"]+)"', html)
for f in linked_css:
    if f not in css_files:
        errors.append(f'index.html: link css/{f} không tồn tại')
for f in css_files:
    if f not in linked_css:
        errors.append(f'css/{f}: index.html không link tới (file mồ côi)')
imported = {s[3:] for s in local_js if s.startswith('js/')}
deps = {}
for f, text in js_src.items():
    for spec in re.findall(r'^\s*import\b[^;]*?from\s+[\'"](\.{1,2}/[^\'"]+)[\'"]', text, re.M):
        m = os.path.normpath(os.path.join(os.path.dirname(f), spec)).replace(os.sep, '/')
        imported.add(m)
        deps.setdefault(f, []).append(m)
        if m not in js_src:
            errors.append(f'js/{f}: import {spec} không tồn tại')
for f in js_files:
    if f not in imported:
        errors.append(f'js/{f}: không ai import (file mồ côi)')

# 6. js/core/ thuần: không DOM, không bộ nhớ trình duyệt, không import phần giao diện.
BANNED = re.compile(r'\b(document|window|localStorage|querySelector\w*|classList|getBoundingClientRect)\b')
for f, text in js_src.items():
    if not f.startswith('core/'):
        continue
    code = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    code = re.sub(r'(^|\s)//.*$', r'\1', code, flags=re.M)
    for w in sorted(set(BANNED.findall(code))):
        errors.append(f'js/{f}: module thuần nhắc "{w}" — việc chạm trình duyệt thuộc js/ui/')
    for m in deps.get(f, []):
        if not m.startswith('core/'):
            errors.append(f'js/{f}: module thuần import js/{m} — js/core/ chỉ import js/core/')

# 7. Token (MDAN-009): màu, cỡ chữ, bán kính chỉ khai ở css/tokens.css; tên xanh cũ không quay lại.
COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(|\b(?:white|black)\b')
RAW_PX = re.compile(r'(?<![\w.-])(\d*\.?\d+)px\b')
RADIUS_OK = {'0', '1', '999'}
OLD_GREEN = re.compile(r'--(?:green(?:-hi|-soft|-line)?|toast-act)\b')
for f in css_files:
    text = open(os.path.join(CSS_DIR, f), encoding='utf-8').read()
    code = re.sub(r'/\*.*?\*/', lambda m: '\n' * m.group(0).count('\n'), text, flags=re.S)
    for m in OLD_GREEN.finditer(code):
        errors.append(f'css/{f}:{code.count(chr(10), 0, m.start()) + 1}: token đã bỏ {m.group(0)} — dùng --accent (MDAN-009)')
    if f == 'tokens.css':
        continue
    for m in re.finditer(r'([^{};]+)\{([^{}]*)\}', code):
        for decl in m.group(2).split(';'):
            if ':' not in decl:
                continue
            prop, val = (x.strip() for x in decl.split(':', 1))
            line = code.count('\n', 0, m.start(2) + m.group(2).find(decl)) + 1
            where = f'css/{f}:{line}: {prop}'
            if prop == 'accent-color':
                errors.append(f'{where} — Chrome tự làm tối accent-color sáng (thành xanh đậm); vẽ tay như ô đánh dấu ở css/base.css')
            if COLOR.search(val):
                errors.append(f'{where} — mã màu thô "{val}"; khai token ở css/tokens.css')
            if prop in ('font-size', 'font') and RAW_PX.search(val):
                errors.append(f'{where} — cỡ chữ px thô "{val}"; dùng --fs-* (hoặc em trong .ma-md)')
            if 'radius' in prop and any(n not in RADIUS_OK for n in RAW_PX.findall(val)):
                errors.append(f'{where} — bán kính px thô "{val}"; dùng --r-xs / --r-sm / --r / --r-lg / --r-pill')
for name, text in [('index.html', html)] + [('js/' + f, t) for f, t in js_src.items()]:
    for m in OLD_GREEN.finditer(text):
        errors.append(f'{name}: token đã bỏ {m.group(0)} — dùng --accent (MDAN-009)')

# 8. Bảng hàng của Help (phím tắt, mẫu tìm file): cùng một dạng; data/*.json không mồ côi.
for name in ('data/shortcuts.json', 'data/search-help.json'):
    try:
        sc = json.load(open(os.path.join(ROOT, name), encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        errors.append(f'{name}: không đọc được JSON ({e})')
        continue
    groups = sc.get('groups') if isinstance(sc, dict) else None
    if not isinstance(groups, list) or not groups:
        errors.append(f'{name}: thiếu danh sách "groups"')
        groups = []
    for gi, g in enumerate(groups):
        if not isinstance(g, dict) or not isinstance(g.get('title'), str) or not g['title'].strip():
            errors.append(f'{name}: groups[{gi}] thiếu "title"')
            continue
        rows = g.get('rows')
        if not isinstance(rows, list) or not rows:
            errors.append(f'{name}: nhóm "{g["title"]}" không có "rows"')
            continue
        for ri, r in enumerate(rows):
            keys = r.get('keys') if isinstance(r, dict) else None
            ok_keys = isinstance(keys, list) and keys and all(
                isinstance(c, list) and c and all(isinstance(k, str) and k.strip() for k in c) for c in keys)
            if not ok_keys or not isinstance(r.get('action'), str) or not r['action'].strip():
                errors.append(f'{name}: nhóm "{g["title"]}", hàng {ri}: cần "keys" [[phím…]…] và "action"')
all_js = '\n'.join(js_src.values())
for f in sorted(os.listdir(os.path.join(ROOT, 'data'))):
    if f.endswith('.json') and f"'data/{f}'" not in all_js:
        errors.append(f'data/{f}: không module nào trong js/ nạp (file mồ côi)')

if errors:
    for e in errors:
        print(f'md-annotate: {e}')
    sys.exit(1)
print(f'md-annotate: OK ({len(seen)} gợi ý mặc định, {len(js_files)} module JS ({sum(f.startswith('core/') for f in js_files)} thuần), {len(css_files)} file CSS).')
