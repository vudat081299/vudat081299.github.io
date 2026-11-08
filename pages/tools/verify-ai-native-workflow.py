#!/usr/bin/env python3
"""Cổng kiến thức cho pages/ai-native-workflow.html (Working with AI).

Vì sao cần, khác lint-pages.py: trang dạy tên file và khoá cấu hình thật của Claude Code và Codex,
dẫn vài chục con số từ bài công bố của Anthropic, OpenAI, Stripe, METR, và dựng ba khối lặp (bậc,
tình huống, thuật ngữ) từ một khối JSON nhúng. lint-pages.py không biết `.claude-plugin/plugin.json`
có đúng chỗ không, con số ở đầu trang có khớp con số ở thẻ nguồn không, hay một thuật ngữ trong bài có
mục trong bảng thuật ngữ không.

Bảy phần:

  A. KHỐI DỮ LIỆU — JSON nhúng đọc được; bậc đánh số liền 1…n, đúng một bậc bản lề; tình huống và
     thuật ngữ đủ trường, khoá duy nhất, loại thuật ngữ hợp lệ; trường không kết thúc bằng _html thì
     không chứa thẻ HTML (REPO-001).
  B. THUẬT NGỮ TRONG BÀI — mọi nút .tm trỏ tới một thuật ngữ có thật; id sinh ra (g-…, th-…) không trùng
     id tĩnh.
  C. SỐ ĐẾM — số dự phòng trong [data-count] bằng độ dài dữ liệu; các danh sách mà lời văn đếm bằng chữ
     (sáu việc, năm câu hỏi, tám chặng, bốn lớp, sáu nguyên tắc, năm chỉ số DORA) có đúng chừng ấy mục;
     nhãn tiếp cận của bậc thang kể đủ tên bậc theo thứ tự.
  D. CON SỐ TỪ NGUỒN — mỗi con số phải có mặt trong đúng mục; số ở đầu trang và ở mục trả lời ngắn phải
     trùng số ở thẻ nguồn; phần trăm suy ra được (9,8 → 21,2 là +116%) tính lại.
  E. CƠ CHẾ SẢN PHẨM — đường dẫn và khoá cấu hình đúng tên phải có mặt, những tên sai hay gặp phải vắng;
     ba mẫu JSON (hooks.json, .mcp.json, plugin.json) phải là JSON hợp lệ; tên biến
     CLAUDE_PLUGIN_OPTION_<KHOÁ> tính từ khoá userConfig trong mẫu; mẫu .mcp.json không có giá trị bí mật.
  F. VỆ SINH REPO PUBLIC — không tên nơi làm việc cũ, không chuỗi trông như token thật.
  G. DÒNG MÃ THEN CHỐT — theme đọc hub-theme trước first paint; popup đóng bằng Esc và chạm ngoài, mở bằng
     rê chuột và focus-visible, không khoá cuộn, không aria-modal; innerHTML chỉ nhận trường _html.
     Nguồn: mọi thẻ công ty có tên bài trong mục Nguồn; thẻ [chưa kiểm] thì mục Nguồn cũng ghi [chưa kiểm].

Không kiểm câu chữ, không kiểm nội dung tài liệu gốc còn đúng sau ngày đối chiếu (11/2026).

Chạy:  python3 pages/tools/verify-ai-native-workflow.py
Exit code: 1 nếu có phép kiểm đỏ.
"""
import html
import json
import pathlib
import re
import sys

PAGE = pathlib.Path(__file__).resolve().parent.parent / 'ai-native-workflow.html'
RAW = PAGE.read_text(encoding='utf-8')

fails = []
checks = 0


def ok(cond, msg):
    global checks
    checks += 1
    if not cond:
        fails.append(msg)


def text_of(fragment):
    """Chữ đã bóc thẻ, bỏ script/style, gộp khoảng trắng."""
    s = re.sub(r'<script\b.*?</script>|<style\b.*?</style>', ' ', fragment, flags=re.S)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def section(sid):
    m = re.search(r'<section\b[^>]*\bid="%s"[^>]*>(.*?)</section>' % re.escape(sid), RAW, re.S)
    ok(m is not None, f'không tìm thấy <section id="{sid}">')
    return m.group(1) if m else ''


BODY = re.sub(r'<script\b.*?</script>', ' ', RAW, flags=re.S)
SCRIPTS = '\n'.join(re.findall(r'<script>(.*?)</script>', RAW, re.S))

# ── A. KHỐI DỮ LIỆU ──────────────────────────────────────────────────────────
m = re.search(r'<script type="application/json" id="aw-data">(.*?)</script>', RAW, re.S)
ok(m is not None, 'A: thiếu khối <script type="application/json" id="aw-data">')
D = json.loads(m.group(1)) if m else {'levels': [], 'situations': [], 'gloss': []}

L = D['levels']
ok([x['n'] for x in L] == list(range(1, len(L) + 1)), 'A: bậc phải đánh số liền 1…n')
ok(sum(1 for x in L if x.get('pivot')) == 1, 'A: phải có đúng một bậc bản lề (pivot)')
for x in L:
    for f in ('name', 'short', 'human', 'ai', 'next', 'tools'):
        ok(bool(str(x.get(f, '')).strip()), f'A: bậc {x.get("n")} thiếu trường {f}')

S = D['situations']
ok(len({x['id'] for x in S}) == len(S), 'A: id tình huống trùng')
for x in S:
    for f in ('title', 'trigger', 'run_html', 'gate', 'human'):
        ok(bool(str(x.get(f, '')).strip()), f'A: tình huống {x.get("id")} thiếu trường {f}')
    ok(isinstance(x.get('steps_html'), list) and len(x['steps_html']) >= 3,
       f'A: tình huống {x.get("id")} cần ít nhất 3 bước')

G = D['gloss']
KINDS = {'co-che', 'quy-uoc', 'khai-niem'}
ok(len({g['k'] for g in G}) == len(G), 'A: khoá thuật ngữ trùng')
for g in G:
    ok(g.get('kind') in KINDS, f'A: thuật ngữ {g.get("k")} có loại lạ: {g.get("kind")}')
    for f in ('t', 'd'):
        ok(bool(str(g.get(f, '')).strip()), f'A: thuật ngữ {g.get("k")} thiếu trường {f}')


def walk(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f'{path}.{k}' if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f'{path}[{i}]')
    else:
        yield path, obj


# Chỗ giữ kiểu <tên>, <repo> trong đường dẫn là chữ thường, không phải thẻ: chỉ bắt tên thẻ HTML thật.
TAG = re.compile(r'</?(?:a|b|i|em|strong|code|span|div|p|br|img|script|style|ul|ol|li|kbd|sup|sub)\b[^>]*>', re.I)
for p, v in walk(D):
    if isinstance(v, str) and not re.search(r'_html(\[\d+\])?$', p):
        ok(not TAG.search(v), f'A: trường {p} không kết thúc bằng _html mà có thẻ HTML')

# ── B. THUẬT NGỮ TRONG BÀI ───────────────────────────────────────────────────
keys = {g['k'] for g in G}
used = re.findall(r'<button type="button" class="tm" data-t="([^"]+)">([^<]*)</button>', BODY)
ok(len(used) >= 20, f'B: chỉ có {len(used)} thuật ngữ gạch chấm trong bài')
ok(len(re.findall(r'class="tm"', BODY)) == len(used), 'B: có nút .tm sai khuôn (thiếu data-t hoặc lồng thẻ)')
for k, label in used:
    ok(k in keys, f'B: nút thuật ngữ data-t="{k}" không có trong bảng thuật ngữ')
    ok(bool(label.strip()), f'B: nút thuật ngữ data-t="{k}" không có chữ')
static_ids = set(re.findall(r'\bid="([^"]+)"', BODY))
for gen in [f'g-{k}' for k in keys] + [f'th-{x["id"]}' for x in S]:
    ok(gen not in static_ids, f'B: id sinh ra {gen} trùng id tĩnh')

# ── C. SỐ ĐẾM ────────────────────────────────────────────────────────────────
COUNTS = {'levels': len(L), 'situations': len(S), 'gloss': len(G)}
for name, val in re.findall(r'data-count="([a-z]+)">(\d+)<', BODY):
    ok(name in COUNTS, f'C: data-count="{name}" không có trong dữ liệu')
    ok(COUNTS.get(name) == int(val), f'C: số dự phòng data-count="{name}" là {val}, dữ liệu có {COUNTS.get(name)}')


def count_li(fragment_re):
    mm = re.search(fragment_re, BODY, re.S)
    return len(re.findall(r'<li\b', mm.group(1))) if mm else -1


ok(count_li(r'<ol class="aw-six">(.*?)</ol>') == 6, 'C: “Sáu việc người giữ” không có đúng 6 mục')
ok(count_li(r'<ol class="aw-ol" id="aw-five">(.*?)</ol>') == 5, 'C: “Năm câu hỏi” không có đúng 5 mục')
ok(count_li(r'<ol class="aw-cycle" id="aw-cycle">(.*?)</ol>') == 8, 'C: vòng đời “tám chặng” không có đúng 8 chặng')
ok(count_li(r'<ol class="aw-layers">(.*?)</ol>') == 4, 'C: “bốn lớp” mở rộng không có đúng 4 lớp')
ok('Tám chặng' in text_of(section('vong-doi')), 'C: lời dẫn vòng đời phải nói “Tám chặng”')
ok('Tách bốn lớp' in text_of(section('mo-rong')), 'C: lời dẫn mở rộng phải nói “bốn lớp”')
mm = re.search(r'Sáu nguyên tắc giữ bộ dễ mở rộng</h3>\s*<ol class="aw-ol">(.*?)</ol>', BODY, re.S)
ok(mm is not None and len(re.findall(r'<li\b', mm.group(1))) == 6, 'C: “Sáu nguyên tắc” không có đúng 6 mục')
ok(any('năm câu hỏi' in x['next'] for x in L), 'C: bậc trước bậc chạy nền phải trỏ tới năm câu hỏi')
human_st = len(re.findall(r'class="aw-st is-human"', BODY))
ok(human_st == len(re.findall(r'class="aw-st__h"', BODY)), 'C: chặng có chấm xanh phải có dòng “Người …”')
lo = text_of(section('lo-trinh'))
dora = ['thời gian từ commit tới production', 'tần suất deploy', 'thời gian khôi phục sau một lần deploy hỏng',
        'tỉ lệ thay đổi phải can thiệp ngay sau deploy', 'tỉ lệ deploy ngoài kế hoạch vì sự cố']
ok('Năm chỉ số' in lo and all(d in lo for d in dora), 'C: “Năm chỉ số DORA” phải kể đủ 5 chỉ số')
mm = re.search(r'id="aw-stairs"[^>]*aria-label="([^"]+)"', BODY)
label = html.unescape(mm.group(1)).lower() if mm else ''
pos = [label.find(x['name'].lower()) for x in L]
ok(all(p >= 0 for p in pos) and pos == sorted(pos), 'C: nhãn tiếp cận của bậc thang phải kể đủ tên bậc theo thứ tự')

# ── D. CON SỐ TỪ NGUỒN ───────────────────────────────────────────────────────
HERO = text_of(re.search(r'<main class="aw-main">\s*<header>(.*?)</header>', RAW, re.S).group(1))
TRA = text_of(section('tra-loi'))
CO = text_of(section('cong-ty'))
RR = text_of(section('rui-ro'))
FACTS = {
    # Anthropic, How AI is transforming work at Anthropic (02/12/2025)
    'a_work': ['132 kỹ sư', '53 cuộc phỏng vấn', '59% công việc', '28%', '+50%', '+20%', '67%', '0–20%'],
    'a_cc': ['từ 9,8 lên 21,2', 'từ 6,2 xuống 4,1'],
    # Anthropic, Redesigning source control (13/10/2026)
    'a_scm': ['khoảng 2.500 (05/2026)', 'hơn 30.000 (09/2026)', 'nhóm 7 người', 'trong 5 tháng'],
    # Anthropic, How Anthropic teams use Claude Code (24/07/2025)
    'a_teams': ['10–15 phút', 'nhanh gấp 3'],
    # Anthropic, multi-agent research (13/06/2025)
    'a_multi': ['90,2%', 'khoảng 15 lần token'],
    # OpenAI
    'o_oss': ['457 PR', '316'],
    'o_maint': ['5 kỹ sư', 'hơn 1.400 PR', 'hơn 800.000 dòng', 'hai tuần'],
    'o_long': ['khoảng 25 giờ', 'khoảng 13 triệu token', 'khoảng 30.000 dòng'],
    # Stripe Minions (09/02/2026), METR (10/07/2025)
    'stripe': ['Hơn 1.000 PR'],
    'metr': ['16 dev', '246 issue', 'thêm 19%', 'nhanh hơn 24%', 'nhanh hơn 20%'],
}
for src, items in FACTS.items():
    for s in items:
        ok(s in CO, f'D: mục Các công ty thiếu “{s}” ({src})')
for s in ['0–20%', '59%', '1.000+', '19%', '20%']:
    ok(s in HERO, f'D: đầu trang thiếu “{s}”')
for s in ['khoảng 2.500 (05/2026)', 'hơn 30.000 (09/2026)', '16 dev', '246 issue', 'chậm hơn 19%', 'nhanh hơn 20%']:
    ok(s in TRA, f'D: mục Câu trả lời ngắn thiếu “{s}” (phải trùng thẻ nguồn)')
for s in ['khoảng 4 lần', 'khoảng 15 lần']:
    ok(s in RR, f'D: mục Rủi ro thiếu “{s}”')
ok(round((21.2 - 9.8) / 9.8 * 100) == 116 and '(116%)' in CO, 'D: 9,8 → 21,2 phải ghi (116%)')
ok(round((457 - 316) / 316 * 100) == 45, 'D: số PR 316 → 457 không còn khớp phép tính')

# ── E. CƠ CHẾ SẢN PHẨM ───────────────────────────────────────────────────────
TXT = text_of(RAW)
MUST = ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', 'hooks/hooks.json', '.claude/skills/',
        '.claude/agents/', '.claude/rules/', 'CLAUDE.local.md', 'settings.local.json', '.agents/skills/',
        '.codex/agents/', '.codex/config.toml', '.codex/hooks.json', 'AGENTS.override.md', '32 KiB',
        'disable-model-invocation: true', '"sensitive": true', '${CLAUDE_PLUGIN_ROOT}', '$ARGUMENTS',
        '--max-budget-usd', '--max-turns', 'claude plugin eval', 'anthropics/claude-code-action',
        '@AGENTS.md', 'extraKnownMarketplaces', 'enabledPlugins', 'Read(./.env)', 'PostToolUse', 'Stop hook',
        'read-only, workspace-write, danger-full-access', 'approval_policy', '/mcp/readonly', 'OAuth 2.1',
        '~/.claude/projects/']
for s in MUST:
    ok(s in TXT, f'E: thiếu tên cơ chế đúng “{s}”')
WRONG = ['.claude/plugin.json', '.claude/hooks.json', '.claude/mcp.json', 'skill.md', '.codex/skills',
         'AGENTS.local.md', 'plugin.yaml', 'mcp.yaml']
for s in WRONG:
    ok(s not in TXT, f'E: có tên sai “{s}”')

examples = {}
for title, body in re.findall(r'<summary>([^<]+?) <span>[^<]*</span></summary>\s*<pre class="aw-code">(.*?)</pre>', RAW, re.S):
    examples[title.strip()] = html.unescape(body)
for name in ('hooks/hooks.json', '.mcp.json', '.claude-plugin/plugin.json'):
    ok(name in examples, f'E: thiếu mẫu {name}')
    if name in examples:
        try:
            examples[name] = json.loads(examples[name])
        except ValueError as e:
            ok(False, f'E: mẫu {name} không phải JSON hợp lệ: {e}')
pj = examples.get('.claude-plugin/plugin.json')
if isinstance(pj, dict):
    uc = pj.get('userConfig', {})
    ok(len(uc) == 1, 'E: mẫu plugin.json phải có đúng một khoá userConfig')
    for k, v in uc.items():
        ok(v.get('sensitive') is True, 'E: token trong userConfig phải sensitive: true')
        env = 'CLAUDE_PLUGIN_OPTION_' + k.upper()
        ok(env in TXT, f'E: biến hook cho userConfig phải là {env}')
mj = examples.get('.mcp.json')
if isinstance(mj, dict):
    for name, srv in mj.get('mcpServers', {}).items():
        auth = srv.get('headers', {}).get('Authorization')
        if auth is not None:
            ok(re.fullmatch(r'Bearer \$\{[A-Z_]+\}', auth) is not None,
               f'E: .mcp.json máy chủ {name}: Authorization phải là Bearer ${{BIẾN}}, không phải giá trị')
        ok(srv.get('type') in ('http', 'stdio', 'sse', 'ws'), f'E: .mcp.json máy chủ {name}: type lạ')
hj = examples.get('hooks/hooks.json')
if isinstance(hj, dict):
    ev = set(hj.get('hooks', {}))
    ok(ev <= {'PostToolUse', 'PreToolUse', 'Stop', 'SessionStart', 'UserPromptSubmit'}, f'E: hooks.json có sự kiện lạ: {ev}')
    stop = json.dumps(hj['hooks'].get('Stop', ''))
    ok('exit 2' in stop, 'E: Stop hook trong mẫu phải thoát bằng mã 2 để chặn việc dừng')
skill = RAW[RAW.find('skills/fix-bug/SKILL.md <span>'):]
ok(re.search(r'---\nname: fix-bug\ndescription: [^\n]+\ndisable-model-invocation: true\n---', skill) is not None,
   'E: mẫu SKILL.md phải mở bằng frontmatter name, description, disable-model-invocation')
agent = RAW[RAW.find('agents/reviewer.md <span>'):]
ok(re.search(r'---\nname: reviewer\ndescription: [^\n]+\ntools: Read, Grep, Glob\nmodel: inherit\n---', agent) is not None,
   'E: mẫu subagent reviewer phải chỉ có công cụ đọc')

# ── F. VỆ SINH REPO PUBLIC ───────────────────────────────────────────────────
for pat in [r'\bkv-', r'kvfnb', r'kiotviet', r'kitchen']:
    ok(re.search(pat, RAW, re.I) is None, f'F: có chuỗi gợi tên nơi làm việc: /{pat}/')
for pat in [r'sk-[A-Za-z0-9_-]{16,}', r'ghp_[A-Za-z0-9]{20,}', r'xox[abp]-[A-Za-z0-9-]{10,}', r'AKIA[0-9A-Z]{16}',
            r'-----BEGIN [A-Z ]*PRIVATE KEY']:
    ok(re.search(pat, RAW) is None, f'F: có chuỗi trông như token thật: /{pat}/')

# ── G. DÒNG MÃ THEN CHỐT, NGUỒN ──────────────────────────────────────────────
head = RAW[:RAW.find('</head>')]
ok("localStorage.getItem('hub-theme')" in head and "prefers-color-scheme: dark" in head,
   'G: <head> phải đọc hub-theme và prefers-color-scheme trước first paint')
ok("localStorage.setItem('hub-theme'" in SCRIPTS, 'G: nút đổi nền phải lưu vào hub-theme')
ok("e.key === 'Escape' && cur" in SCRIPTS, 'G: popup phải đóng bằng Esc')
ok("document.addEventListener('pointerdown'" in SCRIPTS and "close();" in SCRIPTS, 'G: popup phải đóng khi chạm ra ngoài')
ok("e.pointerType !== 'mouse'" in SCRIPTS, 'G: rê chuột mở popup chỉ với chuột thật, không với chạm')
ok("b.matches(':focus-visible')" in SCRIPTS, 'G: popup phải mở khi Tab tới thuật ngữ')
ok("setAttribute('aria-expanded', 'true')" in SCRIPTS, 'G: nút thuật ngữ phải báo aria-expanded')
ok(re.search(r"overflow\s*[=:]\s*['\"]?hidden", SCRIPTS) is None, 'G: script không được khoá cuộn trang')
ok('aria-modal' not in RAW, 'G: popup thuật ngữ không phải hộp thoại modal')
for rhs in re.findall(r'innerHTML\s*=\s*([^;]+);', SCRIPTS):
    ok(rhs.strip().endswith('_html'), f'G: innerHTML nhận giá trị không phải trường _html: {rhs.strip()}')

NG = section('nguon')
NGT = text_of(NG)
for card in re.findall(r'<article class="aw-cocard[^"]*">(.*?)</article>', RAW, re.S):
    srcline = re.search(r'<p class="aw-cocard__s">(.*?)</p>', card, re.S)
    ok(srcline is not None, 'G: thẻ công ty thiếu dòng nguồn')
    if not srcline:
        continue
    for part in text_of(srcline.group(1)).split(' · '):
        title = part.rsplit(',', 1)[0].strip()
        ok(title in NGT, f'G: nguồn “{title}” của một thẻ không có trong mục Nguồn')
        if 'is-unverified' in card:
            li = re.search(r'<li>[^\n]*?%s[^\n]*</li>' % re.escape(html.escape(title, quote=False)), NG)
            ok(li is not None and '[chưa kiểm]' in li.group(0), f'G: nguồn chưa kiểm “{title}” phải ghi [chưa kiểm] ở mục Nguồn')
for href in re.findall(r'href="(https?://[^"]+)"', RAW):
    ok(href.startswith('https://'), f'G: link không phải https: {href}')

print(f'verify-ai-native-workflow: {checks} phép kiểm, {len(fails)} đỏ.')
for f in fails:
    print('  ✗', f)
sys.exit(1 if fails else 0)
