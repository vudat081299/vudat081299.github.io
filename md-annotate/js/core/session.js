/* Mô hình phiên, thuần (dữ liệu thường, không DOM, không localStorage): tạo phiên, chuẩn hoá phiên đọc từ bộ nhớ,
   tên tự đặt, danh sách phiên (index). Đọc / ghi bộ nhớ ở ui/state.js.
   Xuất: autoName, createSession, indexWith, isEmpty, normIndex, normSession, renameIndex, renameSession,
     touchSession, uid.
   Dùng: không module nào. */

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* Phiên mới; lời dẫn và kiểu prompt lấy từ tuỳ chọn người dùng (prefs). */
export function createSession(text, prefs) {
  var t = Date.now();
  return {
    id: uid(), name: '', named: false, created: t, updated: t,
    text: text || '', comments: [],
    header: typeof prefs.header === 'string' ? prefs.header : '',
    footer: typeof prefs.footer === 'string' ? prefs.footer : '',
    fmt: prefs.fmt === 'block' ? 'block' : 'inline', includeDoc: false,
    lineNums: true, path: ''
  };
}
/* Phiên đọc từ bộ nhớ (s có thể hỏng): sửa tại chỗ cho đúng khuôn, hoặc null nếu không dùng được. */
export function normSession(s, id) {
  if (!s || typeof s !== 'object' || typeof s.text !== 'string') return null;
  s.id = id;
  s.comments = Array.isArray(s.comments) ? s.comments.filter(function (c) {
    return c && typeof c.quote === 'string' && typeof c.comment === 'string';
  }) : [];
  s.comments.forEach(function (c) { if (!c.id) c.id = uid(); });
  ['name', 'header', 'footer'].forEach(function (k) { if (typeof s[k] !== 'string') s[k] = ''; });
  s.fmt = s.fmt === 'block' ? 'block' : 'inline';
  s.includeDoc = !!s.includeDoc;
  s.lineNums = s.lineNums !== false;
  if (typeof s.path !== 'string') s.path = '';
  s.created = +s.created || Date.now(); s.updated = +s.updated || s.created;
  return s;
}
/* Danh sách phiên đọc từ bộ nhớ: bỏ mục hỏng; giờ sửa luôn là số (hộp History định dạng nó thành ngày). */
export function normIndex(a) {
  return Array.isArray(a) ? a.filter(function (e) { return e && typeof e === 'object' && e.id; })
    .map(function (e) { e.updated = +e.updated || 0; return e; }) : [];
}

export function autoName(t) {
  var m = t.match(/^[ \t]*#{1,6}[ \t]+(.+)$/m) || t.match(/^[ \t]*(\S.*)$/m);
  var line = m ? m[1] : '';
  line = line.replace(/\]\([^)]*\)/g, '').replace(/[*_`#>\[\]|]/g, '').replace(/\s+/g, ' ').trim();
  return line.slice(0, 60) || 'Untitled session';
}
export function isEmpty(s) { return !s.text.trim() && !s.comments.length; }

/* Trước khi lưu: tên tự đặt (nếu người dùng chưa đặt) và giờ sửa. */
export function touchSession(s) {
  if (!s.named) s.name = isEmpty(s) ? '' : autoName(s.text);
  s.updated = Date.now();
}
/* Danh sách phiên sau khi lưu s: s lên đầu; phiên trống không vào danh sách. */
export function indexWith(idx, s) {
  idx = idx.filter(function (e) { return e.id !== s.id; });
  if (!isEmpty(s)) idx.unshift({ id: s.id, name: s.name, created: s.created, updated: s.updated, chars: s.text.length, count: s.comments.length });
  return idx;
}
/* Đổi tên một phiên không mở; tên rỗng thì về tên tự đặt. */
export function renameSession(s, name) {
  s.named = !!name; s.name = name || autoName(s.text);
}
export function renameIndex(idx, id, name) {
  return idx.map(function (e) { if (e.id === id) e.name = name; return e; });
}
