/* Bài thử của js/core.js (logic thuần), chạy bằng node:  node step-planner/tools/test-core.mjs
 * Mọi mẫu trong data/templates.json phải đi Markdown → về mà không mất gì; JSON cũng vậy. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fromTemplate, toMarkdown, fromMarkdown, parseImport, toJSON, toBackup, shape, progress, nextActionIds, projectNextIds, slotsOf, subPlace, placeSub, takeSub, shiftTarget, liveLabels, redoCount, canReopen,
  nextStatus, setStatus, splitInline, mergeEdit, pick, EDIT_FIELDS, nextWaitingOn, inGroup, needsEvidence, normWorkspace, normSub, normLog, freshCopy, counts, slug, fold, parseDate, uniqueName, normDoc, safeUrl,
} from '../js/core.js';
import * as CORE from '../js/core.js';
import { parseMd, inline, srcTokens } from '../js/md.js';
import { normDesign, rankOptions, snake, planTasks, diagramNodes, decidedCount, catalogErrors, readStageLine, applyPath, effProfile, warnings, flowEdges, bothDecided, planDiff, applyPlan, PLAN_STEP, notNeededBy, archAdvice } from '../js/design-core.js';

let fails = 0;
const check = (name, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`${ok ? '  ok  ' : '  LỖI'} ${name}${detail ? '  — ' + detail : ''}`);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const firstDiff = (a, b) => {
  const x = JSON.stringify(a, null, 1).split('\n'), y = JSON.stringify(b, null, 1).split('\n');
  const i = x.findIndex((l, k) => l !== y[k]);
  return i < 0 ? '' : `dòng ${i}: ${x[i]} ≠ ${y[i]}`;
};
const roundTrip = (ws) => shape(fromMarkdown(toMarkdown(ws)).workspace);

const tplPath = fileURLToPath(new URL('../data/templates.json', import.meta.url));
const { templates } = JSON.parse(readFileSync(tplPath, 'utf8'));

for (const t of templates) {
  const ws = fromTemplate(t);
  check(`mẫu ${t.id}: Markdown đi rồi về giữ nguyên`, eq(shape(ws), roundTrip(ws)), firstDiff(shape(ws), roundTrip(ws)));
  const j = parseImport(toJSON(ws)).workspaces[0];
  check(`mẫu ${t.id}: JSON đi rồi về giữ nguyên, id mới`, eq(shape(ws), shape(j)) && j.id !== ws.id);
  // Mọi `ins` của mẫu nối được tới một đầu ra, và mở mẫu ra không có bàn giao treo (bên nhận đứng trước bên giao).
  const nIns = (t.steps || []).flatMap((s) => [s, ...(s.subs || [])]).reduce((n, x) => n + (x.ins || []).length, 0);
  const ho = CORE.handoffs(ws);
  check(`mẫu ${t.id}: mọi đầu vào nối được, không bàn giao treo`, ho.links.length === nIns && ho.held.length === 0,
    `${ho.links.length}/${nIns} liên kết, ${ho.held.length} treo`);
}

/* Dự án có đủ thứ khó: dấu ·, @, \, chữ "hạn", ghi chú nhiều dòng có dòng trống, dòng trông như mục danh sách / nhãn. */
const hard = normWorkspace({
  name: 'Khó · thử', templateId: 'crisp-dm',
  notes: 'Ghi chú dự án\n\n- không phải việc\n# không phải tiêu đề\n> không phải trích',
  steps: [
    {
      title: 'Bước 1 · có chấm', goal: 'Mục tiêu · a', doneWhen: 'Xong · b', notes: 'dòng 1\n\n  thụt\n\\gạch\nXong khi: không phải\n- [ ] không phải việc\n1. cũng không',
      revisit: { date: '2026-11-20', reason: 'Dữ liệu thiếu · cần lấy lại' },
      subs: [
        { title: 'A · @giả · hạn 2026-01-01 due 2026-02-02', status: 'todo', due: '2026-12-01', doneWhen: 'x', notes: 'Xong khi: ghi chú\n\nb\n  - [ ] con giả' },
        { title: 'B\\ `@x`', status: 'doing' },
        { title: 'C (@x, hạn 01/12/2026) a@b.com', status: 'done', notes: 'Vì sao: ghi chú' },
        { title: 'D', status: 'blocked', due: '2026-02-03' },
        { title: 'E', status: 'skip' },
        { title: 'F huỷ', status: 'cancel', doneWhen: 'y', notes: 'ghi chú sau lý do\n  thụt', reason: 'lý do · có chấm `@x` [a](b)\n\n- gạch\nXong khi: giả\nHuỷ vì: lặp\n  thụt hai\n\\gạch ngược\n    thụt bốn\nTài liệu:', docs: [{ kind: 'link', title: 'L', url: 'https://l.example' }] },
        { title: 'G', status: 'todo', reason: 'bị bỏ vì không huỷ' },
        { title: 'H chờ', status: 'pending', due: '2020-01-01', reason: 'chủ dữ liệu duyệt quyền\nWaiting on: lặp\nBlocked by: lặp', notes: 'Waiting on: ghi chú' },
        { title: 'I chặn', status: 'blocked', reason: 'API lỗi', doneWhen: 'z' },
      ],
    },
    { title: '2. Nhật ký quyết định', subs: [] },
    { title: 'Nhật ký quyết định', subs: [{ title: 'k' }] },
    { id: 'tb', title: 'Ba', revisit: { date: '2026-11-21', reason: '' }, subs: [{ title: '- [x] lồng' }] },
  ],
  log: [
    { date: '2026-11-22', decision: 'Chọn A · không B', why: 'vì\n\n\\x\nVì sao: lặp\n- gạch\nStep: giả\nBước: giả', stepId: 'tb' },
    { date: '2026-11-23', decision: 'Không lý do', why: '', stepId: 'không có' },
    { date: '2026-11-24', decision: 'Step: trong tên', why: '', stepId: 'tb' },
  ],
});
const md = toMarkdown(hard);
const back = fromMarkdown(md);
check('dự án khó: Markdown đi rồi về giữ nguyên', eq(shape(hard), shape(back.workspace)), firstDiff(shape(hard), shape(back.workspace)));
check('dự án khó: không cảnh báo', back.warnings.length === 0, back.warnings.join(' | '));
check('nhật ký gắn bước: dòng "Step:" ngay dưới quyết định, id lạ bị bỏ, đi rồi về gắn lại đúng bước',
  md.includes('\n- 2026-11-22 · Chọn A · không B  \n  Step: 4. Ba  \n  Why: vì') && hard.log[1].stepId === '' && !md.includes('Không lý do  \n  Step')
  && back.workspace.log[0].stepId === back.workspace.steps[3].id && back.workspace.log[2].stepId === back.workspace.steps[3].id
  && back.workspace.log[0].why.endsWith('\nStep: giả\nBước: giả'));
{
  const r = fromMarkdown('# A\n## 1. Một\n## 2. Hai\n## Decision log\n- 2026-11-20 · x\n  Bước: hai\n  Why: y\n- 2026-11-21 · z\n  Step: Không có\n');
  check('nhật ký gắn bước: nhãn "Bước:", không phân biệt hoa thường; bước không có thì cảnh báo, bỏ link',
    r.workspace.log[0].stepId === r.workspace.steps[1].id && r.workspace.log[0].why === 'y' && r.workspace.log[1].stepId === ''
    && r.warnings.length === 1 && /missing step/.test(r.warnings[0]), JSON.stringify(r.workspace.log) + r.warnings.join('|'));
  const c = freshCopy(hard);
  check('nhân bản: quyết định gắn sang id mới của bước', c.log[0].stepId === c.steps[3].id && c.steps[3].id !== 'tb');
}
check('dấu trạng thái', /- \[ \] A/.test(md) && /- \[~\] B/.test(md) && /- \[x\] C/.test(md) && /- \[!\] D/.test(md) && /- \[-\] E/.test(md)
  && /- \[\/\] F huỷ/.test(md) && /- \[>\] H chờ/.test(md));
check('lý do theo trạng thái: Waiting on (chờ), Blocked by (chặn); dòng ghi chú trông như nhãn được thoát',
  md.includes('\n  Waiting on: chủ dữ liệu duyệt quyền  \n    \\Waiting on: lặp  \n    \\Blocked by: lặp  \n  \\Waiting on: ghi chú')
  && md.includes('\n  Done when: z  \n  Blocked by: API lỗi'));
check('huỷ: lý do nhiều dòng ghi dưới "Cancelled because:", dòng sau thụt bốn có thoát', md.includes('\n  Cancelled because: lý do · có chấm `@x` [a](b)  \n    \\  \n    \\- gạch  \n')
  && md.includes('\n    \\Huỷ vì: lặp  \n') && hard.steps[0].subs[6].reason === '' && !/bị bỏ vì/.test(md));
check('không có người làm: không dòng Người:, @ trong tên được thoát', !md.includes('Người:') && md.includes('- [ ] A \\· \\@giả')
  && !md.split('\n').some((l) => /^- \[/.test(l) && /(^|[^\\])@/.test(l)));
check('đầu file: tên công cụ, định dạng 3', md.split('\n')[2] === '> Data Science Step Planner · format 3' && md.includes('\n> Template: crisp-dm\n'));
check('xem đẹp trên GitHub: nhãn cách dòng trống, khối có xuống dòng cứng',
  /\nGoal: [^\n]*\n\nDone when:/.test(md) && /Notes: {2}\n/.test(md));

const bk = parseImport(toBackup([hard, fromTemplate(templates[0])]));
check('sao lưu: hai dự án, id mới', bk.kind === 'backup' && bk.workspaces.length === 2 && bk.workspaces[0].id !== hard.id);
check('sao lưu: giữ nguyên nội dung', eq(shape(bk.workspaces[0]), shape(hard)));

/* Markdown viết tay. */
const hand = fromMarkdown(`Nhóm 7 — đồ án
Ghi chú đầu
- [ ] việc trước bước đầu

## 1) Chuẩn bị
- [x] Tạo repo @An
- [ ] Viết data card (@Bình, hạn 01/12/2026)
- [ ] Clean data · @Chi · due 2026-12-05
- [] tải dữ liệu
+ [ ] plus bullet
1. [ ] numbered
- Họp nhóm thứ 5
  - [ ] nested child
* [X] Star done · \`@Dung Lê\` · hạn 2026-12-1
- [ ] EDA · @An · @Bình
- [ ] Sai hạn · hạn 2026-02-31

### 1.1 Tiêu đề phụ
Đoạn văn

## Bước 2: Phân tích
- [~] doing

## Nhật ký
- 2026-11-20 · Chọn Premier League
  Vì sao: dữ liệu đủ
Dòng thường trong nhật ký
- 24/11/2026 - ngày kiểu Việt
`);
const w = hand.workspace;
const s0 = w.steps[1].subs;
check('viết tay: dòng đầu không # là tên, chữ trước bước đầu là ghi chú dự án', w.name === 'Nhóm 7 — đồ án' && w.notes === 'Ghi chú đầu');
check('viết tay: việc trước bước đầu vào bước "General"', w.steps[0].title === 'General' && w.steps[0].subs[0].title === 'việc trước bước đầu');
check('viết tay: "## 1)" và "## Bước 2:" đọc gọn', w.steps[1].title === 'Chuẩn bị' && w.steps[2].title === 'Phân tích');
check('viết tay: @tên bị bỏ khỏi tên, hạn dd/mm/yyyy trong ngoặc', s0[0].title === 'Tạo repo' && s0[0].status === 'done'
  && s0[1].title === 'Viết data card' && s0[1].due === '2026-12-01' && !('owner' in s0[0]));
check('viết tay: due, [], +, 1., gạch thường, mục lồng', s0[2].due === '2026-12-05' && s0[2].title === 'Clean data'
  && s0[3].title === 'tải dữ liệu' && s0[4].title === 'plus bullet' && s0[5].title === 'numbered'
  && s0[6].title === 'Họp nhóm thứ 5' && s0[6].status === 'todo' && s0[7].title === 'nested child');
check('viết tay: [X], `@tên có dấu cách` bị bỏ, hạn yyyy-mm-d', s0[8].status === 'done' && s0[8].title === 'Star done' && s0[8].due === '2026-12-01');
check('viết tay: nhiều @ đều bị bỏ, không rác trong tên hay ghi chú', s0[9].title === 'EDA' && s0[9].notes === '');
check('viết tay: ngày sai bị từ chối, có cảnh báo', s0[10].due === '' && hand.warnings.some((x) => /2026-02-31/.test(x)));
check('viết tay: dòng lạ vào ghi chú bước', w.steps[1].notes === '### 1.1 Tiêu đề phụ\nĐoạn văn');
check('viết tay: nhật ký có dòng thường và ngày dd/mm/yyyy', w.log.length === 3 && w.log[0].why === 'dữ liệu đủ'
  && w.log[1].decision === 'Dòng thường trong nhật ký' && w.log[2].date === '2026-11-24' && w.log[2].decision === 'ngày kiểu Việt');
check('viết tay: tiêu đề không số không cảnh báo', !hand.warnings.some((x) => /số thứ tự/.test(x)));
const r4 = fromMarkdown('# X\n## 1) foo\n## 2 bar\n## 3.baz\n## Step 4) qux\n').workspace.steps.map((s) => s.title);
check('tiêu đề bước: 1) · 2 · 3. · Step 4)', eq(r4, ['foo', 'bar', 'baz', 'qux']), r4.join(','));
const old1 = fromMarkdown('# A\n\n> Step Planner · định dạng 1\n> Người: @An · @B\n\n## 1. S\n- [ ] x · @An · hạn 2026-01-02\n');
const old2 = fromMarkdown('# A\n\n> Data Science Step Planner · định dạng 1\n>\n> Mẫu: crisp-dm\n>\n> Người: `@Tên A` · `@B \\· C`\n\n## 1. S\n\n'
  + '- [x] y · `@Tên A` · hạn 2026-01-03  \n  Xong khi: z\n');
const o1 = old1.workspace.steps[0].subs[0], o2 = old2.workspace.steps[0].subs[0];
check('file cũ có Người: và @người vẫn nhập được, bỏ thông tin người', o1.title === 'x' && o1.due === '2026-01-02' && !('owner' in o1)
  && !('people' in old1.workspace) && old1.warnings.length === 0
  && o2.title === 'y' && o2.status === 'done' && o2.doneWhen === 'z' && old2.workspace.templateId === 'crisp-dm' && !old2.workspace.notes,
  JSON.stringify([o1, o2]));

/* Tài liệu: link và văn bản Markdown ở bước và bước con, thân khó (rào ```, dòng #, -, nhãn, thụt, dòng trống). */
const nasty = [
  '# Tiêu đề trong thân', '', '- mục giả', '  - lồng', 'Xong khi: không phải nhãn', 'Tài liệu:', '  - [giả](https://x.y)',
  '```python', 'print(1)', '```', '````', 'rào dài', '````', '~~~', '> trích', '\\gạch ngược', '## 2. không phải bước',
  '- [ ] không phải việc', '    thụt bốn', '\ttab', 'cuối dòng có hai cách  ', '', '', 'sau hai dòng trống',
].join('\n');
const withDocs = normWorkspace({
  name: 'Tài liệu',
  steps: [
    {
      title: 'Bước có tài liệu', notes: 'ghi chú\nTài liệu: trong ghi chú',
      docs: [
        { kind: 'link', title: 'Đề [bài] \\ gốc', url: 'https://example.com/a_(b)?q=1&r=[2]' },
        { kind: 'md', title: '[ ] trông như việc', body: nasty },
        { kind: 'md', title: 'Trống', body: '' },
        { kind: 'link', title: 'x', url: 'javascript:alert(1)' },
        { kind: 'md', title: '- [x](https://giả.link)', body: '```' },
      ],
      subs: [
        { title: 'Có tài liệu', notes: 'Tài liệu:\n- [x](https://a.b)', docs: [{ kind: 'md', title: 'Ghi chép', body: nasty }, { kind: 'link', title: 'Repo', url: 'http://git.example/x' }] },
        { title: 'Kế tiếp', status: 'done', docs: [{ kind: 'link', title: 'Chỉ link', url: 'https://k.example' }] },
        { title: 'Không tài liệu' },
      ],
    },
    { title: 'Bước hai', docs: [{ kind: 'link', title: 'L', url: 'https://l.example' }], subs: [{ title: 'y' }] },
  ],
});
const mdd = toMarkdown(withDocs);
const backD = fromMarkdown(mdd);
check('tài liệu: Markdown đi rồi về giữ nguyên (link, văn bản khó, bước và bước con)', eq(shape(withDocs), shape(backD.workspace)),
  firstDiff(shape(withDocs), shape(backD.workspace)));
check('tài liệu: không cảnh báo', backD.warnings.length === 0, backD.warnings.join(' | '));
check('tài liệu: link không phải http(s) bị bỏ khi chuẩn hoá', withDocs.steps[0].docs.length === 4
  && normDoc({ kind: 'link', url: 'ftp://x' }) === null && safeUrl(' https://a.b/<x> ') === 'https://a.b/%3Cx%3E' && safeUrl('https://a b') === '');
check('tài liệu: rào dài hơn chuỗi ` dài nhất trong thân', /\n {4}`{5}markdown\n/.test(mdd) && /\n {6}`{5}markdown\n/.test(mdd));
check('tài liệu: link có ngoặc ghi trong <>', mdd.includes('  - [Đề \\[bài\\] \\\\ gốc](<https://example.com/a_(b)?q=1&r=[2]>)'));
check('tài liệu: JSON đi rồi về, id mới', eq(shape(parseImport(toJSON(withDocs)).workspaces[0]), shape(withDocs))
  && parseImport(toJSON(withDocs)).workspaces[0].steps[0].docs[0].id !== withDocs.steps[0].docs[0].id);
check('tài liệu: đếm', counts([withDocs]).docs === 8);
const jd = parseImport(JSON.stringify({ steps: [{ title: 't', docs: [{ kind: 'link', title: 'bad', url: 'javascript:x' }, 5, { kind: 'md', title: 'ok' }],
  subs: [{ title: 's', docs: [{ url: 'file:///etc' }] }] }] }));
check('tài liệu: JSON có link sai, cảnh báo và bỏ', jd.workspaces[0].steps[0].docs.length === 1 && jd.workspaces[0].steps[0].subs[0].docs.length === 0
  && jd.warnings.some((w) => /3 documents/.test(w)), jd.warnings.join(' | '));
const handD = fromMarkdown(`# Viết tay

## 1. Một

Tài liệu:
- [Đề bài](https://de.bai)
- [Lạ](ftp://x)
- Ghi chú họp
  ~~~
  # họp
  - a
  ~~~

- [ ] việc
  Tài liệu:
  - [Hướng dẫn](https://hd.example)
- [ ] việc hai
`);
const hs = handD.workspace.steps[0];
check('tài liệu viết tay: mục không thụt, rào ~~~, link lạ có cảnh báo, bước con vẫn đọc đúng',
  hs.docs.length === 2 && hs.docs[1].body === '# họp\n- a' && hs.subs.length === 2 && hs.subs[0].docs[0].url === 'https://hd.example'
  && hs.subs[1].title === 'việc hai' && handD.warnings.some((w) => /ftp/.test(w) || /Lạ/.test(w)), JSON.stringify(hs.docs) + handD.warnings.join('|'));
check('file cũ không có tài liệu: nhập được, docs rỗng', fromMarkdown('# A\n## 1. S\n- [ ] x\n').workspace.steps[0].subs[0].docs.length === 0);

/* Bộ dựng Markdown của tài liệu (js/md.js): cây khối, không HTML. */
const tree = parseMd('# T\n\nđoạn **đậm** *nghiêng* `code` [l](https://a.b) [x](javascript:alert(1)) <b>\n\n- a\n  - b\n- [x] c\n\n1. một\n2. hai\n\n> trích\n\n````\n```\nin\n```\n````\n\n| a | b |\n|---|:-:|\n| 1 | 2 |\n\n---');
check('md.js: tiêu đề, đoạn, danh sách lồng, việc, đánh số, trích dẫn, rào lồng, bảng, vạch',
  eq(tree.map((b) => b.t), ['h', 'p', 'list', 'list', 'quote', 'code', 'table', 'hr']) && tree[2].items[0].c[1].t === 'list'
  && tree[2].items[1].task === true && tree[3].ordered && tree[5].v === '```\nin\n```' && tree[6].align[1] === 'center', JSON.stringify(tree.map((b) => b.t)));
const para = tree[1].c;
check('md.js: link chỉ http(s); chữ HTML là chữ', para.some((n) => n.t === 'link' && n.href === 'https://a.b')
  && !para.some((n) => n.t === 'link' && /javascript/.test(n.href)) && para.some((n) => n.t === 'text' && n.v.includes('<b>')));
check('md.js: url trần bỏ dấu câu cuối', eq(inline('xem https://a.b/c).'), [{ t: 'text', v: 'xem ' }, { t: 'link', href: 'https://a.b/c', c: [{ t: 'text', v: 'https://a.b/c' }] }, { t: 'text', v: ').' }]));

/* Token tô màu của khung Edit: theo thứ tự, không chồng nhau, không vượt dòng; đúng loại ở các dấu chính. */
const srcT = '# Tiêu **đậm**\n> trích `c`\n- [x] [l](https://a.b "t")\n```py\nx = "s" # **không**\n```\n| a | b |\nsnake_case *n* ~~g~~ <!-- c -->';
const toks = srcTokens(srcT), at = (/** @type {string} */ frag, k = 0) => {
  const i = srcT.indexOf(frag); const t = toks.find((x) => x.s <= i + k && i + k < x.e); return t ? t.c : null; };
check('md.js srcTokens: theo thứ tự, không chồng, không qua dòng',
  toks.every((t, i) => t.e > t.s && (!i || toks[i - 1].e <= t.s) && !srcT.slice(t.s, t.e).includes('\n')));
check('md.js srcTokens: tiêu đề, trích dẫn, mục việc, link, khối rào, bảng, nghiêng, gạch, chú thích',
  at('# ') === 'sx-punct' && at('Tiêu') === 'sx-head' && at('đậm') === 'sx-strong' && at('> ') === 'sx-quote' && at('trích') === 'sx-qtext'
  && at('`c`') === 'sx-code' && at('[x]') === 'sx-punct' && at('[l]', 1) === 'sx-link' && at('https://a.b') === 'sx-url' && at('"t"') === 'sx-string'
  && at('```py', 3) === 'sx-info' && at('x = ') === 'sx-code' && at('**không**') === 'sx-code' && at('| a', 0) === 'sx-punct'
  && at('snake_case', 5) === null && at('*n*', 1) === 'sx-em' && at('~~g~~', 2) === 'sx-strike' && at('<!--') === 'sx-comment', JSON.stringify(toks));

/* Vòng làm lại: dòng Quay lại có vòng; bước đã bỏ đánh dấu giữ vòng (dòng Vòng:); dòng cũ không vòng đọc là vòng 2. */
const rounds = normWorkspace({ steps: [
  { title: 'A', round: 3, revisit: null, subs: [] },
  { title: 'B', round: 4, revisit: { date: '2026-11-01', reason: 'vòng 5 · lạ', round: 4 }, subs: [] },
  { title: 'C', revisit: { date: '2026-11-02', reason: '' }, subs: [] },
  { title: 'D', notes: 'Vòng: 9\nQuay lại: giả', subs: [] },
] });
const mdr = toMarkdown(rounds);
check('vòng: Markdown đi rồi về (Vòng:, Quay lại có vòng, lý do có chữ "vòng")', eq(shape(rounds), shape(fromMarkdown(mdr).workspace)),
  firstDiff(shape(rounds), shape(fromMarkdown(mdr).workspace)));
check('vòng: khuôn dòng', mdr.includes('\nIteration: 3\n') && mdr.includes('\nReopened: 2026-11-01 · iteration 4 · vòng 5 · lạ\n')
  && mdr.includes('\nReopened: 2026-11-02 · iteration 2\n') && rounds.steps[3].round === 1 && !/\nIteration: 1/.test(mdr));
const oldR = fromMarkdown('# A\n## 1. S\nQuay lại: 2026-11-20 · lý do cũ\n').workspace.steps[0];
check('vòng: dòng cũ "Quay lại: ngày · lý do" đọc là vòng 2', oldR.revisit.round === 2 && oldR.round === 2 && oldR.revisit.reason === 'lý do cũ');

/* File định dạng 2 (nhãn tiếng Việt) do bản cũ xuất: nhập ra đủ cấu trúc. */
{
  const v2 = ['# Cũ', '', '> Data Science Step Planner · định dạng 2', '>', '> Mẫu: crisp-dm', '', 'ghi chú dự án', '',
    '## 1. Bước', '', 'Mục tiêu: mt', '', 'Xong khi: xk', '', 'Quay lại: 2026-11-20 · vòng 3 · lý do', '', 'Ghi chú:  ', '  dòng 1  ', '  \\Tài liệu: giả', '',
    'Tài liệu:', '  - [L](https://l.example)', '',
    '- [/] Việc · hạn 2026-12-01  ', '  Xong khi: x  ', '  Huỷ vì: không cần  ', '    dòng hai  ', '  ghi chú  ', '  Tài liệu:', '    - [R](https://r.example)',
    '- [~] Hai', '', '## 2. Sau', '', 'Vòng: 2', '', '- [x] Ba', '', '## Nhật ký quyết định', '', '- 2026-11-21 · Chọn A  ', '  Vì sao: vì B', ''].join('\n');
  const r = fromMarkdown(v2);
  const ws2 = r.workspace, st = ws2.steps[0], x = st.subs[0];
  check('nhập file định dạng 2 tiếng Việt: đủ trường, không cảnh báo', !r.warnings.length && ws2.templateId === 'crisp-dm' && ws2.notes === 'ghi chú dự án'
    && st.goal === 'mt' && st.doneWhen === 'xk' && st.revisit.round === 3 && st.revisit.reason === 'lý do' && st.notes === 'dòng 1\nTài liệu: giả'
    && st.docs[0].url === 'https://l.example' && x.status === 'cancel' && x.due === '2026-12-01' && x.doneWhen === 'x'
    && x.reason === 'không cần\ndòng hai' && x.notes === 'ghi chú' && x.docs[0].url === 'https://r.example' && st.subs[1].status === 'doing'
    && ws2.steps[1].round === 2 && ws2.log[0].why === 'vì B' && ws2.log[0].stepId === '', JSON.stringify(ws2).slice(0, 400) + r.warnings.join('|'));
}

/* Mở lại (Reopen): dấu redo của bước con chỉ sống trong vòng đang mở; đếm còn mấy việc; Markdown "· redo". */
{
  const w = normWorkspace({ steps: [
    { title: 'A', revisit: { date: '2026-11-20', reason: 'rò rỉ', round: 2 }, subs: [{ title: 'x', redo: true }, { title: 'y', status: 'done', redo: true }, { title: 'z', redo: true, status: 'skip' }, { title: 't' }] },
    { title: 'B', subs: [{ title: 'u', redo: true }] },
  ] });
  check('redo: chỉ giữ ở bước đang mở lại; đếm tổng và còn mở', w.steps[1].subs[0].redo === false && eq(redoCount(w.steps[0]), { total: 3, left: 1 }));
  const md = toMarkdown(w);
  check('redo: Markdown "· redo", đi rồi về giữ nguyên', md.includes('- [ ] x · redo') && md.includes('- [x] y · redo') && eq(shape(fromMarkdown(md).workspace), shape(w)),
    firstDiff(shape(w), shape(fromMarkdown(md).workspace)));
  const vi = fromMarkdown('# A\n## 1. S\nQuay lại: 2026-11-20 · vòng 2 · x\n- [ ] a · làm lại\n## 2. T\n- [ ] b · redo\n').workspace;
  check('redo: nhận "làm lại"; bước không mở lại thì bỏ dấu', vi.steps[0].subs[0].redo === true && vi.steps[1].subs[0].redo === false);
}

let threw = '';
try { parseImport('   '); } catch (e) { threw = e.message; }
check('chữ rỗng thì báo lỗi', /Nothing to import/.test(threw));

/* JSON hỏng hoặc sai khuôn: không bao giờ TypeError, thông báo tiếng Việt. */
const bad = {
  '[1,2,3]': /No valid project/, '{}': /not a Step Planner project/, '{"workspace":{"steps":"abc"}}': /not a project|No valid project/,
  '{ not json': /Broken JSON/, '[[[]]]': /No valid project/,
};
for (const [src, re] of Object.entries(bad)) {
  let msg = '';
  try { parseImport(src); msg = 'không báo lỗi'; } catch (e) { msg = e.message; }
  check(`JSON sai khuôn ${src.slice(0, 24)}: báo rõ, không TypeError`, re.test(msg) && !/TypeError|Cannot read/.test(msg), msg);
}
const skip = parseImport('{"workspaces":[{"name":"a","steps":[null,{"title":"t","subs":[null,5,{"title":"s"}],"revisit":[]}],"log":[null]},7,{"x":1}]}');
check('JSON: bỏ mục không đúng khuôn, có cảnh báo', skip.workspaces.length === 1 && skip.workspaces[0].steps.length === 1
  && skip.workspaces[0].steps[0].subs.length === 1 && skip.workspaces[0].steps[0].revisit === null && skip.warnings.length === 3, skip.warnings.join(' | '));
const oldJ = parseImport('{"steps":[{"title":"t","subs":[{"title":"s","owner":"An"}]}],"people":["An",{"b":1}]}');
check('JSON cũ có people / owner: nhập được, bỏ thông tin người, không cảnh báo', !('people' in oldJ.workspaces[0])
  && !('owner' in oldJ.workspaces[0].steps[0].subs[0]) && oldJ.workspaces[0].steps[0].subs[0].title === 's' && oldJ.warnings.length === 0);
check('ngày: kiểm bằng đi rồi về', parseDate('2026-02-31') === '' && parseDate('0000-00-00') === '' && parseDate('9999-99-99') === ''
  && parseDate('2024-02-29') === '2024-02-29' && parseDate('1/2/2026') === '2026-02-01' && normSub({ due: '2026-02-31' }).due === '');
check('tên trùng: (imported), (imported 2)', uniqueName('A', ['A']) === 'A (imported)' && uniqueName('A', ['A', 'A (imported)']) === 'A (imported 2)' && uniqueName('B', ['A']) === 'B');

check('tiến độ không tính bỏ qua và huỷ; chờ là còn mở', eq(progress(hard.steps[0].subs), { done: 1, total: 7, pct: 14 }));
check('việc tiếp theo bỏ qua thẻ huỷ', eq(nextActionIds({ subs: [{ id: 'a', status: 'cancel' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'todo' }] }), ['c']));
const oldMark = fromMarkdown('# A\n## 1. S\n- [/] huỷ cũ\n  Huỷ vì: không cần\n  ghi chú\n- [?] lạ\n');
check('huỷ: dấu [/] và Huỷ vì: đọc được; dòng thụt hai sau đó là ghi chú', oldMark.workspace.steps[0].subs[0].status === 'cancel'
  && oldMark.workspace.steps[0].subs[0].reason === 'không cần' && oldMark.workspace.steps[0].subs[0].notes === 'ghi chú'
  && oldMark.workspace.steps[0].subs[1].status === 'todo');
check('việc tiếp theo bỏ qua xong và bỏ qua', eq(nextActionIds({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'blocked' }] }), ['c']));
check('việc tiếp theo của dự án: bước đầu còn việc',
  eq(projectNextIds({ steps: [{ subs: [{ id: 'a', status: 'done' }] }, { subs: [] }, { subs: [{ id: 'b', status: 'todo' }] }] }), ['b']));
check('bấm chip: New → In progress → Done; trạng thái khác mở danh sách', nextStatus('todo') === 'doing' && nextStatus('doing') === 'done'
  && ['pending', 'done', 'blocked', 'skip', 'cancel'].every((x) => nextStatus(x) === ''));
{
  const x = normSub({ status: 'cancel', reason: 'vì' });
  setStatus(x, 'done');
  const y = normSub({ status: 'cancel', reason: 'vì' });
  setStatus(y, 'cancel');
  const z = normSub({ status: 'pending', reason: 'đợi duyệt' });
  setStatus(z, 'blocked');
  const zb = z.reason;
  setStatus(z, 'doing');
  check('setStatus: giữa Pending, Blocked, Cancelled giữ lý do; sang trạng thái không có lý do thì bỏ', x.status === 'done' && x.reason === ''
    && y.reason === 'vì' && zb === 'đợi duyệt' && z.reason === '');
  check('dữ liệu cũ: cancelReason đọc thành reason; trạng thái không có lý do thì bỏ', normSub({ status: 'cancel', cancelReason: 'cũ' }).reason === 'cũ'
    && !('cancelReason' in normSub({ status: 'cancel', cancelReason: 'cũ' })) && normSub({ status: 'done', reason: 'x' }).reason === ''
    && normSub({ status: 'pending', reason: 'a', cancelReason: 'b' }).reason === 'a');
  const oldJ = parseImport('{"format":"step-planner","version":3,"workspace":{"name":"c","steps":[{"title":"s","subs":[{"title":"h","status":"cancel","cancelReason":"không cần"}]}]}}');
  check('JSON cũ: cancelReason nhập được', oldJ.workspaces[0].steps[0].subs[0].reason === 'không cần' && !oldJ.warnings.length);
}
{
  const p = fromMarkdown('# A\n## 1. S\n- [>] đợi · due 2026-01-02\n  Waiting on: duyệt\n    dòng hai\n  ghi chú\n- [!] chặn\n  Cancelled because: nhãn khác vẫn nhận\n'
    + '- [ ] mới\n  Waiting on: là ghi chú\n- [x] xong\n  Huỷ vì: cũng là ghi chú\n').workspace.steps[0].subs;
  check('Markdown: [>] là Pending; nhãn lý do nào cũng nhận khi trạng thái có lý do; còn lại là ghi chú', p[0].status === 'pending'
    && p[0].reason === 'duyệt\ndòng hai' && p[0].notes === 'ghi chú' && p[0].due === '2026-01-02' && p[1].status === 'blocked' && p[1].reason === 'nhãn khác vẫn nhận'
    && p[2].reason === '' && p[2].notes === 'Waiting on: là ghi chú' && p[3].notes === 'Huỷ vì: cũng là ghi chú', JSON.stringify(p));
}
check('Next: thẻ chờ không là việc tiếp theo; ô chỉ còn thẻ chờ thì Next không vượt qua',
  eq(nextActionIds({ subs: [{ id: 'a', status: 'pending' }, { id: 'b', status: 'todo', par: true }, { id: 'c', status: 'todo' }] }), ['b'])
  && eq(nextActionIds({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'todo' }] }), [])
  && eq(projectNextIds({ steps: [{ subs: [{ id: 'a', status: 'pending' }] }, { subs: [{ id: 'b', status: 'todo' }] }] }), [])
  && eq(projectNextIds({ steps: [{ subs: [{ id: 'a', status: 'done' }] }, { subs: [{ id: 'b', status: 'blocked' }, { id: 'c', status: 'pending', par: true }] }] }), ['b']));
check('Reopen: chỉ khi bước có bước con Done', canReopen({ subs: [{ status: 'todo' }, { status: 'done' }] })
  && !canReopen({ subs: [{ status: 'doing' }, { status: 'skip' }, { status: 'cancel' }] }) && !canReopen({ subs: [] }));
check('Next: dấu Redo của thẻ chờ còn tính là còn phải làm', eq(redoCount({ subs: [{ status: 'pending', redo: true }, { status: 'done', redo: true }] }), { total: 2, left: 1 }));
check('tách theo ·', eq(splitInline('a \\· b · @c · hạn 2026-01-01'), ['a · b', '@c', 'hạn 2026-01-01']));
check('đếm', eq(counts([hard]), { workspaces: 1, steps: 4, subs: 11, log: 3, docs: 1 }));
check('slug, fold', slug('Đồ án IT5425 — thể thao') === 'do-an-it5425-the-thao' && fold('Việc CỦA Tôi') === 'viec cua toi');

/* Ô song song: bước con `par` nhập vào ô trước; số "3", "3.1"; chỗ (Place) dùng chung cho kéo thả, ô Vị trí, phím, Hoàn tác. */
{
  const mk = () => normWorkspace({ steps: [
    { id: 'S', title: 'S', subs: [{ id: 'a', par: true }, { id: 'b' }, { id: 'c', par: true }, { id: 'd', par: true }, { id: 'e' }] },
    { id: 'T', title: 'T', subs: [{ id: 'x' }] },
  ] });
  const ids = (w, k = 0) => slotsOf(w.steps[k].subs).map((sl) => sl.map((x) => x.id).join('+')).join(' ');
  let w = mk();
  check('ô song song: bước con đầu không nhập được ô trước; ô b+c+d', ids(w) === 'a b+c+d e' && w.steps[0].subs[0].par === false, ids(w));
  check('số: ô "2", song song "2.1" … "2.3"', eq([...liveLabels(w)].filter(([k]) => 'abcdeST'.includes(k)).map(([k, v]) => k + v).join(' '), 'S1 a1 b2.1 c2.2 d2.3 e3 T2'));
  check('chỗ của bước con: riêng một ô / trong ô song song', eq(subPlace(w, 'a'), { stepId: 'S', slot: 0, join: false, at: 0 })
    && eq(subPlace(w, 'c'), { stepId: 'S', slot: 1, join: true, at: 1 }));
  const from = placeSub(w, w.steps[0].subs[0], { stepId: 'S', slot: 0, join: true, at: 0 });
  check('đặt vào ô song song (đầu ô)', ids(w) === 'a+b+c+d e' && eq(from, { stepId: 'S', slot: 0, join: false, at: 0 }), ids(w));
  placeSub(w, w.steps[0].subs.find((x) => x.id === 'a'), from);
  check('Hoàn tác bằng chỗ cũ: về đúng như trước', ids(w) === 'a b+c+d e', ids(w));
  w = mk();
  const head = w.steps[0].subs.find((x) => x.id === 'b');
  const fb = placeSub(w, head, { stepId: 'T', slot: 1, join: false, at: 0 });
  check('nhấc đầu ô song song sang bước khác: ô còn lại giữ nguyên', ids(w) === 'a c+d e' && ids(w, 1) === 'x b');
  placeSub(w, head, fb);
  check('… và trả về đúng đầu ô', ids(w) === 'a b+c+d e' && ids(w, 1) === 'x', ids(w));
  w = mk();
  const t = takeSub(w, 'b');
  check('xoá đầu ô song song: phần tử sau thành đầu ô, không nhập vào ô trước', t.id === 'b' && ids(w) === 'a c+d e', ids(w));
  w = mk();
  check('Alt + ← → / ↑ ↓: đổi ô, tách khỏi ô song song, đổi thứ tự trong ô',
    eq(shiftTarget(w, 'a', 'left'), null) && eq(shiftTarget(w, 'a', 'right'), { stepId: 'S', slot: 1, join: false, at: 0 })
    && eq(shiftTarget(w, 'e', 'right'), null) && eq(shiftTarget(w, 'c', 'left'), { stepId: 'S', slot: 1, join: false, at: 0 })
    && eq(shiftTarget(w, 'c', 'right'), { stepId: 'S', slot: 2, join: false, at: 0 }) && eq(shiftTarget(w, 'b', 'up'), null)
    && eq(shiftTarget(w, 'b', 'down'), { stepId: 'S', slot: 1, join: true, at: 1 }) && eq(shiftTarget(w, 'a', 'down'), null));
  placeSub(w, w.steps[0].subs.find((x) => x.id === 'c'), shiftTarget(w, 'c', 'right'));
  check('Alt + →: tách c ra ô riêng ngay sau ô của nó', ids(w) === 'a b+d c e', ids(w));
  w = mk();
  w.steps[0].subs[3].status = 'done';
  w.steps[0].subs[0].status = 'done';
  check('Next: mọi bước con còn mở của ô đầu tiên còn việc', eq(projectNextIds(w), ['b', 'c']));
  const md = toMarkdown(w);
  check('Markdown: "· parallel" trên dòng bước con; đi rồi về giữ ô', (md.match(/ · parallel\n/g) || []).length === 2 && eq(shape(fromMarkdown(md).workspace), shape(w)),
    firstDiff(shape(w), shape(fromMarkdown(md).workspace)));
  const vi = fromMarkdown('# A\n## 1. S\n- [ ] a · song song\n- [ ] b\n- [ ] c · song song · hạn 2026-01-02\n- [ ] d · parallel\n').workspace.steps[0];
  check('Markdown: nhận cả "song song"; bước con đầu không song song', ids({ steps: [vi] }) === vi.subs.map((x) => x.id)[0] + ' ' + vi.subs.slice(1).map((x) => x.id).join('+')
    && vi.subs[2].due === '2026-01-02' && vi.subs[0].par === false);
  const j = parseImport(toJSON(w)).workspaces[0];
  check('JSON: giữ ô song song', eq(shape(j), shape(w)));
}

/* Bước có tài liệu, bước con đầu có ghi chú mở bằng rào code: bước con không bị đọc thành tài liệu. */
const fenceNote = normWorkspace({ name: 'P', steps: [{ title: 'S', docs: [{ kind: 'link', title: 'L', url: 'https://a.b' }],
  subs: [{ title: 'A', notes: '```python\nx = 1\n```' }, { title: 'B', notes: '~~~' }] }] });
check('bước con có ghi chú mở bằng rào, ngay sau tài liệu của bước: đi rồi về giữ nguyên', eq(shape(fenceNote), roundTrip(fenceNote)),
  firstDiff(shape(fenceNote), roundTrip(fenceNote)));

/* Đi rồi về với dữ liệu ngẫu nhiên (hạt cố định) ghép từ các mảnh dễ đọc nhầm: dấu ·, \\, @, rào, nhãn, đầu mục. */
{
  const atoms = ['a', ' ', '·', ' · ', '\\', '@x', '`', '```', '~~~', '#', '## ', '- ', '[ ]', '[x]', ']', '[', '(', ')', 'hạn 2026-01-01',
    'due', 'Xong khi: ', 'Tài liệu:', 'Vì sao: ', '> ', '1. ', '*', '**', '\n', '\n\n', '  ', 'https://e.com/a(b)', 'Huỷ vì: ',
    'Mục tiêu: ', 'Vòng: 3', 'Quay lại: x', 'Done when: ', 'Docs:', 'Why: ', 'Cancelled because: ', 'Goal: ', 'Iteration: 3',
    'Reopened: x', 'notes:', 'DOCS:', 'Step: ', 'bước: ', 'Waiting on: ', 'Blocked by: ', 'waiting ON:', '[>]', '- [>] ', 'Template: ', 'iteration 2', 'parallel', ' · parallel', 'song song', ' · song song', 'redo', ' · redo', 'làm lại'];
  let seed = 7;
  const rnd = (n) => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) % n; };
  const str = (n) => Array.from({ length: 1 + rnd(n) }, () => atoms[rnd(atoms.length)]).join('');
  const doc = () => (rnd(2) ? { kind: 'link', title: str(3), url: 'https://e.com/' + rnd(99) } : { kind: 'md', title: str(3), body: str(10) });
  const bad = [];
  for (let t = 0; t < 1500 && bad.length < 3; t++) {
    const w = normWorkspace({ name: str(3), notes: rnd(2) ? str(6) : '', templateId: rnd(2) ? 'crisp-dm' : '',
      steps: Array.from({ length: rnd(3) + 1 }, () => ({ title: str(3), goal: rnd(2) ? str(3) : '', doneWhen: rnd(2) ? str(3) : '',
        notes: rnd(2) ? str(6) : '', revisit: rnd(4) ? null : { reason: str(3), date: '2026-01-02', round: 2 + rnd(3) }, round: 1 + rnd(3),
        docs: Array.from({ length: rnd(3) }, doc),
        subs: Array.from({ length: rnd(4) }, () => ({ title: str(4), status: ['todo', 'doing', 'pending', 'blocked', 'done', 'skip', 'cancel'][rnd(7)],
          reason: str(5), due: rnd(2) ? '2026-02-03' : '', doneWhen: rnd(2) ? str(3) : '', notes: rnd(2) ? str(6) : '', par: !!rnd(2), redo: !!rnd(2),
          docs: Array.from({ length: rnd(2) }, doc) })) })),
      log: [] });
    /* Quyết định gắn với bước đầu tiên mang tên ấy (Markdown chỉ ghi tên bước). */
    const firsts = w.steps.filter((s, k) => w.steps.findIndex((o) => fold(o.title) === fold(s.title)) === k);
    w.log = Array.from({ length: rnd(3) }, () => normLog({ date: '2026-03-04', decision: str(3), why: rnd(2) ? str(5) : '',
      stepId: rnd(2) ? firsts[rnd(firsts.length)].id : '' }));
    let back = null;
    try { back = roundTrip(w); } catch (e) { bad.push(`#${t}: ${e.message}`); continue; }
    if (!eq(shape(w), back)) bad.push(`#${t}: ${firstDiff(shape(w), back)}`);
  }
  check('Markdown đi rồi về: 1500 dự án ngẫu nhiên giữ nguyên', !bad.length, bad.join(' | '));
}

/* `__` trong chữ (tên biến Python, `obj.__dict__`) không mở in đậm nếu chỗ đóng dính chữ phía sau. */
const under = (t) => inline(t).map((n) => n.t + ':' + (n.v ?? '')).join('|');
check('Markdown: __ dính chữ phía sau không đóng in đậm', under('a = x.__len và y.__len') === 'text:a = x.__len và y.__len'
  && under('__đậm__ thường') === 'strong:|text: thường' && under('ten_bien_dai') === 'text:ten_bien_dai', under('a = x.__len và y.__len'));

/* Markdown viết tay mở đầu bằng link hay ô việc vẫn là Markdown; mảng JSON vẫn là JSON. */
{
  let r = null, msg = '';
  try { r = parseImport('[Đề bài](https://a.example)\n\n## Bước\n- [ ] việc\n'); } catch (e) { msg = e.message; }
  check('nhập: chữ mở đầu bằng [link](…) đọc là Markdown', r?.kind === 'md' && r.workspaces[0].steps[0]?.subs.length === 1, msg);
  check('nhập: mảng JSON vẫn đọc là JSON', parseImport('[{"name":"a","steps":[]}]').kind === 'backup');
  try { parseImport('[{"name":'); msg = ''; } catch (e) { msg = e.message; }
  check('nhập: mảng JSON hỏng vẫn báo JSON hỏng', /^Broken JSON/.test(msg), msg);
}

/* ── System design (PLAN-016): danh mục, chuẩn hoá, gợi ý, sơ đồ rắn bò, việc cho bảng, Markdown ── */
{
  const cat = JSON.parse(readFileSync(fileURLToPath(new URL('../data/system-design.json', import.meta.url)), 'utf8'));
  check('thiết kế: danh mục đúng khuôn', !catalogErrors(cat).length, catalogErrors(cat).join(' | '));
  check('thiết kế: chuẩn hoá bỏ id lạ, khâu trống; "không cần" giữ lựa chọn ẩn', eq(normDesign({
    profile: { size: 'small', Bad: 'x', budget: 'Free!' },
    stages: { serve: { pick: ['fastapi', 'fastapi', 'X Y', 3] }, host: { pick: [] }, ingest: { skip: true, pick: ['cron'], own: 'z' }, 'a b': { pick: ['q'] } },
  }), { path: '', profile: { size: 'small' }, stages: { serve: { pick: ['fastapi'], skip: false, own: '', note: '' }, ingest: { pick: ['cron'], skip: true, own: 'z', note: '' } }, edges: {} }));
  check('thiết kế: không còn gì thì null', normDesign({ profile: {}, stages: { a: { pick: [] } } }) === null && normDesign('x') === null);
  const s = { options: [{ id: 'a', level: 3, fit: { size: ['large'] } }, { id: 'b', level: 2, fit: { size: ['small'], budget: ['free'] } }, { id: 'c', level: 1, fit: {} }] };
  const r = rankOptions(s, { size: 'small', budget: 'free' });
  check('thiết kế: gợi ý xếp hợp trước, khớp nhiều câu trước; đứng đầu là Recommended', r.map((x) => x.opt.id).join() === 'b,c,a' && r[0].top && !r[1].top && !r[2].ok && r[2].miss[0] === 'size');
  check('thiết kế: chưa trả lời hồ sơ thì không có Recommended', rankOptions(s, {}).every((x) => !x.top));
  const cells = Array.from({ length: 9 }, (_, i) => snake(i, 4));
  check('thiết kế: rắn bò — hai nút liền nhau kề ngang hoặc thẳng dọc', cells.every((c, i) => !i || (c.row === cells[i - 1].row ? Math.abs(c.col - cells[i - 1].col) === 1 : c.col === cells[i - 1].col && c.row === cells[i - 1].row + 1)));
  const st0 = cat.stages[0], o0 = st0.options[0];
  const d = normDesign({ profile: { size: 'small' }, stages: { [st0.id]: { pick: [o0.id], own: 'Tự viết' }, [cat.stages[1].id]: { skip: true } } });
  const n = diagramNodes(cat, d);
  check('thiết kế: sơ đồ bỏ khâu không cần, kết thúc ở Users, vận hành tách riêng',
    !n.flow.some((x) => x.id === cat.stages[1].id) && n.flow.at(-1).id === 'users' && n.ops.every((x) => x.lane === 'ops') && eq(n.flow[0].names, [o0.name, 'Tự viết']));
  check('thiết kế: đếm khâu đã quyết', eq(decidedCount(cat, d), { done: 2, total: cat.stages.length }));
  const t = planTasks(cat, d);
  check('thiết kế: việc cho bảng — tên khâu: phương án, Done when, link chính thức', t.length === 1 && t[0].title === `${st0.title}: ${o0.name} + Tự viết`
    && t[0].doneWhen === `${o0.task} ${st0.task}` && t[0].docs.length === o0.links.length && t[0].docs.every((x) => x.url.startsWith('https://')));
  const hid = normDesign({ stages: { [st0.id]: { pick: [o0.id], own: 'X', skip: true } } });
  check('thiết kế: khâu "không cần" — sơ đồ, việc, tên bỏ qua lựa chọn ẩn; tắt "không cần" là chúng về',
    !diagramNodes(cat, hid).flow.some((x) => x.id === st0.id) && !planTasks(cat, hid).length
    && planTasks(cat, normDesign({ stages: { [st0.id]: { ...hid.stages[st0.id], skip: false } } }))[0].title === `${st0.title}: ${o0.name} + X`);
  const ownOnly = planTasks(cat, normDesign({ stages: { [st0.id]: { own: 'Công cụ riêng' } } }));
  check('thiết kế: công cụ tự ghi — Done when là việc chung của khâu', ownOnly.length === 1 && ownOnly[0].doneWhen === st0.task && !!st0.task);
  const hidWs = normWorkspace({ name: 'H', steps: [], design: hid });
  check('thiết kế: lựa chọn ẩn của khâu "không cần" — JSON giữ, Markdown chỉ ghi skip',
    eq(parseImport(toJSON(hidWs)).workspaces[0].design, hid) && eq(fromMarkdown(toMarkdown(hidWs)).workspace.design.stages[st0.id], { pick: [], skip: true, own: '', note: '' }));
  check('thiết kế: đọc dòng khâu', eq(readStageLine('Hosting: Render (free) [host: render, vps-docker]'), { id: 'host', pick: ['render', 'vps-docker'], skip: false })
    && readStageLine('Ingest: not needed [ingest: skip]').skip && readStageLine('không có ngoặc') === null);
  const ws = normWorkspace({ name: 'P', steps: [{ title: 'A', subs: [{ title: 'x' }] }], design: { profile: { size: 'small', latency: 'online' },
    stages: { serve: { pick: ['fastapi', 'in-app'], own: 'Vapor', note: 'Own: dòng mở bằng nhãn\n\n# không phải tiêu đề\n- không phải việc' }, ingest: { skip: true, note: 'dữ liệu cố định' } } } });
  check('thiết kế: Markdown đi rồi về giữ nguyên (có và không có nhãn)', eq(shape(ws), roundTrip(ws)) && eq(shape(ws), shape(fromMarkdown(toMarkdown(ws, cat)).workspace)),
    firstDiff(shape(ws), roundTrip(ws)));
  check('thiết kế: JSON đi rồi về giữ nguyên', eq(parseImport(toJSON(ws)).workspaces[0].design, ws.design));
  /* Lối bắt đầu: gợi ý ưu tiên phương án của lối, áp lối chỉ điền khâu chưa quyết, không đè khâu đã quyết. */
  const demo = cat.paths.find((p) => p.id === 'demo');
  const app = cat.stages.find((x) => x.id === 'app');
  check('thiết kế: lối — chưa trả lời hồ sơ vẫn có Recommended, phương án lối gợi ý đứng đầu',
    rankOptions(app, effProfile(cat, { path: 'demo', profile: {}, stages: {} }), demo)[0].top
    && demo.suggest.app.includes(rankOptions(app, effProfile(cat, { path: 'demo', profile: {}, stages: {} }), demo)[0].opt.id));
  const mine = { path: '', profile: { users: 'public' }, stages: { app: { pick: ['web-app'], skip: false, own: '', note: '' }, monitor: { pick: [], skip: false, own: '', note: 'giữ' } } };
  const ap = applyPath(cat, mine, 'report');
  check('thiết kế: áp lối — khâu lối bỏ thành Not needed, khâu cần có gợi ý được chọn, khâu đã quyết giữ nguyên, ghi chú giữ',
    ap.next.path === 'report' && ap.next.stages.app.pick[0] === 'web-app' && ap.next.stages.serve.skip && ap.next.stages.monitor.skip
    && ap.next.stages.monitor.note === 'giữ' && ap.next.stages.process.pick.length === 1 && !ap.filled.includes('app') && !ap.next.stages.ingest
    && ap.skipped.includes('serve') && mine.path === '');
  /* Khâu chỉ cần khi hồ sơ khớp (`when`): câu chưa trả lời thì chưa biết; trả lời ngoài `when` thì áp lối đánh dấu Not needed. */
  const gated = cat.stages.filter((x) => Object.keys(x.when || {}).length);
  check('thiết kế: khâu có `when` — chưa trả lời thì cần, trả lời ngoài `when` thì không cần',
    gated.length > 0 && gated.every((x) => {
      const [q, ok] = Object.entries(x.when)[0];
      const off = cat.profile.find((y) => y.id === q).choices.find((c) => !ok.includes(c.id)).id;
      return !notNeededBy(x, {}).length && !notNeededBy(x, { [q]: ok[0] }).length && eq(notNeededBy(x, { [q]: off }), [q])
        && applyPath(cat, { path: '', profile: { [q]: off }, stages: {}, edges: {} }, 'demo').next.stages[x.id]?.skip === true
        && !applyPath(cat, { path: '', profile: { [q]: ok[0] }, stages: {}, edges: {} }, 'demo').next.stages[x.id];
    }));
  /* Gợi ý của lối theo thứ tự lối ghi: phương án lối ghi trước đứng trước, kể cả khi phương án sau khớp nhiều câu hồ sơ hơn. */
  check('thiết kế: lối — phương án hợp đứng đầu theo thứ tự gợi ý của lối', cat.paths.every((pp) => Object.entries(pp.suggest).every(([sid, ids]) => {
    const r = rankOptions(cat.stages.find((x) => x.id === sid), effProfile(cat, { path: pp.id, profile: {}, stages: {} }), pp).filter((x) => x.ok && x.sug);
    return eq(r.map((x) => x.opt.id), ids.filter((id) => r.some((x) => x.opt.id === id)));
  })));
  /* Mỗi lối, mỗi câu trả lời đơn lẻ: khâu lối cần có gợi ý thì "Apply path" chọn được một phương án hợp hồ sơ. */
  const misfit = [];
  for (const pp of cat.paths) {
    for (const q of cat.profile) {
      for (const c of q.choices) {
        const nx = applyPath(cat, { path: '', profile: { [q.id]: c.id }, stages: {}, edges: {} }, pp.id).next;
        const prof = effProfile(cat, nx);
        for (const sid of Object.keys(pp.suggest)) {
          const st = nx.stages[sid];
          if (!st || st.skip) continue;
          const sx = cat.stages.find((x) => x.id === sid);
          if (!rankOptions(sx, prof, pp).find((x) => x.opt.id === st.pick[0]).ok) misfit.push(`${pp.id}/${q.id}=${c.id}/${sid}`);
        }
      }
    }
  }
  check('thiết kế: áp lối với mỗi câu trả lời đơn lẻ chọn phương án hợp hồ sơ', !misfit.length, misfit.join(' '));
  const pws = normWorkspace({ name: 'P', steps: [], design: ap.next });
  const pmd = toMarkdown(pws, cat);
  check('thiết kế: Markdown ghi lối (tên, luồng, mốc nghiệm thu) và nhập lại chỉ đọc id', /^Path: Notebook & report \[path: report\]/m.test(pmd)
    && /^ {2}Accept: /m.test(pmd) && eq(shape(pws), shape(fromMarkdown(pmd).workspace)) && !fromMarkdown(pmd).warnings.length);
  /* Luật phối hợp: báo khi đủ điều kiện; khâu trong `unless` chưa quyết thì chưa báo; `own` ở `unless` tắt cảnh báo. */
  const W = (stages, profile = {}, path = '') => warnings(cat, normDesign({ path, profile, stages })).map((x) => x.id);
  const P = (...ids) => ({ pick: ids });
  check('thiết kế: luật — API trên GitHub Pages báo, có host tự ghi thì thôi',
    W({ serve: P('fastapi'), host: P('github-pages') }).includes('api-on-static-host')
    && !W({ serve: P('fastapi'), host: { pick: ['github-pages'], own: 'Render cho API' } }).includes('api-on-static-host'));
  check('thiết kế: luật — dữ liệu theo lịch: Ingestion chưa quyết thì chưa báo, Not needed thì báo, cron thì thôi',
    !W({}, { fresh: 'batch' }).includes('schedule-without-scheduler') && W({ ingest: { skip: true } }, { fresh: 'batch' }).includes('schedule-without-scheduler')
    && !W({ ingest: P('cron') }, { fresh: 'batch' }).includes('schedule-without-scheduler'));
  check('thiết kế: luật — câu hồ sơ lối giả định cũng tính', W({ host: P('render') }, {}, 'demo').includes('free-host-sleeps'));
  /* Mọi luật trong danh mục bắn được: dựng thiết kế thoả `if`, khâu trong `unless` quyết bằng thứ không khớp. */
  const stageIds = new Set(cat.stages.map((x) => x.id));
  const dead = cat.checks.filter((c) => {
    const stages = {}, profile = {};
    let path = '';
    for (const [k, v] of Object.entries(c.if)) {
      if (k === 'path') path = v[0];
      else if (!stageIds.has(k)) profile[k] = v[0];
      else stages[k] = v[0] === 'skip' ? { skip: true } : v[0] === 'own' ? { own: 'x' } : P(v[0]);
    }
    for (const [k, v] of Object.entries(c.unless || {})) {
      if (!stageIds.has(k) || stages[k]) continue;
      const other = cat.stages.find((x) => x.id === k).options.find((o) => !v.includes(o.id));
      stages[k] = other ? P(other.id) : { skip: true };
    }
    return !W(stages, profile, path).includes(c.id);
  });
  check('thiết kế: luật — mọi luật trong danh mục bắn được', !dead.length, dead.map((c) => c.id).join());
  /* Kiến trúc: mỗi nhóm gợi ý một kiến trúc theo hồ sơ, lối và các khâu đã quyết; chưa đủ câu trả lời thì chưa gợi ý. */
  const A = (stages = {}, profile = {}, path = '') => Object.fromEntries(archAdvice(cat, normDesign({ path, profile, stages })).map((x) => [x.family, x.id]));
  check('kiến trúc: chưa trả lời gì thì mọi nhóm chưa gợi ý', Object.values(A()).every((x) => x === null) && archAdvice(cat, null).length === cat.architectures.length);
  check('kiến trúc: dữ liệu nhỏ, cố định — file + một DB, batch ETL',
    eq(A({}, { size: 'small', fresh: 'once' }), { storage: 'files-db', processing: 'batch-etl', app: null, ml: null }), JSON.stringify(A({}, { size: 'small', fresh: 'once' })));
  const live = A({}, { size: 'large', fresh: 'stream', latency: 'online' });
  check('kiến trúc: dữ liệu lớn, liên tục, cần trả lời ngay — lakehouse, Kappa, app một tiến trình, đặc trưng từ luồng',
    eq(live, { storage: 'lakehouse', processing: 'kappa', app: 'monolith', ml: 'streaming-inference' }), JSON.stringify(live));
  check('kiến trúc: liên tục nhưng xem theo lịch — batch là đủ', A({}, { fresh: 'stream', latency: 'batch' }).processing === 'batch-etl');
  check('kiến trúc: lối đã chọn quyết nhóm app (lối chính là kiến trúc app)',
    A({}, {}, 'demo').app === 'monolith' && A({}, {}, 'api').app === 'client-server' && A({}, {}, 'report').app === 'static-report');
  check('kiến trúc: khâu đã quyết thắng hồ sơ; Serving Not needed thì nhóm model không cần',
    A({ store: P('bigquery') }, { size: 'small' }).storage === 'warehouse' && A({ raw: P('delta-lake') }, { size: 'small' }).storage === 'lakehouse'
    && A({ serve: { skip: true } }, { ai: 'llm' }).ml === '' && A({ process: P('flink') }).processing === 'streaming');
  /* Mọi luật gợi ý tới được: dựng thiết kế thoả đúng `if` của luật thì luật ấy (không phải luật trước nó) thắng. */
  const shadowed = cat.architectures.flatMap((f) => f.rules.map((r, i) => {
    const stages = {}, profile = {};
    let path = '';
    for (const [k, v] of Object.entries(r.if)) {
      if (k === 'path') path = v[0];
      else if (!stageIds.has(k)) profile[k] = v[0];
      else stages[k] = v[0] === 'skip' ? { skip: true } : P(v[0]);
    }
    const got = archAdvice(cat, normDesign({ path, profile, stages })).find((x) => x.family === f.id);
    return got.id === r.arch && got.why === r.why ? '' : `${f.id}[${i}]`;
  })).filter(Boolean);
  check('kiến trúc: mọi luật gợi ý tới được, không bị luật trước che', !shadowed.length, shadowed.join());
  /* Bàn giao trên đường nối: chuẩn hoá, chỉ đường giữa hai khâu đã quyết liền nhau, việc tích hợp, Markdown đi rồi về. */
  check('thiết kế: bàn giao — bỏ khoá sai, via lạ, mục trống; giữ cả khi khâu chưa quyết', eq(normDesign({ edges: {
    'process>store': { via: 'file', what: ' matches.parquet ', promise: 'a\n\nb', check: 'x' }, 'a b>c': { via: 'file' }, 'raw>process': { via: 'fax' } } }).edges,
  { 'process>store': { via: 'file', what: 'matches.parquet', where: '', promise: 'a\n\nb', check: 'x' } }));
  const ed = normDesign({ stages: { raw: P('project-folder'), process: P('duckdb'), validate: { skip: true }, store: P('parquet-duckdb'), serve: P('fastapi') },
    edges: { 'process>store': { via: 'file', what: 'matches.parquet, một dòng mỗi trận, khoá match_id', where: 'data/clean/', check: 'Backend đọc file mẫu, lọc một mùa, trả đúng số trận',
      promise: 'Cột bắt buộc: match_id, season\n\n# home_win = 0 gồm cả hoà\n- thứ tự theo seq' }, 'store>train': { via: 'sql' } } });
  check('thiết kế: đường nối chỉ giữa hai khâu đã quyết liền nhau', flowEdges(cat, ed).map((e) => e.key).join() === 'raw>process,process>store');
  const ef = diagramNodes(cat, ed).flow;
  check('thiết kế: nét liền của sơ đồ cùng luật với đường nối ghi được bàn giao (thêm khâu cuối → Users)',
    ef.slice(1).map((b, i) => bothDecided(ef[i], b) ? `${ef[i].id}>${b.id}` : '').filter(Boolean).join()
      === [...flowEdges(cat, ed).map((e) => e.key), ...(ef.at(-2).open ? [] : [`${ef.at(-2).id}>users`])].join());
  const et = planTasks(cat, ed).find((x) => x.title.startsWith('Handoff:'));
  check('thiết kế: mỗi bàn giao đã ghi một việc tích hợp — Done when là phép kiểm, ghi chú là hợp đồng',
    planTasks(cat, ed).filter((x) => x.title.startsWith('Handoff:')).length === 1 && et.title === 'Handoff: Processing & cleaning → Analytical store & query'
    && et.doneWhen === ed.edges['process>store'].check && /^Via: File\nWhat: matches/.test(et.notes));
  const ews = normWorkspace({ name: 'E', steps: [], design: { ...ed, profile: { users: 'public' }, stages: { ...ed.stages, monitor: { skip: true } } } });
  const emd = toMarkdown(ews, cat);
  const eback = fromMarkdown(emd);
  check('thiết kế: Markdown ghi Handoffs (cả đường chưa hiện) và Warnings; nhập lại giữ nguyên, không cảnh báo',
    /^Handoffs:$/m.test(emd) && emd.includes('[handoff: process > store]') && emd.includes('[handoff: store > train]') && /^Warnings:$/m.test(emd)
    && eq(shape(ews), shape(eback.workspace)) && !eback.warnings.length, firstDiff(shape(ews), shape(eback.workspace)) + eback.warnings.join());
  check('thiết kế: Markdown không danh mục vẫn đi rồi về', eq(shape(ews), roundTrip(ews)));
  /* Giữ kế hoạch theo thiết kế: pandas → DuckDB không để lại hai việc; Done về New khi cập nhật; huỷ có lý do; việc cũ chưa có dấu
   * khớp theo tên; một bản so áp xong thì lần so sau là "same". */
  const pw = normWorkspace({ name: 'S', steps: [{ title: 'A', subs: [] }, { title: PLAN_STEP.title, subs: [] }], design: { stages: { process: P('pandas'), raw: P('project-folder') } } });
  const build = pw.steps[1];
  const kinds = (items) => items.map((x) => `${x.kind}:${(x.task?.src || x.sub?.title)}`).join();
  let diff = planDiff(cat, pw);
  applyPlan(diff, diff.map(() => 'add'), build, CORE);
  check('kế hoạch: lần đầu thêm mỗi khâu một việc có dấu sd; so lại là same', build.subs.length === 2 && build.subs.every((x) => /^stage:[a-z-]+@/.test(x.sd))
    && planDiff(cat, pw).every((x) => x.kind === 'same'));
  check('kế hoạch: sd đi qua JSON', eq(parseImport(toJSON(pw)).workspaces[0].steps[1].subs.map((x) => x.sd), build.subs.map((x) => x.sd)));
  const procSub = build.subs.find((x) => x.title.startsWith('Processing'));
  setStatus(procSub, 'done');
  procSub.notes += '\nghi chú của tôi';
  procSub.docs.push(normDoc({ kind: 'link', title: 'Của tôi', url: 'https://example.org/x' }));
  pw.design = normDesign({ stages: { process: P('duckdb'), raw: P('project-folder') } });
  diff = planDiff(cat, pw);
  check('kế hoạch: đổi pandas → DuckDB là changed, khâu khác same', kinds(diff) === 'same:stage:raw,changed:stage:process', kinds(diff));
  const rec = applyPlan(diff, diff.map((x) => (x.kind === 'changed' ? 'update' : '')), build, CORE);
  check('kế hoạch: Update — một việc, tên mới, Done về New, giữ ghi chú và link của người dùng, thêm link mới',
    build.subs.length === 2 && procSub.title === 'Processing & cleaning: DuckDB' && procSub.status === 'todo' && /ghi chú của tôi/.test(procSub.notes)
    && procSub.docs.some((d) => d.url === 'https://example.org/x') && procSub.docs.some((d) => /duckdb/.test(d.url)) && rec.counts.reset === 1
    && rec.before.get(procSub.id).status === 'done' && planDiff(cat, pw).every((x) => x.kind === 'same'));
  pw.design = normDesign({ stages: { process: P('polars'), raw: { pick: ['project-folder'], skip: true } } });
  diff = planDiff(cat, pw);
  applyPlan(diff, diff.map((x) => (x.kind === 'changed' ? 'replace' : x.kind === 'removed' ? 'cancel' : '')), build, CORE);
  const rawSub = build.subs.find((x) => x.title.startsWith('Raw'));
  check('kế hoạch: Keep old and add new — cũ huỷ có lý do, mới thêm; khâu Not needed — huỷ, lý do nói vì sao',
    procSub.status === 'cancel' && /^Replaced in system design: Processing & cleaning: Polars/.test(procSub.reason) && !procSub.sd
    && build.subs.some((x) => x.title === 'Processing & cleaning: Polars' && x.sd) && rawSub.status === 'cancel' && /Raw storage is Not needed/.test(rawSub.reason)
    && planDiff(cat, pw).every((x) => x.kind === 'same'));
  const old = normWorkspace({ name: 'O', steps: [{ title: 'System build', subs: [{ title: 'Processing & cleaning: pandas' }, { title: 'Processing & cleaning: DuckDB' }, { title: 'Việc riêng' }] }],
    design: { stages: { process: P('duckdb') } } });
  diff = planDiff(cat, old);
  check('kế hoạch: việc cũ chưa có dấu — khớp theo tên, việc thừa cùng khâu là removed (thay bởi việc mới), việc riêng không đụng',
    diff.length === 2 && diff[0].kind === 'changed' && diff[0].sub.title === 'Processing & cleaning: DuckDB' && !diff[0].tagged
    && diff[1].kind === 'removed' && diff[1].sub.title === 'Processing & cleaning: pandas' && /replaced by/.test(diff[1].why), kinds(diff));
  const md = '# P\n\n## System design\n\nProfile: size small · budget free\n\n- dòng lạ\n- Serving: FastAPI [serve: fastapi]\n';
  const back = fromMarkdown(md);
  check('thiết kế: Markdown viết tay — dòng không có [khâu: …] thì cảnh báo, không thành bước', back.workspace.steps.length === 0
    && eq(back.workspace.design, { path: '', profile: { size: 'small', budget: 'free' }, stages: { serve: { pick: ['fastapi'], skip: false, own: '', note: '' } }, edges: {} }) && back.warnings.length === 1);
}

/* Quyết định gắn với bước trùng tên: Markdown ghi `Step: N. tên`, nhập lại đúng bước thứ N; file cũ `Step: tên` vẫn đọc. */
{
  const ws = normWorkspace({ name: 'Trùng', steps: [{ id: 'a', title: 'Validation' }, { id: 'b', title: 'Model' }, { id: 'c', title: 'Validation' }, { id: 'd', title: '2. Lạ' }],
    log: [{ date: '2026-11-01', decision: 'Q1', stepId: 'c' }, { date: '2026-11-02', decision: 'Q2', stepId: 'a' }, { date: '2026-11-03', decision: 'Q3', stepId: 'd' }] });
  const md = toMarkdown(ws);
  check('Markdown: dòng Step của quyết định có số thứ tự như tiêu đề', md.includes('  Step: 3. Validation') && md.includes('  Step: 1. Validation') && md.includes('  Step: 4. 2. Lạ'));
  const back = shape(fromMarkdown(md).workspace);
  check('Markdown: quyết định của bước trùng tên thứ hai về đúng bước ấy', eq(back.log.map((l) => l.step), [2, 0, 3]) && eq(back, shape(ws)), JSON.stringify(back.log));
  const old = fromMarkdown('# P\n\n## 1. Validation\n\n## 2. Model\n\n## 3. Validation\n\n## 4. 2. Lạ\n\n## Decision log\n\n- 2026-11-01 · Q\n  Step: Validation\n- 2026-11-02 · R\n  Step: 2. Lạ\n- 2026-11-03 · S\n  Step: 9. Model\n');
  const w = old.workspace;
  const idx = w.log.map((l) => w.steps.findIndex((x) => x.id === l.stepId));
  check('Markdown cũ: `Step: tên` gắn bước đầu tiên cùng tên; tên có số đầu vẫn khớp; số sai thì theo tên', eq(idx, [0, 3, 1]) && !old.warnings.length, JSON.stringify(idx));
}

/* "Next" đang chờ: ô đầu còn việc chỉ có Pending / Blocked thì báo các thẻ ấy; có thẻ làm được thì không báo. */
{
  const ws = (subs) => normWorkspace({ steps: [{ title: 'A', subs: [{ title: 'xong', status: 'done' }, ...subs] }, { title: 'B', subs: [{ title: 'độc lập' }] }] });
  const ids = (w) => nextWaitingOn(w).map((x) => x.title);
  check('Next chờ: ô đầu chỉ có Pending thì báo thẻ ấy, Next rỗng', eq(ids(ws([{ title: 'p', status: 'pending' }, { title: 'sau' }])), ['p'])
    && projectNextIds(ws([{ title: 'p', status: 'pending' }])).length === 0);
  check('Next chờ: ô song song Pending + Blocked thì báo cả hai', eq(ids(ws([{ title: 'p', status: 'pending' }, { title: 'b', status: 'blocked', par: true }])), ['p', 'b']));
  check('Next chờ: ô có thẻ làm được thì không báo', eq(ids(ws([{ title: 'p', status: 'pending' }, { title: 'n', par: true }])), [])
    && eq(ids(ws([{ title: 'n' }])), []) && eq(nextWaitingOn(normWorkspace({ steps: [] })), []));
  check('lọc trạng thái: nhóm', inGroup('', 'cancel') && inGroup('act', 'doing') && !inGroup('act', 'pending') && inGroup('wait', 'blocked') && inGroup('out', 'skip') && !inGroup('done', 'todo'));
}

/* Bằng chứng nghiệm thu: tài liệu `proof`, ngày xong `doneAt`; Markdown và JSON đi rồi về; file cũ vẫn đọc. */
{
  const x = normSub({ title: 'T', doneWhen: 'Có báo cáo' });
  setStatus(x, 'done', '2026-11-20');
  const d1 = x.doneAt;
  setStatus(x, 'done', '2026-11-21');
  check('doneAt: sang Done ghi ngày, Done lại không đổi ngày, rời Done thì bỏ', d1 === '2026-11-20' && x.doneAt === '2026-11-20'
    && (setStatus(x, 'doing'), x.doneAt === '') && normSub({ status: 'todo', doneAt: '2026-01-01' }).doneAt === '' && normSub({ status: 'done' }).doneAt === '');
  setStatus(x, 'done', '2026-11-22');
  check('bằng chứng: xong, có Done when, chưa có tài liệu proof thì gợi ý; có rồi thì thôi', needsEvidence(x)
    && !needsEvidence({ ...x, docs: [normDoc({ kind: 'link', title: 'r', url: 'https://a.b', proof: true })] }) && !needsEvidence({ ...x, doneWhen: '' }));
  const ws = normWorkspace({ name: 'P', steps: [{ title: 'A', docs: [{ kind: 'md', title: 'Evidence: tên thật', body: 'x' }, { kind: 'link', title: 'Chạy', url: 'https://r.example/1', proof: true }],
    subs: [{ title: 'Huấn luyện · done 2026-01-01', status: 'done', doneAt: '2026-11-20', due: '2026-11-30', doneWhen: 'AUC ≥ 0,8',
      docs: [{ kind: 'link', title: 'Evidence: [run] 12', url: 'https://r.example/12', proof: true }, { kind: 'md', title: 'Notebook', body: '# a', proof: true }, { kind: 'link', title: 'Brief', url: 'https://b.example' }] },
    { title: 'Chưa xong', status: 'doing', doneAt: '2026-11-20' }] }] });
  const md = toMarkdown(ws);
  check('Markdown: dòng bước con có "· done YYYY-MM-DD", tài liệu bằng chứng mở bằng "Evidence: ", tên thật trùng chữ ấy thì thoát',
    md.includes(' · due 2026-11-30 · done 2026-11-20') && md.includes('- [Evidence: Evidence: \\[run\\] 12](https://r.example/12)') && md.includes('    - Evidence: Notebook\n')
    && md.includes('- \\Evidence: tên thật\n') && md.includes('- [Evidence: Chạy](https://r.example/1)') && md.includes('- [Brief](https://b.example)'));
  check('Markdown: bằng chứng và ngày xong đi rồi về giữ nguyên', eq(shape(ws), roundTrip(ws)), firstDiff(shape(ws), roundTrip(ws)));
  check('JSON: bằng chứng và ngày xong đi rồi về giữ nguyên', eq(shape(ws), shape(parseImport(toJSON(ws)).workspaces[0])));
  const old = fromMarkdown('# P\n\n## A\n\n- [x] Xong · due 2026-11-30\n  Docs:\n    - [Run](https://r.example)\n');
  const o = old.workspace.steps[0].subs[0];
  check('Markdown cũ: không ngày xong, tài liệu không là bằng chứng', o.doneAt === '' && o.docs[0].proof === false && !old.warnings.length);
}

/* Sửa cùng lúc ở hai tab: chỉ trường mình đổi đè lên bản mới nhất; cùng trường khác giá trị là xung đột. */
{
  const snap = { title: 'A', notes: '', doneWhen: 'x', status: 'todo' };
  const r1 = mergeEdit(snap, { ...snap, notes: 'của tôi' }, { ...snap, doneWhen: 'tab kia' });
  check('gộp: trường khác nhau thì giữ cả hai, không xung đột', eq(r1, { merged: { title: 'A', notes: 'của tôi', doneWhen: 'tab kia', status: 'todo' }, conflicts: [] }), JSON.stringify(r1));
  const r2 = mergeEdit(snap, { ...snap, doneWhen: 'tôi' }, { ...snap, doneWhen: 'tab kia', status: 'done' });
  check('gộp: cùng trường khác giá trị là xung đột, tạm giữ của mình; trường tab kia đổi vẫn lấy', eq(r2.conflicts, ['doneWhen']) && r2.merged.doneWhen === 'tôi' && r2.merged.status === 'done');
  const r3 = mergeEdit(snap, { ...snap, doneWhen: 'y' }, { ...snap, doneWhen: 'y' });
  check('gộp: hai bên đổi cùng một giá trị thì không xung đột', !r3.conflicts.length && r3.merged.doneWhen === 'y');
  const r4 = mergeEdit({ stepId: '' }, { stepId: '' }, { stepId: 't1' });
  check('gộp: không đổi gì thì lấy hết bản mới nhất', eq(r4.merged, { stepId: 't1' }) && !r4.conflicts.length);
  const sub = normSub({ id: 's', title: 'T', docs: [{ kind: 'link', title: 'x', url: 'https://a.b' }], redo: true });
  const p = pick(sub, EDIT_FIELDS.sub);
  check('gộp: hộp bước con chỉ ghi trường của hộp (không docs, par, redo)', eq(Object.keys(p), EDIT_FIELDS.sub) && !('docs' in p) && !('redo' in p));
}

/* ── Bàn giao: đầu ra / đầu vào — chuẩn hoá, nhân bản đổi id, mẫu theo key, Markdown đi rồi về (cả tên trùng), cảnh báo,
 * vạch giữa hai hàng và nút giữa hai ô, Hoàn tác xoá gắn lại đầu vào ── */
{
  const H = await import('../js/core.js');
  const sub = normSub({ outs: [{ id: 'o1', name: '  a  b ', ref: 'x\ny', note: 7 }, { name: '' }, 'bad', { id: 'o2', name: 'c' }], ins: ['o1', 'z', 'z', 3, ''] });
  check('bàn giao: normSub — đầu ra không tên bị bỏ, chuỗi một dòng; đầu vào bỏ trùng, bỏ id của chính nó',
    eq(sub.outs, [{ id: 'o1', name: 'a b', ref: 'x y', note: '7' }, { id: 'o2', name: 'c', ref: '', note: '' }]) && eq(sub.ins, ['z']));
  const raw = {
    name: 'PL', steps: [
      { id: 't1', title: 'Clean', outs: [{ id: 'm', name: 'matches.parquet', ref: 'data/clean/matches.parquet', note: 'one row per match · key match_id' }],
        subs: [{ id: 'a', title: 'A', outs: [{ id: 'oa', name: 'table', ref: 'https://x.y/a_(b)' }] },
          { id: 'b', title: 'B', outs: [{ id: 'ob', name: 'teams ← list \\ x' }] },
          { id: 'c', title: 'C', outs: [{ id: 'oc', name: 'table', note: '- trông như mục' }] },
          { id: 'd', title: 'D', par: true, ins: ['oa', 'ob'] }] },
      { id: 't2', title: 'Backend', ins: ['m', 'gone'],
        subs: [{ id: 'e', title: 'A', ins: ['oc', 'oa'], outs: [{ id: 'oe', name: 'table' }, { id: 'm', name: 'dup id' }] }, { id: 'f', title: 'API', ins: ['m', 'ob', 'oe'] }] },
    ],
  };
  const ws = normWorkspace(raw);
  const s2 = ws.steps[1];
  check('bàn giao: normWorkspace — id đầu ra trùng lấy id mới, đầu vào mất nguồn vẫn giữ',
    s2.subs[0].outs[1].id !== 'm' && eq(s2.ins, ['m', 'gone']) && eq(ws.steps[0].subs[3].ins, ['oa', 'ob']));
  const f = freshCopy(ws);
  const ids = (w) => w.steps.flatMap((s) => [s, ...s.subs]).flatMap((x) => x.outs.map((o) => o.id));
  check('bàn giao: freshCopy — id đầu ra mới, đầu vào trỏ theo', eq(shape(f), shape(ws)) && ids(f).every((id) => !ids(ws).includes(id)));
  const md = toMarkdown(ws);
  const back = fromMarkdown(md);
  check('bàn giao: Markdown đi rồi về giữ nguyên (tên đầu ra trùng, bên giao trùng tên, ký tự thoát, hợp đồng)', eq(shape(ws), shape(back.workspace)) && !back.warnings.length,
    firstDiff(shape(ws), shape(back.workspace)) + back.warnings.join(' | '));
  check('bàn giao: Markdown — tên bên giao trùng thì ghi "bước › bước con"', md.includes('  - table ← Clean › A') && md.includes('    - table ← C'));
  check('bàn giao: JSON đi rồi về giữ nguyên', eq(shape(parseImport(toJSON(ws)).workspaces[0]), shape(ws)));
  const hand = '# P\n\n## Make\n\nOutputs:\n  - clean · data/c.csv · hợp đồng viết cùng dòng\n  - dup\n\n- [ ] Other\n  Outputs:\n    - dup\n\n## Use\n\nInputs:\n  - clean\n  - dup\n  - missing ← Make\n\n- [ ] x\n  Inputs:\n    - dup ← Other\n';
  const hb = fromMarkdown(hand);
  const hs = shape(hb.workspace);
  check('bàn giao: Markdown viết tay — note cùng dòng, tên trùng không có bên giao thì lấy cái đầu và cảnh báo, không có thì cảnh báo',
    eq(hs.steps[0].outs[0], { name: 'clean', ref: 'data/c.csv', note: 'hợp đồng viết cùng dòng' }) && eq(hs.steps[1].ins, ['0.-.0', '0.-.1'])
    && eq(hs.steps[1].subs[0].ins, ['0.0.0']) && hb.warnings.length === 2 && /matches 2/.test(hb.warnings[0]) && /not found.*missing ← Make/.test(hb.warnings[1]), hb.warnings.join(' | '));
  const tpl = fromTemplate({ id: 't', name: 'T', steps: [
    { title: 'S1', outs: [{ key: 'k1', name: 'snap', ref: 'a.parquet' }, { key: 'k1', name: 'again' }], subs: [{ title: 'x', ins: ['k2', 'nope'] }] },
    { title: 'S2', ins: ['k1'], subs: [{ title: 'y', outs: [{ key: 'k2', name: 'later' }] }] }] });
  const ts = shape(tpl);
  check('bàn giao: fromTemplate — key thành id mới, key lạ bị bỏ, key trùng lấy cái đầu', eq(ts.steps[0].subs[0].ins, ['1.0.0']) && eq(ts.steps[1].ins, ['0.-.0'])
    && ts.steps[0].outs.length === 2 && !JSON.stringify(tpl).includes('"key"'));
  const ho = H.handoffs(ws);
  const name = (p) => `${H.holderTitle(p.from)}>${H.holderTitle(p.to)}:${p.outs.map((o) => o.name).join('+')}`;
  check('bàn giao: vạch giữa hai hàng gom theo cặp bên giao → bên nhận', eq((ho.rows.get(1) || []).map(name),
    ['Clean>Backend:matches.parquet', 'C>A:table', 'A>A:table', 'Clean>API:matches.parquet', 'B>API:teams ← list \\ x']));
  const gaps = ho.gaps.get(ws.steps[0].id);
  /* A ở ô 0, B ở ô 1, D ở ô 2 (ô song song với C): cả A → D và B → D vào nút ngay trước ô của D. */
  check('bàn giao: nút trước ô nhận — gom mọi cặp từ ô trước nó, một nút cho mọi cặp', eq([...gaps.keys()], [1])
    && eq(gaps.get(1).map(name), ['A>D:table', 'B>D:teams ← list \\ x']));
  const far = H.handoffs(normWorkspace({ steps: [{ id: 'x1', title: 'S1', outs: [{ id: 'q', name: 'q' }], subs: [{ id: 'u', title: 'U', ins: ['r'] }] },
    { id: 'x2', title: 'S2', subs: [{ id: 'v', title: 'V' }] }, { id: 'x3', title: 'S3', subs: [{ id: 'w', title: 'W', ins: ['q'], outs: [{ id: 'r', name: 'r' }] }] }] }));
  check('bàn giao: vạch trên hàng nhận gom cả hàng xa hơn; chảy ngược không có vạch', eq([...far.rows.keys()], [2]) && eq(far.rows.get(2).map(name), ['S1>W:q']));
  check('bàn giao: bên nhận đứng trước bên giao thì liên kết treo, vẫn giữ trong dữ liệu', far.held.length === 1 && far.heldKeys.has(H.heldKey('u', 'r'))
    && eq(far.held.map((l) => `${H.holderTitle(l.from)}>${H.holderTitle(l.to)}`), ['W>U']) && ho.held.length === 0);
  const sameRow = H.handoffs(normWorkspace({ steps: [{ id: 'y1', title: 'S', subs: [{ id: 'p', title: 'P', ins: ['z'] }, { id: 'q2', title: 'Q', outs: [{ id: 'z', name: 'z' }] }] }] }));
  check('bàn giao: cùng hàng, ô nhận đứng trước ô giao thì treo, không có mũi tên', eq([...sameRow.heldKeys], ['p>z']) && !sameRow.gaps.size);
  check('bàn giao: nơi dùng của một đầu ra', eq((ho.usedBy.get('oa') || []).map(H.holderTitle), ['D', 'A']));
  const w2 = normWorkspace(raw);
  const relink = H.insBackup(w2, [w2.steps[0].subs[0]]);
  w2.steps[0].subs.splice(0, 1);
  const reloaded = normWorkspace(JSON.parse(JSON.stringify(w2)));
  check('bàn giao: xoá bên giao — đọc lại vẫn giữ đầu vào mất nguồn, io vẫn lỗi', reloaded.steps[1].subs[0].ins.includes('oa')
    && H.ioStatus(reloaded).get('e').in === 'bad' && H.ioStatus(reloaded).get('e').inWhy.some((w) => w.kind === 'missing' && w.id === 'oa'));
  reloaded.steps[0].subs.unshift(normWorkspace(raw).steps[0].subs[0]);
  relink(reloaded);
  check('bàn giao: Hoàn tác xoá gắn lại đầu vào của nơi khác, kể cả khi dữ liệu đã đọc lại', eq(reloaded.steps[1].subs[0].ins, ['oc', 'oa']) && eq(reloaded.steps[0].subs[3].ins, ['oa', 'ob']));
  /* Đầu vào mất nguồn: Markdown ghi `- (deleted output)`, nhập lại vẫn mất nguồn; nhân bản đổi id nhưng vẫn không trỏ tới đâu. */
  check('bàn giao: Markdown — đầu vào mất nguồn ghi "(deleted output)", nhập lại vẫn mất nguồn, không cảnh báo',
    md.includes('Inputs:\n  - matches.parquet ← Clean\n  - (deleted output)\n') && eq(shape(back.workspace).steps[1].ins, ['0.-.0', '?'])
    && back.workspace.steps[1].ins[1] !== 'gone' && H.ioStatus(back.workspace).get(back.workspace.steps[1].id).in === 'bad');
  const g2 = normWorkspace({ steps: [{ id: 'a1', title: 'A', subs: [{ id: 'x', title: 'X', ins: ['lost'] }, { id: 'y', title: 'Y', ins: ['lost', 'lost2'] }] }] });
  const g2c = freshCopy(g2);
  check('bàn giao: freshCopy — đầu vào mất nguồn lấy id mới, cùng id cũ thì cùng id mới, vẫn không trỏ tới đâu',
    g2c.steps[0].subs[0].ins[0] !== 'lost' && g2c.steps[0].subs[0].ins[0] === g2c.steps[0].subs[1].ins[0] && g2c.steps[0].subs[1].ins.length === 2
    && [...H.ioStatus(g2c).values()].filter((v) => v.in === 'bad').length === 2);
  const named = normWorkspace({ steps: [{ title: 'A', subs: [{ title: 'P', outs: [{ id: 'o', name: '(deleted output)' }] }] }, { title: 'B', subs: [{ title: 'U', ins: ['o'] }] }] });
  const nb = fromMarkdown(toMarkdown(named));
  check('bàn giao: đầu ra thật tên "(deleted output)" vẫn nối (dòng có "←")', eq(shape(nb.workspace), shape(named)) && !nb.warnings.length, nb.warnings.join(' | '));
  check('bàn giao: consumersOf — bên nhận của bước và bước con làm lại, trừ chính chúng', eq(H.consumersOf(ws, [ws.steps[0], ws.steps[0].subs[2]]).map(H.holderTitle), ['Backend', 'A', 'API']));
}

/* Trạng thái đầu vào / đầu ra (ioStatus). */
{
  const io = (raw) => CORE.ioStatus(raw);
  const st = (m, id) => { const s = m.get(id); return `${s.in}/${s.out}`; };
  const a = io(normWorkspace({ steps: [
    { id: 's1', title: 'S1', subs: [{ id: 'p', title: 'P', outs: [{ id: 'op', name: 'raw' }] }, { id: 'n', title: 'Neither' }] },
    { id: 's2', title: 'S2', subs: [{ id: 'q', title: 'Q', ins: ['op'], outs: [{ id: 'oq', name: 'clean' }] }, { id: 'r', title: 'R', ins: ['oq'] }] }] }));
  check('io: bước con có cả đầu vào lẫn đầu ra đều nối → ok / ok', st(a, 'q') === 'ok/ok');
  check('io: chỉ có đầu ra → đầu vào none; chỉ có đầu vào → đầu ra none', st(a, 'p') === 'none/ok' && st(a, 'r') === 'ok/none');
  check('io: không có cả hai → none / none', st(a, 'n') === 'none/none' && !a.get('n').inWhy.length && !a.get('n').outWhy.length);
  check('io: bước không có đầu vào riêng → đầu vào none, đầu ra gộp bước con', st(a, 's1') === 'none/ok' && st(a, 's2') === 'none/ok');
  /* Đầu vào treo, đầu ra chỉ có nơi dùng treo: R (bước 1) dùng đầu ra của W (bước 2). */
  const b = io(normWorkspace({ steps: [
    { id: 't1', title: 'T1', subs: [{ id: 'u', title: 'U', ins: ['ow'] }] },
    { id: 't2', title: 'T2', subs: [{ id: 'w', title: 'W', outs: [{ id: 'ow', name: 'model' }] }] }] }));
  check('io: đầu vào treo → bad, nêu tên đầu ra và bên giao', st(b, 'u') === 'bad/none'
    && eq(b.get('u').inWhy, [{ kind: 'held', id: 'ow', name: 'model', from: 'W' }]));
  check('io: đầu ra chỉ được dùng bởi liên kết treo → bad, nêu nơi dùng', st(b, 'w') === 'none/bad'
    && eq(b.get('w').outWhy, [{ kind: 'held', id: 'ow', name: 'model', to: ['U'] }]));
  check('io: bước — mọi đầu ra của bước con không có nơi nhận đang nối → bad', st(b, 't2') === 'none/bad');
  /* Đầu ra không ai dùng; một bước con nhiều đầu ra, một cái không ai dùng; đầu vào trỏ tới đầu ra đã xoá (chưa đọc lại). */
  const c = normWorkspace({ steps: [
    { id: 'v1', title: 'V1', outs: [{ id: 'ov', name: 'spec' }], subs: [{ id: 'x', title: 'X', outs: [{ id: 'ox1', name: 'a' }, { id: 'ox2', name: 'b' }] }] },
    { id: 'v2', title: 'V2', ins: ['ox1'], subs: [{ id: 'y', title: 'Y', ins: ['ox1'] }, { id: 'z', title: 'Z', outs: [{ id: 'oz', name: 'lonely' }] }] }] });
  c.steps[1].subs[0].ins.push('gone');
  c.steps[1].ins.push('gone2');
  const cs = io(c);
  check('io: đầu ra không ai dùng → bad "unused"', st(cs, 'z') === 'none/bad' && eq(cs.get('z').outWhy, [{ kind: 'unused', id: 'oz', name: 'lonely', to: [] }]));
  check('io: nhiều đầu ra, một cái không ai dùng → bad, nêu đúng cái ấy', st(cs, 'x') === 'none/bad' && eq(cs.get('x').outWhy.map((w) => w.name), ['b']));
  check('io: đầu vào trỏ tới đầu ra không còn → bad "missing"', st(cs, 'y') === 'bad/none' && eq(cs.get('y').inWhy, [{ kind: 'missing', id: 'gone', name: '', from: '' }]));
  check('io: bước — một đầu ra (của bước con) được dùng → ok, vẫn nêu cái chưa dùng', st(cs, 'v1') === 'none/ok'
    && eq(cs.get('v1').outWhy.map((w) => w.name), ['spec', 'b']));
  check('io: bước — đầu vào riêng của bước trỏ tới đầu ra không còn → bad', st(cs, 'v2') === 'bad/bad' && cs.get('v2').inWhy[0].kind === 'missing');
  /* Bước nhận đầu ra của bước con đứng sau nó → đầu vào của bước treo. */
  const d = io(normWorkspace({ steps: [{ id: 'k1', title: 'K1', ins: ['om'] }, { id: 'k2', title: 'K2', subs: [{ id: 'm', title: 'M', outs: [{ id: 'om', name: 'm' }] }] }] }));
  check('io: bước — đầu vào riêng của bước treo → bad', st(d, 'k1') === 'bad/none' && d.get('k1').inWhy[0].from === 'M');
  /* Dời về đúng thứ tự: liên kết nối lại, cả hai bên ok. */
  const e = normWorkspace({ steps: [{ id: 'k1', title: 'K1', ins: ['om'] }, { id: 'k2', title: 'K2', subs: [{ id: 'm', title: 'M', outs: [{ id: 'om', name: 'm' }] }] }] });
  e.steps.reverse();
  const es = io(e);
  check('io: dời về đúng thứ tự thì cả hai bên ok', st(es, 'k1') === 'ok/none' && st(es, 'm') === 'none/ok');
}

if (fails) { console.log(`test-core: ${fails} LỖI`); process.exit(1); }
console.log('test-core: OK');
