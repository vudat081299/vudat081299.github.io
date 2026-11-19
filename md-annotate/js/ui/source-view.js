/* Khung Source (#v-src): vẽ mỗi dòng một <span class="ma-ln">, token tô màu là <span class="sx-*">, đoạn đã nhận
   xét bọc <mark>. Tách token ở core/tokens.js, cắt đoạn ở core/runs.js.
   Xuất: paintSrc.
   Dùng: core/tokens.js, core/runs.js, ui/store.js, ui/dom.js, ui/state.js, ui/marks.js. */
import { tokens } from '../core/tokens.js';
import { sourceLines } from '../core/runs.js';
import { prefs } from './store.js';
import { $, h } from './dom.js';
import { S } from './state.js';
import { markEl } from './marks.js';

export function paintSrc(ranges) {
  var root = $('v-src'), text = S.text;
  root.textContent = '';
  if (!text) return;
  var toks = prefs.syntax === false ? [] : tokens(text);
  /* Mỗi dòng một <span class="ma-ln"> (block), chứa cả ký tự xuống dòng của nó: text của khung vẫn đúng
     bằng nguồn. Số dòng là ::before (counter), không phải chữ, nên không lọt vào vùng chọn hay neo. */
  var src = sourceLines(text, toks, ranges);
  root.style.setProperty('--gw', src.digits + 'ch');
  var frag = document.createDocumentFragment();
  src.lines.forEach(function (ln) {
    var line = h('span', { class: 'ma-ln' });
    ln.runs.forEach(function (r) {
      var node = r.cls ? h('span', { class: r.cls }, r.t) : document.createTextNode(r.t);
      line.append(r.cover.length ? markEl(node, r.cover, r.end) : node);
    });
    /* Dòng có nhận xét: vạch xanh ở lề số; bấm vào lề thì mở nhận xét. */
    if (ln.ids.length) { line.classList.add('has-c'); line.dataset.c = ln.ids.join(' '); }
    frag.append(line);
  });
  root.append(frag);
}
