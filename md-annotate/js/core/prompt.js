/* Prompt, thuần: dựng chữ prompt từ phiên s và kết quả neo d (core/comments.js anchorAll: ordered, orphans,
   anchors), nhãn vị trí L12 / tệp:12-14, tóm tắt Options, tên file tải về. Câu vào prompt bằng tiếng Việt (MDAN-007).
   Xuất: buildPrompt, exportName, included, locLabel, optionsSummary, promptSize.
   Dùng: core/text.js, core/session.js. */
import { lineOf, oneLine, slug } from './text.js';
import { autoName } from './session.js';

/* Nhận xét vào prompt: theo thứ tự trong văn bản, bỏ nhận xét mất neo. */
export function included(d) { return d.ordered.filter(function (c) { return !d.orphans[c.id]; }); }
/* Dòng đầu và cuối của neo trong nguồn; chọn ở bản dựng cũng đi qua neo nguồn. */
function lineRange(s, d, c) {
  var a = d.anchors[c.id];
  if (!a || !a.src) return null;
  return [lineOf(s.text, a.src[0]), lineOf(s.text, Math.max(a.src[0], a.src[1] - 1))];
}
/* "L12", "L12-14", hoặc "notes/a.md:12-14" khi có tệp. */
export function locLabel(s, d, c, withPath) {
  var r = lineRange(s, d, c);
  if (!r) return '';
  var n = r[0] === r[1] ? String(r[0]) : r[0] + '-' + r[1];
  var p = withPath ? s.path.trim() : '';
  return p ? p + ':' + n : 'L' + n;
}
export function buildPrompt(s, d) {
  var items = included(d);
  var parts = [];
  var locs = items.map(function (c) { return s.lineNums ? locLabel(s, d, c, true) : ''; });
  var head = s.header.trim();
  if (locs.some(Boolean)) {
    var note = s.path.trim()
      ? 'Vị trí ghi dạng tệp:dòng, tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.'
      : 'Số dòng (L) tính theo văn bản tôi dán; nếu lệch thì tìm đoạn theo trích dẫn.';
    head = head ? head + '\n' + note : note;
  }
  if (head) parts.push(head);
  if (items.length) {
    if (s.fmt === 'block') {
      parts.push(items.map(function (c, i) {
        var q = c.quote.trim().replace(/\n{3,}/g, '\n\n').split('\n').map(function (l) { return l.trim() ? '> ' + l : '>'; }).join('\n');
        return '### ' + (i + 1) + (locs[i] ? ' · ' + locs[i] : '') + '\n' + q + '\n\n' + c.comment.trim();
      }).join('\n\n'));
    } else {
      parts.push(items.map(function (c, i) {
        return (i + 1) + '. ' + (locs[i] ? locs[i] + ' ' : '') + '"' + oneLine(c.quote) + '" — ' + oneLine(c.comment);
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
  if (s.header.trim() || s.footer.trim()) sum.push('header');
  return sum.join(' · ');
}
export function exportName(s) { return slug(s.name || autoName(s.text)) + '-comments.md'; }
