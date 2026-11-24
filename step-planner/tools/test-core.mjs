/* Bài thử của js/core.js (logic thuần), chạy bằng node:  node step-planner/tools/test-core.mjs
 * Mọi mẫu trong data/templates.json phải đi Markdown → về mà không mất gì; JSON cũng vậy. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fromTemplate, toMarkdown, fromMarkdown, parseImport, toJSON, toBackup, shape, progress, nextActionId, projectNextId,
  nextStatus, splitInline, normWorkspace, normSub, counts, slug, fold, parseDate, uniqueName, normDoc, safeUrl,
} from '../js/core.js';
import { parseMd, inline } from '../js/md.js';

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
        { title: 'F huỷ', status: 'cancel', doneWhen: 'y', notes: 'ghi chú sau lý do\n  thụt', cancelReason: 'lý do · có chấm `@x` [a](b)\n\n- gạch\nXong khi: giả\nHuỷ vì: lặp\n  thụt hai\n\\gạch ngược\n    thụt bốn\nTài liệu:', docs: [{ kind: 'link', title: 'L', url: 'https://l.example' }] },
        { title: 'G', status: 'todo', cancelReason: 'bị bỏ vì không huỷ' },
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
check('dấu trạng thái', /- \[ \] A/.test(md) && /- \[~\] B/.test(md) && /- \[x\] C/.test(md) && /- \[!\] D/.test(md) && /- \[-\] E/.test(md)
  && /- \[\/\] F huỷ/.test(md));
check('huỷ: lý do nhiều dòng ghi dưới "Huỷ vì:", dòng sau thụt bốn có thoát', md.includes('\n  Huỷ vì: lý do · có chấm `@x` [a](b)  \n    \\  \n    \\- gạch  \n')
  && md.includes('\n    \\Huỷ vì: lặp  \n') && hard.steps[0].subs[6].cancelReason === '' && !/bị bỏ vì/.test(md));
check('không có người làm: không dòng Người:, @ trong tên được thoát', !md.includes('Người:') && md.includes('- [ ] A \\· \\@giả')
  && !md.split('\n').some((l) => /^- \[/.test(l) && /(^|[^\\])@/.test(l)));
check('đầu file: tên công cụ', md.split('\n')[2] === '> Data Science Step Planner · định dạng 2');
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
  && jd.warnings.some((w) => /3 tài liệu/.test(w)), jd.warnings.join(' | '));
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
check('vòng: khuôn dòng', mdr.includes('\nVòng: 3\n') && mdr.includes('\nQuay lại: 2026-11-01 · vòng 4 · vòng 5 · lạ\n')
  && mdr.includes('\nQuay lại: 2026-11-02 · vòng 2\n') && rounds.steps[3].round === 1 && !/\nVòng: 1/.test(mdr));
const oldR = fromMarkdown('# A\n## 1. S\nQuay lại: 2026-11-20 · lý do cũ\n').workspace.steps[0];
check('vòng: dòng cũ "Quay lại: ngày · lý do" đọc là vòng 2', oldR.revisit.round === 2 && oldR.round === 2 && oldR.revisit.reason === 'lý do cũ');

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
const oldJ = parseImport('{"steps":[{"title":"t","subs":[{"title":"s","owner":"An"}]}],"people":["An",{"b":1}]}');
check('JSON cũ có people / owner: nhập được, bỏ thông tin người, không cảnh báo', !('people' in oldJ.workspaces[0])
  && !('owner' in oldJ.workspaces[0].steps[0].subs[0]) && oldJ.workspaces[0].steps[0].subs[0].title === 's' && oldJ.warnings.length === 0);
check('ngày: kiểm bằng đi rồi về', parseDate('2026-02-31') === '' && parseDate('0000-00-00') === '' && parseDate('9999-99-99') === ''
  && parseDate('2024-02-29') === '2024-02-29' && parseDate('1/2/2026') === '2026-02-01' && normSub({ due: '2026-02-31' }).due === '');
check('tên trùng: (nhập), (nhập 2)', uniqueName('A', ['A']) === 'A (nhập)' && uniqueName('A', ['A', 'A (nhập)']) === 'A (nhập 2)' && uniqueName('B', ['A']) === 'B');

check('tiến độ không tính bỏ qua và huỷ', eq(progress(hard.steps[0].subs), { done: 1, total: 5, pct: 20 }));
check('việc tiếp theo bỏ qua thẻ huỷ', nextActionId({ subs: [{ id: 'a', status: 'cancel' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'todo' }] }) === 'c');
const oldMark = fromMarkdown('# A\n## 1. S\n- [/] huỷ cũ\n  Huỷ vì: không cần\n  ghi chú\n- [?] lạ\n');
check('huỷ: dấu [/] và Huỷ vì: đọc được; dòng thụt hai sau đó là ghi chú', oldMark.workspace.steps[0].subs[0].status === 'cancel'
  && oldMark.workspace.steps[0].subs[0].cancelReason === 'không cần' && oldMark.workspace.steps[0].subs[0].notes === 'ghi chú'
  && oldMark.workspace.steps[0].subs[1].status === 'todo');
check('việc tiếp theo bỏ qua xong và bỏ qua', nextActionId({ subs: [{ id: 'a', status: 'done' }, { id: 'b', status: 'skip' }, { id: 'c', status: 'blocked' }] }) === 'c');
check('việc tiếp theo của dự án: bước đầu còn việc',
  projectNextId({ steps: [{ subs: [{ id: 'a', status: 'done' }] }, { subs: [] }, { subs: [{ id: 'b', status: 'todo' }] }] }) === 'b');
check('vòng trạng thái', nextStatus('todo') === 'doing' && nextStatus('doing') === 'done' && nextStatus('done') === 'todo' && nextStatus('blocked') === 'doing' && nextStatus('cancel') === 'todo');
check('tách theo ·', eq(splitInline('a \\· b · @c · hạn 2026-01-01'), ['a · b', '@c', 'hạn 2026-01-01']));
check('đếm', eq(counts([hard]), { workspaces: 1, steps: 4, subs: 9, log: 2, docs: 1 }));
check('slug, fold', slug('Đồ án IT5425 — thể thao') === 'do-an-it5425-the-thao' && fold('Việc CỦA Tôi') === 'viec cua toi');

if (fails) { console.log(`test-core: ${fails} LỖI`); process.exit(1); }
console.log('test-core: OK');
