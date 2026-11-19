/* Danh sách nhận xét trong panel: vẽ thẻ, nhảy tới đoạn, sửa, xoá (có Undo), rê thẻ ↔ rê đoạn.
   Xuất: flashItem, initList, removeComment, renderList.
   Dùng: core/comments.js, ui/dom.js, ui/state.js, ui/marks.js, ui/render.js, ui/prompt.js, ui/views.js,
     ui/panel.js, ui/popup.js. */
import { cutComment, restoreComment } from '../core/comments.js';
import { $, h, icon, mqSide, reduceMotion, toast } from './dom.js';
import { loadSession, S, saveClosed, scheduleSave } from './state.js';
import { hoverMarks, marksOf } from './marks.js';
import { numbers, ordered, orphans, renderAll } from './render.js';
import { locText } from './prompt.js';
import { lastRead, setView, view } from './views.js';
import { setPane } from './panel.js';
import { closePop, openEdit, pop } from './popup.js';

/* Danh sách nhận xét trong panel. Panel nằm ở cột phải (máy rộng) hoặc trong tấm trượt #dlg-panel. */
export function renderList() {
  fillList($('list'));
  var total = S.comments.length;
  $('n-comments').textContent = total ? String(total) : '';
  $('list-empty').hidden = total > 0;
  $('dock-n').textContent = total ? 'Comments · ' + total : 'Comments';
  $('rail-n').textContent = String(total);
}
function inSheet() { return $('dlg-panel').open; }
function leaveSheet(fn) { return function () { if (inSheet()) $('dlg-panel').close(); fn(); }; }
function fillList(ol) {
  ol.replaceChildren();
  ordered.forEach(function (c) {
    var orphan = !!orphans[c.id], num = numbers[c.id], loc = orphan ? '' : locText(c, false);
    var li = h('li', { class: 'ma-item' + (orphan ? ' is-orphan' : '') + (pop.id === c.id ? ' is-active' : ''), 'data-id': c.id },
      h('button', { class: 'ma-item__main', type: 'button', title: 'Go to this passage', onclick: leaveSheet(function () { jumpTo(c.id); }) },
        h('span', { class: 'ma-item__top' },
          h('span', { class: 'ma-item__n' }, orphan ? '!' : String(num)),
          loc ? h('span', { class: 'ma-item__loc' }, loc) : null),
        h('span', { class: 'ma-item__c' }, c.comment),
        h('span', { class: 'ma-item__q' }, c.quote),
        orphan ? h('span', { class: 'ma-item__warn' }, 'This quote is no longer in the text, so it is left out of the prompt. Fix the text or delete the comment.') : null),
      h('span', { class: 'ma-item__act' },
        h('button', { class: 'ma-icbtn ma-icbtn--bare', type: 'button', 'aria-label': 'Edit comment', title: 'Edit',
          onclick: leaveSheet(function () { editFromList(c.id); }) }, icon('pencil')),
        h('button', { class: 'ma-icbtn ma-icbtn--bare', type: 'button', 'aria-label': 'Delete comment', title: 'Delete',
          onclick: function () { removeComment(c.id); } }, icon('x'))));
    /* Rê lên thẻ thì tô đoạn của nó, và ngược lại (xem onViewHover). */
    li.addEventListener('mouseenter', function () { hoverMarks(c.id, true); });
    li.addEventListener('mouseleave', function () { hoverMarks(c.id, false); });
    ol.append(li);
  });
}

/* DANH SÁCH: nhảy tới, sửa, xoá */
export function flashItem(id) {
  setPane('list');
  var li = $('list').querySelector('[data-id="' + id + '"]');
  if (!li) return;
  li.classList.add('is-flash');
  /* Chỉ cuộn trong cột phải đang dính; ở máy hẹp danh sách nằm dưới văn bản, đừng kéo trang xuống. */
  if (mqSide.matches) li.scrollIntoView({ block: 'nearest' });
  setTimeout(function () { li.classList.remove('is-flash'); }, 1200);
}
function jumpTo(id, instant) {
  if (orphans[id]) { toast('This quote is no longer in the text.'); return []; }
  if (view === 'edit') setView(lastRead);
  var ms = marksOf(id);
  if (!ms.length) return ms;
  ms[0].scrollIntoView({ block: 'center', behavior: instant || reduceMotion.matches ? 'auto' : 'smooth' });
  ms.forEach(function (m) {
    m.classList.remove('is-flash'); void m.offsetWidth; m.classList.add('is-flash');
    setTimeout(function () { m.classList.remove('is-flash'); }, 1300);
  });
  return ms;
}
function editFromList(id) {
  var ms = orphans[id] ? [] : jumpTo(id, true);
  var li = $('list').querySelector('[data-id="' + id + '"]');
  openEdit(id, ms.length ? ms[ms.length - 1] : li);
}
export function removeComment(id) {
  var cut = cutComment(S, id), sid = S.id;
  if (!cut) return;
  if (pop.id === id) closePop(true);
  scheduleSave(); renderAll();
  toast('Comment deleted.', {
    label: 'Undo',
    fn: function () {
      if (S.id === sid) { restoreComment(S, cut); scheduleSave(); renderAll(); return; }
      /* Đã chuyển phiên trong lúc toast còn hiện: trả nhận xét về phiên của nó (đã lưu khi chuyển), không vào S. */
      var s = loadSession(sid);
      if (s) { restoreComment(s, cut); saveClosed(s); }
    }
  });
}

export function initList() {
  /* Rê lên đoạn đã nhận xét thì thẻ của nó sáng lên. */
  ['v-src', 'v-md'].forEach(function (id) {
    var root = $(id);
    var mark = function (ids) {
      document.querySelectorAll('#list .ma-item').forEach(function (li) { li.classList.toggle('is-hover', ids.indexOf(li.dataset.id) >= 0); });
    };
    root.addEventListener('mouseover', function (e) {
      var m = e.target.closest && e.target.closest('mark.ma-hl');
      mark(m && m.dataset.ids ? m.dataset.ids.split(' ') : []);
    });
    root.addEventListener('mouseleave', function () { mark([]); });
  });
}
