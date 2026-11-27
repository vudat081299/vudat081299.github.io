#!/usr/bin/env python3
"""Cổng dữ liệu và code của step-planner/.

  1. data/templates.json: khuôn mẫu (khoá, kiểu, chuỗi không rỗng, id không trùng, không thẻ HTML, có đúng một mẫu
     trống). Không có khái niệm người làm: mẫu không có `people` / `owner`.
     Mẫu có bước thì có `output`: loại đầu ra, ≤ 30 ký tự. `group` (tuỳ chọn, PLAN-039): chỉ ghi "specific" — dự án cụ thể chủ
     trang đang làm, đứng ngay sau `id`; không có `group` là mẫu chung. Mẫu trống là mẫu chung.
     Bàn giao: bước hay bước con có thể có `outs` [{key, name, ref?, note?, final?}] và `ins` [key]. `final` chỉ ghi `true`:
     sản phẩm cuối, không cần nơi nhận (test-core: mở mẫu ra không đầu ra nào lỗi). Khoá dạng `[a-z0-9][a-z0-9-]*`
     (≤ 40), không trùng trong một mẫu; `ins` trỏ tới đầu ra có thật, không phải của chính nó, khai ở bước trước hoặc ở bước
     con đứng trước trong cùng bước (dữ liệu chỉ chảy xuôi). Bước con của mẫu không có `par`: mỗi bước con một ô, nên luật này
     cũng chặn bên nhận cùng ô với bên giao (treo); test-core kiểm lại trên dự án mở từ mẫu. `ref`: đường dẫn hay link https, một dòng.
     Link tới trang của repo (https://vudat081299.github.io/…): file có trong repo, neo `#id` có trên trang.
     `design` (tuỳ chọn, PLAN-033): {profile, path?} đặt sẵn cho System design khi tạo dự án; câu và câu trả lời có trong
     hồ sơ của system-design.json, `path` là lối có thật, hồ sơ không rỗng. Mẫu trống không có `design`.
  2. js/**/*.js: không innerHTML / outerHTML / insertAdjacentHTML / document.write — chữ người dùng chỉ qua textContent.
     Import (cả `export … from`) trỏ tới file có thật; `import(…)` chỉ nhận chuỗi cố định; mọi file trừ main.js có nơi import
     (không mồ côi). js/core/ là logic thuần: code (đọc bằng `js_scan`: bỏ chú thích, chữ trong chuỗi không tính) không gọi tên
     toàn cục của trình duyệt (`PURE_GLOBALS`), không đọc thuộc tính DOM (`PURE_PROPS`, cả `x['…']`); chỉ import js/core/.
  3. css/: mỗi file css/*.css được link đúng một lần trong index.html, tokens.css trước hết (thứ tự link là cascade); mã màu
     chỉ nằm trong css/tokens.css. Vòng focus chỉ cho bàn phím: mọi selector có `:focus-visible` mở bằng QUIET_GUARD, trừ
     luật chỉ có `outline: none` (lớp quiet-focus do js/ui/dialogs.js bật khi dùng chuột, chạm).
  4. data/system-design.json (PLAN-016): khuôn hồ sơ, khâu, phương án; id không trùng; `fit` chỉ dùng câu và câu trả lời
     có trong hồ sơ; link https; mỗi câu trả lời đơn lẻ của hồ sơ có ít nhất một phương án hợp ở mọi khâu.
     `architectures`: nhóm kiến trúc {id, label, question, note?, sources?, entries, rules}; kiến trúc {id, name, what, use,
     avoid, flow, diagram, tools, path?, sources}: `tools` trỏ phương án có thật, `path` trỏ lối có thật; luật gợi ý {if, arch, why}
     dùng cùng khoá điều kiện với `checks`, `arch` là kiến trúc của nhóm ("" = nhóm không cần).
     `diagram` (sơ đồ luồng): {nodes [{id, label, note?, kind, row?}], edges [{from, to, dashed?}], group? {label, nodes}};
     ≥ 2 nút, ≥ 1 đường; id không trùng, đường và nhóm trỏ nút có thật; mọi nút nối với nút đầu (bỏ chiều đường); `kind` là một
     trong DIAGRAM_KINDS; `label` là tên chuẩn tiếng Anh như `flow`, `note` và nhãn nhóm tiếng Việt. Xếp lưới (một tầng mỗi
     đường, số tầng, số làn, không chồng hộp): test-core, qua core/arch-diagram.js.
     Luật báo {id, title, if, unless?, msg, caveat?}: `caveat: true` = luật nhắc cách dùng, phương án vẫn đúng (Apply path
     không né nó).
  5. Ngôn ngữ (PLAN-028): mọi chữ của mẫu có chữ Việt (trừ chuỗi chỉ là đường dẫn, tên file); mọi chuỗi của
     system-design.json là lời giải thích tiếng Việt, trừ nhãn và tên (DESIGN_EN, tiếng Anh), tên trang ngoài (DESIGN_TITLES,
     giữ chữ của trang), id, URL, lệnh (DESIGN_CODE); chuỗi trong js/**/*.js và chữ của index.html không có chữ Việt, trừ chuỗi
     có chú thích `lang: vi — lý do` trên dòng mở hoặc dòng đóng (một chú thích miễn đúng một chuỗi).
  Tự kiểm cổng này: python3 step-planner/tools/lint.py --self-test (cài lỗi vào bản sao tạm, mỗi lỗi phải bị bắt).

Chạy:  python3 step-planner/tools/lint.py
"""
import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(HERE)
TEMPLATES = os.path.join(HERE, 'data/templates.json')
DESIGN = os.path.join(HERE, 'data/system-design.json')
LANES = ('data', 'model', 'app', 'ops')
STAGE_KEYS = {'id', 'title', 'lane', 'question', 'guide', 'multi', 'skipWhen', 'task', 'when', 'options'}
OPT_KEYS = {'id', 'name', 'kind', 'summary', 'pick', 'avoid', 'cost', 'level', 'fit', 'links', 'setup', 'task'}
DESIGN_KEYS = {'note', 'paths', 'profile', 'stages', 'checks', 'architectures'}
FAMILY_KEYS = {'id', 'label', 'question', 'note', 'sources', 'entries', 'rules'}
ARCH_KEYS = {'id', 'name', 'what', 'use', 'avoid', 'flow', 'diagram', 'tools', 'path', 'sources'}
DIAGRAM_KINDS = ('src', 'run', 'store', 'use')
CHECK_KEYS = {'id', 'title', 'if', 'unless', 'msg', 'caveat'}
PATH_KEYS = {'id', 'label', 'summary', 'flow', 'why', 'switch', 'ask', 'implies', 'stages', 'suggest', 'accept'}
ID_RE = r'[a-z0-9]+(-[a-z0-9]+)*'

errors = []


def err(msg):
    errors.append(msg)


STEP_KEYS = {'title', 'goal', 'doneWhen', 'notes', 'subs', 'outs', 'ins'}
SUB_KEYS = {'title', 'doneWhen', 'notes', 'outs', 'ins'}
OUT_KEYS = {'key', 'name', 'ref', 'note', 'final'}
KEY_RE = r'[a-z0-9][a-z0-9-]{0,39}'
TPL_KEYS = {'id', 'group', 'name', 'output', 'description', 'design', 'steps'}
TPL_GROUPS = ('specific',)  # không có `group`: mẫu chung
TPL_DESIGN_KEYS = {'profile', 'path'}


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
                err(f'{wo}: phải là object {{key, name, ref?, note?, final?}}')
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
            if 'final' in out and out['final'] is not True:
                err(f'{wo}: `final` chỉ ghi true (bỏ khoá khi không phải sản phẩm cuối)')
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
        if 'group' in t:
            if t['group'] not in TPL_GROUPS:
                err(f'{w} ({tid}): `group` chỉ ghi "specific" (bỏ khoá khi là mẫu chung)')
            elif list(t)[:2] != ['id', 'group']:
                err(f'{w} ({tid}): `group` đứng ngay sau `id`')
            elif not t.get('steps'):
                err(f'{w} ({tid}): mẫu trống là mẫu chung, không có `group`')
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


def check_tpl_design(data, design):
    """`design` của mẫu (PLAN-033): hồ sơ và lối đặt sẵn, chỉ id có trong danh mục System design."""
    answers = {q.get('id'): [c.get('id') for c in q.get('choices') or []] for q in design.get('profile') or []}
    paths = {p.get('id') for p in design.get('paths') or []}
    for t in data.get('templates') or []:
        if 'design' not in t:
            continue
        w, d = f'templates.json ({t.get("id")}) design', t['design']
        if not t.get('steps'):
            err(f'{w}: mẫu trống không đặt sẵn System design')
        if not isinstance(d, dict) or set(d) - TPL_DESIGN_KEYS or not isinstance(d.get('profile'), dict) or not d['profile']:
            err(f'{w}: phải là {{profile, path?}}, `profile` không rỗng')
            continue
        for q, a in d['profile'].items():
            if q not in answers:
                err(f'{w}: câu hồ sơ "{q}" không có trong system-design.json')
            elif a not in answers[q]:
                err(f'{w}: "{q}" không có lựa chọn "{a}" (có {answers[q]})')
        if 'path' in d and d['path'] not in paths:
            err(f'{w}: lối "{d["path"]}" không có trong system-design.json (có {sorted(paths)})')


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
            check_diagram(wa, a.get('diagram'))
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


def check_diagram(w, d):
    """Sơ đồ luồng của một kiến trúc: khuôn, id, mọi nút nối vào sơ đồ, tên nút tiếng Anh (ghi chú tiếng Việt: check_design_language)."""
    w = f'{w}.diagram'
    if not isinstance(d, dict) or set(d) - {'nodes', 'edges', 'group'} or not isinstance(d.get('nodes'), list) or not isinstance(d.get('edges'), list):
        err(f'{w}: là {{nodes[], edges[], group?}}')
        return
    nodes, edges = d['nodes'], d['edges']
    if len(nodes) < 2 or not edges:
        err(f'{w}: sơ đồ rỗng (cần ít nhất hai nút và một đường nối)')
    ids = []
    for n in nodes:
        if not isinstance(n, dict) or set(n) - {'id', 'label', 'note', 'kind', 'row'} or not {'id', 'label', 'kind'} <= set(n):
            err(f'{w}: nút là {{id, label, note?, kind, row?}} (đang có {n})')
            continue
        if not re.fullmatch(ID_RE, str(n['id'])) or n['id'] in ids:
            err(f'{w}: id nút "{n["id"]}" sai hoặc trùng')
        ids.append(n['id'])
        need_str(w, n, 'label')
        need_str(w, n, 'note', required=False)
        english(f'{w}.nodes[{n["id"]}].label', n.get('label', ''))
        if n['kind'] not in DIAGRAM_KINDS:
            err(f'{w}: nút {n["id"]}: kind là một trong {", ".join(DIAGRAM_KINDS)}')
        if 'row' in n and (isinstance(n['row'], bool) or not isinstance(n['row'], (int, float)) or n['row'] < 0 or (n['row'] * 2) % 1):
            err(f'{w}: nút {n["id"]}: row là bội của 0.5, ≥ 0')
    for e in edges:
        if not isinstance(e, dict) or set(e) - {'from', 'to', 'dashed'} or not {'from', 'to'} <= set(e) or e.get('dashed', True) is not True:
            err(f'{w}: đường nối là {{from, to, dashed?: true}} (đang có {e})')
            continue
        if e['from'] not in ids or e['to'] not in ids or e['from'] == e['to']:
            err(f'{w}: đường {e["from"]} > {e["to"]} trỏ nút không có (hay nối vào chính nó)')
    g = d.get('group')
    if g is not None:
        if not isinstance(g, dict) or set(g) != {'label', 'nodes'} or not isinstance(g['nodes'], list) or not g['nodes'] or set(g['nodes']) - set(ids):
            err(f'{w}: group là {{label, nodes[]}}, nodes trỏ nút có thật')
        else:
            need_str(w, g, 'label')
    if ids:
        seen, grew = {ids[0]}, True
        while grew:
            grew = False
            for e in edges:
                if isinstance(e, dict) and (e.get('from') in seen) != (e.get('to') in seen):
                    seen |= {e.get('from'), e.get('to')}
                    grew = True
        lone = [i for i in ids if i not in seen]
        if lone:
            err(f'{w}: nút không nối với sơ đồ: {", ".join(lone)}')


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


def js_files(js_dir):
    """Mọi file .js dưới js_dir, đường dẫn tương đối kiểu posix ("main.js", "core/model.js"), theo thứ tự."""
    out = []
    for d, _, names in os.walk(js_dir):
        out += [os.path.relpath(os.path.join(d, n), js_dir).replace(os.sep, '/') for n in names if n.endswith('.js')]
    return sorted(out)


# js/core/ thuần (dữ liệu vào, dữ liệu ra): không chạm trình duyệt. Đọc trên `js_mask` nên chữ trong chuỗi, chú thích không tính.
# Tên toàn cục: bắt khi đứng trần (không sau `.`, không là khoá `tên:`), nên bí danh (`const g = globalThis`) và `?.` cũng bị bắt.
PURE_GLOBALS = ('document', 'window', 'globalThis', 'self', 'top', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator',
                'location', 'fetch', 'XMLHttpRequest', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame',
                'getComputedStyle', 'Function', 'eval')
# Thuộc tính DOM: bắt sau `.` / `?.` hay trong `x['…']`.
PURE_PROPS = ('classList', 'style', 'dataset', 'querySelector', 'querySelectorAll', 'addEventListener', 'removeEventListener',
              'createElement', 'createElementNS', 'createTextNode', 'getBoundingClientRect')
PURE_GLOBAL_RE = re.compile(r'(?<![\w$.])(?:' + '|'.join(PURE_GLOBALS) + r')(?![\w$])(?!\s*:)')
PURE_PROP_RE = re.compile(r'\.\s*(?:' + '|'.join(PURE_PROPS) + r')(?![\w$])|\[\s*"#(\d+)"\s*\]')
# Trên `js_mask`: chuỗi cố định là "#k". `from "#k"` chỉ có ở import / export … from; `import(` không theo sau bởi "#k" là động.
SPEC_RE = re.compile(r'(?<![\w$.])(?:from|import)\s*"#(\d+)"|(?<![\w$.])import\s*\(\s*(?:"#(\d+)"\s*[,)])?')


def check_code():
    js_dir = os.path.join(HERE, 'js')
    files = js_files(js_dir)
    imported = set()
    for name in files:
        src = open(os.path.join(js_dir, name), encoding='utf-8').read()
        for bad in ('innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write'):
            if bad in src:
                err(f'js/{name}: có `{bad}` — dựng DOM bằng createElement / textContent')
        code, strs = js_mask(src)
        for m in SPEC_RE.finditer(code):
            k = m.group(1) or m.group(2)
            if k is None:
                err(f'js/{name}: `import(…)` với chữ tính lúc chạy — chỉ import chuỗi cố định (lint mới kiểm được file)')
                continue
            spec = strs[int(k)]
            target = os.path.normpath(os.path.join(os.path.dirname(name), spec)).replace(os.sep, '/')
            imported.add(target)
            if target not in files:
                err(f'js/{name}: import {spec} không có file')
            elif name.startswith('core/') and not target.startswith('core/'):
                err(f'js/{name}: module thuần import js/{target} — js/core/ chỉ import js/core/')
        if name.startswith('core/'):
            hits = {m.group(0) for m in PURE_GLOBAL_RE.finditer(code)}
            for m in PURE_PROP_RE.finditer(code):
                if m.group(1) is None:
                    hits.add('.' + m.group(0).lstrip('.').strip())
                elif strs[int(m.group(1))] in PURE_PROPS + PURE_GLOBALS:
                    hits.add(f"['{strs[int(m.group(1))]}']")
            for h in sorted(hits):
                err(f'js/{name}: module thuần dùng `{h}` — việc chạm trình duyệt thuộc js/ui/')
    for name in files:
        if name != 'main.js' and name not in imported:
            err(f'js/{name}: không ai import (file mồ côi)')
    css_files = sorted(f for f in os.listdir(os.path.join(HERE, 'css')) if f.endswith('.css'))
    links = re.findall(r'<link rel="stylesheet" href="css/([^"]+)">', open(os.path.join(HERE, 'index.html'), encoding='utf-8').read())
    for f in sorted(set(css_files) | set(links)):
        if links.count(f) != 1 or f not in css_files:
            err(f'css/{f}: phải có file và được link đúng một lần trong index.html (đang {links.count(f)} lần)')
    if links[:1] != ['tokens.css']:
        err('index.html: css/tokens.css phải là stylesheet đầu tiên (token trước mọi component)')
    for f in css_files:
        if f == 'tokens.css':
            continue
        code = re.sub(r'/\*.*?\*/', lambda m: '\n' * m.group(0).count('\n'), open(os.path.join(HERE, 'css', f), encoding='utf-8').read(), flags=re.S)
        code = re.sub(r'"[^"\n]*"|\'[^\'\n]*\'', '""', code)  # tên font, content: chữ trong chuỗi không tính
        for n, line in enumerate(code.split('\n'), 1):
            m = CSS_COLOR.search(line)
            if m:
                err(f'css/{f}:{n}: mã màu ngoài css/tokens.css (`{m.group(0)}`)')
        for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', code):
            if all(re.fullmatch(r'outline\s*:\s*none', d.strip()) for d in body.split(';') if d.strip()):
                continue
            for one in top_commas(sel):
                if ':focus-visible' in one and not one.startswith(QUIET_GUARD):
                    err(f'css/{f}: `{one}` vẽ vòng focus mà không mở bằng {QUIET_GUARD} (vòng chỉ cho bàn phím)')


# Gác của mọi luật vẽ vòng focus: lớp quiet-focus trên <html> (chuột, chạm) ẩn vòng; :where giữ nguyên độ ưu tiên.
QUIET_GUARD = ':where(:root:not(.quiet-focus))'


def top_commas(sel):
    """Tách danh sách selector ở dấu phẩy ngoài ngoặc (`:is(a, b)` là một selector)."""
    out, depth, cur = [], 0, ''
    for ch in sel:
        depth += (ch in '([') - (ch in ')]')
        if ch == ',' and depth == 0:
            out.append(cur.strip())
            cur = ''
        else:
            cur += ch
    return [x for x in out + [cur.strip()] if x]


# Màu chỉ khai ở css/tokens.css: mã hex, hàm màu (rgb, hsl, hwb, lab, lch, oklab, oklch, color, color-mix) và tên màu của CSS.
# `transparent`, `currentColor` không phải màu của bảng màu nên được dùng. Tên màu chỉ tính khi đứng riêng (không là một phần
# của tên lớp, token hay thuộc tính: `.green`, `var(--green)`, `white-space`).
CSS_NAMED = ('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood '
             'cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray '
             'darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen '
             'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue '
             'firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew '
             'hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan '
             'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray '
             'lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue '
             'mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred '
             'midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid '
             'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple '
             'rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue '
             'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white '
             'whitesmoke yellow yellowgreen').split()
CSS_COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\('
                       r'|(?<![\w.#-])(?:' + '|'.join(CSS_NAMED) + r')(?![\w-])', re.I)


# ── Ngôn ngữ (PLAN-028): chữ giao diện tiếng Anh, nội dung mẫu và lời giải thích tiếng Việt ──

VI_RE = re.compile('[À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]')  # chữ cái riêng của tiếng Việt
TPL_TEXT = ('name', 'description', 'output', 'title', 'goal', 'doneWhen', 'notes')  # + outs[].name, outs[].note
# system-design.json: mọi chuỗi là lời giải thích tiếng Việt (trường mới cũng vậy), trừ ba loại dưới (đường dẫn: khoá nối
# bằng `.`, phần tử danh sách thêm `[]`, khoá dưới `if`, `unless`, `when`, `fit`, `implies`, `suggest`, `tools`, `paths[].stages` là `*`).
# Nhãn, tên giao diện: tiếng Anh (`english`).
DESIGN_EN = {'stages[].title', 'stages[].options[].name', 'stages[].options[].kind', 'checks[].title', 'paths[].label',
             'profile[].label', 'profile[].choices[].label', 'architectures[].label', 'architectures[].entries[].name',
             'architectures[].entries[].flow[]', 'architectures[].entries[].diagram.nodes[].label'}
# Tên trang ngoài (link, nguồn): giữ đúng tên trang ấy ghi, nên không đòi tiếng Việt; không có chữ Việt trừ trang của repo hay .vn.
DESIGN_TITLES = {'stages[].options[].links[].title', 'architectures[].sources[].title', 'architectures[].entries[].sources[].title'}
# Id, giá trị liệt kê, URL, lệnh: không xét ngôn ngữ.
DESIGN_CODE = re.compile(r'(^|\.)(id|arch|path|lane|cost|url)$|\.setup\[\]$|^paths\[\]\.ask\[\]$'
                         r'|\.(if|unless|when|fit|implies|suggest|tools)\.\*(\[\])?$|^paths\[\]\.stages\.\*$'
                         r'|\.diagram\.(nodes\[\]\.kind|edges\[\]\.(from|to)|group\.nodes\[\])$')
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
                if isinstance(v, str) and v.strip() and not VI_RE.search(v) and not path_text(v):
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


def js_scan(src):
    """Đọc code JS một lượt, trả [(loại, chữ, dòng mở, dòng đóng, số chuỗi, trọn)]; loại: code, comment, str, regex.
    `str`: chuỗi '…', "…" hay một phần chữ của `…` (các phần của một `…` chung số chuỗi); `trọn`: chuỗi không có ${ }.
    Chú thích, regex literal không phải chuỗi; `//` trong chuỗi không mở chú thích."""
    out, i, n, line, prev, stack = [], 0, len(src), 1, '', []  # stack: độ sâu { } trong từng ${ } đang mở
    lits, lid = [], 0  # lits: (số chuỗi, dòng mở) của từng `…` đang chờ sau ${ }
    while i < n:
        c = src[i]
        if c == '\n':
            out.append(('code', c, line, line, None, False))
            line, i = line + 1, i + 1
        elif c in ' \t\r':
            out.append(('code', c, line, line, None, False))
            i += 1
        elif src.startswith('//', i):
            j = src.find('\n', i)
            j = n if j < 0 else j
            out.append(('comment', src[i:j], line, line, None, False))
            i = j
        elif src.startswith('/*', i):
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            body = src[i:j]
            out.append(('comment', body, line, line + body.count('\n'), None, False))
            line, i = line + body.count('\n'), j
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
            interp = end == '`' and src.startswith('${', j)
            out.append(('str', ''.join(buf), start, line, cur, c != '}' and not interp))
            if interp:
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
            i0, i = i, j + 1
            while i < n and src[i].isalpha():
                i += 1
            out.append(('regex', src[i0:i], line, line, None, False))
            prev = 'a'
        elif re.match(r'[A-Za-z0-9_$]', c):
            word = re.match(r'[A-Za-z0-9_$]+', src[i:]).group(0)
            out.append(('code', word, line, line, None, False))
            i += len(word)
            prev = '(' if word in ('return', 'typeof', 'case', 'of', 'in', 'yield', 'await', 'else', 'do') else 'a'
        else:
            if c == '{' and stack:
                stack[-1] += 1
            elif c == '}' and stack:
                stack[-1] -= 1
            out.append(('code', c, line, line, None, False))
            prev = 'a' if c in ')]' else c
            i += 1
    return out


def js_strings(src, comments=None):
    """[(dòng mở, chữ, dòng đóng, số chuỗi)] của mọi chuỗi trong code JS ('…', "…", phần chữ của `…`), bỏ regex literal.
    Các phần chữ của một `…` chung dòng mở và số chuỗi.
    Chú thích không phải chuỗi; truyền `comments` (list) thì nhận thêm [(dòng, chữ)] của từng chú thích (khối nhiều dòng: dòng cuối)."""
    out = []
    for kind, s, a, b, k, _ in js_scan(src):
        if kind == 'str':
            out.append((a, s, b, k))
        elif kind == 'comment' and comments is not None:
            comments.append((b, s))
    return out


def js_mask(src):
    """(code, strs): code JS bỏ chú thích (giữ xuống dòng), regex literal thành /R/, chuỗi trọn thành "#k" (strs[k] là chữ),
    phần chữ của `…` có ${ } thành "#T" (code trong ${ } giữ nguyên)."""
    parts, strs = [], []
    for kind, s, _, _, _, whole in js_scan(src):
        if kind == 'code':
            parts.append(s)
        elif kind == 'regex':
            parts.append('/R/')
        elif kind == 'comment':
            parts.append(' ' + '\n' * s.count('\n'))
        else:
            parts.append(('"#%d"' % len(strs) if whole else '"#T"') + '\n' * s.count('\n'))
            if whole:
                strs.append(s)
    return ''.join(parts), strs


def check_ui_language(js_dir=None):
    """(b) Chữ giao diện tiếng Anh: chuỗi trong js/*.js và chữ của index.html (ngoài chú thích) không có chữ Việt.
    Chuỗi tiếng Việt có chủ ý (nội dung việc System design sinh ra, lời giải thích, nhãn nhập của định dạng cũ): chú thích
    `lang: vi — lý do` trên dòng mở hoặc dòng đóng của chuỗi. Một chú thích miễn đúng một chuỗi có chữ Việt: dòng có hai
    chuỗi như thế thì tách dòng; chú thích không còn chuỗi nào để miễn thì xoá."""
    js_dir = js_dir or os.path.join(HERE, 'js')
    for name in js_files(js_dir):
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

    def core_js(code):
        return lambda root: open(os.path.join(root, 'js', 'core', 'io.js'), 'a', encoding='utf-8').write('\n' + code + '\n')

    def new_js(name, code):
        return lambda root: open(os.path.join(root, 'js', name), 'w', encoding='utf-8').write(code + '\n')

    def css(name, code):
        return lambda root: open(os.path.join(root, 'css', name), 'a', encoding='utf-8').write('\n' + code + '\n')

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

    def flow(fn):
        """Sửa bàn giao của mẫu lakehouse-oss (nhiều outs / ins) trong bản sao."""
        def run(root):
            p = os.path.join(root, 'data', 'templates.json')
            d = json.load(open(p, encoding='utf-8'))
            fn(next(t for t in d['templates'] if t.get('id') == 'lakehouse-oss')['steps'])
            json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
        return run

    def preset(tid, fn):
        """Sửa `design` của một mẫu trong bản sao."""
        def run(root):
            p = os.path.join(root, 'data', 'templates.json')
            d = json.load(open(p, encoding='utf-8'))
            fn(next(t for t in d['templates'] if t.get('id') == tid))
            json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
        return run

    cases = [
        ('mẫu: design — câu hồ sơ không có', preset('lakehouse-oss', lambda t: t['design']['profile'].update(cloud='yes')), 'câu hồ sơ "cloud"'),
        ('mẫu: design — lựa chọn không có', preset('lakehouse-oss', lambda t: t['design']['profile'].update(size='huge')), 'không có lựa chọn "huge"'),
        ('mẫu: design — lối không có', preset('lakehouse-oss', lambda t: t['design'].update(path='etl')), 'lối "etl"'),
        ('mẫu: design — khoá lạ', preset('lakehouse-oss', lambda t: t['design'].update(stages={})), 'phải là {profile, path?}'),
        ('mẫu: design — hồ sơ rỗng', preset('lakehouse-oss', lambda t: t['design'].update(profile={})), 'phải là {profile, path?}'),
        ('mẫu: design ở mẫu trống', preset('blank', lambda t: t.update(design={'profile': {'size': 'small'}})), 'mẫu trống không đặt sẵn'),
        ('mẫu: group lạ', preset('crisp-dm', lambda t: t.update(group='general')), '`group` chỉ ghi "specific"'),
        ('mẫu: group không đứng sau id', preset('crisp-dm', lambda t: t.update(group='specific')), 'đứng ngay sau `id`'),
        ('mẫu: mẫu trống có group', preset('blank', lambda t: (r := dict(t), t.clear(), t.update(id=r['id'], group='specific'), t.update(r))), 'mẫu trống là mẫu chung'),
        ('mẫu: đầu vào lơ lửng (key không có đầu ra)', flow(lambda st: st[1]['subs'][0]['ins'].append('khong-co')), 'không là đầu ra nào'),
        ('mẫu: đầu vào lấy từ bước sau', flow(lambda st: st[1]['subs'][0]['ins'].append('gold-marts')), 'chỉ lấy từ bước trước'),
        ('mẫu: đầu vào lấy từ bước con đứng sau, cùng bước', flow(lambda st: st[1]['subs'][1]['ins'].append('bootstrap-script')), 'chỉ lấy từ bước trước'),
        ('mẫu: bước nhận đầu ra của bước con của chính nó (cùng hàng)', flow(lambda st: st[1].update(ins=['compose-file'])), 'chỉ lấy từ bước trước'),
        ('mẫu: bước con có `par` (ô song song)', flow(lambda st: st[1]['subs'][1].update(par=True)), 'khoá lạ'),
        ('mẫu: `final` không phải true', flow(lambda st: st[0]['subs'][0]['outs'][0].update(final=False)), '`final` chỉ ghi true'),
        ('js: chuỗi tiếng Việt không chú thích', js("export const __a = 'Tới chỗ này';"), 'chữ giao diện phải tiếng Anh'),
        ('js: một chú thích, hai chuỗi tiếng Việt', js("export const __b = ['Một', 'Hải']; // lang: vi — thử"), 'miễn đúng một chuỗi'),
        ('js: chú thích thiếu lý do', js("export const __c = 'Một'; // lang: vi"), 'thiếu lý do'),
        ('js: chữ "lang: vi" trong chuỗi không phải chú thích', js("export const __d = 'Một // lang: vi — giả';"), 'chữ giao diện phải tiếng Anh'),
        ('js: chú thích không còn chuỗi để miễn', js("export const __e = 'One'; // lang: vi — thử"), 'không có chuỗi tiếng Việt nào'),
        ('js: chuỗi nhiều dòng, chú thích ở dòng đóng; một `…` nhiều phần', js("export const __f = `một\nhai ở đây`; // lang: vi — thử\n"
                                                                                "export const __g = (x) => `${x} một ${x} hai ở`; // lang: vi — thử"), None),
        ('design: trường mới chưa khai, chữ tiếng Anh', design(lambda d: d['profile'][0].update(tip='Pick the closest one')), 'phải tiếng Việt'),
        ('design: lời giải thích của luật gợi ý tiếng Anh', design(lambda d: d['architectures'][0]['rules'][0].update(why='Use it.')), 'phải tiếng Việt'),
        ('design: sơ đồ — đường nối trỏ nút không có', design(lambda d: d['architectures'][0]['entries'][0]['diagram']['edges'].append({'from': 'raw', 'to': 'khong-co'})), 'trỏ nút không có'),
        ('design: sơ đồ — nút không nối vào sơ đồ', design(lambda d: d['architectures'][0]['entries'][0]['diagram']['nodes'].append({'id': 'le', 'label': 'Alone', 'kind': 'run'})), 'nút không nối với sơ đồ: le'),
        ('design: sơ đồ rỗng', design(lambda d: d['architectures'][0]['entries'][0].update(diagram={'nodes': [], 'edges': []})), 'sơ đồ rỗng'),
        ('design: kiến trúc thiếu sơ đồ', design(lambda d: d['architectures'][0]['entries'][0].pop('diagram')), 'khoá phải là'),
        ('design: tên nút của sơ đồ tiếng Việt', design(lambda d: d['architectures'][0]['entries'][0]['diagram']['nodes'][0].update(label='Thư mục')), 'phải tiếng Anh'),
        ('design: ghi chú nút của sơ đồ tiếng Anh', design(lambda d: d['architectures'][0]['entries'][0]['diagram']['nodes'][0].update(note='raw files')), 'phải tiếng Việt'),
        ('design: sơ đồ — kind lạ', design(lambda d: d['architectures'][0]['entries'][0]['diagram']['nodes'][0].update(kind='db')), 'kind là một trong'),
        ('design: tên trang ngoài bị dịch', design(lambda d: d['stages'][0]['options'][0]['links'][0].update(title='Trang chủ')), 'không dịch'),
        ('design: nhãn giao diện tiếng Việt', design(lambda d: d['stages'][0].update(title='Nguồn dữ liệu')), 'phải tiếng Anh'),
        ('mẫu: tên bước con tiếng Anh', tpl, 'nội dung mẫu phải tiếng Việt'),
        ('js/core: chạm DOM', core_js("export const __h = () => document.body;"), 'module thuần dùng `document`'),
        ('js/core: đọc localStorage', core_js("export const __i = () => localStorage['k'];"), 'module thuần dùng `localStorage`'),
        ('js/core: đổi lớp CSS', core_js("export const __j = (el) => el.classList.add('x');"), 'module thuần dùng `.classList`'),
        ('js/core: bí danh globalThis', core_js("const g = globalThis;\nexport const __o = () => g.document;"), 'module thuần dùng `globalThis`'),
        ('js/core: globalThis?.document', core_js("export const __p = () => globalThis?.document;"), 'module thuần dùng `globalThis`'),
        ('js/core: document?.body', core_js("export const __q = () => document?.body;"), 'module thuần dùng `document`'),
        ('js/core: self', core_js("export const __r = () => self.x;"), 'module thuần dùng `self`'),
        ('js/core: top', core_js("export const __ra = () => top.x;"), 'module thuần dùng `top`'),
        ('js/core: location', core_js("export const __rb = () => location.href;"), 'module thuần dùng `location`'),
        ('js/core: fetch(', core_js("export const __s = (u) => fetch(u);"), 'module thuần dùng `fetch`'),
        ('js/core: requestAnimationFrame', core_js("export const __t = (f) => requestAnimationFrame(f);"), 'module thuần dùng `requestAnimationFrame`'),
        ('js/core: matchMedia', core_js("export const __u = () => matchMedia('(min-width: 1px)');"), 'module thuần dùng `matchMedia`'),
        ("js/core: el['classList']", core_js("export const __v = (el) => el['classList'];"), "module thuần dùng `['classList']`"),
        ('js/core: el?.classList', core_js("export const __w = (el) => el?.classList;"), 'module thuần dùng `.classList`'),
        ('js/core: .style.', core_js("export const __x = (el) => { el.style.color = 'red'; };"), 'module thuần dùng `.style`'),
        ('js/core: new Function', core_js("export const __y = new Function('return 1');"), 'module thuần dùng `Function`'),
        ('js/core: chuỗi có // không che code sau nó', core_js("export const __z = 'http://a' + document.title;"), 'module thuần dùng `document`'),
        ('js/core: chuỗi có /* không che code sau nó', core_js("export const __za = '/*' + document.title + '*/';"), 'module thuần dùng `document`'),
        ('js/core: import js/ui/', core_js("import { KEY } from '../ui/store.js';\nexport const __k = KEY;"), 'chỉ import js/core/'),
        ('js/core: from"…" không khoảng trắng', core_js("import { KEY } from'../ui/store.js';\nexport const __k = KEY;"), 'chỉ import js/core/'),
        ('js/core: export {…} from js/ui/', core_js("export { KEY as __kb } from '../ui/store.js';"), 'chỉ import js/core/'),
        ('js/core: export * from js/ui/', core_js("export * from '../ui/store.js';"), 'chỉ import js/core/'),
        ('js/core: import() động trỏ js/ui/', core_js("export const __kc = () => import('../ui/store.js');"), 'chỉ import js/core/'),
        ('js: import() với chữ ghép', core_js("export const __kd = () => import('../ui/' + 'store.js');"), 'chữ tính lúc chạy'),
        ('js: import() với `…${}`', core_js("export const __ke = (x) => import(`./${x}.js`);"), 'chữ tính lúc chạy'),
        ('js/core: chữ "document", "window." trong chuỗi, chú thích không tính', core_js("export const __l = 'a document'; // window.x\n/* document.body */"), None),
        ('js/core: khoá top:, thuộc tính .self, Date.now, Math.random vẫn được', core_js("export const __lb = (r) => ({ top: r.self, at: Date.now(), k: Math.random() });"), None),
        ('js: import file không có', core_js("import { x } from './khong-co.js';\nexport const __m = x;"), 'không có file'),
        ('js: export … from file không có', core_js("export { x } from './khong-co.js';"), 'không có file'),
        ('js: file chỉ được export … from thì không mồ côi', lambda root: (
            open(os.path.join(root, 'js', 'core', 'zz-leaf.js'), 'w', encoding='utf-8').write('export const __zl = 1;\n'),
            open(os.path.join(root, 'js', 'core', 'io.js'), 'a', encoding='utf-8').write("\nexport { __zl } from './zz-leaf.js';\n")), None),
        ('js: file không ai import', new_js('ui/mo-coi.js', 'export const __n = 1;'), 'file mồ côi'),
        ('css: mã màu trong file component', css('board.css', '.x { color: #fff; }'), 'mã màu ngoài css/tokens.css'),
        ('css: mã màu trong chú thích không tính', css('board.css', '/* #fff */'), None),
        ('css: tên màu trong file component', css('board.css', '.x { border: 1px solid white; }'), 'mã màu ngoài css/tokens.css'),
        ('css: tên màu viết hoa', css('board.css', '.x { color: Red; }'), 'mã màu ngoài css/tokens.css'),
        ('css: color-mix trong file component', css('board.css', '.x { background: color-mix(in srgb, var(--bg) 10%, transparent); }'), 'mã màu ngoài css/tokens.css'),
        ('css: oklch trong file component', css('board.css', '.x { color: oklch(70% .1 120); }'), 'mã màu ngoài css/tokens.css'),
        ('css: lab, hwb trong file component', css('board.css', '.x { color: lab(50% 10 10); outline-color: hwb(10 10% 10%); }'), 'mã màu ngoài css/tokens.css'),
        ('css: token tên màu, thuộc tính, lớp, chuỗi, transparent không tính',
         css('board.css', '.green .white-x { color: var(--green); white-space: nowrap; background: transparent; border-color: currentColor; content: "red"; }'), None),
        ('css: file không được link', css('extra.css', '.x { color: var(--ink); }'), 'được link đúng một lần'),
        ('css: vòng focus không gác quiet-focus', css('board.css', '.x:focus-visible .y { stroke: var(--ring); }'), 'không mở bằng'),
        ('css: gác một selector, quên selector kia', css('board.css', ':where(:root:not(.quiet-focus)) .x:focus-visible, .z:is(.a, :focus-visible) { opacity: 1; }'), 'không mở bằng'),
        ('css: :focus-visible chỉ tắt outline, có gác: không tính',
         css('board.css', '.x:focus, .x:focus-visible { outline: none; }\n@media (hover: hover) { :where(:root:not(.quiet-focus)) .x:is(.a, :focus-visible) { opacity: 1; } }'), None),
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
    check_templates(data)
    design = json.load(open(DESIGN, encoding='utf-8'))
    check_design(design)
    check_tpl_design(data, design)
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
