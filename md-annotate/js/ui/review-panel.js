/* Tab Review của panel (MDAN-013): tiến độ (thanh + %), dàn ý section (nút ✓ đánh dấu cả section, bấm tên để tới chỗ
   chưa đọc đầu tiên của nó), Next unreviewed, Dim reviewed (prefs.rvDim), dấu mất, xoá mọi dấu; % trên tab, thanh dọc
   (#rail-rv) và thanh đáy (#dock-rv). Dữ liệu và thao tác ở ui/review.js.
   Xuất: initReviewPanel, renderReviewPanel.
   Dùng: core/text.js, core/review.js, ui/dom.js, ui/layout.js, ui/state.js, ui/render.js, ui/views.js, ui/panel.js,
     ui/review.js. */
import { lineOf, plural } from '../core/text.js';
import { dropLost, firstOpen, reviewSections } from '../core/review.js';
import { $, h } from './dom.js';
import { setLayout } from './layout.js';
import { D } from './state.js';
import { anchors, ordered, orphans } from './render.js';
import { lastRead, setView, view } from './views.js';
import { setPane } from './panel.js';
import { jumpUnit, rvState, setReviews, setRvTouched, stepOpen, toggleSection } from './review.js';

var GLYPH = { done: 'Reviewed', part: 'Partly reviewed', changed: 'Changed since reviewed', todo: 'Not reviewed' };

/* Dòng đầu (đếm từ 0) của mỗi nhận xét còn neo trong nguồn, cho số nhận xét của từng section. */
function commentLines() {
  var out = [];
  ordered.forEach(function (c) {
    var a = anchors[c.id];
    if (!orphans[c.id] && a && a.src) out.push(lineOf(D.text, a.src[0]) - 1);
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

var emptyP = null;   // chữ gốc của #rv-empty
/* blind: chưa tách được khối (thiếu mạng): không có % để hiện, dấu vẫn giữ. */
export function renderReviewPanel(r, p, blind) {
  var has = r.units.length > 0, marked = D.reviews.length > 0 && !blind, pct = p.pct + '%';
  $('n-review').textContent = marked ? pct : '';
  $('rail-rv').hidden = !marked; $('rail-rv').textContent = pct;
  $('rail-rv').setAttribute('aria-label', 'Review: ' + pct + ' reviewed');
  $('dock-rv').hidden = !marked; $('dock-rv').textContent = '✓ ' + pct;
  $('dock-rv').setAttribute('aria-label', 'Review: ' + pct + ' reviewed');
  $('rv-empty').hidden = has; $('rv-body').hidden = !has;
  var ep = $('rv-empty').querySelector('p');
  emptyP = emptyP || ep.cloneNode(true);
  ep.replaceChildren.apply(ep, blind ? [h('b', null, 'Preview could not load'), 'Your review marks are kept and come back once it loads.']
    : Array.prototype.map.call(emptyP.childNodes, function (n) { return n.cloneNode(true); }));
  if (!has) return;
  $('rv-pct').textContent = pct;
  $('rv-fill').style.width = pct;
  $('rv-bar').setAttribute('aria-valuenow', String(p.pct));
  $('rv-sub').textContent = p.done + ' of ' + plural(p.total, 'block') + ' reviewed' + (p.changed ? ' · ' + p.changed + ' edited since review' : '');
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
          jumpUnit(firstOpen(rvState().res.state, s.first, s.last));
        })
      }, h('span', { class: 'ma-rvs__t' + (s.title ? '' : ' is-pre') }, name), h('span', { class: 'ma-rvs__m' }, meta)));
  }));
}

export function initReviewPanel() {
  $('ptab-review').addEventListener('click', setRvTouched);
  $('rv-next').addEventListener('click', toText(function () { stepOpen(1); }));
  $('rv-dim').addEventListener('change', function (e) {
    setLayout('rvDim', e.target.checked);
  });
  $('rv-lost-x').addEventListener('click', function () {
    var n = rvState().res.lost.length;
    setReviews(dropLost(D.reviews, rvState().res), 'Removed ' + plural(n, 'lost review mark') + '.');
  });
  $('rv-clear').addEventListener('click', function () {
    if (D.reviews.length) setReviews([], 'Cleared ' + plural(D.reviews.length, 'review mark') + '.');
  });
  $('rail-rv').addEventListener('click', function () { $('btn-unrail').click(); setPane('review'); });
  $('dock-rv').addEventListener('click', function () { $('dock-n').click(); setPane('review'); setRvTouched(); });
}
