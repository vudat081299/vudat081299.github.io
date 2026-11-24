/* Bài thử của js/core.js (logic thuần), chạy bằng node:  node step-planner/tools/test-core.mjs
 * Mọi mẫu trong data/templates.json phải đi Markdown → về mà không mất gì; JSON cũng vậy. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fromTemplate, toMarkdown, fromMarkdown, parseImport, toJSON, toBackup, shape, progress, nextActionId,
  nextStatus, splitInline, normWorkspace, counts, slug, fold,
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

const tplPath = fileURLToPath(new URL('../data/templates.json', import.meta.url));
const { templates } = JSON.parse(readFileSync(tplPath, 'utf8'));

for (const t of templates) {
  const ws = fromTemplate(t);
  const back = fromMarkdown(toMarkdown(ws)).workspace;
  check(`mẫu ${t.id}: Markdown đi rồi về giữ nguyên`, eq(shape(ws), shape(back)), firstDiff(shape(ws), shape(back)));
  const j = parseImport(toJSON(ws)).workspaces[0];
  check(`mẫu ${t.id}: JSON đi rồi về giữ nguyên, id mới`, eq(shape(ws), shape(j)) && j.id !== ws.id);
}

/* Dự án có đủ thứ khó: dấu ·, dấu \, ghi chú nhiều dòng có dòng trống, dòng bắt đầu bằng "Xong khi:", mọi trạng thái. */
const hard = normWorkspace({
  name: 'Khó · thử', templateId: 'crisp-dm', people: ['An · B', '@lạ', 'C\\D'],
  steps: [
    {
      title: 'Bước 1 · có chấm', goal: 'Mục tiêu · a', doneWhen: 'Xong · b', notes: 'dòng 1\n\n  thụt\n\\gạch\nXong khi: không phải',
      revisit: { date: '2026-11-20', reason: 'Dữ liệu thiếu · cần lấy lại' },
      subs: [
        { title: 'A · @giả · hạn 2026-01-01', status: 'todo', owner: 'An · B', due: '2026-12-01', doneWhen: 'x', notes: 'Xong khi: ghi chú\n\nb' },
        { title: 'B\\', status: 'doing', owner: '@lạ' },
        { title: 'C', status: 'done', notes: 'Vì sao: ghi chú' },
        { title: 'D', status: 'blocked', due: '2026-02-03' },
        { title: 'E', status: 'skip' },
      ],
    },
    { title: '2. Nhật ký quyết định', subs: [] },
    { title: 'Ba', revisit: { date: '2026-11-21', reason: '' }, subs: [{ title: '- [x] lồng' }] },
  ],
  log: [
    { date: '2026-11-22', decision: 'Chọn A · không B', why: 'vì\n\n\\x\nVì sao: lặp' },
    { date: '2026-11-23', decision: 'Không lý do', why: '' },
  ],
});
const md = toMarkdown(hard);
const back = fromMarkdown(md);
check('dự án khó: Markdown đi rồi về giữ nguyên', eq(shape(hard), shape(back.workspace)), firstDiff(shape(hard), shape(back.workspace)));
check('dự án khó: không cảnh báo', back.warnings.length === 0, back.warnings.join(' | '));
check('dấu trạng thái', /- \[ \] A/.test(md) && /- \[~\] B/.test(md) && /- \[x\] C/.test(md) && /- \[!\] D/.test(md) && /- \[-\] E/.test(md));
check('owner và hạn trên dòng bước con', md.includes('· @An \\· B · hạn 2026-12-01'));

const bk = parseImport(toBackup([hard, fromTemplate(templates[0])]));
check('sao lưu: hai dự án, id mới', bk.kind === 'backup' && bk.workspaces.length === 2 && bk.workspaces[0].id !== hard.id);
check('sao lưu: giữ nguyên nội dung', eq(shape(bk.workspaces[0]), shape(hard)));

/* Markdown viết tay. */
const hand = fromMarkdown('# Tay\n\n## 1. Một\n- [ ] a · @An\n- [X] b · hạn 2026-05-06\n* [?] c\nchữ lạ\n## Hai\n- [-] d\n').workspace;
check('Markdown viết tay', hand.steps.length === 2 && hand.steps[0].subs[1].status === 'done'
  && hand.steps[0].subs[0].owner === 'An' && hand.steps[0].subs[1].due === '2026-05-06'
  && hand.steps[0].subs[2].status === 'todo' && hand.steps[0].notes === 'chữ lạ' && hand.steps[1].subs[0].status === 'skip');

let threw = '';
try { parseImport('xin chào'); } catch (e) { threw = e.message; }
check('chữ không phải dự án thì báo lỗi', /Không thấy/.test(threw));
threw = '';
try { parseImport('{"a":1}'); } catch (e) { threw = e.message; }
check('JSON lạ thì báo lỗi', /không phải dự án/.test(threw));

check('tiến độ bỏ qua bước bị bỏ', eq(progress(hard.steps[0].subs), { done: 1, total: 4, pct: 25 }));
check('việc tiếp theo bỏ qua xong và bỏ qua', nextActionId({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'blocked' }] }) === 'c');
check('vòng trạng thái', nextStatus('todo') === 'doing' && nextStatus('doing') === 'done' && nextStatus('done') === 'todo' && nextStatus('blocked') === 'doing');
check('tách theo ·', eq(splitInline('a \\· b · @c · hạn 2026-01-01'), ['a · b', '@c', 'hạn 2026-01-01']));
check('đếm', eq(counts([hard]), { workspaces: 1, steps: 3, subs: 6, log: 2 }));
check('slug, fold', slug('Đồ án IT5425 — thể thao') === 'do-an-it5425-the-thao' && fold('Việc CỦA Tôi') === 'viec cua toi');

if (fails) { console.log(`test-core: ${fails} LỖI`); process.exit(1); }
console.log('test-core: OK');
