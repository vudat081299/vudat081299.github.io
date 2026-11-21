/* Tô màu code bằng highlight.js, nạp khi cần (MDAN-066): lõi và mỗi ngôn ngữ (sổ ở core/langs.js) là một module ES trên
   cdnjs, tải bằng fetch có integrity (import() không kiểm được integrity) rồi import từ blob. Mỗi file tải một lần, các
   lời gọi cùng lúc chung một promise; hỏng thì giữ chữ trơn, báo ở console một lần tới khi tải lại được, và quên lần hỏng:
   lần vẽ sau (mở lại file) tải lại. Ngôn ngữ vừa sẵn thì vẽ lại
   (renderAll); đang bôi đen trong khung thì chờ bỏ chọn, để không mất vùng chọn.
   Xuất: codeTokens, paintFences.
   Dùng: core/langs.js, core/file-type.js, core/code-tokens.js, ui/dom.js, ui/render.js. */
import { CORE_SRI, HLJS, LANGS } from '../core/langs.js';
import { langOf } from '../core/file-type.js';
import { hlRuns, sxTokens } from '../core/code-tokens.js';
import { $, h } from './dom.js';
import { renderAll } from './render.js';

var mods = new Map();    // đường dẫn → Promise của export default
var state = new Map();   // id → 'loading' | 'ready' (ngôn ngữ cùng ngôn ngữ nạp kèm); hỏng thì xoá
var hljs = null, warned = false;

/* Module ES ở HLJS + path, kiểm integrity; một promise cho mọi lời gọi, hỏng thì bỏ để lần sau tải lại. */
function loadModule(path, integrity) {
  if (!mods.has(path)) mods.set(path, fetch(HLJS + path, { integrity: integrity })
    .then(function (r) { if (!r.ok) throw new Error(path + ': HTTP ' + r.status); return r.blob(); })
    .then(function (b) {
      var url = URL.createObjectURL(new Blob([b], { type: 'text/javascript' }));
      return import(url).finally(function () { URL.revokeObjectURL(url); });
    })
    .then(function (m) { return m.default; }, function (err) { mods.delete(path); throw err; }));
  return mods.get(path);
}
function register(id) {
  return Promise.all([loadModule('core.min.js', CORE_SRI), loadModule('languages/' + id + '.min.js', LANGS[id][1])])
    .then(function (r) { hljs = r[0]; if (!hljs.getLanguage(id)) hljs.registerLanguage(id, r[1]); });
}
/* hljs khi ngôn ngữ id và ngôn ngữ nạp kèm đã sẵn; chưa thì null và bắt đầu nạp (một lần cho mỗi id). */
function highlighter(id) {
  if (!state.has(id)) {
    state.set(id, 'loading');
    var ids = [id].concat(LANGS[id][2] ? LANGS[id][2].split(' ') : []);
    Promise.all(ids.map(register)).then(function () { state.set(id, 'ready'); warned = false; repaint(); }, function (err) {
      state.delete(id);
      if (!warned) console.warn('md-annotate: code colors could not load (' + err.message + '); showing plain text.');
      warned = true;
    });
  }
  return state.get(id) === 'ready' ? hljs : null;
}

/* Vẽ lại một lần sau khi ngôn ngữ sẵn. Vẽ lại dựng lại khung, nên đang có vùng chọn trong khung thì chờ bỏ chọn. */
var queued = false;
function repaint() {
  if (queued) return;
  queued = true;
  setTimeout(function again() {
    var sel = document.getSelection();
    if (sel && !sel.isCollapsed && $('views').contains(sel.anchorNode)) {
      document.addEventListener('selectionchange', again, { once: true });
      return;
    }
    queued = false;
    renderAll();
  });
}

/* Token sx-* cho Source của file code ngôn ngữ id (nhớ lần gần nhất); chưa sẵn thì [] (chữ trơn) tới khi vẽ lại. */
var codeCache = { text: null, id: null, toks: null };
export function codeTokens(text, id) {
  var hl = highlighter(id);
  if (!hl) return [];
  if (codeCache.text !== text || codeCache.id !== id) {
    codeCache = { text: text, id: id, toks: sxTokens(hlRuns(hl.highlight(text, { language: id, ignoreIllegals: true }).value)) };
  }
  return codeCache.toks;
}

/* Preview: tô khối rào ghi ngôn ngữ có trong sổ; không ghi hay lạ thì chữ trơn, như GitHub. Chỉ bọc chữ trong <span>. */
export function paintFences(root) {
  root.querySelectorAll('pre > code[class*="language-"]').forEach(function (code) {
    var m = /(?:^|\s)language-([\w+#.-]+)/.exec(code.className), id = m && langOf(m[1]), hl = id && highlighter(id);
    if (!hl) return;
    var text = code.textContent, frag = document.createDocumentFragment(), p = 0;
    hlRuns(hl.highlight(text, { language: id, ignoreIllegals: true }).value).forEach(function (r) {
      if (r.s > p) frag.append(text.slice(p, r.s));
      frag.append(h('span', { class: r.c }, text.slice(r.s, r.e)));
      p = r.e;
    });
    if (p < text.length) frag.append(text.slice(p));
    code.replaceChildren(frag);
  });
}
