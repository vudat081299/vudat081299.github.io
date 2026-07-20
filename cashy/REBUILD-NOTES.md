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

## Open questions (please answer, then let AI apply)

**Q1 — Transactions: flat table vs per-day grouping.**
The old screen grouped rows by day with a per-day net subtotal. The rebuild uses
the web-builder **flat hero table** (a Ngày column + a `<tfoot>` period-net total)
because that's the approved recipe and reads cleaner. → *Placeholder in place: flat
table.* Do you want the per-day grouping (with subtotals) brought back, or keep flat?

**Q2 — App footer.** The page recipe allows a `wb-footer`. For a local single-user
finance app it's mostly filler, so it was **skipped**. → *Placeholder: no footer.*
Want a `wb-footer--slim` (one-line: brand + © + maybe a GitHub link)?

**Q3 — Mobile nav.** web-builder ships a navbar that collapses its own links into a
☰ panel. But Cashy's nav lives in the **sidebar**, so the mobile pattern kept is:
☰ in the navbar opens the **sidenav as a drawer**. → *Placeholder: custom drawer
(works).* Keep this, or move nav into the navbar to use the built-in collapse?

**Q4 — Date entry in the editor.** The transaction editor still uses the native
`<input type="date">` (simple, accessible, no JS). web-builder also has a
`wb-calendar` popover (type-or-pick). → *Placeholder: native date input.* Switch to
the `wb-calendar` picker?

**Q5 — Filter richness.** The `wb-filterbar` demo supports removable **amount-range**
tokens (≥ / ≤ / between) and status tokens. Cashy currently filters by type / tag /
search only. → *Placeholder: type+tag+search.* Add an amount-range filter token?

**Q6 — KPI sparklines.** The stat cards keep a small sparkline under each value
(web-builder endorses sparklines in stat cards). → *Placeholder: sparklines on.*
Prefer flat stat cards (value + delta only) for a calmer look?

## Notes for whoever picks this up

- Every `wb-*` class used was verified to exist in `src/styles/web-builder.css`
  before use (grep the class before adding a new one).
- Shared row: `src/components/TransactionRow.tsx` now renders a `<tr>` for
  `wb-table`; it's used by both Dashboard (recent) and Transactions.
- The web-builder skill's catalog is the source of truth for markup:
  `references/components-catalog.md`.
