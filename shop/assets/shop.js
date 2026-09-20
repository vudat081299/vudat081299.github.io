(function () {
'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   scentsitive.vn — mã dùng chung cho cả ba trang (index / products / checkout).
   Một file, vì giỏ hàng phải giống nhau ở mọi trang; ba bản sao là ba cách tính
   tiền khác nhau sau vài lần sửa.

   KHÔNG giữ chữ trong mã. Mọi khối lặp — mùi hương, sản phẩm, giá trị, hỏi đáp,
   cách thanh toán — đọc từ data/shop.json. Thêm một mùi chỉ là thêm một mục vào
   `scents` rồi thêm sản phẩm trỏ vào nó.
   ═══════════════════════════════════════════════════════════════════════════ */

var $  = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var CART_KEY = 'scentsitive-cart';

function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
var CUR = '₫';
function money(n) { return Number(n).toLocaleString('vi-VN') + ' ' + CUR; }

/* ── nền sáng / tối ──────────────────────────────────────────────────────── */
var root = document.documentElement, themeIco = $('#themeIco');

/* Bật icon khi font ligature đã về — xem lý do ở quy tắc .ms trong shop.css.
   KHÔNG có đường "hết giờ thì hiện đại": font không về thì icon ở yên trong bóng tối.
   Đã thử bản có hẹn giờ 2,5 giây và chụp lại — nút giỏ hàng đọc thành
   "dark_modeshopping_bag", xấu hơn hẳn một nút tròn trống. Mọi nút icon đều đã có
   aria-label nên máy đọc màn hình không mất gì khi icon ẩn.
   `.then(ok, ok)` bắt cả nhánh hỏng, nên trường hợp mạng lỗi vẫn chốt. */
(function () {
  if (!document.fonts || !document.fonts.load) { root.classList.add('icons'); return; }
  var ok = function () { root.classList.add('icons'); };
  document.fonts.load('24px "Material Symbols Rounded"', 'shopping_bag').then(ok, ok);
})();
function paintTheme() {
  if (themeIco) themeIco.textContent = root.getAttribute('data-theme') === 'dark' ? 'light_mode' : 'dark_mode';
}
paintTheme();
var themeBtn = $('#themeBtn');
if (themeBtn) themeBtn.addEventListener('click', function () {
  var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('scentsitive-theme', next); } catch (e) {}
  paintTheme();
});

/* ── thanh điều hướng ────────────────────────────────────────────────────── */
var nav = $('#nav'), sheet = $('#sheet'), burger = $('#burger'), burgerIco = $('#burgerIco');
var bannerH = 0;
function measureBanner() {
  var b = $('#phBanner');
  bannerH = (b && !b.hidden) ? b.offsetHeight : 0;
  onScroll();
}
function onScroll() {
  if (!nav) return;
  nav.classList.toggle('is-stuck', window.scrollY > 40);
  /* nav bắt đầu ngay dưới dải cảnh báo, rồi trượt lên đúng bằng lượng dải đã cuộn khỏi màn */
  root.style.setProperty('--nav-top', Math.max(0, bannerH - window.scrollY) + 'px');
}
if (nav) {
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
function closeSheet() {
  if (!sheet) return;
  sheet.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  burgerIco.textContent = 'menu';
}
if (burger) {
  burger.addEventListener('click', function () {
    var open = sheet.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burgerIco.textContent = open ? 'close' : 'menu';
  });
  $$('#sheet a').forEach(function (a) { a.addEventListener('click', closeSheet); });
}

/* ── hiện dần khi cuộn tới ───────────────────────────────────────────────── */
var revealer = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    revealer.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

/* Không quan sát được thì hiện thẳng, đừng để nội dung kẹt ở opacity 0. Hai trường hợp
   thật: trình duyệt không có IntersectionObserver, và khung nhìn cao 0px. */
function watch(el) {
  if (!el) return;
  if (!('IntersectionObserver' in window) || document.documentElement.clientHeight < 1) {
    el.classList.add('is-in');
    return;
  }
  revealer.observe(el);
}
$$('.rv').forEach(watch);

var yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ═════════════════════════════════════════════════════════════════════════
   LỚP ĐO
   Đây là một CÁI MỐI NỐI, không phải một hệ analytics. Lý do nó tồn tại: mọi
   tiêu chí "bỏ tính năng này khi nào" trong docs/02-LO-TRINH.md đều cần một
   con số, mà trang thì không đếm gì cả — tài liệu bảo đo, sản phẩm không đo
   được. Đó là mâu thuẫn, và đây là chỗ vá.

   Ba giới hạn phải nói thẳng, kẻo đọc số rồi tin nhầm:

   1. DỮ LIỆU NẰM LẠI TRONG MÁY KHÁCH. localStorage là của từng trình duyệt.
      Shop KHÔNG thấy được gì. Muốn gộp số của khách thật thì phải có một
      endpoint — xem `SINK` bên dưới và chặng 1 của lộ trình.
   2. Vì thế các con số ở /shop/measure/ chỉ là hành vi của CHÍNH máy đang mở,
      dùng để kiểm xem sự kiện có bắn đúng không, và để demo phễu.
   3. Không có id theo dõi giữa các phiên, không gửi đi đâu, không cookie.
      `sid` chỉ sống trong một tab và chỉ để nối các sự kiện của cùng một lượt.

   Thêm một sự kiện thì thêm một lời gọi track(), đừng thêm một hệ thống.
   ═════════════════════════════════════════════════════════════════════════ */
var EV_KEY = 'scentsitive-events', EV_MAX = 500;

/* Đổi SINK thành một URL là mọi sự kiện đi ra ngoài — một dòng, đúng một chỗ.
   Để null thì chỉ ghi vào máy. KHÔNG bật khi chưa hỏi ý người dùng về quyền
   riêng tư và chưa có trang nói rõ trang thu thập gì. */
var SINK = null;

var sid = (function () {
  try {
    var v = sessionStorage.getItem('scentsitive-sid');
    if (!v) { v = Date.now().toString(36) + Math.random().toString(36).slice(2, 7); sessionStorage.setItem('scentsitive-sid', v); }
    return v;
  } catch (e) { return 'nosid'; }
})();

function track(ev, props) {
  var row = { t: Date.now(), s: sid, e: ev };
  if (props) row.p = props;
  try {
    var log = JSON.parse(localStorage.getItem(EV_KEY) || '[]');
    if (!Array.isArray(log)) log = [];
    log.push(row);
    /* Vòng đệm: giữ EV_MAX sự kiện gần nhất. Không cắt thì localStorage đầy
       (giới hạn ~5MB) và ném lỗi ở một chỗ chẳng liên quan gì tới đo đạc. */
    if (log.length > EV_MAX) log = log.slice(log.length - EV_MAX);
    localStorage.setItem(EV_KEY, JSON.stringify(log));
  } catch (e) { /* chế độ riêng tư chặn localStorage — đo đạc không được phép làm hỏng trang */ }

  if (SINK) {
    try {
      /* sendBeacon sống sót được lúc trang đang đóng; fetch thì không. */
      if (navigator.sendBeacon) navigator.sendBeacon(SINK, JSON.stringify(row));
      else fetch(SINK, { method: 'POST', body: JSON.stringify(row), keepalive: true });
    } catch (e) {}
  }
}

/* Trang nào đang xem — lấy từ đường dẫn, không hardcode ở từng trang. */
function pageName() {
  var f = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  return f || 'index';
}

/* ═════════════════════════════════════════════════════════════════════════
   HÌNH SẢN PHẨM
   Chưa có ảnh chụp nên mỗi món tự vẽ lấy, dùng đúng ba màu khai trong data
   (`art.glass` / `art.wax` / `art.glow` của mùi hương). Đổi lại: cả cửa hàng
   trông như một bộ, và không bao giờ có ô ảnh vỡ. Thay bằng ảnh thật thì sửa
   đúng hàm artHTML.
   ═════════════════════════════════════════════════════════════════════════ */
var uid = 0;
/* Nhãn trên ly: số thứ tự của mùi (01–05) chứ không phải chữ cái đầu của tên sản phẩm.
   Năm sản phẩm đều tên "Nến thơm 0x" nên chữ cái đầu là "N" cả năm — không phân biệt được. */
function markOf(p) {
  var s = scentOf(p);
  return (s && s.n) || String(p && p.name || '?').trim().charAt(0);
}
function artSVG(p, crop) {
  var a = artOf(p), u = 'x' + (++uid);
  var glass = esc(a.glass || '#555'), wax = esc(a.wax || '#EEE'), glow = esc(a.glow || '#FFB25A');
  var defs =
    '<defs>' +
      '<radialGradient id="h' + u + '">' +
        '<stop offset="0%" stop-color="' + glow + '" stop-opacity=".62"/>' +
        '<stop offset="42%" stop-color="' + glow + '" stop-opacity=".18"/>' +
        '<stop offset="100%" stop-color="' + glow + '" stop-opacity="0"/></radialGradient>' +
      /* Dải sáng hẹp ở 16% cộng hai mép tối — trên nền giấy ngà, gradient rộng làm hũ
         bẹt như một vệt màu; hẹp lại thì nó có khối. */
      '<linearGradient id="g' + u + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#000000" stop-opacity=".34"/>' +
        '<stop offset="9%" stop-color="' + glass + '" stop-opacity=".97"/>' +
        '<stop offset="18%" stop-color="#FFFFFF" stop-opacity=".38"/>' +
        '<stop offset="32%" stop-color="' + glass + '" stop-opacity=".93"/>' +
        '<stop offset="74%" stop-color="' + glass + '" stop-opacity=".97"/>' +
        '<stop offset="92%" stop-color="#000000" stop-opacity=".22"/>' +
        '<stop offset="100%" stop-color="#000000" stop-opacity=".40"/></linearGradient>' +
      '<linearGradient id="w' + u + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + wax + '"/>' +
        '<stop offset="100%" stop-color="' + wax + '" stop-opacity=".62"/></linearGradient>' +
      '<linearGradient id="f' + u + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#FFF6DF"/><stop offset="52%" stop-color="' + glow + '"/>' +
        '<stop offset="100%" stop-color="' + glow + '" stop-opacity=".45"/></linearGradient>' +
      '<filter id="b' + u + '" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="2.2"/></filter>' +
    '</defs>';

  var halo = '<circle class="pa-glow" cx="100" cy="108" r="82" fill="url(#h' + u + ')"/>';
  var flame =
    '<g class="pa-flame" filter="url(#b' + u + ')">' +
      '<path fill="url(#f' + u + ')" d="M100 123c10-4.6 11.4-17 6.4-25.6-3.2-5.4-5.7-8.6-6.4-11.4-.7 2.8-3.2 6-6.4 11.4-5 8.6-3.6 21 6.4 25.6Z"/>' +
      '<path fill="#FFFDF3" opacity=".9" d="M100 123c3.4-2.3 3.8-7.9 2-11.9-.9-2.3-1.9-3.7-2-5.1-.1 1.4-1.1 2.8-2 5.1-1.8 4-1.4 9.6 2 11.9Z"/>' +
    '</g>';
  var base = '<ellipse cx="100" cy="216" rx="62" ry="9" fill="#000" opacity=".18"/>';

  var body;
  if (p.form === 'set') {
    body =
      '<g>' +
        '<rect x="24" y="152" width="46" height="58" rx="9" fill="url(#g' + u + ')"/>' +
        '<rect x="29" y="166" width="36" height="40" rx="6" fill="url(#w' + u + ')"/>' +
        '<ellipse cx="47" cy="166" rx="18" ry="3.4" fill="' + wax + '"/>' +
        '<rect x="130" y="152" width="46" height="58" rx="9" fill="url(#g' + u + ')"/>' +
        '<rect x="135" y="166" width="36" height="40" rx="6" fill="url(#w' + u + ')"/>' +
        '<ellipse cx="153" cy="166" rx="18" ry="3.4" fill="' + wax + '"/>' +
        '<rect x="74" y="136" width="52" height="74" rx="10" fill="url(#g' + u + ')"/>' +
        '<rect x="79" y="152" width="42" height="54" rx="7" fill="url(#w' + u + ')"/>' +
        '<ellipse cx="100" cy="152" rx="21" ry="3.8" fill="' + wax + '"/>' +
        '<path d="M100 152v-9" stroke="#3A2E24" stroke-width="2.2" stroke-linecap="round"/>' +
      '</g>';
    flame = flame.replace(/123c/g, '143c').replace(/M100 123/g, 'M100 143');
    return wrapSVG(defs + halo.replace('cy="108"', 'cy="126"') + flame + base + body, 'set', crop);
  }
  if (p.form === 'bottle') {
    var reeds = '';
    [-30, -18, -7, 5, 17, 29].forEach(function (dx, k) {
      reeds += '<path d="M100 128 L' + (100 + dx) + ' ' + (60 + Math.abs(dx) * .5) + '" stroke="#C6A87E" stroke-width="2.6" stroke-linecap="round" opacity="' + (k % 2 ? '.85' : '1') + '"/>';
    });
    body =
      '<g>' + reeds +
        '<rect x="66" y="140" width="68" height="76" rx="13" fill="url(#g' + u + ')" stroke="#000" stroke-opacity=".16"/>' +
        '<rect x="72" y="164" width="56" height="46" rx="8" fill="url(#w' + u + ')" opacity=".85"/>' +
        '<rect x="88" y="120" width="24" height="24" rx="4" fill="url(#g' + u + ')"/>' +
        '<rect x="84" y="114" width="32" height="11" rx="4" fill="#9A7B52"/>' +
        '<rect x="74" y="150" width="8" height="56" rx="4" fill="#FFFFFF" opacity=".16"/>' +
      '</g>';
    return wrapSVG(defs + halo.replace('cy="108"', 'cy="150"') + base + body, 'bottle', crop);
  }
  if (p.form === 'vial') {
    body =
      '<g>' +
        '<rect x="82" y="112" width="36" height="16" rx="5" fill="#8E7550"/>' +
        '<rect x="92" y="126" width="16" height="20" fill="url(#g' + u + ')"/>' +
        '<rect x="76" y="144" width="48" height="66" rx="11" fill="url(#g' + u + ')" stroke="#000" stroke-opacity=".16"/>' +
        '<rect x="82" y="166" width="36" height="38" rx="7" fill="url(#w' + u + ')" opacity=".9"/>' +
        '<rect x="84" y="154" width="6" height="48" rx="3" fill="#FFFFFF" opacity=".18"/>' +
      '</g>';
    return wrapSVG(defs + halo.replace('cy="108"', 'cy="158"') + base + body, 'vial', crop);
  }
  /* mặc định: ly nến */
  body =
    '<g>' +
      '<rect x="54" y="118" width="92" height="96" rx="13" fill="url(#g' + u + ')" stroke="#000" stroke-opacity=".16"/>' +
      '<rect x="60" y="136" width="80" height="72" rx="9" fill="url(#w' + u + ')"/>' +
      '<ellipse cx="100" cy="136" rx="40" ry="5.4" fill="' + wax + '"/>' +
      '<ellipse cx="100" cy="136" rx="24" ry="3.4" fill="' + glow + '" opacity=".35"/>' +
      '<path d="M100 136v-12" stroke="#3A2E24" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="118" rx="46" ry="6" fill="none" stroke="#FFFFFF" stroke-opacity=".3" stroke-width="1.2"/>' +
      '<rect x="62" y="128" width="8" height="78" rx="4" fill="#FFFFFF" opacity=".17"/>' +
      '<rect x="54" y="162" width="92" height="30" fill="#F5EBD6" opacity=".95"/>' +
      '<text x="100" y="183" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="15" font-weight="600" fill="#33291F">' + esc(markOf(p)) + '</text>' +
    '</g>';
  return wrapSVG(defs + halo + flame + base + body, 'jar', crop);
}
/* Khung 200×230 vừa cho ô sản phẩm, nhưng thu xuống 58px trong giỏ thì món hàng chỉ còn
   một chấm. Ảnh nhỏ dùng khung cắt sát từng dáng — cùng một hình vẽ, không vẽ lại. */
var CROP = { jar: '42 108 116 116', set: '18 110 164 132', bottle: '48 38 104 192', vial: '62 100 76 120' };

function wrapSVG(inner, form, crop) {
  var vb = (crop && CROP[form]) ? CROP[form] : '0 0 200 230';
  return '<svg class="pcard__svg" viewBox="' + vb + '" aria-hidden="true">' + inner + '</svg>';
}
function artHTML(p, crop) {
  if (p.form === 'gift') return giftSVG(p.gift, crop ? 56 : 300);
  if (p.form === 'emblem') {
    return '<div class="emblem" style="--glass:' + esc(p.art.glass) + ';--glow:' + esc(p.art.glow) + '">' +
           '<span class="ms ms--lg">' + esc(p.icon) + '</span></div>';
  }
  return artSVG(p, crop);
}

/* ═════════════════════════════════════════════════════════════════════════
   GIỎ HÀNG — chung cho cả ba trang, nằm ở localStorage.
   ═════════════════════════════════════════════════════════════════════════ */
var cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { cart = []; }
if (!Array.isArray(cart)) cart = [];
/* Dòng số lượng <= 0 phải bị loại NGAY khi nạp. Bản trước chỉ lọc sản phẩm không còn
   tồn tại, nên một dòng q=0 vẫn hiện thành một món trong giỏ trong khi tổng tiền không
   tính nó — giỏ nói một đằng, hoá đơn nói một nẻo. */
var rawLen = cart.length;
cart = cart.filter(function (c) { return c && c.id && Number(c.q) > 0; });
if (cart.length !== rawLen) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
}

var D = null;
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
function byId(id) {
  if (!D) return null;
  /* Hộp quà là một món GHÉP: nó không có trong D.products, cấu hình của nó nằm ngay
     trong dòng giỏ hàng. Dựng ra một "sản phẩm" từ cấu hình đó rồi trả về, để mọi chỗ
     phía sau — tính tiền, vẽ dòng, soạn nội dung đơn — chạy y như với một món thường
     và không phải biết hộp quà tồn tại.

     GIÁ KHÔNG ĐƯỢC LƯU trong giỏ, chỉ lưu cấu hình. Giá tính lại mỗi lần đọc: nếu shop
     đổi giá nến thì cái hộp đang nằm trong giỏ của khách cũng đổi theo, thay vì giữ một
     con số cũ mà không ai biết là cũ. */
  if (id && id.indexOf('gift-') === 0) {
    for (var g = 0; g < cart.length; g++) {
      if (cart[g].id === id && cart[g].g) return giftProduct(cart[g].g, id);
    }
    return null;
  }
  for (var i = 0; i < D.products.length; i++) if (D.products[i].id === id) return D.products[i];
  return null;
}

/* ── hộp quà: giá, tồn kho và "sản phẩm" dựng tạm ──────────────────────────── */
function giftBox(k) { return ((D.gift || {}).boxes || []).filter(function (b) { return b.k === k; })[0] || null; }
function giftCard(k) { return ((D.gift || {}).cards || []).filter(function (c) { return c.k === k; })[0] || null; }
function giftWrap(k) { return ((D.gift || {}).wraps || []).filter(function (w) { return w.k === k; })[0] || null; }

/* Mỗi mùi có đúng một sản phẩm trỏ vào nó — đó là món đi vào hộp. */
function productOfScent(k) {
  for (var i = 0; i < D.products.length; i++) if (D.products[i].scent === k) return D.products[i];
  return null;
}

function giftPrice(g) {
  var box = giftBox(g.box); if (!box) return { candles: 0, off: 0, extra: 0, total: 0 };
  var candles = 0;
  (g.scents || []).forEach(function (k) {
    var pr = productOfScent(k); if (pr) candles += pr.price;
  });
  /* Làm tròn tiền giảm xuống nghìn đồng: 8% của 552.000 là 44.160 và không ai viết
     hoá đơn có số lẻ 160 đồng. Làm tròn XUỐNG nên khách không bao giờ trả nhiều hơn
     con số phần trăm đã hứa. */
  var off = Math.floor(candles * (box.off || 0) / 100 / 1000) * 1000;
  var card = giftCard(g.card), wrap = giftWrap(g.wrap);
  var extra = ((card && card.price) || 0) + ((wrap && wrap.price) || 0);
  return { candles: candles, off: off, extra: extra, total: candles - off + extra };
}

/* Hộp bán được bao nhiêu cái là do món KHAN nhất trong hộp quyết định. Một hộp ba ngọn
   dùng hai lần cùng một mùi thì mùi đó phải còn gấp đôi — nên đếm theo số lần dùng. */
function giftStock(g) {
  var used = {}, cap = 99;
  (g.scents || []).forEach(function (k) { used[k] = (used[k] || 0) + 1; });
  for (var k in used) {
    if (!Object.prototype.hasOwnProperty.call(used, k)) continue;
    var pr = productOfScent(k);
    cap = Math.min(cap, pr ? Math.floor(pr.stock / used[k]) : 0);
  }
  return Math.max(0, cap);
}

function giftProduct(g, id) {
  var box = giftBox(g.box), L = (D.gift && D.gift.labels) || {};
  var names = (g.scents || []).map(function (k) {
    var s = null;
    for (var i = 0; i < D.scents.length; i++) if (D.scents[i].k === k) s = D.scents[i];
    return s ? s.name : k;
  });
  return {
    id: id, gift: g, form: 'gift', scent: (g.scents || [])[0] || (D.scents[0] || {}).k,
    name: (L.cart_name || 'Hộp quà') + ' · ' + ((box && box.name) || ''),
    sub: names.join(' · '),
    price: giftPrice(g).total, compare: 0, stock: giftStock(g), specs: []
  };
}

/* Cùng một cấu hình phải cho cùng một id, nếu không thêm hộp giống hệt hai lần sẽ ra
   hai dòng thay vì một dòng số lượng 2. */
function giftId(g) {
  var seed = [g.box, (g.scents || []).join(','), g.card, g.wrap, g.msg || ''].join('|');
  var h = 5381;
  for (var i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
  return 'gift-' + h.toString(36);
}
function scentOf(p) {
  if (!D || !p) return null;
  for (var i = 0; i < D.scents.length; i++) if (D.scents[i].k === p.scent) return D.scents[i];
  return null;
}
function artOf(p) { var s = scentOf(p); return (s && s.art) || { glass: '#555', wax: '#EEE', glow: '#FB5' }; }
function cartCount() { return cart.reduce(function (s, c) { return s + c.q; }, 0); }
function subtotal() {
  return cart.reduce(function (s, c) { var p = byId(c.id); return s + (p ? p.price * c.q : 0); }, 0);
}
function shipFee(sub) { return sub >= D.labels.free_ship ? 0 : D.labels.ship_fee; }

/* Trả về SỐ THỰC SỰ thêm được. Bản trước luôn báo "Đã thêm" kể cả khi tồn kho đã hết
   hoặc đã chạm trần — đo được: bấm 9 lần vào món còn 6, toast báo thành công cả 9 lần. */
function addToCart(id, n, from) {
  var p = byId(id); if (!p) return 0;
  var line = null;
  for (var i = 0; i < cart.length; i++) if (cart[i].id === id) line = cart[i];
  var had = line ? line.q : 0;
  var want = had + n;
  var got = Math.max(0, Math.min(p.stock, want));
  var delta = got - had;

  if (delta > 0) {
    if (line) line.q = got; else cart.push({ id: id, q: got });
    saveCart(); renderCart();
    if (from) fly(from);
    track('cart_add', { id: id, n: delta, from: pageName() });
    toast('Đã thêm ' + p.name);
    var badge = $('#cartCount');
    if (badge) { badge.classList.remove('is-pop'); void badge.offsetWidth; badge.classList.add('is-pop'); }
  } else if (p.stock <= 0) {
    toast(p.name + ' đang tạm hết hàng');
  } else {
    toast('Chỉ còn ' + p.stock + ' cái ' + p.name);
  }
  return delta;
}
/* Hộp quà không đi qua addToCart được: addToCart chỉ mang theo `id`, còn hộp thì phải
   mang theo cả cấu hình. Cùng cấu hình thì cộng dồn số lượng, khác thì thành dòng mới. */
function addGift(g, from) {
  var id = giftId(g), cap = giftStock(g);
  if (cap <= 0) { toast('Một mùi trong hộp đang tạm hết'); return 0; }
  var line = null;
  for (var i = 0; i < cart.length; i++) if (cart[i].id === id) line = cart[i];
  var had = line ? line.q : 0;
  var got = Math.min(cap, had + 1);
  if (got === had) { toast('Chỉ gói được ' + cap + ' hộp như vậy'); return 0; }
  if (line) line.q = got; else cart.push({ id: id, q: got, g: g });
  saveCart(); renderCart();
  if (from) fly(from);
  track('gift_add', { box: g.box, scents: (g.scents || []).join(','),
                      card: g.card, wrap: g.wrap, msg: !!g.msg, total: giftPrice(g).total });
  toast('Đã thêm hộp quà vào giỏ');
  var badge = $('#cartCount');
  if (badge) { badge.classList.remove('is-pop'); void badge.offsetWidth; badge.classList.add('is-pop'); }
  return got - had;
}

function setQty(id, n) {
  var p = byId(id);
  var cap = p ? p.stock : 0;
  cart = cart.map(function (c) {
    if (c.id !== id) return c;
    var line = { id: id, q: Math.max(0, Math.min(cap, n)) };
    if (c.g) line.g = c.g;   /* giữ cấu hình hộp — mất nó là mất luôn cả món hàng */
    return line;
  }).filter(function (c) { return c.q > 0; });
  saveCart(); renderCart();
}

var toastT = 0;
function toast(msg) {
  var t = $('#toast'); if (!t) return;
  $('#toastText').textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(function () { t.classList.remove('is-on'); }, 2400);
}

function fly(from) {
  var target = $('#cartBtn');
  if (REDUCED || !from.animate || !target) return;
  var a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
  var dot = document.createElement('div');
  dot.className = 'fly';
  dot.style.left = (a.left + a.width / 2 - 6) + 'px';
  dot.style.top = (a.top + a.height / 2 - 6) + 'px';
  document.body.appendChild(dot);
  var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  dot.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: 'translate(' + (dx * .5) + 'px,' + (dy * .5 - 90) + 'px) scale(1.3)', opacity: 1, offset: .55 },
    { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.2)', opacity: .15 }
  ], { duration: 760, easing: 'cubic-bezier(.32,.06,.2,1)' }).onfinish = function () { dot.remove(); };
}

/* ── ngăn kéo giỏ + bẫy tiêu điểm ────────────────────────────────────────── */
var veil = $('#veil'), drawer = $('#drawer'), lastFocus = null;

function lock(on) { document.body.classList.toggle('is-locked', on); }
function focusables(box) {
  return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', box)
    .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
}
/* Mở một lớp phủ mà không giữ tiêu điểm lại là người dùng bàn phím Tab thẳng ra trang
   phía sau — vẫn thấy ngăn kéo mở nhưng không lái được nó. */
function trapKey(e) {
  if (e.key !== 'Tab' || !drawer || !drawer.classList.contains('is-open')) return;
  var f = focusables(drawer);
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function closeAll() {
  closeSheet();
  if (drawer) { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); }
  if (veil) veil.classList.remove('is-open');
  lock(false);
  document.removeEventListener('keydown', trapKey, true);
  if (lastFocus && lastFocus.focus) { lastFocus.focus(); lastFocus = null; }
}
function openCart() {
  if (!drawer) return;
  lastFocus = document.activeElement;
  renderCart();
  closeSheet();
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  track('cart_open', { n: cartCount(), sub: subtotal() });
  if (veil) veil.classList.add('is-open');
  lock(true);
  document.addEventListener('keydown', trapKey, true);
  var close = $('#cartClose'); if (close) close.focus();
}
if (veil) veil.addEventListener('click', closeAll);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
var cartBtn = $('#cartBtn'); if (cartBtn) cartBtn.addEventListener('click', openCart);
var cartClose = $('#cartClose'); if (cartClose) cartClose.addEventListener('click', closeAll);

function lineHTML(c) {
  var p = byId(c.id), a = artOf(p);
  return '<div class="line" style="--glass:' + esc(a.glass) + ';--glow:' + esc(a.glow) + '">' +
    '<div class="line__art">' + artHTML(p, true) + '</div>' +
    '<div><div class="line__n">' + esc(p.name) + '</div>' +
    '<div class="line__m">' + money(p.price) + '</div>' +
    '<div class="line__q">' +
      '<button data-d="-1" data-id="' + esc(p.id) + '" aria-label="Bớt một ' + esc(p.name) + '"><span class="ms" style="font-size:15px">remove</span></button>' +
      '<span>' + c.q + '</span>' +
      '<button data-d="1" data-id="' + esc(p.id) + '" aria-label="Thêm một ' + esc(p.name) + '"><span class="ms" style="font-size:15px">add</span></button>' +
    '</div></div>' +
    '<button class="line__x" data-x="' + esc(p.id) + '" aria-label="Bỏ ' + esc(p.name) + ' khỏi giỏ"><span class="ms ms--sm">close</span></button>' +
  '</div>';
}
function wireLines(box) {
  box.onclick = function (e) {
    var d = e.target.closest('[data-d]');
    if (d) {
      var cur = 0;
      for (var i = 0; i < cart.length; i++) if (cart[i].id === d.dataset.id) cur = cart[i].q;
      setQty(d.dataset.id, cur + Number(d.dataset.d));
      return;
    }
    var x = e.target.closest('[data-x]');
    if (x) setQty(x.dataset.x, 0);
  };
}

function renderCart() {
  if (!D) return;
  cart = cart.filter(function (c) { return byId(c.id) && c.q > 0; });
  var n = cartCount(), badge = $('#cartCount');
  if (badge) { badge.textContent = n; badge.classList.toggle('is-zero', n === 0); }

  var body = $('#cartBody'), foot = $('#cartFoot');
  if (body && foot) {
    if (!cart.length) {
      body.innerHTML = '<div class="drawer__empty"><span class="ms">shopping_bag</span>' + esc(D.labels.cart_empty) + '</div>';
      foot.innerHTML = '<a class="btn btn--ghost btn--full" href="products.html">Xem 5 mùi hương</a>';
    } else {
      body.innerHTML = cart.map(lineHTML).join('');
      wireLines(body);
      var sub = subtotal(), free = D.labels.free_ship, fee = shipFee(sub);
      foot.innerHTML =
        '<div class="ship"><div class="sum" style="padding:0">' +
          (sub >= free ? '<span>Đơn này được miễn phí giao hàng.</span>'
                       : '<span>Mua thêm <b>' + money(free - sub) + '</b> để miễn phí giao.</span>') +
        '</div><div class="ship__bar"><i class="ship__fill" style="width:' + Math.min(100, sub / free * 100).toFixed(1) + '%"></i></div></div>' +
        '<div class="sum"><span>Tạm tính</span><b>' + money(sub) + '</b></div>' +
        '<div class="sum"><span>Phí giao</span><b>' + (fee ? money(fee) : 'Miễn phí') + '</b></div>' +
        '<div class="sum sum--total"><span>Tổng</span><b>' + money(sub + fee) + '</b></div>' +
        '<a class="btn btn--primary btn--full" href="checkout.html" style="margin-top:14px">' +
          '<span class="ms">lock</span> Tới thanh toán</a>';
    }
  }
  if ($('#coLines')) renderCheckout();
}

/* ═════════════════════════════════════════════════════════════════════════
   NẠP DỮ LIỆU
   fetch cần HTTP: mở bằng file:// sẽ rơi thẳng vào nhánh lỗi, và thông báo ở
   đó phải nói đúng cách chạy chứ không chỉ nói "không tải được".
   ═════════════════════════════════════════════════════════════════════════ */
fetch('data/shop.json', { cache: 'no-cache' })
  .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' khi đọc data/shop.json'); return r.json(); })
  .then(boot)
  .catch(function (err) {
    $$('[data-needs-data]').forEach(function (el) { el.style.display = 'none'; });
    var host = $('#dataError');
    if (!host) return;
    host.innerHTML = '<div class="oops"><b>Chưa nạp được nội dung cửa hàng.</b><br>' + esc(err.message) +
      ' — trang đọc <code>data/shop.json</code> bằng fetch nên phải chạy qua HTTP. ' +
      'Mở terminal ở thư mục gốc của repo, chạy <code>python3 -m http.server</code> ' +
      'rồi vào <code>http://localhost:8000/shop/</code>.</div>';
  });

function boot(d) {
  D = d;
  CUR = (d.labels && d.labels.currency) || CUR;

  /* dải cảnh báo nội dung mẫu — biến mất khi mọi cờ placeholder đã hạ */
  var flags = countPlaceholders(d);
  var ph = $('#phBanner');
  if (ph && flags) {
    ph.innerHTML = '<div class="wrap phb__in"><span class="ms ms--sm">draft</span>' +
      '<span>' + esc(d.placeholder_banner) + ' <b>(' + flags + ' mục)</b></span></div>';
    ph.hidden = false;
  }
  /* Dải cao bao nhiêu thì nav phải bắt đầu thấp bấy nhiêu — và nó xuống hai dòng ở màn
     hẹp, nên con số phải ĐO chứ không đoán. */
  measureBanner();
  window.addEventListener('resize', measureBanner);

  var b = d.brand, fc = $('#footContact');
  if (fc) fc.innerHTML =
    '<ul class="foot__me">' +
      '<li><span class="ms ms--sm">call</span><a href="tel:' + esc(b.phone.replace(/\s/g, '')) + '">' + esc(b.phone) + '</a></li>' +
      '<li><span class="ms ms--sm">mail</span><a href="mailto:' + esc(b.email) + '">' + esc(b.email) + '</a></li>' +
      '<li><span class="ms ms--sm">schedule</span>' + esc(b.hours) + '</li>' +
      '<li><span class="ms ms--sm">location_on</span>' + esc(b.address) + ', ' + esc(b.city) + '</li>' +
    '</ul>';
  var fs = $('#footShip');
  if (fs) fs.innerHTML = d.shipping.map(function (s) {
    return '<div><b>' + esc(s.title) + '</b><span>' + esc(s.desc) + '</span></div>';
  }).join('');

  var ht = $('#heroTrust');
  if (ht) ht.innerHTML = d.hero_trust.map(function (t) {
    return '<li><span class="ms">' + esc(t.icon) + '</span>' + esc(t.text) + '</li>';
  }).join('');

  var mq = $('#marquee');
  if (mq) {
    /* nhân đôi để vòng lặp nối liền, không thấy mối */
    var row = d.marquee.map(function (t) { return '<span class="marquee__item">' + esc(t) + '</span>'; }).join('');
    mq.innerHTML = row + row;
  }

  if ($('#scentStrip')) renderLanding();
  if ($('#scentSections')) renderProducts();
  /* Hai trang này dựng MỘT lần ở đây, không dựng trong renderCart(). Bản trước móc nhầm
     vào cuối renderCart() — hai hàm cùng kết thúc bằng dòng `if ($('#coLines'))…` nên cái
     neo tìm-thay rơi trúng hàm kia. Hậu quả: mỗi lần giỏ đổi, renderGift() gọi lại
     gDefault() và cái hộp khách đang gói bị trả về mặc định, còn renderFinder() gắn thêm
     một listener bàn phím nữa. Đo được: bấm "thêm hộp" 8 lần ra 2 dòng giỏ, hộp ba ngọn
     tụt xuống một ngọn ngay sau lần bấm đầu. */
  renderFinder();
  renderGift();
  renderCart();
  $$('.rv').forEach(watch);
  track('view', { page: pageName() });
}

function countPlaceholders(d) {
  var n = d.brand && d.brand.placeholder ? 1 : 0;
  ['scents', 'products', 'values', 'faqs', 'shipping'].forEach(function (k) {
    (d[k] || []).forEach(function (x) { if (x.placeholder) n++; });
  });
  ((d.payment || {}).methods || []).forEach(function (m) { if (m.placeholder) n++; });
  return n;
}

/* ═════════════════════════════════════════════════════════════════════════
   TRANG CHỦ
   ═════════════════════════════════════════════════════════════════════════ */
function renderLanding() {
  $('#scentStrip').innerHTML = D.scents.map(function (s, i) {
    var p = productOfScent(s.k);
    return '<a class="scard rv" href="products.html#' + esc(s.k) + '"' +
        ' style="--glass:' + esc(s.art.glass) + ';--wax:' + esc(s.art.wax) + ';--glow:' + esc(s.art.glow) +
        ';--d:' + (i * .06).toFixed(2) + 's">' +
      '<span class="scard__n">' + esc(s.n) + '</span>' +
      '<span class="scard__art">' + (p ? artHTML(p) : '') + '</span>' +
      '<span class="scard__b">' +
        '<span class="scard__name">' + esc(s.name) + '</span>' +
        '<span class="scard__slot">' + esc(s.slot) + '</span>' +
        (p ? '<span class="scard__price">' + money(p.price) + '</span>' : '') +
      '</span>' +
      '<span class="scard__go"><span class="ms ms--sm">arrow_forward</span></span>' +
    '</a>';
  }).join('');

  var v = $('#valsHost');
  if (v) v.innerHTML = D.values.map(function (x) {
    return '<div class="val"><div class="val__ico"><span class="ms">' + esc(x.icon) + '</span></div>' +
      '<h3>' + esc(x.title) + '</h3><p>' + esc(x.desc) + '</p></div>';
  }).join('');

  var f = $('#faqHost');
  if (f) {
    f.innerHTML = D.faqs.map(function (q, i) {
      return '<div class="faq__i"><button class="faq__q" aria-expanded="false" aria-controls="fa' + i + '">' +
        esc(q.q) + '<span class="ms">expand_more</span></button>' +
        '<div class="faq__a" id="fa' + i + '"><div><p>' + esc(q.a) + '</p></div></div></div>';
    }).join('');
    $$('.faq__q', f).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.parentNode.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }
}
function productOfScent(k) {
  for (var i = 0; i < D.products.length; i++) if (D.products[i].scent === k) return D.products[i];
  return null;
}

/* ═════════════════════════════════════════════════════════════════════════
   TRANG MÙI HƯƠNG
   Mỗi mùi là một section chiếm trọn màn hình và mang bộ màu riêng. Khi cuộn
   tới, hai biến màu của cả trang đổi theo — nên nền, quầng sáng và nút bấm
   chuyển dần sang không khí của mùi đang đọc.
   ═════════════════════════════════════════════════════════════════════════ */
function renderProducts() {
  var host = $('#scentSections'), rail = $('#scentRail');

  host.innerHTML = D.scents.map(function (s) {
    var p = productOfScent(s.k);
    var tiers = [['top', 'Hương đầu'], ['heart', 'Hương giữa'], ['base', 'Hương cuối']];
    var k = 0;
    var notes = '<div class="notes">' + tiers.map(function (t) {
      var list = (s.notes || {})[t[0]];
      if (!list || !list.length) return '';
      return '<div class="notes__row"><div class="notes__k">' + t[1] + '</div><div class="notes__v">' +
        list.map(function (nn) { return '<span class="tag" style="animation-delay:' + (.05 * (++k)).toFixed(2) + 's">' + esc(nn) + '</span>'; }).join('') +
        '</div></div>';
    }).join('') + '</div>';

    var buy = p ? (
      '<div class="buy">' +
        '<div class="buy__top">' +
          '<div><div class="buy__name">' + esc(p.name) + '</div>' +
          '<div class="buy__sub">' + esc(p.sub) + '</div></div>' +
          '<div class="buy__price">' + money(p.price) +
            (p.compare ? ' <span class="price--was">' + money(p.compare) + '</span>' : '') + '</div>' +
        '</div>' +
        '<table class="specs"><tbody>' + (p.specs || []).map(function (sp) {
          return '<tr><td>' + esc(sp.k) + '</td><td>' + esc(sp.v) + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<div class="buy__row">' +
          '<span class="tag">' + (p.stock > 0 ? 'Còn ' + p.stock : 'Tạm hết') + '</span>' +
          '<button class="btn btn--primary" data-add="' + esc(p.id) + '"' + (p.stock > 0 ? '' : ' disabled') + '>' +
            '<span class="ms">shopping_bag</span> Thêm vào giỏ</button>' +
        '</div>' +
        (p.care ? '<p class="modal__care"><span class="ms ms--sm">tips_and_updates</span>' + esc(p.care) + '</p>' : '') +
      '</div>') : '';

    return '<section class="scent" id="' + esc(s.k) + '" data-scent="' + esc(s.k) + '"' +
        ' style="--glass:' + esc(s.art.glass) + ';--wax:' + esc(s.art.wax) + ';--glow:' + esc(s.art.glow) + '">' +
      '<div class="wrap scent__grid">' +
        '<div class="scent__art rv">' + (p ? artHTML(p) : '') + '</div>' +
        '<div class="scent__copy">' +
          '<p class="scent__n rv">' + esc(s.n) + '</p>' +
          '<h2 class="display scent__name rv">' + esc(s.name) + '</h2>' +
          '<p class="scent__slot rv">' + esc(s.slot) + '</p>' +
          '<p class="lede rv">' + esc(s.feel) + '</p>' +
          '<p class="scent__when rv"><span class="ms ms--sm">schedule</span>' + esc(s.when) + '</p>' +
          '<div class="rv">' + notes + '</div>' +
          '<div class="rv">' + buy + '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }).join('');

  rail.innerHTML = D.scents.map(function (s) {
    return '<a class="rail__i" href="#' + esc(s.k) + '" data-rail="' + esc(s.k) + '">' +
      '<span class="rail__n">' + esc(s.n) + '</span>' +
      '<span class="rail__name">' + esc(s.name) + '</span></a>';
  }).join('');

  host.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add && !add.disabled) addToCart(add.dataset.add, 1, add);
  });

  /* mùi đang xem quyết định màu của cả trang */
  var wash = $('#scentWash');
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var k = e.target.dataset.scent, s = null;
      for (var i = 0; i < D.scents.length; i++) if (D.scents[i].k === k) s = D.scents[i];
      if (!s) return;
      root.style.setProperty('--scent-glow', s.art.glow);
      root.style.setProperty('--scent-glass', s.art.glass);
      if (wash) wash.style.setProperty('--glow', s.art.glow);
      $$('.rail__i').forEach(function (a) { a.classList.toggle('is-on', a.dataset.rail === k); });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  $$('.scent', host).forEach(function (s) { spy.observe(s); });

  if (!REDUCED) $$('.scent__art', host).forEach(function (box) {
    var svg = $('svg, .emblem', box);
    if (!svg) return;
    box.addEventListener('pointermove', function (e) {
      var r = box.getBoundingClientRect();
      svg.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * 14).toFixed(2) + 'deg');
      svg.style.setProperty('--rx', (((e.clientY - r.top) / r.height - .5) * -10).toFixed(2) + 'deg');
    });
    box.addEventListener('pointerleave', function () {
      svg.style.setProperty('--ry', '0deg'); svg.style.setProperty('--rx', '0deg');
    });
  });
}

/* ═════════════════════════════════════════════════════════════════════════
   TRANG THANH TOÁN
   Không có máy chủ, nên trang nói thẳng cách nào chạy được và cách nào còn
   thiếu gì — thay vì bày một nút Apple Pay bấm vào không có chuyện gì xảy ra.
   ═════════════════════════════════════════════════════════════════════════ */
var payPick = null;

function renderCheckout() {
  var lines = $('#coLines'), sum = $('#coSum'), pay = $('#coPay');
  if (!lines) return;

  if (!cart.length) {
    lines.innerHTML = '<div class="drawer__empty"><span class="ms">shopping_bag</span>' + esc(D.labels.cart_empty) +
      '</div><a class="btn btn--primary" href="products.html"><span class="ms">arrow_forward</span> Xem 5 mùi hương</a>';
    if (sum) sum.innerHTML = '';
    if (pay) pay.innerHTML = '';
    return;
  }

  lines.innerHTML = cart.map(lineHTML).join('');
  wireLines(lines);

  var sub = subtotal(), fee = shipFee(sub), total = sub + fee;
  if (sum) sum.innerHTML =
    '<div class="sum"><span>Tạm tính</span><b>' + money(sub) + '</b></div>' +
    '<div class="sum"><span>Phí giao</span><b>' + (fee ? money(fee) : 'Miễn phí') + '</b></div>' +
    '<div class="sum sum--total"><span>Tổng</span><b>' + money(total) + '</b></div>';

  if (!pay) return;
  if (!payPick) payPick = (D.payment.methods.filter(function (m) { return m.ready; })[0] || D.payment.methods[0]).k;

  pay.innerHTML = D.payment.methods.map(function (m) {
    return '<button class="pay' + (m.k === payPick ? ' is-on' : '') + '" data-pay="' + esc(m.k) + '">' +
      '<span class="pay__ico"><span class="ms">' + esc(m.icon) + '</span></span>' +
      '<span class="pay__b"><span class="pay__n">' + esc(m.name) +
        (m.ready ? '' : ' <span class="tag">chưa cấu hình</span>') + '</span>' +
      '<span class="pay__d">' + esc(m.desc) + '</span></span></button>';
  }).join('') + '<div class="paypanel" id="payPanel"></div>';

  $$('[data-pay]', pay).forEach(function (b) {
    b.addEventListener('click', function () { payPick = b.dataset.pay; track('pay_pick', { k: payPick }); renderCheckout(); });
  });
  renderPayPanel(total);
}

function renderPayPanel(total) {
  var box = $('#payPanel'); if (!box) return;
  var m = D.payment.methods.filter(function (x) { return x.k === payPick; })[0];
  if (!m) return;

  if (!m.ready) {
    box.innerHTML =
      '<div class="todo"><p class="todo__t"><span class="ms ms--sm">build</span> Còn thiếu để bật ' + esc(m.name) + '</p>' +
      '<ul>' + m.need.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      (m.k === 'applepay' ? '<p class="todo__n">' + applePayNote() + '</p>' : '') +
      '</div>' +
      '<button class="btn btn--primary btn--full" disabled><span class="ms">lock</span> ' + esc(m.name) + ' — chưa bật</button>';
    return;
  }

  if (m.k === 'bank') {
    var code = orderCode();
    var src = 'https://img.vietqr.io/image/' + encodeURIComponent(m.bank.bin) + '-' +
      encodeURIComponent(m.bank.account) + '-compact2.png?amount=' + total +
      '&addInfo=' + encodeURIComponent(code);
    box.innerHTML =
      '<div class="qr"><img alt="Mã VietQR cho đơn ' + esc(code) + '" src="' + esc(src) + '" width="260" height="330" />' +
      '<div class="qr__side">' +
        '<div class="qr__r"><span>Ngân hàng</span><b>' + esc(m.bank.name) + '</b></div>' +
        '<div class="qr__r"><span>Số tài khoản</span><b>' + esc(m.bank.account) + '</b></div>' +
        '<div class="qr__r"><span>Chủ tài khoản</span><b>' + esc(m.bank.holder) + '</b></div>' +
        '<div class="qr__r"><span>Số tiền</span><b>' + money(total) + '</b></div>' +
        '<div class="qr__r"><span>Nội dung</span><b>' + esc(code) + '</b></div>' +
      '</div></div>' +
      '<p class="todo__n">Chuyển xong nhắn cho shop mã <b>' + esc(code) + '</b> để đối soát.</p>';
    return;
  }

  box.innerHTML =
    '<div class="order" id="orderText">' + esc(orderText(total)) + '</div>' +
    '<button class="btn btn--ghost btn--full" id="copyBtn" style="margin-top:10px">' +
      '<span class="ms">content_copy</span> Sao chép nội dung đơn</button>' +
    '<p class="todo__n">' + esc(D.labels.order_note) + '</p>';
  $('#copyBtn').addEventListener('click', function () {
    var txt = orderText(subtotal() + shipFee(subtotal()));
    track('order_copy', { total: subtotal() + shipFee(subtotal()), n: cartCount() });
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(
      function () { toast('Đã sao chép nội dung đơn'); },
      function () { toast('Không sao chép được — bôi đen rồi copy tay'); });
    else toast('Trình duyệt không cho sao chép tự động — bôi đen rồi copy tay');
  });
}

function applePayNote() {
  if (!window.ApplePaySession) return 'Máy/trình duyệt này không có Apple Pay — nút chỉ hiện trên Safari của iPhone, iPad hoặc Mac.';
  try {
    return ApplePaySession.canMakePayments()
      ? 'Máy này CÓ Apple Pay: khi cấu hình xong, nút sẽ chạy ngay ở đây.'
      : 'Trình duyệt này có Apple Pay nhưng chưa có thẻ nào được thêm vào Wallet.';
  } catch (e) { return 'Không kiểm tra được trạng thái Apple Pay trên máy này.'; }
}

/* Mã đơn ngắn, đủ để đối soát chuyển khoản. KHÔNG nhét tên hay địa chỉ người mua
   vào đây: nội dung này đi thẳng vào URL của ảnh QR, tức là ra khỏi máy người dùng. */
function orderCode() {
  var t = new Date();
  var two = function (x) { return (x < 10 ? '0' : '') + x; };
  var seed = cart.map(function (c) { return c.id + c.q; }).join('');
  var h = 0;
  for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  return 'SS' + two(t.getMonth() + 1) + two(t.getDate()) + two(h % 100);
}

function orderText(total) {
  var b = D.brand, L = ['ĐƠN HÀNG — ' + b.name, 'Mã: ' + orderCode(), '───────────────'];
  cart.forEach(function (c) {
    var p = byId(c.id);
    L.push(c.q + ' × ' + p.name + '   ' + money(p.price * c.q));
    /* Một dòng "Hộp quà · Hộp đôi 552.000" không đủ để shop gói đúng hộp. Nội dung đơn
       là thứ DUY NHẤT shop nhận được (trang không có máy chủ), nên nó phải chứa đủ mùi,
       thiệp, cách gói và lời nhắn — nếu không thì khách phải nhắn lại lần nữa. */
    if (p.gift) {
      var cd = giftCard(p.gift.card), wr = giftWrap(p.gift.wrap);
      L.push('      mùi: ' + p.sub);
      if (cd) L.push('      thiệp: ' + cd.name);
      if (wr) L.push('      gói: ' + wr.name);
      if (p.gift.msg) L.push('      lời nhắn: "' + p.gift.msg + '"');
    }
  });
  var sub = subtotal();
  L.push('───────────────');
  L.push('Tạm tính: ' + money(sub));
  L.push('Phí giao: ' + (shipFee(sub) ? money(shipFee(sub)) : 'miễn phí'));
  L.push('TỔNG:     ' + money(total));
  L.push('');
  L.push('Họ tên:');
  L.push('Số điện thoại:');
  L.push('Địa chỉ giao:');
  L.push('');
  L.push('Gửi tới ' + b.phone + ' hoặc ' + b.email);
  return L.join('\n');
}


/* ═════════════════════════════════════════════════════════════════════════
   HÌNH HỘP QUÀ
   Cùng lý do với hình sản phẩm: chưa có ảnh chụp. Hộp vẽ từ màu giấy + màu nơ
   của cách gói, cộng màu sáp/quầng của từng mùi đã chọn — nên nó đổi ngay khi
   người ta bấm, và đúng bằng thứ họ vừa chọn.
   ═════════════════════════════════════════════════════════════════════════ */
function giftSVG(g, px) {
  var wrap = giftWrap(g.wrap) || { paper: '#C9A87C', ribbon: '#8A7350' };
  var u = 'g' + (++uid);
  var paper = esc(wrap.paper), ribbon = esc(wrap.ribbon);
  var ks = (g.scents || []).filter(Boolean);
  var n = Math.max(1, ks.length);

  var defs =
    '<defs>' +
      '<linearGradient id="bp' + u + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#000" stop-opacity=".26"/>' +
        '<stop offset="14%" stop-color="' + paper + '"/>' +
        '<stop offset="62%" stop-color="' + paper + '"/>' +
        '<stop offset="100%" stop-color="#000" stop-opacity=".2"/></linearGradient>' +
      '<linearGradient id="bl' + u + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#FFF" stop-opacity=".22"/>' +
        '<stop offset="100%" stop-color="#FFF" stop-opacity="0"/></linearGradient>' +
    '</defs>';

  /* Các ly nến nhô lên khỏi miệng hộp. Bề rộng chia đều theo số ngăn nên hộp một ngọn
     không bị một cái ly gầy đứng giữa khoảng trống. */
  var span = n === 1 ? 74 : (n === 2 ? 116 : 152);
  var w = span / n, jars = '';
  for (var i = 0; i < n; i++) {
    var sc = null;
    for (var j = 0; j < D.scents.length; j++) if (D.scents[j].k === ks[i]) sc = D.scents[j];
    var a = (sc && sc.art) || { glass: '#6B5B4E', wax: '#F2E7D3', glow: '#FF9F45' };
    var cx = 150 - span / 2 + w * i + w / 2;
    var jw = Math.min(46, w - 7);
    /* Ly cao 82 và bắt đầu ở y=88, trong khi mặt trước hộp bắt đầu ở y=152: nhô lên 64px.
       Bản trước để y=104 (nhô 46px) và ba cái ly trông cụt như ba cái nắp chai. */
    jars +=
      '<g>' +
        '<rect x="' + (cx - jw / 2) + '" y="88" width="' + jw + '" height="82" rx="8" fill="' + esc(a.glass) + '"/>' +
        '<rect x="' + (cx - jw / 2 + 4) + '" y="102" width="' + (jw - 8) + '" height="64" rx="6" fill="' + esc(a.wax) + '"/>' +
        '<ellipse cx="' + cx + '" cy="102" rx="' + (jw / 2 - 4) + '" ry="3.6" fill="' + esc(a.wax) + '"/>' +
        '<ellipse cx="' + cx + '" cy="102" rx="' + (jw / 2 - 9) + '" ry="2.3" fill="' + esc(a.glow) + '" opacity=".55"/>' +
        '<path d="M' + cx + ' 102v-10" stroke="#3A2E24" stroke-width="2.2" stroke-linecap="round"/>' +
        '<ellipse cx="' + cx + '" cy="88" rx="' + (jw / 2) + '" ry="4" fill="none" stroke="#FFF" stroke-opacity=".26" stroke-width="1.1"/>' +
        '<rect x="' + (cx - jw / 2 + 3) + '" y="96" width="4" height="66" rx="2" fill="#FFF" opacity=".17"/>' +
      '</g>';
  }

  var card = '';
  var cd = giftCard(g.card);
  if (cd && cd.k !== 'c0') {
    /* Thiệp tựa vào mép trái hộp và nhô xuống dưới đáy một chút — thế mới ra "dựng vào",
       chứ nằm gọn trong lòng hộp thì nó giống một miếng dán. */
    card =
      '<g transform="rotate(-9 66 206)">' +
        '<rect x="30" y="176" width="72" height="52" rx="4" fill="#F6EEDC" stroke="#000" stroke-opacity=".14"/>' +
        '<path d="M40 190h52M40 199h46M40 208h32" stroke="#8A7A66" stroke-width="1.7" stroke-linecap="round" opacity=".7"/>' +
        (cd.k === 'c2' ? '<path d="M86 220c-6-3.5-8-10.5-6-15 4.6 2.3 8 8 6 15Z" fill="#B08A6A" opacity=".85"/>' +
                         '<circle cx="86" cy="205" r="2.4" fill="#C7A07E"/>' : '') +
      '</g>';
  }

  return '<svg class="pcard__svg" viewBox="0 0 300 260" style="width:' + px + 'px;max-width:100%" aria-hidden="true">' +
    defs +
    '<ellipse cx="150" cy="234" rx="100" ry="12" fill="#000" opacity=".16"/>' +
    /* tấm lưng đứng sau ly — không có nó thì ly như cắm xuống nền, không nằm trong hộp */
    '<rect x="58" y="132" width="184" height="46" rx="8" fill="' + paper + '" opacity=".55"/>' +
    jars +
    /* mặt trước hộp vẽ SAU nên nó che chân ly */
    '<rect x="52" y="152" width="196" height="78" rx="11" fill="url(#bp' + u + ')"/>' +
    '<rect x="52" y="152" width="196" height="24" rx="11" fill="url(#bl' + u + ')"/>' +
    '<rect x="44" y="142" width="212" height="24" rx="8" fill="url(#bp' + u + ')" stroke="#000" stroke-opacity=".12"/>' +
    card +
    /* nơ: dải dọc + hai cánh + hai đuôi buông xuống */
    '<rect x="136" y="142" width="28" height="88" fill="' + ribbon + '" opacity=".93"/>' +
    '<path d="M150 214l-13 22 13-7 13 7-13-22Z" fill="' + ribbon + '" opacity=".8"/>' +
    '<path d="M150 140c-20-11-43-8-43 6s23 13 43 1c20 12 43 13 43-1s-23-17-43-6Z" fill="' + ribbon + '"/>' +
    '<path d="M150 140c-13-7-27-5-27 4s14 8 27 1c13 7 27 8 27-1s-14-11-27-4Z" fill="#000" opacity=".12"/>' +
    '<circle cx="150" cy="143" r="8.5" fill="' + ribbon + '" stroke="#000" stroke-opacity=".16"/>' +
  '</svg>';
}

/* ═════════════════════════════════════════════════════════════════════════
   TÌM MÙI
   Chấm điểm bằng trọng số khai trong data, không bằng so tag. Cổng lint duyệt
   toàn bộ tổ hợp đáp án để chắc rằng mùi nào cũng thắng được — nếu không, có
   một mùi trong cửa hàng mà trang này không bao giờ giới thiệu cho ai.
   ═════════════════════════════════════════════════════════════════════════ */
var FQ = [], FAns = {}, FStep = -1;

function fScoring() { return FQ.filter(function (q) { return q.scoring !== false; }); }
function fPicked(q) {
  var k = FAns[q.k];
  if (k == null) return null;
  return q.options.filter(function (o) { return o.k === k; })[0] || null;
}

function fScores() {
  var sc = {};
  D.scents.forEach(function (s) { sc[s.k] = 0; });
  fScoring().forEach(function (q) {
    var o = fPicked(q); if (!o) return;
    for (var k in o.w) if (sc[k] != null) sc[k] += o.w[k];
  });
  return sc;
}

/* Trần điểm của một mùi: nếu người ta trả lời mọi câu theo hướng có lợi nhất cho nó.
   Tỉ lệ khớp = điểm đạt / trần này — tức là "câu trả lời của bạn nghiêng về mùi này
   mạnh đến đâu", chứ không phải "mùi này chiếm bao nhiêu phần trăm số điểm". Cách sau
   luôn ra khoảng 25–35% với năm mùi và đọc lên như một lời chê. */
function fCeiling(k) {
  return fScoring().reduce(function (sum, q) {
    return sum + Math.max.apply(null, q.options.map(function (o) { return (o.w && o.w[k]) || 0; }));
  }, 0);
}

function fRank() {
  var sc = fScores();
  var tbk = (D.quiz || {}).tiebreak;
  var tq = FQ.filter(function (q) { return q.k === tbk; })[0];
  var tw = (tq && fPicked(tq) && fPicked(tq).w) || {};
  var order = {};
  D.scents.forEach(function (s, i) { order[s.k] = i; });
  return D.scents.slice().sort(function (a, b) {
    if (sc[b.k] !== sc[a.k]) return sc[b.k] - sc[a.k];
    /* Hoà ở đỉnh thì câu ký ức phân xử — đó là câu nói thẳng vào một mùi, nên nó là
       tín hiệu mạnh nhất còn lại. Vẫn hoà thì theo thứ tự trong data, và chỗ đó có
       thiên vị mùi đứng trước: đo được 2,2% số tổ hợp rơi vào đây. */
    var d = ((tw[b.k] || 0) - (tw[a.k] || 0));
    if (d) return d;
    return order[a.k] - order[b.k];
  }).map(function (s) { return { s: s, score: sc[s.k] }; });
}

function fPaint(k) {
  var s = null;
  for (var i = 0; i < D.scents.length; i++) if (D.scents[i].k === k) s = D.scents[i];
  if (!s) return;
  root.style.setProperty('--scent-glow', s.art.glow);
  root.style.setProperty('--scent-glass', s.art.glass);
}

function fShow(id) {
  ['sfIntro', 'sfQ', 'sfR'].forEach(function (x) {
    var el = $('#' + x); if (!el) return;
    el.classList.toggle('is-on', x === id);
  });
}

function fGo(i) {
  FStep = i;
  if (i < 0) { fShow('sfIntro'); return; }
  if (i >= FQ.length) { fResult(); return; }
  fQuestion(FQ[i], i);
  /* Nền nghiêng dần về mùi đang dẫn ngay khi có câu trả lời đầu tiên — tới lúc ra
     kết quả người ta đã nhìn màu đó một lúc, nên kết quả không đến từ hư không. */
  var r = fRank();
  if (r[0] && r[0].score > 0) fPaint(r[0].s.k);
  var st = $('#sfStage');
  if (st && st.getBoundingClientRect().top < 0) st.scrollIntoView({ block: 'start' });
}

function fQuestion(q, i) {
  var sco = fScoring(), tot = FQ.length;
  var pips = FQ.map(function (_, j) {
    return '<i class="sfbar__pip' + (j < i ? ' is-done' : (j === i ? ' is-now' : '')) + '"></i>';
  }).join('');
  var picked = FAns[q.k];

  $('#sfQ').innerHTML = '<div class="sfmid">' +
    '<div class="sfbar"><div class="sfbar__pips">' + pips + '</div>' +
      '<span class="sfbar__n">Câu ' + (i + 1) + ' / ' + tot + '</span></div>' +
    '<div class="sfhead"><h2 class="sfq" id="sfQH" tabindex="-1">' + esc(q.q) + '</h2></div>' +
    '<p class="sfhint">' + esc(q.hint) + '</p>' +
    '<div class="sfopts">' + q.options.map(function (o, j) {
      return '<button class="sfopt' + (picked === o.k ? ' is-picked' : '') + '" data-o="' + esc(o.k) + '"' +
        ' style="animation-delay:' + (j * 52) + 'ms">' +
        '<span class="sfopt__k">' + (j + 1) + '</span>' +
        '<span class="sfopt__t">' + esc(o.t) +
          (o.s ? '<span class="sfopt__s">' + esc(o.s) + '</span>' : '') + '</span></button>';
    }).join('') + '</div>' +
    (i > 0 ? '<button class="sfback" id="sfBack"><span class="ms ms--sm">arrow_back</span>Câu trước</button>' : '') +
    '</div>';

  fShow('sfQ');
  /* Đổi câu là thay sạch innerHTML, nên nút vừa bấm bị huỷ và tiêu điểm rơi về <body> —
     đo được: sau câu 1, document.activeElement là BODY. Người dùng bàn phím phải Tab lại
     từ đầu trang, mỗi câu một lần. Dời tiêu điểm sang tiêu đề câu mới vừa sửa việc đó vừa
     khiến trình đọc màn hình đọc đúng câu hỏi, không đọc lại cả khối. */
  var qh = $('#sfQH');
  if (qh) qh.focus({ preventScroll: true });

  $$('#sfQ [data-o]').forEach(function (b) {
    b.addEventListener('click', function () {
      FAns[q.k] = b.dataset.o;
      track('quiz_answer', { i: i + 1, q: q.k, opt: b.dataset.o });
      /* Chờ 170ms trước khi sang câu sau: người ta cần thấy ô mình vừa bấm sáng lên,
         nếu không thì cảm giác như lỡ tay bấm nhầm. */
      b.classList.add('is-picked');
      setTimeout(function () { fGo(i + 1); }, REDUCED ? 0 : 170);
    });
  });
  var back = $('#sfBack');
  if (back) back.addEventListener('click', function () { fGo(i - 1); });
}

function fResult() {
  var rank = fRank(), win = rank[0], alt = rank[1];
  var pr = productOfScent(win.s.k);
  var ceil = fCeiling(win.s.k);
  var pct = ceil ? Math.round(win.score / ceil * 100) : 0;
  fPaint(win.s.k);

  /* "Vì sao" liệt kê đúng những câu đã đẩy về phía mùi này, kèm số điểm. Không có nó
     thì trang chỉ là một cái máy kéo xèng nói "mùi 03" mà không ai tin. */
  var why = fScoring().map(function (q) {
    var o = fPicked(q); if (!o) return null;
    var w = (o.w && o.w[win.s.k]) || 0;
    return w > 0 ? { t: o.t, w: w } : null;
  }).filter(Boolean).sort(function (a, b) { return b.w - a.w; });

  var intentQ = FQ.filter(function (q) { return q.scoring === false; })[0];
  var go = (intentQ && fPicked(intentQ) && fPicked(intentQ).go) || 'product';
  var out = ((D.quiz || {}).outro || []).filter(function (x) { return x.k === go; })[0] ||
            { k: 'product', t: 'Thêm vào giỏ', d: '' };

  var href = { gift: 'gift.html', browse: 'products.html' }[out.k];
  var cta = href
    ? '<a class="btn btn--primary" href="' + href + '"><span class="ms">arrow_forward</span>' + esc(out.t) + '</a>'
    : '<button class="btn btn--primary" id="sfAdd"' + (pr && pr.stock > 0 ? '' : ' disabled') + '>' +
        '<span class="ms">shopping_bag</span>' + esc(pr && pr.stock > 0 ? out.t : 'Mùi này đang tạm hết') + '</button>';

  track('quiz_done', { scent: win.s.k, pct: pct, intent: go, alt: alt ? alt.s.k : '' });

  var C = 2 * Math.PI * 22;
  $('#sfR').innerHTML =
    '<div class="sfres">' +
      '<div class="sfres__art"><div class="sfres__halo"></div>' + (pr ? artHTML(pr) : '') + '</div>' +
      '<div>' +
        '<div class="sfmatch">' +
          '<div class="sfmatch__ring"><svg viewBox="0 0 52 52">' +
            '<circle cx="26" cy="26" r="22" stroke="var(--line)"/>' +
            '<circle cx="26" cy="26" r="22" stroke="var(--ember)" stroke-dasharray="' + C.toFixed(1) + '"' +
              ' stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/>' +
          '</svg><span class="sfmatch__pct">' + pct + '%</span></div>' +
          '<span class="sfmatch__t">' + esc((D.quiz || {}).result_lede || '') + '</span>' +
        '</div>' +
        '<p class="sfslot">' + esc(win.s.slot) + '</p>' +
        '<h2 class="sfname" id="sfRH" tabindex="-1">' + esc(win.s.name) + '</h2>' +
        '<p class="sffeel">' + esc(win.s.feel) + '</p>' +
        '<div class="sfwhy"><h3>' + esc((D.quiz || {}).why_title || '') + '</h3><ul>' +
          why.map(function (x) {
            return '<li><span class="ms ms--sm">arrow_right_alt</span><span><b>' + esc(x.t) + '</b> ' +
                   '<em>+' + x.w + '</em></span></li>';
          }).join('') +
        '</ul></div>' +
        '<div class="sfacts">' + cta +
          '<button class="btn btn--ghost" id="sfAgain"><span class="ms">refresh</span>' +
            esc((D.quiz || {}).again || 'Làm lại') + '</button>' +
        '</div>' +
        (alt ? '<a class="sfalt" href="products.html#' + esc(alt.s.k) + '">' +
          '<span class="sfalt__sw" style="background:linear-gradient(135deg,' + esc(alt.s.art.glow) + ',' + esc(alt.s.art.glass) + ')"></span>' +
          '<span class="sfalt__t"><b>' + esc(alt.s.name) + '</b><span>' + esc((D.quiz || {}).alt_title || '') + '</span></span>' +
          '<span class="ms ms--sm">chevron_right</span></a>' : '') +
      '</div>' +
    '</div>';

  fShow('sfR');
  var rh = $('#sfRH');
  if (rh) rh.focus({ preventScroll: true });
  var addBtn = $('#sfAdd');
  if (addBtn && pr) addBtn.addEventListener('click', function () { addToCart(pr.id, 1, addBtn); });
  $('#sfAgain').addEventListener('click', function () { track('quiz_again'); FAns = {}; fGo(-1); });
  var st = $('#sfStage'); if (st) st.scrollIntoView({ block: 'start' });
}

function renderFinder() {
  var stage = $('#sfStage'); if (!stage || !D.quiz) return;
  FQ = D.quiz.questions || [];
  $('#sfIntroLede').textContent = D.quiz.intro || '';
  $('#sfPrivacy').textContent = D.quiz.privacy || '';
  $('#sfStartT').textContent = D.quiz.cta || 'Bắt đầu';
  $('#sfStart').addEventListener('click', function () { track('quiz_start'); fGo(0); });

  window.addEventListener('pagehide', function () {
    if (FStep >= 0 && FStep < FQ.length) track('quiz_leave', { at: FStep + 1 });
  });

  /* Bàn phím: 1–9 chọn đáp án, Backspace lùi một câu. Bộ câu hỏi nào cũng nên bấm
     được bằng bàn phím — người dùng bàn phím đi qua đây nhiều lần thì chuột là cực hình. */
  document.addEventListener('keydown', function (e) {
    if (FStep < 0 || FStep >= FQ.length) return;
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === 'Backspace' && FStep > 0) { e.preventDefault(); fGo(FStep - 1); return; }
    var n = parseInt(e.key, 10);
    if (!n) return;
    var opts = $$('#sfQ [data-o]');
    if (opts[n - 1]) { e.preventDefault(); opts[n - 1].click(); }
  });
}

/* ═════════════════════════════════════════════════════════════════════════
   HỘP QUÀ
   Bốn bước, một cái hộp vẽ lại sau mỗi lần bấm. Giá hiện đầy đủ ngay từ bước
   một — không có phí nào mọc ra ở bước cuối.
   ═════════════════════════════════════════════════════════════════════════ */
var G = null;

function gDefault() {
  var gi = D.gift;
  return {
    box: gi.boxes[0].k,
    scents: [ (D.scents[0] || {}).k ],
    card: gi.cards[1] ? gi.cards[1].k : gi.cards[0].k,
    wrap: gi.wraps[0].k,
    msg: ''
  };
}

/* Đổi hộp thì số ngăn đổi theo: cắt bớt hoặc bù thêm bằng mùi đầu tiên. Không làm thế
   thì hộp ba ngọn vẫn giữ một mùi và giá tính sai. */
function gFitScents() {
  var n = (giftBox(G.box) || { n: 1 }).n;
  while (G.scents.length > n) G.scents.pop();
  while (G.scents.length < n) G.scents.push((D.scents[G.scents.length % D.scents.length] || D.scents[0]).k);
}

function gRender() {
  var gi = D.gift, L = gi.labels || {};
  gFitScents();
  /* Nhớ nút nào đang giữ tiêu điểm TRƯỚC khi thay DOM, để trả lại sau. Cùng lớp lỗi với
     trang Tìm mùi: bấm một chấm mùi là cả khối bị vẽ lại, nút vừa bấm bị huỷ, tiêu điểm
     rơi về <body>. Nhận dạng bằng bộ data-* chứ không bằng tham chiếu phần tử — phần tử
     cũ đã không còn tồn tại. */
  var a = document.activeElement, keep = null;
  if (a && a.dataset) {
    if (a.dataset.slot != null) keep = '[data-slot="' + a.dataset.slot + '"][data-scent="' + a.dataset.scent + '"]';
    else if (a.dataset.box) keep = '[data-box="' + a.dataset.box + '"]';
    else if (a.dataset.card) keep = '[data-card="' + a.dataset.card + '"]';
    else if (a.dataset.wrap) keep = '[data-wrap="' + a.dataset.wrap + '"]';
  }

  var opt = function (on, t, d, price) {
    return '<span class="gbopt__t">' + esc(t) +
      (price ? '<span class="gbopt__p">+' + money(price) + '</span>' : '') + '</span>' +
      (d ? '<span class="gbopt__d">' + esc(d) + '</span>' : '');
  };

  var steps = gi.steps.map(function (st) {
    var body = '';
    if (st.k === 'box') {
      body = '<div class="gbpick">' + gi.boxes.map(function (b) {
        return '<button class="gbopt' + (G.box === b.k ? ' is-picked' : '') + '" data-box="' + esc(b.k) + '">' +
          opt(G.box === b.k, b.name, b.desc, 0) +
          (b.off ? '<span class="gbopt__d" style="color:var(--ember)">' + esc(L.save || '') + ' ' + b.off + '%</span>' : '') +
          '</button>';
      }).join('') + '</div>';
    } else if (st.k === 'scent') {
      body = G.scents.map(function (k, i) {
        return '<div class="gbslot"><div class="gbslot__h">Ngăn ' + (i + 1) + '</div><div class="gbdots">' +
          D.scents.map(function (s) {
            return '<button class="gbdot' + (k === s.k ? ' is-picked' : '') + '" data-slot="' + i + '" data-scent="' + esc(s.k) + '"' +
              ' title="' + esc(s.name) + '" aria-label="Ngăn ' + (i + 1) + ': ' + esc(s.name) + '"' +
              ' style="background:linear-gradient(140deg,' + esc(s.art.glow) + ',' + esc(s.art.glass) + ')">' +
              '<span>' + esc(s.n) + '</span></button>';
          }).join('') + '</div></div>';
      }).join('');
    } else if (st.k === 'card') {
      body = '<div class="gbpick">' + gi.cards.map(function (c) {
        return '<button class="gbopt' + (G.card === c.k ? ' is-picked' : '') + '" data-card="' + esc(c.k) + '">' +
          opt(G.card === c.k, c.name, c.desc, c.price) + '</button>';
      }).join('') + '</div>' +
      (G.card !== gi.cards[0].k ?
        '<label class="field gbmsg" style="margin-top:12px"><span>' + esc(gi.msg_label) + '</span>' +
          '<textarea id="gbMsg" maxlength="' + gi.msg_max + '" placeholder="' + esc(gi.msg_placeholder) + '">' + esc(G.msg) + '</textarea>' +
          '<i class="gbcount" id="gbCount"></i></label>' +
        '<p class="gbnote">' + esc(gi.msg_hint) + '</p>' : '');
    } else {
      body = '<div class="gbpick">' + gi.wraps.map(function (w) {
        return '<button class="gbopt' + (G.wrap === w.k ? ' is-picked' : '') + '" data-wrap="' + esc(w.k) + '">' +
          opt(G.wrap === w.k, w.name, w.desc, w.price) + '</button>';
      }).join('') + '</div>';
    }
    return '<section class="gbstep is-done"><div class="gbstep__h"><span class="gbstep__n">' +
      (gi.steps.indexOf(st) + 1) + '</span><span class="gbstep__t">' + esc(st.t) + '</span></div>' +
      '<p class="gbstep__d">' + esc(st.d) + '</p><div class="gbstep__body">' + body + '</div></section>';
  }).join('');
  $('#gbSteps').innerHTML = steps;

  /* hộp + tổng tiền */
  var pz = giftPrice(G), stock = giftStock(G);
  var first = null;
  for (var i = 0; i < D.scents.length; i++) if (D.scents[i].k === G.scents[0]) first = D.scents[i];
  if (first) {
    root.style.setProperty('--scent-glow', first.art.glow);
    root.style.setProperty('--scent-glass', first.art.glass);
  }
  $('#gbArt').innerHTML = giftSVG(G, 300);

  var cd = giftCard(G.card), wr = giftWrap(G.wrap), bx = giftBox(G.box);
  $('#gbSum').innerHTML =
    '<h3>' + esc(L.sum_title || '') + '</h3>' +
    '<div class="gbrow"><span>' + esc(bx.name) + ' · ' + G.scents.length + ' ngọn</span><b>' + money(pz.candles) + '</b></div>' +
    (pz.off ? '<div class="gbrow gbrow--save"><span>' + esc(L.save || '') + ' ' + bx.off + '%</span><b>−' + money(pz.off) + '</b></div>' : '') +
    (cd && cd.price ? '<div class="gbrow"><span>' + esc(cd.name) + '</span><b>' + money(cd.price) + '</b></div>' : '') +
    (wr && wr.price ? '<div class="gbrow"><span>' + esc(wr.name) + '</span><b>' + money(wr.price) + '</b></div>' : '') +
    '<div class="gbrow gbrow--total"><span>Tổng</span><b>' + money(pz.total) + '</b></div>' +
    '<button class="btn btn--primary btn--full" id="gbAdd" style="margin-top:14px"' + (stock > 0 ? '' : ' disabled') + '>' +
      '<span class="ms">card_giftcard</span>' + esc(stock > 0 ? (L.add || 'Thêm vào giỏ') : 'Một mùi trong hộp đang tạm hết') + '</button>' +
    '<p class="gbnote">' + esc(D.labels.order_note) + '</p>';

  gWire();
  if (keep) { var back = $(keep); if (back) back.focus({ preventScroll: true }); }
}

function gWire() {
  var set = function (sel, attr, fn) {
    $$(sel).forEach(function (b) { b.addEventListener('click', function () { fn(b.dataset[attr], b); gRender(); }); });
  };
  set('[data-box]',  'box',  function (v) { G.box = v; track('gift_change', { f: 'box', v: v }); });
  set('[data-card]', 'card', function (v) { G.card = v; track('gift_change', { f: 'card', v: v }); });
  set('[data-wrap]', 'wrap', function (v) { G.wrap = v; track('gift_change', { f: 'wrap', v: v }); });
  $$('[data-slot]').forEach(function (b) {
    b.addEventListener('click', function () {
      G.scents[Number(b.dataset.slot)] = b.dataset.scent;
      track('gift_change', { f: 'scent', v: b.dataset.scent, slot: Number(b.dataset.slot) });
      gRender();
    });
  });

  var msg = $('#gbMsg');
  if (msg) {
    var count = $('#gbCount'), max = D.gift.msg_max;
    var paint = function () {
      G.msg = msg.value;
      count.textContent = msg.value.length + ' / ' + max;
      count.classList.toggle('is-over', msg.value.length >= max);
    };
    paint();
    /* KHÔNG gRender() ở đây: vẽ lại cả trang mỗi lần gõ một chữ là mất tiêu điểm
       ngay giữa câu. Lời nhắn không đổi giá và không đổi hình hộp, nên chỉ cần ghi lại. */
    msg.addEventListener('input', paint);
  }

  var add = $('#gbAdd');
  if (add) add.addEventListener('click', function () {
    addGift({ box: G.box, scents: G.scents.slice(), card: G.card, wrap: G.wrap, msg: G.msg }, add);
  });
}

function renderGift() {
  if (!$('#gbSteps') || !D.gift) return;
  $('#gbIntro').textContent = D.gift.intro || '';
  G = gDefault();
  gRender();
}

})();
