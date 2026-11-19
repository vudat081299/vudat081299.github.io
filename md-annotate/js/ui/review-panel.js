/* Tab Review của panel (MDAN-013): tiến độ (thanh + %), dàn ý section (nút ✓ đánh dấu cả section, bấm tên để tới chỗ
   chưa đọc đầu tiên của nó), Next unreviewed, Dim reviewed (prefs.rvDim), dấu mất, xoá mọi dấu; % trên tab, thanh dọc
   (#rail-rv) và thanh đáy (#dock-rv). Dữ liệu và thao tác ở ui/review.js.
   Xuất: initReviewPanel, renderReviewPanel.
   Dùng: core/text.js, core/review.js, ui/dom.js, ui/store.js, ui/state.js, ui/render.js, ui/views.js, ui/panel.js,
     ui/review.js. */
import { lineOf, plural } from '../core/text.js';
import { dropLost, reviewSections } from '../core/review.js';
import { $, h, toast } from './dom.js';
import { prefs, savePrefs } from './store.js';
import { S } from './state.js';
import { anchors, ordered, orphans } from './render.js';
import { lastRead, setView, view } from './views.js';
import { setPane } from './panel.js';
import { commitReviews, jumpUnit, rvState, setRvTouched, stepOpen, toggleSection } from './review.js';

var GLYPH = { done: 'Reviewed', part: 'Partly reviewed', changed: 'Changed since reviewed', todo: 'Not reviewed' };

/* Dòng đầu (đếm từ 0) của mỗi nhận xét còn neo trong nguồn, cho số nhận xét của từng section. */
function commentLines() {
  var out = [];
  ordered.forEach(function (c) {
    var a = anchors[c.id];
    if (!orphans[c.id] && a && a.src) out.push(lineOf(S.text, a.src[0]) - 1);
  });
  return out;
}
/* Rời tấm trượt (máy hẹp) và Edit trước khi cuộn tới văn bản. */
function toText(fn) {
  return function () {
    if ($('dlg-panel').open) $('dlg-panel').close();
    if (view === 'edit') setView(lastRead);
    fn();
  };
}

export function renderReviewPanel(r, p) {
  var has = r.units.length > 0, marked = S.reviews.length > 0, pct = p.pct + '%';
  $('n-review').textContent = marked ? pct : '';
  $('rail-rv').hidden = !marked; $('rail-rv').textContent = pct;
  $('rail-rv').setAttribute('aria-label', 'Review: ' + pct + ' reviewed');
  $('dock-rv').hidden = !marked; $('dock-rv').textContent = '✓ ' + pct;
  $('dock-rv').setAttribute('aria-label', 'Review: ' + pct + ' reviewed');
  $('rv-empty').hidden = has; $('rv-body').hidden = !has;
  if (!has) return;
  $('rv-pct').textContent = pct;
  $('rv-fill').style.width = pct;
  $('rv-bar').setAttribute('aria-valuenow', String(p.pct));
  $('rv-sub').textContent = p.done + ' of ' + plural(p.total, 'block') + ' reviewed' + (p.changed ? ' · ' + p.changed + ' edited since review' : '');
  $('rv-dim').checked = !!prefs.rvDim;
  var nl = r.res.lost.length;
  $('rv-lost').hidden = !nl;
  $('rv-lost-t').textContent = nl ? plural(nl, 'reviewed block') + (nl === 1 ? ' is' : ' are') + ' no longer in the text (edited or deleted). ' : '';
  $('rv-clear').disabled = !marked;
  var secs = reviewSections(r.units, r.res.state, commentLines());
  var min = Math.min.apply(null, secs.map(function (s) { return s.depth || 9; }));
  $('rv-secs').replaceChildren.apply($('rv-secs'), secs.map(function (s) {
    var d = s.depth ? s.depth - min : 0, name = s.title || (s.sec ? 'Untitled section' : 'Before the first heading');
    var meta = s.done + '/' + s.total + (s.changed ? ' · ' + s.changed + ' edited' : '') + (s.comments ? ' · ' + plural(s.comments, 'comment') : '');
    return h('li', { class: 'ma-rvs is-' + s.state, style: '--d:' + Math.max(0, d) },
      h('button', {
        class: 'ma-rvs__ic', type: 'button', title: GLYPH[s.state] + '. Click to ' + (s.state === 'done' ? 'unmark' : 'mark') + ' the whole section',
        'aria-label': (s.state === 'done' ? 'Unmark' : 'Mark') + ' section "' + name + '" reviewed',
        onclick: function () { toggleSection(s.sec); }
      }),
      h('button', {
        class: 'ma-rvs__main', type: 'button', title: 'Go to this section',
        onclick: toText(function () {
          var st = rvState().res.state, i = s.first;
          for (var k = s.first; k <= s.last; k++) if (st[k] !== 'done') { i = k; break; }
          jumpUnit(i);
        })
      }, h('span', { class: 'ma-rvs__t' + (s.title ? '' : ' is-pre') }, name), h('span', { class: 'ma-rvs__m' }, meta)));
  }));
}

export function initReviewPanel() {
  $('ptab-review').addEventListener('click', setRvTouched);
  $('rv-next').addEventListener('click', toText(function () { stepOpen(1); }));
  $('rv-dim').addEventListener('change', function (e) {
    prefs.rvDim = e.target.checked; savePrefs();
    document.documentElement.classList.toggle('ma-rvdim', prefs.rvDim);
  });
  $('rv-lost-x').addEventListener('click', function () {
    S.reviews = dropLost(S.reviews, rvState().res); commitReviews();
  });
  $('rv-clear').addEventListener('click', function () {
    var before = S.reviews, sid = S.id;
    if (!before.length) return;
    S.reviews = []; commitReviews();
    toast('Cleared ' + plural(before.length, 'review mark') + '.', { label: 'Undo', fn: function () {
      if (S.id === sid) { S.reviews = before; commitReviews(); }
    } });
  });
  $('rail-rv').addEventListener('click', function () { $('btn-unrail').click(); setPane('review'); });
  $('dock-rv').addEventListener('click', function () { $('dock-n').click(); setPane('review'); setRvTouched(); });
}
