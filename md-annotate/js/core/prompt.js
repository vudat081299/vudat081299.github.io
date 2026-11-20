/* Prompt, thuần: dựng chữ prompt từ tuỳ chọn của phiên s, doc của file (text, comments) và kết quả neo d của file ấy
   (core/comments.js anchorAll: ordered, orphans, anchors), nhãn vị trí L12 / tệp:12-14, tóm tắt Options, tên file tải về.
   Câu vào prompt bằng tiếng Việt (MDAN-007). Nhận xét nhiều phần: mỗi phần tìm thấy một nhãn và một trích dẫn; phần mất
   neo bị bỏ. d.review (tuỳ chọn): dải dòng đã đọc / chưa đọc (core/review.js reviewRanges); chỉ vào prompt khi s.rvPrompt.
   Nhãn tệp của một file là session.js fileLabel (tiền tố path + đường dẫn trong cây; '' thì ghi L12).
   Một file: buildPrompt. Gom mọi file (s.promptAll, phiên ≥ 2 file, xem promptsAll): buildPromptAll.
   Xuất: buildPrompt, buildPromptAll, exportName, included, locLabel, optionsSummary, promptsAll, promptSize, rangeLabel.
   Dùng: core/text.js, core/session.js, core/comments.js, core/tree.js. */
import { lineOf, oneLine, slug } from './text.js';
import { autoName, fileCount, fileLabel } from './session.js';
import { partsOf } from './comments.js';
import { filesInOrder } from './tree.js';

/* Nhận xét vào prompt: theo thứ tự trong văn bản, bỏ nhận xét mất neo. */
export function included(d) { return d.ordered.filter(function (c) { return !d.orphans[c.id]; }); }
/* "L12", "L12-14", hoặc "notes/a.md:12-14" khi có nhãn tệp (label). */
export function rangeLabel(a, b, label) {
  var n = a === b ? String(a) : a + '-' + b;
  return label ? label + ':' + n : 'L' + n;
}
/* Các phần tìm thấy của nhận xét c: [{ quote, loc }], loc là nhãn dòng đầu – cuối của neo trong nguồn ('' khi phần ấy
   chỉ tìm thấy ở bản dựng). Chọn ở bản dựng cũng đi qua neo nguồn. */
function found(doc, d, c, label) {
  var a = d.anchors[c.id], ps = partsOf(c);
  if (!a) return [];
  return a.parts.map(function (x, k) {
    if (!x.src && !x.md) return null;
    var loc = x.src ? rangeLabel(lineOf(doc.text, x.src[0]), lineOf(doc.text, Math.max(x.src[0], x.src[1] - 1)), label) : '';
    return { quote: ps[k].quote, loc: loc };
  }).filter(Boolean);
}
/* Nhãn vị trí của nhận xét: "L12", hoặc "L12, L15-16" khi nhiều phần; label là nhãn tệp ('' thì L12). */
export function locLabel(doc, d, c, label) {
  return found(doc, d, c, label || '').map(function (f) { return f.loc; }).filter(Boolean).join(', ');
}
function blockQuote(q) {
  return q.trim().replace(/\n{3,}/g, '\n\n').split('\n').map(function (l) { return l.trim() ? '> ' + l : '>'; }).join('\n');
}
/* Dòng đã đọc (MDAN-013): báo AI chỗ nào đã đọc kỹ mà không có nhận xét là ổn. Chưa đánh dấu gì thì ''. */
function reviewLine(r, label) {
  if (!r || !r.done.length) return '';
  var f = function (rs) { return rs.map(function (x) { return rangeLabel(x[0], x[1], label); }).join(', '); };
  return 'Đã đọc kỹ: ' + f(r.done) + '; chỗ nào không có nhận xét là ổn.' + (r.todo.length ? ' Chưa đọc: ' + f(r.todo) + '.' : '');
}
var NOTE_L = 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.';
var NOTE_FILE = 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.';
/* Phần của một file: nhận xét vào prompt, các phần tìm thấy (tắt số dòng thì không nhãn), dòng đã đọc. */
function fileParts(s, doc, d, label) {
  var items = included(d);
  var fs = items.map(function (c) {
    return found(doc, d, c, label).map(function (f) { return { quote: f.quote, loc: s.lineNums ? f.loc : '' }; });
  });
  var rv = s.rvPrompt && s.lineNums ? reviewLine(d.review, label) : '';   // dòng đã đọc là số dòng
  return { items: items, fs: fs, rv: rv, hasLoc: fs.some(function (f) { return f.some(function (x) { return x.loc; }); }) };
}
/* Các nhận xét của một file, đánh số từ start + 1. */
function itemsText(s, p, start) {
  if (s.fmt === 'block') {
    /* ### 3 · L12, L15-16 rồi mỗi phần một khối trích (cách nhau dòng trống), rồi nhận xét. */
    return p.items.map(function (c, i) {
      var loc = p.fs[i].map(function (f) { return f.loc; }).filter(Boolean).join(', ');
      var q = p.fs[i].map(function (f) { return blockQuote(f.quote); }).join('\n\n');
      return '### ' + (start + i + 1) + (loc ? ' · ' + loc : '') + '\n' + q + '\n\n' + c.comment.trim();
    }).join('\n\n');
  }
  /* 3. L12 "q1"; L15-16 "q2" — nhận xét */
  return p.items.map(function (c, i) {
    var qs = p.fs[i].map(function (f) { return (f.loc ? f.loc + ' ' : '') + '"' + oneLine(f.quote) + '"'; }).join('; ');
    return (start + i + 1) + '. ' + qs + ' — ' + oneLine(c.comment);
  }).join('\n');
}
/* Toàn văn trong khối rào dài hơn mọi dãy backtick của nó. */
function fenced(text) {
  var runs = text.match(/`{3,}/g) || [], len = 3;
  runs.forEach(function (r) { if (r.length >= len) len = r.length + 1; });
  var fence = new Array(len + 1).join('`');
  return fence + 'markdown\n' + text.replace(/\s+$/, '') + '\n' + fence;
}
/* Prompt của một file: doc và kết quả neo d của nó; fileId mặc định là file đang mở (s.open).
   [lời dẫn đầu][câu số dòng][dòng đã đọc] · nhận xét · [lời dẫn cuối] · [Văn bản gốc:] — các khối cách nhau dòng trống.
   Không nhận xét nào vào prompt và không kèm toàn văn thì ''. */
export function buildPrompt(s, doc, d, fileId) {
  var label = fileLabel(s, fileId === undefined ? s.open : fileId), p = fileParts(s, doc, d, label), parts = [];
  var head = s.header.trim();
  if (p.hasLoc || p.rv) head = head ? head + '\n' + (label ? NOTE_FILE : NOTE_L) : label ? NOTE_FILE : NOTE_L;
  if (p.rv) head += '\n' + p.rv;
  if (head) parts.push(head);
  if (p.items.length) parts.push(itemsText(s, p, 0));
  if (s.footer.trim()) parts.push(s.footer.trim());
  if (s.includeDoc && doc.text.trim()) parts.push('Văn bản gốc:\n' + fenced(doc.text));
  return p.items.length || s.includeDoc ? parts.join('\n\n') : '';
}
/* Prompt gom mọi file khi bật s.promptAll và phiên có ≥ 2 file. */
export function promptsAll(s) { return s.promptAll === true && fileCount(s) > 1; }
/* Prompt gom nhiều file. files: [{ fileId, doc, d }] (mỗi file một kết quả neo), xếp lại theo thứ tự hiển thị của cây.
   Phiên chỉ một file thì y hệt buildPrompt của file ấy. Dạng (các khối cách nhau dòng trống):
     [lời dẫn đầu]
     [Vị trí ghi dạng tệp:dòng, … — khi có nhãn dòng hay dòng đã đọc]
     ## Tệp docs/a.md                      ← mỗi file có nhận xét vào prompt hoặc có dòng đã đọc, theo thứ tự cây
     [Đã đọc kỹ: docs/a.md:1-3; …]          ← dòng đã đọc của file (s.rvPrompt)
     1. docs/a.md:3 "trích" — nhận xét      ← số chạy tiếp qua các file; khối: ### 1 · docs/a.md:3
     ## Tệp docs/b.md
     2. docs/b.md:7-9 "trích" — nhận xét
     [lời dẫn cuối]
     [Văn bản gốc của docs/a.md:\n```markdown … ```]   ← s.includeDoc: mọi file có chữ, theo thứ tự cây
   Tên sau "Tệp" là fileLabel (tiền tố path + đường dẫn trong cây), có cả khi tắt số dòng. Không file nào có gì và không
   kèm toàn văn thì ''. */
export function buildPromptAll(s, files) {
  var rank = new Map(filesInOrder(s.nodes).map(function (id, i) { return [id, i]; }));
  var list = files.filter(function (f) { return rank.has(f.fileId); })
    .sort(function (a, b) { return rank.get(a.fileId) - rank.get(b.fileId); });
  if (fileCount(s) < 2) return list.length ? buildPrompt(s, list[0].doc, list[0].d, list[0].fileId) : '';
  var n = 0, loc = false, secs = [], parts = [];
  list.forEach(function (f) {
    var label = fileLabel(s, f.fileId), p = fileParts(s, f.doc, f.d, label);
    if (!p.items.length && !p.rv) return;
    loc = loc || p.hasLoc || !!p.rv;
    var sec = ['## Tệp ' + label];
    if (p.rv) sec.push(p.rv);
    if (p.items.length) sec.push(itemsText(s, p, n));
    n += p.items.length;
    secs.push(sec.join('\n\n'));
  });
  var head = s.header.trim();
  if (loc) head = head ? head + '\n' + NOTE_FILE : NOTE_FILE;
  if (head) parts.push(head);
  parts = parts.concat(secs);
  if (s.footer.trim()) parts.push(s.footer.trim());
  if (s.includeDoc) {
    list.forEach(function (f) {
      if (f.doc.text.trim()) parts.push('Văn bản gốc của ' + fileLabel(s, f.fileId) + ':\n' + fenced(f.doc.text));
    });
  }
  return n || s.includeDoc ? parts.join('\n\n') : '';
}
/* "1,234 chars · 210 words", hoặc '' khi chưa có prompt. */
export function promptSize(p) {
  var words = p ? p.trim().split(/\s+/).length : 0;
  return p ? p.length.toLocaleString('en') + ' chars · ' + words.toLocaleString('en') + ' words' : '';
}
/* Dòng tóm tắt cạnh nhãn Options: đang bật gì. */
export function optionsSummary(s) {
  var all = promptsAll(s), sum = [s.fmt === 'block' ? 'block' : 'compact'];
  if (all) sum.push('all files');
  if (s.lineNums) sum.push((!all && fileLabel(s, s.open)) || 'line numbers');
  if (s.includeDoc) sum.push('full text');
  if (s.rvPrompt && s.lineNums) sum.push('reviewed');
  if (s.header.trim() || s.footer.trim()) sum.push('header');
  return sum.join(' · ');
}
export function exportName(s) { return slug(s.name || autoName(s)) + '-comments.md'; }
