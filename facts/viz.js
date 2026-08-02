/* =============================================================================
   viz.js — minh hoạ tương tác cho các fact có trường "viz".
   -----------------------------------------------------------------------------
   Mỗi hàm nhận một phần tử rỗng và tự dựng nội dung vào đó. Không framework,
   không thư viện vẽ: chỉ DOM + SVG + token của web-builder.

   Quy ước màu: cấu trúc dùng thang xám --wb-neutral-*; chỉ những chỗ MÀU CHÍNH
   LÀ DỮ LIỆU (chuỗi biểu đồ, màu chữ trong bài Stroop) mới dùng --wb-chart-*.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- tiện ích */

  function h(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function note(t) { return h('p', 'fx-viz__note', t); }
  function row(t)  { return h('div', 'wb-cluster wb-cluster--tight fx-viz__ctl', t || ''); }

  function slider(min, max, val, step) {
    var i = document.createElement('input');
    i.type = 'range'; i.className = 'wb-range wb-range--sm';
    i.min = min; i.max = max; i.value = val; i.step = step || 1;
    return i;
  }
  /* .wb-btn trần đã là nút chính (nền đậm); 'primary' ở đây chỉ nghĩa là dùng bản trần. */
  function button(label, variant) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'wb-btn wb-btn--sm' + (variant === 'primary' ? '' : ' wb-btn--' + (variant || 'secondary'));
    b.textContent = label;
    return b;
  }
  function field(labelText, control) {
    var w = h('label', 'fx-viz__field');
    w.appendChild(h('span', 'fx-viz__label', labelText));
    w.appendChild(control);
    return w;
  }
  function readout(html) { return h('div', 'fx-viz__out', html || ''); }

  function num(n, d) {
    return Number(n).toLocaleString('vi-VN', {
      minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 0 : d
    });
  }
  function pct(x, d) { return num(x * 100, d == null ? 1 : d) + '%'; }
  function rnd(n) { return Math.floor(Math.random() * n); }

  /* Dãy cột đơn giản: data = [{label, value, tone}] , max để chuẩn hoá. */
  function bars(data, max, fmtVal) {
    var wrap = h('div', 'fx-bars');
    data.forEach(function (d) {
      var r = h('div', 'fx-bars__row');
      r.appendChild(h('span', 'fx-bars__label', d.label));
      var track = h('div', 'fx-bars__track');
      var fill = h('div', 'fx-bars__fill' + (d.tone ? ' fx-bars__fill--' + d.tone : ''));
      fill.style.width = Math.max(0, Math.min(100, (d.value / max) * 100)) + '%';
      track.appendChild(fill);
      r.appendChild(track);
      r.appendChild(h('span', 'fx-bars__val', fmtVal ? fmtVal(d.value) : num(d.value)));
      wrap.appendChild(r);
    });
    return wrap;
  }

  /* ================================================================== ĐIỂM MÙ */

  function blindSpot(root) {
    var eye = 'left';                                   /* mắt đang mở */
    root.appendChild(note(
      'Điểm mù nằm ở phía thái dương của trường nhìn, nên nó luôn ở phía ngoài. ' +
      'Làm đúng ba bước và bạn sẽ thấy một ngôi sao biến mất hẳn — không phải mờ đi, mà biến mất.'));

    var stage = h('div', 'fx-bs');
    var starL = h('span', 'fx-bs__star fx-bs__star--a', '★');
    var starR = h('span', 'fx-bs__star fx-bs__star--b', '★');
    stage.appendChild(starL); stage.appendChild(starR);

    var steps = h('ol', 'fx-viz__steps');
    var gap = slider(120, 420, 260, 10);
    var swap = button('Đổi sang mắt phải');

    function paint() {
      stage.style.setProperty('--fx-bs-gap', gap.value + 'px');
      starL.classList.toggle('is-fix', eye === 'right');
      starR.classList.toggle('is-fix', eye === 'left');
      var open  = eye === 'left' ? 'trái' : 'phải';
      var shut  = eye === 'left' ? 'phải' : 'trái';
      var look  = eye === 'left' ? 'bên phải (ngôi sao có vòng tròn)' : 'bên trái (ngôi sao có vòng tròn)';
      var gone  = eye === 'left' ? 'bên trái' : 'bên phải';
      steps.innerHTML =
        '<li>Che kín mắt <b>' + shut + '</b> bằng lòng bàn tay.</li>' +
        '<li>Dùng mắt <b>' + open + '</b> nhìn chằm chằm vào ngôi sao ' + look +
          '. Đừng liếc sang ngôi sao kia — chỉ nhìn thẳng.</li>' +
        '<li>Giữ nguyên hướng nhìn và đưa mặt <b>lại gần màn hình thật chậm</b>. ' +
          'Ở một khoảng cách nhất định (thường 25–40 cm), ngôi sao <b>' + gone +
          '</b> sẽ biến mất. Lùi ra là nó hiện lại.</li>';
      swap.textContent = eye === 'left' ? 'Đổi sang mắt phải' : 'Đổi sang mắt trái';
    }

    gap.addEventListener('input', paint);
    swap.addEventListener('click', function () { eye = eye === 'left' ? 'right' : 'left'; paint(); });

    root.appendChild(stage);
    root.appendChild(steps);
    var r = row(); r.appendChild(field('Khoảng cách hai sao', gap)); r.appendChild(swap);
    root.appendChild(r);
    root.appendChild(note(
      'Chỗ ngôi sao biến mất không thành một lỗ đen — nó thành nền, cùng màu với xung quanh. ' +
      'Đó là phần não tự bịa ra để lấp chỗ trống, và bạn không có cách nào cảm nhận được việc nó đang bịa.'));
    paint();
  }

  /* ======================================================= ẢO GIÁC BÀN CỜ */

  function checkerShadow(root) {
    root.appendChild(note(
      'Ô <b>A</b> và ô <b>B</b> đang được tô đúng cùng một mã màu xám. Bấm nút bên dưới để nối chúng ' +
      'bằng một dải cùng màu — dải đó sẽ trông như đổi màu ở giữa, dù nó là một khối đồng nhất.'));

    /* Số học của trò này: ô tối = 120, ô sáng = 184. Lớp bóng là màu đen alpha
       0,348 nên ô sáng nằm trong bóng ra đúng 184 × (1 − 0,348) = 120 — bằng
       chằn chặn ô tối ngoài bóng. Mép bóng để mềm bằng gradient, vì mép cứng
       thì mắt đọc nó thành "vùng sơn khác màu" chứ không thành bóng đổ. */
    var DARK = '#787878', LIGHT = '#b8b8b8';
    var svg = ['<svg viewBox="0 0 320 240" class="fx-checker" role="img" ' +
               'aria-label="Ảo giác bóng đổ trên bàn cờ: ô A và ô B cùng một màu xám">'];
    svg.push('<defs>' +
      '<linearGradient id="fx-shade" gradientUnits="userSpaceOnUse" x1="20" y1="190" x2="240" y2="120">' +
        '<stop offset="0"    stop-color="#000" stop-opacity="0.348"/>' +
        '<stop offset="0.55" stop-color="#000" stop-opacity="0.348"/>' +
        '<stop offset="0.70" stop-color="#000" stop-opacity="0"/>' +
        '<stop offset="1"    stop-color="#000" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="fx-cyl" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#5f5f5f"/><stop offset="0.55" stop-color="#a5a5a5"/>' +
        '<stop offset="1" stop-color="#cfcfcf"/>' +
      '</linearGradient></defs>');
    var c, r;
    for (r = 0; r < 6; r++) {
      for (c = 0; c < 8; c++) {
        svg.push('<rect x="' + (c * 40) + '" y="' + (r * 40) + '" width="40" height="40" fill="' +
                 ((c + r) % 2 === 0 ? DARK : LIGHT) + '"/>');
      }
    }
    svg.push('<rect x="0" y="0" width="320" height="240" fill="url(#fx-shade)"/>');
    /* trụ đứng giữa bàn, ăn sáng từ bên phải — nguồn của vệt bóng bên trái nó */
    svg.push('<rect x="206" y="40" width="38" height="126" rx="6" fill="url(#fx-cyl)"/>');
    svg.push('<ellipse cx="225" cy="40" rx="19" ry="7" fill="#d8d8d8"/>');
    /* dải nối — vẽ SAU lớp bóng nên nó giữ nguyên đúng một mã màu */
    svg.push('<rect id="fx-bridge" x="60" y="169" width="200" height="22" fill="' + DARK +
             '" style="display:none"/>');
    /* B = ô SÁNG nằm trong bóng · A = ô TỐI nằm ngoài bóng — hai ô cùng giá trị */
    svg.push('<text x="60"  y="187" class="fx-checker__tag">B</text>');
    svg.push('<text x="260" y="187" class="fx-checker__tag">A</text>');
    svg.push('</svg>');
    root.appendChild(h('div', 'fx-viz__stage', svg.join('')));

    var b = button('Nối hai ô bằng một dải cùng màu');
    var on = false;
    b.addEventListener('click', function () {
      on = !on;
      root.querySelector('#fx-bridge').style.display = on ? '' : 'none';
      b.textContent = on ? 'Bỏ dải nối' : 'Nối hai ô bằng một dải cùng màu';
    });
    root.appendChild(row().appendChild(b).parentNode);
    root.appendChild(note(
      'Hệ thị giác không đo độ sáng tới mắt — nó cố đoán <b>màu thật của bề mặt</b> sau khi trừ đi ánh sáng. ' +
      'Vì B nằm trong bóng, não kết luận bề mặt của nó vốn phải sáng hơn. Đó là tính năng, không phải lỗi: ' +
      'nhờ nó mà bạn vẫn nhận ra tờ giấy là trắng khi cầm nó vào chỗ râm.'));
  }

  /* ============================================================== STROOP */

  var STROOP = [
    { name: 'ĐỎ',   css: '#d92d20' },
    { name: 'XANH', css: '#1570ef' },
    { name: 'VÀNG', css: '#dc9200' },
    { name: 'TÍM',  css: '#8b5cf6' }
  ];

  function stroop(root) {
    root.appendChild(note(
      'Nhiệm vụ: bấm <b>màu của chữ</b>, không phải chữ được viết. 8 lượt đầu chữ và màu khớp nhau, ' +
      '8 lượt sau thì không. So hai con số cuối cùng.'));

    var word = h('div', 'fx-stroop__word', '');
    var pad  = h('div', 'fx-stroop__pad');
    var info = readout('Bấm “Bắt đầu” để chạy 16 lượt.');
    var start = button('Bắt đầu', 'primary');

    var trials = [], idx = -1, t0 = 0, res = { con: [], inc: [] };

    STROOP.forEach(function (c, i) {
      var b = button(c.name);
      b.setAttribute('data-i', i);
      pad.appendChild(b);
    });

    function build() {
      trials = [];
      var i, k, m;
      for (i = 0; i < 8; i++) { k = rnd(4); trials.push({ w: k, c: k, con: true }); }
      for (i = 0; i < 8; i++) {
        k = rnd(4); m = rnd(4); while (m === k) m = rnd(4);
        trials.push({ w: k, c: m, con: false });
      }
    }
    function next() {
      idx++;
      if (idx >= trials.length) return finish();
      var t = trials[idx];
      word.textContent = STROOP[t.w].name;
      word.style.color = STROOP[t.c].css;
      info.innerHTML = 'Lượt ' + (idx + 1) + ' / ' + trials.length +
        ' — <span class="fx-viz__dim">' + (t.con ? 'khớp' : 'không khớp') + '</span>';
      t0 = performance.now();
    }
    function finish() {
      word.textContent = '✓'; word.style.color = '';
      var avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; };
      var a = avg(res.con), b2 = avg(res.inc);
      info.innerHTML =
        '<b>Khớp:</b> ' + num(a) + ' ms &nbsp;·&nbsp; <b>Không khớp:</b> ' + num(b2) + ' ms' +
        '<br><span class="fx-viz__dim">Chênh lệch ' + num(b2 - a) + ' ms' +
        (b2 > a ? ' — đúng như dự đoán: đọc chữ chạy tự động và bạn phải tốn sức chặn nó lại.'
                : ' — lần này bạn không bị ảnh hưởng; thử lại với nhiều lượt hơn xem sao.') + '</span>';
      start.textContent = 'Chạy lại';
      idx = -1;
    }

    pad.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (!b || idx < 0 || idx >= trials.length) return;
      var t = trials[idx], ms = performance.now() - t0;
      if (Number(b.getAttribute('data-i')) === t.c) {
        (t.con ? res.con : res.inc).push(ms);
        next();
      } else {
        info.innerHTML = '<span class="fx-viz__dim">Sai màu — thử lại lượt này.</span>';
      }
    });
    start.addEventListener('click', function () {
      res = { con: [], inc: [] }; idx = -1; build(); next();
      start.textContent = 'Bỏ và chạy lại';
    });

    root.appendChild(word);
    root.appendChild(pad);
    root.appendChild(info);
    root.appendChild(row().appendChild(start).parentNode);
  }

  /* ====================================================== NGÀY SINH TRÙNG */

  function birthdayP(n) {
    var p = 1;
    for (var i = 0; i < n; i++) p *= (365 - i) / 365;
    return 1 - p;
  }

  function birthday(root) {
    var s = slider(2, 80, 23);
    var out = readout('');
    var sim = button('Mô phỏng 2.000 căn phòng');
    var simOut = readout('');
    var chart = h('div', 'fx-viz__stage');

    function paint() {
      var n = Number(s.value), p = birthdayP(n);
      out.innerHTML = '<b>' + n + ' người</b> trong phòng → xác suất có ít nhất một cặp trùng ngày sinh là ' +
        '<b>' + pct(p) + '</b><br><span class="fx-viz__dim">Số cặp có thể so: ' +
        num(n * (n - 1) / 2) + '</span>';
      /* đường cong */
      var pts = [], i;
      for (i = 1; i <= 80; i++) pts.push((i / 80 * 320).toFixed(1) + ',' + (110 - birthdayP(i) * 100).toFixed(1));
      chart.innerHTML =
        '<svg viewBox="0 0 330 130" class="fx-line" role="img" aria-label="Xác suất theo số người">' +
        '<line x1="0" y1="60" x2="320" y2="60" class="fx-line__grid"/>' +
        '<line x1="0" y1="110" x2="320" y2="110" class="fx-line__axis"/>' +
        '<polyline points="' + pts.join(' ') + '" class="fx-line__path"/>' +
        '<circle cx="' + (n / 80 * 320).toFixed(1) + '" cy="' + (110 - p * 100).toFixed(1) +
          '" r="4" class="fx-line__dot"/>' +
        '<text x="2" y="56" class="fx-line__cap">50%</text>' +
        '</svg>';
    }
    s.addEventListener('input', paint);

    sim.addEventListener('click', function () {
      var n = Number(s.value), hit = 0, runs = 2000, i, j, seen;
      for (i = 0; i < runs; i++) {
        seen = {};
        for (j = 0; j < n; j++) {
          var d = rnd(365);
          if (seen[d]) { hit++; break; }
          seen[d] = 1;
        }
      }
      simOut.innerHTML = 'Mô phỏng: <b>' + num(hit) + ' / ' + num(runs) + '</b> phòng có cặp trùng = ' +
        '<b>' + pct(hit / runs) + '</b> <span class="fx-viz__dim">(lý thuyết ' + pct(birthdayP(n)) + ')</span>';
    });

    root.appendChild(chart);
    var r = row(); r.appendChild(field('Số người trong phòng', s)); root.appendChild(r);
    root.appendChild(out);
    var r2 = row(); r2.appendChild(sim); root.appendChild(r2);
    root.appendChild(simOut);
    paint();
  }

  /* =========================================================== MONTY HALL */

  function montyHall(root) {
    root.appendChild(note('Chọn một cửa. Người dẫn — biết trước cửa nào có xe — sẽ mở một cửa có dê. Rồi bạn quyết định đổi hay giữ.'));
    var stage = h('div', 'fx-doors');
    var msg = readout('Chọn một cửa để bắt đầu.');
    var tally = readout('');
    var stat = { switchWin: 0, switchN: 0, stayWin: 0, stayN: 0 };
    var car = -1, pick = -1, opened = -1, phase = 0;   /* 0 chọn · 1 quyết định · 2 xong */

    for (var i = 0; i < 3; i++) {
      var d = h('button', 'fx-door');
      d.type = 'button';
      d.setAttribute('data-d', i);
      d.innerHTML = '<span class="fx-door__n">' + (i + 1) + '</span><span class="fx-door__face"></span>';
      stage.appendChild(d);
    }

    function reset() {
      car = rnd(3); pick = -1; opened = -1; phase = 0;
      Array.prototype.forEach.call(stage.children, function (d) {
        d.className = 'fx-door';
        d.querySelector('.fx-door__face').textContent = '';
      });
      msg.textContent = 'Chọn một cửa để bắt đầu.';
    }
    function reveal() {
      Array.prototype.forEach.call(stage.children, function (d, k) {
        d.querySelector('.fx-door__face').textContent = k === car ? '🚗' : '🐐';
        d.classList.add('is-open');
      });
    }
    function showTally() {
      var a = stat.switchN ? stat.switchWin / stat.switchN : 0;
      var b = stat.stayN ? stat.stayWin / stat.stayN : 0;
      tally.innerHTML =
        'Đổi cửa: <b>' + stat.switchWin + '/' + stat.switchN + '</b> (' + (stat.switchN ? pct(a) : '—') + ')' +
        ' &nbsp;·&nbsp; Giữ nguyên: <b>' + stat.stayWin + '/' + stat.stayN + '</b> (' + (stat.stayN ? pct(b) : '—') + ')';
    }

    stage.addEventListener('click', function (e) {
      var d = e.target.closest('[data-d]');
      if (!d || phase !== 0) return;
      pick = Number(d.getAttribute('data-d'));
      d.classList.add('is-pick');
      do { opened = rnd(3); } while (opened === car || opened === pick);
      var od = stage.children[opened];
      od.classList.add('is-open');
      od.querySelector('.fx-door__face').textContent = '🐐';
      phase = 1;
      msg.innerHTML = 'Người dẫn mở cửa <b>' + (opened + 1) + '</b> và nó có dê. Bạn đổi hay giữ?';
    });

    var bSwitch = button('Đổi cửa', 'primary');
    var bStay   = button('Giữ nguyên');
    var bAuto   = button('Chơi tự động 2.000 ván');

    function decide(doSwitch) {
      if (phase !== 1) return;
      var final = doSwitch ? [0, 1, 2].filter(function (k) { return k !== pick && k !== opened; })[0] : pick;
      var win = final === car;
      if (doSwitch) { stat.switchN++; if (win) stat.switchWin++; }
      else          { stat.stayN++;   if (win) stat.stayWin++; }
      reveal();
      stage.children[final].classList.add(win ? 'is-win' : 'is-lose');
      msg.innerHTML = (win ? '🎉 Thắng!' : 'Trượt.') + ' Xe ở cửa <b>' + (car + 1) + '</b>.';
      phase = 2;
      showTally();
      setTimeout(reset, 1400);
    }
    bSwitch.addEventListener('click', function () { decide(true); });
    bStay.addEventListener('click', function () { decide(false); });
    bAuto.addEventListener('click', function () {
      var n = 2000, i, c, p, o;
      for (i = 0; i < n; i++) {
        c = rnd(3); p = rnd(3);
        do { o = rnd(3); } while (o === c || o === p);
        stat.switchN++; if ([0, 1, 2].filter(function (k) { return k !== p && k !== o; })[0] === c) stat.switchWin++;
        stat.stayN++;   if (p === c) stat.stayWin++;
      }
      showTally();
    });

    root.appendChild(stage);
    root.appendChild(msg);
    var r = row(); r.appendChild(bSwitch); r.appendChild(bStay); r.appendChild(bAuto);
    root.appendChild(r);
    root.appendChild(tally);
    root.appendChild(note(
      'Trực giác nói “còn hai cửa nên 50–50”. Nhưng cửa bạn chọn ban đầu vẫn đúng 1/3 số lần — ' +
      'thông tin mới không chạm vào nó. Toàn bộ 2/3 còn lại dồn hết sang cửa kia.'));
    reset(); showTally();
  }

  /* ============================================== XÉT NGHIỆM & TỈ LỆ NỀN */

  function bayes(root) {
    var sPrev = slider(1, 200, 10);          /* số ca bệnh trên 1.000 */
    var sSpec = slider(90, 100, 99, 0.5);    /* độ đặc hiệu, % */
    var grid = h('div', 'fx-grid1000');
    var out = readout('');
    var i, cell;
    for (i = 0; i < 1000; i++) { cell = h('span', 'fx-grid1000__c'); grid.appendChild(cell); }

    function paint() {
      var sick = Number(sPrev.value);
      var spec = Number(sSpec.value) / 100;
      var sens = 0.99;
      var tp = Math.round(sick * sens);
      var fp = Math.round((1000 - sick) * (1 - spec));
      var k = 0, cells = grid.children;
      for (i = 0; i < 1000; i++) cells[i].className = 'fx-grid1000__c';
      for (i = 0; i < tp; i++) cells[k++].className = 'fx-grid1000__c is-tp';
      for (i = 0; i < sick - tp; i++) cells[k++].className = 'fx-grid1000__c is-fn';
      for (i = 0; i < fp; i++) cells[k++].className = 'fx-grid1000__c is-fp';
      var ppv = tp + fp ? tp / (tp + fp) : 0;
      out.innerHTML =
        '<div class="fx-legend">' +
          '<span><i class="fx-sw is-tp"></i> ' + tp + ' người bệnh &amp; dương tính</span>' +
          '<span><i class="fx-sw is-fn"></i> ' + (sick - tp) + ' bệnh nhưng âm tính giả</span>' +
          '<span><i class="fx-sw is-fp"></i> ' + fp + ' khoẻ nhưng dương tính giả</span>' +
        '</div>' +
        'Trong ' + num(tp + fp) + ' người nhận kết quả dương tính, chỉ <b>' + tp +
        '</b> người thật sự mắc bệnh → khả năng bạn thật sự có bệnh khi cầm tờ dương tính là <b>' +
        pct(ppv) + '</b>.';
    }
    sPrev.addEventListener('input', paint);
    sSpec.addEventListener('input', paint);

    root.appendChild(note('Mỗi ô là một người. Bệnh hiếm tới đâu và xét nghiệm sạch tới đâu — kéo hai thanh và xem con số cuối đổi thế nào.'));
    root.appendChild(grid);
    var r = row();
    r.appendChild(field('Số ca bệnh trên 1.000 người', sPrev));
    r.appendChild(field('Độ đặc hiệu của xét nghiệm (%)', sSpec));
    root.appendChild(r);
    root.appendChild(out);
    root.appendChild(note('Độ nhạy giữ cố định ở 99%. Điều quyết định không phải chất lượng xét nghiệm mà là <b>tỉ lệ nền</b> — thứ gần như luôn bị bỏ quên khi đọc kết quả.'));
    paint();
  }

  /* ================================================= CHUỖI TUNG ĐỒNG XU */

  function coinRuns(root) {
    var stage = h('div', 'fx-coins');
    var out = readout('');
    var again = button('Tung lại 100 lần');
    var many  = button('Tung 2.000 lượt 100 lần');
    var manyOut = readout('');

    function flip() {
      var seq = [], i;
      for (i = 0; i < 100; i++) seq.push(rnd(2));
      var best = 0, bestAt = 0, cur = 1, at = 0;
      for (i = 1; i < 100; i++) {
        if (seq[i] === seq[i - 1]) { cur++; } else { cur = 1; at = i; }
        if (cur > best) { best = cur; bestAt = at; }
      }
      if (best === 0) { best = 1; bestAt = 0; }
      stage.innerHTML = seq.map(function (v, k) {
        var inRun = k >= bestAt && k < bestAt + best;
        return '<span class="fx-coin' + (v ? ' is-h' : '') + (inRun ? ' is-run' : '') + '">' +
               (v ? 'N' : 'S') + '</span>';
      }).join('');
      out.innerHTML = 'Chuỗi dài nhất trong 100 lần: <b>' + best + '</b> mặt giống nhau liên tiếp.';
    }
    again.addEventListener('click', flip);
    many.addEventListener('click', function () {
      var hist = {}, t, i, seq, cur, best;
      for (t = 0; t < 2000; t++) {
        best = 1; cur = 1; var prev = rnd(2);
        for (i = 1; i < 100; i++) {
          var v = rnd(2);
          cur = v === prev ? cur + 1 : 1;
          if (cur > best) best = cur;
          prev = v;
        }
        hist[best] = (hist[best] || 0) + 1;
      }
      var keys = Object.keys(hist).map(Number).sort(function (a, b) { return a - b; });
      var max = Math.max.apply(null, keys.map(function (k) { return hist[k]; }));
      manyOut.innerHTML = '';
      manyOut.appendChild(bars(keys.map(function (k) {
        return { label: k + ' mặt', value: hist[k] };
      }), max, function (v) { return num(v); }));
    });

    root.appendChild(note('S = sấp, N = ngửa. Chuỗi dài nhất được tô đậm. Bấm tung lại vài lần và để ý xem chuỗi 5–7 mặt liên tiếp xuất hiện thường xuyên tới mức nào.'));
    root.appendChild(stage);
    root.appendChild(out);
    var r = row(); r.appendChild(again); r.appendChild(many); root.appendChild(r);
    root.appendChild(manyOut);
    root.appendChild(note('Nếu bạn tự bịa một dãy “ngẫu nhiên”, bạn gần như chắc chắn sẽ không dám viết 6 mặt giống nhau liên tiếp. Đó là cách các nhà thống kê phát hiện dữ liệu bịa.'));
    flip();
  }

  /* ================================================================ BENFORD */

  var BENFORD = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

  function benford(root) {
    var sel = h('select', 'wb-select');
    sel.innerHTML =
      '<option value="fib">Dãy Fibonacci (1.000 số đầu)</option>' +
      '<option value="pow">Luỹ thừa của 2 (1.000 số đầu)</option>' +
      '<option value="growth">Dân số tăng 3%/năm qua 1.000 năm</option>' +
      '<option value="unif">Số ngẫu nhiên đều từ 1 đến 999.999</option>';
    var chart = h('div', 'fx-viz__stage');
    var out = readout('');

    /* Chữ số có nghĩa đầu tiên: bỏ dấu chấm thập phân rồi lấy ký tự 1–9 đầu tiên. */
    function firstDigit(x) {
      var m = String(x).replace('.', '').match(/[1-9]/);
      return m ? Number(m[0]) : 0;
    }
    function dataset(kind) {
      var v = [], i;
      if (kind === 'fib') { var a = 1, b = 1; for (i = 0; i < 1000; i++) { v.push(a); var t = a + b; a = b; b = t; if (a > 1e300) { a = 1; b = 1; } } }
      else if (kind === 'pow') { var p = 1; for (i = 0; i < 1000; i++) { v.push(p); p *= 2; if (p > 1e300) p = 1; } }
      else if (kind === 'growth') { var n = 1000; for (i = 0; i < 1000; i++) { v.push(n); n *= 1.03; } }
      else { for (i = 0; i < 1000; i++) v.push(1 + rnd(999999)); }
      return v;
    }
    function paint() {
      var v = dataset(sel.value), cnt = [0,0,0,0,0,0,0,0,0], i;
      for (i = 0; i < v.length; i++) {
        var d = firstDigit(v[i].toPrecision ? v[i].toPrecision(15) : v[i]);
        if (d >= 1 && d <= 9) cnt[d - 1]++;
      }
      var tot = cnt.reduce(function (a, b) { return a + b; }, 0) || 1;
      var maxV = Math.max(0.35, Math.max.apply(null, cnt.map(function (c) { return c / tot; })));
      var w = 34, html = ['<svg viewBox="0 0 330 150" class="fx-line" role="img" aria-label="Phân bố chữ số đầu">'];
      for (i = 0; i < 9; i++) {
        var obs = cnt[i] / tot, exp = BENFORD[i];
        var x = 6 + i * w;
        html.push('<rect x="' + x + '" y="' + (120 - obs / maxV * 106) + '" width="18" height="' +
                  (obs / maxV * 106) + '" class="fx-line__bar"/>');
        html.push('<line x1="' + x + '" x2="' + (x + 18) + '" y1="' + (120 - exp / maxV * 106) +
                  '" y2="' + (120 - exp / maxV * 106) + '" class="fx-line__ref"/>');
        html.push('<text x="' + (x + 9) + '" y="136" class="fx-line__cap" text-anchor="middle">' + (i + 1) + '</text>');
      }
      html.push('<line x1="0" y1="120" x2="324" y2="120" class="fx-line__axis"/></svg>');
      chart.innerHTML = html.join('');
      out.innerHTML = '<span class="fx-viz__dim">Cột = phân bố thật của tập dữ liệu · gạch ngang = mức Benford dự đoán.</span><br>' +
        'Chữ số 1 chiếm <b>' + pct(cnt[0] / tot) + '</b> (Benford: 30,1%), chữ số 9 chiếm <b>' +
        pct(cnt[8] / tot) + '</b> (Benford: 4,6%).';
    }
    sel.addEventListener('change', paint);

    root.appendChild(note('Đổi tập dữ liệu và xem cột có bám theo gạch ngang không. Ba tập đầu là dữ liệu “sinh ra từ tăng trưởng”; tập cuối là số bịa ngẫu nhiên đều.'));
    root.appendChild(chart);
    var r = row(); r.appendChild(field('Tập dữ liệu', sel)); root.appendChild(r);
    root.appendChild(out);
    paint();
  }

  /* =========================================================== SIMPSON */

  function simpson(root) {
    var RATE = { aMild: 0.93, aSevere: 0.73, bMild: 0.87, bSevere: 0.69 };
    var sA = slider(0, 100, 80);   /* % ca nặng trong nhóm dùng phương pháp A */
    var sB = slider(0, 100, 20);
    var out = readout('');

    function paint() {
      var xa = Number(sA.value) / 100, xb = Number(sB.value) / 100;
      var pa = RATE.aMild * (1 - xa) + RATE.aSevere * xa;
      var pb = RATE.bMild * (1 - xb) + RATE.bSevere * xb;
      var flip = pb > pa;
      out.innerHTML =
        '<div class="wb-scroll-x"><table class="wb-table wb-table--compact fx-table"><thead><tr>' +
        '<th>Nhóm</th><th>Phương pháp A</th><th>Phương pháp B</th></tr></thead><tbody>' +
        '<tr><td>Ca nhẹ</td><td><b>' + pct(RATE.aMild) + '</b></td><td>' + pct(RATE.bMild) + '</td></tr>' +
        '<tr><td>Ca nặng</td><td><b>' + pct(RATE.aSevere) + '</b></td><td>' + pct(RATE.bSevere) + '</td></tr>' +
        '<tr><td>Gộp chung</td><td>' + (flip ? '' : '<b>') + pct(pa) + (flip ? '' : '</b>') +
        '</td><td>' + (flip ? '<b>' : '') + pct(pb) + (flip ? '</b>' : '') + '</td></tr>' +
        '</tbody></table></div>' +
        (flip
          ? '<p class="fx-viz__flag">A thắng ở <b>cả hai</b> nhóm, nhưng thua khi gộp — vì A đang nhận phần lớn ca nặng.</p>'
          : '<p class="fx-viz__dim">Lúc này A thắng ở cả hai nhóm lẫn khi gộp. Kéo thanh trượt cho A nhận nhiều ca nặng hơn B để thấy kết luận đảo chiều.</p>');
    }
    sA.addEventListener('input', paint);
    sB.addEventListener('input', paint);

    root.appendChild(note('Tỉ lệ thành công trong từng nhóm được giữ cố định: A luôn tốt hơn B ở cả ca nhẹ lẫn ca nặng. Cái bạn đổi chỉ là <b>ai được giao ca nặng</b>.'));
    root.appendChild(out);
    var r = row();
    r.appendChild(field('% ca nặng trong nhóm dùng A', sA));
    r.appendChild(field('% ca nặng trong nhóm dùng B', sB));
    root.appendChild(r);
    root.appendChild(note('Vậy nên đọc bảng nào? Nếu bác sĩ giao ca nặng cho A vì A mạnh hơn, thì bảng tách nhóm mới đúng. Câu hỏi không phải là thống kê — nó là câu hỏi về <b>nhân quả</b>.'));
    paint();
  }

  /* ================================== HÌNH CHUÔNG VÀ LUẬT LUỸ THỪA */

  function normalVsPower(root) {
    function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    var out = h('div');
    var again = button('Lấy mẫu lại 5.000 người');

    function paint() {
      var n = 5000, hs = [], ws = [], i;
      for (i = 0; i < n; i++) {
        hs.push(163 + gauss() * 7);
        ws.push(50 / Math.pow(Math.random(), 1 / 1.16));   /* Pareto, alpha ≈ 1,16 */
      }
      out.innerHTML = '';
      out.appendChild(panel('Chiều cao (cm) — hình chuông', hs, 140, 195, 22, function (x) { return num(x); }));
      out.appendChild(panel('Tài sản (triệu đồng) — luật luỹ thừa', ws, 0, 2000, 22, function (x) { return num(x); }));

      var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
      var mH = sum(hs) / n, mW = sum(ws) / n;
      var medW = ws.slice().sort(function (a, b) { return a - b; })[Math.floor(n / 2)];
      out.appendChild(readout(
        'Chiều cao: người cao nhất mẫu chỉ gấp <b>' + num(Math.max.apply(null, hs) / mH, 2) +
        '</b> lần trung bình.<br>' +
        'Tài sản: người giàu nhất mẫu gấp <b>' + num(Math.max.apply(null, ws) / mW, 1) +
        '</b> lần trung bình — và trung vị chỉ bằng <b>' + pct(medW / mW, 0) +
        '</b> của trung bình.'));
    }

    function panel(title, vals, lo, hi, bins, fmt) {
      var box = h('div', 'fx-viz__panel');
      box.appendChild(h('p', 'fx-viz__panel-title', title));
      var cnt = new Array(bins).fill(0), i, b;
      for (i = 0; i < vals.length; i++) {
        b = Math.floor((vals[i] - lo) / (hi - lo) * bins);
        if (b < 0) b = 0; if (b >= bins) b = bins - 1;
        cnt[b]++;
      }
      var max = Math.max.apply(null, cnt);
      var w = 320 / bins, html = ['<svg viewBox="0 0 330 110" class="fx-line" role="img" aria-label="' + title + '">'];
      for (i = 0; i < bins; i++) {
        html.push('<rect x="' + (4 + i * w) + '" y="' + (94 - cnt[i] / max * 88) + '" width="' + (w - 2) +
                  '" height="' + (cnt[i] / max * 88) + '" class="fx-line__bar"/>');
      }
      html.push('<line x1="0" y1="94" x2="324" y2="94" class="fx-line__axis"/>');
      html.push('<text x="4" y="107" class="fx-line__cap">' + fmt(lo) + '</text>');
      html.push('<text x="324" y="107" class="fx-line__cap" text-anchor="end">' + fmt(hi) + '+</text>');
      html.push('</svg>');
      box.appendChild(h('div', null, html.join('')));
      return box;
    }

    again.addEventListener('click', paint);
    root.appendChild(note('Hai mẫu 5.000 người, cùng cách vẽ. Chỉ khác nhau ở quy luật sinh ra chúng.'));
    root.appendChild(out);
    root.appendChild(row().appendChild(again).parentNode);
    root.appendChild(note('Với hình chuông, “người trung bình” là một mô tả có nghĩa. Với luật luỹ thừa, trung bình bị kéo bởi cái đuôi và gần như không mô tả ai cả — đó là lý do thu nhập luôn nên đọc bằng trung vị.'));
    paint();
  }

  /* ========================================================= GẤP TỜ GIẤY */

  var FOLD_REF = [
    [0.0001, 'độ dày một tờ giấy'],
    [0.017,  'chiều cao một lon nước'],
    [1.7,    'chiều cao một người'],
    [93,     'tượng Nữ thần Tự do'],
    [828,    'toà Burj Khalifa'],
    [8849,   'đỉnh Everest'],
    [100000, 'ranh giới vũ trụ (đường Kármán)'],
    [400000, 'quỹ đạo Trạm Vũ trụ Quốc tế'],
    [35786000, 'quỹ đạo vệ tinh địa tĩnh'],
    [384400000, 'khoảng cách tới Mặt Trăng'],
    [149600000000, 'khoảng cách tới Mặt Trời']
  ];

  function expFold(root) {
    var s = slider(0, 51, 20);
    var out = readout('');
    function paint() {
      var n = Number(s.value);
      var m = 0.0001 * Math.pow(2, n);           /* mét */
      var ref = null, i;
      for (i = FOLD_REF.length - 1; i >= 0; i--) if (m >= FOLD_REF[i][0]) { ref = FOLD_REF[i]; break; }
      var disp;
      if (m < 1) disp = num(m * 1000, 2) + ' mm';
      else if (m < 1000) disp = num(m, 2) + ' m';
      else if (m < 1e9) disp = num(m / 1000, 0) + ' km';
      else disp = num(m / 1000, 0) + ' km';
      out.innerHTML =
        'Gấp <b>' + n + '</b> lần → dày <b>' + disp + '</b>' +
        (ref ? '<br><span class="fx-viz__dim">Đã vượt qua: ' + ref[1] + ' (' +
               (ref[0] < 1000 ? num(ref[0], 2) + ' m' : num(ref[0] / 1000) + ' km') + ')</span>' : '');
    }
    s.addEventListener('input', paint);
    root.appendChild(note('Tờ giấy dày 0,1 mm. Mỗi lần gấp là nhân đôi — kéo thanh trượt từ 0 tới 51 và để ý chỗ nó bắt đầu vọt.'));
    var r = row(); r.appendChild(field('Số lần gấp', s)); root.appendChild(r);
    root.appendChild(out);
    root.appendChild(note('Từ lần 1 tới lần 20 gần như không thấy gì. Từ lần 40 trở đi mỗi lần gấp thêm một bậc thang vũ trụ. Trực giác của con người tuyến tính, còn thế giới thì thường không.'));
    paint();
  }

  /* ================================================ HỆ MẶT TRỜI THU NHỎ */

  var PLANETS = [
    ['Sao Thuỷ', 4879, 57.9e6], ['Sao Kim', 12104, 108.2e6], ['Trái Đất', 12756, 149.6e6],
    ['Sao Hoả', 6792, 227.9e6], ['Sao Mộc', 142984, 778.6e6], ['Sao Thổ', 120536, 1433.5e6],
    ['Sao Thiên Vương', 51118, 2872.5e6], ['Sao Hải Vương', 49528, 4495.1e6]
  ];
  var SUN_KM = 1392700;

  function scaleSolar(root) {
    var s = slider(2, 60, 24);      /* đường kính Mặt Trời, cm */
    var out = h('div');
    function size(mm) {
      if (mm < 1) return num(mm, 2) + ' mm';
      if (mm < 10) return num(mm, 1) + ' mm';
      return num(mm, 0) + ' mm';
    }
    function dist(m) {
      if (m < 1000) return num(m, 1) + ' m';
      return num(m / 1000, 2) + ' km';
    }
    function paint() {
      var sunCm = Number(s.value);
      var k = (sunCm / 100) / SUN_KM;                  /* mét mô hình trên km thật */
      var rows = PLANETS.map(function (p) {
        return '<tr><td>' + p[0] + '</td><td>' + size(p[1] * k * 1000) + '</td><td>' + dist(p[2] * k) + '</td></tr>';
      }).join('');
      out.innerHTML =
        '<p class="fx-viz__out">Nếu Mặt Trời là quả cầu đường kính <b>' + sunCm + ' cm</b>:</p>' +
        '<div class="wb-scroll-x"><table class="wb-table wb-table--compact fx-table"><thead><tr>' +
        '<th>Hành tinh</th><th>Đường kính mô hình</th><th>Khoảng cách từ Mặt Trời</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>' +
        '<p class="fx-viz__dim">Ngôi sao gần nhất (Proxima Centauri) sẽ nằm cách đó <b>' +
        num(4.0175e13 * k / 1000, 0) + ' km</b> — vẫn theo đúng cùng tỉ lệ.</p>';
    }
    s.addEventListener('input', paint);
    root.appendChild(note('Mọi hình vẽ hệ Mặt Trời đều nói dối về khoảng cách, vì vẽ đúng thì các hành tinh sẽ nhỏ hơn một điểm ảnh.'));
    var r = row(); r.appendChild(field('Đường kính Mặt Trời trong mô hình (cm)', s)); root.appendChild(r);
    root.appendChild(out);
    paint();
  }

  /* ============================================================ LỊCH VŨ TRỤ */

  var COSMIC = [
    [0,            'Vụ Nổ Lớn'],
    [0.4e9,        'Các ngôi sao đầu tiên'],
    [1.0e9,        'Các thiên hà đầu tiên'],
    [4.6e9,        'Ngân Hà thành hình'],
    [9.2e9,        'Hệ Mặt Trời hình thành'],
    [9.3e9,        'Trái Đất hình thành'],
    [10.0e9,       'Sự sống đơn bào đầu tiên'],
    [11.4e9,       'Quang hợp bắt đầu thải oxy'],
    [12.0e9,       'Tế bào có nhân'],
    [13.2e9,       'Sự sống đa bào'],
    [13.26e9,      'Bùng nổ kỷ Cambri'],
    [13.55e9,      'Khủng long xuất hiện'],
    [13.734e9,     'Khủng long tuyệt chủng'],
    [13.794e9,     'Tổ tiên chung với tinh tinh'],
    [13.7997e9,    'Người hiện đại xuất hiện'],
    [13.79999e9,   'Nông nghiệp'],
    [13.799995e9,  'Chữ viết được phát minh'],
    [13.8e9,       'Hôm nay']
  ];
  var AGE = 13.8e9;

  function cosmicClock(root) {
    var s = slider(0, 100000, 100000);
    var out = readout('');
    function paint() {
      var frac = Number(s.value) / 100000;
      var years = frac * AGE;
      /* vị trí trong "năm vũ trụ" */
      var secs = frac * 365.25 * 24 * 3600;
      var d = new Date(Date.UTC(2001, 0, 1) + secs * 1000);
      var months = ['tháng 1','tháng 2','tháng 3','tháng 4','tháng 5','tháng 6',
                    'tháng 7','tháng 8','tháng 9','tháng 10','tháng 11','tháng 12'];
      var stamp = 'ngày ' + d.getUTCDate() + ' ' + months[d.getUTCMonth()] + ', ' +
        String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
      var ev = COSMIC[0], i;
      for (i = 0; i < COSMIC.length; i++) if (years >= COSMIC[i][0]) ev = COSMIC[i];
      out.innerHTML =
        '<b>' + stamp + '</b> trên lịch vũ trụ<br>' +
        '<span class="fx-viz__dim">' + num(years / 1e6, 1) + ' triệu năm sau Vụ Nổ Lớn · cách hôm nay ' +
        num((AGE - years) / 1e6, 1) + ' triệu năm</span><br>' +
        'Mốc gần nhất đã qua: <b>' + ev[1] + '</b>';
    }
    s.addEventListener('input', paint);

    var list = h('div', 'fx-timeline');
    COSMIC.forEach(function (e) {
      var frac = e[0] / AGE;
      var secs = frac * 365.25 * 24 * 3600;
      var d = new Date(Date.UTC(2001, 0, 1) + secs * 1000);
      var lab = (d.getUTCMonth() === 11 && d.getUTCDate() === 31)
        ? '31/12 ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0')
        : d.getUTCDate() + '/' + (d.getUTCMonth() + 1);
      list.appendChild(h('div', 'fx-timeline__row',
        '<span class="fx-timeline__when">' + lab + '</span>' +
        '<span class="fx-timeline__what">' + e[1] + '</span>'));
    });

    root.appendChild(note('Nén toàn bộ 13,8 tỷ năm vào đúng một năm dương lịch. Kéo thanh trượt tới cuối và để ý chuyện gì dồn hết vào ngày 31 tháng 12.'));
    var r = row(); r.appendChild(field('Vị trí trong năm vũ trụ', s)); root.appendChild(r);
    root.appendChild(out);
    root.appendChild(list);
    paint();
  }

  /* ------------------------------------------------------------------ xuất */

  window.FactViz = {
    'blind-spot':      blindSpot,
    'checker-shadow':  checkerShadow,
    'stroop':          stroop,
    'birthday':        birthday,
    'monty-hall':      montyHall,
    'bayes':           bayes,
    'coin-runs':       coinRuns,
    'benford':         benford,
    'simpson':         simpson,
    'normal-vs-power': normalVsPower,
    'exp-fold':        expFold,
    'scale-solar':     scaleSolar,
    'cosmic-clock':    cosmicClock
  };
})();
