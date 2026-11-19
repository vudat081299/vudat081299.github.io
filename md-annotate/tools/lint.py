#!/usr/bin/env python3
"""Cổng của md-annotate/: dữ liệu gợi ý và hai luật an toàn của trang.

  1. data/hints.json: có `hints` là danh sách chuỗi, không rỗng, ≤ 80 ký tự (MAX_HINT trong trang),
     không trùng sau khi chuẩn hoá như trang làm (chữ thường, gộp khoảng trắng, bỏ dấu chấm cuối),
     đủ 6 mục để hộp nhận xét có đủ gợi ý ở lần mở đầu.
  2. index.html: chỉ một chỗ gán innerHTML, và chỗ ấy nhận HTML đã qua DOMPurify.
  3. index.html: script ngoài ghim đúng phiên bản và có integrity.

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
    if len(seen) < 6:
        errors.append(f'data/hints.json: {len(seen)} gợi ý — cần ít nhất 6')

html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
inner = [ln for ln in html.split('\n') if re.search(r'\.innerHTML\s*=', ln)]
if len(inner) != 1 or 'DOMPurify' not in inner[0]:
    errors.append('index.html: chỉ được một chỗ gán innerHTML, có chú thích "DOMPurify" — '
                  + (f'{len(inner)} chỗ' if inner else 'không thấy chỗ nào'))
for tag in re.findall(r'<script\b[^>]*\bsrc="[^"]+"[^>]*>', html):
    src = re.search(r'src="([^"]+)"', tag).group(1)
    if not re.search(r'/\d+\.\d+\.\d+/', src):
        errors.append(f'index.html: {src} không ghim phiên bản x.y.z')
    if 'integrity="sha' not in tag:
        errors.append(f'index.html: {src} thiếu integrity')

if errors:
    for e in errors:
        print(f'md-annotate: {e}')
    sys.exit(1)
print(f'md-annotate: OK ({len(seen)} gợi ý mặc định).')
