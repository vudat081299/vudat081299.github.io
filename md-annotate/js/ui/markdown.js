/* Markdown → HTML: marked + DOMPurify (ghim phiên bản), đổi link thành span (unlink), kiểu GitHub
   (ghExtras: hộp [!NOTE], highlight.js), và mdLex() (marked.lexer cho core/blocks.js).
   Xuất: ghExtras, mdHtml, mdLex, unlink.
   Dùng: không module nào. */

/* MARKDOWN — marked + DOMPurify, ghim phiên bản. Chỉ HTML đã làm sạch vào innerHTML. */
var mdCache = { text: null, html: null };
export function mdHtml(text) {
  if (!window.marked || !window.DOMPurify) return null;
  if (mdCache.text !== text) {
    var raw;
    try { raw = window.marked.parse(text, { gfm: true }); } catch (e) { raw = ''; }
    mdCache.text = text;
    mdCache.html = window.DOMPurify.sanitize(raw);
  }
  return mdCache.html;
}

/* Link trong bản dựng chỉ để đọc và bôi đen: đổi <a> thành <span>, không chuyển trang, không kéo-thả link.
   Chữ giữ nguyên nên neo không đổi; URL hiện khi rê chuột. */
export function unlink(root) {
  root.querySelectorAll('a').forEach(function (a) {
    var s = document.createElement('span');
    s.className = 'ma-a';
    var href = a.getAttribute('href');
    if (href) s.title = href;
    while (a.firstChild) s.appendChild(a.firstChild);
    a.replaceWith(s);
  });
  root.querySelectorAll('img').forEach(function (img) { img.draggable = false; });
}

/* Thêm kiểu GitHub cho bản dựng: hộp > [!NOTE] … và tô màu code. Không đổi chữ nào ngoài nhãn [!…]. */
var ALERTS = { NOTE: 'Note', TIP: 'Tip', IMPORTANT: 'Important', WARNING: 'Warning', CAUTION: 'Caution' };
export function ghExtras(root) {
  root.querySelectorAll('blockquote').forEach(function (bq) {
    var p = bq.firstElementChild;
    if (!p || p.tagName !== 'P' || !p.firstChild || p.firstChild.nodeType !== 3) return;
    var m = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(p.firstChild.data);
    if (!m) return;
    var kind = m[1].toUpperCase();
    p.firstChild.data = p.firstChild.data.slice(m[0].length);
    if (p.firstChild.data === '' && p.firstChild.nextSibling && p.firstChild.nextSibling.tagName === 'BR') p.removeChild(p.firstChild.nextSibling);
    if (!p.textContent.trim() && !p.querySelector('img')) p.remove();
    bq.classList.add('ma-alert', 'ma-alert--' + kind.toLowerCase());
    bq.setAttribute('data-alert', ALERTS[kind]);
  });
  if (!window.hljs) return;
  window.hljs.configure({ ignoreUnescapedHTML: true });
  root.querySelectorAll('pre code').forEach(function (code) {
    var m = /(?:^|\s)language-([\w+#.-]+)/.exec(code.className);
    // Như GitHub: chỉ tô khi khối rào ghi ngôn ngữ hljs biết; không ghi hoặc lạ thì để chữ trơn.
    if (!m || !window.hljs.getLanguage(m[1])) return;
    window.hljs.highlightElement(code);
  });
}

/* Bộ tách khối của marked (ghim phiên bản), cho core/blocks.js lexSpans(). Chưa nạp marked thì ném lỗi. */
export function mdLex(text) { return window.marked.lexer(text, { gfm: true }); }
