/* Vẽ lại mọi thứ từ file đang mở (D): dựng Preview, neo lại mọi nhận xét, đánh số, vẽ hai khung, danh sách, prompt,
   meta, số đếm ở cây. Neo, xếp, đánh số ở core/comments.js. Kết quả (mdText, anchors, ordered, numbers, orphans) chỉ
   gán ở renderAll(); module khác chỉ đọc. anchorsOf(doc): kết quả neo của một file không mở (prompt All files), dựng
   Preview vào phần tử tách rời cùng một đường (mdInto), không chạm hai khung.
   Xuất: anchors, anchorsOf, checkRenderer, mdText, numbers, ordered, orphans, renderAll, renderMeta.
   Dùng: core/text.js, core/comments.js, core/runs.js, ui/dom.js, ui/state.js, ui/markdown.js, ui/marks.js,
     ui/source-view.js, ui/list.js, ui/prompt.js, ui/views.js, ui/sync-scroll.js, ui/focus.js, ui/popup.js,
     ui/picks.js, ui/review.js, ui/files.js. */
import { plural } from '../core/text.js';
import { anchorAll, markRanges } from '../core/comments.js';
import { lineCount } from '../core/runs.js';
import { $, h, textNodes } from './dom.js';
import { D } from './state.js';
import { ghExtras, mdHtml, unlink } from './markdown.js';
import { markActive, paintMd } from './marks.js';
import { paintSrc } from './source-view.js';
import { renderList } from './list.js';
import { renderPrompt } from './prompt.js';
import { sizePanes, view } from './views.js';
import { invalidateSync } from './sync-scroll.js';
import { refreshBand } from './focus.js';
import { paintPending, pending, pop } from './popup.js';
import { repaintPicks } from './picks.js';
import { applyReview } from './review.js';
import { refreshTree } from './files.js';

export var mdText = '';            // chữ của bản dựng (nối các nút text)
export var anchors = {};           // id → { src: [a,b] | null, md: [a,b] | null }
export var ordered = [];           // nhận xét theo thứ tự trong văn bản
export var numbers = {};           // id → số thứ tự trong prompt
export var orphans = {};           // id → true khi không còn tìm thấy đoạn trích
var mdReady;                // false: marked / DOMPurify không nạp được (thiếu mạng)

/* Gọi lúc khởi động: thư viện markdown đã nạp chưa. */
export function checkRenderer() { mdReady = !!(window.marked && window.DOMPurify); }

/* Chỗ duy nhất gán innerHTML: html là kết quả của mdHtml (đã qua DOMPurify); rồi link → span, kiểu GitHub. */
function mdInto(el, html) {
  el.innerHTML = html; // đã qua DOMPurify
  unlink(el);
  ghExtras(el);
}
function joinText(root) { return textNodes(root).map(function (n) { return n.data; }).join(''); }

/* Chữ bản dựng của văn bản không mở, nhớ theo chữ (tối đa OFF_MAX văn bản). Chưa có thư viện markdown thì ''. */
var offMd = new Map(), OFF_MAX = 200;
function mdTextOf(text) {
  if (offMd.has(text)) return offMd.get(text);
  var html = mdHtml(text);
  if (html == null) return '';
  var el = document.createElement('div');
  mdInto(el, html);
  var t = joinText(el);
  if (offMd.size >= OFF_MAX) offMd.delete(offMd.keys().next().value);
  offMd.set(text, t);
  return t;
}
/* Kết quả neo của một doc không mở ({ ordered, orphans, anchors, numbers }), neo như khi nó đang mở (không nhận xét thì
   khỏi dựng Preview). */
export function anchorsOf(doc) { return anchorAll(doc.comments, doc.text, doc.comments.length ? mdTextOf(doc.text) : ''); }

export function renderAll() {
  var text = D.text, mdRoot = $('v-md');
  var html = mdHtml(text);
  if (html == null) {
    mdRoot.replaceChildren(h('p', { class: 'ma-note' },
      mdReady === false ? 'The markdown renderer could not load (needs a network). Select in the Source view instead.' : 'Loading the markdown renderer…'));
    mdText = '';
  } else {
    mdInto(mdRoot, html);
    invalidateSync();
    mdText = joinText(mdRoot);
  }

  var d = anchorAll(D.comments, text, mdText);
  anchors = d.anchors; orphans = d.orphans; ordered = d.ordered; numbers = d.numbers;
  var rs = markRanges(d);
  paintSrc(rs.src);
  if (html != null) paintMd(mdRoot, textNodes(mdRoot), rs.md);
  if (pop.mode === 'edit' && pop.id) markActive(pop.id, true);
  if (pop.mode === 'new' && pending) paintPending();
  repaintPicks();   // dòng đã chọn: tô lại, hoặc thoát khi văn bản đã đổi

  renderList();
  renderPrompt();
  renderMeta();
  applyReview();    // làn dấu đã đọc, làm mờ, tab Review: khung vừa vẽ lại
  refreshTree();    // số nhận xét, % đã đọc của file ở cây (chỉ vẽ khi đổi)
}

export function renderMeta() {
  var t = D.text;
  var lines = lineCount(t);
  $('doc-meta').textContent = t ? t.length.toLocaleString('en') + ' chars · ' + lines.toLocaleString('en') + (lines === 1 ? ' line' : ' lines') : '';
  var lost = Object.keys(orphans).length, note = $('edit-note');
  if (D.comments.length) {
    note.hidden = false;
    note.replaceChildren(plural(D.comments.length, 'comment') + ' anchored to this text.',
      lost ? h('b', null, ' ' + plural(lost, 'comment') + (lost === 1 ? ' has' : ' have') + ' lost its quote.') : '');
  } else note.hidden = true;
  $('empty').hidden = !(view !== 'edit' && !t);
  $('start').hidden = !!t; $('edit-tools').hidden = !t;
  $('src-input').classList.toggle('is-empty', !t);
  $('views').hidden = view === 'edit' || !t;
  sizePanes();
  refreshBand(); // khung vẽ lại thì section đang sáng mất lớp: đặt lại (chỉ khi dải đọc)
}
