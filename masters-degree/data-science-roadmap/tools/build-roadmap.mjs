#!/usr/bin/env node
/* build-roadmap.mjs — SINH trang roadmap.html (bản học nhanh, style khác) từ NGUỒN SỰ THẬT.
 *
 * Vì sao trang này được SINH chứ không viết tay: CLAUDE.md §2 luật 3 — "không thêm file thứ
 * hai chứa nội dung bài học". roadmap.html là một VIEW phái sinh (như TOC.md): cấu trúc 84
 * bài / 11 chặng + payoff + tiêu chí đạt đọc thẳng từ data-science-roadmap.html, còn bản
 * TÓM TẮT tinh gọn của mỗi bài nằm trong tools/roadmap-summaries.json (dữ liệu, sinh bằng
 * workflow tóm tắt). Nội dung đầy đủ vẫn CHỈ ở trang chính; mỗi node trỏ ngược `#/id`.
 *
 * Chạy:  node tools/build-roadmap.mjs
 * Sinh lại summaries khi nội dung chính đổi: chạy workflow ds-roadmap-summaries rồi lưu vào
 * tools/roadmap-summaries.json, rồi chạy lại lệnh này.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readPage } from './read-html.mjs';

const DIR  = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, '..');
const HTML = join(ROOT, 'data-science-roadmap.html');
const SUMS = join(DIR, 'roadmap-summaries.json');
const OUT  = join(ROOT, 'roadmap.html');

const P = readPage(HTML);
const sums = existsSync(SUMS) ? JSON.parse(readFileSync(SUMS, 'utf8')).summaries || JSON.parse(readFileSync(SUMS, 'utf8')) : {};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// payoff/accept.v giữ vài thẻ inline (<code>, <b>) từ nguồn — cho phép qua, nhưng bọc an toàn
const inlineOk = s => String(s == null ? '' : s);
const fmtMin = m => m < 60 ? m + '′' : (m % 60 ? `${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}` : `${Math.floor(m/60)}h`);
const star = t => /^★\s*/.test(t);
const clean = t => t.replace(/^★\s*/, '');
const phaseNo = t => (t.match(/^(\d+)/) || [,'?'])[1];
const phaseName = t => t.replace(/^\d+\s*·\s*/, '').replace(/ [—(].*$/, '');
const PRI = { core: ['Bắt buộc', 'core'], good: ['Nên biết', 'good'], skim: ['Định vị', 'skim'] };

const totalMin = P.sumMins(P.LEAVES);

/* ---- DATA nhúng vào trang (để JS dựng drawer) ---- */
const DATA = P.TREE.map(ph => ({
  id: ph.id, no: phaseNo(ph.t), name: phaseName(ph.t),
  outcome: strip(P.PHASE_OUTCOME?.[ph.id] || ''),
  lessons: ph.kids.map(k => {
    const s = sums[k.id] || null;
    return {
      id: k.id, t: clean(k.t), star: star(k.t), pri: k.p, mins: P.mins(k),
      max: k.d > 0 ? 3 : (k.x > 0 ? 2 : 1),
      fast: P.FAST.has(k.id), week: P.weekOf[k.id] || null,
      payoff: P.PAYOFF[k.id] ? P.PAYOFF[k.id].map(strip) : null,
      accept: (P.ACCEPT[k.id] || []).map(a => ({ k: a.k, v: inlineOk(a.v) })),
      tldr: s?.tldr || (P.PAYOFF[k.id] ? strip(P.PAYOFF[k.id][0]) : ''),
      points: s?.points || [],
      viz: s?.viz || '',
    };
  }),
}));

function strip(h) {
  return String(h || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

const nSum = Object.keys(sums).length;

/* ---- render các node trên đường đi ---- */
const levelsHtml = DATA.map((ph, pi) => {
  const nodes = ph.lessons.map((l, li) => {
    const side = li % 2 === 0 ? 'l' : 'r';
    const s = l.star ? '<span class="wb-ico rm-node__star" aria-hidden="true">star</span>' : '';
    return `<button class="rm-node rm-node--${side} rm-pri-${l.pri}" data-id="${esc(l.id)}" type="button"
        aria-label="Mở tóm tắt: ${esc(l.t)}">
      <span class="rm-node__dot">${s || `<span class="rm-node__i">${li + 1}</span>`}</span>
      <span class="rm-node__label"><span class="rm-node__t">${esc(l.t)}</span>
        <span class="rm-node__m">${fmtMin(l.mins)}${l.fast ? ' · 14d' : ''}</span></span>
    </button>`;
  }).join('\n');
  return `<section class="rm-level" id="lvl-${esc(ph.id)}">
    <header class="rm-levelhead">
      <span class="rm-levelhead__no">${esc(ph.no)}</span>
      <span class="rm-levelhead__x">
        <span class="rm-levelhead__name">${esc(ph.name)}</span>
        <span class="rm-levelhead__out">${esc(ph.outcome)}</span>
      </span>
      <span class="rm-levelhead__n">${ph.lessons.length} bước</span>
    </header>
    <div class="rm-nodes">${nodes}</div>
  </section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap · Data Science</title>
<meta name="description" content="Bản đồ học nhanh Data Science — 84 bước qua 11 chặng, bấm mỗi bước để xem tóm tắt tinh gọn (kiến thức lõi + ví dụ), mở bài đầy đủ ở trang chính.">
<script>try{var t=localStorage.getItem('ds-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');}catch(e){}</script>
<link rel="stylesheet" href="../../web-builder/web-builder.css">
<style>
${STYLE()}
</style>
</head>
<body>

<!-- Navbar CHÉP NGUYÊN từ data-science-roadmap.html (cùng class wb-navbar/ds-logo/ds-theme/
     ds-brand) — không tự vẽ lại, để hai trang luôn cùng một hình khi trang kia đổi. -->
<header class="wb-navbar wb-navbar--sticky wb-navbar--glass">
  <a class="wb-btn wb-btn--ghost wb-btn--icon ds-logobtn" href="data-science-roadmap.html" aria-label="Về trang lộ trình đầy đủ" title="Về trang lộ trình đầy đủ">
    <span class="ds-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="24" height="24" role="img" focusable="false">
        <rect class="ds-logo__sq" x="1.5" y="1.5" width="21" height="21" rx="6.5"/>
        <path class="ds-logo__ln" d="M6.5 16.5 L10.5 9.5 L17.5 12.5" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <g class="ds-logo__dot"><circle cx="6.5" cy="16.5" r="1.85"/><circle cx="10.5" cy="9.5" r="1.85"/><circle cx="17.5" cy="12.5" r="1.85"/></g>
      </svg>
    </span>
  </a>
  <a class="wb-navbar__brand ds-brand" href="data-science-roadmap.html#/home">Data Science</a>
  <span class="ds-brand__sub">Roadmap</span>
  <div class="wb-navbar__spacer"></div>
  <div class="wb-navbar__actions">
    <button class="ds-theme" id="themeBtn" type="button" aria-label="Toggle light/dark theme" aria-pressed="false" title="Toggle light/dark">
      <span class="ds-theme__emoji" aria-hidden="true">☀</span><span class="ds-theme__label">Light</span>
    </button>
  </div>
</header>

<main class="rm-main">
  <section class="rm-hero">
    <h1 class="rm-hero__h">Quick Roadmap</h1>
    <p class="rm-hero__sub">The same roadmap, a different way to learn: tap any step to grasp the <b>core idea</b> in seconds — open the full lesson on the main page when you want to go deeper.</p>
    <div class="rm-hero__stats">
      <span><b>84</b> steps</span><span><b>11</b> phases</span><span><b>${(Math.round(totalMin/30)/2).toString()}</b> hours</span>
    </div>
  </section>
  <div class="rm-path">
${levelsHtml}
  </div>
  <footer class="rm-foot">Generated view · single source of truth is <a href="data-science-roadmap.html">the full roadmap</a>. Summaries are condensed; open a lesson for the complete version.</footer>
</main>

<div class="rm-overlay" id="overlay" hidden></div>
<aside class="rm-drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drTitle" hidden>
  <div class="rm-drawer__bar">
    <span class="rm-drawer__phase" id="drPhase"></span>
    <button class="rm-drawer__close" id="drClose" type="button" aria-label="Đóng" title="Đóng (Esc)">
      <span aria-hidden="true">✕</span></button>
  </div>
  <div class="rm-drawer__body" id="drBody"></div>
</aside>

<script>
const DATA = ${JSON.stringify(DATA)};
${SCRIPT()}
</script>
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`roadmap.html: ${P.LEAVES.length} bước · 11 chặng · ${nSum}/84 bản tóm tắt · ${(html.length/1024).toFixed(0)} KB`);
if (nSum < 84) console.log(`  ⚠ còn ${84 - nSum} bài chưa có tóm tắt (dùng payoff làm tldr tạm) — chạy workflow rồi lưu tools/roadmap-summaries.json.`);

/* =============================== STYLE =============================== */
function STYLE() { return String.raw`
  :root{
    --rm-core:var(--wb-fg); --rm-good:var(--wb-gray-400); --rm-skim:var(--wb-gray-300);
    --rm-drawer-w:min(50vw,760px); --ds-navctl:30px; --ds-ctl-xs:24px;
  }
  *{box-sizing:border-box}
  /* line-height:1.55 khớp baseline .wb-app/.wb-shell của kit (web-builder.css §"document
     baseline", dùng ở data-science-roadmap.html qua class wb-shell) — thiếu dòng này là
     lý do chữ "Data Science" trên thanh trên hai trang lệch dọc ~2px khi so cạnh nhau:
     cùng 56px navbar, cùng align-items:center, nhưng line-height "normal" (mặc định trình
     duyệt) ra chiều cao dòng khác 1.55 × cỡ chữ. */
  body{margin:0;background:var(--wb-canvas);color:var(--wb-fg);font-family:var(--wb-font);
    line-height:1.55;-webkit-font-smoothing:antialiased;}
  a{color:inherit}
  /* ---- navbar: CHÉP nguyên từ data-science-roadmap.html (.ds-brand/.ds-logo*/.ds-theme*),
     đặt trên khung .wb-navbar của kit — không tự vẽ .rm-nav riêng nữa, để logo + nút
     theme luôn cùng một hình với trang chính. */
  .wb-navbar{--ds-navctl:30px;}
  .ds-brand{font-weight:700;letter-spacing:-.01em;display:inline-flex;align-items:center;gap:0;}
  .ds-brand__sub{font-weight:500;font-size:.8em;color:var(--wb-fg-subtle);letter-spacing:0;
    margin-left:6px;padding-left:6px;border-left:var(--wb-bw) solid var(--wb-border);}
  .ds-logobtn{box-sizing:border-box;padding:2px;border-radius:11px;
    width:var(--ds-navctl);height:var(--ds-navctl);}
  .ds-logo{display:inline-flex;}
  .ds-logo svg{display:block;width:var(--ds-ctl-xs);height:var(--ds-ctl-xs);}
  .ds-logo__sq{fill:var(--wb-fg);}
  .ds-logo__ln{stroke:var(--wb-canvas);}
  .ds-logo__dot{fill:var(--wb-canvas);}
  .ds-theme{box-sizing:border-box;height:var(--ds-navctl);display:inline-flex;align-items:center;
    gap:7px;line-height:1;font-family:inherit;font-size:13px;font-weight:550;cursor:pointer;
    padding:0 12px;border-radius:var(--wb-radius-pill);border:var(--wb-bw) solid var(--wb-border);
    background:var(--wb-surface);color:var(--wb-fg);box-shadow:var(--wb-shadow-sm);}
  .ds-theme:hover{border-color:var(--wb-border-strong)}
  .ds-theme:focus-visible{outline:none;box-shadow:0 0 0 3px var(--wb-ring)}
  .ds-theme__emoji{font-size:14px}
  @media (max-width:560px){.ds-theme{width:var(--ds-navctl);padding:0;gap:0}.ds-theme__label{display:none}}
  /* ---- hero ---- */
  .rm-main{max-width:920px;margin:0 auto;padding:0 20px 80px}
  .rm-hero{text-align:center;padding:44px 0 20px}
  .rm-hero__h{font-size:clamp(28px,5vw,40px);font-weight:800;margin:0 0 10px;letter-spacing:-.02em}
  .rm-hero__sub{font-size:16px;line-height:1.65;color:var(--wb-fg-muted);max-width:620px;margin:0 auto}
  .rm-hero__stats{display:flex;gap:26px;justify-content:center;margin-top:20px;font-size:14px;color:var(--wb-fg-muted)}
  .rm-hero__stats b{font-size:22px;color:var(--wb-fg);font-weight:800;margin-right:5px}
  /* ---- path: xương sống dọc, node so le hai bên ---- */
  .rm-path{position:relative;margin-top:24px}
  .rm-path::before{content:"";position:absolute;left:50%;top:8px;bottom:8px;width:0;
    border-left:2px dashed var(--wb-border-strong);transform:translateX(-50%)}
  .rm-level{position:relative;margin:8px 0}
  .rm-levelhead{position:relative;z-index:2;display:flex;align-items:center;gap:12px;justify-content:center;
    text-align:center;margin:34px auto 18px;max-width:560px;padding:10px 16px;border-radius:14px;
    background:var(--wb-surface);border:var(--wb-bw) solid var(--wb-border);box-shadow:var(--wb-shadow-sm)}
  .rm-levelhead__no{flex:none;width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;
    justify-content:center;font-weight:800;font-size:17px;background:var(--wb-fg);color:var(--wb-canvas)}
  .rm-levelhead__x{display:flex;flex-direction:column;text-align:left;min-width:0}
  .rm-levelhead__name{font-weight:750;font-size:15px}
  .rm-levelhead__out{font-size:12px;color:var(--wb-fg-muted);line-height:1.4;
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .rm-levelhead__n{flex:none;font-size:11px;color:var(--wb-fg-subtle);font-variant-numeric:tabular-nums;white-space:nowrap}
  .rm-nodes{position:relative}
  /* mỗi node chiếm nửa bề rộng, dựa vào xương sống ở giữa. min-height/padding nới hơn bản
     gốc (52px/8px) khá nhiều — chủ trang yêu cầu nới thêm lần hai — để các bước cách xa
     nhau rõ rệt, dễ tách mắt hơn khi cả 84 bước nằm trên một xương sống dài. */
  .rm-node{position:relative;width:50%;min-height:80px;display:flex;align-items:center;gap:12px;
    padding:22px 0;background:none;border:0;cursor:pointer;font:inherit;color:inherit}
  .rm-node--l{margin-right:50%;flex-direction:row-reverse;text-align:right;padding-right:34px}
  .rm-node--r{margin-left:50%;padding-left:34px}
  .rm-node__dot{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;
    display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;
    background:var(--wb-surface);border:2px solid var(--wb-border-strong);color:var(--wb-fg-muted);
    transition:transform .12s ease,border-color .12s ease,background .12s ease;z-index:2}
  .rm-node--l .rm-node__dot{right:-17px} .rm-node--r .rm-node__dot{left:-17px}
  .rm-node__i{font-size:12px;font-variant-numeric:tabular-nums}
  /* Icon font (Material Symbols, đã @import trong web-builder.css) thay cho ký tự ★ thô —
     ★ Unicode canh giữa lệch tâm khác nhau tuỳ font hệ điều hành, trong một vòng tròn nhỏ
     lệch đó lộ rõ. --wb-ico-fill:1 để đặc (khớp cảm giác "sao vàng" quen thuộc). */
  .rm-node__star{--wb-ico-fill:1;color:var(--wb-warning);font-size:17px}
  .rm-node__label{display:flex;flex-direction:column;gap:1px;min-width:0}
  .rm-node__t{font-size:13.5px;font-weight:600;line-height:1.3}
  .rm-node__m{font-size:11px;color:var(--wb-fg-subtle);font-family:var(--wb-font-mono)}
  .rm-node:hover .rm-node__dot{transform:translateY(-50%) scale(1.14);border-color:var(--wb-fg)}
  .rm-node:hover .rm-node__t{text-decoration:underline;text-underline-offset:2px}
  .rm-node:focus-visible{outline:none}
  .rm-node:focus-visible .rm-node__dot{box-shadow:0 0 0 3px var(--wb-ring)}
  /* màu theo ưu tiên: core = đặc, good = viền, skim = nhạt */
  .rm-pri-core .rm-node__dot{background:var(--wb-fg);border-color:var(--wb-fg);color:var(--wb-canvas)}
  .rm-pri-good .rm-node__dot{background:var(--wb-surface);border-color:var(--wb-border-strong)}
  .rm-pri-skim .rm-node__dot{background:var(--wb-surface);border-style:dashed;border-color:var(--wb-border-strong)}
  /* đã đạt (đọc từ localStorage tiến độ trang chính) — outline xanh dương + nền trắng,
     không phải chip đặc xanh lá: chủ trang chọn xanh dương làm màu ưu tiên (2026-08-05). */
  .rm-node.is-done .rm-node__dot{background:#fff;border-color:var(--wb-info);color:var(--wb-info-text)}
  .rm-node.is-done .rm-node__dot::after{content:"✓";position:absolute;font-size:15px;color:var(--wb-info-text)}
  .rm-node.is-done .rm-node__dot .rm-node__i,.rm-node.is-done .rm-node__dot .rm-node__star{visibility:hidden}
  .rm-node.is-done .rm-node__t{color:var(--wb-fg-subtle)}
  .rm-foot{text-align:center;margin-top:50px;font-size:12px;color:var(--wb-fg-subtle);line-height:1.6}
  /* ---- drawer 1/2 cửa sổ ---- */
  .rm-overlay{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.42);opacity:0;transition:opacity .18s ease}
  .rm-overlay.is-open{opacity:1}
  .rm-drawer{position:fixed;top:0;right:0;bottom:0;z-index:41;width:var(--rm-drawer-w);max-width:100vw;
    background:var(--wb-canvas);border-left:var(--wb-bw) solid var(--wb-border);box-shadow:var(--wb-shadow-lg);
    display:flex;flex-direction:column;transform:translateX(100%);transition:transform .2s ease}
  .rm-drawer.is-open{transform:translateX(0)}
  .rm-drawer__bar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:14px 18px;border-bottom:var(--wb-bw) solid var(--wb-border);background:var(--wb-surface)}
  .rm-drawer__phase{font-size:12px;font-weight:700;color:var(--wb-fg-muted);text-transform:uppercase;letter-spacing:.04em}
  .rm-drawer__close{width:32px;height:32px;border-radius:8px;border:var(--wb-bw) solid var(--wb-border);
    background:var(--wb-surface);color:var(--wb-fg);cursor:pointer;font-size:15px;line-height:1}
  .rm-drawer__close:hover{border-color:var(--wb-border-strong);background:var(--wb-surface-hover)}
  .rm-drawer__close:focus-visible{outline:none;box-shadow:0 0 0 3px var(--wb-ring)}
  .rm-drawer__body{flex:1 1 auto;overflow-y:auto;padding:22px 24px 40px}
  .rm-dh{font-size:22px;font-weight:800;line-height:1.25;margin:0 0 12px;letter-spacing:-.01em}
  .rm-dh .rm-dh__star{color:var(--wb-warning);margin-right:6px}
  .rm-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
  .rm-chip{font-size:11px;font-weight:650;padding:3px 9px;border-radius:999px;border:var(--wb-bw) solid var(--wb-border-strong);color:var(--wb-fg-muted);white-space:nowrap}
  .rm-chip--core{background:var(--wb-fg);color:var(--wb-canvas);border-color:var(--wb-fg)}
  .rm-chip--fast{border-style:dashed}
  .rm-sec{margin:0 0 20px}
  .rm-sec__h{font-size:12px;font-weight:750;text-transform:uppercase;letter-spacing:.05em;color:var(--wb-fg-subtle);margin:0 0 8px}
  .rm-tldr{font-size:16px;line-height:1.6;margin:0 0 22px;color:var(--wb-fg)}
  .rm-points{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px}
  .rm-points li{position:relative;padding-left:20px;font-size:14.5px;line-height:1.55}
  .rm-points li::before{content:"";position:absolute;left:2px;top:9px;width:7px;height:7px;border-radius:50%;background:var(--wb-fg)}
  .rm-viz{font-size:14px;line-height:1.55;color:var(--wb-fg-muted);background:var(--wb-surface-2);
    border:var(--wb-bw) solid var(--wb-border);border-radius:10px;padding:12px 14px;display:flex;gap:10px}
  .rm-viz::before{content:"◎";color:var(--wb-fg-muted);flex:none}
  .rm-po{display:flex;flex-direction:column;gap:8px}
  .rm-po__row{display:flex;gap:10px;font-size:14px;line-height:1.5}
  .rm-po__k{flex:none;width:64px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--wb-fg-subtle);padding-top:2px}
  .rm-acc{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
  .rm-acc li{display:flex;gap:9px;font-size:14px;line-height:1.5;align-items:baseline}
  .rm-acc__k{flex:none;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--wb-fg-subtle);
    border:var(--wb-bw) solid var(--wb-border-strong);border-radius:5px;padding:1px 6px;white-space:nowrap}
  .rm-acc code,.rm-po code,.rm-tldr code{font-family:var(--wb-font-mono);font-size:.9em;background:var(--wb-surface-2);padding:1px 5px;border-radius:4px}
  .rm-full{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:11px 18px;border-radius:10px;
    background:var(--wb-fg);color:var(--wb-canvas);text-decoration:none;font-weight:700;font-size:14px}
  .rm-full:hover{opacity:.9}
  /* ---- mobile: dồn node về một bên, drawer full ---- */
  @media (max-width:680px){
    .rm-path::before{left:18px}
    .rm-node,.rm-node--l,.rm-node--r{width:100%;margin:0;flex-direction:row;text-align:left;padding:18px 0 18px 46px}
    .rm-node--l .rm-node__dot,.rm-node--r .rm-node__dot{left:1px;right:auto}
    .rm-levelhead{margin-left:0;margin-right:0}
    :root{--rm-drawer-w:100vw}
  }
`; }

/* =============================== SCRIPT =============================== */
function SCRIPT() { return String.raw`
const $=(s,r=document)=>r.querySelector(s);
const byId={}; DATA.forEach(ph=>ph.lessons.forEach(l=>byId[l.id]={...l,ph}));

/* theme — CHUNG khoá 'ds-theme' với trang chính, nên đổi ở đây nhớ luôn ở kia */
function syncTheme(){const d=document.documentElement.classList.contains('dark');
  $('#themeBtn .ds-theme__emoji').textContent=d?'☾':'☀';
  $('#themeBtn .ds-theme__label').textContent=d?'Dark':'Light';
  $('#themeBtn').setAttribute('aria-pressed',d?'true':'false');}
$('#themeBtn').addEventListener('click',()=>{const d=document.documentElement.classList.toggle('dark');
  try{localStorage.setItem('ds-theme',d?'dark':'light')}catch(e){} syncTheme();});
syncTheme();

/* đọc tiến độ trang chính (cùng origin, cùng khoá 'ds-roadmap-progress-v3') → chấm ✓ node
   đã ĐẠT mức cao nhất, giống nhãn is-done ở cây trang chính (lvl >= maxLevel). */
try{const prog=JSON.parse(localStorage.getItem('ds-roadmap-progress-v3')||'{}');
  document.querySelectorAll('.rm-node').forEach(n=>{const l=byId[n.dataset.id];
    if(!l)return; const lvl=prog[l.id]||0; if(lvl>0&&lvl>=l.max)n.classList.add('is-done');});
}catch(e){}

/* drawer */
const drawer=$('#drawer'),overlay=$('#overlay');let lastFocus=null;
const PRINAME={core:'Bắt buộc',good:'Nên biết',skim:'Định vị là đủ'};
function open(id){const l=byId[id];if(!l)return;lastFocus=document.activeElement;
  $('#drPhase').textContent='Chặng '+l.ph.no+' · '+l.ph.name;
  $('#drBody').innerHTML=body(l);
  overlay.hidden=false;drawer.hidden=false;requestAnimationFrame(()=>{overlay.classList.add('is-open');drawer.classList.add('is-open');});
  document.documentElement.style.overflow='hidden';$('#drClose').focus();}
function close(){overlay.classList.remove('is-open');drawer.classList.remove('is-open');
  document.documentElement.style.overflow='';
  setTimeout(()=>{overlay.hidden=true;drawer.hidden=true;},200);
  if(lastFocus&&document.contains(lastFocus))lastFocus.focus();}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function body(l){
  const chips=[]; chips.push('<span class="rm-chip rm-chip--'+l.pri+'">'+PRINAME[l.pri]+'</span>');
  chips.push('<span class="rm-chip">'+fmt(l.mins)+'</span>');
  if(l.fast)chips.push('<span class="rm-chip rm-chip--fast">Fast track 14 ngày</span>');
  if(l.week)chips.push('<span class="rm-chip">Tuần '+l.week+'</span>');
  let h='<h2 class="rm-dh">'+(l.star?'<span class="rm-dh__star">★</span>':'')+esc(l.t)+'</h2>';
  h+='<div class="rm-chips">'+chips.join('')+'</div>';
  if(l.tldr)h+='<p class="rm-tldr">'+esc(l.tldr)+'</p>';
  if(l.points&&l.points.length)h+='<div class="rm-sec"><p class="rm-sec__h">Kiến thức chính</p><ul class="rm-points">'+l.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul></div>';
  if(l.viz)h+='<div class="rm-sec"><p class="rm-sec__h">Hình / ví dụ then chốt</p><div class="rm-viz">'+esc(l.viz)+'</div></div>';
  if(l.payoff)h+='<div class="rm-sec"><p class="rm-sec__h">Xong bước này</p><div class="rm-po">'
    +'<div class="rm-po__row"><span class="rm-po__k">Bạn có</span><span>'+l.payoff[0]+'</span></div>'
    +'<div class="rm-po__row"><span class="rm-po__k">Dẫn tới</span><span>'+l.payoff[1]+'</span></div></div></div>';
  if(l.accept&&l.accept.length)h+='<div class="rm-sec"><p class="rm-sec__h">Tiêu chí đạt</p><ul class="rm-acc">'
    +l.accept.map(a=>'<li><span class="rm-acc__k">'+esc(a.k)+'</span><span>'+a.v+'</span></li>').join('')+'</ul></div>';
  h+='<a class="rm-full" href="data-science-roadmap.html#/'+l.id+'">Mở bài đầy đủ →</a>';
  return h;
}
function fmt(m){return m<60?m+'′':(m%60?Math.floor(m/60)+'h'+String(m%60).padStart(2,'0'):Math.floor(m/60)+'h');}
document.querySelectorAll('.rm-node').forEach(n=>n.addEventListener('click',()=>open(n.dataset.id)));
$('#drClose').addEventListener('click',close);
overlay.addEventListener('click',close);
addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden)close();});
`; }
