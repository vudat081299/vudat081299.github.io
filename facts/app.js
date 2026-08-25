/* =============================================================================
   Fact — driver.
   -----------------------------------------------------------------------------
   Không framework, không build. Nhiệm vụ: nạp data/*.json, lọc/sắp xếp trong bộ
   nhớ, render từng trang card, và bật/tắt vài class trạng thái của web-builder
   (.is-open, .is-active). Toàn bộ phần nhìn nằm ở web-builder.css + facts.css.

   Dữ liệu nạp bằng fetch ⇒ trang phải chạy qua HTTP (GitHub Pages, hoặc
   `python3 -m http.server`). Mở bằng file:// sẽ báo lỗi có hướng dẫn.
   ========================================================================== */
(function () {
  'use strict';

  var PAGE = 48;                      /* số card mỗi lần render */

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var state = {
    facts: [],       /* toàn bộ fact + truyện, thứ tự nạp = thứ tự thêm vào thư viện */
    cats: [],        /* chủ đề của FACT — [{id,label,icon,desc}] */
    catMap: {},
    kieus: [],       /* kiểu của TRUYỆN — vốn từ tách hẳn, xem §7.0 */
    kieuMap: {},
    /* Một biến duy nhất cho cả thanh bên lẫn bộ chuyển ở đầu lưới. Nhận:
         'all' · 'fact' · 'chuyen' · <id chủ đề fact> · <id kiểu truyện>
       Hai vốn từ id không giao nhau nên tra một phát là biết đang ở nhánh nào. */
    cat: 'all',
    tag: '',
    q: '',
    sort: 'new',
    view: [],        /* kết quả sau lọc + sắp xếp */
    shown: 0,
    openId: null
  };

  var el = {
    rail:     $('[data-cats]'),
    grid:     $('[data-grid]'),
    empty:    $('[data-empty]'),
    moreWrap: $('[data-more-wrap]'),
    more:     $('[data-more]'),
    count:    $('[data-count]'),
    tokens:   $('[data-tokens]'),
    search:   $('[data-search]'),
    sort:     $('[data-sort]'),
    title:    $('[data-page-title]'),
    eyebrow:  $('[data-page-eyebrow]'),
    desc:     $('[data-page-desc]'),
    total:    $('[data-total]'),
    updated:  $('[data-updated]'),
    overlay:  $('#fact-detail'),
    dCat:     $('[data-d-cat]'),
    dTitle:   $('[data-d-title]'),
    dQ:       $('[data-d-q]'),
    dMang:    $('[data-d-mang]'),
    dMangTxt: $('[data-d-mang-text]'),
    kinds:    $('[data-kinds]'),
    dViz:     $('[data-d-viz]'),
    dBody:    $('[data-d-body]'),
    dTags:    $('[data-d-tags]'),
    dSrc:     $('[data-d-src]'),
    dPos:     $('[data-d-pos]'),
    dPrev:    $('[data-d-prev]'),
    dNext:    $('[data-d-next]'),
    dCopy:    $('[data-d-copy]'),
    toaster:  $('[data-toaster]')
  };

  /* ------------------------------------------------------------------ utils */

  /* Bỏ dấu để "tu duy" tìm được "tư duy". NFD rồi xoá dấu giữ nguyên độ dài
     ký tự (mỗi ký tự NFC → đúng 1 ký tự), nên vị trí khớp vẫn map 1:1 sang
     chuỗi gốc — điều kiện để tô đậm từ khoá không lệch. */
  function norm(s) {
    return String(s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase();
  }

  /* Người dùng gõ có dấu ⇒ so trên chuỗi CÓ dấu. Gõ không dấu ⇒ so trên chuỗi
     đã bỏ dấu. Nếu luôn bỏ dấu thì "ngủ" khớp cả "nguồn", "người", "nguyên" —
     ở quy mô nghìn fact thì một từ hai ba chữ trả về gần hết thư viện. */
  function hasTone(s) {
    var low = String(s).toLowerCase();
    return norm(low) !== low;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Tô nền xám (không màu — đây là kết quả tìm kiếm, không phải trạng thái). */
  function mark(text, q) {
    var out = esc(text);
    if (!q) return out;
    var tone = hasTone(q);
    var hay = tone ? String(text).toLowerCase() : norm(text);
    var needle = tone ? String(q).toLowerCase() : norm(q);
    if (hay.length !== text.length) return out;           /* map lệch ⇒ bỏ tô */
    var pieces = [], last = 0, i = hay.indexOf(needle);
    while (i !== -1) {
      pieces.push(esc(text.slice(last, i)),
                  '<span class="fx-hit">', esc(text.slice(i, i + needle.length)), '</span>');
      last = i + needle.length;
      i = hay.indexOf(needle, last);
    }
    pieces.push(esc(text.slice(last)));
    return pieces.join('');
  }

  function toast(msg) {
    var box = document.createElement('div');
    box.className = 'wb-toast wb-toast--success';
    box.innerHTML = '<span class="wb-toast__icon"><span class="wb-ico wb-ico--xs">check</span></span>' +
                    '<div class="wb-toast__body"><p class="wb-toast__title">' + esc(msg) + '</p></div>';
    el.toaster.appendChild(box);
    setTimeout(function () { box.remove(); }, 2600);
  }

  /* --------------------------------------------------------------- nạp data */

  function load() {
    return fetch('data/manifest.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (m) {
        state.cats = m.categories || [];
        state.cats.forEach(function (c) { state.catMap[c.id] = c; });
        state.kieus = m.kieu_chuyen || [];
        state.kieus.forEach(function (k) { state.kieuMap[k.id] = k; });
        if (el.updated) el.updated.textContent = m.updated || '—';
        /* Fact và truyện vào chung một mảng và chung một lưới: cùng ô tìm kiếm, cùng modal,
           cùng phím tắt. Khác nhau ở `_kind` và ở trục phân loại — fact có `cat`, truyện có
           `kieu` — nên thanh bên chia làm hai nhóm chứ không trộn vào nhau. */
        var files = (m.files || []).map(function (f) { return { f: f, k: 'fact' }; })
          .concat((m.files_chuyen || []).map(function (f) { return { f: f, k: 'chuyen' }; }));
        return Promise.all(files.map(function (it) {
          return fetch('data/' + it.f, { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error('Không nạp được data/' + it.f);
            return r.json();
          }).then(function (list) {
            list.forEach(function (x) { x._kind = it.k; });
            return list;
          });
        }));
      })
      .then(function (chunks) {
        chunks.forEach(function (list) {
          list.forEach(function (f) { state.facts.push(f); });
        });
        state.facts.forEach(function (f, i) {
          f._n = i + 1;
          var text = [f.q || '', f.t, f.s, f.d || '', f.body || '', f.mang_di || '',
                      (f.tags || []).join(' '), f.src || '', nhan(f).label].join(' ');
          f._blob = norm(text);              /* gõ không dấu */
          f._blobT = text.toLowerCase();     /* gõ có dấu */
          f._long = (f.d || '').length + (f.body || '').length + (f.s || '').length;
          /* Thời gian đọc, làm tròn lên phút — 180 chữ mỗi phút cho tiếng Việt. */
          f._phut = f.body ? Math.max(1, Math.round(f.body.split(/\s+/).length / 180)) : 0;
        });
      });
  }

  /* ---------------------------------------------------------------- render */

  /* --------------------------------------------------- hai vốn từ, một bộ chọn */

  function laChuyen(f) { return f._kind === 'chuyen'; }

  /* Nhãn phân loại của một mục: fact tra `cat` trong chủ đề fact, truyện tra `kieu` trong
     kiểu truyện. Không mục nào có cả hai. */
  function nhan(f) {
    return (laChuyen(f) ? state.kieuMap[f.kieu] : state.catMap[f.cat]) ||
           { label: f.kieu || f.cat || '—' };
  }

  /* Một mục có lọt vào lựa chọn `sel` trên thanh bên không. */
  function hop(f, sel) {
    if (sel === 'all')    return true;
    if (sel === 'fact')   return !laChuyen(f);
    if (sel === 'chuyen') return laChuyen(f);
    return laChuyen(f) ? f.kieu === sel : f.cat === sel;
  }

  function dem(sel) {
    return state.facts.reduce(function (n, f) { return n + (hop(f, sel) ? 1 : 0); }, 0);
  }

  function renderRail() {
    var html = '<div class="wb-sidenav__section">Thư viện</div>' +
      link('all', 'inventory_2', 'Tất cả') +
      link('fact', 'fact_check', 'Fact');

    /* Truyện đứng thành nhóm riêng, TRÊN 20 chủ đề fact: nó là loại nội dung thứ hai chứ
       không phải một chủ đề, và 22 mục thì không nên phải cuộn qua 20 mục khác mới thấy. */
    html += '<div class="wb-sidenav__section">Truyện</div>' +
      link('chuyen', 'auto_stories', 'Tất cả truyện');
    state.kieus.forEach(function (k) {
      /* Kiểu chưa có truyện nào thì không dựng link — vốn từ đã khai sẵn ở manifest, nhưng
         một mục bấm vào ra lưới rỗng là một ngõ cụt. Nó tự hiện khi truyện đầu tiên về. */
      if (dem(k.id)) html += link(k.id, k.icon || 'label', k.label);
    });

    html += '<div class="wb-sidenav__section">Chủ đề fact</div>';
    state.cats.forEach(function (c) {
      html += link(c.id, c.icon || 'label', c.label);
    });
    el.rail.innerHTML = html;

    function link(id, ico, label) {
      return '<a class="wb-sidenav__link' + (state.cat === id ? ' is-active' : '') +
             '" href="#/' + id + '" data-cat="' + id + '">' +
             '<span class="wb-ico">' + ico + '</span> ' + esc(label) +
             '<span class="wb-sidenav__badge">' + dem(id) + '</span></a>';
    }
  }

  function applyFilter() {
    var raw = state.q.trim();
    var tone = hasTone(raw);
    var q = tone ? raw.toLowerCase() : norm(raw);
    state.view = state.facts.filter(function (f) {
      if (!hop(f, state.cat)) return false;
      if (state.tag && (f.tags || []).indexOf(state.tag) === -1) return false;
      if (q && (tone ? f._blobT : f._blob).indexOf(q) === -1) return false;
      return true;
    });

    if (state.sort === 'new') {
      state.view.reverse();
    } else if (state.sort === 'az') {
      state.view.sort(function (a, b) { return a.t.localeCompare(b.t, 'vi'); });
    } else if (state.sort === 'long') {
      state.view.sort(function (a, b) { return b._long - a._long; });
    } else if (state.sort === 'rand') {
      for (var i = state.view.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = state.view[i]; state.view[i] = state.view[j]; state.view[j] = t;
      }
    }

    state.shown = 0;
    el.grid.innerHTML = '';
    renderMore();
    renderChrome();
  }

  function renderMore() {
    var slice = state.view.slice(state.shown, state.shown + PAGE);
    var frag = document.createDocumentFragment();
    slice.forEach(function (f) { frag.appendChild(card(f)); });
    el.grid.appendChild(frag);
    state.shown += slice.length;

    el.empty.hidden = state.view.length !== 0;
    el.moreWrap.hidden = state.shown >= state.view.length;
    if (!el.moreWrap.hidden) {
      el.more.textContent = 'Xem thêm ' +
        Math.min(PAGE, state.view.length - state.shown) + ' mục nữa';
    }
  }

  function card(f) {
    var cat = nhan(f);
    var node = document.createElement('button');
    node.type = 'button';
    node.className = 'wb-card wb-card--hover fx-card';
    node.setAttribute('data-id', f.id);
    node.innerHTML =
      '<div class="wb-card__body">' +
        '<div class="wb-cluster wb-cluster--between wb-cluster--tight">' +
          '<span class="wb-cap wb-cap--sm">' + esc(cat.label) + '</span>' +
          (f._kind === 'chuyen'
            ? '<span class="fx-card__kind"><span class="wb-ico wb-ico--xs">auto_stories</span> ' +
              f._phut + ' phút đọc</span>'
            : f.viz
            ? '<span class="wb-cap wb-cap--sm fx-card__viz"><span class="wb-ico wb-ico--xs">touch_app</span> Tương tác</span>'
            : '<span class="fx-card__no">#' + f._n + '</span>') +
        '</div>' +
        (f.q ? '<p class="fx-card__q">' + mark(f.q, state.q) + '</p>' : '') +
        '<p class="wb-card__title">' + mark(f.t, state.q) + '</p>' +
        '<p class="fx-card__text">' + mark(f.s, state.q) + '</p>' +
        ((f.tags || []).length
          ? '<div class="wb-tags">' + f.tags.slice(0, 3).map(function (t) {
              return '<span class="wb-tag wb-tag--sm">' + esc(t) + '</span>';
            }).join('') + '</div>'
          : '') +
      '</div>' +
      '<div class="wb-card__foot">' +
        '<span class="fx-card__src">' + esc(f.src || '') + '</span>' +
        '<span class="fx-card__more">' +
          (f._kind === 'chuyen' ? 'Đọc truyện'
            : f.viz ? 'Thử ngay' : (f.q ? 'Lời giải' : (f.d ? 'Đọc tiếp' : 'Chi tiết'))) +
          '<span class="wb-ico wb-ico--xs">chevron_right</span></span>' +
      '</div>';
    return node;
  }

  var CHUYEN_DESC =
    'Truyện có thật, kể đủ dài để hiểu, và kết bằng một điều về thế giới mang đi được kể cả ' +
    'khi quên hết chi tiết. Xếp theo kiểu chuyện, không theo chủ đề của fact.';
  var FACT_DESC =
    'Fact cho người trưởng thành: vũ trụ, sinh vật, cơ thể, tâm lý, tư duy, kinh tế, ' +
    'kinh doanh, giao tiếp. Mỗi mục đều ghi nguồn — đọc để sắc hơn khi nghĩ, khi nói và khi làm ăn.';

  function renderChrome() {
    var sel = state.cat;
    var muc = state.catMap[sel] || state.kieuMap[sel] || null;
    var phiaTruyen = sel === 'chuyen' || !!state.kieuMap[sel];

    if (el.eyebrow) el.eyebrow.textContent = phiaTruyen ? 'Thư viện truyện' : 'Thư viện fact';
    el.title.textContent = muc ? muc.label
      : sel === 'chuyen' ? 'Truyện'
      : sel === 'fact' ? 'Tất cả fact' : 'Tất cả';
    el.desc.textContent = muc && muc.desc ? muc.desc
      : phiaTruyen ? CHUYEN_DESC : FACT_DESC;

    /* Mẫu số là nhóm chứa lựa chọn hiện tại, không phải cả thư viện: đứng trong một kiểu
       truyện mà thấy "4 / 1931" thì con số chẳng nói lên điều gì. */
    var goc = phiaTruyen ? 'chuyen' : (state.catMap[sel] || sel === 'fact') ? 'fact' : 'all';
    el.count.textContent = state.view.length + ' / ' + dem(goc) + ' ' +
      (phiaTruyen ? 'truyện' : 'mục');
    if (el.total) el.total.textContent = state.facts.length;

    var html = '';
    if (sel !== 'all') {
      html += token(state.kieuMap[sel] ? 'Kiểu truyện' : state.catMap[sel] ? 'Chủ đề' : 'Loại',
                    muc ? muc.label : (sel === 'chuyen' ? 'Truyện' : 'Fact'), 'cat');
    }
    if (state.tag)      html += token('Nhãn', state.tag, 'tag');
    if (state.q.trim()) html += token('Từ khoá', state.q.trim(), 'q');
    el.tokens.innerHTML = html;

    $$('[data-cat]', el.rail).forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-cat') === sel);
    });

    /* Bộ chuyển ở đầu lưới soi cùng một state — nó là lối tắt trên điện thoại, nơi thanh
       bên nằm sau nút ☰. Đứng trong một kiểu truyện thì nút "Truyện" sáng. */
    $$('[data-goto]', el.kinds).forEach(function (b) {
      var on = b.getAttribute('data-goto') === goc;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    function token(key, val, kind) {
      return '<span class="wb-filter-token"><span class="wb-filter-token__key">' + esc(key) +
             '</span><span class="wb-filter-token__val">' + esc(val) +
             '</span><button class="wb-filter-token__x" data-drop="' + kind +
             '" aria-label="Bỏ lọc ' + esc(key.toLowerCase()) + '"></button></span>';
    }
  }

  /* ----------------------------------------------------------------- modal */

  /* Minh hoạ tương tác: fact có trường "viz" và viz.js có hàm cùng tên thì dựng
     vào đầu thân modal. Hỏng một minh hoạ không được làm hỏng cả modal. */
  function renderViz(f) {
    el.dViz.innerHTML = '';
    var fn = f.viz && window.FactViz && window.FactViz[f.viz];
    el.dViz.hidden = !fn;
    if (!fn) return;
    try {
      fn(el.dViz);
    } catch (err) {
      el.dViz.innerHTML = '<p class="wb-help">Không dựng được minh hoạ cho fact này.</p>';
    }
  }

  function openFact(id, pushHash) {
    var f = null, i;
    for (i = 0; i < state.facts.length; i++) if (state.facts[i].id === id) { f = state.facts[i]; break; }
    if (!f) return;

    state.openId = id;
    el.dCat.textContent = nhan(f).label;
    el.dQ.textContent = f.q || '';
    el.dQ.hidden = !f.q;
    el.dTitle.textContent = f.t;

    renderViz(f);

    var body = '<p class="fx-prose__lead">' + esc(f.s) + '</p>';
    var dai = f._kind === 'chuyen' ? f.body : f.d;
    if (dai) {
      body += dai.split('\n\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    }
    el.dBody.innerHTML = body;

    /* "Mang về" — điều người đọc cầm được kể cả khi quên hết chi tiết câu chuyện. */
    el.dMang.hidden = !f.mang_di;
    if (f.mang_di) el.dMangTxt.textContent = f.mang_di;

    el.dTags.innerHTML = (f.tags || []).map(function (t) {
      return '<button class="wb-tag" data-tag="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');

    el.dSrc.textContent = 'Nguồn: ' + (f.src || 'chưa ghi nguồn');

    var pos = state.view.indexOf(f);
    el.dPos.textContent = pos === -1 ? '#' + f._n : (pos + 1) + ' / ' + state.view.length;
    el.dPrev.disabled = pos <= 0;
    el.dNext.disabled = pos === -1 || pos >= state.view.length - 1;

    el.overlay.classList.add('is-open');
    el.dBody.parentNode.scrollTop = 0;
    if (pushHash !== false) location.hash = '#/' + state.cat + '/' + f.id;
    $('.wb-close', el.overlay).focus();
  }

  /* Fact ngẫu nhiên — ưu tiên tập đang lọc, và không bốc trúng fact đang mở. */
  function randomFact() {
    var pool = state.view.length ? state.view : state.facts;
    if (!pool.length) return;
    if (pool.length > 1) {
      pool = pool.filter(function (f) { return f.id !== state.openId; });
    }
    openFact(pool[Math.floor(Math.random() * pool.length)].id);
  }

  function closeFact() {
    if (!el.overlay.classList.contains('is-open')) return;
    el.overlay.classList.remove('is-open');
    state.openId = null;
    location.hash = '#/' + state.cat;
  }

  function step(delta) {
    var i = state.view.findIndex(function (f) { return f.id === state.openId; });
    var next = state.view[i + delta];
    if (next) openFact(next.id);
  }

  /* ----------------------------------------------------------------- routing */

  /* #/<lựa chọn>[/<id>] — `lựa chọn` là bất kỳ mục nào của thanh bên, gồm cả hai vốn từ.
     Link cũ dạng #/lich-su/ch-001 vẫn mở đúng truyện: chủ đề không còn chứa nó nữa nên
     nút Trước/Sau tắt, nhưng không link nào gãy. */
  function readHash() {
    var raw = location.hash.replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    var cat = parts[0] || 'all';
    if (['all', 'fact', 'chuyen'].indexOf(cat) === -1 &&
        !state.catMap[cat] && !state.kieuMap[cat]) cat = 'all';
    return { cat: cat, id: parts[1] || null };
  }

  function syncFromHash(first) {
    var h = readHash();
    var doiNhom = h.cat !== state.cat;
    if (doiNhom) {
      state.cat = h.cat;
      applyFilter();
    } else if (first) {
      applyFilter();
    }
    if (h.id) {
      /* Đổi nhóm mà vẫn cùng một mục đang mở thì vẫn phải dựng lại: số "3 / 7" và hai nút
         Trước/Sau đọc từ tập đang lọc, mà tập đó vừa đổi. */
      if (h.id !== state.openId || doiNhom) openFact(h.id, false);
    } else if (state.openId) {
      el.overlay.classList.remove('is-open');
      state.openId = null;
    }
  }

  /* -------------------------------------------------------------------- wire */

  function wire() {
    /* mở card → drawer */
    el.grid.addEventListener('click', function (e) {
      var c = e.target.closest('.fx-card');
      if (c) openFact(c.getAttribute('data-id'));
    });

    el.more.addEventListener('click', renderMore);

    el.search.addEventListener('input', function () {
      state.q = el.search.value;
      applyFilter();
    });

    el.sort.addEventListener('change', function () {
      state.sort = el.sort.value;
      applyFilter();
    });

    /* bộ chuyển Tất cả / Fact / Truyện — đi qua hash như mọi mục của thanh bên, để trạng
       thái luôn có trong URL và chỉ có một nguồn sự thật. */
    el.kinds.addEventListener('click', function (e) {
      var b = e.target.closest('[data-goto]');
      if (b) location.hash = '#/' + b.getAttribute('data-goto');
    });

    /* gỡ token lọc */
    el.tokens.addEventListener('click', function (e) {
      var b = e.target.closest('[data-drop]');
      if (!b) return;
      var kind = b.getAttribute('data-drop');
      if (kind === 'cat') { location.hash = '#/all'; return; }
      if (kind === 'tag') state.tag = '';
      if (kind === 'q')   { state.q = ''; el.search.value = ''; }
      applyFilter();
    });

    $('[data-clear]').addEventListener('click', function () {
      state.tag = '';
      state.q = '';
      el.search.value = '';
      if (state.cat !== 'all') { location.hash = '#/all'; } else { applyFilter(); }
    });

    /* lọc theo nhãn từ trong drawer */
    el.dTags.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tag]');
      if (!t) return;
      state.tag = t.getAttribute('data-tag');
      closeFact();
      applyFilter();
    });

    el.dPrev.addEventListener('click', function () { step(-1); });
    el.dNext.addEventListener('click', function () { step(1); });

    el.dCopy.addEventListener('click', function () {
      var url = location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { toast('Đã chép link fact'); });
      } else {
        toast(url);
      }
    });

    $$('[data-random]').forEach(function (b) {
      b.addEventListener('click', randomFact);
    });

    $('[data-focus-search]').addEventListener('click', function () {
      el.search.focus();
      el.search.select();
    });

    /* đóng: nút × / [data-modal-close] — bấm là đóng */
    el.overlay.addEventListener('click', function (e) {
      if (e.target.closest('[data-modal-close]')) closeFact();
    });
    /* bấm nền để đóng: chỉ đóng khi CẢ chỗ bấm xuống và chỗ nhả chuột đều là chính lớp
       nền (overlay), không phải hộp bên trong — tránh bôi đen chữ trong modal rồi kéo ra
       nền làm đóng oan (click nhắm vào tổ tiên chung của điểm bấm và điểm nhả = overlay). */
    var downOnOverlay = false;
    el.overlay.addEventListener('pointerdown', function (e) { downOnOverlay = (e.target === el.overlay); });
    el.overlay.addEventListener('pointerup', function (e) {
      if (downOnOverlay && e.target === el.overlay) closeFact();
      downOnOverlay = false;
    });

    /* shell: ☰ mở rail, nút đổi theme, chạm nền đóng rail */
    var shell = $('.wb-shell');
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-side-toggle]')) {
        shell.classList.toggle('is-side-open');
      } else if (e.target.closest('.wb-theme-toggle')) {
        var dark = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (err) {}
      } else if (shell.classList.contains('is-side-open') && !e.target.closest('.wb-shell__side')) {
        shell.classList.remove('is-side-open');
      }
      /* chọn chủ đề trên rail (điện thoại): đóng ngăn kéo lại */
      if (e.target.closest('[data-cat]')) shell.classList.remove('is-side-open');
    });

    /* phím tắt: R fact ngẫu nhiên · / tìm · Esc đóng · ← → lật fact khi modal mở.
       R chạy được cả khi modal đang mở — mỗi lần bấm là một fact mới. */
    document.addEventListener('keydown', function (e) {
      var typing = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (typing && e.target === el.search) { el.search.blur(); return; }
        closeFact();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); randomFact(); return; }
      if (e.key === '/') { e.preventDefault(); el.search.focus(); return; }
      if (!el.overlay.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft')  step(-1);
      if (e.key === 'ArrowRight') step(1);
    });

    window.addEventListener('hashchange', function () { syncFromHash(false); });
  }

  /* -------------------------------------------------------------------- boot */

  load().then(function () {
    var h = readHash();
    state.cat = h.cat;
    renderRail();
    wire();
    syncFromHash(true);
  }).catch(function (err) {
    el.grid.innerHTML =
      '<div class="wb-alert wb-alert--danger"><span class="wb-alert__icon">!</span>' +
      '<div class="wb-alert__body"><p class="wb-alert__title">Không nạp được dữ liệu fact</p>' +
      '<p class="wb-alert__msg">' + esc(err.message) +
      ' — trang này đọc data/*.json bằng fetch nên phải chạy qua HTTP. ' +
      'Chạy <code>python3 -m http.server</code> trong thư mục gốc rồi mở lại.</p></div></div>';
    el.count.textContent = 'lỗi tải';
  });
})();
