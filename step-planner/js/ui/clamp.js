// @ts-check
/* Chữ dài trên bảng: mỗi khối .clamp dừng ở số dòng của token --lines-*, thẻ ở --card-max; đo khối bị cắt (markCut:
   đọc hết rồi mới ghi), nút "Show more", link ở phần bị che ra khỏi vòng Tab; ghi chú dài trên thẻ chỉ dựng phần đầu; mép mờ
   của hàng thẻ cuộn ngang. Đo lại khi đổi cỡ cửa sổ, font tải xong, mở ghi chú bước.
   Xuất: cardNotes, unclip, boxKey, cutBoxes, openKeys, markCut, updateScrollCues, initClamp.
   Dùng: ui/dom.js, ui/hand.js, ui/state.js. */
import { $, h, withLinks } from './dom.js';
import { fadeGapNames } from './hand.js';
import { cur } from './state.js';

/* Ghi chú dài trên thẻ chưa mở: chỉ dựng phần đầu (dàn chữ là phần tốn nhất khi vẽ). Phần đầu đủ dài để tràn xa quá chỗ
 * cắt, nên thẻ trông y như khi dựng đủ; không tràn đủ xa thì dựng đủ rồi đo lại. "Show more" dựng đủ. */
const NOTE_LINES = 16;
const NOTE_CHARS = 1600;
const CLIP_SLACK = 64; // px: phần đầu phải tràn quá chỗ cắt chừng này, dòng cuối (có thể bị cắt giữa chừng) mới chắc khuất
/** @param {string} notes @param {boolean} full */
export function cardNotes(notes, full) {
  const head = full ? notes : notes.split('\n', NOTE_LINES).join('\n').slice(0, NOTE_CHARS);
  return h('p', { class: 'card-notes clamp', 'data-clip': head !== notes }, withLinks(head));
}
/** Thẻ đang hiện phần đầu ghi chú: dựng đủ. @param {Element} card */
export function unclip(card) {
  const p = card.querySelector('.card-notes[data-clip]');
  if (!p) return;
  const id = /** @type {HTMLElement} */ (card).dataset.sub;
  const x = cur()?.steps.flatMap((/** @type {any} */ s) => s.subs).find((/** @type {any} */ y) => y.id === id);
  p.removeAttribute('data-clip');
  if (x) p.replaceChildren(...withLinks(x.notes));
}

/* ── Chữ dài trên bảng: mỗi khối chữ (.clamp: tên, lý do, Done when, ghi chú, mục tiêu) dừng ở số dòng của token --lines-*;
 * thẻ còn dừng ở --card-max. Tràn thì khối mờ dần ở dòng cuối (.clip) và thẻ, đầu bước có một nút "Show more" mở cả khối
 * (.open; không lưu, vẽ lại vẫn giữ). Nút của thẻ ngoài vòng Tab (thẻ hai điểm dừng); nút của đầu bước trong vòng Tab.
 * Link ở phần bị che ra khỏi vòng Tab tới khi mở. CSS không tự biết chữ có tràn hay không nên đo: lúc vẽ hàng mới, đổi Compact,
 * font tải xong, đổi cỡ cửa sổ, mở ghi chú bước. Băng Reopened chỉ cắt (bấm là mở hộp sửa lý do, ghi đủ). ── */
/** Khoá của một khối trong `keep.open`: id bước con, hay "h:" + id bước cho đầu bước. @param {HTMLElement} box */
export const boxKey = (box) => box.dataset.sub ?? 'h:' + /** @type {HTMLElement} */ (box.closest('[data-step]')).dataset.step;
/** Các khối cần đo trong các hàng. @param {Element[]} rows */
export const cutBoxes = (rows) => rows.flatMap((r) => /** @type {HTMLElement[]} */ ([...r.querySelectorAll('.card[data-sub], .step-head, .revisit-band')]));
/** @param {HTMLElement[]} boxes */
export const openKeys = (boxes) => boxes.filter((b) => b.classList.contains('open')).map(boxKey);

/** Đo các khối: đọc hết rồi mới ghi, nên cả lượt chỉ một lần dàn trang. Khối đã đo thì gỡ dấu cũ, đo lại; nút "Show more"
 * còn cần thì giữ nguyên nút (focus không mất). @param {HTMLElement[]} boxes @param {Set<string>} [keepOpen] khối đang mở */
export function markCut(boxes, keepOpen = new Set()) {
  for (const box of boxes) {
    if (!box.classList.contains('cut')) continue;
    box.classList.remove('open');
    for (const el of box.querySelectorAll('.clip')) el.classList.remove('clip');
    for (const a of box.querySelectorAll('a[data-hid]')) { a.removeAttribute('tabindex'); a.removeAttribute('data-hid'); }
  }
  /** Phần tử bị cắt trong khối, link nằm hẳn dưới chỗ cắt. @param {HTMLElement} box */
  const measure = (box) => {
    const els = /** @type {HTMLElement[]} */ ([...box.querySelectorAll('.clamp'), ...box.querySelectorAll(':scope > .card-body')]);
    /* Ghi chú bước đang đóng: trình duyệt vẫn dàn chữ bên trong (scrollHeight có số) nhưng không hiện, không tính. */
    const clipped = els.filter((el) => el.scrollHeight > el.clientHeight + 1 && !el.closest('details:not([open])'));
    /** @type {Set<Element>} */
    const hidden = new Set();
    for (const el of clipped) {
      const links = el.querySelectorAll('a[href]');
      if (!links.length) continue;
      const bottom = el.getBoundingClientRect().top + el.clientHeight - parseFloat(getComputedStyle(el).paddingBottom);
      for (const a of links) if (a.getBoundingClientRect().top >= bottom - 1) hidden.add(a);
    }
    return { clipped, hidden };
  };
  let res = boxes.map(measure);
  /* Ghi chú chỉ có phần đầu mà tràn chưa đủ xa (Compact ẩn ghi chú thì không tính): dựng đủ, đo lại riêng các thẻ ấy. */
  const compact = $('board').classList.contains('compact');
  const short = compact ? [] : boxes.filter((b) => {
    const p = b.querySelector('.card-notes[data-clip]');
    return p && p.scrollHeight - p.clientHeight < CLIP_SLACK;
  });
  if (short.length) {
    short.forEach(unclip);
    res = boxes.map((b, k) => (short.includes(b) ? measure(b) : res[k]));
  }
  boxes.forEach((box, k) => {
    const { clipped, hidden } = res[k];
    let more = /** @type {HTMLElement|null} */ (box.querySelector(':scope > .more'));
    box.classList.toggle('cut', clipped.length > 0);
    if (!clipped.length) { more?.remove(); return; }
    for (const el of clipped) el.classList.add('clip');
    if (box.classList.contains('revisit-band')) return;
    const open = keepOpen.has(boxKey(box));
    box.classList.toggle('open', open);
    for (const a of hidden) { a.setAttribute('data-hid', ''); if (!open) a.setAttribute('tabindex', '-1'); }
    const isCard = box.classList.contains('card');
    more ??= h('button', { type: 'button', class: 'more', 'data-act': 'more', tabindex: isCard ? '-1' : null, 'aria-controls': isCard ? null : box.id });
    /* Thẻ: dưới thân. Đầu bước: ngay dưới khối cuối cùng bị cắt (dòng tên, mục tiêu, Done when hay ghi chú). Nút đã đúng chỗ
     * thì không dời (dời là mất focus). */
    const at = /** @type {Element} */ (isCard ? box.querySelector(':scope > .card-body') : clipped.at(-1)?.closest('.step-head > *'));
    if (more.previousElementSibling !== at) at.after(more);
    more.textContent = open ? 'Show less' : 'Show more';
    more.setAttribute('aria-expanded', String(open));
  });
}

/** Hàng thẻ còn chỗ cuộn thì mờ dần ở mép ấy. Đọc hết rồi mới ghi. @param {Iterable<any>} [list] mặc định mọi hàng */
export function updateScrollCues(list = document.querySelectorAll('.cards-scroll')) {
  const m = [...list].filter(Boolean).map((sc) => [sc, sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2, sc.scrollLeft > 2]);
  for (const [sc, right, left] of m) {
    sc.classList.toggle('more-right', right);
    sc.classList.toggle('more-left', left);
  }
}

/** Đo lại mọi khối, giữ khối đang mở. */
function remeasureCut() {
  const boxes = cutBoxes([$('board')]);
  markCut(boxes, new Set(openKeys(boxes)));
}
/* Đổi cỡ cửa sổ: cột tên bước đổi rộng (một cột ở màn hẹp), chữ dàn lại; đo một lần mỗi khung hình. */
let resizeFrame = 0;

/** Gắn sự kiện, chạy một lần lúc khởi động (main.js gọi theo thứ tự). */
export function initClamp() {
  $('board').addEventListener('scroll', (/** @type {any} */ e) => { if (e.target.classList?.contains('cards-scroll')) updateScrollCues([e.target]); }, true);

  window.addEventListener('resize', () => {
    updateScrollCues();
    fadeGapNames($('board'));
    if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; remeasureCut(); });
  });
  /* Hàng dùng lại không được đo lại: font tải xong sau lần vẽ đầu (chữ dàn lại) thì đo lại mọi khối, giữ khối đang mở. */
  document.fonts?.addEventListener('loadingdone', () => {
    fadeGapNames($('board'));
    remeasureCut();
  });
  /* Ghi chú bước đóng thì chữ không dàn: mở ra mới đo được. Sự kiện toggle không nổi lên, nghe ở pha bắt. */
  $('board').addEventListener('toggle', (/** @type {any} */ e) => {
    if (!e.target.classList?.contains('step-notes')) return;
    const head = /** @type {HTMLElement} */ (e.target.closest('.step-head'));
    markCut([head], new Set(openKeys([head])));
  }, true);
}
