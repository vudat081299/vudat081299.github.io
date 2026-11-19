/* Vẽ lại mọi thứ từ S: dựng Preview, neo lại mọi nhận xét, đánh số, vẽ hai khung, danh sách, prompt, meta.
   Neo, xếp, đánh số ở core/comments.js. Kết quả (mdText, anchors, ordered, numbers, orphans) chỉ gán ở
   renderAll(); module khác chỉ đọc.
   Xuất: anchors, checkRenderer, mdText, numbers, ordered, orphans, renderAll, renderMeta.
   Dùng: core/text.js, core/comments.js, ui/dom.js, ui/state.js, ui/markdown.js, ui/marks.js, ui/source-view.js,
     ui/list.js, ui/prompt.js, ui/views.js, ui/sync-scroll.js, ui/focus.js, ui/popup.js. */
import { plural } from '../core/text.js';
import { anchorAll, markRanges } from '../core/comments.js';
import { $, h, textNodes } from './dom.js';
import { S } from './state.js';
import { ghExtras, mdHtml, unlink } from './markdown.js';
import { markActive, paintMd } from './marks.js';
import { paintSrc } from './source-view.js';
import { renderList } from './list.js';
import { renderPrompt } from './prompt.js';
import { sizePanes, view } from './views.js';
import { invalidateSync } from './sync-scroll.js';
import { refreshBand } from './focus.js';
import { paintPending, pending, pop } from './popup.js';

export var mdText = '';            // chữ của bản dựng (nối các nút text)
export var anchors = {};           // id → { src: [a,b] | null, md: [a,b] | null }
export var ordered = [];           // nhận xét theo thứ tự trong văn bản
export var numbers = {};           // id → số thứ tự trong prompt
export var orphans = {};           // id → true khi không còn tìm thấy đoạn trích
var mdReady;                // false: marked / DOMPurify không nạp được (thiếu mạng)

/* Gọi lúc khởi động: thư viện markdown đã nạp chưa. */
export function checkRenderer() { mdReady = !!(window.marked && window.DOMPurify); }

export function renderAll() {
  var text = S.text, mdRoot = $('v-md');
  var html = mdHtml(text);
  if (html == null) {
    mdRoot.replaceChildren(h('p', { class: 'ma-note' },
      mdReady === false ? 'The markdown renderer could not load (needs a network). Select in the Source view instead.' : 'Loading the markdown renderer…'));
    mdText = '';
  } else {
    mdRoot.innerHTML = html; // đã qua DOMPurify
    unlink(mdRoot);
    ghExtras(mdRoot);
    invalidateSync();
    mdText = textNodes(mdRoot).map(function (n) { return n.data; }).join('');
  }

  var d = anchorAll(S.comments, text, mdText);
  anchors = d.anchors; orphans = d.orphans; ordered = d.ordered; numbers = d.numbers;
  var rs = markRanges(d);
  paintSrc(rs.src);
  if (html != null) paintMd(mdRoot, textNodes(mdRoot), rs.md);
  if (pop.mode === 'edit' && pop.id) markActive(pop.id, true);
  if (pop.mode === 'new' && pending) paintPending();

  renderList();
  renderPrompt();
  renderMeta();
}

export function renderMeta() {
  var t = S.text;
  var lines = t ? t.split('\n').length : 0;
  $('doc-meta').textContent = t ? t.length.toLocaleString('en') + ' chars · ' + lines.toLocaleString('en') + (lines === 1 ? ' line' : ' lines') : '';
  var lost = Object.keys(orphans).length, note = $('edit-note');
  if (S.comments.length) {
    note.hidden = false;
    note.replaceChildren(plural(S.comments.length, 'comment') + ' anchored to this text.',
      lost ? h('b', null, ' ' + plural(lost, 'comment') + (lost === 1 ? ' has' : ' have') + ' lost its quote.') : '');
  } else note.hidden = true;
  $('empty').hidden = !(view !== 'edit' && !t);
  $('start').hidden = !!t; $('edit-tools').hidden = !t;
  $('src-input').classList.toggle('is-empty', !t);
  $('views').hidden = view === 'edit' || !t;
  sizePanes();
  refreshBand(); // khung vẽ lại thì section đang sáng mất lớp: đặt lại (chỉ khi dải đọc)
}
