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

if errors:
    for e in errors:
        print(f'md-annotate: {e}')
    sys.exit(1)
print(f'md-annotate: OK ({len(seen)} gợi ý mặc định, {len(js_files)} module JS ({sum(f.startswith('core/') for f in js_files)} thuần), {len(css_files)} file CSS).')
