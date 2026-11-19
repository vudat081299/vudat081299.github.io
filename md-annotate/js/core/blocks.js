/* Khối cấp cao của văn bản markdown theo dòng nguồn, thuần: lexSpans(text, lex) → [{ a, b, heading }], a / b là dòng
   đầu / cuối (đếm từ 0). lex là bộ tách token (marked.lexer, ui/markdown.js mdLex); nó ném lỗi thì không có khối.
   Dùng cho cuộn theo nhau (ui/sync-scroll.js) và đánh số section (ui/focus.js).
   Xuất: lexSpans.
   Dùng: không module nào. */

export function lexSpans(text, lex) {
  var toks = [];
  try { toks = lex(text); } catch (e) { toks = []; }
  var line = 0, spans = [];
  toks.forEach(function (t) {
    var raw = t.raw || '', n = (raw.match(/\n/g) || []).length, body = raw.replace(/\n+$/, '');
    if (t.type !== 'space' && t.type !== 'def') spans.push({ a: line, b: line + (body.match(/\n/g) || []).length, heading: t.type === 'heading' });
    line += n;
  });
  return spans;
}
