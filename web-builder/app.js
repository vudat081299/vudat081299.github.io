/* =============================================================================
   Web Builder docs — shared shell (defined ONCE, reused by every page)
   -----------------------------------------------------------------------------
   • Renders the tree sidebar from NAV (group heading = primary line, items dimmer).
   • Hash router: #/<id> loads pages/<id>.html into the main column, so each
     group shows in isolation (pick "Tables" → only tables render).
   • Theme toggle, code-copy, token swatches, sticky-table fill, dual light/dark
     preview, and light interactive helpers (dropdown / modal / toast / tabs).
   Content files in pages/ stay tiny: markup only, no shell, no script.
   Serve the folder (fetch needs http) — e.g. `python3 -m http.server`.
   ========================================================================== */

/* ---- Navigation model — the single source of truth for the sidebar tree --- */
const NAV = [
  { group: "Nền tảng", items: [
    { id: "overview",   label: "Tổng quan" },
    { id: "color",      label: "Triết lý màu" },
    { id: "tokens",     label: "Design tokens" },
    { id: "typography", label: "Typography" },
    { id: "fonts",      label: "Fonts" },
    { id: "border",     label: "Border & bo góc" },
    { id: "config",     label: "Config / Tweak" },
  ]},
  { group: "Bố cục & tiện ích", items: [
    { id: "layout",     label: "Grid / Layout" },
    { id: "sticky",     label: "Sticky" },
    { id: "scroll",     label: "Scroll / thanh cuộn" },
    { id: "divider",    label: "Divider" },
  ]},
  { group: "Hành động", items: [
    { id: "buttons",  label: "Buttons" },
    { id: "dropdown", label: "Dropdown / Menu" },
  ]},
  { group: "Nhập liệu", items: [
    { id: "input",    label: "Text input" },
    { id: "select",   label: "Select" },
    { id: "textarea", label: "Textarea" },
    { id: "richtext", label: "Rich text (format bar)" },
    { id: "choice",   label: "Checkbox & Radio" },
    { id: "switch",   label: "Switch" },
    { id: "range",    label: "Range / Slider" },
    { id: "file",     label: "File / Upload" },
  ]},
  { group: "Bộ chọn", items: [
    { id: "calendar",    label: "Lịch (calendar)" },
    { id: "timepicker",  label: "Chọn giờ (time)" },
    { id: "colorpicker", label: "Bộ chọn màu" },
  ]},
  { group: "Hiển thị dữ liệu", items: [
    { id: "card",     label: "Card" },
    { id: "receipt",  label: "Hoá đơn (receipt)" },
    { id: "tables",   label: "Tables" },
    { id: "filterbar",label: "Filter bar" },
    { id: "list",     label: "List group" },
    { id: "stats",    label: "Stat / KPI cards" },
    { id: "capsules", label: "Capsules / Badges" },
    { id: "tags",     label: "Tags (#)" },
    { id: "avatar",   label: "Avatar" },
    { id: "charts",   label: "Charts" },
  ]},
  { group: "Phản hồi", items: [
    { id: "alert",    label: "Alert / Banner" },
    { id: "toast",    label: "Toast" },
    { id: "progress", label: "Progress" },
    { id: "skeleton", label: "Skeleton" },
    { id: "empty",    label: "Empty state" },
  ]},
  { group: "Lớp phủ (Overlay)", items: [
    { id: "modal",    label: "Modal / Dialog" },
    { id: "drawer",   label: "Drawer / Offcanvas" },
    { id: "tooltip",  label: "Tooltip" },
    { id: "popover",  label: "Popover" },
  ]},
  { group: "Điều hướng", items: [
    { id: "navbar",     label: "Navbar & menu" },
    { id: "sidenav",    label: "Sidebar (side-nav)" },
    { id: "tabs",       label: "Tabs" },
    { id: "steps",      label: "Steps / Stepper" },
    { id: "breadcrumb", label: "Breadcrumb" },
    { id: "pagination", label: "Pagination" },
  ]},
  { group: "Đóng/mở (Disclosure)", items: [
    { id: "accordion",  label: "Accordion" },
    { id: "collapse",   label: "Collapse" },
  ]},
  { group: "Cấu trúc", items: [
    { id: "tree",     label: "Tree danh mục" },
    { id: "sortable", label: "List / Grid kéo–thả" },
    { id: "slotgrid", label: "Lưới ô cố định" },
  ]},
];

const ROUTES = {};
NAV.forEach((g) => g.items.forEach((it) => (ROUTES[it.id] = it)));
const DEFAULT_ROUTE = "overview";

/* ---- Sidebar tree — heading + dimmer items. The heading is a button that
   collapses its group; the caret sits on the RIGHT (no leading triangle). ---- */
function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = NAV.map((g) => `
    <div class="doc-tree__group">
      <button class="doc-tree__head" data-group-toggle aria-expanded="true">
        <span>${g.group}</span><span class="doc-tree__caret" aria-hidden="true"></span>
      </button>
      <div class="doc-tree__items">
        ${g.items.map((it) => it.coming
          ? `<span class="doc-tree__link is-coming">${it.label}<span class="doc-tree__badge">soon</span></span>`
          : `<a class="doc-tree__link" href="#/${it.id}" data-id="${it.id}">${it.label}</a>`
        ).join("")}
      </div>
    </div>`).join("");
}

/* ---- Router --------------------------------------------------------------- */
async function loadRoute() {
  const id = location.hash.replace(/^#\/?/, "") || DEFAULT_ROUTE;
  const route = ROUTES[id];
  const view = document.getElementById("view");

  if (!route || route.coming) { location.hash = "#/" + DEFAULT_ROUTE; return; }

  document.querySelectorAll(".doc-tree__link").forEach((a) =>
    a.classList.toggle("is-active", a.dataset.id === id));
  document.title = route.label + " · Web Builder";

  try {
    const res = await fetch("pages/" + id + ".html", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    view.innerHTML = await res.text();
  } catch (err) {
    view.innerHTML =
      '<div class="doc-coming"><h3>Không tải được trang</h3>' +
      "<p>Docs cần chạy qua HTTP server (fetch không hoạt động với <code>file://</code>).<br>" +
      "Chạy: <code>cd web-builder/assets &amp;&amp; python3 -m http.server 8777</code> rồi mở " +
      "<code>http://localhost:8777</code>.</p></div>";
    return;
  }
  window.scrollTo(0, 0);
  initPage(view);
}

/* ---- Per-page init — generic, driven by data-attributes ------------------- */
function initPage(root) {
  root.querySelectorAll("[data-swatches]").forEach(renderSwatches);
  root.querySelectorAll("[data-sticky-fill]").forEach(fillSticky);
  root.querySelectorAll("[data-dual]").forEach(renderDual);
  root.querySelectorAll("[data-tree]").forEach(initTree);
  root.querySelectorAll("[data-sortable]").forEach(initSortable);
  root.querySelectorAll("[data-sortable-rows]").forEach(initSortableTable);
  root.querySelectorAll("[data-slotgrid]").forEach(initSlotGrid);
  root.querySelectorAll("[data-range-filter]").forEach(initRangeFilter);
  root.querySelectorAll("[data-colorpicker]").forEach(initColorPicker);
  root.querySelectorAll("[data-calendar]").forEach(initCalendar);
  root.querySelectorAll("[data-timepicker]").forEach(initTimePicker);
  root.querySelectorAll("[data-mask]").forEach(initMask);
  root.querySelectorAll("[data-reveal]").forEach(initReveal);
  root.querySelectorAll("[data-picker-out]").forEach(initPickerField);
  root.querySelectorAll("[data-formatbar]").forEach(initFormatbar);
}

/* ---- Range filter — dual slider ⇄ min/max inputs ⇄ plain-language summary -----
   Docs-only wiring; in an app use Radix Slider + controlled state. Two stacked
   <input type=range> (data-h="min"/"max") can't cross; the fill + text + number
   boxes all stay in sync. Number boxes never get rewritten while focused. -------- */
function initRangeFilter(rf) {
  const dual = rf.querySelector(".wb-range-dual");
  if (!dual) return;
  const sMin = dual.querySelector('.wb-range-dual__input[data-h="min"]');
  const sMax = dual.querySelector('.wb-range-dual__input[data-h="max"]');
  const nMin = rf.querySelector("[data-range-min]");
  const nMax = rf.querySelector("[data-range-max]");
  const out  = rf.querySelector(".wb-range-filter__summary");
  const lo = +sMin.min, hi = +sMax.max;
  const pct = (v) => ((v - lo) / (hi - lo)) * 100;
  const fmt = (v) => (+v).toLocaleString("vi-VN");
  function render() {
    const a = +sMin.value, b = +sMax.value;
    dual.style.setProperty("--a", pct(a));
    dual.style.setProperty("--b", pct(b));
    if (nMin && document.activeElement !== nMin) nMin.value = a;
    if (nMax && document.activeElement !== nMax) nMax.value = b;
    if (out) {
      out.textContent =
        a <= lo && b >= hi ? "Mọi số tiền" :
        a <= lo ? "Dưới " + fmt(b) + " ₫" :
        b >= hi ? "Trên " + fmt(a) + " ₫" :
        fmt(a) + " – " + fmt(b) + " ₫";
    }
  }
  sMin.addEventListener("input", () => { if (+sMin.value > +sMax.value) sMin.value = sMax.value; render(); });
  sMax.addEventListener("input", () => { if (+sMax.value < +sMin.value) sMax.value = sMin.value; render(); });
  if (nMin) nMin.addEventListener("input", () => { sMin.value = Math.max(lo, Math.min(+nMin.value || lo, +sMax.value)); render(); });
  if (nMax) nMax.addEventListener("input", () => { sMax.value = Math.min(hi, Math.max(+nMax.value || hi, +sMin.value)); render(); });
  render();
}

/* ---- Colour picker — SV area + hue slider + hex + presets, all kept in sync ---
   Docs-only wiring; in an app use a headless colour lib (e.g. react-colorful) or
   your own pointer handlers — Web Builder ships only the look. Pointer drag on the
   SV area sets saturation/value, the hue track sets hue, the hex field round-trips
   (never rewritten while focused), and a preset click snaps to that hue. ---------- */
function initColorPicker(el) {
  const area = el.querySelector(".wb-colorpicker__area");
  const hue  = el.querySelector(".wb-colorpicker__hue");
  if (!area || !hue) return;
  const areaThumb = area.querySelector(".wb-colorpicker__thumb");
  const hueThumb  = hue.querySelector(".wb-colorpicker__thumb");
  const preview   = el.querySelector(".wb-colorpicker__preview");
  const hexInput  = el.querySelector("[data-cp-hex]");
  const presets   = [...el.querySelectorAll(".wb-swatch")];
  let h = 239, s = 59, v = 95, ready = false;   // default ≈ #6366F1

  const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0");
  function hsvToHex(H, S, V) {
    S /= 100; V /= 100;
    const c = V * S, x = c * (1 - Math.abs(((H / 60) % 2) - 1)), m = V - c;
    const [r, g, b] =
      H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] :
      H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x];
    return (hex2((r + m) * 255) + hex2((g + m) * 255) + hex2((b + m) * 255)).toUpperCase();
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let H = 0;
    if (d) {
      H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      H = (H * 60 + 360) % 360;
    }
    return { h: H, s: mx ? (d / mx) * 100 : 0, v: mx * 100 };
  }
  function parseColor(str) {                       // "#RRGGBB", "RGB", or "rgb(r,g,b)"
    if (str.trim().startsWith("rgb")) {
      const n = str.match(/\d+/g);
      return n && n.length >= 3 ? rgbToHsv(+n[0], +n[1], +n[2]) : null;
    }
    let hx = str.replace("#", "").trim();
    if (hx.length === 3) hx = hx.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(hx)) return null;
    return rgbToHsv(parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16));
  }
  function render(silent) {
    const hex = hsvToHex(h, s, v);
    area.style.setProperty("--wb-cp-hue", "hsl(" + h + ", 100%, 50%)");
    areaThumb.style.left = s + "%";
    areaThumb.style.top = 100 - v + "%";
    hueThumb.style.left = (h / 360) * 100 + "%";
    el.style.setProperty("--wb-cp-value", "#" + hex);
    if (preview) preview.style.background = "#" + hex;
    if (hexInput && document.activeElement !== hexInput) hexInput.value = hex;
    presets.forEach((sw) => {
      const c = parseColor(getComputedStyle(sw).backgroundColor);
      sw.classList.toggle("is-selected", !!c && hsvToHex(c.h, c.s, c.v) === hex);
    });
    /* Notify hosts (e.g. the Config drawer) of a colour change without exposing internals.
       The initial seed render stays silent so it never registers as a user tweak. */
    if (!silent && ready) el.dispatchEvent(new CustomEvent("wb-cp-input", { bubbles: true, detail: "#" + hex }));
  }
  function track(node, fn) {
    node.addEventListener("pointerdown", (e) => {
      if (hexInput && document.activeElement === hexInput) hexInput.blur();   // let the field re-sync during the drag
      const move = (ev) => fn(ev, node.getBoundingClientRect());
      move(e);                                   // register the press position first
      try { node.setPointerCapture(e.pointerId); } catch (_) {}
      const up = () => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", up);
        node.removeEventListener("pointercancel", up);   // touch scroll / interruption also ends the drag
      };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", up);
    });
  }
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  track(area, (e, r) => { s = clamp01((e.clientX - r.left) / r.width) * 100; v = (1 - clamp01((e.clientY - r.top) / r.height)) * 100; render(); });
  track(hue, (e, r) => { h = clamp01((e.clientX - r.left) / r.width) * 360; render(); });
  if (hexInput) hexInput.addEventListener("input", () => { const c = parseColor(hexInput.value); if (c) { h = c.h; s = c.s; v = c.v; render(); } });
  presets.forEach((sw) => sw.addEventListener("click", () => { const c = parseColor(getComputedStyle(sw).backgroundColor); if (c) { h = c.h; s = c.s; v = c.v; render(); } }));
  const init = hexInput && parseColor(hexInput.value);
  if (init) { h = init.h; s = init.s; v = init.v; }
  el._cpSet = (val, silent) => { const c = parseColor(val); if (!c) return; h = c.h; s = c.s; v = c.v; render(silent); };
  render();
  ready = true;
}

/* ---- Date / time pickers — a month grid + scroll-column time, kept minimal -------
   Docs-only wiring; in an app use a headless date lib (react-day-picker) or your own
   handlers — Web Builder ships only the look. Both emit a bubbling CustomEvent
   ({ text, complete }) and expose an imperative setter; the popover-field glue below
   writes the value into a trigger field. --------------------------------------------- */
function calPad(n) { return String(n).padStart(2, "0"); }

function initCalendar(el) {
  const grid  = el.querySelector(".wb-calendar__grid");
  const title = el.querySelector(".wb-calendar__title");
  if (!grid || !title) return;
  const isRange = el.hasAttribute("data-range");
  const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];             // Monday-first
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const same = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const fmt  = (d) => calPad(d.getDate()) + "/" + calPad(d.getMonth() + 1) + "/" + d.getFullYear();
  const parse = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || "").trim()); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  const parseVal = (s) => { const p = (s || "").split(/\s*[–-]\s*/); return { a: parse(p[0]), b: p[1] ? parse(p[1]) : null }; };

  const seed = parseVal(el.dataset.value);  // data-value = "dd/mm/yyyy" or, for a range, "dd/mm/yyyy – dd/mm/yyyy"
  let sel = seed.a;                         // single date, or the range's start
  let end = isRange ? seed.b : null;        // range end
  if (end && end < sel) { const t = sel; sel = end; end = t; }   // normalize a reversed seed
  let view = new Date((sel || today).getFullYear(), (sel || today).getMonth(), 1);

  function emit(complete) {
    const text = !sel ? "" : isRange ? fmt(sel) + (end ? " – " + fmt(end) : "") : fmt(sel);
    el.dispatchEvent(new CustomEvent("wb-cal-input", { bubbles: true, detail: { text, complete } }));
  }
  /* Rebuild the day buttons for the current month — only on load + month nav. */
  function layout() {
    title.textContent = "Tháng " + (view.getMonth() + 1) + ", " + view.getFullYear();
    let html = WD.map((d) => '<span class="wb-calendar__wd">' + d + "</span>").join("");
    const offset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;   // Monday = 0
    const start  = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
    for (let i = 0; i < 42; i++) {                                   // 6 weeks × 7 days
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      html += '<button type="button" class="wb-calendar__day" data-day="' + d.getTime() + '">' + d.getDate() + "</button>";
    }
    grid.innerHTML = html;
    paint();
  }
  /* Update ONLY the state classes on the existing buttons — a day pick doesn't rebuild
     the grid, so the click target stays in the DOM. (If it were detached mid-click, the
     delegated popover handler would lose the panel and slam a hosting popover shut —
     which would break a range pick that needs a second click.) */
  function paint() {
    grid.querySelectorAll(".wb-calendar__day").forEach((btn) => {
      const d = new Date(+btn.dataset.day);
      const inRange = isRange && sel && end;
      btn.classList.toggle("is-muted", d.getMonth() !== view.getMonth());
      btn.classList.toggle("is-today", same(d, today));
      btn.classList.toggle("is-range-start", inRange && same(d, sel));
      btn.classList.toggle("is-range-end",   inRange && same(d, end));
      btn.classList.toggle("is-in-range",    inRange && d > sel && d < end);
      btn.classList.toggle("is-selected",    !inRange && same(d, sel));
    });
  }
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".wb-calendar__day");
    if (!btn) return;
    const d = new Date(+btn.dataset.day);
    if (!isRange) { sel = d; paint(); emit(true); return; }
    if (!sel || end) { sel = d; end = null; paint(); emit(false); }  // start a fresh range
    else { if (d < sel) { end = sel; sel = d; } else { end = d; } paint(); emit(true); }   // close it
  });
  el.querySelectorAll("[data-cal-prev]").forEach((b) => b.addEventListener("click", () => { view.setMonth(view.getMonth() - 1); layout(); }));
  el.querySelectorAll("[data-cal-next]").forEach((b) => b.addEventListener("click", () => { view.setMonth(view.getMonth() + 1); layout(); }));
  el._calSet = (v) => { const s = parseVal(v); sel = s.a; end = isRange ? s.b : null; if (end && end < sel) { const t = sel; sel = end; end = t; } if (sel) view = new Date(sel.getFullYear(), sel.getMonth(), 1); layout(); };
  layout();
}

function initTimePicker(el) {
  const cols = [...el.querySelectorAll("[data-tp]")];
  if (!cols.length) return;
  const ampm  = el.hasAttribute("data-ampm");
  const mStep = Math.max(1, parseInt(el.dataset.minuteStep || "1", 10) || 1);
  const seq = (a, b, s) => { const r = []; for (let i = a; i <= b; i += (s || 1)) r.push(i); return r; };
  const state = { hour: 9, minute: 0, period: "AM" };
  const listFor  = (u) => u === "hour" ? (ampm ? seq(1, 12) : seq(0, 23)) : u === "minute" ? seq(0, 59, mStep) : ["AM", "PM"];
  const labelFor = (u, v) => u === "period" ? v : calPad(v);
  const text = () => ampm
    ? calPad(state.hour) + ":" + calPad(state.minute) + " " + state.period
    : calPad(state.hour) + ":" + calPad(state.minute);
  const load = (v) => {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((v || "").trim());
    if (!m) return;
    const h = +m[1], mer = m[3] && m[3].toUpperCase();
    let min = Math.min(59, Math.max(0, +m[2]));
    if (mStep > 1) { min = Math.round(min / mStep) * mStep; if (min > 59) min -= mStep; }   // snap onto the step grid
    state.minute = min;
    if (ampm) { state.period = mer || (h < 12 ? "AM" : "PM"); state.hour = ((h + 11) % 12) + 1; }
    else state.hour = mer ? (h % 12) + (mer === "PM" ? 12 : 0) : h;   // tolerate a meridiem on a 24-hour value
  };
  function paint(col, u) {
    col.querySelectorAll(".wb-timepicker__opt").forEach((o) => o.classList.toggle("is-selected", String(state[u]) === o.dataset.v));
    center(col);
  }
  /* Scroll the selected option to the column's middle. Skipped while the column has no height
     (e.g. inside a closed popover) — the IntersectionObserver below re-centres on first reveal. */
  function center(col) {
    const o = col.querySelector(".wb-timepicker__opt.is-selected");
    if (o && col.clientHeight) col.scrollTop += o.getBoundingClientRect().top - col.getBoundingClientRect().top - col.clientHeight / 2 + o.offsetHeight / 2;
  }
  load(el.dataset.value);
  cols.forEach((col) => {
    const u = col.dataset.tp;
    col.innerHTML = listFor(u).map((v) => '<button type="button" class="wb-timepicker__opt" data-v="' + v + '">' + labelFor(u, v) + "</button>").join("");
    col.addEventListener("click", (e) => {
      const o = e.target.closest(".wb-timepicker__opt");
      if (!o) return;
      state[u] = u === "period" ? o.dataset.v : +o.dataset.v;
      paint(col, u);
      el.dispatchEvent(new CustomEvent("wb-time-input", { bubbles: true, detail: { text: text(), complete: true } }));
    });
    paint(col, u);
  });
  /* A picker seeded inside a CLOSED popover has 0-height columns at init, so the initial centre
     can't land (nothing to scroll). The popover-open handler calls _tpCenter once the panel is
     shown — reading rects there forces layout, so the selected option lands centred. */
  el._tpCenter = () => cols.forEach(center);
  el._timeSet = (v) => { load(v); cols.forEach((c) => paint(c, c.dataset.tp)); };
}

/* Docs demo glue: a calendar / time picker hosted in a .wb-popover writes its value
   into the trigger's [data-picker-out] field; a COMPLETED date pick closes the popover
   (time stays open so both columns can be set). An app owns this — the parts just emit. */
function pickerToField(e) {
  const pop = e.target.closest(".wb-popover");
  if (!pop) return;
  const out = pop.querySelector("[data-picker-out]");
  if (out) { if (out.matches("input, textarea")) out.value = e.detail.text; else out.textContent = e.detail.text; }
  if (e.type === "wb-cal-input" && e.detail.complete) setTimeout(() => pop.classList.remove("is-open"), 140);
}
document.addEventListener("wb-cal-input", pickerToField);
document.addEventListener("wb-time-input", pickerToField);

/* The inverse of pickerToField: when the user TYPES a (masked) date/time into the
   field, mirror it in the hosted picker so "type OR pick" stay in sync. Also run
   when the popover opens, to seed the picker from the field's current value. The
   regex gate keeps a half-typed value from clearing the picker's current selection. */
function syncFieldToPicker(pop) {
  if (!pop) return;
  const field = pop.querySelector("[data-picker-out]");
  if (!field) return;
  const val = (field.matches("input, textarea") ? field.value : field.textContent).trim();
  const cal = pop.querySelector("[data-calendar]");
  if (cal && cal._calSet && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) cal._calSet(val);   // full dd/mm/yyyy only
  const tp = pop.querySelector("[data-timepicker]");
  if (tp && tp._timeSet && /^\d{1,2}:\d{2}(\s*[AP]M)?$/i.test(val)) tp._timeSet(val);
}
function initPickerField(field) {
  const pop = field.closest(".wb-popover");
  if (pop) field.addEventListener("input", () => syncFieldToPicker(pop));
}

/* ---- Masked inputs — format WHILE typing (no popup), docs-only driver -------------
   data-mask="date|time|datetime|card|daterange": strip to digits, then re-insert the
   fixed separators; the caret rides the end (fine for append typing). In an app use a
   real mask lib (imask / cleave.js) for caret-safe mid-string edits — Web Builder owns
   only the look. A [data-reveal] button flips a password field's visibility. ---------- */
const MASKS = {
  date:      { groups: [2, 2, 4],          seps: ["/", "/"] },
  time:      { groups: [2, 2],             seps: [":"] },
  datetime:  { groups: [2, 2, 4, 2, 2],    seps: ["/", "/", " ", ":"] },
  card:      { groups: [4, 4, 4, 4],       seps: [" ", " ", " "] },
  daterange: { groups: [2, 2, 4, 2, 2, 4], seps: ["/", "/", " – ", "/", "/"] },
};
function applyMask(spec, raw) {
  const max = spec.groups.reduce((a, b) => a + b, 0);
  const d = raw.replace(/\D/g, "").slice(0, max);
  let out = "", i = 0;
  for (let g = 0; g < spec.groups.length && i < d.length; g++) {
    if (g > 0) out += spec.seps[g - 1];
    out += d.slice(i, i + spec.groups[g]);
    i += spec.groups[g];
  }
  return out;
}
function initMask(el) {
  const spec = MASKS[el.dataset.mask];
  if (!spec) return;
  const run = () => { el.value = applyMask(spec, el.value); };
  el.addEventListener("input", run);
  run();                                   // format any value the markup ships with
}
function initReveal(btn) {
  const group = btn.closest(".wb-input-group");
  const input = group && group.querySelector(".wb-input");
  const ico   = btn.querySelector(".wb-ico");
  if (!input) return;
  btn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    if (ico) ico.textContent = show ? "visibility_off" : "visibility";
    btn.setAttribute("aria-pressed", String(show));
  });
}

/* ---- Format toolbar (.wb-toolbar) — inserts markdown tokens into the paired
   .wb-textarea. `data-formatbar="<textarea id>"` (or the next .wb-textarea sibling).
   Each button carries data-cmd; wrap-tokens surround the selection, headings prefix
   the line, clear strips tokens. Docs-only; in an app wire a real markdown editor. */
function initFormatbar(bar) {
  const ta = document.getElementById(bar.dataset.formatbar) ||
    (bar.nextElementSibling && (bar.nextElementSibling.matches(".wb-textarea") ? bar.nextElementSibling
      : bar.nextElementSibling.querySelector && bar.nextElementSibling.querySelector(".wb-textarea")));
  if (!ta) return;
  const WRAP = { bold: ["**", "**"], italic: ["*", "*"], underline: ["<u>", "</u>"], strike: ["~~", "~~"], highlight: ["==", "=="] };
  const PREFIX = { h1: "# ", h2: "## ", normal: "" };
  const wrap = (a, b) => {
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    ta.value = v.slice(0, s) + a + v.slice(s, e) + b + v.slice(e);
    ta.focus(); ta.setSelectionRange(s + a.length, e + a.length);
  };
  const linePrefix = (p) => {
    const s = ta.selectionStart, v = ta.value, ls = v.lastIndexOf("\n", s - 1) + 1;
    const rest = v.slice(ls).replace(/^#{1,6}\s*/, "");
    ta.value = v.slice(0, ls) + p + rest; ta.focus();
  };
  const clearFmt = () => {
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, hasSel = e > s;
    const target = hasSel ? v.slice(s, e) : v;
    const out = target.replace(/\*\*|__|~~|==|`|\*|_|<\/?u>/g, "").replace(/^#{1,6}\s*/gm, "");
    ta.value = hasSel ? v.slice(0, s) + out + v.slice(e) : out; ta.focus();
  };
  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".wb-toolbar__btn"); if (!btn) return;
    const cmd = btn.dataset.cmd; if (!cmd) return;
    if (WRAP[cmd]) wrap(WRAP[cmd][0], WRAP[cmd][1]);
    else if (cmd in PREFIX) linePrefix(PREFIX[cmd]);
    else if (cmd === "clear") clearFmt();
  });
  bar.querySelectorAll(".wb-swatch").forEach((sw) => sw.addEventListener("click", () => {
    const c = (getComputedStyle(sw).getPropertyValue("--wb-swatch-color") || sw.style.background || "").trim();
    if (c) bar.style.setProperty("--wb-hl-color", c);
    const dd = sw.closest(".wb-dropdown"); if (dd) dd.classList.remove("is-open");
  }));
}

/* ---- Sortable: flat drag-to-reorder for a list OR grid, with a dashed slot -
   The placeholder (.wb-sortable__ph) shows the empty target while dragging.
   In the app use dnd-kit; keep these classes for the look. --------------- */
function initSortable(list) {
  let dragged = null;
  const grid = list.classList.contains("wb-sortable--grid");
  const ph = document.createElement("div");
  ph.className = "wb-sortable__ph";

  list.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".wb-sortable__item");
    if (!item || !list.contains(item)) return;
    dragged = item;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", "item"); } catch (_) {}
    ph.style.height = item.offsetHeight + "px";
    ph.style.width = grid ? item.offsetWidth + "px" : "";
    setTimeout(() => item.classList.add("is-dragging"), 0);
  });

  list.addEventListener("dragover", (e) => {
    if (!dragged) return;
    e.preventDefault();
    const items = [...list.querySelectorAll(".wb-sortable__item:not(.is-dragging)")];
    let ref = null;
    if (!grid) {
      for (const el of items) {
        const b = el.getBoundingClientRect();
        if (e.clientY < b.top + b.height / 2) { ref = el; break; }
      }
    } else {
      let best = null, bestD = Infinity, after = false;
      for (const el of items) {
        const b = el.getBoundingClientRect();
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const d = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (d < bestD) {
          bestD = d; best = el;
          const sameRow = Math.abs(e.clientY - cy) < b.height * 0.6;
          after = sameRow ? e.clientX > cx : e.clientY > cy;
        }
      }
      if (best) ref = items[items.indexOf(best) + (after ? 1 : 0)] || null;
    }
    if (ref) list.insertBefore(ph, ref); else list.appendChild(ph);
  });

  list.addEventListener("drop", (e) => {
    if (!dragged) return;
    e.preventDefault();
    if (ph.parentNode) ph.parentNode.insertBefore(dragged, ph);
    cleanup();
  });
  list.addEventListener("dragend", cleanup);

  function cleanup() {
    if (dragged) dragged.classList.remove("is-dragging");
    if (ph.parentNode) ph.parentNode.removeChild(ph);
    dragged = null;
  }
}

/* ---- Slot grid: FIXED cells; drag an item onto ANY cell to place it there, and
   dropping on an occupied cell SWAPS the two. Empty cells persist, so gaps between
   items stay. In the app use dnd-kit with rectSwappingStrategy; keep these classes. */
function initSlotGrid(grid) {
  let dragged = null, from = null;
  const clearOver = () => grid.querySelectorAll(".wb-slotgrid__cell.is-over").forEach((c) => c.classList.remove("is-over"));

  grid.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".wb-slotgrid__item");
    if (!item || !grid.contains(item)) return;
    dragged = item; from = item.parentElement;          // the source cell
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", "item"); } catch (_) {}
    setTimeout(() => item.classList.add("is-dragging"), 0);
  });
  grid.addEventListener("dragover", (e) => {
    if (!dragged) return;
    e.preventDefault();
    const cell = e.target.closest(".wb-slotgrid__cell");
    clearOver();
    if (cell && cell !== from) cell.classList.add("is-over");   // highlight the target slot
  });
  grid.addEventListener("drop", (e) => {
    if (!dragged) return;
    e.preventDefault();
    const cell = e.target.closest(".wb-slotgrid__cell");
    if (cell && cell !== from) {
      const occupant = cell.querySelector(".wb-slotgrid__item");
      cell.appendChild(dragged);                        // move into the target slot
      if (occupant) from.appendChild(occupant);         // occupied → swap the two
    }
    cleanup();
  });
  grid.addEventListener("dragend", cleanup);

  function cleanup() {
    if (dragged) dragged.classList.remove("is-dragging");
    clearOver();
    dragged = null; from = null;
  }
}

/* ---- Sortable TABLE rows: drag whole <tr>s to reorder, dashed row target ---
   Put data-sortable-rows on the <tbody>; make each <tr> draggable. App → dnd-kit. */
function initSortableTable(tbody) {
  let dragged = null;
  const ph = document.createElement("tr");
  ph.className = "wb-row-ph";
  const cols = () => (tbody.querySelector("tr") ? tbody.querySelector("tr").children.length : 1);
  const sizePh = () => (ph.innerHTML = '<td colspan="' + cols() + '"><div class="wb-row-ph__inner"></div></td>');

  tbody.addEventListener("dragstart", (e) => {
    const tr = e.target.closest("tr");
    if (!tr || tr.classList.contains("wb-row-ph") || !tbody.contains(tr)) return;
    dragged = tr;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", "row"); } catch (_) {}
    sizePh();
    setTimeout(() => tr.classList.add("is-dragging"), 0);
  });
  tbody.addEventListener("dragover", (e) => {
    if (!dragged) return;
    e.preventDefault();
    const rows = [...tbody.querySelectorAll("tr:not(.is-dragging):not(.wb-row-ph)")];
    let ref = null;
    for (const el of rows) {
      const b = el.getBoundingClientRect();
      if (e.clientY < b.top + b.height / 2) { ref = el; break; }
    }
    if (ref) tbody.insertBefore(ph, ref); else tbody.appendChild(ph);
  });
  tbody.addEventListener("drop", (e) => {
    if (!dragged) return;
    e.preventDefault();
    if (ph.parentNode) ph.parentNode.insertBefore(dragged, ph);
    cleanup();
  });
  tbody.addEventListener("dragend", cleanup);
  function cleanup() {
    if (dragged) dragged.classList.remove("is-dragging");
    if (ph.parentNode) ph.parentNode.removeChild(ph);
    dragged = null;
  }
}

/* ---- Tree: expand/collapse + drag to reorder & reparent (unlimited depth) - */
function initTree(tree) {
  let dragged = null;

  tree.addEventListener("dragstart", (e) => {
    const row = e.target.closest(".wb-tree__row");
    if (!row) return;
    dragged = row.closest(".wb-tree__node");
    dragged.classList.add("is-dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", "node"); } catch (_) {}
  });

  tree.addEventListener("dragover", (e) => {
    if (!dragged) return;
    const row = e.target.closest(".wb-tree__row");
    if (!row) return;
    const node = row.closest(".wb-tree__node");
    if (node === dragged || dragged.contains(node)) return; // never into self/descendant
    e.preventDefault();
    clearDropMarks(tree);
    const r = row.getBoundingClientRect();
    const y = e.clientY - r.top;
    const zone = y < r.height * 0.3 ? "before" : y > r.height * 0.7 ? "after" : "inside";
    row.classList.add("is-drop-" + zone);
    row.dataset.dropZone = zone;
  });

  tree.addEventListener("drop", (e) => {
    if (!dragged) return;
    const row = e.target.closest(".wb-tree__row");
    if (!row) { cleanup(); return; }
    e.preventDefault();
    const node = row.closest(".wb-tree__node");
    const zone = row.dataset.dropZone || "after";
    if (node !== dragged && !dragged.contains(node)) {
      if (zone === "inside") {
        let ul = node.querySelector(":scope > .wb-tree__children");
        if (!ul) { ul = document.createElement("ul"); ul.className = "wb-tree__children"; node.appendChild(ul); }
        ul.appendChild(dragged);
        node.classList.remove("is-collapsed");
      } else if (zone === "before") {
        node.parentNode.insertBefore(dragged, node);
      } else {
        node.parentNode.insertBefore(dragged, node.nextSibling);
      }
    }
    cleanup();
    normalizeTree(tree);
  });

  tree.addEventListener("dragend", cleanup);

  function cleanup() {
    if (dragged) dragged.classList.remove("is-dragging");
    dragged = null;
    clearDropMarks(tree);
  }
}

function clearDropMarks(tree) {
  tree.querySelectorAll(".is-drop-before, .is-drop-after, .is-drop-inside").forEach((el) => {
    el.classList.remove("is-drop-before", "is-drop-after", "is-drop-inside");
    delete el.dataset.dropZone;
  });
}

/* Keep toggles/children consistent after a move (leaf ⇄ parent, drop empty lists). */
function normalizeTree(tree) {
  tree.querySelectorAll(".wb-tree__node").forEach((node) => {
    const ul = node.querySelector(":scope > .wb-tree__children");
    const has = ul && ul.querySelector(".wb-tree__node");
    const tog = node.querySelector(":scope > .wb-tree__row > .wb-tree__toggle");
    if (tog) tog.classList.toggle("is-leaf", !has);
    if (ul && !has) ul.remove();
  });
}

/* ---- Dual light/dark preview (isolated iframes) --------------------------- */
function renderDual(el) {
  const tpl = el.querySelector("template");
  if (!tpl) return;
  const snippet = tpl.innerHTML;
  const pad = el.dataset.pad || "20px";
  el.innerHTML = ["light", "dark"].map((t) => `
    <div class="dual__panel">
      <div class="dual__cap">${t === "light" ? "☀ Light mode" : "☾ Dark mode"}</div>
      <iframe class="dual__frame" data-theme="${t}" title="${t} preview"></iframe>
    </div>`).join("");
  el.querySelectorAll("iframe").forEach((f) => {
    const t = f.dataset.theme;
    f.addEventListener("load", () => {
      try {
        const r = f.contentDocument.documentElement;
        Object.keys(tweak).forEach((k) => { if (k.startsWith("--")) r.style.setProperty(k, tweak[k]); });
        const h = f.contentDocument.body.scrollHeight;
        if (h) f.style.height = h + "px";
      } catch (e) { /* ignore */ }
    });
    f.srcdoc =
      '<!doctype html><html class="' + (t === "dark" ? "dark" : "") + '"><head>' +
      '<meta charset="utf-8"><link rel="stylesheet" href="web-builder.css?v=' + (window.__v || "") + '">' +
      "<style>html,body{margin:0}body{padding:" + pad +
      ";background:var(--wb-canvas);color:var(--wb-fg);font-family:var(--wb-font)}</style>" +
      "</head><body>" + snippet + "</body></html>";
  });
}

/* ---- Token swatches ------------------------------------------------------- */
function renderSwatches(el) {
  const tokens = [
    ["--wb-surface", "surface"], ["--wb-canvas", "canvas"],
    ["--wb-fg", "fg"], ["--wb-fg-muted", "fg-muted"],
    ["--wb-border", "border"], ["--wb-gray-900", "gray-900"],
    ["--wb-neutral-weak", "neutral-weak"], ["--wb-neutral", "neutral"],
    ["--wb-neutral-strong", "neutral-strong"], ["--wb-neutral-ink", "neutral-ink"],
    ["--wb-success", "success"], ["--wb-danger", "danger"],
    ["--wb-warning", "warning"], ["--wb-info", "info"],
  ];
  const cs = getComputedStyle(document.documentElement);
  el.innerHTML = tokens.map(([v, name]) => {
    const val = cs.getPropertyValue(v).trim();
    return '<div class="swatch"><div class="swatch__chip" style="background:var(' + v +
      ');border-bottom:1px solid var(--wb-border)"></div>' +
      '<div class="swatch__meta"><div class="swatch__name">' + name +
      '</div><div class="swatch__val">' + val + "</div></div></div>";
  }).join("");
}

/* ---- Sticky-table demo fill ---------------------------------------------- */
function fillSticky(tbody) {
  const merchants = ["Grab", "Highlands", "Shopee", "WinMart", "Circle K",
    "Baemin", "Tiki", "Lazada", "GoJek", "The Coffee House"];
  let html = "";
  for (let i = 0; i < 14; i++) {
    const day = String(14 - (i % 14)).padStart(2, "0");
    const amt = ((Math.floor(50 + i * 37) % 900) + 50) * 1000;
    html += '<tr><td class="wb-cell-muted">' + day + "/07</td>" +
      '<td class="wb-cell-strong">' + merchants[i % merchants.length] + "</td>" +
      '<td class="wb-num wb-num--strong">−' + amt.toLocaleString("vi-VN") + " ₫</td></tr>";
  }
  tbody.innerHTML = html;
}

/* ---- Code copy (event delegation — works for injected content) ------------ */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const code = btn.parentElement.querySelector("code");
  if (!code) return;
  navigator.clipboard.writeText(code.innerText).then(() => {
    const prev = btn.textContent;
    btn.textContent = "Đã copy ✓";
    setTimeout(() => (btn.textContent = prev), 1200);
  });
});

/* ---- Templated segmented field (.wb-input-tpl) — keep digits only, auto-advance to
   the next segment when one fills, and jump back on Backspace in an empty segment.
   The " / " · " : " · " – " separators are real inked spans between the inputs. ---- */
function tplSegs(seg) { return [...seg.closest(".wb-input-tpl").querySelectorAll(".wb-input-tpl__seg")]; }
document.addEventListener("input", (e) => {
  const seg = e.target.closest && e.target.closest(".wb-input-tpl__seg");
  if (!seg) return;
  seg.value = seg.value.replace(/\D/g, "").slice(0, seg.maxLength);
  if (seg.value.length >= seg.maxLength) {
    const segs = tplSegs(seg);
    const next = segs[segs.indexOf(seg) + 1];
    if (next) { next.focus(); next.select && next.select(); }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Backspace") return;
  const seg = e.target.closest && e.target.closest(".wb-input-tpl__seg");
  if (!seg || seg.value) return;
  const segs = tplSegs(seg);
  const prev = segs[segs.indexOf(seg) - 1];
  if (prev) { e.preventDefault(); prev.focus(); prev.setSelectionRange(prev.value.length, prev.value.length); }
});

/* ---- Interactive demos (delegated, so injected pages just work) ----------- */
document.addEventListener("click", (e) => {
  /* BOC: collapse/expand a sidebar group (heading button, caret on the right). */
  const groupTog = e.target.closest("[data-group-toggle]");
  if (groupTog) {
    const collapsed = groupTog.closest(".doc-tree__group").classList.toggle("is-collapsed");
    groupTog.setAttribute("aria-expanded", String(!collapsed));
    return;
  }
  /* Sidebar toggle. On DESKTOP it collapses the panel (.is-side-hidden). On a small
     screen the panel is an off-canvas drawer, so the toggle OPENS it (.is-side-open)
     over a backdrop instead — otherwise a phone could never reveal the menu. */
  const sideTog = e.target.closest("[data-side-toggle]");
  if (sideTog) {
    const shell = document.querySelector(".doc-shell");
    const ico = sideTog.querySelector(".wb-ico");
    if (window.matchMedia("(max-width: 900px)").matches) {
      const open = shell.classList.toggle("is-side-open");
      if (ico) ico.textContent = open ? "menu_open" : "menu";
    } else {
      const hidden = shell.classList.toggle("is-side-hidden");
      if (ico) ico.textContent = hidden ? "menu" : "menu_open";
    }
    return;
  }
  /* Close the mobile drawer when a nav link is picked or the backdrop is tapped. */
  const shellOpen = document.querySelector(".doc-shell.is-side-open");
  if (shellOpen && (e.target.closest(".doc-tree__link") || !e.target.closest(".doc-side"))) {
    shellOpen.classList.remove("is-side-open");
    const stIco = document.querySelector("[data-side-toggle] .wb-ico");
    if (stIco) stIco.textContent = "menu";
  }

  /* Config: open the tweak drawer from an in-page button. */
  const cfgOpen = e.target.closest("[data-config-open]");
  if (cfgOpen) { document.getElementById("configDrawer").classList.add("is-open"); return; }

  /* Locked switch / checkbox / radio: block the change and shake the lock ("can't change
     this"), then let it settle. The input stays enabled, so we cancel the toggle here. */
  const lockedSw = e.target.closest(".wb-switch--locked, .wb-check--locked, .wb-radio--locked");
  if (lockedSw) {
    e.preventDefault();                 // cancel the checkbox toggle
    lockedSw.classList.remove("is-denied");
    void lockedSw.offsetWidth;          // reflow so the shake animation restarts
    lockedSw.classList.add("is-denied");
    clearTimeout(lockedSw._denyT);
    lockedSw._denyT = setTimeout(() => lockedSw.classList.remove("is-denied"), 450);
    return;
  }

  /* Tree: expand / collapse a node (works for every tree, draggable or not). */
  const treeTog = e.target.closest(".wb-tree__toggle");
  if (treeTog) { treeTog.closest(".wb-tree__node").classList.toggle("is-collapsed"); return; }

  /* Expandable menu row: toggle its nested sub-list open/closed. Handled BEFORE the
     dropdown-close below so the dropdown stays open while the sub expands. */
  const menuExp = e.target.closest(".wb-menu__item--expand");
  if (menuExp) {
    const grp = menuExp.closest(".wb-menu__group");
    if (grp) { grp.classList.toggle("is-open"); menuExp.setAttribute("aria-expanded", String(grp.classList.contains("is-open"))); return; }
  }

  /* Responsive app-bar: the hamburger toggles the collapsed nav dropdown; picking a
     link inside it closes the menu again. */
  const nbTog = e.target.closest("[data-navbar-toggle]");
  if (nbTog) {
    const menu = nbTog.closest(".wb-navbar") && nbTog.closest(".wb-navbar").querySelector(".wb-navbar__menu");
    if (menu) { nbTog.setAttribute("aria-expanded", String(menu.classList.toggle("is-open"))); }
    return;
  }
  const nbLink = e.target.closest(".wb-navbar__menu .wb-nav__link");
  if (nbLink) { const m = nbLink.closest(".wb-navbar__menu"); if (m) m.classList.remove("is-open"); }

  /* Dropdown: toggle nearest .wb-dropdown; close others. */
  const ddToggle = e.target.closest("[data-dd-toggle]");
  document.querySelectorAll(".wb-dropdown.is-open").forEach((d) => {
    if (!ddToggle || d !== ddToggle.closest(".wb-dropdown")) d.classList.remove("is-open");
  });
  if (ddToggle) { ddToggle.closest(".wb-dropdown").classList.toggle("is-open"); return; }

  /* Popover: click-toggled floating card. Close every open popover except the one
     being toggled or the one whose panel was clicked (so buttons inside it work);
     the × and any outside click close it. */
  const popToggle = e.target.closest("[data-pop-toggle]");
  const popPanel  = e.target.closest(".wb-popover__panel");
  const popClose  = e.target.closest(".wb-popover__panel .wb-close");
  document.querySelectorAll(".wb-popover.is-open").forEach((p) => {
    const keep = (popToggle && p === popToggle.closest(".wb-popover")) ||
                 (popPanel && !popClose && p === popPanel.closest(".wb-popover"));
    if (!keep) p.classList.remove("is-open");
  });
  if (popToggle) {
    const pop = popToggle.closest(".wb-popover");
    const opened = pop.classList.toggle("is-open");
    /* Seed the hosted picker from the field, then centre any time picker on its selection. */
    if (opened) { syncFieldToPicker(pop); pop.querySelectorAll("[data-timepicker]").forEach((tp) => tp._tpCenter && tp._tpCenter()); }
    return;
  }
  if (popPanel) return;   // a click inside the card (not ×) — leave it open

  /* Collapse: toggle the nearest show/hide region. */
  const colToggle = e.target.closest("[data-collapse-toggle]");
  if (colToggle) { colToggle.closest(".wb-collapse").classList.toggle("is-open"); return; }

  /* Modal: open / close. */
  const open = e.target.closest("[data-modal-open]");
  if (open) { const m = document.querySelector(open.getAttribute("data-modal-open"));
    if (m) m.classList.add("is-open"); return; }
  if (e.target.closest("[data-modal-close]") ||
      (e.target.classList && e.target.classList.contains("wb-overlay"))) {
    const ov = e.target.closest(".wb-overlay");
    if (ov) ov.classList.remove("is-open");
    return;
  }

  /* Toast: spawn a transient toast. */
  const toastBtn = e.target.closest("[data-toast]");
  if (toastBtn) { spawnToast(toastBtn.dataset); return; }

  /* Tabs: activate clicked tab + its panel inside the [data-tabs] group. */
  const tab = e.target.closest(".wb-tab");
  if (tab && tab.dataset.tab) {
    const group = tab.closest("[data-tabs]");
    if (group) {
      group.querySelectorAll(".wb-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      group.querySelectorAll("[data-panel]").forEach((p) =>
        (p.hidden = p.dataset.panel !== tab.dataset.tab));
    }
  }
});

function spawnToast(d) {
  let toaster = document.querySelector(".wb-toaster");
  if (!toaster) { toaster = document.createElement("div"); toaster.className = "wb-toaster";
    document.body.appendChild(toaster); }
  const tone = d.toast || "info";
  const icons = { success: "check", warning: "priority_high", danger: "close", info: "info" };
  const el = document.createElement("div");
  el.className = "wb-toast wb-toast--" + tone;
  el.innerHTML =
    '<span class="wb-toast__icon"><span class="wb-ico wb-ico--xs">' + (icons[tone] || "info") + "</span></span>" +
    '<div class="wb-toast__body"><p class="wb-toast__title">' + (d.title || "Thông báo") +
    '</p><p class="wb-toast__msg">' + (d.msg || "") + "</p></div>" +
    '<button class="wb-close" aria-label="Đóng"></button>';
  el.querySelector(".wb-close").addEventListener("click", () => el.remove());
  toaster.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ---- Config / tweak drawer -------------------------------------------------
   A slide-out panel that fine-tunes docs-facing tokens live, then exports a .md
   the user hands to an AI (or applies by hand). It ONLY sets CSS variables on the
   docs root — it never edits web-builder.css, so the shipped primitives are untouched. */
const CONFIG_GROUPS = [
  { title: "Kiểu góc (bo góc)", rows: [
    { k: "corner-preset", label: "Kiểu góc", type: "corner",
      options: [["", "Bo tròn (mặc định)"], ["sharp", "Vuông sắc (0)"], ["soft", "Bo nhiều"]] },
    { k: "--wb-radius-sm", label: "Radius nhỏ", type: "range", min: 0, max: 16, step: 1, unit: "px" },
    { k: "--wb-radius", label: "Radius vừa", type: "range", min: 0, max: 22, step: 1, unit: "px" },
    { k: "--wb-radius-lg", label: "Radius lớn", type: "range", min: 0, max: 28, step: 1, unit: "px" },
    { k: "--wb-btn-radius", label: "Radius nút", type: "range", min: 0, max: 22, step: 1, unit: "px" },
    { k: "--wb-card-radius", label: "Radius card", type: "range", min: 0, max: 28, step: 1, unit: "px" },
    { k: "--wb-input-radius", label: "Radius input", type: "range", min: 0, max: 22, step: 1, unit: "px" },
    { k: "--wb-switch-radius", label: "Bo switch (rãnh)", type: "range", min: 0, max: 12, step: 1, unit: "px" },
    { k: "--wb-switch-thumb-radius", label: "Bo núm switch", type: "range", min: 0, max: 10, step: 1, unit: "px" },
    { k: "--wb-range-radius", label: "Bo thanh slider", type: "range", min: 0, max: 8, step: 1, unit: "px" },
    { k: "--wb-range-thumb-radius", label: "Bo núm slider", type: "range", min: 0, max: 9, step: 1, unit: "px" },
    { k: "--wb-check-radius", label: "Bo checkbox", type: "range", min: 0, max: 10, step: 1, unit: "px" },
  ]},
  { title: "Viền", rows: [
    { k: "--wb-bw", label: "Độ dày viền", type: "range", min: 0, max: 3, step: 1, unit: "px" },
    { k: "--wb-check-bw", label: "Viền checkbox", type: "range", min: 1, max: 4, step: 1, unit: "px" },
    { k: "--wb-border", label: "Màu viền", type: "color" },
    { k: "--wb-border-strong", label: "Màu viền đậm", type: "color" },
  ]},
  { title: "Đổ bóng", rows: [
    { k: "--wb-shadow-sm", label: "Đổ bóng component", type: "shadow" },
  ]},
  { title: "Màu nền & chữ", rows: [
    { k: "--wb-canvas", label: "Canvas (nền ngoài)", type: "color" },
    { k: "--wb-surface", label: "Surface (thẻ)", type: "color" },
    { k: "--wb-surface-2", label: "Surface phụ", type: "color" },
    { k: "--wb-fg", label: "Chữ chính", type: "color" },
    { k: "--wb-fg-muted", label: "Chữ phụ", type: "color" },
    { k: "--wb-fg-subtle", label: "Chữ mờ", type: "color" },
  ]},
  { title: "Màu trạng thái", rows: [
    { k: "--wb-success", label: "Success", type: "color" },
    { k: "--wb-danger", label: "Danger", type: "color" },
    { k: "--wb-warning", label: "Warning", type: "color" },
    { k: "--wb-info", label: "Info", type: "color" },
  ]},
  { title: "Chữ & icon", rows: [
    { k: "--wb-font", label: "Font", type: "font" },
    { k: "--wb-ico-size", label: "Cỡ icon", type: "range", min: 14, max: 28, step: 1, unit: "px" },
    { k: "--wb-ico-weight", label: "Độ đậm icon", type: "range", min: 300, max: 700, step: 100 },
  ]},
  { title: "Biểu đồ", rows: [
    { k: "chart-scheme", label: "Thang màu", type: "select",
      options: [["", "Đa sắc"], ["mono", "Thang xám"], ["blue", "Một tông xanh"]] },
    { k: "--wb-chart-income", label: "Màu Thu", type: "color" },
    { k: "--wb-chart-expense", label: "Màu Chi", type: "color" },
  ]},
  { title: "Chỉ trong docs", rows: [
    { k: "--wb-demo-bw", label: "Viền sample", type: "range", min: 0, max: 3, step: 1, unit: "px" },
    { k: "--wb-demo-shadow", label: "Đổ bóng sample", type: "shadow" },
    { k: "--wb-doc-divider", label: "Màu divider", type: "color" },
  ]},
];
const FONT_OPTIONS = [
  ["", "Hệ thống (mặc định)"],
  ["Inter, sans-serif", "Inter"],
  ['"Plus Jakarta Sans", sans-serif', "Plus Jakarta Sans"],
  ['"IBM Plex Sans", sans-serif', "IBM Plex Sans"],
  ["Manrope, sans-serif", "Manrope"],
  ['"DM Sans", sans-serif', "DM Sans"],
  ['"Public Sans", sans-serif', "Public Sans"],
  ["Lexend, sans-serif", "Lexend"],
  ['"Space Grotesk", sans-serif', "Space Grotesk"],
  ["Roboto, sans-serif", "Roboto"],
  ['"Source Sans 3", sans-serif', "Source Sans 3"],
];
const SHADOW_PRESETS = {
  none: "none",
  soft: "0 1px 2px rgba(16,17,18,.05), 0 1px 3px rgba(16,17,18,.04)",
  medium: "0 2px 4px rgba(16,17,18,.05), 0 6px 16px rgba(16,17,18,.08)",
};
/* Every radius token the corner presets touch (incl. the controls we just tokenised). */
const RADIUS_KEYS = ["--wb-radius-sm", "--wb-radius", "--wb-radius-lg", "--wb-radius-pill",
  "--wb-btn-radius", "--wb-card-radius", "--wb-input-radius",
  "--wb-switch-radius", "--wb-switch-thumb-radius", "--wb-check-radius",
  "--wb-range-radius", "--wb-range-thumb-radius"];
const CORNER_PRESETS = {
  sharp: { "--wb-radius-sm": "0px", "--wb-radius": "0px", "--wb-radius-lg": "0px", "--wb-radius-pill": "0px",
    "--wb-btn-radius": "0px", "--wb-card-radius": "0px", "--wb-input-radius": "0px",
    "--wb-switch-radius": "0px", "--wb-switch-thumb-radius": "0px", "--wb-check-radius": "0px",
    "--wb-range-radius": "0px", "--wb-range-thumb-radius": "0px" },
  soft: { "--wb-radius-sm": "10px", "--wb-radius": "16px", "--wb-radius-lg": "22px",
    "--wb-btn-radius": "12px", "--wb-card-radius": "20px", "--wb-input-radius": "12px",
    "--wb-check-radius": "7px" },
};
const CONFIG_DEFAULTS = {
  "--wb-ico-size": 20, "--wb-ico-weight": 600,
  "--wb-radius-sm": 6, "--wb-radius": 10, "--wb-radius-lg": 14,
  "--wb-btn-radius": 6, "--wb-card-radius": 14, "--wb-input-radius": 6,
  "--wb-switch-radius": 12, "--wb-switch-thumb-radius": 10,
  "--wb-range-radius": 6, "--wb-range-thumb-radius": 9, "--wb-check-radius": 6,
  "--wb-bw": 1, "--wb-check-bw": 2, "--wb-demo-bw": 1,
};
const tweak = {};   /* var/key -> value the user has overridden this session */

function rgbToHex(rgb) {
  const m = String(rgb).match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, "0")).join("");
}
function resolveColor(k) {
  const probe = document.createElement("span");
  probe.style.cssText = "display:none;color:var(" + k + ")";
  document.body.appendChild(probe);
  const hex = rgbToHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}
function setVar(k, v) { tweak[k] = v; document.documentElement.style.setProperty(k, v); }

/* Push current tweaks into each isolated light/dark preview iframe — CSS custom
   properties don't cross the iframe boundary, so we mirror them by hand. */
function mirrorToFrames() {
  document.querySelectorAll(".dual iframe").forEach((f) => {
    let r; try { r = f.contentDocument && f.contentDocument.documentElement; } catch (e) { return; }
    if (!r) return;
    Object.keys(tweak).forEach((k) => { if (k.startsWith("--")) r.style.setProperty(k, tweak[k]); });
  });
}
/* Re-read token swatches so their printed values don't go stale after a tweak. */
function refreshSwatches() { document.querySelectorAll("[data-swatches]").forEach(renderSwatches); }
/* Reflect current radius values back onto the panel's radius sliders. */
function syncRadiusSliders() {
  document.querySelectorAll('.doc-config__body input[data-type="range"]').forEach((el) => {
    const k = el.dataset.k;
    if (!k || k.indexOf("radius") === -1) return;
    let v = tweak[k]; if (v == null) v = CONFIG_DEFAULTS[k];
    v = parseInt(v, 10); if (isNaN(v)) v = 0;
    el.value = v;
    const o = el.parentNode.querySelector(".doc-config__out");
    if (o) o.textContent = v + (el.dataset.unit || "");
  });
}
/* Corner-style preset: clear every radius override, then apply the chosen preset map. */
function applyCorner(preset) {
  RADIUS_KEYS.forEach((k) => { delete tweak[k]; document.documentElement.style.removeProperty(k); });
  const map = CORNER_PRESETS[preset];
  if (map) Object.keys(map).forEach((k) => setVar(k, map[k]));
  tweak["corner-preset"] = preset;
  syncRadiusSliders();
}

/* A dogfooded select: the real .wb-select (appearance:none + overlaid chevron),
   so the panel's dropdowns match the Select component in the docs. */
function selectCtrl(dataK, dataType, optionsHtml) {
  return '<span class="wb-select-wrap"><select class="wb-select" data-k="' + dataK + '" data-type="' + dataType + '">' +
    optionsHtml + '</select><span class="wb-ico" aria-hidden="true">expand_more</span></span>';
}
function opts(list, quote) {
  const q = quote || '"';
  return list.map((o) => '<option value=' + q + o[0] + q + '>' + o[1] + "</option>").join("");
}
function renderConfigRow(r) {
  let ctrl = "";
  if (r.type === "range") {
    const v = CONFIG_DEFAULTS[r.k];
    ctrl = '<input type="range" class="wb-range wb-range--sm" data-k="' + r.k + '" data-type="range" data-unit="' + (r.unit || "") +
      '" min="' + r.min + '" max="' + r.max + '" step="' + r.step + '" value="' + v + '">' +
      '<output class="doc-config__out">' + v + (r.unit || "") + "</output>";
  } else if (r.type === "color") {
    const cur = resolveColor(r.k);
    const seed = cur.charAt(0) === "#" ? cur.slice(1).toUpperCase() : cur;
    ctrl =
      '<span class="wb-popover wb-popover--left doc-config__color">' +
        '<button type="button" class="doc-config__swatch" data-pop-toggle aria-label="Chọn màu ' + r.label + '" style="background:' + cur + '"></button>' +
        '<div class="wb-popover__panel">' +
          '<div class="wb-popover__arrow"></div>' +
          '<div class="wb-colorpicker" data-colorpicker data-k="' + r.k + '" data-type="color">' +
            '<div class="wb-colorpicker__area"><span class="wb-colorpicker__thumb"></span></div>' +
            '<div class="wb-colorpicker__hue"><span class="wb-colorpicker__thumb"></span></div>' +
            '<div class="wb-colorpicker__foot"><span class="wb-colorpicker__preview"></span>' +
              '<div class="wb-input-group"><span class="wb-input-group__addon">#</span>' +
              '<input class="wb-input" data-cp-hex value="' + seed + '" spellcheck="false" aria-label="Mã màu hex"></div>' +
            '</div>' +
            '<div class="wb-swatches wb-swatches--sm" role="group" aria-label="Màu gợi ý">' +
              [1, 2, 3, 4, 5, 6, 8].map(function (n) { return '<button type="button" class="wb-swatch" style="--wb-swatch-color:var(--wb-chart-' + n + ')"></button>'; }).join("") +
            '</div>' +
          '</div>' +
        '</div>' +
      '</span>';
  } else if (r.type === "font") {
    ctrl = selectCtrl("--wb-font", "raw", opts(FONT_OPTIONS, "'"));
  } else if (r.type === "shadow") {
    ctrl = selectCtrl(r.k, "shadow",
      '<option value="soft">Nhẹ</option><option value="medium">Vừa</option><option value="none">Tắt</option>');
  } else if (r.type === "select") {
    ctrl = selectCtrl(r.k, r.k === "chart-scheme" ? "scheme" : "raw", opts(r.options));
  } else if (r.type === "corner") {
    ctrl = selectCtrl("corner-preset", "corner", opts(r.options));
  }
  const rowTag = r.type === "color" ? "div" : "label";
  return "<" + rowTag + ' class="doc-config__row"><span class="doc-config__label">' + r.label + "</span>" + ctrl + "</" + rowTag + ">";
}
function renderConfigGroup(g) {
  return '<div class="doc-config__group"><div class="doc-config__gtitle">' + g.title + "</div>" +
    g.rows.map(renderConfigRow).join("") + "</div>";
}
function onConfigInput(e) {
  const el = e.target, k = el.dataset.k, type = el.dataset.type;
  if (!k) return;
  if (type === "range") {
    const val = el.value + (el.dataset.unit || "");
    setVar(k, val);
    const out = el.parentNode.querySelector(".doc-config__out");
    if (out) out.textContent = val;
  } else if (type === "color") {
    const val = el.style.getPropertyValue("--wb-cp-value").trim();
    if (val) setVar(k, val);
    const sw = el.closest(".wb-popover") && el.closest(".wb-popover").querySelector(".doc-config__swatch");
    if (sw && val) sw.style.background = val;
  } else if (type === "raw") {
    if (el.value) setVar(k, el.value);
    else { delete tweak[k]; document.documentElement.style.removeProperty(k); }
  } else if (type === "shadow") {
    setVar(k, SHADOW_PRESETS[el.value] || "none");
  } else if (type === "scheme") {
    const r = document.documentElement;
    r.classList.remove("wb-chart-scheme--mono", "wb-chart-scheme--blue");
    if (el.value) r.classList.add("wb-chart-scheme--" + el.value);
    tweak["chart-scheme"] = el.value;
  } else if (type === "corner") {
    applyCorner(el.value);
  }
  mirrorToFrames();
  refreshSwatches();
}
function exportConfig() {
  const keys = Object.keys(tweak).filter((k) => k.startsWith("--"));
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const L = ["# Web Builder — tinh chỉnh (tweak) tokens", ""];
  if (!keys.length && !tweak["chart-scheme"]) {
    L.push("_Chưa chỉnh gì._");
  } else {
    L.push("Dán khối này vào `:root` trong `web-builder.css` (hoặc đưa cho AI để cập nhật source):", "");
    L.push("```css", (theme === "dark" ? ".dark {" : ":root {"));
    keys.forEach((k) => L.push("  " + k + ": " + tweak[k] + ";"));
    L.push("}", "```", "");
    if (tweak["chart-scheme"]) L.push("- Thang màu biểu đồ: **" + tweak["chart-scheme"] +
      "** → thêm class `.wb-chart-scheme--" + tweak["chart-scheme"] + "` lên wrapper của chart.", "");
    L.push("> Màu ở trên áp dụng cho theme **" + theme + "**. Muốn chỉnh theme còn lại: đổi theme rồi xuất tiếp.");
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([L.join("\n")], { type: "text/markdown" }));
  a.download = "web-builder-tweaks.md";
  a.click();
  URL.revokeObjectURL(a.href);
}
function resetConfig() {
  Object.keys(tweak).forEach((k) => { if (k.startsWith("--")) document.documentElement.style.removeProperty(k); });
  document.documentElement.classList.remove("wb-chart-scheme--mono", "wb-chart-scheme--blue");
  Object.keys(tweak).forEach((k) => delete tweak[k]);
  document.querySelectorAll(".doc-config__body [data-k]").forEach((el) => {
    const k = el.dataset.k, type = el.dataset.type;
    if (type === "range") {
      el.value = CONFIG_DEFAULTS[k];
      const o = el.parentNode.querySelector(".doc-config__out");
      if (o) o.textContent = CONFIG_DEFAULTS[k] + (el.dataset.unit || "");
    } else if (type === "color") {
      const c = resolveColor(k);
      if (el._cpSet) el._cpSet(c, true);
      const sw = el.closest(".wb-popover") && el.closest(".wb-popover").querySelector(".doc-config__swatch");
      if (sw) sw.style.background = c;
    }
    else { el.selectedIndex = 0; }
  });
  mirrorToFrames();
  refreshSwatches();
}
function initConfig() {
  const drawer = document.getElementById("configDrawer");
  if (!drawer || drawer.dataset.ready) return;
  drawer.dataset.ready = "1";
  const body = drawer.querySelector(".doc-config__body");
  body.innerHTML = CONFIG_GROUPS.map(renderConfigGroup).join("");
  body.addEventListener("input", onConfigInput);
  body.addEventListener("change", onConfigInput);
  body.addEventListener("wb-cp-input", onConfigInput);
  body.querySelectorAll("[data-colorpicker]").forEach(initColorPicker);
  drawer.querySelector("[data-config-export]").addEventListener("click", exportConfig);
  drawer.querySelector("[data-config-reset]").addEventListener("click", resetConfig);
  drawer.querySelector("[data-config-close]").addEventListener("click", () => drawer.classList.remove("is-open"));
}

/* ---- Theme: cycle System → Light → Dark (System follows the OS) ------------ */
const root = document.documentElement;
const themeMQ = window.matchMedia("(prefers-color-scheme: dark)");
function themeMode() { return localStorage.getItem("wb-theme") || "system"; }
function applyTheme(mode) {
  root.classList.toggle("dark", mode === "dark" || (mode === "system" && themeMQ.matches));
}
function applyThemeLabel() {
  const map = { system: ["◐", "Tự động"], light: ["☀", "Sáng"], dark: ["☾", "Tối"] };
  const [icon, label] = map[themeMode()] || map.system;
  document.getElementById("themeIcon").textContent = icon;
  document.getElementById("themeLabel").textContent = label;
}
function setTheme(mode) {
  localStorage.setItem("wb-theme", mode);
  applyTheme(mode);
  applyThemeLabel();
}
function cycleTheme() {
  const next = { system: "light", light: "dark", dark: "system" };
  setTheme(next[themeMode()] || "light");
}
/* In System mode, track OS light/dark changes live. */
themeMQ.addEventListener("change", () => { if (themeMode() === "system") applyTheme("system"); });

/* ---- Search: full-text over every page (docs-only). The index is built lazily on
   first open and cached; matching is a case-insensitive substring (label first,
   then body). A command-palette dialog: ↑/↓ move the highlighted row, ↵ opens it. */
let SEARCH_INDEX = null, searchBuilding = null;
let searchHits = [], searchActive = 0;                 // current results + highlighted row
const GROUP_OF = {};                                   // page id → its NAV group label
NAV.forEach((g) => g.items.forEach((it) => { GROUP_OF[it.id] = g.group; }));

function sEsc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function pageText(html) {
  const d = document.createElement("div");
  d.innerHTML = html;
  d.querySelectorAll("script, style").forEach((n) => n.remove());
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}
function buildSearchIndex() {
  if (SEARCH_INDEX || searchBuilding) return;
  const items = NAV.flatMap((g) => g.items).filter((it) => !it.coming);
  searchBuilding = Promise.all(items.map((it) =>
    fetch("pages/" + it.id + ".html", { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((html) => ({ id: it.id, label: it.label, text: pageText(html) }))
      .catch(() => ({ id: it.id, label: it.label, text: "" }))
  )).then((idx) => { SEARCH_INDEX = idx; renderSearch(document.getElementById("searchInput").value); });
}
function searchSnippet(text, i, len) {
  if (i < 0) return sEsc(text.slice(0, 120)) + (text.length > 120 ? "…" : "");
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + sEsc(text.slice(start, i)) +
    '<mark class="doc-search__hl">' + sEsc(text.slice(i, i + len)) + "</mark>" +
    sEsc(text.slice(i + len, i + len + 96)) + (text.length > i + len + 96 ? "…" : "");
}
function searchHint(icon, html) {
  return '<p class="doc-search__hint"><span class="wb-ico" aria-hidden="true">' + icon + "</span><span>" + html + "</span></p>";
}
function setSearchCount(txt) { const c = document.getElementById("searchCount"); if (c) c.textContent = txt || ""; }
function renderSearch(q) {
  const box = document.getElementById("searchResults");
  q = (q || "").trim();
  searchHits = []; searchActive = 0;
  if (!SEARCH_INDEX) { box.innerHTML = searchHint("hourglass_empty", "Đang lập chỉ mục…"); setSearchCount(""); return; }
  if (!q) { box.innerHTML = searchHint("search", "Gõ để tìm trong <b>tiêu đề</b> và <b>nội dung</b> mọi trang."); setSearchCount(""); return; }
  const ql = q.toLowerCase();
  for (const p of SEARCH_INDEX) {
    const inLabel = p.label.toLowerCase().includes(ql);
    const i = p.text.toLowerCase().indexOf(ql);
    if (inLabel || i >= 0) searchHits.push({ p, i, inLabel });
  }
  searchHits.sort((a, b) => (b.inLabel - a.inLabel) || (a.i - b.i));
  if (!searchHits.length) { box.innerHTML = searchHint("search_off", "Không thấy kết quả cho “<b>" + sEsc(q) + "</b>”."); setSearchCount("0 kết quả"); return; }
  box.innerHTML = searchHits.map(({ p, i }, idx) =>
    '<a class="doc-search__hit' + (idx === 0 ? " is-active" : "") + '" href="#/' + p.id + '" role="option" data-search-go data-idx="' + idx + '"' + (idx === 0 ? ' aria-selected="true"' : "") + ">" +
      '<span class="wb-ico doc-search__hit-ico" aria-hidden="true">description</span>' +
      '<span class="doc-search__hit-main">' +
        '<span class="doc-search__hit-titlerow">' +
          '<span class="doc-search__hit-title">' + sEsc(p.label) + "</span>" +
          '<span class="doc-search__hit-group">' + sEsc(GROUP_OF[p.id] || "") + "</span>" +
          '<span class="doc-search__hit-enter" aria-hidden="true">↵</span>' +
        "</span>" +
        '<span class="doc-search__hit-snip">' + searchSnippet(p.text, i, q.length) + "</span>" +
      "</span>" +
    "</a>").join("");
  setSearchCount(searchHits.length + " kết quả");
}
function searchRows() { return document.querySelectorAll("#searchResults .doc-search__hit"); }
function setActiveHit(idx, scroll) {
  const rows = searchRows();
  if (!rows.length) return;
  searchActive = (idx + rows.length) % rows.length;    // wrap top ⇄ bottom
  rows.forEach((r, k) => {
    const on = k === searchActive;
    r.classList.toggle("is-active", on);
    if (on) { r.setAttribute("aria-selected", "true"); if (scroll) r.scrollIntoView({ block: "nearest" }); }
    else r.removeAttribute("aria-selected");
  });
}
function openSearch() {
  document.getElementById("searchModal").classList.add("is-open");
  buildSearchIndex();
  const inp = document.getElementById("searchInput");
  renderSearch(inp.value);
  setTimeout(() => { inp.focus(); inp.select(); }, 30);
}
function closeSearch() { document.getElementById("searchModal").classList.remove("is-open"); }

/* ---- Boot ----------------------------------------------------------------- */
renderNav();
applyTheme(themeMode());
applyThemeLabel();
initConfig();
document.getElementById("themeBtn").addEventListener("click", cycleTheme);
/* Any .wb-theme-toggle inside a demo (e.g. the navbar's) flips light ⇄ dark. */
document.addEventListener("click", (e) => {
  if (e.target.closest(".wb-theme-toggle")) setTheme(root.classList.contains("dark") ? "light" : "dark");
});
/* Search: button + ⌘K / "/" to open, Esc to close; ↑/↓ move, ↵ opens; click navigates. */
document.getElementById("searchBtn").addEventListener("click", openSearch);
const searchInputEl = document.getElementById("searchInput");
searchInputEl.addEventListener("input", (e) => renderSearch(e.target.value));
searchInputEl.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); setActiveHit(searchActive + 1, true); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setActiveHit(searchActive - 1, true); }
  else if (e.key === "Enter") {
    const row = searchRows()[searchActive];
    if (row) { e.preventDefault(); location.hash = row.getAttribute("href"); closeSearch(); }
  }
});
const searchResultsEl = document.getElementById("searchResults");
searchResultsEl.addEventListener("click", (e) => { if (e.target.closest("[data-search-go]")) closeSearch(); });
searchResultsEl.addEventListener("mousemove", (e) => {
  const hit = e.target.closest(".doc-search__hit");   // keep keyboard + mouse selection in sync
  if (hit && hit.dataset.idx && +hit.dataset.idx !== searchActive) setActiveHit(+hit.dataset.idx, false);
});
document.addEventListener("keydown", (e) => {
  if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
  else if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) && !(document.activeElement && document.activeElement.isContentEditable)) { e.preventDefault(); openSearch(); }
  else if (e.key === "Escape") closeSearch();
});
const cfgBtn = document.getElementById("configBtn");
if (cfgBtn) cfgBtn.addEventListener("click", () =>
  document.getElementById("configDrawer").classList.toggle("is-open"));
window.addEventListener("hashchange", loadRoute);
loadRoute();
