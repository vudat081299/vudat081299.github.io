#!/usr/bin/env python3
"""Cổng dữ liệu và code của step-planner/.

  1. data/templates.json: khuôn mẫu (khoá, kiểu, chuỗi không rỗng, id không trùng, không thẻ HTML, owner nằm trong
     `people` của mẫu, có đúng một mẫu trống).
  2. Mẫu `it5425-sports` khớp từng chữ với bản sinh từ trang đồ án môn (COURSE_JSON, COURSE_HTML): không thêm nội dung.
     Sinh lại:  python3 step-planner/tools/lint.py --write-course
  3. js/*.js: không innerHTML / outerHTML / insertAdjacentHTML / document.write — chữ người dùng chỉ qua textContent.
  4. css/planner.css: mã màu chỉ nằm trong khối token (từ đầu file tới dòng `/* ── hết token ── */`).

Chạy:  python3 step-planner/tools/lint.py
"""
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(HERE)
TEMPLATES = os.path.join(HERE, 'data/templates.json')
COURSE_JSON = os.path.join(REPO, 'masters-degree/data-management-visualization/data/sports-monitoring-project.json')
COURSE_HTML = os.path.join(REPO, 'masters-degree/data-management-visualization/sports-monitoring-project.html')
COURSE_ID = 'it5425-sports'
TOKEN_END = '/* ── hết token ── */'

errors = []


def err(msg):
    errors.append(msg)


def text(s):
    """HTML của trang đồ án → chữ thường: bỏ thẻ, giải mã thực thể, gộp khoảng trắng, đổi chỗ trỏ "trang này"."""
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    s = re.sub(r'\s+', ' ', s).strip()
    s = s.replace('trang này', 'trang đồ án').replace('bên dưới', 'trên trang đồ án')
    return s


def course_template():
    src = json.load(open(COURSE_JSON, encoding='utf-8'))
    roles = [t['role'] for t in src['team']]
    page = open(COURSE_HTML, encoding='utf-8').read()
    m = re.search(r'id="lt-xong">.*?<ul class="checklist">(.*?)</ul>', page, re.S)
    checklist = [text(x) for x in re.findall(r'<li>(.*?)</li>', m.group(1), re.S)] if m else []
    if not checklist:
        err(f'{COURSE_HTML}: không tìm thấy danh sách "Xong khi nào" (#lt-xong)')
    steps = []
    for p in src['phases']:
        phase_roles = [roles[i - 1] for i in p['roles']]
        subs = []
        for t in p['tasks_html']:
            title, owner = text(t), phase_roles[0] if len(phase_roles) == 1 else ''
            v = re.match(r'Vai (\d+)[,:] (.*)$', title)
            if v:
                owner, title = roles[int(v.group(1)) - 1], v.group(2)
                title = title[0].upper() + title[1:]
            sub = {'title': title}
            if owner:
                sub['owner'] = owner
            subs.append(sub)
        notes = ['Vai: ' + ', '.join(phase_roles), 'Công cụ: ' + text(p['tools'])]
        if p['id'] == 'P8' and checklist:
            notes += ['', 'Xong khi nào:'] + ['- ' + c for c in checklist]
        steps.append({
            'title': f'{p["id"]} · {p["name"]}',
            'goal': text(p['io_html']),
            'doneWhen': text(p['done_html']),
            'notes': '\n'.join(notes),
            'subs': subs,
        })
    return {
        'id': COURSE_ID,
        'name': 'Đồ án IT5425 — giám sát thể thao (Premier League)',
        'description': 'Các giai đoạn P0–P8 và bảy vai của đồ án môn Data Management and Visualization, '
                       'lấy từ trang đồ án; người làm ghi theo vai.',
        'people': roles,
        'steps': steps,
    }


STEP_KEYS = {'title', 'goal', 'doneWhen', 'notes', 'subs'}
SUB_KEYS = {'title', 'doneWhen', 'owner', 'notes'}
TPL_KEYS = {'id', 'name', 'description', 'people', 'steps'}


def need_str(where, obj, key, required=True):
    v = obj.get(key)
    if v is None and not required:
        return
    if not isinstance(v, str) or (required and not v.strip()):
        err(f'{where}: `{key}` phải là chuỗi không rỗng')
    elif re.search(r'<[a-zA-Z/][^>]*>', v):
        err(f'{where}: `{key}` có thẻ HTML — trang in chữ bằng textContent')
    elif key != 'notes' and '\n' in v:
        err(f'{where}: `{key}` chỉ một dòng')


def check_templates(data):
    if set(data) != {'note', 'templates'}:
        err(f'templates.json: khoá gốc phải là note, templates (đang có {sorted(data)})')
    tpls = data.get('templates')
    if not isinstance(tpls, list) or not tpls:
        err('templates.json: `templates` phải là danh sách không rỗng')
        return
    seen, blanks = set(), 0
    for i, t in enumerate(tpls):
        w = f'templates[{i}]'
        if extra := set(t) - TPL_KEYS:
            err(f'{w}: khoá lạ {sorted(extra)}')
        for k in ('id', 'name', 'description'):
            need_str(w, t, k)
        tid = t.get('id', '')
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', str(tid)):
            err(f'{w}: id "{tid}" phải là chữ thường-gạch-nối')
        if tid in seen:
            err(f'{w}: id "{tid}" trùng')
        seen.add(tid)
        people = t.get('people', [])
        if not isinstance(people, list) or not all(isinstance(p, str) and p.strip() for p in people):
            err(f'{w}: `people` phải là danh sách chuỗi')
            people = []
        if len(set(people)) != len(people):
            err(f'{w}: `people` có tên trùng')
        steps = t.get('steps')
        if not isinstance(steps, list):
            err(f'{w}: `steps` phải là danh sách')
            continue
        blanks += not steps
        for j, s in enumerate(steps):
            ws = f'{w} ({tid}) steps[{j}]'
            if extra := set(s) - STEP_KEYS:
                err(f'{ws}: khoá lạ {sorted(extra)}')
            need_str(ws, s, 'title')
            for k in ('goal', 'doneWhen'):
                need_str(ws, s, k)
            need_str(ws, s, 'notes', required=False)
            subs = s.get('subs')
            if not isinstance(subs, list) or not subs:
                err(f'{ws}: `subs` phải là danh sách không rỗng')
                continue
            for k, sub in enumerate(subs):
                wss = f'{ws}.subs[{k}]'
                if extra := set(sub) - SUB_KEYS:
                    err(f'{wss}: khoá lạ {sorted(extra)}')
                need_str(wss, sub, 'title')
                for key in ('doneWhen', 'owner', 'notes'):
                    need_str(wss, sub, key, required=False)
                if sub.get('owner') and sub['owner'] not in people:
                    err(f'{wss}: owner "{sub["owner"]}" không có trong `people` của mẫu')
    if blanks != 1:
        err(f'templates.json: cần đúng một mẫu trống (steps rỗng), đang có {blanks}')
    course = next((t for t in tpls if t.get('id') == COURSE_ID), None)
    if course is None:
        err(f'templates.json: thiếu mẫu {COURSE_ID}')
    elif course != course_template():
        err(f'templates.json: mẫu {COURSE_ID} lệch trang đồ án — chạy python3 step-planner/tools/lint.py --write-course')


def check_code():
    for name in sorted(os.listdir(os.path.join(HERE, 'js'))):
        if not name.endswith('.js'):
            continue
        src = open(os.path.join(HERE, 'js', name), encoding='utf-8').read()
        for bad in ('innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write'):
            if bad in src:
                err(f'js/{name}: có `{bad}` — dựng DOM bằng createElement / textContent')
    css = open(os.path.join(HERE, 'css/planner.css'), encoding='utf-8').read()
    if TOKEN_END not in css:
        err(f'css/planner.css: thiếu dòng {TOKEN_END}')
    else:
        body = css.split(TOKEN_END, 1)[1]
        for n, line in enumerate(body.split('\n'), css.split(TOKEN_END)[0].count('\n') + 1):
            if re.search(r'#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(', line):
                err(f'css/planner.css:{n}: mã màu ngoài khối token')


def main():
    data = json.load(open(TEMPLATES, encoding='utf-8'))
    if '--write-course' in sys.argv:
        tpls = data['templates']
        idx = next(i for i, t in enumerate(tpls) if t.get('id') == COURSE_ID)
        tpls[idx] = course_template()
        with open(TEMPLATES, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'step-planner: đã sinh lại mẫu {COURSE_ID}')
    check_templates(data)
    check_code()
    if errors:
        for e in errors:
            print(f'step-planner: {e}')
        print(f'step-planner: {len(errors)} lỗi.')
        return 1
    print(f'step-planner: lint OK ({len(data["templates"])} mẫu).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
