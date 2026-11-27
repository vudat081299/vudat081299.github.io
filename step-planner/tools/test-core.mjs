/* Bài thử của js/core/ (logic thuần), chạy bằng node:  node step-planner/tools/test-core.mjs
 * Mọi mẫu trong data/templates.json phải đi Markdown → về mà không mất gì; JSON cũng vậy. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { progress, nextActionIds, projectNextIds, slotsOf, subPlace, placeSub, takeSub, shiftTarget, liveLabels, redoCount, canReopen, nextWaitingOn, inGroup, fold } from '../js/core/board.js';
import { normDesign, rankOptions, decidedCount, catalogErrors, applyPath, effProfile, warnings, notNeededBy, archAdvice, archState, stageLists, pathOf, fitOf, presetDesign, isPreset } from '../js/core/design.js';
import { readStageLine } from '../js/core/design-md.js';
import { snake, planTasks, diagramNodes, flowEdges, bothDecided, planDiff, applyPlan, PLAN_STEP } from '../js/core/design-plan.js';
import { parseImport, toJSON, toBackup, shape, counts, slug } from '../js/core/io.js';
import { toMarkdown, fromMarkdown, splitInline } from '../js/core/markdown.js';
import { parseMd, inline, srcTokens, linkParts } from '../js/core/md.js';
import { fromTemplate, tplGroups, nextStatus, setStatus, mergeEdit, pick, EDIT_FIELDS, needsEvidence, normWorkspace, normSub, normLog, freshCopy, parseDate, uniqueName, normDoc, safeUrl } from '../js/core/model.js';
import * as CORE from '../js/core/handoffs.js';

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

/* Liên kết treo theo luật chặt của mẫu: bên giao phải đứng hẳn trước bên nhận — hàng trước, hoặc cùng hàng thì cả hai là bước
 * con và ô của bên giao đứng trước ô của bên nhận. Cùng ô (song song), bước nhận từ bước con của chính nó, hay đứng sau: treo.
 * Đầu vào không khớp đầu ra nào cũng tính. Trả về các cặp "bên giao > bên nhận: đầu ra". */
const heldStrict = (ws) => {
  const idx = CORE.outIndex(ws), slot = new Map(), bad = [];
  for (const step of ws.steps) slotsOf(step.subs).forEach((sl, k) => sl.forEach((x) => slot.set(x.id, k)));
  for (const to of CORE.holders(ws)) {
    for (const id of to.h.ins || []) {
      const src = idx.get(id);
      const ok = src && (src.i < to.i || (src.i === to.i && src.sub && to.sub && slot.get(src.sub.id) < slot.get(to.sub.id)));
      if (!ok) bad.push(`${src ? CORE.holderTitle(src) : '?'} > ${CORE.holderTitle(to)}: ${src ? src.out.name : id}`);
    }
  }
  return bad;
};

const tplPath = fileURLToPath(new URL('../data/templates.json', import.meta.url));
const { templates } = JSON.parse(readFileSync(tplPath, 'utf8'));

{ // Nhóm mẫu (PLAN-039): mẫu chung trước (cả mẫu trống), dự án cụ thể sau; mỗi nhóm giữ thứ tự của file, nhóm rỗng bị bỏ.
  const g = tplGroups(templates);
  const ids = (k) => (g.find((x) => x.key === k)?.items || []).map((t) => t.id);
  check('nhóm mẫu: mẫu chung trước, dự án cụ thể sau, đủ mọi mẫu, giữ thứ tự file',
    eq(g.map((x) => x.key), ['general', 'specific']) && eq([...ids('general'), ...ids('specific')].sort(), templates.map((t) => t.id).sort())
    && eq(ids('general'), templates.filter((t) => !t.group).map((t) => t.id)) && ids('general').includes(templates.find((t) => !t.steps.length).id)
    && ids('specific').length > 0 && templates.filter((t) => t.group).every((t) => t.group === 'specific'), JSON.stringify(g.map((x) => [x.key, x.items.map((t) => t.id)])));
  check('nhóm mẫu: nhóm rỗng bị bỏ, group lạ là mẫu chung',
    eq(tplGroups([{ id: 'a' }, { id: 'b', group: 'x' }]).map((x) => [x.key, x.items.length]), [['general', 2]]) && eq(tplGroups([]), []));
}

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
  // Đầu vào lơ lửng: key không khớp đầu ra nào của mẫu (fromTemplate bỏ lặng lẽ, nên kiểm trên chính mẫu).
  const keys = new Set((t.steps || []).flatMap((s) => [s, ...(s.subs || [])]).flatMap((x) => (x.outs || []).map((o) => o.key)));
  const dangling = (t.steps || []).flatMap((s) => [s, ...(s.subs || [])]).flatMap((x) => (x.ins || []).filter((k) => !keys.has(k)));
  check(`mẫu ${t.id}: không đầu vào lơ lửng (key không có đầu ra)`, !dangling.length, dangling.join(','));
  const late = heldStrict(ws);
  check(`mẫu ${t.id}: không đầu vào treo, kể cả cùng ô với bên giao`, !late.length, late.join(' | '));
  const io = CORE.ioStatus(ws);
  const red = ws.steps.flatMap((s) => [s, ...s.subs]).filter((x) => io.get(x.id).out === 'bad').map((x) => x.title);
  check(`mẫu ${t.id}: mở mẫu ra không đầu ra nào lỗi (sản phẩm cuối có final)`, !red.length, red.join(' | '));
}
{ // Bộ kiểm treo chặt bắt được: cùng ô, bước nhận từ bước con của nó, hàng sau, đầu ra không có; ô trước, hàng trước thì sạch.
  const w = normWorkspace({ steps: [
    { id: 's1', title: 'S1', ins: ['a'], subs: [{ id: 'a1', title: 'A', outs: [{ id: 'a', name: 'a' }] }, { id: 'b1', title: 'B', par: true, ins: ['a'] },
      { id: 'c1', title: 'C', ins: ['a', 'z', 'gone'] }] },
    { id: 's2', title: 'S2', subs: [{ id: 'd1', title: 'D', ins: ['a'], outs: [{ id: 'z', name: 'z' }] }] }] });
  check('bàn giao mẫu: bộ kiểm treo chặt bắt cùng ô, cùng hàng ở cấp bước, chảy ngược, mất nguồn', eq(heldStrict(w),
    ['A > S1: a', 'A > B: a', 'D > C: z', '? > C: gone']), heldStrict(w).join(' | '));
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

/* Bộ dựng Markdown của tài liệu (js/core/md.js): cây khối, không HTML. */
const tree = parseMd('# T\n\nđoạn **đậm** *nghiêng* `code` [l](https://a.b) [x](javascript:alert(1)) <b>\n\n- a\n  - b\n- [x] c\n\n1. một\n2. hai\n\n> trích\n\n````\n```\nin\n```\n````\n\n| a | b |\n|---|:-:|\n| 1 | 2 |\n\n---');
check('md.js: tiêu đề, đoạn, danh sách lồng, việc, đánh số, trích dẫn, rào lồng, bảng, vạch',
  eq(tree.map((b) => b.t), ['h', 'p', 'list', 'list', 'quote', 'code', 'table', 'hr']) && tree[2].items[0].c[1].t === 'list'
  && tree[2].items[1].task === true && tree[3].ordered && tree[5].v === '```\nin\n```' && tree[6].align[1] === 'center', JSON.stringify(tree.map((b) => b.t)));
const para = tree[1].c;
check('md.js: link chỉ http(s); chữ HTML là chữ', para.some((n) => n.t === 'link' && n.href === 'https://a.b')
  && !para.some((n) => n.t === 'link' && /javascript/.test(n.href)) && para.some((n) => n.t === 'text' && n.v.includes('<b>')));
check('md.js: url trần bỏ dấu câu cuối', eq(inline('xem https://a.b/c).'), [{ t: 'text', v: 'xem ' }, { t: 'link', href: 'https://a.b/c', c: [{ t: 'text', v: 'https://a.b/c' }] }, { t: 'text', v: ').' }]));
const lp = (/** @type {string} */ t) => linkParts(t).map((p) => (p.t === 'link' ? `<${p.v}>` : p.v)).join('');
check('md.js linkParts: dấu câu cuối, ")" thừa ở ngoài link; ngoặc đi cặp giữ trong URL; chữ giữ nguyên',
  lp('(xem https://arxiv.org/abs/1803.09010).') === '(xem <https://arxiv.org/abs/1803.09010>).'
  && lp('Xong khi nào (https://a.b/p.html#xong): đủ') === 'Xong khi nào (<https://a.b/p.html#xong>): đủ'
  && lp('https://a.b/c, https://a.b/d; https://a.b/e!') === '<https://a.b/c>, <https://a.b/d>; <https://a.b/e>!'
  && lp('wiki https://en.wikipedia.org/wiki/Bias_(statistics).') === 'wiki <https://en.wikipedia.org/wiki/Bias_(statistics)>.'
  && lp('(https://en.wikipedia.org/wiki/Bias_(statistics))') === '(<https://en.wikipedia.org/wiki/Bias_(statistics)>)'
  && lp('(see https://x.y/a.)') === '(see <https://x.y/a>.)' && lp('https://. không') === 'https://. không'
  && linkParts('a https://x.y b').map((p) => p.t).join() === 'text,link,text', lp('(xem https://arxiv.org/abs/1803.09010).'));

/* Token tô màu của khung Edit: theo thứ tự, không chồng nhau, không vượt dòng; đúng loại ở các dấu chính. */
const srcT = '# Tiêu **đậm**\n> trích `c`\n- [x] [l](https://a.b "t")\n```py\nx = "s" # **không**\n```\n| a | b |\nsnake_case *n* ~~g~~ <!-- c -->';
const toks = srcTokens(srcT), at = (/** @type {string} */ frag, k = 0) => {
  const i = srcT.indexOf(frag); const t = toks.find((x) => x.s <= i + k && i + k < x.e); return t ? t.k : null; };
check('md.js srcTokens: theo thứ tự, không chồng, không qua dòng',
  toks.every((t, i) => t.e > t.s && (!i || toks[i - 1].e <= t.s) && !srcT.slice(t.s, t.e).includes('\n')));
check('md.js srcTokens: tiêu đề, trích dẫn, mục việc, link, khối rào, bảng, nghiêng, gạch, chú thích',
  at('# ') === 'punct' && at('Tiêu') === 'head' && at('đậm') === 'strong' && at('> ') === 'quote' && at('trích') === 'qtext'
  && at('`c`') === 'code' && at('[x]') === 'punct' && at('[l]', 1) === 'link' && at('https://a.b') === 'url' && at('"t"') === 'string'
  && at('```py', 3) === 'info' && at('x = ') === 'code' && at('**không**') === 'code' && at('| a', 0) === 'punct'
  && at('snake_case', 5) === null && at('*n*', 1) === 'em' && at('~~g~~', 2) === 'strike' && at('<!--') === 'comment', JSON.stringify(toks));

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
check('việc tiếp theo bỏ qua xong và bỏ qua', eq(nextActionIds({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'doing' }] }), ['c']));
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
check('Next: thẻ chờ (Pending, Blocked) không là việc tiếp theo; ô chỉ còn thẻ chờ thì Next không vượt qua',
  eq(nextActionIds({ subs: [{ id: 'a', status: 'pending' }, { id: 'b', status: 'todo', par: true }, { id: 'c', status: 'todo' }] }), ['b'])
  && eq(nextActionIds({ subs: [{ id: 'a', status: 'blocked' }, { id: 'b', status: 'doing', par: true }, { id: 'c', status: 'todo' }] }), ['b'])
  && eq(nextActionIds({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'pending' }, { id: 'c', status: 'todo' }] }), [])
  && eq(nextActionIds({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'blocked' }, { id: 'c', status: 'todo' }] }), [])
  && eq(projectNextIds({ steps: [{ subs: [{ id: 'a', status: 'pending' }] }, { subs: [{ id: 'b', status: 'todo' }] }] }), [])
  && eq(projectNextIds({ steps: [{ subs: [{ id: 'a', status: 'blocked' }] }, { subs: [{ id: 'b', status: 'todo' }] }] }), [])
  && eq(projectNextIds({ steps: [{ subs: [{ id: 'a', status: 'done' }] }, { subs: [{ id: 'b', status: 'blocked' }, { id: 'c', status: 'pending', par: true }] }] }), []));
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
/* Ký tự vùng riêng của Unicode (U+E000–U+F8FF) trong chữ: Markdown tạm đổi ký tự thoát `\x` sang vùng ấy khi đọc, nên ký tự
 * vùng riêng có sẵn phải đi rồi về nguyên vẹn, kể cả cạnh `·`, `\`, `@`, `due`. */
{
  const atoms = ['a', ' ', '·', ' · ', '\\', '\\·', '@x', 'due', 'hạn', '', '', '', '', '', '', '',
    '᣿', 'ᤀ', ' · redo', ' · parallel', ''];
  let seed = 11;
  const rnd = (n) => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) % n; };
  const str = (n) => Array.from({ length: 1 + rnd(n) }, () => atoms[rnd(atoms.length)]).join('');
  const bad = [];
  for (let t = 0; t < 800 && bad.length < 3; t++) {
    const w = normWorkspace({ name: str(3), steps: Array.from({ length: 1 + rnd(2) }, () => ({ title: str(4), notes: rnd(2) ? str(5) : '',
      outs: rnd(2) ? [{ name: str(3), ref: str(2), note: str(3) }] : [],
      subs: Array.from({ length: 1 + rnd(3) }, () => ({ title: str(6), status: ['todo', 'done', 'cancel'][rnd(3)], reason: str(3), due: rnd(2) ? '2026-02-03' : '',
        doneWhen: rnd(2) ? str(3) : '', par: !!rnd(2), docs: rnd(2) ? [{ kind: 'link', title: str(3), url: 'https://e.com/' + rnd(9) }] : [] })) })), log: [] });
    let back = null;
    try { back = roundTrip(w); } catch (e) { bad.push(`#${t}: ${e.message}`); continue; }
    if (!eq(shape(w), back)) bad.push(`#${t}: ${firstDiff(shape(w), back)}`);
  }
  check('Markdown đi rồi về: chữ có ký tự vùng riêng (U+E000–U+F8FF) cạnh ·, \\, @ giữ nguyên (800 dự án ngẫu nhiên)', !bad.length, bad.join(' | '));
  check('tách theo ·: ký tự vùng riêng có sẵn giữ nguyên', eq(splitInline('ab \\· c ·  · \\'), ['ab · c', '', '']));
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
  }), { path: '', profile: { size: 'small' }, stages: { serve: { pick: ['fastapi'], skip: false, own: '', note: '' }, ingest: { pick: ['cron'], skip: true, own: 'z', note: '' } }, edges: {}, arch: {}, archWhy: {} }));
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
  check('thiết kế: viết tay `[raw: skip, minio]` — Not needed, minio là lựa chọn ẩn; `skip`, `own` không bao giờ là id phương án',
    eq(readStageLine('- Raw: x [raw: skip, minio]'), { id: 'raw', pick: ['minio'], skip: true }) && eq(readStageLine('[raw: own, minio]').pick, ['minio'])
    && eq(normDesign({ stages: { raw: { pick: ['skip', 'minio', 'own'] } } }).stages.raw.pick, ['minio'])
    && eq(fromMarkdown('# P\n\n## System design\n\n- Raw: x [raw: skip, minio]\n').workspace.design.stages.raw, { pick: ['minio'], skip: true, own: '', note: '' }));
  {
    /* Dữ liệu hỏng: B khai đầu ra trùng id với A và nhận id ấy làm đầu vào. Đầu ra của B lấy id mới, đầu vào trỏ tới A. */
    const dw = normWorkspace({ steps: [{ title: 'S', subs: [{ id: 'a', title: 'A', outs: [{ id: 'o', name: 'first' }] },
      { id: 'b', title: 'B', ins: ['x', 'o'], outs: [{ id: 'o', name: 'second' }] }] }] });
    const [da, db] = dw.steps[0].subs;
    check('bàn giao: đầu ra trùng id và đầu vào cùng id ấy — đầu ra sau lấy id mới, đầu vào vẫn trỏ tới đầu ra đầu tiên',
      da.outs[0].id === 'o' && db.outs[0].id !== 'o' && eq(db.ins, ['x', 'o']), JSON.stringify(db));
  }
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
  const hardOf = (stages, profile = {}, path = '') => warnings(cat, normDesign({ path, profile, stages })).filter((x) => !x.caveat).map((x) => x.id);
  check('thiết kế: luật — API trên GitHub Pages báo, có host tự ghi thì thôi',
    W({ serve: P('fastapi'), host: P('github-pages') }).includes('api-on-static-host')
    && !W({ serve: P('fastapi'), host: { pick: ['github-pages'], own: 'Render cho API' } }).includes('api-on-static-host'));
  check('thiết kế: luật — dữ liệu theo lịch: Ingestion chưa quyết thì chưa báo, Not needed thì báo, cron thì thôi',
    !W({}, { fresh: 'batch' }).includes('schedule-without-scheduler') && W({ ingest: { skip: true } }, { fresh: 'batch' }).includes('schedule-without-scheduler')
    && !W({ ingest: P('cron') }, { fresh: 'batch' }).includes('schedule-without-scheduler'));
  check('thiết kế: luật — câu hồ sơ lối giả định cũng tính', W({ host: P('render') }, {}, 'demo').includes('free-host-sleeps'));
  /* Mọi luật trong danh mục bắn được với từng giá trị nêu trong `if` (giá trị ấy ở khoá ấy, khoá khác lấy giá trị đầu), khâu
   * trong `unless` quyết bằng thứ không khớp. */
  const stageIds = new Set(cat.stages.map((x) => x.id));
  const famIds = new Set(cat.architectures.map((f) => f.id));
  const fires = (c, pickOf) => {
    const stages = {}, profile = {}, arch = {};
    let path = '';
    for (const [k, vs] of Object.entries(c.if)) {
      const v = pickOf(k, vs);
      if (k === 'path') path = v;
      else if (!stageIds.has(k) && famIds.has(k)) arch[k] = v;
      else if (!stageIds.has(k)) profile[k] = v;
      else stages[k] = v === 'skip' ? { skip: true } : v === 'own' ? { own: 'x' } : P(v);
    }
    for (const [k, v] of Object.entries(c.unless || {})) {
      if (!stageIds.has(k) || stages[k]) continue;
      const other = cat.stages.find((x) => x.id === k).options.find((o) => !v.includes(o.id));
      stages[k] = other ? P(other.id) : { skip: true };
    }
    return warnings(cat, normDesign({ path, profile, stages, arch })).some((x) => x.id === c.id);
  };
  const dead = cat.checks.flatMap((c) => Object.entries(c.if).flatMap(([key, vals]) => vals
    .filter((val) => !fires(c, (k, vs) => (k === key ? val : vs[0]))).map((val) => `${c.id} ${key}=${val}`)));
  check('thiết kế: luật — mọi luật trong danh mục bắn được, với mọi giá trị nêu trong `if`', !dead.length, dead.join(', '));
  /* Kiến trúc: mỗi nhóm gợi ý một kiến trúc theo hồ sơ, lối và các khâu đã quyết; chưa đủ câu trả lời thì chưa gợi ý. */
  const A = (stages = {}, profile = {}, path = '') => Object.fromEntries(archAdvice(cat, normDesign({ path, profile, stages })).map((x) => [x.family, x.id]));
  check('kiến trúc: chưa trả lời gì thì mọi nhóm chưa gợi ý', Object.values(A()).every((x) => x === null) && archAdvice(cat, null).length === cat.architectures.length);
  check('kiến trúc: dữ liệu nhỏ, cố định — file + một DB, hai tầng thô + sạch, batch ETL',
    eq(A({}, { size: 'small', fresh: 'once' }), { storage: 'files-db', layers: 'two-layers', processing: 'batch-etl', app: null, ml: null }), JSON.stringify(A({}, { size: 'small', fresh: 'once' })));
  const live = A({ train: P('spark-mllib') }, { size: 'large', fresh: 'stream', latency: 'online' });
  check('kiến trúc: dữ liệu lớn, liên tục, cần trả lời ngay, có train — lakehouse, medallion, Kappa, app một tiến trình, đặc trưng từ luồng',
    eq(live, { storage: 'lakehouse', layers: 'medallion', processing: 'kappa', app: 'monolith', ml: 'streaming-inference' }), JSON.stringify(live));
  /* Nhóm model chỉ gợi ý khi dự án có model: luật theo hồ sơ (độ trễ, độ mới) cần khâu Training đã quyết. */
  check('kiến trúc: chưa quyết Training thì nhóm model chưa gợi ý theo hồ sơ; Training Not needed thì không cần; Serving đã chọn vẫn thắng',
    A({}, { latency: 'online' }).ml === null && A({}, { latency: 'batch' }).ml === null && A({}, { fresh: 'stream', latency: 'online' }).ml === null
    && A({ train: P('local') }, { latency: 'online' }).ml === 'online-prediction' && A({ train: { own: 'x' } }, { latency: 'report' }).ml === 'batch-prediction'
    && A({ train: { skip: true } }, { latency: 'online' }).ml === '' && A({ train: { skip: true }, serve: P('fastapi') }, { latency: 'online' }).ml === 'online-prediction'
    && A({ train: { skip: true } }, { ai: 'llm' }).ml === 'rag');
  check('kiến trúc: liên tục nhưng xem theo lịch — batch là đủ', A({}, { fresh: 'stream', latency: 'batch' }).processing === 'batch-etl');
  check('kiến trúc: lối đã chọn quyết nhóm app (lối chính là kiến trúc app)',
    A({}, {}, 'demo').app === 'monolith' && A({}, {}, 'api').app === 'client-server' && A({}, {}, 'report').app === 'static-report');
  check('kiến trúc: khâu đã quyết thắng hồ sơ; Serving Not needed thì nhóm model không cần, trừ khi sản phẩm dùng LLM',
    A({ store: P('bigquery') }, { size: 'small' }).storage === 'warehouse' && A({ raw: P('delta-lake') }, { size: 'small' }).storage === 'lakehouse'
    && A({ serve: { skip: true } }, { ai: 'none' }).ml === '' && A({ serve: { skip: true } }, { ai: 'llm' }).ml === 'rag'
    && A({ process: P('flink') }).processing === 'streaming' && A({ process: P('flink') }, { fresh: 'once' }).processing === 'batch-etl');
  /* Chia tầng (PLAN-030): medallion là cách chia tầng, độc lập với nơi lưu; một bộ dữ liệu cố định thì hai tầng là đủ. */
  check('kiến trúc: medallion — dữ liệu theo ngày, kể cả nhỏ trên thư mục Parquet; cố định thì thô + sạch; khâu có table format thắng hồ sơ',
    A({}, { size: 'small', fresh: 'batch' }).layers === 'medallion' && A({}, { size: 'small', fresh: 'batch' }).storage === 'files-db'
    && A({}, { size: 'medium', fresh: 'once' }).layers === 'two-layers' && A({}, { size: 'large', fresh: 'once' }).layers === 'medallion'
    && A({ raw: P('hudi') }, { size: 'small', fresh: 'once' }).layers === 'medallion' && A({}, { size: 'small' }).layers === null);
  /* Chỉ mã nguồn mở, tự host (PLAN-030): dịch vụ được quản lý không hợp hồ sơ; dữ liệu lớn theo lịch ra lakehouse tự host. */
  const oss = { size: 'large', fresh: 'batch', selfhost: 'yes' };
  const rawStage = cat.stages.find((x) => x.id === 'raw');
  const rawOk = rankOptions(rawStage, oss).filter((x) => x.ok).map((x) => x.opt.id);
  const ossPlan = applyPath(cat, { path: '', profile: oss, stages: {}, edges: {} }, 'pipeline').next.stages;
  const lake = cat.architectures.find((f) => f.id === 'storage').entries.find((e) => e.id === 'lakehouse');
  check('hồ sơ tự host: lớn + theo lịch + mã nguồn mở — lakehouse + medallion; Apply path chọn MinIO, dbt, DuckDB trên Iceberg; kho thô hợp có MinIO, Iceberg, catalog, không có S3, GCS, R2',
    A({}, oss).storage === 'lakehouse' && A({}, oss).layers === 'medallion'
    && A({}, { ...oss, selfhost: 'no', latency: 'report', budget: 'low' }).storage === 'warehouse' && A({}, { ...oss, latency: 'report', budget: 'low' }).storage === 'lakehouse'
    && ['minio', 'iceberg', 'polaris', 'iceberg-jdbc'].every((x) => rawOk.includes(x)) && !['s3', 'gcs', 'cloudflare-r2'].some((x) => rawOk.includes(x))
    && eq(ossPlan.raw.pick, ['minio']) && eq(ossPlan.process.pick, ['dbt']) && eq(ossPlan.store.pick, ['duckdb-iceberg'])
    && lake.tools.raw.includes('minio') && lake.tools.raw.includes('iceberg') && lake.tools.raw.includes('polaris'),
  JSON.stringify({ raw: rawOk, plan: Object.fromEntries(Object.entries(ossPlan).map(([k, v]) => [k, v.skip ? 'skip' : v.pick.join()])) }));
  check('hồ sơ tự host: mọi phương án được quản lý bị loại khi selfhost = yes, vẫn hợp khi no',
    cat.stages.every((x) => x.options.filter((o) => o.fit.selfhost).every((o) => !fitOf(o, { selfhost: 'yes' }).ok && fitOf(o, { selfhost: 'no' }).ok))
    && !fitOf(cat.stages.find((x) => x.id === 'host').options.find((o) => o.id === 'streamlit-cloud'), { selfhost: 'yes' }).ok);
  /* Luật mới (PLAN-030). */
  const has = (ids, id) => ids.includes(id);
  check('luật: Iceberg không có catalog thì báo; có Polaris, catalog JDBC hay tự ghi thì thôi; Delta không cần catalog',
    has(W({ raw: P('iceberg') }), 'iceberg-without-catalog') && has(W({ raw: P('minio', 'iceberg') }), 'iceberg-without-catalog')
    && !has(W({ raw: P('minio', 'iceberg', 'polaris') }), 'iceberg-without-catalog') && !has(W({ raw: P('iceberg', 'iceberg-jdbc') }), 'iceberg-without-catalog')
    && !has(W({ raw: { pick: ['iceberg'], own: 'AWS Glue' } }), 'iceberg-without-catalog') && !has(W({ raw: P('delta-lake') }), 'iceberg-without-catalog'));
  const wd = (stages) => warnings(cat, normDesign({ stages }));
  check('luật: MinIO trên host không giữ đĩa chỉ nhắc (caveat); trên máy của nhóm, VPS thì không báo',
    wd({ raw: P('minio'), host: P('cloud-run') }).some((x) => x.id === 'object-store-on-ephemeral-disk' && x.caveat)
    && !has(W({ raw: P('minio'), host: P('own-server') }), 'object-store-on-ephemeral-disk') && !has(W({ raw: P('minio'), host: P('vps-docker') }), 'object-store-on-ephemeral-disk'));
  check('luật: file DuckDB dùng chung với Superset chỉ nhắc (caveat); DuckDB trên Iceberg thì không',
    wd({ store: P('parquet-duckdb'), app: P('superset') }).some((x) => x.id === 'duckdb-file-shared-with-bi' && x.caveat)
    && !has(W({ store: P('duckdb-iceberg'), app: P('superset') }), 'duckdb-file-shared-with-bi') && !has(W({ store: P('parquet-duckdb'), app: P('streamlit') }), 'duckdb-file-shared-with-bi'));
  check('luật: bảng Hudi đọc bằng DuckDB thì báo; Iceberg có catalog, hay Hudi đọc bằng Trino thì không',
    has(W({ raw: P('hudi'), store: P('duckdb-iceberg') }), 'hudi-read-by-duckdb') && !has(W({ raw: P('iceberg', 'polaris'), store: P('duckdb-iceberg') }), 'hudi-read-by-duckdb')
    && !has(W({ raw: P('hudi', 'hive-metastore'), store: P('trino') }), 'hudi-read-by-duckdb'));
  check('luật: Kubernetes cho vài người thì báo, lời báo chỉ sang Docker Compose trên một máy',
    has(W({ host: P('kubernetes') }, { users: 'few' }), 'kubernetes-for-few-users') && !has(W({ host: P('kubernetes') }, { users: 'public' }), 'kubernetes-for-few-users')
    && /Docker Compose trên một máy/.test(cat.checks.find((x) => x.id === 'kubernetes-for-few-users').msg));
  /* Luật mới (PLAN-032): công cụ đã nghỉ hưu; nguồn phải hỏi theo chu kỳ dùng như luồng. */
  check('luật: Oozie báo đã nghỉ hưu, vẫn tính là công cụ chạy theo lịch; Airflow thì không báo',
    has(W({ ingest: P('oozie') }), 'retired-scheduler') && !has(W({ ingest: P('airflow') }), 'retired-scheduler')
    && !has(W({ ingest: P('oozie') }, { fresh: 'batch' }), 'schedule-without-scheduler')
    && has(W({ ingest: P('oozie') }, { fresh: 'stream', latency: 'online' }), 'stream-with-batch-ingest'));
  check('luật: API hay trang web dùng như luồng thì báo; có nguồn đẩy đi kèm, hay dữ liệu theo lịch, thì không',
    has(W({ source: P('rest-api') }, { fresh: 'stream' }), 'polling-source-as-stream') && has(W({ source: P('playwright') }, { fresh: 'stream' }), 'polling-source-as-stream')
    && !has(W({ source: P('rest-api', 'websocket-feed') }, { fresh: 'stream' }), 'polling-source-as-stream')
    && !has(W({ source: P('rest-api') }, { fresh: 'batch' }), 'polling-source-as-stream') && !has(W({ source: P('websocket-feed') }, { fresh: 'stream' }), 'polling-source-as-stream'));
  check('luật: BigQuery với kho thô R2, MinIO, HDFS thì báo; có thêm GCS, hay thư mục dự án (nạp file trên máy) thì thôi',
    has(W({ store: P('bigquery'), raw: P('cloudflare-r2') }), 'bigquery-raw-outside-gcs') && has(W({ store: P('bigquery'), raw: P('minio', 'iceberg') }), 'bigquery-raw-outside-gcs')
    && !has(W({ store: P('bigquery'), raw: P('cloudflare-r2', 'gcs') }), 'bigquery-raw-outside-gcs') && !has(W({ store: P('bigquery'), raw: P('gcs') }), 'bigquery-raw-outside-gcs')
    && !has(W({ store: P('bigquery') }), 'bigquery-raw-outside-gcs') && !has(W({ store: P('trino'), raw: P('cloudflare-r2') }), 'bigquery-raw-outside-gcs'));
  check('luật: MinIO, catalog tự host mà chỉ đóng gói requirements, uv thì báo; có Docker Compose thì thôi',
    has(W({ raw: P('minio'), package: P('requirements') }), 'self-hosted-storage-without-compose')
    && !has(W({ raw: P('minio'), package: P('requirements', 'docker-compose') }), 'self-hosted-storage-without-compose')
    && !has(W({ raw: P('minio') }), 'self-hosted-storage-without-compose') && !has(W({ raw: P('cloudflare-r2'), package: P('requirements') }), 'self-hosted-storage-without-compose'));
  /* Ingestion nhận nhiều công cụ: Kafka cho luồng cùng một công cụ lịch cho job batch (Lambda, nạp bù, luồng giả lập). */
  check('khâu Ingestion chọn được nhiều công cụ; Kafka + cron: dữ liệu theo lịch có công cụ lịch, luồng không báo nạp theo lô khi có Kafka',
    cat.stages.find((x) => x.id === 'ingest').multi === true && eq(normDesign({ stages: { ingest: P('kafka', 'cron') } }).stages.ingest.pick, ['kafka', 'cron'])
    && !has(W({ ingest: P('kafka', 'cron') }, { fresh: 'batch' }), 'schedule-without-scheduler')
    && has(W({ ingest: P('kafka', 'cron') }, { fresh: 'batch' }), 'kafka-for-batch-data')
    && eq(readStageLine('Ingestion & scheduling: Kafka, cron [ingest: kafka, cron]'), { id: 'ingest', pick: ['kafka', 'cron'], skip: false }));
  const optOf = (sid, oid) => cat.stages.find((x) => x.id === sid).options.find((o) => o.id === oid);
  /* Processing nhận nhiều công cụ (PLAN-037): Lambda, hay luồng giả lập cạnh pipeline theo lịch, ghi cả công cụ stream lẫn công cụ lô.
   * dbt dùng được cho dữ liệu liên tục (lớp batch trên bronze) nhưng không đọc topic: thiếu công cụ stream thì luật báo. */
  const lambda = { ingest: P('kafka', 'cron'), process: P('spark-streaming', 'spark'), raw: P('s3', 'delta-lake'), store: P('cassandra') };
  check('khâu Processing chọn được nhiều công cụ; Lambda (Kafka + cron, Spark Structured Streaming + Spark) không làm luật báo, kể cả nạp theo lô',
    cat.stages.find((x) => x.id === 'process').multi === true && eq(normDesign({ stages: { process: P('spark-streaming', 'dbt') } }).stages.process.pick, ['spark-streaming', 'dbt'])
    && !hardOf(lambda, { size: 'large', fresh: 'stream', latency: 'online', budget: 'low' }).length
    && has(W({ ingest: P('cron') }, { fresh: 'stream', latency: 'online' }), 'stream-with-batch-ingest')
    && !has(W({ ingest: P('kafka', 'cron') }, { fresh: 'stream', latency: 'online' }), 'stream-with-batch-ingest'),
  JSON.stringify(hardOf(lambda, { size: 'large', fresh: 'stream', latency: 'online', budget: 'low' })));
  check('dbt hợp dữ liệu liên tục; chỉ dbt cho dữ liệu liên tục cần trả lời ngay thì báo, thêm công cụ stream thì thôi',
    fitOf(optOf('process', 'dbt'), { fresh: 'stream' }).ok && fitOf(optOf('validate', 'dbt-tests'), { fresh: 'stream' }).ok
    && has(W({ process: P('dbt') }, { fresh: 'stream', latency: 'online' }), 'stream-without-stream-processor')
    && !has(W({ process: P('dbt', 'spark-streaming') }, { fresh: 'stream', latency: 'online' }), 'stream-without-stream-processor')
    && !has(W({ process: P('dbt') }, { fresh: 'stream', latency: 'batch' }), 'stream-without-stream-processor'));
  check('Kafka mà Processing chỉ có công cụ lô thì báo, kể cả chưa trả lời câu độ trễ; có công cụ stream bên cạnh thì thôi',
    has(W({ ingest: P('kafka'), process: P('dbt') }, { fresh: 'stream' }), 'kafka-without-consumer')
    && has(W({ ingest: P('kafka'), process: P('duckdb') }, { fresh: 'stream', latency: 'online' }), 'kafka-without-consumer')
    && !has(W({ ingest: P('kafka'), process: P('dbt', 'spark-streaming') }, { fresh: 'stream' }), 'kafka-without-consumer'));
  check('luật: dbt test mà Processing không có dbt thì báo; có dbt (kể cả cạnh công cụ stream) thì thôi',
    has(W({ validate: P('dbt-tests'), process: P('spark-streaming') }), 'dbt-tests-without-dbt')
    && !has(W({ validate: P('dbt-tests'), process: P('spark-streaming', 'dbt') }), 'dbt-tests-without-dbt')
    && !has(W({ validate: P('dbt-tests') }), 'dbt-tests-without-dbt'));
  /* Công cụ lịch dùng được cho dữ liệu tới liên tục khi kết quả xem theo lịch (gom thành lô); cần trả lời ngay thì luật báo. */
  const streamReport = applyPath(cat, { path: '', profile: { fresh: 'stream', latency: 'report' }, stages: {}, edges: {} }, 'pipeline').next;
  const batchEtl = cat.architectures.find((f) => f.id === 'processing').entries.find((e) => e.id === 'batch-etl').tools;
  check('lối pipeline, dữ liệu liên tục xem theo lịch: Apply path chọn công cụ lịch và công cụ lô của batch ETL, không Kafka, không công cụ stream',
    ['cron', 'github-actions', 'prefect', 'dagster', 'airflow', 'oozie'].every((id) => fitOf(optOf('ingest', id), { fresh: 'stream' }).ok)
    && archAdvice(cat, streamReport).find((a) => a.family === 'processing').id === 'batch-etl'
    && streamReport.stages.ingest.pick.every((id) => batchEtl.ingest.includes(id)) && streamReport.stages.process.pick.every((id) => batchEtl.process.includes(id))
    && !hardOf(streamReport.stages, streamReport.profile, 'pipeline').length,
  JSON.stringify(streamReport.stages));
  check('phương án: WebSocket, lag Kafka hợp dữ liệu liên tục, không hợp theo lịch; Playwright ngược lại; Apply path không chọn Oozie',
    fitOf(optOf('source', 'websocket-feed'), { fresh: 'stream' }).ok && !fitOf(optOf('source', 'websocket-feed'), { fresh: 'batch' }).ok
    && fitOf(optOf('monitor', 'kafka-lag'), { fresh: 'stream' }).ok && !fitOf(optOf('monitor', 'kafka-lag'), { fresh: 'once' }).ok
    && fitOf(optOf('source', 'playwright'), { fresh: 'batch' }).ok && !fitOf(optOf('source', 'playwright'), { fresh: 'stream' }).ok
    && cat.paths.every((pp) => !(applyPath(cat, { path: '', profile: { size: 'large', fresh: 'batch' }, stages: {}, edges: {} }, pp.id).next.stages.ingest?.pick || []).includes('oozie')));
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
  /* Gợi ý không tự mâu thuẫn với luật báo, trên lưới hồ sơ × lối. Luật `caveat` chỉ nhắc cách dùng nên không tính.
   * Ngoại lệ có lý do: dữ liệu cỡ cụm mà cần trả lời ngay thì mọi kho hợp đều là cụm (Cassandra, HBase); luật báo cụm trên
   * ngân sách miễn phí hay trên host app là chính chỗ người dùng phải quyết, không có phương án hợp nào né được. */
  const EXCEPT = new Set(['cluster-store-on-free-budget', 'cluster-store-on-app-host']);
  const GRID_Q = ['size', 'fresh', 'latency', 'ai', 'users', 'budget', 'selfhost'];
  const grid = GRID_Q.reduce((acc, q) => acc.flatMap((p) => [...(q === 'latency' ? [p] : []),
    ...cat.profile.find((x) => x.id === q).choices.map((c) => ({ ...p, [q]: c.id }))]), [{}]);
  const hard = (d, ids) => warnings(cat, normDesign(d)).filter((w) => !w.caveat && !EXCEPT.has(w.id) && w.stages.some((x) => ids.includes(x)));
  const selfWarn = new Set(), misfitGrid = new Set(), wantedSkip = new Set();
  const offArch = new Set(), offStorage = new Set(), minioGrid = new Set();
  const procArch = cat.architectures.find((f) => f.id === 'processing').entries;
  const storArch = cat.architectures.find((f) => f.id === 'storage').entries;
  for (const pp of cat.paths) {
    for (const profile of grid) {
      const r = applyPath(cat, { path: '', profile, stages: {}, edges: {} }, pp.id);
      for (const w of hard(r.next, [...r.filled, ...r.skipped])) selfWarn.add(`${pp.id}/${w.id} ${JSON.stringify(profile)}`);
      const eff = effProfile(cat, r.next);
      for (const sid of r.skipped) {
        const when = cat.stages.find((x) => x.id === sid).when || {};
        for (const [q, ok] of Object.entries(when)) if (eff[q] && ok.includes(eff[q])) wantedSkip.add(`${pp.id}/${sid} ${q}=${eff[q]}`);
      }
      for (const sid of r.filled) {
        for (const o of r.next.stages[sid].pick) {
          const f = fitOf(cat.stages.find((x) => x.id === sid).options.find((x) => x.id === o), eff);
          if (!f.ok) misfitGrid.add(`${pp.id}/${sid}=${o} lệch ${f.miss} ${JSON.stringify(profile)}`);
        }
      }
      const adv = archAdvice(cat, r.next).find((a) => a.family === 'processing');
      const tools = adv.id ? procArch.find((e) => e.id === adv.id).tools : {};
      for (const sid of ['ingest', 'process']) {
        const st = r.next.stages[sid];
        if (!st || st.skip || !tools[sid] || st.pick.some((id) => tools[sid].includes(id))) continue;
        if (tools[sid].some((id) => fitOf(optOf(sid, id), effProfile(cat, r.next)).ok)) offArch.add(`${pp.id}/${adv.id}/${sid}=${st.pick} ${JSON.stringify(profile)}`);
      }
      /* Kho thô, kho phân tích theo kiến trúc lưu trữ đang gợi ý: có công cụ của nó hợp hồ sơ, không làm luật báo ở khâu ấy, thì
       * phải chọn trong số đó. */
      const sAdv = archAdvice(cat, r.next).find((a) => a.family === 'storage');
      const sTools = sAdv.id ? storArch.find((e) => e.id === sAdv.id).tools : {};
      for (const sid of ['raw', 'store']) {
        const st = r.next.stages[sid];
        if (!st || st.skip || !sTools[sid] || st.pick.some((id) => sTools[sid].includes(id))) continue;
        const usable = sTools[sid].filter((id) => fitOf(optOf(sid, id), eff).ok
          && !hard({ ...r.next, stages: { ...r.next.stages, [sid]: { ...st, pick: [id] } } }, [sid]).length);
        if (usable.length) offStorage.add(`${pp.id}/${sAdv.id}/${sid}=${st.pick} (có ${usable}) ${JSON.stringify(profile)}`);
      }
      /* MinIO chỉ khi phải tự host dữ liệu cỡ cụm (MinIO: dữ liệu vừa một máy thì thư mục dự án là đủ). */
      if (r.next.stages.raw?.pick.includes('minio') && !(profile.selfhost === 'yes' && profile.size === 'large')) minioGrid.add(`${pp.id} ${JSON.stringify(profile)}`);
    }
  }
  check('thiết kế: Apply path không chọn phương án (hay bỏ khâu) làm luật báo', !selfWarn.size, [...selfWarn].slice(0, 5).join(' | '));
  check('thiết kế: Apply path không chọn phương án lệch hồ sơ; không phương án nào hợp thì để khâu trống', !misfitGrid.size
    && !applyPath(cat, { path: '', profile: { users: 'public', budget: 'free', selfhost: 'yes' }, stages: {}, edges: {} }, 'api').next.stages.host,
  [...misfitGrid].slice(0, 5).join(' | '));
  /* Lối bỏ khâu mà `when` của khâu nêu đúng câu trả lời (lối report, ai = llm: khâu search): khâu để trống, nên gợi ý kiến
   * trúc (RAG) không ngược với khâu Not needed. */
  const llm = applyPath(cat, { path: '', profile: { ai: 'llm' }, stages: {}, edges: {} }, 'report');
  check('thiết kế: Apply path không bỏ khâu mà hồ sơ nói cần (`when` khớp), kể cả khi lối bỏ', !wantedSkip.size && !llm.next.stages.search
    && !llm.skipped.includes('search'), [...wantedSkip].slice(0, 5).join(' | '));
  check('thiết kế: Apply path chọn Ingestion, Processing trong công cụ của kiến trúc xử lý đang gợi ý (khi có công cụ hợp hồ sơ)',
    !offArch.size, [...offArch].slice(0, 5).join(' | '));
  check('thiết kế: Apply path chọn Raw storage, Analytical store trong công cụ của kiến trúc lưu trữ đang gợi ý (khi có công cụ hợp hồ sơ, không làm luật báo)',
    !offStorage.size, [...offStorage].slice(0, 5).join(' | '));
  /* Nhóm chia tầng không lái Apply path: medallion liệt kê MinIO ở kho thô, theo nó thì mọi pipeline chưa trả lời câu cỡ dữ
   * liệu ra MinIO. */
  const noSize = ['crisp-dm', 'data-pipeline', 'app-feature'].map((id) => [id, applyPath(cat, fromTemplate(templates.find((t) => t.id === id)).design, 'pipeline').next]);
  check('thiết kế: Apply path không theo nhóm chia tầng — MinIO chỉ khi tự host dữ liệu cỡ cụm; pipeline chưa trả lời cỡ dữ liệu (kiến trúc medallion) không ra MinIO',
    !minioGrid.size && noSize.every(([, d]) => archAdvice(cat, d).find((a) => a.family === 'layers').id === 'medallion' && !d.stages.raw?.pick.includes('minio')),
  [...minioGrid].slice(0, 3).join(' | ') + ' ' + noSize.map(([id, d]) => `${id}: ${d.stages.raw?.pick}`).join(', '));
  /* Mỗi kiến trúc được gợi ý có ở mỗi khâu ít nhất một công cụ không làm luật báo; khâu đã quyết theo luật gợi ý cũng thử
   * khi X hợp hồ sơ (luật nói "đã chọn X nên là kiến trúc Y" thì Y phải có công cụ dùng được). Khâu đã quyết nhận nhiều công cụ
   * (`multi`) thì được thêm một công cụ của Y bên cạnh X (dbt cho dữ liệu liên tục: Kafka cần thêm bộ xử lý stream đọc topic).
   * Gợi ý "không cần" thì khâu ấy không bị báo. */
  const decided = [{}, ...cat.architectures.flatMap((f) => f.rules.flatMap((rl) => Object.entries(rl.if).filter(([k]) => stageIds.has(k))
    .reduce((acc, [k, vals]) => acc.flatMap((st) => vals.map((v) => ({ ...st, [k]: v === 'skip' ? { skip: true } : v === 'own' ? { own: 'x' } : P(v) }))), [{}])
    .filter((st) => Object.keys(st).length)))];
  const badArch = new Set();
  for (const path of ['', ...cat.paths.map((x) => x.id)]) {
    for (const profile of grid) {
      for (const stages of path ? [{}] : decided) {
        if (!Object.entries(stages).every(([k, v]) => !v.pick || fitOf(cat.stages.find((x) => x.id === k).options.find((o) => o.id === v.pick[0]), profile).ok)) continue;
        for (const a of archAdvice(cat, normDesign({ path, profile, stages }))) {
          if (a.id === null) continue;
          if (a.id === '') {
            for (const w of hard({ path, profile, stages }, Object.keys(stages))) badArch.add(`${a.family}:"" ${w.id} ${JSON.stringify({ path, profile, stages })}`);
            continue;
          }
          const e = cat.architectures.find((f) => f.id === a.family).entries.find((x) => x.id === a.id);
          for (const [sid, tools] of Object.entries(e.tools)) {
            const plus = Object.keys(stages).filter((k) => k !== sid && stages[k].pick && e.tools[k] && cat.stages.find((x) => x.id === k).multi)
              .reduce((acc, k) => acc.flatMap((st) => [st, ...e.tools[k].map((t) => ({ ...st, [k]: P(...stages[k].pick, t) }))]), [stages]);
            if (!tools.some((t) => plus.some((st) => !hard({ path, profile, stages: { ...st, [sid]: P(t) } }, [sid]).length))) {
              badArch.add(`${a.family}:${a.id}/${sid} ${JSON.stringify({ path, profile, stages: Object.keys(stages) })}`);
            }
          }
        }
      }
    }
  }
  check('kiến trúc: kiến trúc được gợi ý có công cụ không làm luật báo ở mọi khâu của nó', !badArch.size, [...badArch].slice(0, 5).join(' | '));
  /* Mẫu đặt sẵn hồ sơ, lối (PLAN-033): tạo từ mẫu thì có đúng bộ ấy, không phương án nào được chọn; mẫu trống không có.
   * Mỗi bộ đặt sẵn cho gợi ý kiến trúc hợp mẫu; Apply path (lối của mẫu, mẫu không có lối thì mọi lối) không chọn phương án
   * nào lệch hồ sơ hay làm luật báo (trừ `caveat`); Ingestion, Processing nằm trong công cụ của kiến trúc xử lý đang gợi ý,
   * Raw storage, Analytical store trong công cụ của kiến trúc lưu trữ đang gợi ý. */
  const blankWs = fromTemplate(templates.find((t) => !t.steps.length));
  check('mẫu đặt sẵn: mẫu trống không có System design; mọi mẫu khác có', blankWs.design === null && templates.filter((t) => t.steps.length).every((t) => presetDesign(t)));
  const PRESET_ARCH = {
    'crisp-dm': { storage: null, layers: null, processing: null, app: null, ml: null },
    'big-data-ds': { storage: 'lakehouse', layers: 'medallion', processing: 'streaming' },
    'it5425-sports': { storage: 'files-db', layers: 'medallion', processing: 'batch-etl', app: 'static-report', ml: null },
    'stats-report': { storage: 'files-db', layers: 'two-layers', processing: 'batch-etl', app: 'static-report' },
    'app-feature': { app: 'client-server' },
    'data-pipeline': { layers: 'medallion', processing: 'batch-etl', app: 'static-report' },
    'lakehouse-oss': { storage: 'lakehouse', layers: 'medallion', processing: 'batch-elt', app: 'static-report' },
  };
  /* Kiến trúc mẫu chọn sẵn (PLAN-042): chỉ khi đúng ý mẫu — lakehouse-oss là lakehouse có medallion; it5425-sports cố ý dựng
   * lakehouse cho dữ liệu nhỏ để học quản trị dữ liệu. Mẫu khác để trống. */
  const PRESET_CHOSEN = {
    'it5425-sports': { storage: 'lakehouse', layers: 'medallion', processing: 'batch-elt' },
    'lakehouse-oss': { storage: 'lakehouse', layers: 'medallion' },
  };
  const stageOf = (id) => cat.stages.find((x) => x.id === id);
  /** Phương án hợp hồ sơ, kể cả hồ sơ mà kiến trúc người dùng chọn đứng trên (PLAN-042). */
  const fitsIn = (d, sid, o) => rankOptions(stageOf(sid), effProfile(cat, d), pathOf(cat, d), stageLists(cat, d, sid, false)).find((x) => x.opt.id === o).ok;
  const plans = {};
  for (const t of templates.filter((x) => x.design)) {
    const ws = fromTemplate(t), pre = presetDesign(t);
    check(`mẫu đặt sẵn ${t.id}: dự án mới có đúng hồ sơ, lối của mẫu, chưa chọn phương án; đổi một câu thì không còn là bộ đặt sẵn`,
      eq(ws.design, { ...pre, stages: {}, edges: {} }) && isPreset(ws.design, pre)
      && !isPreset({ ...ws.design, profile: { ...ws.design.profile, [Object.keys(pre.profile)[0]]: 'x' } }, pre)
      && !isPreset({ ...ws.design, profile: { ...ws.design.profile, users: ws.design.profile.users === 'me' ? 'few' : 'me' } }, pre),
    JSON.stringify(ws.design));
    const got = Object.fromEntries(archAdvice(cat, ws.design).map((a) => [a.family, a.id]));
    const want = PRESET_ARCH[t.id] || {};
    check(`mẫu đặt sẵn ${t.id}: gợi ý kiến trúc`, !!PRESET_ARCH[t.id] && Object.entries(want).every(([f, id]) => got[f] === id), JSON.stringify(got));
    const chosen = Object.fromEntries(archState(cat, ws.design).filter((a) => a.chosen && !a.viaPath).map((a) => [a.family, a.chosen]));
    check(`mẫu đặt sẵn ${t.id}: kiến trúc chọn sẵn`, eq(chosen, PRESET_CHOSEN[t.id] || {}), JSON.stringify(chosen));
    const prof = effProfile(cat, ws.design);
    const bad = [];
    for (const path of pre.path ? [pre.path] : cat.paths.map((x) => x.id)) {
      const r = applyPath(cat, ws.design, path);
      if (path === pre.path) plans[t.id] = r.next;
      for (const w of warnings(cat, r.next).filter((x) => !x.caveat)) bad.push(`${path}: luật ${w.id}`);
      for (const [sid, st] of Object.entries(r.next.stages)) {
        for (const o of st.pick) if (!fitsIn(r.next, sid, o)) bad.push(`${path}: ${sid}=${o} lệch hồ sơ`);
      }
      const adv = archState(cat, r.next).find((x) => x.family === 'processing');
      const tools = adv.id ? cat.architectures.find((f) => f.id === 'processing').entries.find((e) => e.id === adv.id).tools : {};
      for (const sid of ['ingest', 'process']) {
        const st = r.next.stages[sid];
        if (st && !st.skip && tools[sid] && !st.pick.some((o) => tools[sid].includes(o))) bad.push(`${path}: ${sid}=${st.pick} ngoài kiến trúc ${adv.id}`);
      }
      const sAdv = archState(cat, r.next).find((x) => x.family === 'storage');
      const sTools = sAdv.id ? cat.architectures.find((f) => f.id === 'storage').entries.find((e) => e.id === sAdv.id).tools : {};
      for (const sid of ['raw', 'store']) {
        const st = r.next.stages[sid];
        if (st && !st.skip && sTools[sid] && !st.pick.some((o) => sTools[sid].includes(o))) bad.push(`${path}: ${sid}=${st.pick} ngoài kiến trúc ${sAdv.id}`);
      }
    }
    check(`mẫu đặt sẵn ${t.id}: Apply path không làm luật báo, không chọn phương án lệch hồ sơ (trừ câu kiến trúc chọn đứng trên), Ingestion và Processing theo kiến trúc xử lý, Raw storage và Analytical store theo kiến trúc lưu trữ (chọn, hay gợi ý)`, !bad.length && Object.keys(prof).length > 0, bad.join(' | '));
  }
  const pick = (id, sid) => plans[id]?.stages[sid]?.skip ? 'skip' : plans[id]?.stages[sid]?.pick.join('+');
  check('mẫu đặt sẵn lakehouse-oss: Apply path chọn công cụ tự host — MinIO + Iceberg + Polaris, dbt + dbt test, DuckDB trên Iceberg, Superset',
    pick('lakehouse-oss', 'raw') === 'minio+iceberg+polaris' && pick('lakehouse-oss', 'process') === 'dbt' && pick('lakehouse-oss', 'validate') === 'dbt-tests'
    && pick('lakehouse-oss', 'store') === 'duckdb-iceberg' && pick('lakehouse-oss', 'app') === 'superset'
    && Object.entries(plans['lakehouse-oss'].stages).every(([sid, st]) => st.pick.every((o) => !stageOf(sid).options.find((x) => x.id === o).fit.selfhost || fitOf(stageOf(sid).options.find((x) => x.id === o), { selfhost: 'yes' }).ok)),
  JSON.stringify(plans['lakehouse-oss']?.stages));
  check('mẫu đặt sẵn stats-report: Apply path ra thư mục dự án, notebook + báo cáo, không phục vụ model; nhóm model thành không cần',
    pick('stats-report', 'raw') === 'project-folder' && pick('stats-report', 'app') === 'notebook-report' && pick('stats-report', 'serve') === 'skip'
    && archAdvice(cat, plans['stats-report']).find((a) => a.family === 'ml').id === '');
  /* it5425-sports (PLAN-041, PLAN-042): dữ liệu nhỏ, trả lời thật; kiến trúc chọn sẵn là lakehouse tự host, batch ELT, nên Apply
   * path ra stack của mẫu: MinIO + Iceberg + Polaris, dbt, dbt test, DuckDB trên Iceberg, Superset, Docker Compose; không luật báo. */
  check('mẫu đặt sẵn it5425-sports: Apply path ra MinIO + Iceberg + Polaris, dbt, dbt test, DuckDB trên Iceberg, Superset, Docker Compose; mọi phương án tự host',
    pick('it5425-sports', 'raw') === 'minio+iceberg+polaris' && pick('it5425-sports', 'process') === 'dbt' && pick('it5425-sports', 'validate') === 'dbt-tests'
    && pick('it5425-sports', 'store') === 'duckdb-iceberg' && pick('it5425-sports', 'app') === 'superset' && pick('it5425-sports', 'package') === 'docker-compose'
    && !warnings(cat, plans['it5425-sports']).filter((w) => !w.caveat).length
    && Object.entries(plans['it5425-sports'].stages).every(([sid, st]) => st.pick.every((o) => fitOf(stageOf(sid).options.find((x) => x.id === o), { selfhost: 'yes' }).ok)),
  JSON.stringify(Object.fromEntries(Object.keys(plans['it5425-sports'].stages).map((k) => [k, pick('it5425-sports', k)]))));
  check('mẫu đặt sẵn data-pipeline: Apply path có lịch chạy và cổng chất lượng', !!pick('data-pipeline', 'ingest') && !!pick('data-pipeline', 'validate'));
  const bd = effProfile(cat, fromTemplate(templates.find((t) => t.id === 'big-data-ds')).design);
  check('mẫu đặt sẵn big-data-ds: khâu xử lý gợi ý công cụ stream của cụm, Spark MLlib hợp hồ sơ, pandas thì không',
    ['spark-streaming', 'flink'].includes(rankOptions(stageOf('process'), bd)[0].opt.id)
    && fitOf(stageOf('train').options.find((o) => o.id === 'spark-mllib'), bd).ok && !fitOf(stageOf('process').options.find((o) => o.id === 'pandas'), bd).ok,
  rankOptions(stageOf('process'), bd)[0].opt.id);
  check('mẫu đặt sẵn crisp-dm: dữ liệu bảng thì khâu gán nhãn thường không cần', notNeededBy(stageOf('label'), effProfile(cat, fromTemplate(templates[0]).design)).includes('kind'));
  /* Không mẫu nào có kiến trúc model khi chưa quyết Training (bộ đặt sẵn, và sau Apply path khi lối để Training là maybe). */
  const mlOf = (d) => archAdvice(cat, d).find((a) => a.family === 'ml').id;
  const isOpen = (d, k) => !d.stages[k] || (!d.stages[k].skip && !d.stages[k].pick.length && !d.stages[k].own);
  const mlBad = templates.filter((t) => t.design).flatMap((t) => {
    const d0 = fromTemplate(t).design;
    return [d0, ...(d0.path ? [plans[t.id]] : cat.paths.map((pp) => applyPath(cat, d0, pp.id).next))]
      .filter((d) => isOpen(d, 'train') && isOpen(d, 'serve') && effProfile(cat, d).ai !== 'llm' && mlOf(d) !== null)
      .map((d) => `${t.id}${d.path ? '/' + d.path : ''}: ${mlOf(d)}`);
  });
  check('mẫu đặt sẵn: chưa quyết Training, Serving thì không gợi ý kiến trúc model (it5425-sports, app-feature, stats-report, data-pipeline, lakehouse-oss)',
    !mlBad.length && mlOf(plans['it5425-sports']) === null && mlOf(plans['data-pipeline']) === null && mlOf(plans['lakehouse-oss']) === null, mlBad.join(' | '));
  /* big-data-ds với lối pipeline: kho phân tích không phải BigQuery đọc R2; giám sát lag Kafka; xử lý bằng công cụ stream của cụm. */
  const bdTpl = templates.find((t) => t.id === 'big-data-ds');
  const bdPipe = applyPath(cat, fromTemplate(bdTpl).design, 'pipeline').next;
  const bdp = (sid) => (bdPipe.stages[sid]?.skip ? 'skip' : bdPipe.stages[sid]?.pick.join('+'));
  const bdArch = archAdvice(cat, bdPipe).find((a) => a.family === 'processing').id;
  check('mẫu đặt sẵn big-data-ds, lối pipeline: Kafka, Spark Structured Streaming, giám sát lag Kafka; không dbt test thiếu dbt, không ghép R2 với BigQuery',
    bdp('ingest') === 'kafka' && bdp('process') === 'spark-streaming' && bdp('monitor') === 'kafka-lag' && bdArch === 'streaming'
    && bdp('validate') !== 'dbt-tests'
    && !(bdp('store') === 'bigquery' && ['cloudflare-r2', 'minio', 'hdfs'].includes(bdp('raw'))) && !warnings(cat, bdPipe).filter((w) => !w.caveat).length,
  JSON.stringify(Object.fromEntries(Object.keys(bdPipe.stages).map((k) => [k, bdp(k)]))));
  /* big-data-ds, mọi lối: kho thô, kho phân tích là công cụ của lakehouse (bước của mẫu: Delta Lake trên object storage hay
   * HDFS, engine SQL đọc thẳng lake như Trino, DuckDB), không phải kho kết quả của kiến trúc streaming (ClickHouse). Công cụ
   * phải có tên, hay loại (hai chữ cuối của `kind`: "object storage"), được bước của mẫu nhắc tới. */
  const bdText = JSON.stringify(bdTpl.steps).toLowerCase();
  const lakeTools = cat.architectures.find((f) => f.id === 'storage').entries.find((e) => e.id === 'lakehouse').tools;
  const bdLake = cat.paths.flatMap((pp) => {
    const d = applyPath(cat, fromTemplate(bdTpl).design, pp.id).next;
    const why = archAdvice(cat, d).find((a) => a.family === 'storage').id === 'lakehouse' ? [] : [`${pp.id}: không còn lakehouse`];
    return [...why, ...['raw', 'store'].flatMap((sid) => (d.stages[sid]?.pick || []).filter((o) => {
      const opt = optOf(sid, o);
      return !lakeTools[sid].includes(o) || ![opt.name.split(' ')[0], opt.kind.split(' ').slice(-2).join(' ')].some((w) => bdText.includes(w.toLowerCase()));
    }).map((o) => `${pp.id}: ${sid}=${o}`))];
  });
  check('mẫu đặt sẵn big-data-ds, mọi lối: Raw storage, Analytical store là công cụ lakehouse mà bước của mẫu nhắc tới; lối pipeline có cả hai',
    !bdLake.length && !!bdp('raw') && !!bdp('store') && bdp('store') !== 'clickhouse',
  bdLake.join(' | ') + ' ' + JSON.stringify({ raw: bdp('raw'), store: bdp('store') }));
  /* big-data-ds: bộ đặt sẵn không nói số người dùng nên kho phân tích là DuckDB trên Iceberg (một người, vài người). Trả lời
   * "Many people (public)" thì DuckDB lệch hồ sơ (`fit.users`, `avoid` của nó nói dùng Trino): lối pipeline cho Trino, engine
   * nhiều người dùng của lakehouse, vẫn lakehouse, không luật báo. */
  {
    const bdMany = fromTemplate(bdTpl).design;
    bdMany.profile = { ...bdMany.profile, users: 'public' };
    const many = applyPath(cat, bdMany, 'pipeline').next;
    check('mẫu đặt sẵn big-data-ds: không nói số người dùng thì Analytical store là DuckDB trên Iceberg; nhiều người dùng (public) thì Trino, vẫn lakehouse',
      bdp('store') === 'duckdb-iceberg' && eq(many.stages.store?.pick, ['trino']) && lakeTools.store.includes('trino')
      && archAdvice(cat, many).find((a) => a.family === 'storage').id === 'lakehouse' && !warnings(cat, many).filter((w) => !w.caveat).length,
    JSON.stringify({ preset: bdp('store'), many: many.stages.store, warn: warnings(cat, many).map((w) => w.id) }));
  }
  /* lakehouse-oss: Apply path đóng gói bằng Docker Compose; stack ví dụ của mẫu không làm luật báo với bộ đặt sẵn. Bước giả lập
   * luồng (Kafka + một công cụ lịch ở Ingestion, Spark Structured Streaming + dbt ở Processing) không báo khi đổi câu độ mới
   * sang Continuously, như ghi chú bước 7 dặn. */
  const lhPre = fromTemplate(templates.find((t) => t.id === 'lakehouse-oss')).design;
  const lhStack = { raw: P('minio', 'iceberg', 'polaris'), process: P('dbt'), validate: P('dbt-tests'), store: P('duckdb-iceberg'),
    app: P('superset'), package: P('docker-compose', 'requirements'), host: P('own-server'), source: P('web-scraping', 'open-data'), monitor: P('healthchecks') };
  const hardIds = (d) => warnings(cat, normDesign(d)).filter((w) => !w.caveat).map((w) => w.id);
  const lhBatch = hardIds({ ...lhPre, stages: { ...lhStack, ingest: P('prefect') } });
  const lhStream = hardIds({ ...lhPre, profile: { ...lhPre.profile, fresh: 'stream' }, stages: { ...lhStack, source: P('web-scraping', 'open-data', 'event-stream'), ingest: P('kafka', 'cron'), process: P('spark-streaming', 'dbt') } });
  check('mẫu đặt sẵn lakehouse-oss: Apply path chọn Docker Compose; stack của mẫu không làm luật báo, kể cả có luồng giả lập (Kafka + cron)',
    pick('lakehouse-oss', 'package') === 'docker-compose' && !lhBatch.length && !lhStream.length
    && hardIds({ ...lhPre, stages: { ...lhStack, ingest: P('kafka', 'cron') } }).includes('kafka-for-batch-data'),
  JSON.stringify({ package: pick('lakehouse-oss', 'package'), lhBatch, lhStream }));
  designSnapshot(cat);
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
  applyPlan(diff, diff.map(() => 'add'), build);
  check('kế hoạch: lần đầu thêm mỗi khâu một việc có dấu sd; so lại là same', build.subs.length === 2 && build.subs.every((x) => /^stage:[a-z-]+@/.test(x.sd))
    && planDiff(cat, pw).every((x) => x.kind === 'same'));
  check('kế hoạch: sd đi qua JSON', eq(parseImport(toJSON(pw)).workspaces[0].steps[1].subs.map((x) => x.sd), build.subs.map((x) => x.sd)));
  check('kế hoạch: sd không phải chuỗi (mảng, đối tượng có toString) bị bỏ', ['sd' in normSub({ sd: 'stage:raw@abc' }), 'sd' in normSub({ sd: ['stage:raw@abc'] }),
    'sd' in normSub({ sd: { toString: () => 'kept' } }), 'sd' in normSub({ sd: 'kept' })].join() === 'true,false,false,true');
  const procSub = build.subs.find((x) => x.title.startsWith('Processing'));
  setStatus(procSub, 'done');
  procSub.notes += '\nghi chú của tôi';
  procSub.docs.push(normDoc({ kind: 'link', title: 'Của tôi', url: 'https://example.org/x' }));
  pw.design = normDesign({ stages: { process: P('duckdb'), raw: P('project-folder') } });
  diff = planDiff(cat, pw);
  check('kế hoạch: đổi pandas → DuckDB là changed, khâu khác same', kinds(diff) === 'same:stage:raw,changed:stage:process', kinds(diff));
  const rec = applyPlan(diff, diff.map((x) => (x.kind === 'changed' ? 'update' : '')), build);
  check('kế hoạch: Update — một việc, tên mới, Done về New, giữ ghi chú và link của người dùng, thêm link mới',
    build.subs.length === 2 && procSub.title === 'Processing & cleaning: DuckDB' && procSub.status === 'todo' && /ghi chú của tôi/.test(procSub.notes)
    && procSub.docs.some((d) => d.url === 'https://example.org/x') && procSub.docs.some((d) => /duckdb/.test(d.url)) && rec.counts.reset === 1
    && rec.before.get(procSub.id).status === 'done' && planDiff(cat, pw).every((x) => x.kind === 'same'));
  pw.design = normDesign({ stages: { process: P('polars'), raw: { pick: ['project-folder'], skip: true } } });
  diff = planDiff(cat, pw);
  applyPlan(diff, diff.map((x) => (x.kind === 'changed' ? 'replace' : x.kind === 'removed' ? 'cancel' : '')), build);
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
  /* Keep ở "No longer in the design" bền: việc có dấu và việc khớp theo tên đều thành `kept`, lần so sau không hỏi lại;
   * đi qua JSON; khâu quay lại thì là việc mới, không ăn vào việc đã giữ. */
  const kw = normWorkspace({ name: 'K', steps: [{ title: PLAN_STEP.title, subs: [{ id: 'kOld', title: 'Raw storage: Project folder (data/raw)' }] }],
    design: { stages: { process: P('pandas') } } });
  const kb = kw.steps[0];
  diff = planDiff(cat, kw);
  const kinds0 = kinds(diff);
  const kr = applyPlan(diff, diff.map((x) => (x.kind === 'new' ? 'add' : 'keep')), kb);
  const kinds1 = kinds(planDiff(cat, kw));
  kw.design = normDesign({ stages: { raw: P('project-folder') } });
  diff = planDiff(cat, kw);
  const kinds2 = kinds(diff);
  const kr2 = applyPlan(diff, diff.map((x) => (x.kind === 'new' ? 'add' : 'keep')), kb);
  const kj = parseImport(toJSON(kw)).workspaces[0].steps[0].subs;
  check('kế hoạch: Keep bền — việc khớp theo tên và việc có dấu thành kept, so lại không hỏi lại, qua JSON; khâu quay lại là việc mới',
    kinds0 === 'new:stage:process,removed:Raw storage: Project folder (data/raw)' && kr.counts.kept === 1 && !kr.before.get('kOld').sd
    && kinds1 === 'same:stage:process' && kinds2 === 'new:stage:raw,removed:Processing & cleaning: pandas' && kr2.counts.kept === 1
    && eq(kb.subs.map((x) => x.sd === 'kept'), [true, true, false]) && eq(kinds(planDiff(cat, kw)), 'same:stage:raw')
    && eq(kj.map((x) => x.sd), kb.subs.map((x) => x.sd)), `${kinds0} → ${kinds1} → ${kinds2} → ${kinds(planDiff(cat, kw))}`);
  const md = '# P\n\n## System design\n\nProfile: size small · budget free\n\n- dòng lạ\n- Serving: FastAPI [serve: fastapi]\n';
  const back = fromMarkdown(md);
  check('thiết kế: Markdown viết tay — dòng không có [khâu: …] thì cảnh báo, không thành bước', back.workspace.steps.length === 0
    && eq(back.workspace.design, { path: '', profile: { size: 'small', budget: 'free' }, stages: { serve: { pick: ['fastapi'], skip: false, own: '', note: '' } }, edges: {}, arch: {}, archWhy: {} }) && back.warnings.length === 1);
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
  {
    const bw = ws([{ title: 'b', status: 'blocked' }, { title: 'sau' }]);
    check('Next chờ: ô đầu chỉ có Blocked thì báo thẻ ấy, Next rỗng (cùng luật với Pending)', eq(ids(bw), ['b']) && projectNextIds(bw).length === 0);
  }
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
  const H = await import('../js/core/handoffs.js');
  const sub = normSub({ outs: [{ id: 'o1', name: '  a  b ', ref: 'x\ny', note: 7 }, { name: '' }, 'bad', { id: 'o2', name: 'c' }], ins: ['o1', 'z', 'z', 3, ''] });
  check('bàn giao: normSub — đầu ra không tên bị bỏ, chuỗi một dòng; đầu vào bỏ trùng, bỏ id của chính nó',
    eq(sub.outs, [{ id: 'o1', name: 'a b', ref: 'x y', note: '7', final: false }, { id: 'o2', name: 'c', ref: '', note: '', final: false }]) && eq(sub.ins, ['z']));
  const fo = normSub({ outs: [{ id: 'f1', name: 'r', final: true }, { id: 'f2', name: 's', final: 'yes' }, { id: 'f3', name: 't', final: 1 }] });
  check('bàn giao: normSub — final chỉ true khi đúng là true, mặc định false', eq(fo.outs.map((o) => o.final), [true, false, false]));
  const fm = normWorkspace({ steps: [{ title: 'S', outs: [{ name: 'report', ref: 'r/', note: 'n', final: true }, { name: 'Final: not final' },
    { name: 'Final: also final', final: true }, { name: 'plain · x' }], subs: [{ title: 'x', outs: [{ name: 'deck', final: true }] }] }] });
  const fmd = toMarkdown(fm);
  const fb = fromMarkdown(fmd);
  check('bàn giao: Markdown — đầu ra cuối ghi "Final: ", tên thật mở bằng "Final:" thì thoát; đi rồi về giữ nguyên',
    eq(shape(fb.workspace), shape(fm)) && !fb.warnings.length && fmd.includes('  - Final: report · r/  \n    n\n') && fmd.includes('  - \\Final: not final\n')
    && fmd.includes('  - Final: Final: also final\n') && fmd.includes('    - Final: deck\n'), firstDiff(shape(fm), shape(fb.workspace)) + fb.warnings.join(' | '));
  check('bàn giao: Markdown viết tay — "final:" không phân biệt hoa thường', fromMarkdown('# P\n\n## S\n\nOutputs:\n  - final: x · a.csv\n').workspace.steps[0].outs[0].final === true);
  check('bàn giao: JSON, freshCopy, nhân bản giữ final', parseImport(toJSON(fm)).workspaces[0].steps[0].outs[0].final === true
    && freshCopy(fm).steps[0].subs[0].outs[0].final === true);
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
  check('bàn giao: Markdown — tên bên giao trùng thì ghi "N. bước › bước con"', md.includes('  - table ← 1. Clean › A') && md.includes('    - table ← C'));
  /* Bên giao dễ nhầm: (A) bước và bước con (ở bước trước) cùng tên, cùng tên đầu ra; (B) "Data" và "data" cùng một bên giao;
   * (C) hai bước cùng tên, mỗi bước một bước con cùng tên, cùng tên đầu ra; (D) tên bước con mở bằng "2. ". */
  const links = (w) => H.handoffs(w).links.map((l) => `${H.holderTitle(l.to)}<-${l.out.name}@${l.from.i}.${l.from.sub ? l.from.step.subs.indexOf(l.from.sub) : '-'}`).sort();
  const tricky = normWorkspace({ steps: [
    { title: 'Prep', subs: [{ title: 'Train', outs: [{ id: 'o1', name: 'model' }] }, { title: '2. Train', outs: [{ id: 'o5', name: 'cfg' }] }] },
    { title: 'Train', outs: [{ id: 'o2', name: 'model' }], subs: [{ title: 'Clean', outs: [{ id: 'o3', name: 'Data' }, { id: 'o4', name: 'data' }] }] },
    { title: 'S', subs: [{ title: 'T', outs: [{ id: 'o6', name: 'm' }] }] },
    { title: 'S', subs: [{ title: 'T', outs: [{ id: 'o7', name: 'm' }] }] },
    { title: 'Serve', outs: [{ id: 'o8', name: 'cfg' }], subs: [{ title: 'API', ins: ['o2', 'o4', 'o7', 'o5'] }, { title: 'Batch', ins: ['o1', 'o3', 'o6'] }] }] });
  const tmd = toMarkdown(tricky);
  const tb = fromMarkdown(tmd);
  check('bàn giao: Markdown đi rồi về — bước / bước con cùng tên, "Data" / "data", bên giao trùng hẳn, tên mở bằng số: nối đúng bên giao, không cảnh báo',
    eq(links(tb.workspace), links(tricky)) && eq(shape(tb.workspace), shape(tricky)) && !tb.warnings.length, JSON.stringify(links(tb.workspace)) + tb.warnings.join(' | '));
  check('bàn giao: Markdown — bên giao dễ nhầm ghi "N. tên đầy đủ", tên mở bằng số thì thoát',
    tmd.includes('- model ← 2. Train\n') && tmd.includes('- model ← 1. Prep › Train\n') && tmd.includes('- m ← 4. S › T\n')
    && tmd.includes('- data ← Clean\n') && tmd.includes('- cfg ← \\2. Train\n'), JSON.stringify(tmd.split('## 5.')[1]));
  /* File xuất bằng khuôn cũ (không số, tên ngắn khi bước trùng tên bước con) vẫn nối đúng. */
  const old = '# P\n\n## 1. Prep\n\n- [ ] Train\n  Outputs:\n    - model\n\n## 2. Train\n\nOutputs:\n  - model\n\n## 3. Serve\n\n- [ ] API\n  Inputs:\n    - model ← Train\n- [ ] Batch\n  Inputs:\n    - model ← Prep › Train\n';
  const ob = fromMarkdown(old);
  check('bàn giao: Markdown khuôn cũ — "model ← Train" là bước Train, "Prep › Train" là bước con', eq(shape(ob.workspace).steps[2].subs.map((x) => x.ins), [['1.-.0'], ['0.0.0']]) && !ob.warnings.length,
    JSON.stringify(shape(ob.workspace).steps[2].subs.map((x) => x.ins)) + ob.warnings.join(' | '));
  check('bàn giao: JSON đi rồi về giữ nguyên', eq(shape(parseImport(toJSON(ws)).workspaces[0]), shape(ws)));
  const hand = '# P\n\n## Make\n\nOutputs:\n  - clean · data/c.csv · hợp đồng viết cùng dòng\n  - dup\n\n- [ ] Other\n  Outputs:\n    - dup\n\n## Use\n\nInputs:\n  - clean\n  - dup\n  - missing ← Make\n\n- [ ] x\n  Inputs:\n    - dup ← Other\n';
  const hb = fromMarkdown(hand);
  const hs = shape(hb.workspace);
  check('bàn giao: Markdown viết tay — note cùng dòng, tên trùng không có bên giao thì lấy cái đầu và cảnh báo, không có thì cảnh báo',
    eq(hs.steps[0].outs[0], { name: 'clean', ref: 'data/c.csv', note: 'hợp đồng viết cùng dòng', final: false }) && eq(hs.steps[1].ins, ['0.-.0', '0.-.1'])
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
    && [...H.ioStatus(g2c).values()].filter((v) => v.in === 'bad').length === 3); // hai bước con và bước gộp chúng
  const named = normWorkspace({ steps: [{ title: 'A', subs: [{ title: 'P', outs: [{ id: 'o', name: '(deleted output)' }] }] }, { title: 'B', subs: [{ title: 'U', ins: ['o'] }] }] });
  const nb = fromMarkdown(toMarkdown(named));
  check('bàn giao: đầu ra thật tên "(deleted output)" vẫn nối (dòng có "←")', eq(shape(nb.workspace), shape(named)) && !nb.warnings.length, nb.warnings.join(' | '));
  check('bàn giao: consumersOf — bên nhận của bước và bước con làm lại, trừ chính chúng', eq(H.consumersOf(ws, [ws.steps[0], ws.steps[0].subs[2]]).map(H.holderTitle), ['Backend', 'A', 'API']));
}

/* Hộp sửa: đầu vào treo tính theo chỗ đang chọn (heldInfoAt, handoffsAt), không đổi dữ liệu thật. */
{
  const ws = normWorkspace({ steps: [
    { id: 't1', title: 'First', subs: [{ id: 'a', title: 'A' }] },
    { id: 't2', title: 'Second', outs: [{ id: 'os', name: 's' }], subs: [{ id: 'b', title: 'B', outs: [{ id: 'ob', name: 'm' }] }, { id: 'c', title: 'C', ins: ['ob'] }] },
    { id: 't3', title: 'Third', subs: [{ id: 'd', title: 'D' }] }] });
  const before = JSON.stringify(ws);
  const at = (...a) => [...CORE.heldInfoAt(ws, ...a).held].sort();
  check('heldAt: bước con giữ chỗ — đầu ra của bước sau thì treo', eq(at('sub', 'a', ['os', 'ob'], null), ['ob', 'os']));
  check('heldAt: bước con đổi sang bước sau bên giao — không treo', eq(at('sub', 'a', ['os', 'ob'], { stepId: 't3', slot: 0, join: false }), []));
  check('heldAt: cùng hàng, đổi ô lên trước bên giao — treo; đầu ra của cả bước cùng hàng không treo',
    eq(at('sub', 'c', ['os', 'ob'], { stepId: 't2', slot: 0, join: false }), ['ob']));
  check('heldAt: bước con mới, bước mới theo chỗ đặt', eq(at('sub', '', ['ob'], { stepId: 't1', slot: 1, join: false }), ['ob'])
    && eq(at('step', '', ['ob'], 0), ['ob']) && eq(at('step', '', ['ob'], 3), []));
  check('heldAt: bước đổi Vị trí', eq(at('step', 't1', ['ob'], null), ['ob']) && eq(at('step', 't1', ['ob'], 2), []));
  check('handoffsAt: dời bên giao ra sau nơi dùng', eq([...CORE.handoffsAt(ws, 'sub', 'b', { stepId: 't3', slot: 0, join: false }).heldKeys], ['c>ob'])
    && !CORE.handoffsAt(ws, 'sub', 'b', null).heldKeys.size);
  const joined = CORE.heldInfoAt(ws, 'sub', 'c', ['ob', 'os'], { stepId: 't2', slot: 0, join: true });
  const ha = CORE.handoffsAt(ws, 'sub', 'b', { stepId: 't2', slot: 0, join: true });
  check('heldInfoAt: nhập ô của bên giao — treo, ghi là cùng ô; đầu ra của cả bước không treo; handoffsAt: parKeys theo chỗ đặt',
    eq([...joined.held], ['ob']) && eq([...joined.par], ['ob']) && eq([...ha.parKeys], ['c>ob']) && eq([...ha.heldKeys], ['c>ob']));
  check('heldAt: không đổi dữ liệu thật', JSON.stringify(ws) === before);
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
  check('io: bước — đầu vào gộp bước con: chỉ nhận trong bước → none; bước con nhận từ bước trước → ok; đầu ra gộp bước con', st(a, 's1') === 'none/ok' && st(a, 's2') === 'ok/ok');
  /* Đầu vào treo, đầu ra chỉ có nơi dùng treo: R (bước 1) dùng đầu ra của W (bước 2). */
  const b = io(normWorkspace({ steps: [
    { id: 't1', title: 'T1', subs: [{ id: 'u', title: 'U', ins: ['ow'] }] },
    { id: 't2', title: 'T2', subs: [{ id: 'w', title: 'W', outs: [{ id: 'ow', name: 'model' }] }] }] }));
  check('io: đầu vào treo → bad, nêu tên đầu ra và bên giao', st(b, 'u') === 'bad/none'
    && eq(b.get('u').inWhy, [{ kind: 'held', id: 'ow', name: 'model', from: 'W', at: '', par: false }]));
  check('io: đầu ra chỉ được dùng bởi liên kết treo → bad, nêu nơi dùng', st(b, 'w') === 'none/bad'
    && eq(b.get('w').outWhy, [{ kind: 'held', id: 'ow', name: 'model', to: ['U'], par: [], live: 0, at: '' }]));
  check('io: bước — mọi đầu ra của bước con không có nơi nhận đang nối → bad', st(b, 't2') === 'none/bad');
  /* Đầu ra không ai dùng; một bước con nhiều đầu ra, một cái không ai dùng; đầu vào trỏ tới đầu ra đã xoá (chưa đọc lại). */
  const c = normWorkspace({ steps: [
    { id: 'v1', title: 'V1', outs: [{ id: 'ov', name: 'spec' }], subs: [{ id: 'x', title: 'X', outs: [{ id: 'ox1', name: 'a' }, { id: 'ox2', name: 'b' }] }] },
    { id: 'v2', title: 'V2', ins: ['ox1'], subs: [{ id: 'y', title: 'Y', ins: ['ox1'] }, { id: 'z', title: 'Z', outs: [{ id: 'oz', name: 'lonely' }] }] }] });
  c.steps[1].subs[0].ins.push('gone');
  c.steps[1].ins.push('gone2');
  const cs = io(c);
  check('io: đầu ra không ai dùng → bad "unused"', st(cs, 'z') === 'none/bad' && eq(cs.get('z').outWhy, [{ kind: 'unused', id: 'oz', name: 'lonely', to: [], par: [], live: 0, at: '' }]));
  check('io: nhiều đầu ra, một cái không ai dùng → bad, nêu đúng cái ấy', st(cs, 'x') === 'none/bad' && eq(cs.get('x').outWhy.map((w) => w.name), ['b']));
  check('io: đầu vào trỏ tới đầu ra không còn → bad "missing"', st(cs, 'y') === 'bad/none' && eq(cs.get('y').inWhy, [{ kind: 'missing', id: 'gone', name: '', from: '', at: '', par: false }]));
  check('io: bước — đối xứng với đầu vào: một đầu ra (của bước, của bước con) chưa dùng → bad dù đầu ra khác được dùng, ghi bước con',
    st(cs, 'v1') === 'none/bad' && eq(cs.get('v1').outWhy.map((w) => [w.name, w.at]), [['spec', ''], ['b', 'X']]), JSON.stringify(cs.get('v1')));
  check('io: bước — đầu vào riêng của bước trỏ tới đầu ra không còn → bad', st(cs, 'v2') === 'bad/bad' && cs.get('v2').inWhy[0].kind === 'missing');
  /* Bước nhận đầu ra của bước con đứng sau nó → đầu vào của bước treo. */
  const d = io(normWorkspace({ steps: [{ id: 'k1', title: 'K1', ins: ['om'] }, { id: 'k2', title: 'K2', subs: [{ id: 'm', title: 'M', outs: [{ id: 'om', name: 'm' }] }] }] }));
  check('io: bước — đầu vào riêng của bước treo → bad', st(d, 'k1') === 'bad/none' && d.get('k1').inWhy[0].from === 'M');
  /* Bước nhận đầu ra của X (bước trước); dời X vào chính bước ấy: đầu vào giờ là việc bên trong → none, không phải ok. */
  const sw = normWorkspace({ steps: [{ id: 'j1', title: 'J1', subs: [{ id: 'jx', title: 'X', outs: [{ id: 'oj', name: 'o' }] }] },
    { id: 'j2', title: 'J2', ins: ['oj'], subs: [{ id: 'jy', title: 'Y' }] }] });
  const swBefore = io(sw).get('j2').in;
  placeSub(sw, sw.steps[0].subs[0], { stepId: 'j2', slot: 0 });
  check('io: bước nhận đầu ra của bước con của chính nó (sau khi dời bước con vào) → đầu vào none', swBefore === 'ok' && io(sw).get('j2').in === 'none'
    && eq(sw.steps[1].ins, ['oj']), `${swBefore} → ${io(sw).get('j2').in}`);
  /* Dời về đúng thứ tự: liên kết nối lại, cả hai bên ok. */
  const e = normWorkspace({ steps: [{ id: 'k1', title: 'K1', ins: ['om'] }, { id: 'k2', title: 'K2', subs: [{ id: 'm', title: 'M', outs: [{ id: 'om', name: 'm' }] }] }] });
  e.steps.reverse();
  const es = io(e);
  check('io: dời về đúng thứ tự thì cả hai bên ok', st(es, 'k1') === 'ok/none' && st(es, 'm') === 'none/ok');
  /* Một đầu ra hai nơi dùng: G (bước 1) treo, H (bước 3) còn nối → bên giao vẫn lỗi, nêu nơi treo kèm số nơi còn nối. */
  const f = io(normWorkspace({ steps: [
    { id: 'h1', title: 'H1', subs: [{ id: 'g', title: 'G', ins: ['oo'] }] },
    { id: 'h2', title: 'H2', subs: [{ id: 'o', title: 'O', outs: [{ id: 'oo', name: 'table' }] }, { id: 'o2', title: 'O2', outs: [{ id: 'oo2', name: 'side' }] }] },
    { id: 'h3', title: 'H3', subs: [{ id: 'hh', title: 'H', ins: ['oo', 'oo2'] }] }] }));
  check('io: đầu ra có một nơi dùng treo, một nơi còn nối → bước con bad, nêu nơi treo và live', st(f, 'o') === 'none/bad'
    && eq(f.get('o').outWhy, [{ kind: 'held', id: 'oo', name: 'table', to: ['G'], par: [], live: 1, at: '' }]) && st(f, 'g') === 'bad/none' && st(f, 'hh') === 'ok/none');
  check('io: bước — một đầu ra có nơi dùng treo → bad dù đầu ra khác còn nối', st(f, 'h2') === 'none/bad' && eq(f.get('h2').outWhy.map((w) => w.name), ['table'])
    && st(f, 'o2') === 'none/ok');
  /* Đầu vào của bước gộp bước con: chỉ nhận trong bước → none; bước con nhận từ bước trước → ok; treo giữa hai bước con cùng
   * bước, mất nguồn ở bước con → bad, ghi tên bước con. */
  const g = normWorkspace({ steps: [
    { id: 'j1', title: 'J1', subs: [{ id: 'ja', title: 'A', outs: [{ id: 'oa', name: 'raw' }] }, { id: 'jb', title: 'B', ins: ['oa'], outs: [{ id: 'ob', name: 'clean' }] }] },
    { id: 'j2', title: 'J2', subs: [{ id: 'jc', title: 'C', ins: ['ob'], outs: [{ id: 'oc', name: 'feat' }] }, { id: 'jc2', title: 'C2', ins: ['oc'] }] },
    { id: 'j3', title: 'J3', subs: [{ id: 'jd', title: 'D', ins: ['oe'] }, { id: 'je', title: 'E', outs: [{ id: 'oe', name: 'late' }] }] },
    { id: 'j4', title: 'J4', subs: [{ id: 'jf', title: 'F', ins: ['oa'] }] }] });
  g.steps[3].subs[0].ins.push('gone');
  const gs = io(g);
  check('io: bước — bước con chỉ nhận từ bước con cùng bước → đầu vào none', st(gs, 'j1') === 'none/ok' && st(gs, 'jb') === 'ok/ok' && !gs.get('j1').inWhy.length);
  check('io: bước — bước con nhận đầu ra của bước trước → đầu vào ok', st(gs, 'j2') === 'ok/ok' && st(gs, 'jc') === 'ok/ok');
  check('io: bước — treo giữa hai bước con cùng bước → đầu vào bad, ghi bước con', st(gs, 'j3') === 'bad/bad' && st(gs, 'jd') === 'bad/none'
    && eq(gs.get('j3').inWhy, [{ kind: 'held', id: 'oe', name: 'late', from: 'E', at: 'D', par: false }]) && eq(gs.get('jd').inWhy[0].at, ''));
  check('io: bước — bước con trỏ tới đầu ra không còn → đầu vào bad, ghi bước con', st(gs, 'j4') === 'bad/none'
    && eq(gs.get('j4').inWhy, [{ kind: 'missing', id: 'gone', name: '', from: '', at: 'F', par: false }]));
  /* Cùng ô song song: P và Q chạy cùng lúc, Q dùng đầu ra của P → treo (Q không chờ được), cả hai chấm lỗi, không mũi tên giữa ô. */
  const pw = normWorkspace({ steps: [{ id: 'p1', title: 'P1', subs: [{ id: 'pp', title: 'P', outs: [{ id: 'op', name: 'cut' }] },
    { id: 'pq', title: 'Q', par: true, ins: ['op'] }, { id: 'pr', title: 'R', ins: ['op'] }] }] });
  const ph = CORE.handoffs(pw), ps = io(pw);
  check('handoffs: bên nhận cùng ô song song với bên giao → treo, có trong parKeys; ô sau vẫn nối, không có parKeys',
    eq([...ph.heldKeys], ['pq>op']) && eq([...ph.parKeys], ['pq>op']) && ph.links.length === 2 && !ph.gaps.get('p1')?.get(-1)
    && eq((ph.gaps.get('p1')?.get(0) || []).map((p) => p.to.h.id), ['pr']));
  check('io: cùng ô song song — bên nhận và bên giao đều bad, ghi là song song', st(ps, 'pq') === 'bad/none' && st(ps, 'pp') === 'none/bad'
    && eq(ps.get('pq').inWhy, [{ kind: 'held', id: 'op', name: 'cut', from: 'P', at: '', par: true }])
    && eq(ps.get('pp').outWhy, [{ kind: 'held', id: 'op', name: 'cut', to: ['Q'], par: ['Q'], live: 1, at: '' }]) && st(ps, 'p1') === 'bad/bad');
  pw.steps[0].subs[1].par = false;
  check('io: tách khỏi ô song song, đứng sau bên giao → nối lại, ok', st(io(pw), 'pq') === 'ok/none' && st(io(pw), 'pp') === 'none/ok');
  /* Đầu ra cuối (final): không ai dùng là ổn; có nơi dùng treo vẫn lỗi; đầu ra thường không ai dùng vẫn lỗi; bước gộp. */
  const fw = normWorkspace({ steps: [
    { id: 'f1', title: 'F1', subs: [{ id: 'fa', title: 'A', outs: [{ id: 'oa', name: 'report', final: true }] },
      { id: 'fb', title: 'B', outs: [{ id: 'ob', name: 'slides', final: true }, { id: 'ob2', name: 'notes' }] }] },
    { id: 'f2', title: 'F2', subs: [{ id: 'fc', title: 'C', ins: ['od'] }, { id: 'fd', title: 'D', outs: [{ id: 'od', name: 'app', final: true }] }] },
    { id: 'f3', title: 'F3', subs: [{ id: 'fe', title: 'E', outs: [{ id: 'oe', name: 'draft' }] }] },
    { id: 'f4', title: 'F4', subs: [{ id: 'fg', title: 'G', outs: [{ id: 'og', name: 'deck', final: true }] }, { id: 'fh', title: 'H', ins: ['og'] }] }] });
  const fs = io(fw);
  check('io: đầu ra cuối không ai dùng → ok, không nêu trong outWhy, có trong finals', st(fs, 'fa') === 'none/ok' && !fs.get('fa').outWhy.length
    && eq(fs.get('fa').finals, ['report']));
  check('io: đầu ra thường không ai dùng cạnh đầu ra cuối → bước con vẫn bad, chỉ nêu cái thường', st(fs, 'fb') === 'none/bad'
    && eq(fs.get('fb').outWhy.map((w) => w.name), ['notes']));
  check('io: bước — một bước con có đầu ra thường không ai dùng → bad dù cạnh đầu ra cuối, ghi bước con', st(fs, 'f1') === 'none/bad'
    && eq(fs.get('f1').outWhy.map((w) => [w.name, w.at]), [['notes', 'B']]) && eq(fs.get('f1').finals, ['report', 'slides']));
  check('io: đầu ra cuối có nơi dùng treo → bad như đầu ra khác', st(fs, 'fd') === 'none/bad' && eq(fs.get('fd').outWhy.map((w) => w.kind), ['held'])
    && !fs.get('fd').finals.length && st(fs, 'f2') === 'bad/bad');
  check('io: đầu ra thường không ai dùng → bad (cả bước)', st(fs, 'fe') === 'none/bad' && st(fs, 'f3') === 'none/bad');
  check('io: đầu ra cuối có nơi dùng đang nối → ok', st(fs, 'fg') === 'none/ok' && st(fs, 'fh') === 'ok/none' && !fs.get('fg').finals.length);
  fw.steps[0].subs[1].outs.pop();
  check('io: bước — mọi đầu ra là đầu ra cuối không ai dùng → ok', st(io(fw), 'f1') === 'none/ok' && st(io(fw), 'fb') === 'none/ok');
  fw.steps[0].subs[0].outs[0].final = false;
  check('io: bỏ final → đầu ra không ai dùng lại bad, ở bước con và ở bước (ghi bước con)', st(io(fw), 'fa') === 'none/bad' && st(io(fw), 'f1') === 'none/bad'
    && eq(io(fw).get('f1').outWhy.map((w) => w.at), ['A']));
}

/* Đầu ra bước chọn từ bước con (`subOuts`): tham chiếu một nguồn, chỉ trỏ vào bước con của chính bước; trạng thái tính một lần;
 * dời / xoá bỏ tham chiếu, Hoàn tác gắn lại; nhân bản đổi id; JSON, Markdown đi rồi về; file cũ không đổi. */
{
  const mk = () => normWorkspace({ steps: [
    { id: 'c1', title: 'Build', outs: [{ id: 'own', name: 'spec', final: true }], subOuts: ['oa', 'oa', 'ob', 'oz', 'own', 7, ''],
      subs: [{ id: 'ca', title: 'Train', outs: [{ id: 'oa', name: 'model.pkl', ref: 'models/m.pkl', note: 'joblib' }] },
        { id: 'cb', title: 'Report', outs: [{ id: 'ob', name: 'report', final: true }, { id: 'ob2', name: 'scratch', final: true }] }] },
    { id: 'c2', title: 'Ship', subOuts: ['oa'], subs: [{ id: 'cz', title: 'Deploy', ins: ['oa'], outs: [{ id: 'oz', name: 'app', final: true }] }] }] });
  const ws = mk();
  check('subOuts: chuẩn hoá — chỉ id đầu ra của bước con trong chính bước, bỏ trùng, bỏ đầu ra riêng của bước, bỏ id bước khác',
    eq(ws.steps[0].subOuts, ['oa', 'ob']) && eq(ws.steps[1].subOuts, []), JSON.stringify(ws.steps.map((x) => x.subOuts)));
  check('subOuts: dữ liệu cũ không có trường → [], không đổi gì khác', eq(normWorkspace({ steps: [{ title: 'S', subs: [{ title: 'x', outs: [{ name: 'o' }] }] }] }).steps[0].subOuts, [])
    && EDIT_FIELDS.step.includes('subOuts'));
  check('subOuts: chosenOuts trả đầu ra thật của bước con (tên, ref theo nguồn), theo thứ tự chọn',
    eq(CORE.chosenOuts(ws.steps[0]).map((c) => [c.out.name, c.sub.id]), [['model.pkl', 'ca'], ['report', 'cb']]));
  ws.steps[0].subs[0].outs[0].name = 'model-v2.pkl';
  check('subOuts: đổi tên đầu ra ở bước con thì bước theo ngay', CORE.chosenOuts(ws.steps[0])[0].out.name === 'model-v2.pkl');
  /* Trạng thái: đầu ra chọn từ bước con tính một lần. */
  const io = CORE.ioStatus(ws);
  check('subOuts: trạng thái tính một lần — bước có 4 đầu ra (riêng + bước con), đầu ra đã chọn không lặp ở outWhy, finals',
    io.get('c1').out === 'ok' && eq(io.get('c1').finals, ['spec', 'report', 'scratch']) && !io.get('c1').outWhy.length, JSON.stringify(io.get('c1')));
  ws.steps[1].subs[0].ins = [];
  const io2 = CORE.ioStatus(ws);
  check('subOuts: đầu ra đã chọn thành không ai dùng → bước con và bước lỗi, nêu một lần, ghi bước con',
    io2.get('ca').out === 'bad' && io2.get('c1').out === 'bad' && eq(io2.get('c1').outWhy.map((w) => [w.name, w.at]), [['model-v2.pkl', 'Train']]));
  /* Dời bước con sang bước khác: bước thôi chọn; Hoàn tác (dời về, gắn lại) trả lại. */
  const mv = mk();
  const back = CORE.subOutsBackup(mv, [mv.steps[0].subs[0]]);
  placeSub(mv, mv.steps[0].subs[0], { stepId: 'c2', slot: 1, join: false, at: 0 });
  const dropped = CORE.pruneSubOuts(mv);
  check('subOuts: dời bước con sang bước khác → bước cũ thôi chọn đầu ra của nó, bước mới không tự chọn; pruneSubOuts báo bước và số',
    eq(mv.steps[0].subOuts, ['ob']) && eq(mv.steps[1].subOuts, []) && dropped.length === 1 && dropped[0].step.id === 'c1' && dropped[0].n === 1);
  check('subOuts: pruneSubOuts lần hai không đổi gì', !CORE.pruneSubOuts(mv).length);
  placeSub(mv, mv.steps[1].subs[1], { stepId: 'c1', slot: 0, join: false, at: 0 });
  back(mv);
  check('subOuts: Hoàn tác dời (về chỗ cũ, gắn lại) → chọn lại đúng thứ tự cũ', eq(mv.steps[0].subOuts, ['oa', 'ob']) && !CORE.pruneSubOuts(mv).length);
  /* Xoá bước con: insBackup gắn lại cả đầu vào nơi khác lẫn lựa chọn của bước. */
  const del = mk();
  const relink = CORE.insBackup(del, [del.steps[0].subs[0]]);
  const gone = takeSub(del, 'ca');
  CORE.pruneSubOuts(del);
  const mid = [...del.steps[0].subOuts];
  placeSub(del, gone, { stepId: 'c1', slot: 0, join: false, at: 0 });
  relink(del);
  check('subOuts: xoá bước con → bước thôi chọn; Hoàn tác gắn lại lựa chọn và đầu vào nơi khác', eq(mid, ['ob']) && eq(del.steps[0].subOuts, ['oa', 'ob'])
    && eq(del.steps[1].subs[0].ins, ['oa']));
  /* Xoá đầu ra ở bước con (hộp sửa): bước thôi chọn nó. */
  const rm = mk();
  rm.steps[0].subs[1].outs = rm.steps[0].subs[1].outs.filter((o) => o.id !== 'ob');
  CORE.pruneSubOuts(rm);
  check('subOuts: xoá đầu ra ở bước con → bước thôi chọn, đầu ra khác giữ', eq(rm.steps[0].subOuts, ['oa']));
  /* Nhân bản dự án / nhập: id mới, lựa chọn trỏ theo; nhân bản bước con: bản sao không được chọn. */
  const fc = freshCopy(mk());
  const ids = fc.steps[0].subs.flatMap((x) => x.outs.map((o) => o.id));
  check('subOuts: freshCopy đổi id, lựa chọn trỏ theo đúng đầu ra mới', fc.steps[0].subOuts.length === 2 && fc.steps[0].subOuts[0] === ids[0]
    && fc.steps[0].subOuts[1] === ids[1] && !fc.steps[0].subOuts.includes('oa'));
  /* JSON, Markdown đi rồi về. */
  const rt = mk();
  rt.steps[0].outs.push({ id: 'ow2', name: 'From sub-step: not a ref', ref: '', note: '', final: false });
  rt.steps[0].subs[1].outs.push({ id: 'ob3', name: 'a · b ← c', ref: '', note: '', final: false });
  rt.steps[0].subs[1].title = 'Report ← final · v2';
  rt.steps[0].subOuts.push('ob3');
  rt.steps[1].subs[0].outs.push({ id: 'oz2', name: 'From sub-step: x', ref: '', note: '', final: true });
  const md = toMarkdown(rt);
  const back2 = fromMarkdown(md);
  const mdOk = md.includes('\nOutputs:\n  - Final: spec\n  - \\From sub-step: not a ref\n  - From sub-step: model.pkl ← Train\n  - From sub-step: report ← Report \\← final \\· v2\n  - From sub-step: a \\· b \\← c ← Report \\← final \\· v2\n')
    && md.includes('    - Final: From sub-step: x\n');
  check('subOuts: Markdown ghi "From sub-step: tên ← bước con" sau đầu ra riêng; tên thật mở bằng chữ ấy thì thoát', mdOk, mdOk ? '' : md);
  check('subOuts: Markdown đi rồi về giữ nguyên, không cảnh báo', eq(shape(rt), shape(back2.workspace)) && !back2.warnings.length,
    firstDiff(shape(rt), shape(back2.workspace)) + back2.warnings.join(' | '));
  const js = parseImport(toJSON(rt));
  check('subOuts: JSON đi rồi về giữ nguyên (id mới)', eq(shape(rt), shape(js.workspaces[0])) && js.workspaces[0].steps[0].subOuts[0] !== 'oa',
    firstDiff(shape(rt), shape(js.workspaces[0])));
  const hand = fromMarkdown('# P\n\n## S\n\nOutputs:\n  - own · x.csv\n  - from sub-step: MODEL.PKL\n  - From sub-step: nope ← Train\n\n- [ ] Train\n  Outputs:\n    - model.pkl\n');
  check('subOuts: Markdown viết tay — nhãn không phân biệt hoa thường, không ghi bước con vẫn khớp theo tên; không thấy thì cảnh báo, bỏ',
    hand.workspace.steps[0].subOuts.length === 1 && hand.workspace.steps[0].subOuts[0] === hand.workspace.steps[0].subs[0].outs[0].id
    && hand.workspace.steps[0].outs.length === 1 && hand.warnings.length === 1 && /not found.*nope ← Train/.test(hand.warnings[0]), JSON.stringify(hand.warnings));
  const old = '# P\n\n## S\n\nOutputs:\n  - own\n\n- [ ] T\n  Outputs:\n    - o\n';
  check('subOuts: file cũ (không có mục From sub-step) nhập như trước, không chọn gì', eq(fromMarkdown(old).workspace.steps[0].subOuts, [])
    && toMarkdown(fromMarkdown(old).workspace).includes('Outputs:\n  - own\n\n- [ ] T'));
  /* Hai tab: subOuts là trường của hộp sửa bước, gộp theo trường. */
  const mg = mergeEdit({ subOuts: ['oa'], title: 'a' }, { subOuts: ['oa', 'ob'], title: 'a' }, { subOuts: ['oa'], title: 'b' });
  check('subOuts: gộp khi lưu — mình đổi lựa chọn, tab kia đổi tên → giữ cả hai', eq(mg.merged, { subOuts: ['oa', 'ob'], title: 'b' }) && !mg.conflicts.length);
}

/* ── Ảnh chụp gợi ý của System design (tools/design-snapshot.json) ──
 * Bắt mọi thay đổi kết quả của `archAdvice` và `warnings` mà luật khác không thấy (đổi thứ tự luật, bớt một giá trị trong `if`).
 * Lưới, suy từ danh mục, mỗi giá trị theo thứ tự danh mục:
 *  - gợi ý, từng nhóm: lối (chưa chọn, mọi lối) × mỗi câu hồ sơ luật của nhóm đọc (chưa trả lời, mọi câu trả lời) ×
 *    (không khâu nào, hoặc một khâu luật của nhóm đọc: từng phương án luật nêu, một phương án luật không nêu, Not needed);
 *  - luật báo: lối × (không hồ sơ, hoặc một câu luật báo đọc với một câu trả lời) × một khâu luật báo đọc (mọi phương án, Not needed);
 *    chỉ ghi thiết kế có luật báo.
 * Đổi danh mục có chủ ý thì sinh lại: node step-planner/tools/test-core.mjs --write-snapshot, xem diff, commit cùng. */
function designSnapshot(cat) {
  const file = fileURLToPath(new URL('./design-snapshot.json', import.meta.url));
  const stageIds = new Set(cat.stages.map((x) => x.id));
  const paths = ['', ...cat.paths.map((p) => p.id)];
  const answers = (q) => cat.profile.find((x) => x.id === q).choices.map((c) => c.id);
  const inOrder = (all, keys) => all.filter((k) => keys.has(k));
  const pick = (v) => (v === 'skip' ? { skip: true } : { pick: [v] });
  const label = (path, profile, stages) => [path, ...Object.entries(profile).map(([k, v]) => `${k}=${v}`), ...Object.entries(stages).map(([k, v]) => `${k}=${v}`)].join('|');
  const advice = {}, grids = {};
  for (const f of cat.architectures) {
    const keys = new Set(f.rules.flatMap((r) => Object.keys(r.if)));
    const qs = inOrder(cat.profile.map((x) => x.id), keys);
    const stages = Object.fromEntries(inOrder(cat.stages.map((x) => x.id), keys).map((sid) => {
      const listed = new Set(f.rules.flatMap((r) => r.if[sid] || []));
      const opts = cat.stages.find((x) => x.id === sid).options.map((o) => o.id);
      return [sid, [...opts.filter((o) => listed.has(o)), ...opts.filter((o) => !listed.has(o)).slice(0, 1), 'skip']];
    }));
    const profiles = qs.reduce((acc, q) => acc.flatMap((p) => [p, ...answers(q).map((a) => ({ ...p, [q]: a }))]), [{}]);
    const variants = [{}, ...Object.entries(stages).flatMap(([sid, vs]) => vs.map((v) => ({ [sid]: v })))];
    const ids = [null, '', ...f.entries.map((e) => e.id)];
    const rows = [];
    for (const path of paths) for (const profile of profiles) for (const st of variants) {
      const st2 = Object.fromEntries(Object.entries(st).map(([k, v]) => [k, pick(v)]));
      const a = archAdvice(cat, normDesign({ path, profile, stages: st2 })).find((x) => x.family === f.id);
      rows.push({ at: label(path, profile, st), id: a.id });
    }
    grids[f.id] = { paths, profile: Object.fromEntries(qs.map((q) => [q, answers(q)])), stages, ids };
    advice[f.id] = rows;
  }
  const wKeys = new Set(cat.checks.flatMap((c) => Object.keys(c.if)));
  const wStages = inOrder(cat.stages.map((x) => x.id), wKeys);
  const wProfiles = [{}, ...inOrder(cat.profile.map((x) => x.id), wKeys).flatMap((q) => answers(q).map((a) => ({ [q]: a })))];
  const warn = {};
  for (const path of paths) for (const profile of wProfiles) for (const sid of wStages) {
    for (const v of [...cat.stages.find((x) => x.id === sid).options.map((o) => o.id), 'skip']) {
      const ids = warnings(cat, normDesign({ path, profile, stages: { [sid]: pick(v) } })).map((x) => x.id);
      if (ids.length) warn[label(path, profile, { [sid]: v })] = ids.join(',');
    }
  }
  /* Mỗi nhóm một chuỗi, một chữ mỗi thiết kế (chữ thứ i của `ids`), cắt dòng 100 chữ cho diff dễ đọc. */
  const enc = (fid) => advice[fid].map((r) => String.fromCharCode(97 + grids[fid].ids.indexOf(r.id))).join('').match(/.{1,100}/g);
  const now = { note: 'Sinh bởi node step-planner/tools/test-core.mjs --write-snapshot; lưới ở designSnapshot() trong file ấy. Không sửa tay.',
    advice: Object.fromEntries(Object.keys(advice).map((fid) => [fid, { ...grids[fid], grid: enc(fid) }])), warnings: warn };
  if (process.argv.includes('--write-snapshot')) {
    writeFileSync(file, JSON.stringify(now, null, 1) + '\n');
    check('ảnh chụp System design: đã sinh lại tools/design-snapshot.json', true, `${Object.values(advice).flat().length} gợi ý, ${Object.keys(warn).length} thiết kế có luật báo`);
    return;
  }
  let old = null;
  try { old = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { /* chưa có file: báo bên dưới */ }
  if (!old) { check('ảnh chụp System design: có tools/design-snapshot.json', false, 'chạy: node step-planner/tools/test-core.mjs --write-snapshot'); return; }
  const diffs = [];
  for (const [fid, rows] of Object.entries(advice)) {
    const o = old.advice[fid];
    const { grid: _g, ...was } = o || {};
    if (!o || !eq(was, grids[fid])) { diffs.push(`${fid}: lưới đổi (danh mục đổi khâu, câu hay kiến trúc)`); continue; }
    const s = o.grid.join('');
    rows.forEach((r, i) => {
      const before = o.ids[s.charCodeAt(i) - 97];
      if (before !== r.id) diffs.push(`${fid} @ ${r.at || '(trống)'}: ${JSON.stringify(before)} → ${JSON.stringify(r.id)}`);
    });
  }
  for (const k of new Set([...Object.keys(old.warnings), ...Object.keys(warn)])) {
    if (old.warnings[k] !== warn[k]) diffs.push(`luật báo @ ${k}: ${old.warnings[k] || '—'} → ${warn[k] || '—'}`);
  }
  check('ảnh chụp System design: gợi ý kiến trúc và luật báo khớp tools/design-snapshot.json (đổi có chủ ý: --write-snapshot)',
    !diffs.length, `${diffs.length} khác: ${diffs.slice(0, 6).join(' | ')}`);
}

/* Thứ còn thiếu để có gợi ý kiến trúc (archMissing): trang Architecture chỉ tới đúng trang (lối, hồ sơ, khâu). */
{
  const { archMissing } = await import('../js/core/design.js');
  const cat = JSON.parse(readFileSync(fileURLToPath(new URL('../data/system-design.json', import.meta.url)), 'utf8'));
  const none = archMissing(cat, null);
  check('kiến trúc thiếu gì: chưa có gì thì thiếu lối và hồ sơ', none.path && none.profile.length > 0 && none.profile.every((id) => cat.profile.some((q) => q.id === id)));
  /* Mỗi mẫu có design: nhóm nào chưa gợi ý thì phải chỉ ra ít nhất một thứ còn thiếu; chưa có lối mà luật cần lối thì nêu lối;
   * mọi nhóm đã gợi ý thì không thiếu gì. Trả lời đúng thứ được chỉ ra thì không còn bị chỉ ra nữa. */
  const bad = [];
  for (const t of templates) {
    const d = normDesign(t.design || null);
    const nulls = archAdvice(cat, d).filter((a) => a.id === null).length;
    const m = archMissing(cat, d);
    const any = m.path || m.profile.length || m.stages.length;
    if (nulls ? !any : any) bad.push(`${t.id}: ${nulls} nhóm chưa gợi ý, thiếu ${JSON.stringify(m)}`);
    if (m.path && d?.path) bad.push(`${t.id}: đã có lối mà vẫn nêu lối`);
    for (const id of m.profile) {
      const q = cat.profile.find((x) => x.id === id);
      const again = archMissing(cat, normDesign({ ...(d || {}), profile: { ...(d?.profile || {}), [id]: q.choices[0].id } }));
      if (again.profile.includes(id)) bad.push(`${t.id}: trả lời ${id} mà vẫn bị nêu`);
    }
  }
  check('kiến trúc thiếu gì: khớp với nhóm chưa gợi ý ở mọi mẫu, không nêu thứ đã có', !bad.length, bad.slice(0, 4).join(' | '));
}

/* Khung nhìn của sơ đồ (js/core/view-math.js): thu phóng quanh điểm, giới hạn, kéo, hai ngón, vừa khung. */
{
  const V = await import('../js/core/view-math.js');
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const under = (v, px, py) => [(px - v.x) / v.k, (py - v.y) / v.k];
  const v0 = { x: 10, y: -20, k: 1.3 };
  const z = V.zoomAt(v0, 2, 200, 150);
  check('view-math: zoomAt giữ điểm của sơ đồ dưới con trỏ', z.k === 2 && under(z, 200, 150).every((u, i) => near(u, under(v0, 200, 150)[i])));
  const back = V.zoomAt(z, v0.k, 200, 150);
  check('view-math: phóng rồi thu về đúng tỉ lệ cũ quanh cùng điểm thì về đúng khung cũ', near(back.x, v0.x) && near(back.y, v0.y) && near(back.k, v0.k));
  check('view-math: tỉ lệ bị kẹp trong [ZOOM_MIN, ZOOM_MAX], giá trị hỏng về 1', V.zoomAt(v0, 100, 0, 0).k === V.ZOOM_MAX && V.zoomAt(v0, 1e-4, 0, 0).k === V.ZOOM_MIN
    && V.clampZoom(NaN) === 1 && V.ZOOM_MIN < 1 && V.ZOOM_MAX > 1);
  const zin = V.wheelZoom(V.HOME, -100, 50, 50), zout = V.wheelZoom(V.HOME, 100, 50, 50);
  check('view-math: Ctrl + bánh xe — deltaY âm phóng to, dương thu nhỏ, giữ điểm dưới con trỏ', zin.k > 1 && zout.k < 1
    && under(zin, 50, 50).every((u) => near(u, 50)) && near(V.wheelZoom(zin, 100, 50, 50).k, 1));
  check('view-math: bánh xe trơn cuộn dọc / ngang, Shift + bánh xe cuộn ngang', JSON.stringify(V.wheelPan(0, 30, false)) === JSON.stringify([-0, -30])
    && JSON.stringify(V.wheelPan(0, 30, true)) === JSON.stringify([-30, 0]) && JSON.stringify(V.wheelPan(12, 5, true)) === JSON.stringify([-12, -5])
    && V.wheelPx(3, 1, 500) === 3 * V.LINE_PX && V.wheelPx(1, 2, 500) === 500 && V.wheelPx(7, 0, 500) === 7);
  const p = V.panBy(V.HOME, 30, -12);
  check('view-math: panBy dời, giữ tỉ lệ', p.x === 30 && p.y === -12 && p.k === 1);
  check('view-math: clampPan không đụng khung ban đầu', JSON.stringify(V.clampPan(V.HOME, 800, 400, 800, 400)) === JSON.stringify(V.HOME));
  const far = V.clampPan({ x: -5000, y: 9000, k: 2 }, 800, 400, 800, 400);
  check('view-math: trục tràn khung — kéo quá xa thì còn KEEP px của sơ đồ trong khung', near(far.x, V.KEEP - 1600) && near(far.y, 400 - V.KEEP) && far.k === 2, JSON.stringify(far));
  const small = V.clampPan({ x: -300, y: 500, k: 0.5 }, 800, 400, 800, 400), mixed = V.clampPan({ x: -5000, y: -90, k: 1 }, 1600, 300, 800, 400);
  check('view-math: trục vừa khung — sơ đồ luôn thấy trọn (lệch làm tròn dưới FIT_EPS vẫn là vừa)', small.x === 0 && small.y === 200
    && near(mixed.x, V.KEEP - 1600) && mixed.y === 0 && V.clampPan({ x: -3, y: 0, k: 1 }, 800.2, 400, 800, 400).x === 0, JSON.stringify({ small, mixed }));
  const fitAll = { x: 0, y: 0, k: 1 };
  check('view-math: bánh xe — sơ đồ vừa khung thì không dời (trả đúng khung cũ, trang cuộn)', V.wheelStep(fitAll, -40, -40, 800, 400, 800, 400) === fitAll
    && V.wheelStep({ x: 10, y: 20, k: 0.5 }, 30, 30, 800, 400, 800, 400).x === 10);
  const wide = { x: 0, y: 0, k: 1 };
  const w1 = V.wheelStep(wide, -100, -100, 1600, 300, 800, 400), w2 = V.wheelStep({ x: -790, y: 0, k: 1 }, -100, 0, 1600, 300, 800, 400);
  check('view-math: bánh xe — chỉ trục tràn khung dời, dừng ở mép sơ đồ; tới mép thì trả khung cũ', w1.x === -100 && w1.y === 0
    && w2.x === -800 && V.wheelStep({ x: -800, y: 0, k: 1 }, -50, 0, 1600, 300, 800, 400).x === -800
    && V.wheelStep(wide, 50, 0, 1600, 300, 800, 400) === wide, JSON.stringify({ w1, w2 }));
  const out = { x: -1500, y: 0, k: 1 };
  check('view-math: bánh xe — khung đã kéo ra ngoài mép không bị giật về, chỉ đi vào', V.wheelStep(out, -20, 0, 1600, 300, 800, 400) === out
    && V.wheelStep(out, 20, 0, 1600, 300, 800, 400).x === -1480);
  const f = V.fit(1000, 500, 500, 500);
  check('view-math: fit vừa khung, nằm giữa, không phóng quá 1', near(f.k, 0.5) && near(f.x, 0) && near(f.y, 125) && V.fit(100, 100, 500, 500).k === 1
    && JSON.stringify(V.fit(0, 10, 10, 10)) === JSON.stringify(V.HOME));
  const m0 = { x: 100, y: 100 };
  const same = V.pinch(v0, m0, 80, m0, 80), dbl = V.pinch(v0, m0, 80, { x: 140, y: 90 }, 160);
  check('view-math: hai ngón — giữ nguyên thì không đổi; xa gấp đôi thì phóng gấp đôi, điểm dưới trung điểm đi theo ngón',
    near(same.x, v0.x) && near(same.y, v0.y) && near(same.k, v0.k)
    && near(dbl.k, 2.6) && under(dbl, 140, 90).every((u, i) => near(u, under(v0, 100, 100)[i])));
  check('view-math: lerpView đi từ a tới b, kẹp t', JSON.stringify(V.lerpView(v0, V.HOME, 0)) === JSON.stringify(v0)
    && JSON.stringify(V.lerpView(v0, V.HOME, 2)) === JSON.stringify(V.HOME) && near(V.lerpView(V.HOME, { x: 10, y: 0, k: 2 }, 0.5).k, 1.5));
  check('view-math: isHome, zoomPct', V.isHome({ x: 0, y: 0, k: 1 }) && !V.isHome(v0) && V.zoomPct(1.25) === '125%' && V.zoomPct(0.333) === '33%');
}

/* Ca nhỏ, mỗi ca giữ đúng một nhánh của logic (danh mục, dự án tự dựng; không phụ thuộc dữ liệu mẫu). */
{
  const pre = { path: 'report', profile: { size: 'small', users: 'me' } };
  check('isPreset: lối khác thì không còn là bộ đặt sẵn', isPreset({ ...pre, stages: {}, edges: {} }, pre)
    && !isPreset({ ...pre, path: 'pipeline', stages: {}, edges: {} }, pre) && !isPreset({ ...pre, path: '', stages: {}, edges: {} }, pre));
  check('isPreset: trả lời thêm một câu, hay bỏ trống một câu của bộ đặt sẵn, thì không còn là bộ đặt sẵn',
    !isPreset({ ...pre, profile: { ...pre.profile, budget: 'free' }, stages: {}, edges: {} }, pre)
    && !isPreset({ ...pre, profile: { size: 'small' }, stages: {}, edges: {} }, pre));

  /* Danh mục tí hon: khâu a có hai phương án đều hợp, a1 đứng đầu gợi ý nhưng làm luật báo; khâu r xếp theo level. */
  const mini = {
    paths: [{ id: 'p', label: 'P', implies: {}, stages: { a: 'need' }, suggest: { a: ['a1', 'a2'] } }],
    profile: [], checks: [{ id: 'x', title: 'X', msg: 'm', if: { a: ['a1'] } }],
    stages: [{ id: 'a', lane: 'data', options: [{ id: 'a1' }, { id: 'a2' }] },
      { id: 'r', lane: 'data', options: [{ id: 'hard', level: 3 }, { id: 'plain' }, { id: 'easy', level: 1 }] }],
  };
  const ap = applyPath(mini, null, 'p');
  check('applyPath: chọn phương án hợp làm ít luật báo nhất, không phải phương án hợp đầu tiên', eq(ap.next.stages.a?.pick, ['a2']) && eq(ap.filled, ['a']),
    JSON.stringify(ap));
  check('rankOptions: cùng hạng thì dễ trước (level 1, không ghi = 2, rồi 3)',
    eq(rankOptions(mini.stages[1], {}).map((x) => x.opt.id), ['easy', 'plain', 'hard']));

  /* Bước X giao ox cho bước con P của chính nó; P giao op cho Q. Bên nhận của {X, P}: chỉ Q (P là một trong các chủ). */
  const own = normWorkspace({ steps: [{ id: 'X', title: 'X', outs: [{ id: 'ox', name: 'ox' }], subs: [
    { id: 'P', title: 'P', ins: ['ox'], outs: [{ id: 'op', name: 'op' }] }, { id: 'Q', title: 'Q', ins: ['op'] }] }] });
  check('consumersOf: chủ nhận đầu ra của chủ khác (cùng nhóm làm lại) không tính là bên nhận',
    eq(CORE.consumersOf(own, [own.steps[0], own.steps[0].subs[0]]).map(CORE.holderTitle), ['Q']));

  /* Xoá bên giao, rồi người dùng thêm đầu vào mới cho bên nhận; Hoàn tác gắn lại đầu vào cũ, giữ đầu vào mới ở cuối. */
  const mk = () => normWorkspace({ steps: [{ id: 's1', title: 'S1', subs: [{ id: 'g', title: 'G', outs: [{ id: 'og', name: 'og' }] },
    { id: 'n', title: 'N', outs: [{ id: 'on', name: 'on' }] }] }, { id: 's2', title: 'S2', subs: [{ id: 'u', title: 'U', ins: ['og'] }] }] });
  const wb = mk();
  const relink = CORE.insBackup(wb, [wb.steps[0].subs[0]]);
  wb.steps[0].subs.splice(0, 1);
  wb.steps[1].subs[0].ins = ['og', 'on'];
  wb.steps[0].subs.unshift(mk().steps[0].subs[0]);
  relink(wb);
  check('insBackup: Hoàn tác giữ đầu vào thêm sau khi xoá', eq(wb.steps[1].subs[0].ins, ['og', 'on']), JSON.stringify(wb.steps[1].subs[0].ins));
  const wc = mk();
  const relink2 = CORE.insBackup(wc, [wc.steps[0].subs[0]]);
  wc.steps[1].subs[0].ins = ['on'];
  relink2(wc);
  check('insBackup: Hoàn tác gắn lại đầu vào cũ trước, đầu vào mới sau', eq(wc.steps[1].subs[0].ins, ['og', 'on']), JSON.stringify(wc.steps[1].subs[0].ins));
}

{
  const two = fromMarkdown('# A\n## 1. S\n- [x] T · done 2026-01-02 · done 2026-01-05\n').workspace.steps[0].subs[0];
  check('Markdown viết tay: hai "· done" thì lấy cái đầu, cái sau giữ trong tên', two.doneAt === '2026-01-02' && two.title === 'T · done 2026-01-05',
    JSON.stringify({ doneAt: two.doneAt, title: two.title }));
}

{
  const V = await import('../js/core/view-math.js');
  /* Sơ đồ hẹp hơn KEEP: kéo hết cỡ vẫn thấy trọn sơ đồ (KEEP bị cắt về bề rộng sơ đồ). */
  const lo = V.clampPan({ x: -500, y: -500, k: 1 }, 30, 20, 800, 400), hi = V.clampPan({ x: 5000, y: 5000, k: 1 }, 30, 20, 800, 400);
  check('view-math: clampPan — sơ đồ hẹp hơn KEEP thì kéo hết cỡ vẫn thấy trọn', lo.x === 0 && lo.y === 0 && hi.x === 770 && hi.y === 380,
    JSON.stringify({ lo, hi }));
}

{ // Sơ đồ luồng của kiến trúc (core/arch-diagram.js): mọi kiến trúc có sơ đồ xếp được; ở khung máy tính (666px) ngang, ở 390px
  // (khung 304px) dọc; hộp không chồng nhau, nằm trong khung; đường nối bắt đầu ở mép hộp nguồn, mũi tên dừng trước mép hộp đích.
  const A = await import('../js/core/arch-diagram.js');
  const cat = JSON.parse(readFileSync(fileURLToPath(new URL('../data/system-design.json', import.meta.url)), 'utf8'));
  const dim = { flow: 28, cross: 20, minBox: 104, maxBox: 168, pad: 8, bar: 3, lh: 16, gap: 2, gpad: 8, tip: 3 };
  const measure = (s) => s.length * 6.6;  // ~ font 12px của trang, rộng tay
  const bad = [];
  for (const f of cat.architectures) {
    for (const e of f.entries) {
      const errs = A.diagramErrors(e.diagram);
      if (errs.length) { bad.push(`${e.id}: ${errs.join('; ')}`); continue; }
      for (const [W, dir] of [[666, 'h'], [304, 'v']]) {
        const L = A.layoutDiagram(e.diagram, W, dim, measure);
        if (!L || L.dir !== dir) { bad.push(`${e.id} @${W}: hướng ${L?.dir}, cần ${dir}`); continue; }
        if (L.width > W + 0.5) bad.push(`${e.id} @${W}: rộng ${L.width}`);
        const over = L.boxes.filter((a) => L.boxes.some((b) => a !== b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
        if (over.length) bad.push(`${e.id} @${W}: hộp chồng ${over.map((b) => b.id).join(', ')}`);
        if (L.boxes.some((b) => b.x < 0 || b.y < 0 || b.x + b.w > L.width || b.y + b.h > L.height)) bad.push(`${e.id} @${W}: hộp ra ngoài khung`);
        if (L.boxes.some((b) => b.label.some((t) => measure(t) > b.w - 2 * dim.pad - dim.bar + 0.5))) bad.push(`${e.id} @${W}: chữ tràn hộp`);
        const at = new Map(L.boxes.map((b) => [b.id, b]));
        for (const x of L.edges) {
          const a = at.get(x.from), b = at.get(x.to);
          const nums = x.d.match(/-?[\d.]+/g).map(Number);
          const [sx, sy] = nums;
          const start = dir === 'h' ? Math.abs(sx - (a.x + a.w)) < 0.01 && Math.abs(sy - (a.y + a.h / 2)) < 0.01 : Math.abs(sx - (a.x + a.w / 2)) < 0.01 && Math.abs(sy - (a.y + a.h)) < 0.01;
          const end = nums.at(-1);
          const stop = dir === 'h' ? Math.abs(end - (b.x - dim.tip)) < 0.01 : Math.abs(end - (b.y - dim.tip)) < 0.01;
          if (!start || !stop) bad.push(`${e.id} @${W}: đường ${x.from} > ${x.to} không chạm mép hộp (${x.d})`);
        }
        if (L.group) {
          const inside = L.boxes.filter((b) => !e.diagram.group.nodes.includes(b.id) && b.x < L.group.x + L.group.w && L.group.x < b.x + b.w && b.y < L.group.y + L.group.h && L.group.y < b.y + b.h);
          if (inside.length) bad.push(`${e.id} @${W}: hộp ngoài nhóm đè khung nhóm: ${inside.map((b) => b.id).join(', ')}`);
        }
      }
    }
  }
  check('sơ đồ kiến trúc: mọi kiến trúc có sơ đồ, xếp được ở 666px (ngang) và 304px (dọc), không chồng, không tràn, đường chạm mép hộp', !bad.length, bad.join(' | '));
  const n = (id, kind = 'run', row) => ({ id, label: id, kind, ...(row == null ? {} : { row }) });
  const err = (d) => A.diagramErrors(d).join('; ');
  check('sơ đồ kiến trúc: diagramErrors bắt đường đi qua hai tầng, vòng, nút chồng, nút lạ trong khung nhóm, nút rời, quá số làn',
    /spans 2 layers/.test(err({ nodes: [n('a'), n('b'), n('c')], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'c' }] }))
    && /cycle/.test(err({ nodes: [n('a'), n('b')], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }))
    && /overlap/.test(err({ nodes: [n('a'), n('b', 'run', 0.5), n('c', 'run', 0)], edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }] }))
    && /inside its box/.test(err({ nodes: [n('a', 'src', 0), n('b', 'run', 0), n('x', 'src', 1), n('c', 'run', 2)], edges: [{ from: 'a', to: 'b' }, { from: 'x', to: 'b' }, { from: 'c', to: 'b' }], group: { label: 'g', nodes: ['a', 'c'] } }))
    && /not connected/.test(err({ nodes: [n('a'), n('b'), n('c')], edges: [{ from: 'a', to: 'b' }] }))
    && /lanes/.test(err({ nodes: [n('a'), n('b'), n('c'), n('d'), n('e')], edges: ['b', 'c', 'd', 'e'].map((x) => ({ from: 'a', to: x })) }))
    && /kind/.test(err({ nodes: [n('a', 'db'), n('b')], edges: [{ from: 'a', to: 'b' }] })),
  err({ nodes: [n('a'), n('b'), n('c')], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'c' }] }));
  const g = A.diagramGrid({ nodes: [n('cat', 'store'), n('s', 'src'), n('a'), n('b')], edges: [{ from: 's', to: 'a' }, { from: 'a', to: 'b' }, { from: 'cat', to: 'b' }] });
  check('sơ đồ kiến trúc: nút gốc đứng sát nút sau nó (catalog cùng tầng với nút trước engine), làn theo thứ tự khai trong tầng',
    eq(g.nodes.map((x) => [x.id, x.layer, x.row]), [['cat', 1, 0], ['s', 0, 0], ['a', 1, 1], ['b', 2, 0]]), JSON.stringify(g.nodes.map((x) => [x.id, x.layer, x.row])));
  check('sơ đồ kiến trúc: wrapText ngắt theo từ, từ dài hơn dòng thì cắt theo ký tự',
    eq(A.wrapText('Spark, Trino, DuckDB', 60, (s) => s.length * 6), ['Spark,', 'Trino,', 'DuckDB']) && eq(A.wrapText('abcdefghij', 30, (s) => s.length * 6), ['abcde', 'fghij']));
}

/* Kiến trúc người dùng chọn (PLAN-042): lưu trong dự án; công cụ đã chọn ở khâu > kiến trúc chọn > hồ sơ; hồ sơ nói khác chỉ là
 * lời nhắc, khâu đã chọn ngược kiến trúc thì báo; Markdown, JSON đi rồi về; id lạ bị bỏ khi có danh mục. */
{
  const cat = JSON.parse(readFileSync(fileURLToPath(new URL('../data/system-design.json', import.meta.url)), 'utf8'));
  const P = (...ids) => ({ pick: ids, skip: false, own: '', note: '' });
  const st = (d, sid) => (d.stages[sid]?.skip ? 'skip' : (d.stages[sid]?.pick || []).join('+'));
  const fam = (d, f) => archState(cat, d).find((a) => a.family === f);
  const ids = (d) => warnings(cat, d).filter((w) => !w.caveat).map((w) => w.id);
  const small = { size: 'small', kind: 'tables', fresh: 'batch', latency: 'batch', users: 'few', budget: 'free', selfhost: 'yes' };
  const base = normDesign({ path: 'pipeline', profile: small });
  const lake = normDesign({ ...base, arch: { storage: 'lakehouse' } });
  const r0 = applyPath(cat, base, 'pipeline').next, r1 = applyPath(cat, lake, 'pipeline').next;
  check('kiến trúc chọn: chưa chọn thì Apply path như cũ (dữ liệu nhỏ: không Iceberg); chọn lakehouse thì kiến trúc thắng hồ sơ: MinIO + Iceberg + Polaris, DuckDB trên Iceberg',
    !st(r0, 'raw').includes('iceberg') && st(r1, 'raw') === 'minio+iceberg+polaris' && st(r1, 'store') === 'duckdb-iceberg' && !ids(r1).length,
  `${st(r0, 'raw')} / ${st(r1, 'raw')} ${st(r1, 'store')} ${ids(r1)}`);
  const s1 = fam(lake, 'storage');
  check('kiến trúc chọn: gợi ý vẫn tính, khác cái đã chọn (hồ sơ nói khác) — không phải luật báo',
    s1.chosen === 'lakehouse' && s1.rec === 'files-db' && s1.id === 'lakehouse' && !!s1.why && !warnings(cat, lake).length, JSON.stringify(s1));
  const mine = normDesign({ ...lake, stages: { raw: P('project-folder') } });
  const r2 = applyPath(cat, mine, 'pipeline').next;
  check('kiến trúc chọn: khâu người dùng đã chọn đứng trên kiến trúc (Apply path không đụng); chọn ngược kiến trúc thì báo',
    st(r2, 'raw') === 'project-folder' && ids(mine).includes('lakehouse-without-table-format')
    && !ids(normDesign({ ...lake, stages: { raw: P('minio', 'iceberg', 'polaris') } })).includes('lakehouse-without-table-format'), ids(mine).join());
  const kappa = normDesign({ ...base, arch: { processing: 'kappa' } });
  const rk = applyPath(cat, kappa, 'pipeline').next;
  const wk = warnings(cat, rk);
  check('kiến trúc chọn: Kappa cho dữ liệu theo ngày — Kafka và công cụ stream; luật hồ sơ ↔ công cụ thành lời nhắc gắn với Kappa, không chặn',
    st(rk, 'ingest').split('+').includes('kafka') && ['python-consumer', 'spark-streaming', 'flink'].some((x) => st(rk, 'process').includes(x))
    && wk.some((w) => w.id === 'kafka-for-batch-data' && w.caveat && w.arch === 'kappa') && !ids(rk).length,
  `${st(rk, 'ingest')} ${st(rk, 'process')} ${wk.map((w) => `${w.id}${w.arch ? '@' + w.arch : ''}`).join()}`);
  check('kiến trúc chọn: chưa chọn thì luật hồ sơ ↔ công cụ vẫn là cảnh báo',
    ids(normDesign({ ...base, stages: { ingest: P('kafka') } })).includes('kafka-for-batch-data'));
  const stream = normDesign({ ...base, arch: { processing: 'lambda' }, stages: { ingest: P('kafka'), process: P('dbt') } });
  check('kiến trúc chọn: Lambda mà Processing chỉ có công cụ lô thì báo thiếu công cụ stream',
    ids(stream).includes('stream-architecture-without-stream-processor') && !ids(stream).includes('lambda-without-batch-layer'), ids(stream).join());
  const ui = rankOptions(cat.stages.find((x) => x.id === 'raw'), effProfile(cat, lake), pathOf(cat, lake), stageLists(cat, lake, 'raw', false));
  const ice = ui.find((x) => x.opt.id === 'iceberg');
  check('kiến trúc chọn: trang khâu xếp công cụ của kiến trúc chọn lên trước, câu hồ sơ bỏ qua có ghi (relaxed)',
    ui[0].opt.id === 'minio' && ui[0].top && ice.ok && eq(ice.relaxed, ['size']) && ice.arch === 'lakehouse', JSON.stringify(ui.slice(0, 3).map((x) => x.opt.id)));
  /* Lưu: Markdown, JSON; id lạ bị bỏ khi có danh mục; kiến trúc mang lối thành `path`. */
  const ws = normWorkspace({ name: 'A', steps: [], design: { ...lake, arch: { storage: 'lakehouse', layers: 'medallion', processing: 'batch-elt', app: 'serverless' },
    archWhy: { storage: 'Để học quản trị dữ liệu: snapshot, catalog', app: 'Hàm theo yêu cầu' } } });
  const md = toMarkdown(ws, cat);
  const back = fromMarkdown(md);
  check('kiến trúc chọn: Markdown ghi `Architecture:` (id) kèm tên cho người đọc, nhập lại đúng, không cảnh báo',
    /^Architecture: storage lakehouse · layers medallion · processing batch-elt · app serverless {2}$/m.test(md) && /^ {2}Where the data lives: Lakehouse/m.test(md)
    && eq(back.workspace.design.arch, ws.design.arch) && !back.warnings.length && eq(shape(ws), shape(back.workspace)), md.split('\n').filter((l) => /Architecture|Where/.test(l)).join(' | '));
  check('kiến trúc chọn: lý do một dòng lưu cùng lựa chọn, Markdown `Why <nhóm>:` đi rồi về, có trong archState',
    /^ {2}Why storage: Để học quản trị dữ liệu: snapshot, catalog {2}$/m.test(md) && eq(back.workspace.design.archWhy, ws.design.archWhy)
    && fam(ws.design, 'storage').reason === 'Để học quản trị dữ liệu: snapshot, catalog' && fam(normDesign({ archWhy: { storage: 'x' } }), 'storage').reason === ''
    && eq(normDesign({ archWhy: { storage: ' a\n b ', mesh: 'y', ml: '' } }, cat).archWhy, { storage: 'a b' }), JSON.stringify(back.workspace.design.archWhy));
  check('kiến trúc chọn: JSON đi rồi về giữ nguyên', eq(parseImport(toJSON(ws)).workspaces[0].design.arch, ws.design.arch));
  const pruned = normDesign({ path: '', arch: { storage: 'mesh', nope: 'lakehouse', processing: 'kappa', app: 'monolith', 'Bad Id': 'x' } }, cat);
  check('kiến trúc chọn: có danh mục thì id lạ bị bỏ; kiến trúc mang lối thành lối (không giữ hai chỗ)',
    eq(pruned.arch, { processing: 'kappa' }) && pruned.path === 'demo'
    && eq(normDesign({ arch: { storage: 'mesh', 'Bad Id': 'x' } }).arch, { storage: 'mesh' }), JSON.stringify(pruned));
  const imp = parseImport(md.replace('app serverless', 'app serverless · ml mesh'), cat);
  check('kiến trúc chọn: nhập có danh mục bỏ kiến trúc lạ, kèm cảnh báo; không danh mục thì giữ (giao diện bỏ qua)',
    eq(imp.workspaces[0].design.arch, ws.design.arch) && imp.warnings.some((w) => /unknown architecture ml mesh/.test(w))
    && parseImport(md.replace('app serverless', 'app serverless · ml mesh')).workspaces[0].design.arch.ml === 'mesh', imp.warnings.join(' | '));
  check('kiến trúc chọn: lối = kiến trúc của nhóm app (qua lối, không lưu ở arch)', (() => {
    const a = fam(normDesign({ path: 'demo' }), 'app');
    return a.chosen === 'monolith' && a.viaPath && !stageLists(cat, normDesign({ path: 'demo' }), 'serve', false).length;
  })());
  /* Mẫu đặt sẵn kiến trúc: dự án mới mang kiến trúc của mẫu; đổi một kiến trúc thì không còn là bộ đặt sẵn. */
  const t = templates.find((x) => x.id === 'it5425-sports');
  const tw = fromTemplate(t), pre = presetDesign(t);
  check('kiến trúc chọn: mẫu it5425-sports đặt sẵn lakehouse, medallion, batch ELT; đổi kiến trúc thì thôi là bộ đặt sẵn',
    eq(tw.design.arch, { storage: 'lakehouse', layers: 'medallion', processing: 'batch-elt' }) && isPreset(tw.design, pre) && /lakehouse có chủ đích/.test(tw.design.archWhy.storage)
    && !isPreset({ ...tw.design, archWhy: {} }, pre)
    && !isPreset({ ...tw.design, arch: { ...tw.design.arch, processing: 'batch-etl' } }, pre) && !isPreset({ ...tw.design, arch: {} }, pre));
}

if (fails) { console.log(`test-core: ${fails} LỖI`); process.exit(1); }
console.log('test-core: OK');
