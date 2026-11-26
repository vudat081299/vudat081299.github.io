#!/usr/bin/env python3
"""Cổng dữ liệu và code của step-planner/.

  1. data/templates.json: khuôn mẫu (khoá, kiểu, chuỗi không rỗng, id không trùng, không thẻ HTML, có đúng một mẫu
     trống). Không có khái niệm người làm: mẫu không có `people` / `owner`.
     Tên mẫu, tên bước, tên bước con tiếng Anh (trừ mẫu đồ án); nội dung khác tiếng Việt.
     Mẫu có bước thì có `output`: loại đầu ra, tiếng Anh, ≤ 30 ký tự.
     Bàn giao: bước hay bước con có thể có `outs` [{key, name, ref?, note?}] và `ins` [key]. Khoá dạng `[a-z0-9][a-z0-9-]*`
     (≤ 40), không trùng trong một mẫu; `ins` trỏ tới đầu ra có thật, không phải của chính nó, khai ở bước trước hoặc ở bước
     con đứng trước trong cùng bước (dữ liệu chỉ chảy xuôi). `ref`: đường dẫn hay link https, một dòng.
  2. Mẫu `it5425-sports` khớp từng chữ với bản sinh từ trang đồ án môn (COURSE_JSON, COURSE_HTML): không thêm nội dung.
     outs / ins của nó suy từ đường dẫn trong `io_html` từng pha (`course_flow`).
     Sinh lại:  python3 step-planner/tools/lint.py --write-course
  3. js/*.js: không innerHTML / outerHTML / insertAdjacentHTML / document.write — chữ người dùng chỉ qua textContent.
  4. css/planner.css: mã màu chỉ nằm trong khối token (từ đầu file tới dòng `/* ── hết token ── */`).
  5. data/system-design.json (PLAN-016): khuôn hồ sơ, khâu, phương án; id không trùng; `fit` chỉ dùng câu và câu trả lời
     có trong hồ sơ; link https; mỗi câu trả lời đơn lẻ của hồ sơ có ít nhất một phương án hợp ở mọi khâu.

Chạy:  python3 step-planner/tools/lint.py
"""
import html
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(HERE)
TEMPLATES = os.path.join(HERE, 'data/templates.json')
COURSE_JSON = os.path.join(REPO, 'masters-degree/data-management-visualization/data/sports-monitoring-build.json')
COURSE_HTML = os.path.join(REPO, 'masters-degree/data-management-visualization/sports-monitoring-build.html')
PLAN_HTML = os.path.join(REPO, 'masters-degree/data-management-visualization/sports-monitoring-project.html')
COURSE_ID = 'it5425-sports'
COURSE_URL = 'https://vudat081299.github.io/masters-degree/data-management-visualization/sports-monitoring-build.html'
PLAN_URL = 'https://vudat081299.github.io/masters-degree/data-management-visualization/sports-monitoring-project.html'
TOKEN_END = '/* ── hết token ── */'
DESIGN = os.path.join(HERE, 'data/system-design.json')
LANES = ('data', 'model', 'app', 'ops')
STAGE_KEYS = {'id', 'title', 'lane', 'question', 'guide', 'multi', 'skipWhen', 'task', 'options'}
OPT_KEYS = {'id', 'name', 'kind', 'summary', 'pick', 'avoid', 'cost', 'level', 'fit', 'links', 'setup', 'task'}
DESIGN_KEYS = {'note', 'paths', 'profile', 'stages', 'checks'}
CHECK_KEYS = {'id', 'title', 'if', 'unless', 'msg'}
PATH_KEYS = {'id', 'label', 'summary', 'flow', 'why', 'switch', 'ask', 'implies', 'stages', 'suggest', 'accept'}
ID_RE = r'[a-z0-9]+(-[a-z0-9]+)*'

errors = []


def err(msg):
    errors.append(msg)


def text(s):
    """HTML của trang đồ án → chữ thường: bỏ thẻ, giải mã thực thể, gộp khoảng trắng, đổi chỗ trỏ "trang này"."""
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    s = re.sub(r'\s+', ' ', s).strip()
    s = s.replace('trang này', 'trang đồ án').replace('bên dưới', 'trên trang đồ án')
    return s


def io_paths(part):
    """Đường dẫn trong <code> của một vế `io_html`; tên trần (không có /) nằm cùng thư mục với đường dẫn ngay trước nó."""
    out, base = [], ''
    for c in re.findall(r'<code>(.*?)</code>', part):
        c = html.unescape(c).strip()
        if '/' in c:
            base = c[:c.rfind('/') + 1]
        else:
            c = base + c
        out.append(c)
    return out


def course_flow(phases, page, src):
    """Bàn giao của mẫu đồ án, suy từ `io_html` của từng pha ("vào → ra"): mỗi đường dẫn bên phải là một đầu ra (khai ở
    pha đầu tiên nhắc tới nó); đường dẫn bên trái trùng một đầu ra của pha trước, hoặc là thư mục chứa nó, là đầu vào."""
    m = re.search(r'Data dictionary của bảng (\w+)', page)
    pk = next((r['col'] for r in src.get('dictionary', []) if 'khoá chính' in r.get('mean_html', '')), '')
    if 'id="mo-hinh-du-lieu"' not in page:
        err(f'{COURSE_HTML}: mất neo #mo-hinh-du-lieu mà mẫu {COURSE_ID} trỏ tới')
    declared, flows = {}, []
    for p in phases:
        left, _, right = p['io_html'].partition('→')
        ins = []
        for path in io_paths(left):
            for o, key in declared.items():
                if (o == path or (path.endswith('/') and o.startswith(path))) and key not in ins:
                    ins.append(key)
        outs = []
        for path in io_paths(right):
            if path in declared:
                continue
            key = re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-')[:40].strip('-')
            out = {'key': key, 'name': path, 'ref': path}
            if path.startswith('data/clean/') and m and pk:
                out['note'] = f'Bảng {m.group(1)}, khoá chính {pk}; data dictionary: {COURSE_URL}#mo-hinh-du-lieu'
            declared[path] = key
            outs.append(out)
        flows.append((outs, ins))
    return flows


def course_template():
    src = json.load(open(COURSE_JSON, encoding='utf-8'))
    roles = [t['role'] for t in src['team']]
    page = open(COURSE_HTML, encoding='utf-8').read()
    m = re.search(r'id="xong">.*?<ul class="checklist">(.*?)</ul>', page, re.S)
    checklist = [text(x) for x in re.findall(r'<li>(.*?)</li>', m.group(1), re.S)] if m else []
    if not checklist:
        err(f'{COURSE_HTML}: không tìm thấy danh sách "Xong khi nào" (#xong)')
    for anchor in ('lich', 'xong'):
        if f'id="{anchor}"' not in page:
            err(f'{COURSE_HTML}: mất neo #{anchor} mà mẫu {COURSE_ID} trỏ tới')
    if 'id="can-xac-nhan"' not in open(PLAN_HTML, encoding='utf-8').read():
        err(f'{PLAN_HTML}: mất neo #can-xac-nhan mà mẫu {COURSE_ID} trỏ tới')
    steps = []
    flows = course_flow(src['phases'], page, src)
    for p, (outs, ins) in zip(src['phases'], flows):
        phase_roles = [roles[i - 1] for i in p['roles']]
        subs = [{'title': text(t)} for t in p['tasks_html']]
        notes = ['Vai: ' + ', '.join(phase_roles), 'Công cụ: ' + text(p['tools']),
                 f'Trang đồ án, pha {p["id"]}: {COURSE_URL}#lich']
        if p['id'] == 'P0':
            notes.append(f'Câu hỏi gửi giảng viên, thư xin phép: {PLAN_URL}#can-xac-nhan')
        if p['id'] == 'P8' and checklist:
            notes += ['', f'Xong khi nào ({COURSE_URL}#xong):'] + ['- ' + c for c in checklist]
        steps.append({
            'title': f'{p["id"]} · {p["name"]}',
            'goal': text(p['io_html']),
            'doneWhen': text(p['done_html']),
            'notes': '\n'.join(notes),
            'subs': subs,
            **({'outs': outs} if outs else {}),
            **({'ins': ins} if ins else {}),
        })
    return {
        'id': COURSE_ID,
        'name': 'Đồ án IT5425 — giám sát thể thao (Premier League)',
        'output': 'Course project',
        'description': 'Chọn khi làm đồ án môn Data Management and Visualization (IT5425). Các giai đoạn P0–P8 lấy từ trang đồ án. '
                       'Làm một mình: Skip việc chia vai, họp tuần; app demo và slide tuỳ yêu cầu nộp.',
        'steps': steps,
    }


STEP_KEYS = {'title', 'goal', 'doneWhen', 'notes', 'subs', 'outs', 'ins'}
SUB_KEYS = {'title', 'doneWhen', 'notes', 'outs', 'ins'}
OUT_KEYS = {'key', 'name', 'ref', 'note'}
KEY_RE = r'[a-z0-9][a-z0-9-]{0,39}'
TPL_KEYS = {'id', 'name', 'output', 'description', 'steps'}


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


def english(where, s):
    """Tên mẫu, bước, bước con viết tiếng Anh: không có chữ cái ngoài ASCII (dấu câu như · — … vẫn được)."""
    bad = sorted({c for c in str(s) if ord(c) > 127 and unicodedata.category(c).startswith('L')})
    if bad:
        err(f'{where}: tên phải tiếng Anh, có chữ {"".join(bad)} (nội dung khác giữ tiếng Việt)')


def check_flow(w, steps):
    """outs / ins của một mẫu. Vị trí (j, k): bước j, bước con k (k = -1: cả bước)."""
    where = {}  # key -> (j, k)
    items = [(j, -1, s) for j, s in enumerate(steps)] + [
        (j, k, x) for j, s in enumerate(steps) for k, x in enumerate(s['subs'] if isinstance(s.get('subs'), list) else [])]
    for j, k, it in items:
        wi = f'{w} steps[{j}]' + (f'.subs[{k}]' if k >= 0 else '')
        outs = it.get('outs', [])
        if not isinstance(outs, list):
            err(f'{wi}: `outs` phải là danh sách')
            continue
        for n, out in enumerate(outs):
            wo = f'{wi}.outs[{n}]'
            if not isinstance(out, dict):
                err(f'{wo}: phải là object {{key, name, ref?, note?}}')
                continue
            if extra := set(out) - OUT_KEYS:
                err(f'{wo}: khoá lạ {sorted(extra)}')
            key = out.get('key')
            if not isinstance(key, str) or not re.fullmatch(KEY_RE, key):
                err(f'{wo}: key "{key}" phải là chữ thường, số, gạch nối, tối đa 40 ký tự')
            elif key in where:
                err(f'{wo}: key "{key}" trùng trong mẫu')
            else:
                where[key] = (j, k)
            need_str(wo, out, 'name')
            for f in ('ref', 'note'):
                need_str(wo, out, f, required=False)
            ref = out.get('ref')
            if isinstance(ref, str) and '://' in ref and not ref.startswith('https://'):
                err(f'{wo}: ref là link thì phải https')
    for j, k, it in items:
        wi = f'{w} steps[{j}]' + (f'.subs[{k}]' if k >= 0 else '')
        ins = it.get('ins', [])
        if not isinstance(ins, list) or not all(isinstance(x, str) for x in ins):
            err(f'{wi}: `ins` phải là danh sách key')
            continue
        if len(set(ins)) != len(ins):
            err(f'{wi}: `ins` có key lặp')
        own = {o.get('key') for o in it.get('outs', []) if isinstance(o, dict)}
        for key in ins:
            if key not in where:
                err(f'{wi}: ins "{key}" không là đầu ra nào của mẫu')
            elif key in own:
                err(f'{wi}: ins "{key}" là đầu ra của chính nó')
            else:
                j2, k2 = where[key]
                if not (j2 < j or (j2 == j and 0 <= k2 < k)):
                    err(f'{wi}: ins "{key}" khai ở steps[{j2}]' + (f'.subs[{k2}]' if k2 >= 0 else '')
                        + ' — đầu vào chỉ lấy từ bước trước hoặc bước con đứng trước trong cùng bước')


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
        en = tid != COURSE_ID  # mẫu đồ án giữ nguyên chữ nguồn
        if en:
            english(f'{w}.name', t.get('name', ''))
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', str(tid)):
            err(f'{w}: id "{tid}" phải là chữ thường-gạch-nối')
        if tid in seen:
            err(f'{w}: id "{tid}" trùng')
        seen.add(tid)
        steps = t.get('steps')
        if not isinstance(steps, list):
            err(f'{w}: `steps` phải là danh sách')
            continue
        blanks += not steps
        if steps or 'output' in t:  # loại đầu ra hiện trên thẻ mẫu; mẫu trống không cần
            need_str(w, t, 'output')
            english(f'{w}.output', t.get('output', ''))
            if len(str(t.get('output', ''))) > 30:
                err(f'{w}: `output` tối đa 30 ký tự (một dòng trên thẻ mẫu)')
        for j, s in enumerate(steps):
            ws = f'{w} ({tid}) steps[{j}]'
            if extra := set(s) - STEP_KEYS:
                err(f'{ws}: khoá lạ {sorted(extra)}')
            need_str(ws, s, 'title')
            if en:
                english(f'{ws}.title', s.get('title', ''))
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
                if en:
                    english(f'{wss}.title', sub.get('title', ''))
                for key in ('doneWhen', 'notes'):
                    need_str(wss, sub, key, required=False)
        check_flow(f'{w} ({tid})', steps)
    if blanks != 1:
        err(f'templates.json: cần đúng một mẫu trống (steps rỗng), đang có {blanks}')
    course = next((t for t in tpls if t.get('id') == COURSE_ID), None)
    if course is None:
        err(f'templates.json: thiếu mẫu {COURSE_ID}')
    elif course != course_template():
        err(f'templates.json: mẫu {COURSE_ID} lệch trang đồ án — chạy python3 step-planner/tools/lint.py --write-course')


def check_design(data):
    w0 = 'system-design.json'
    if set(data) != DESIGN_KEYS:
        err(f'{w0}: khoá gốc phải là {sorted(DESIGN_KEYS)} (đang có {sorted(data)})')
        return
    answers = {}
    for i, q in enumerate(data['profile']):
        w = f'{w0} profile[{i}]'
        for k in ('id', 'label', 'help'):
            need_str(w, q, k)
        english(f'{w}.label', q.get('label', ''))
        ch = q.get('choices') or []
        if len(ch) < 2:
            err(f'{w}: cần ít nhất hai lựa chọn')
        for c in ch:
            need_str(w, c, 'id')
            need_str(w, c, 'label')
            english(f'{w}.choices.label', c.get('label', ''))
        answers[q.get('id')] = [c.get('id') for c in ch]
    seen = set()
    for i, s in enumerate(data['stages']):
        sid = s.get('id', '')
        w = f'{w0} stages[{i}] ({sid})'
        if set(s) != STAGE_KEYS:
            err(f'{w}: khoá phải là {sorted(STAGE_KEYS)} (đang có {sorted(s)})')
        if not re.fullmatch(ID_RE, str(sid)) or sid in seen or sid == 'users':
            err(f'{w}: id "{sid}" sai hoặc trùng')
        seen.add(sid)
        for k in ('title', 'question', 'task'):
            need_str(w, s, k)
        english(f'{w}.title', s.get('title', ''))
        need_str(w, s, 'skipWhen', required=False)
        if not isinstance(s.get('guide'), str) or not s['guide'].strip() or re.search(r'<[a-zA-Z/][^>]*>', s['guide']):
            err(f'{w}: `guide` phải là chữ không rỗng, không thẻ HTML')
        if s.get('lane') not in LANES:
            err(f'{w}: lane phải thuộc {LANES}')
        if not isinstance(s.get('multi'), bool):
            err(f'{w}: `multi` phải là true / false')
        opts = s.get('options') or []
        if len(opts) < 2:
            err(f'{w}: cần ít nhất hai phương án')
        ids = set()
        for j, o in enumerate(opts):
            wo = f'{w}.options[{j}] ({o.get("id")})'
            if set(o) != OPT_KEYS:
                err(f'{wo}: khoá phải là {sorted(OPT_KEYS)} (đang có {sorted(o)})')
            if not re.fullmatch(ID_RE, str(o.get('id'))) or o.get('id') in ids or o.get('id') in ('skip', 'own'):
                err(f'{wo}: id sai hoặc trùng')
            ids.add(o.get('id'))
            for k in ('name', 'kind', 'summary', 'pick', 'task'):
                need_str(wo, o, k)
            need_str(wo, o, 'avoid', required=False)
            english(f'{wo}.kind', o.get('kind', ''))
            if o.get('cost') not in ('free', 'freemium', 'paid'):
                err(f'{wo}: cost phải là free / freemium / paid')
            if o.get('level') not in (1, 2, 3):
                err(f'{wo}: level phải là 1, 2 hoặc 3')
            for k, v in (o.get('fit') or {}).items():
                if k not in answers or not isinstance(v, list) or not v or set(v) - set(answers[k]):
                    err(f'{wo}: fit.{k} = {v} không khớp hồ sơ')
            links = o.get('links') or []
            if not links:
                err(f'{wo}: cần ít nhất một link chính thức')
            for l in links:
                if not str(l.get('url', '')).startswith('https://') or not str(l.get('title', '')).strip():
                    err(f'{wo}: link cần title và url https')
            if not all(isinstance(c, str) and c.strip() and '\n' not in c for c in o.get('setup') or []):
                err(f'{wo}: setup là danh sách lệnh, mỗi lệnh một dòng')
        for q, vals in answers.items():
            for a in vals:
                if not any(a in (o.get('fit') or {}).get(q, vals) for o in opts):
                    err(f'{w}: không phương án nào hợp khi {q} = {a}')
    options = {s.get('id'): {o.get('id') for o in s.get('options') or []} for s in data['stages']}
    check_paths(data, answers, options)
    check_checks(data, answers, options)


def check_checks(data, answers, options):
    """Luật phối hợp: khoá điều kiện là khâu (phương án có thật, `skip`, `own`), câu hồ sơ (câu trả lời) hay `path` (id lối)."""
    paths = {p.get('id') for p in data.get('paths') or []}
    seen = set()
    checks = data.get('checks')
    if not isinstance(checks, list):
        err('system-design.json: `checks` phải là danh sách')
        return
    for i, c in enumerate(checks):
        cid = c.get('id', '')
        w = f'system-design.json checks[{i}] ({cid})'
        if set(c) - CHECK_KEYS or not {'id', 'title', 'if', 'msg'} <= set(c):
            err(f'{w}: khoá là id, title, if, msg, unless (tuỳ chọn) (đang có {sorted(c)})')
            continue
        if not re.fullmatch(ID_RE, str(cid)) or cid in seen:
            err(f'{w}: id sai hoặc trùng')
        seen.add(cid)
        need_str(w, c, 'title')
        need_str(w, c, 'msg')
        english(f'{w}.title', c.get('title', ''))
        if not isinstance(c['if'], dict) or not c['if']:
            err(f'{w}: `if` cần ít nhất một điều kiện')
            continue
        for part in ('if', 'unless'):
            for k, vals in (c.get(part) or {}).items():
                ok = options[k] | {'skip', 'own'} if k in options else set(answers[k]) if k in answers else paths if k == 'path' else None
                if ok is None:
                    err(f'{w}: {part}.{k} — không phải khâu, câu hồ sơ hay path')
                elif not isinstance(vals, list) or not vals or set(vals) - ok:
                    err(f'{w}: {part}.{k} có giá trị lạ {vals}')


def check_paths(data, answers, options):
    """Lối bắt đầu theo thứ bàn giao: mỗi khâu một mức need / maybe / skip, gợi ý chỉ phương án có thật ở khâu không bỏ."""
    seen = set()
    paths = data.get('paths')
    if not isinstance(paths, list) or len(paths) < 2:
        err('system-design.json: `paths` cần ít nhất hai lối')
        return
    for i, pth in enumerate(paths):
        pid = pth.get('id', '')
        w = f'system-design.json paths[{i}] ({pid})'
        if set(pth) != PATH_KEYS:
            err(f'{w}: khoá phải là {sorted(PATH_KEYS)} (đang có {sorted(pth)})')
            continue
        if not re.fullmatch(ID_RE, str(pid)) or pid in seen:
            err(f'{w}: id sai hoặc trùng')
        seen.add(pid)
        for k in ('label', 'summary', 'why', 'switch'):
            need_str(w, pth, k)
        english(f'{w}.label', pth.get('label', ''))
        for k in ('flow', 'accept'):
            v = pth.get(k)
            if not isinstance(v, list) or not v:
                err(f'{w}: `{k}` là danh sách chữ không rỗng')
            else:
                for j in range(len(v)):
                    if not isinstance(v[j], str) or not v[j].strip() or '\n' in v[j]:
                        err(f'{w}.{k}[{j}]: mỗi mục một dòng chữ')
        for q in pth['ask']:
            if q not in answers:
                err(f'{w}: ask có câu hồ sơ lạ {q}')
        for q, a in pth['implies'].items():
            if q not in answers or a not in answers[q]:
                err(f'{w}: implies.{q} = {a} không khớp hồ sơ')
        if set(pth['stages']) != set(options) or set(pth['stages'].values()) - {'need', 'maybe', 'skip'}:
            err(f'{w}: stages phải ghi mọi khâu, giá trị need / maybe / skip')
        for sid, ids in pth['suggest'].items():
            if sid not in options or pth['stages'].get(sid) == 'skip':
                err(f'{w}: suggest.{sid} — khâu lạ hoặc khâu lối này bỏ')
            elif not ids or set(ids) - options[sid]:
                err(f'{w}: suggest.{sid} có phương án lạ {sorted(set(ids) - options[sid])}')


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
    design = json.load(open(DESIGN, encoding='utf-8'))
    check_design(design)
    check_code()
    if errors:
        for e in errors:
            print(f'step-planner: {e}')
        print(f'step-planner: {len(errors)} lỗi.')
        return 1
    print(f'step-planner: lint OK ({len(data["templates"])} mẫu; thiết kế: {len(design["stages"])} khâu, {len(design["paths"])} lối, {len(design["checks"])} luật).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
