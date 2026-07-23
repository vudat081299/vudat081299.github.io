# Cashy — Web build spec (what actually ships)

> **Purpose:** the spec for the software that actually exists in this repo — the
> **React 19 + TypeScript + Vite** web app. The two `cashy-*` docs
> ([cashy-vision.md](cashy-vision.md), [cashy-v1-spec.md](cashy-v1-spec.md)) were
> written toward a **native iOS / SwiftUI** endpoint; treat their *principles* as
> binding and their *stack / platform features* as aspirational. **When a product
> doc and the code disagree about what exists, this doc and the code win.**
>
> This is a map, not a duplicate: it states what the web build is and links out to
> the normative deep docs for the detail.

---

## 1. What it is

A personal spending **ledger**, 100% client-side. No server, no account, no
network, no telemetry — every byte of data lives in the browser's `localStorage`
under `cashy_state_v1`. First launch can seed a Vietnamese demo workspace; a reset
clears it.

- **Stack:** React 19, TypeScript (strict), Vite, `recharts` for charts. Package
  manager **pnpm** (npm also works). No backend, no state library beyond a tiny
  hand-rolled store over `useSyncExternalStore`.
- **Persistence:** one `CashyState` object in `localStorage`, re-hydrated on load
  with **append-only forward migrations** (`data/migrations.ts`).
- **Language:** UI chrome is **English**; the seeded ledger data stays
  **Vietnamese** (payees, notes, category names).
- **Currency:** integer **VND**, rendered with the đồng sign **`₫`** (U+20AB) via
  `domain/money`. Compact amounts use English magnitude letters (`3,4m`).

---

## 2. Architecture

One-way dependency, enforced at build time by `scripts/check-layers.mjs` (a
violation fails `pnpm build`):

```
ui  ──▶  usecases  ──▶  domain          (domain is pure: no React, no I/O)
                   └─▶  data             (store · localStorage · migrations · seed)
lib  = leaf, importable anywhere
```

Normative detail: [architecture.md](architecture.md). The reuse map (money,
percent, dates, sorting all have exactly one home) and the file tree are in
[../ARCHITECTURE-WALKTHROUGH.md](../ARCHITECTURE-WALKTHROUGH.md). Data dictionary:
[data-model.md](data-model.md). Component catalogue: [components.md](components.md).

---

## 3. Shipped features

The full per-feature behaviour lives in [features/](features/README.md). At a glance:

| Route | Feature |
|---|---|
| `#/dashboard` | KPIs, balance-forecast chart, subscriptions strip, cash-flow + spending donut, insights, recent transactions |
| `#/transactions` | period + filter bar + full ledger table (bulk actions, pagination), editor + detail, draft caching |
| `#/subscriptions` | recurring services — dues/confirm, a card grid with a filter bar (search · status · wallet · sort) past 6 services, trial progress, catch-up / cancel / history dialogs |
| `#/wallets` | wallet balances + net worth; add/edit/archive/delete; per-transaction wallet; transfers |
| `#/loans` | money owed / owed to you; borrowed vs lent; per-loan repayment log; reference-only interest; net-worth integration |
| `#/categories` | drag-to-reorder / drop-to-nest tree, per-side (expense/income) |
| `#/tags` | flat labels, usage-rank grey shading |
| `#/settings` | appearance, workspace, data export/import, danger-zone reset |
| *(no workspace)* | onboarding — name the workspace, seed categories + empty ledger |

---

## 4. NOT in the web build

These appear in the vision / v1 spec because they target the native app. They are
**deliberately absent** here, and a request that assumes them should be checked
against this list first:

- **Sign in with Apple / any auth or accounts** — the app has no identity at all.
- **Face ID / PIN / biometric lock** — no lock screen; privacy comes from the data
  never leaving the browser.
- **SwiftData / TCA / SwiftUI** — the persistence and state stack is the tiny
  localStorage store described above, not any Apple framework.
- **CSV / bank-statement import** — data is entered by hand or via the demo seed;
  JSON export/import in Settings is the only bulk path.
- **Push notifications / background refresh** — reminders are computed on load, not
  pushed.

---

## 5. Run it

```bash
pnpm install
pnpm dev            # http://localhost:5173
pnpm test           # vitest — pure tests over domain/ + data/
pnpm lint           # oxlint
pnpm build          # tsc -b → check:layers → vite build → dist/  (base /cashy/)
```

See [../CLAUDE.md](../CLAUDE.md) for the full working guide and conventions.
