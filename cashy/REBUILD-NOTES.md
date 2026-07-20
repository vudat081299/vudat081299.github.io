# Cashy — Rebuild notes & open questions (AI handoff)

> Purpose: this file is the handoff for the "rebuild every screen on web-builder
> blocks" work. It records **decisions made autonomously** (with a sensible
> default in place) and **open questions** for the user to answer later, so the
> session flow was never blocked. A future AI session (or the user) should read
> this, resolve the OPEN items, and delete resolved entries.
>
> Context: keep React + Vite. Use web-builder (`src/styles/web-builder.css`,
> `wb-*` classes) as the component system. No Tailwind. Neutral-first + status
> hues. Screens follow the recipes in the web-builder skill
> (`references/components-catalog.md` → "Composing a page — recipes").

## Status

- [x] Dashboard — `wb-stat-grid` KPIs + chart cards + recent **transaction hero table**
- [x] Transactions — `wb-filterbar` + `wb-table` hero (see Q1)
- [x] Categories — `wb-tree` component classes (kept native pointer drag)
- [x] Settings — `wb-card` sections + `wb-list` rows
- [x] Tags — `wb-list` rows
- [x] Layout shell — `wb-container` + `wb-stack`/`wb-cluster` (see Q2, Q3)
- [x] TransactionEditor / Onboarding — already on wb; light polish only

## Resolved decisions (user delegated: "always use web-builder components; if
## the skill lacks one, compose it from primitives; keep the logic, just make the
## layout more harmonious")

**Q1 — Transactions table → KEPT FLAT (`wb-table` hero + `<tfoot>` net total).**
I first said I'd group by day, but on building it the day-group header row duplicates
the table's own `Ngày` column (redundant + fights the recipe). The flat records-list
table is the cleaner, web-builder-native choice, so it stays flat. Reversible: to
group, add a per-day `<tbody>` header row and hide the row date column.

**Q2 — Footer → ADDED.** `wb-footer wb-footer--slim` at the bottom of the scroll area
(one line: © + "dữ liệu lưu trên trình duyệt"). `src/components/Layout.tsx`.

**Q3 — Mobile nav → KEPT** the ☰-opens-sidenav-drawer (already built from wb-overlay
+ wb-sidenav = web-builder components). No change; logic preserved.

**Q4 — Date entry → SWITCHED to the skill's `wb-calendar`.** New
`src/components/DatePicker.tsx` composes `wb-calendar` (month grid rendered in React,
no external lib) inside the `wb-popover`; used by the transaction editor. `Popover`
was extended to pass a `close()` to render-prop children (non-breaking).

**Q5 — Amount-range filter → SKIPPED.** Judged marginal for a personal log; a 4th
filter control crowds the bar and hurts the harmony asked for. Search + type + tag
stay. Reversible: the `wb-filterbar` + `.wb-range-filter` demo has the pattern.

**Q6 — KPI sparklines → KEPT, but rebuilt on the skill's `.wb-spark`.** `Sparkline`
no longer uses Recharts — it's a single `.wb-spark` SVG `<path>`
(`vector-effect="non-scaling-stroke"`). Recharts still powers the real charts
(trend bars, donut).

*(All resolved. If you disagree with any call, the reversal path is noted inline.)*

## Notes for whoever picks this up

- Every `wb-*` class used was verified to exist in `src/styles/web-builder.css`
  before use (grep the class before adding a new one).
- Shared row: `src/components/TransactionRow.tsx` now renders a `<tr>` for
  `wb-table`; it's used by both Dashboard (recent) and Transactions.
- The web-builder skill's catalog is the source of truth for markup:
  `references/components-catalog.md`.
