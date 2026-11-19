/* Prompt, thuần: dựng chữ prompt từ phiên s và kết quả neo d (core/comments.js anchorAll: ordered, orphans,
   anchors), nhãn vị trí L12 / tệp:12-14, tóm tắt Options, tên file tải về. Câu vào prompt bằng tiếng Việt (MDAN-007).
   Nhận xét nhiều phần: mỗi phần tìm thấy một nhãn và một trích dẫn; phần mất neo bị bỏ.
   d.review (tuỳ chọn): dải dòng đã đọc / chưa đọc (core/review.js reviewRanges); chỉ vào prompt khi s.rvPrompt.
   Xuất: buildPrompt, exportName, included, locLabel, optionsSummary, promptSize, rangeLabel.
   Dùng: core/text.js, core/session.js, core/comments.js. */
import { lineOf, oneLine, slug } from './text.js';
import { autoName } from './session.js';
import { partsOf } from './comments.js';

/* Nhận xét vào prompt: theo thứ tự trong văn bản, bỏ nhận xét mất neo. */
export function included(d) { return d.ordered.filter(function (c) { return !d.orphans[c.id]; }); }
/* "L12", "L12-14", hoặc "notes/a.md:12-14" khi có tệp (path). */
export function rangeLabel(a, b, path) {
  var n = a === b ? String(a) : a + '-' + b;
  return path ? path + ':' + n : 'L' + n;
}
/* Các phần tìm thấy của nhận xét c: [{ quote, loc }], loc là nhãn dòng đầu – cuối của neo trong nguồn ('' khi phần ấy
   chỉ tìm thấy ở bản dựng). Chọn ở bản dựng cũng đi qua neo nguồn. */
function found(s, d, c, withPath) {
  var a = d.anchors[c.id], ps = partsOf(c), path = withPath ? s.path.trim() : '';
  if (!a) return [];
  return a.parts.map(function (x, k) {
    if (!x.src && !x.md) return null;
    var loc = x.src ? rangeLabel(lineOf(s.text, x.src[0]), lineOf(s.text, Math.max(x.src[0], x.src[1] - 1)), path) : '';
    return { quote: ps[k].quote, loc: loc };
  }).filter(Boolean);
}
/* Nhãn vị trí của nhận xét: "L12", hoặc "L12, L15-16" khi nhiều phần. */
export function locLabel(s, d, c, withPath) {
  return found(s, d, c, withPath).map(function (f) { return f.loc; }).filter(Boolean).join(', ');
}
function blockQuote(q) {
  return q.trim().replace(/\n{3,}/g, '\n\n').split('\n').map(function (l) { return l.trim() ? '> ' + l : '>'; }).join('\n');
}
/* Dòng đã đọc (MDAN-013): báo AI chỗ nào đã đọc kỹ mà không có nhận xét là ổn. Chưa đánh dấu gì thì ''. */
function reviewLine(r, path) {
  if (!r || !r.done.length) return '';
  var f = function (rs) { return rs.map(function (x) { return rangeLabel(x[0], x[1], path); }).join(', '); };
  return 'Đã đọc kỹ: ' + f(r.done) + '; chỗ nào không có nhận xét là ổn.' + (r.todo.length ? ' Chưa đọc: ' + f(r.todo) + '.' : '');
}
export function buildPrompt(s, d) {
  var items = included(d);
  var parts = [];
  /* Mỗi nhận xét: các phần tìm thấy; tắt số dòng thì không nhãn. */
  var fs = items.map(function (c) {
    return found(s, d, c, true).map(function (f) { return { quote: f.quote, loc: s.lineNums ? f.loc : '' }; });
  });
  var head = s.header.trim(), rv = s.rvPrompt ? reviewLine(d.review, s.path.trim()) : '';
  if (fs.some(function (f) { return f.some(function (x) { return x.loc; }); }) || rv) {
    var note = s.path.trim()
      ? 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.'
      : 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.';
    head = head ? head + '\n' + note : note;
  }
  if (rv) head += '\n' + rv;
  if (head) parts.push(head);
  if (items.length) {
    if (s.fmt === 'block') {
      /* ### 3 · L12, L15-16 rồi mỗi phần một khối trích (cách nhau dòng trống), rồi nhận xét. */
      parts.push(items.map(function (c, i) {
        var loc = fs[i].map(function (f) { return f.loc; }).filter(Boolean).join(', ');
        var q = fs[i].map(function (f) { return blockQuote(f.quote); }).join('\n\n');
        return '### ' + (i + 1) + (loc ? ' · ' + loc : '') + '\n' + q + '\n\n' + c.comment.trim();
      }).join('\n\n'));
    } else {
      /* 3. L12 "q1"; L15-16 "q2" — nhận xét */
      parts.push(items.map(function (c, i) {
        var qs = fs[i].map(function (f) { return (f.loc ? f.loc + ' ' : '') + '"' + oneLine(f.quote) + '"'; }).join('; ');
        return (i + 1) + '. ' + qs + ' — ' + oneLine(c.comment);
      }).join('\n'));
    }
  }
  if (s.footer.trim()) parts.push(s.footer.trim());
  if (s.includeDoc && s.text.trim()) {
    var runs = s.text.match(/`{3,}/g) || [], len = 3;
    runs.forEach(function (r) { if (r.length >= len) len = r.length + 1; });
    var fence = new Array(len + 1).join('`');
    parts.push('Văn bản gốc:\n' + fence + 'markdown\n' + s.text.replace(/\s+$/, '') + '\n' + fence);
  }
  return items.length || s.includeDoc ? parts.join('\n\n') : '';
}
/* "1,234 chars · 210 words", hoặc '' khi chưa có prompt. */
export function promptSize(p) {
  var words = p ? p.trim().split(/\s+/).length : 0;
  return p ? p.length.toLocaleString('en') + ' chars · ' + words.toLocaleString('en') + ' words' : '';
}
/* Dòng tóm tắt cạnh nhãn Options: đang bật gì. */
export function optionsSummary(s) {
  var sum = [s.fmt === 'block' ? 'block' : 'compact'];
  if (s.lineNums) sum.push(s.path.trim() || 'line numbers');
  if (s.includeDoc) sum.push('full text');
  if (s.rvPrompt) sum.push('reviewed');
  if (s.header.trim() || s.footer.trim()) sum.push('header');
  return sum.join(' · ');
}
export function exportName(s) { return slug(s.name || autoName(s.text)) + '-comments.md'; }
