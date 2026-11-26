#!/usr/bin/env python3
"""Cổng dữ liệu và code của step-planner/.

  1. data/templates.json: khuôn mẫu (khoá, kiểu, chuỗi không rỗng, id không trùng, không thẻ HTML, có đúng một mẫu
     trống). Không có khái niệm người làm: mẫu không có `people` / `owner`.
     Mẫu có bước thì có `output`: loại đầu ra, ≤ 30 ký tự.
     Bàn giao: bước hay bước con có thể có `outs` [{key, name, ref?, note?}] và `ins` [key]. Khoá dạng `[a-z0-9][a-z0-9-]*`
     (≤ 40), không trùng trong một mẫu; `ins` trỏ tới đầu ra có thật, không phải của chính nó, khai ở bước trước hoặc ở bước
     con đứng trước trong cùng bước (dữ liệu chỉ chảy xuôi). `ref`: đường dẫn hay link https, một dòng.
     Link tới trang của repo (https://vudat081299.github.io/…): file có trong repo, neo `#id` có trên trang.
  2. Mẫu `it5425-sports` khớp từng chữ với bản sinh từ trang đồ án môn (COURSE_JSON, COURSE_HTML): không thêm nội dung.
     outs / ins của nó suy từ đường dẫn trong `io_html` từng pha (`course_flow`).
     Sinh lại:  python3 step-planner/tools/lint.py --write-course
  3. js/*.js: không innerHTML / outerHTML / insertAdjacentHTML / document.write — chữ người dùng chỉ qua textContent.
  4. css/planner.css: mã màu chỉ nằm trong khối token (từ đầu file tới dòng `/* ── hết token ── */`).
  5. data/system-design.json (PLAN-016): khuôn hồ sơ, khâu, phương án; id không trùng; `fit` chỉ dùng câu và câu trả lời
     có trong hồ sơ; link https; mỗi câu trả lời đơn lẻ của hồ sơ có ít nhất một phương án hợp ở mọi khâu.
     `architectures`: nhóm kiến trúc {id, label, question, note?, sources?, entries, rules}; kiến trúc {id, name, what, use,
     avoid, flow, tools, path?, sources}: `tools` trỏ phương án có thật, `path` trỏ lối có thật; luật gợi ý {if, arch, why}
     dùng cùng khoá điều kiện với `checks`, `arch` là kiến trúc của nhóm ("" = nhóm không cần).
     Luật báo {id, title, if, unless?, msg, caveat?}: `caveat: true` = luật nhắc cách dùng, phương án vẫn đúng (Apply path
     không né nó).
  6. Ngôn ngữ (PLAN-028): mọi chữ của mẫu có chữ Việt (trừ chuỗi chỉ là đường dẫn, tên file, và LATIN_OK); mọi chuỗi của
     system-design.json là lời giải thích tiếng Việt, trừ nhãn và tên (DESIGN_EN, tiếng Anh), tên trang ngoài (DESIGN_TITLES,
     giữ chữ của trang), id, URL, lệnh (DESIGN_CODE); chuỗi trong js/*.js và chữ của index.html không có chữ Việt, trừ chuỗi
     có chú thích `lang: vi — lý do` trên dòng mở hoặc dòng đóng (một chú thích miễn đúng một chuỗi).
  Tự kiểm cổng này: python3 step-planner/tools/lint.py --self-test (cài lỗi vào bản sao tạm, mỗi lỗi phải bị bắt).

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
STAGE_KEYS = {'id', 'title', 'lane', 'question', 'guide', 'multi', 'skipWhen', 'task', 'when', 'options'}
OPT_KEYS = {'id', 'name', 'kind', 'summary', 'pick', 'avoid', 'cost', 'level', 'fit', 'links', 'setup', 'task'}
DESIGN_KEYS = {'note', 'paths', 'profile', 'stages', 'checks', 'architectures'}
FAMILY_KEYS = {'id', 'label', 'question', 'note', 'sources', 'entries', 'rules'}
ARCH_KEYS = {'id', 'name', 'what', 'use', 'avoid', 'flow', 'tools', 'path', 'sources'}
CHECK_KEYS = {'id', 'title', 'if', 'unless', 'msg', 'caveat'}
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
        'output': 'Đồ án môn',
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
    """Chữ giao diện (nhãn, tên khâu, tên phương án) viết tiếng Anh: không có chữ cái ngoài ASCII (dấu câu như · — … vẫn được)."""
    bad = sorted({c for c in str(s) if ord(c) > 127 and unicodedata.category(c).startswith('L')})
    if bad:
        err(f'{where}: chữ giao diện phải tiếng Anh, có chữ {"".join(bad)} (lời giải thích thì tiếng Việt)')


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


SITE_RE = re.compile(r'https://vudat081299\.github\.io/([^\s#?]+)(?:#([\w-]+))?')


def check_site_links(where, s):
    """Link tới trang của chính repo trong mẫu: file phải có trong repo, neo `#id` phải có trên trang."""
    for path, anchor in SITE_RE.findall(s):
        f = os.path.join(REPO, path)
        if not os.path.isfile(f):
            err(f'{where}: link tới {path} nhưng repo không có file này')
        elif anchor and f'id="{anchor}"' not in open(f, encoding='utf-8').read():
            err(f'{where}: {path} không có neo #{anchor}')


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
        steps = t.get('steps')
        if not isinstance(steps, list):
            err(f'{w}: `steps` phải là danh sách')
            continue
        blanks += not steps
        if steps or 'output' in t:  # loại đầu ra hiện trên thẻ mẫu; mẫu trống không cần
            need_str(w, t, 'output')
            if len(str(t.get('output', ''))) > 30:
                err(f'{w}: `output` tối đa 30 ký tự (một dòng trên thẻ mẫu)')
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
                for key in ('doneWhen', 'notes'):
                    need_str(wss, sub, key, required=False)
        check_flow(f'{w} ({tid})', steps)
        check_site_links(f'{w} ({tid})', json.dumps(t, ensure_ascii=False))
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
        # `when`: khâu chỉ cần khi hồ sơ khớp ({} = luôn cần); câu trả lời ngoài `when` không cần phương án hợp.
        when = s.get('when')
        if not isinstance(when, dict):
            err(f'{w}: `when` phải là object (câu hồ sơ → các câu trả lời)')
            when = {}
        for k, v in when.items():
            if k not in answers or not isinstance(v, list) or not v or set(v) - set(answers[k]):
                err(f'{w}: when.{k} = {v} không khớp hồ sơ')
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
                if q in when and a not in when[q]:
                    continue
                if not any(a in (o.get('fit') or {}).get(q, vals) for o in opts):
                    err(f'{w}: không phương án nào hợp khi {q} = {a}')
    options = {s.get('id'): {o.get('id') for o in s.get('options') or []} for s in data['stages']}
    check_paths(data, answers, options)
    check_checks(data, answers, options)
    check_architectures(data, answers, options)


def check_cond(w, cond, answers, options, paths):
    """Điều kiện của luật (`if`, `unless`): khoá là khâu (phương án có thật, `skip`, `own`), câu hồ sơ hay `path`."""
    for k, vals in cond.items():
        ok = options[k] | {'skip', 'own'} if k in options else set(answers[k]) if k in answers else paths if k == 'path' else None
        if ok is None:
            err(f'{w}.{k} — không phải khâu, câu hồ sơ hay path')
        elif not isinstance(vals, list) or not vals or set(vals) - ok:
            err(f'{w}.{k} có giá trị lạ {vals}')


def check_sources(w, srcs):
    if not isinstance(srcs, list) or not all(isinstance(x, dict) and set(x) == {'title', 'url'} and str(x['url']).startswith('https://')
                                             and str(x['title']).strip() for x in srcs):
        err(f'{w}: sources là danh sách {{title, url https}}')


def check_architectures(data, answers, options):
    """Danh mục kiến trúc theo nhóm; mỗi nhóm có luật gợi ý theo hồ sơ và các khâu đã quyết (luật đầu tiên khớp thắng)."""
    paths = {p.get('id') for p in data.get('paths') or []}
    fams = data.get('architectures')
    if not isinstance(fams, list) or len(fams) < 2:
        err('system-design.json: `architectures` cần ít nhất hai nhóm')
        return
    seen = set()
    for i, f in enumerate(fams):
        fid = f.get('id', '')
        w = f'system-design.json architectures[{i}] ({fid})'
        if set(f) - FAMILY_KEYS or not {'id', 'label', 'question', 'entries', 'rules'} <= set(f):
            err(f'{w}: khoá là id, label, question, entries, rules; note, sources tuỳ chọn (đang có {sorted(f)})')
            continue
        if not re.fullmatch(ID_RE, str(fid)) or fid in seen:
            err(f'{w}: id sai hoặc trùng')
        seen.add(fid)
        for k in ('label', 'question'):
            need_str(w, f, k)
        need_str(w, f, 'note', required=False)
        english(f'{w}.label', f.get('label', ''))
        check_sources(w, f.get('sources', []))
        ids = set()
        entries = f.get('entries') or []
        if len(entries) < 2:
            err(f'{w}: cần ít nhất hai kiến trúc')
        for j, a in enumerate(entries):
            wa = f'{w}.entries[{j}] ({a.get("id")})'
            if set(a) - ARCH_KEYS or not ARCH_KEYS - {'path'} <= set(a):
                err(f'{wa}: khoá phải là {sorted(ARCH_KEYS)}, path tuỳ chọn (đang có {sorted(a)})')
                continue
            if not re.fullmatch(ID_RE, str(a['id'])) or a['id'] in ids:
                err(f'{wa}: id sai hoặc trùng')
            ids.add(a['id'])
            for k in ('name', 'what', 'use', 'avoid'):
                need_str(wa, a, k)
            english(f'{wa}.name', a.get('name', ''))
            flow = a.get('flow')
            if not isinstance(flow, list) or len(flow) < 2 or not all(isinstance(x, str) and x.strip() and '\n' not in x for x in flow):
                err(f'{wa}: flow là danh sách ít nhất hai bước, mỗi bước một dòng')
            else:
                for x in flow:
                    english(f'{wa}.flow', x)
            tools = a.get('tools')
            if not isinstance(tools, dict) or not tools:
                err(f'{wa}: tools là object khâu → phương án')
            else:
                for sid, opt_ids in tools.items():
                    if sid not in options or not isinstance(opt_ids, list) or not opt_ids or set(opt_ids) - options[sid]:
                        err(f'{wa}: tools.{sid} = {opt_ids} không khớp khâu, phương án')
            if 'path' in a and a['path'] not in paths:
                err(f'{wa}: path "{a["path"]}" không có trong `paths`')
            check_sources(wa, a.get('sources'))
        rules = f.get('rules')
        if not isinstance(rules, list) or not rules:
            err(f'{w}: cần ít nhất một luật gợi ý')
            continue
        for j, r in enumerate(rules):
            wr = f'{w}.rules[{j}]'
            if not isinstance(r, dict) or set(r) != {'if', 'arch', 'why'} or not isinstance(r['if'], dict) or not r['if']:
                err(f'{wr}: khoá là if (không rỗng), arch, why')
                continue
            if r['arch'] != '' and r['arch'] not in ids:
                err(f'{wr}: arch "{r["arch"]}" không phải kiến trúc của nhóm')
            need_str(wr, r, 'why')
            check_cond(f'{wr}.if', r['if'], answers, options, paths)


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
            err(f'{w}: khoá là id, title, if, msg, unless và caveat (tuỳ chọn) (đang có {sorted(c)})')
            continue
        if not re.fullmatch(ID_RE, str(cid)) or cid in seen:
            err(f'{w}: id sai hoặc trùng')
        seen.add(cid)
        need_str(w, c, 'title')
        need_str(w, c, 'msg')
        if 'caveat' in c and c['caveat'] is not True:
            err(f'{w}: caveat chỉ là true (luật nhắc cách dùng, Apply path vẫn chọn được phương án)')
        english(f'{w}.title', c.get('title', ''))
        if not isinstance(c['if'], dict) or not c['if']:
            err(f'{w}: `if` cần ít nhất một điều kiện')
            continue
        for part in ('if', 'unless'):
            check_cond(f'{w}: {part}', c.get(part) or {}, answers, options, paths)


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


# ── Ngôn ngữ (PLAN-028): chữ giao diện tiếng Anh, nội dung mẫu và lời giải thích tiếng Việt ──

VI_RE = re.compile('[À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]')  # chữ cái riêng của tiếng Việt
TPL_TEXT = ('name', 'description', 'output', 'title', 'goal', 'doneWhen', 'notes')  # + outs[].name, outs[].note
# Chuỗi của mẫu được phép không có chữ Việt (ngoài đường dẫn, tên file): tên pha giữ chữ của trang đồ án.
LATIN_OK = {'P3 · EDA', 'P7 · Demo'}
# system-design.json: mọi chuỗi là lời giải thích tiếng Việt (trường mới cũng vậy), trừ ba loại dưới (đường dẫn: khoá nối
# bằng `.`, phần tử danh sách thêm `[]`, khoá dưới `if`, `unless`, `when`, `fit`, `implies`, `suggest`, `tools`, `paths[].stages` là `*`).
# Nhãn, tên giao diện: tiếng Anh (`english`).
DESIGN_EN = {'stages[].title', 'stages[].options[].name', 'stages[].options[].kind', 'checks[].title', 'paths[].label',
             'profile[].label', 'profile[].choices[].label', 'architectures[].label', 'architectures[].entries[].name',
             'architectures[].entries[].flow[]'}
# Tên trang ngoài (link, nguồn): giữ đúng tên trang ấy ghi, nên không đòi tiếng Việt; không có chữ Việt trừ trang của repo hay .vn.
DESIGN_TITLES = {'stages[].options[].links[].title', 'architectures[].sources[].title', 'architectures[].entries[].sources[].title'}
# Id, giá trị liệt kê, URL, lệnh: không xét ngôn ngữ.
DESIGN_CODE = re.compile(r'(^|\.)(id|arch|path|lane|cost|url)$|\.setup\[\]$|^paths\[\]\.ask\[\]$'
                         r'|\.(if|unless|when|fit|implies|suggest|tools)\.\*(\[\])?$|^paths\[\]\.stages\.\*$')
JS_VI_MARK = 'lang: vi'  # chú thích trên dòng mở chuỗi: chuỗi tiếng Việt có chủ ý (nội dung sinh ra, nhãn nhập định dạng cũ)


def path_text(s):
    """Chuỗi chỉ gồm đường dẫn, tên file (`data/raw/*.csv`, `README.md`, `.gitignore`) và dấu nối, không có chữ để dịch."""
    toks = [t.rstrip(',;') for t in s.split()]
    return all(t in ('', '→', '+', '·') or '/' in t or re.fullmatch(r'[\w.*-]*\.[A-Za-z]\w*\.?', t) for t in toks)


def check_tpl_language(data):
    """(a) Mọi chữ của mẫu tiếng Việt: tên, mô tả, loại đầu ra, tên bước, bước con, mục tiêu, Done when, ghi chú, đầu ra."""
    for t in data.get('templates') or []:
        w0 = f'templates.json ({t.get("id")})'
        items = [('', t)] + [(f'steps[{j}]', s) for j, s in enumerate(t.get('steps') or [])] + [
            (f'steps[{j}].subs[{k}]', x) for j, s in enumerate(t.get('steps') or []) for k, x in enumerate(s.get('subs') or [])]
        for where, it in items:
            fields = [(k, it.get(k)) for k in TPL_TEXT if k in it and (where or k in ('name', 'description', 'output'))]
            fields += [(f'outs[{n}].{k}', o.get(k)) for n, o in enumerate(it.get('outs') or []) for k in ('name', 'note') if k in o]
            for k, v in fields:
                if isinstance(v, str) and v.strip() and not VI_RE.search(v) and not path_text(v) and v not in LATIN_OK:
                    err(f'{w0} {where}{"." if where else ""}{k}: nội dung mẫu phải tiếng Việt (tên gốc tiếng Anh để trong ngoặc): "{v[:60]}"')


def check_design_language(data):
    """Mọi chuỗi của System design là lời giải thích tiếng Việt, trừ nhãn, tên (tiếng Anh), tên trang ngoài, id, URL, lệnh."""
    def walk(o, path, url=''):
        if isinstance(o, dict):
            for k, v in o.items():
                key = '*' if re.search(r'(^|\.)(if|unless|when|fit|implies|suggest|tools)$|^paths\[\]\.stages$', path) else k
                yield from walk(v, f'{path}.{key}' if path else key, str(o.get('url', '')))
        elif isinstance(o, list):
            for v in o:
                yield from walk(v, path + '[]', url)
        elif isinstance(o, str):
            yield path, o, url
    for path, s, url in walk(data, ''):
        if DESIGN_CODE.search(path):
            continue
        if path in DESIGN_EN:
            if path == 'stages[].options[].name':  # nhãn khác: `english` ở check_design
                english(f'system-design.json {path}', s)
        elif path in DESIGN_TITLES:
            if VI_RE.search(s) and not re.match(r'https://([\w-]+\.)*(vudat081299\.github\.io|[\w-]+\.vn)(/|$)', url):
                err(f'system-design.json {path}: tên trang ngoài giữ đúng chữ của trang ấy, không dịch: "{s[:60]}" ({url})')
        elif s.strip() and not VI_RE.search(s):
            err(f'system-design.json {path}: lời giải thích phải tiếng Việt: "{s[:60]}"')


def js_strings(src, comments=None):
    """[(dòng mở, chữ, dòng đóng, số chuỗi)] của mọi chuỗi trong code JS ('…', "…", phần chữ của `…`), bỏ regex literal.
    Các phần chữ của một `…` chung dòng mở và số chuỗi.
    Chú thích không phải chuỗi; truyền `comments` (list) thì nhận thêm [(dòng, chữ)] của từng chú thích (khối nhiều dòng: dòng cuối)."""
    out, i, n, line, prev, stack = [], 0, len(src), 1, '', []  # stack: độ sâu { } trong từng ${ } đang mở
    lits, lid = [], 0  # lits: (số chuỗi, dòng mở) của từng `…` đang chờ sau ${ }
    while i < n:
        c = src[i]
        if c == '\n':
            line, i = line + 1, i + 1
        elif c in ' \t\r':
            i += 1
        elif src.startswith('//', i):
            j = src.find('\n', i)
            j = n if j < 0 else j
            if comments is not None:
                comments.append((line, src[i:j]))
            i = j
        elif src.startswith('/*', i):
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            body = src[i:j]
            line, i = line + body.count('\n'), j
            if comments is not None:
                comments.append((line, body))
        elif c in '\'"`' or (c == '}' and stack and stack[-1] == 0):
            end = c if c != '}' else '`'
            if c == '}':
                stack.pop()
                cur, start = lits.pop()
            else:
                cur, start, lid = lid, line, lid + 1
            j, buf = i + 1, []
            while j < n and src[j] != end and not (end == '`' and src.startswith('${', j)):
                if src[j] == '\\':
                    buf.append(src[j:j + 2])
                    j += 2
                    continue
                line += src[j] == '\n'
                buf.append(src[j])
                j += 1
            out.append((start, ''.join(buf), line, cur))
            if end == '`' and src.startswith('${', j):
                stack.append(0)
                lits.append((cur, start))
                i = j + 2
            else:
                i = j + 1
            prev = 'a'
        elif c == '/' and (prev == '' or prev in '(,=:[!&|?{};+-*%<>~^'):  # regex literal
            j, cls = i + 1, False
            while j < n and src[j] != '\n' and (src[j] != '/' or cls):
                cls = (cls or src[j] == '[') and src[j] != ']'
                j += 2 if src[j] == '\\' else 1
            i = j + 1
            while i < n and src[i].isalpha():
                i += 1
            prev = 'a'
        elif re.match(r'[A-Za-z0-9_$]', c):
            word = re.match(r'[A-Za-z0-9_$]+', src[i:]).group(0)
            i += len(word)
            prev = '(' if word in ('return', 'typeof', 'case', 'of', 'in', 'yield', 'await', 'else', 'do') else 'a'
        else:
            if c == '{' and stack:
                stack[-1] += 1
            elif c == '}' and stack:
                stack[-1] -= 1
            prev = 'a' if c in ')]' else c
            i += 1
    return out


def check_ui_language(js_dir=None):
    """(b) Chữ giao diện tiếng Anh: chuỗi trong js/*.js và chữ của index.html (ngoài chú thích) không có chữ Việt.
    Chuỗi tiếng Việt có chủ ý (nội dung việc System design sinh ra, lời giải thích, nhãn nhập của định dạng cũ): chú thích
    `lang: vi — lý do` trên dòng mở hoặc dòng đóng của chuỗi. Một chú thích miễn đúng một chuỗi có chữ Việt: dòng có hai
    chuỗi như thế thì tách dòng; chú thích không còn chuỗi nào để miễn thì xoá."""
    js_dir = js_dir or os.path.join(HERE, 'js')
    for name in sorted(os.listdir(js_dir)):
        if not name.endswith('.js'):
            continue
        src = open(os.path.join(js_dir, name), encoding='utf-8').read()
        comments = []
        strs = js_strings(src, comments)
        marks = {}
        for ln, c in comments:
            if JS_VI_MARK in c:
                marks[ln] = 0
                if not re.search(JS_VI_MARK + r'\s*[—–-]\s*\S', c):
                    err(f'js/{name}:{ln}: chú thích `{JS_VI_MARK}` thiếu lý do (`// {JS_VI_MARK} — lý do`)')
        lit = {}  # số chuỗi → [dòng mở, chữ tiếng Việt, dòng đóng]
        for ln, s, end, k in strs:
            x = lit.setdefault(k, [ln, '', end])
            x[2] = end
            if VI_RE.search(s):
                x[1] = x[1] or s
        for ln, s, end in lit.values():
            if not s:
                continue
            at = ln if ln in marks else end if end in marks else None
            if at is None:
                err(f'js/{name}:{ln}: chữ giao diện phải tiếng Anh (nội dung có chủ ý: thêm chú thích `// {JS_VI_MARK} — lý do`): "{s[:60]}"')
            else:
                marks[at] += 1
        for ln, k in marks.items():
            if k > 1:
                err(f'js/{name}:{ln}: một chú thích `{JS_VI_MARK}` miễn đúng một chuỗi, dòng này có {k} chuỗi tiếng Việt: tách dòng')
            elif k == 0:
                err(f'js/{name}:{ln}: chú thích `{JS_VI_MARK}` không có chuỗi tiếng Việt nào để miễn: xoá')
    page = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
    for m in re.finditer(r'<!--.*?-->|<script\b[^>]*>(.*?)</script>', page, re.S):
        if m.group(1) and any(VI_RE.search(x[1]) for x in js_strings(m.group(1))):
            err(f'index.html:{page.count(chr(10), 0, m.start()) + 1}: chuỗi tiếng Việt trong <script>')
    bare = re.sub(r'<!--.*?-->|<script\b[^>]*>.*?</script>', lambda m: '\n' * m.group(0).count('\n'), page, flags=re.S)
    for n, l in enumerate(bare.split('\n'), 1):
        if VI_RE.search(l):
            err(f'index.html:{n}: chữ giao diện phải tiếng Anh: "{l.strip()[:60]}"')


def self_test():
    """Cài từng lỗi vào một bản sao tạm của step-planner/ (thư mục khác của repo: symlink), chạy lint trên bản sao: mỗi lỗi phải
    bị bắt đúng câu báo; bản sao có chuỗi tiếng Việt hợp lệ (nhiều dòng, chú thích ở dòng đóng) thì sạch."""
    import shutil
    import subprocess
    import tempfile

    def js(code):
        return lambda root: open(os.path.join(root, 'js', 'main.js'), 'a', encoding='utf-8').write('\n' + code + '\n')

    def design(fn):
        def run(root):
            p = os.path.join(root, 'data', 'system-design.json')
            d = json.load(open(p, encoding='utf-8'))
            fn(d)
            json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
        return run

    def tpl(root):
        p = os.path.join(root, 'data', 'templates.json')
        d = json.load(open(p, encoding='utf-8'))
        next(t for t in d['templates'] if t.get('steps'))['steps'][0]['subs'][0]['title'] = 'Collect data'
        json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False)

    cases = [
        ('js: chuỗi tiếng Việt không chú thích', js("export const __a = 'Tới chỗ này';"), 'chữ giao diện phải tiếng Anh'),
        ('js: một chú thích, hai chuỗi tiếng Việt', js("export const __b = ['Một', 'Hải']; // lang: vi — thử"), 'miễn đúng một chuỗi'),
        ('js: chú thích thiếu lý do', js("export const __c = 'Một'; // lang: vi"), 'thiếu lý do'),
        ('js: chữ "lang: vi" trong chuỗi không phải chú thích', js("export const __d = 'Một // lang: vi — giả';"), 'chữ giao diện phải tiếng Anh'),
        ('js: chú thích không còn chuỗi để miễn', js("export const __e = 'One'; // lang: vi — thử"), 'không có chuỗi tiếng Việt nào'),
        ('js: chuỗi nhiều dòng, chú thích ở dòng đóng; một `…` nhiều phần', js("export const __f = `một\nhai ở đây`; // lang: vi — thử\n"
                                                                                "export const __g = (x) => `${x} một ${x} hai ở`; // lang: vi — thử"), None),
        ('design: trường mới chưa khai, chữ tiếng Anh', design(lambda d: d['profile'][0].update(tip='Pick the closest one')), 'phải tiếng Việt'),
        ('design: lời giải thích của luật gợi ý tiếng Anh', design(lambda d: d['architectures'][0]['rules'][0].update(why='Use it.')), 'phải tiếng Việt'),
        ('design: tên trang ngoài bị dịch', design(lambda d: d['stages'][0]['options'][0]['links'][0].update(title='Trang chủ')), 'không dịch'),
        ('design: nhãn giao diện tiếng Việt', design(lambda d: d['stages'][0].update(title='Nguồn dữ liệu')), 'phải tiếng Anh'),
        ('mẫu: tên bước con tiếng Anh', tpl, 'nội dung mẫu phải tiếng Việt'),
    ]
    bad = 0
    for name, plant, want in cases:
        tmp = tempfile.mkdtemp(prefix='lint-self-')
        try:
            for e in os.listdir(REPO):
                if e not in ('step-planner', '.' + 'git'):
                    os.symlink(os.path.join(REPO, e), os.path.join(tmp, e))
            root = os.path.join(tmp, 'step-planner')
            shutil.copytree(HERE, root, ignore=shutil.ignore_patterns('__pycache__'))
            plant(root)
            r = subprocess.run([sys.executable, os.path.join(root, 'tools', 'lint.py')], capture_output=True, text=True)
            ok = (r.returncode == 0) if want is None else (r.returncode != 0 and want in r.stdout)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        bad += not ok
        print(f'{"  ok  " if ok else "  LỖI"} lint tự kiểm: {name}' + ('' if ok else f'  — {r.stdout.strip()[-300:]}'))
    print(f'step-planner: lint tự kiểm {"OK" if not bad else f"{bad} LỖI"} ({len(cases)} ca).')
    return 1 if bad else 0


def main():
    if '--self-test' in sys.argv:
        return self_test()
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
    check_tpl_language(data)
    check_design_language(design)
    check_ui_language()
    if errors:
        for e in errors:
            print(f'step-planner: {e}')
        print(f'step-planner: {len(errors)} lỗi.')
        return 1
    print(f'step-planner: lint OK ({len(data["templates"])} mẫu; thiết kế: {len(design["stages"])} khâu, {len(design["paths"])} lối, {len(design["checks"])} luật, {sum(len(f["entries"]) for f in design["architectures"])} kiến trúc).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
