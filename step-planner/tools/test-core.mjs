/* Bài thử của js/core.js (logic thuần), chạy bằng node:  node step-planner/tools/test-core.mjs
 * Mọi mẫu trong data/templates.json phải đi Markdown → về mà không mất gì; JSON cũng vậy. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fromTemplate, toMarkdown, fromMarkdown, parseImport, toJSON, toBackup, shape, progress, nextActionId, projectNextId,
  nextStatus, splitInline, normWorkspace, normSub, counts, slug, fold, parseDate, uniqueName, renameOwner,
} from '../js/core.js';

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
}

/* Dự án có đủ thứ khó: dấu ·, @, \, chữ "hạn", ghi chú nhiều dòng có dòng trống, dòng trông như mục danh sách / nhãn. */
const hard = normWorkspace({
  name: 'Khó · thử', templateId: 'crisp-dm', people: ['An · B', '@lạ', 'C\\D', 'có `dấu`'],
  notes: 'Ghi chú dự án\n\n- không phải việc\n# không phải tiêu đề\n> không phải trích',
  steps: [
    {
      title: 'Bước 1 · có chấm', goal: 'Mục tiêu · a', doneWhen: 'Xong · b', notes: 'dòng 1\n\n  thụt\n\\gạch\nXong khi: không phải\n- [ ] không phải việc\n1. cũng không',
      revisit: { date: '2026-11-20', reason: 'Dữ liệu thiếu · cần lấy lại' },
      subs: [
        { title: 'A · @giả · hạn 2026-01-01 due 2026-02-02', status: 'todo', owner: 'An · B', due: '2026-12-01', doneWhen: 'x', notes: 'Xong khi: ghi chú\n\nb\n  - [ ] con giả' },
        { title: 'B\\', status: 'doing', owner: '@lạ' },
        { title: 'C (@x, hạn 01/12/2026)', status: 'done', notes: 'Vì sao: ghi chú', owner: 'có `dấu`' },
        { title: 'D', status: 'blocked', due: '2026-02-03' },
        { title: 'E', status: 'skip' },
      ],
    },
    { title: '2. Nhật ký quyết định', subs: [] },
    { title: 'Nhật ký quyết định', subs: [{ title: 'k' }] },
    { title: 'Ba', revisit: { date: '2026-11-21', reason: '' }, subs: [{ title: '- [x] lồng' }] },
  ],
  log: [
    { date: '2026-11-22', decision: 'Chọn A · không B', why: 'vì\n\n\\x\nVì sao: lặp\n- gạch' },
    { date: '2026-11-23', decision: 'Không lý do', why: '' },
  ],
});
const md = toMarkdown(hard);
const back = fromMarkdown(md);
check('dự án khó: Markdown đi rồi về giữ nguyên', eq(shape(hard), shape(back.workspace)), firstDiff(shape(hard), shape(back.workspace)));
check('dự án khó: không cảnh báo', back.warnings.length === 0, back.warnings.join(' | '));
check('dấu trạng thái', /- \[ \] A/.test(md) && /- \[~\] B/.test(md) && /- \[x\] C/.test(md) && /- \[!\] D/.test(md) && /- \[-\] E/.test(md));
check('người làm trong dấu `, không gọi tên tài khoản GitHub', md.includes('· `@An \\· B` · hạn 2026-12-01') && !/(^|[^`\\])@An/m.test(md));
check('đầu file: tên công cụ', md.split('\n')[2] === '> Data Science Step Planner · định dạng 1');
check('xem đẹp trên GitHub: nhãn cách dòng trống, khối có xuống dòng cứng',
  /\nMục tiêu: [^\n]*\n\nXong khi:/.test(md) && /Ghi chú: {2}\n/.test(md));

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
check('viết tay: việc trước bước đầu vào bước "Việc chung"', w.steps[0].title === 'Việc chung' && w.steps[0].subs[0].title === 'việc trước bước đầu');
check('viết tay: "## 1)" và "## Bước 2:" đọc gọn', w.steps[1].title === 'Chuẩn bị' && w.steps[2].title === 'Phân tích');
check('viết tay: @ ở giữa dòng, hạn dd/mm/yyyy trong ngoặc', s0[0].owner === 'An' && s0[0].title === 'Tạo repo' && s0[0].status === 'done'
  && s0[1].title === 'Viết data card' && s0[1].owner === 'Bình' && s0[1].due === '2026-12-01');
check('viết tay: due, [], +, 1., gạch thường, mục lồng', s0[2].due === '2026-12-05' && s0[2].owner === 'Chi'
  && s0[3].title === 'tải dữ liệu' && s0[4].title === 'plus bullet' && s0[5].title === 'numbered'
  && s0[6].title === 'Họp nhóm thứ 5' && s0[6].status === 'todo' && s0[7].title === 'nested child');
check('viết tay: [X], người có dấu cách trong `, hạn yyyy-mm-d', s0[8].status === 'done' && s0[8].owner === 'Dung Lê' && s0[8].due === '2026-12-01');
check('viết tay: nhiều @ — người đầu làm, người sau vào ghi chú', s0[9].owner === 'An' && s0[9].notes === 'Người khác: @Bình');
check('viết tay: ngày sai bị từ chối, có cảnh báo', s0[10].due === '' && hand.warnings.some((x) => /2026-02-31/.test(x)));
check('viết tay: dòng lạ vào ghi chú bước', w.steps[1].notes === '### 1.1 Tiêu đề phụ\nĐoạn văn');
check('viết tay: nhật ký có dòng thường và ngày dd/mm/yyyy', w.log.length === 3 && w.log[0].why === 'dữ liệu đủ'
  && w.log[1].decision === 'Dòng thường trong nhật ký' && w.log[2].date === '2026-11-24' && w.log[2].decision === 'ngày kiểu Việt');
check('viết tay: tiêu đề không số không cảnh báo', !hand.warnings.some((x) => /số thứ tự/.test(x)));
const r4 = fromMarkdown('# X\n## 1) foo\n## 2 bar\n## 3.baz\n## Step 4) qux\n').workspace.steps.map((s) => s.title);
check('tiêu đề bước: 1) · 2 · 3. · Step 4)', eq(r4, ['foo', 'bar', 'baz', 'qux']), r4.join(','));
check('định dạng cũ (Step Planner · định dạng 1, @ không dấu `) vẫn đọc được',
  fromMarkdown('# A\n\n> Step Planner · định dạng 1\n> Người: @An · @B\n\n## 1. S\n- [ ] x · @An · hạn 2026-01-02\n').workspace.steps[0].subs[0].owner === 'An');

let threw = '';
try { parseImport('   '); } catch (e) { threw = e.message; }
check('chữ rỗng thì báo lỗi', /Chưa có nội dung/.test(threw));

/* JSON hỏng hoặc sai khuôn: không bao giờ TypeError, thông báo tiếng Việt. */
const bad = {
  '[1,2,3]': /Không có dự án hợp lệ/, '{}': /không phải dự án/, '{"workspace":{"steps":"abc"}}': /không phải dự án|Không có dự án/,
  '{ not json': /JSON hỏng/, '[[[]]]': /Không có dự án hợp lệ/,
};
for (const [src, re] of Object.entries(bad)) {
  let msg = '';
  try { parseImport(src); msg = 'không báo lỗi'; } catch (e) { msg = e.message; }
  check(`JSON sai khuôn ${src.slice(0, 24)}: báo bằng tiếng Việt`, re.test(msg) && !/TypeError|Cannot read/.test(msg), msg);
}
const skip = parseImport('{"workspaces":[{"name":"a","steps":[null,{"title":"t","subs":[null,5,{"title":"s"}],"revisit":[]}],"log":[null]},7,{"x":1}]}');
check('JSON: bỏ mục không đúng khuôn, có cảnh báo', skip.workspaces.length === 1 && skip.workspaces[0].steps.length === 1
  && skip.workspaces[0].steps[0].subs.length === 1 && skip.workspaces[0].steps[0].revisit === null && skip.warnings.length === 3, skip.warnings.join(' | '));
const people = parseImport('{"steps":[],"people":["a",{"b":1},null,"  ",5]}').workspaces[0].people;
check('JSON: người không phải chuỗi bị bỏ', eq(people, ['a']), people.join(','));
check('ngày: kiểm bằng đi rồi về', parseDate('2026-02-31') === '' && parseDate('0000-00-00') === '' && parseDate('9999-99-99') === ''
  && parseDate('2024-02-29') === '2024-02-29' && parseDate('1/2/2026') === '2026-02-01' && normSub({ due: '2026-02-31' }).due === '');
check('tên trùng: (nhập), (nhập 2)', uniqueName('A', ['A']) === 'A (nhập)' && uniqueName('A', ['A', 'A (nhập)']) === 'A (nhập 2)' && uniqueName('B', ['A']) === 'B');

check('tiến độ bỏ qua bước bị bỏ', eq(progress(hard.steps[0].subs), { done: 1, total: 4, pct: 25 }));
check('việc tiếp theo bỏ qua xong và bỏ qua', nextActionId({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'blocked' }] }) === 'c');
check('việc tiếp theo của dự án: bước đầu còn việc',
  projectNextId({ steps: [{ subs: [{ id: 'a', status: 'done' }] }, { subs: [] }, { subs: [{ id: 'b', status: 'todo' }] }] }) === 'b');
check('vòng trạng thái', nextStatus('todo') === 'doing' && nextStatus('doing') === 'done' && nextStatus('done') === 'todo' && nextStatus('blocked') === 'doing');
check('tách theo ·', eq(splitInline('a \\· b · @c · hạn 2026-01-01'), ['a · b', '@c', 'hạn 2026-01-01']));
check('đếm', eq(counts([hard]), { workspaces: 1, steps: 4, subs: 7, log: 2 }));
check('slug, fold', slug('Đồ án IT5425 — thể thao') === 'do-an-it5425-the-thao' && fold('Việc CỦA Tôi') === 'viec cua toi');
const rn = normWorkspace({ steps: [{ subs: [{ owner: 'A' }, { owner: 'B' }, { owner: 'A' }] }] });
check('đổi tên người làm trên mọi bước con', renameOwner(rn, 'A', 'An') === 2 && rn.steps[0].subs.map((x) => x.owner).join() === 'An,B,An');

if (fails) { console.log(`test-core: ${fails} LỖI`); process.exit(1); }
console.log('test-core: OK');
