/* Mô hình phiên, thuần (dữ liệu thường, không DOM, không localStorage): tạo phiên, chuẩn hoá phiên đọc từ bộ nhớ,
   tên tự đặt, danh sách phiên (index). Đọc / ghi bộ nhớ ở ui/state.js.
   Xuất: autoName, createSession, indexWith, indexWithout, isEmpty, normIndex, normSession, renameIndex,
     renameSession, touchSession, uid.
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
    lineNums: true, path: '', reviews: [], rvPrompt: false
  };
}
/* Phiên đọc từ bộ nhớ (s có thể hỏng): sửa tại chỗ cho đúng khuôn, hoặc null nếu không dùng được. */
export function normSession(s, id) {
  if (!s || typeof s !== 'object' || typeof s.text !== 'string') return null;
  s.id = id;
  s.comments = Array.isArray(s.comments) ? s.comments.filter(function (c) {
    return c && typeof c.quote === 'string' && typeof c.comment === 'string';
  }) : [];
  s.comments.forEach(function (c) {
    if (!c.id) c.id = uid();
    normSelector(c);
    /* parts (nhận xét nhiều dòng) là trường thêm, không đổi khoá: hỏng hoặc dưới hai phần thì bỏ, còn quote ở ngoài. */
    if ('parts' in c) {
      var ps = Array.isArray(c.parts) ? c.parts.filter(function (p) { return p && typeof p.quote === 'string' && p.quote; }) : [];
      if (ps.length > 1) c.parts = ps.map(normSelector); else delete c.parts;
    }
  });
  ['name', 'header', 'footer'].forEach(function (k) { if (typeof s[k] !== 'string') s[k] = ''; });
  s.fmt = s.fmt === 'block' ? 'block' : 'inline';
  s.includeDoc = !!s.includeDoc;
  s.lineNums = s.lineNums !== false;
  if (typeof s.path !== 'string') s.path = '';
  /* reviews (dấu đã đọc, core/review.js) và rvPrompt là trường thêm, không đổi khoá: thiếu hay hỏng thì mặc định. */
  s.reviews = Array.isArray(s.reviews) ? s.reviews.filter(function (m) { return m && typeof m.h === 'string' && m.h; })
    .map(function (m) {
      return { h: m.h, p: typeof m.p === 'string' ? m.p : '', n: typeof m.n === 'string' ? m.n : '',
        q: typeof m.q === 'string' ? m.q : '', r: Number.isFinite(m.r) ? Math.max(0, Math.min(1, m.r)) : 0 };
    }) : [];
  s.rvPrompt = s.rvPrompt === true;
  s.created = +s.created || Date.now(); s.updated = +s.updated || s.created;
  return s;
}
/* Ngữ cảnh neo của một đoạn trích (nhận xét hay một phần) sửa tại chỗ cho đúng kiểu: rel không phải số thì locate
   không chọn được chỗ nào khi trích dẫn khớp nhiều chỗ. */
function normSelector(p) {
  if (typeof p.prefix !== 'string') p.prefix = '';
  if (typeof p.suffix !== 'string') p.suffix = '';
  if (p.origin !== 'md') p.origin = 'src';
  p.rel = Number.isFinite(p.rel) ? Math.max(0, Math.min(1, p.rel)) : 0;
  return p;
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
/* Danh sách phiên sau khi lưu s: s lên đầu; phiên trống không vào danh sách. rv: % đã đọc khi phiên có dấu. */
export function indexWith(idx, s) {
  idx = indexWithout(idx, s.id);
  if (!isEmpty(s)) {
    var e = { id: s.id, name: s.name, created: s.created, updated: s.updated, chars: s.text.length, count: s.comments.length };
    if (Number.isFinite(s.rvPct)) e.rv = s.rvPct;   // % đã đọc, ui/review.js tính lúc vẽ; hộp History hiện
    idx.unshift(e);
  }
  return idx;
}
export function indexWithout(idx, id) { return idx.filter(function (e) { return e.id !== id; }); }
/* Đổi tên một phiên; tên rỗng thì về tên tự đặt. */
export function renameSession(s, name) {
  s.named = !!name; s.name = name || autoName(s.text);
}
export function renameIndex(idx, id, name) {
  return idx.map(function (e) { if (e.id === id) e.name = name; return e; });
}
