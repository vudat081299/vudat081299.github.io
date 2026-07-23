# CLAUDE.md — Cashy (read me first)

This is the **map for an AI (or human) working on Cashy**. Read it top to bottom
once; it links out to the deep docs for everything else. The goal: know enough to
make any change correctly **without asking**.

> **What this repo actually is:** a **React 19 + TypeScript + Vite** web app. A
> personal spending ledger, 100% client-side (all data in `localStorage`), no
> server, no accounts, no network. That is the whole thing.
>
> **What the two `docs/cashy-*` files are:** the product's *timeless* thinking
> ([cashy-vision.md](docs/cashy-vision.md)) and its *v1 use-case spec*
> ([cashy-v1-spec.md](docs/cashy-v1-spec.md)). Both were written with a **native
> iOS / SwiftUI** endpoint in mind, so they mention SwiftData, TCA, Sign in with
> Apple, PIN, Face ID, CSV import, etc. **Treat their PRINCIPLES as binding
> (offline-first, minimalism, neutral-first, money-as-integer, layered +
> component-first) and their STACK / auth / native features as aspirational — they
> are NOT in this codebase.** When a product doc and the code disagree about what
> exists, the **code wins**; when philosophy is in question, the **vision wins**.
> [architecture.md](docs/architecture.md) describes the code as it is and is
> normative for anything under `src/`.

---

## 1. Run it

Package manager is **pnpm** (a `pnpm-lock.yaml` is committed; npm also works).

```bash
pnpm install
pnpm dev            # http://localhost:5173
pnpm test           # vitest, ~116 tests over src/domain/ + src/data/ (pure, no DOM)
pnpm lint           # oxlint
pnpm build          # tsc -b → check:layers → vite build → dist/  (base /cashy/)
```

First launch seeds a demo workspace (~200 transactions + ~20 subscriptions, all
Vietnamese sample data). To wipe: Settings → Danger zone → reset, or clear
`localStorage`.

**Two dev-only component galleries** (code-split, never loaded in production):
- `#/cashy` — the **Cashy-specific** components (this app's layer), fed by fake data.
- `#/wb` — the generic **`wb-*`** design-system primitives.

Open them at e.g. `http://localhost:5173/#/cashy`. Source: `src/ui/dev/`.

---

## 2. The one-paragraph mental model

Cashy is a **ledger**. The `transactions` array is the single source of truth for
all money. Everything else — category tree, tags, subscriptions, every chart and
KPI — is either metadata on those rows or a **pure function** computed from them.
The UI never mutates state directly: it **reads** via `useCashy()` and **writes**
by calling a **usecase**, which asks a pure `domain/` function for the next state
and `commit`s it. State is one object persisted to `localStorage` and re-hydrated
(with forward migrations) on load.

---

## 3. Philosophy (what "good" means here)

Full text: [docs/cashy-vision.md](docs/cashy-vision.md). The parts that bind day-to-day work:

- **Offline-first, private by default.** Nothing leaves the browser. No telemetry.
- **Minimalism / neutral-first.** White-black-grey is the ground. **Colour means
  status, not decoration** — income green, expense/danger red, warning amber, info
  blue. Categories and tags are **grey**, never rainbow (a tag's own hue only shows
  on tag-*about* surfaces). No gratuitous gradients/shadows/animation. Hierarchy
  comes from scale + weight. See the memory note "Cashy UI taste".
- **Speed & low friction.** Adding a transaction should cost almost no clicks; the
  editor pre-fills now, remembers a half-typed draft, and has keyboard shortcuts.
- **Component-first composition (Atomic Design).** Build reusable units, compose
  screens from them — atoms → molecules → organisms → screens. The component
  galleries exist to keep that honest.
- **Money is an integer count of đồng.** Never a float. See invariants below.
- **Language:** the **UI chrome is English**; the **seeded ledger data stays
  Vietnamese** (payees, category names, notes). Compact money uses English
  magnitude letters **k / m / b** (`3.4m đ`), not `k / tr / tỷ`. Currency glyph is
  `đ` via `domain/money.formatMoney` (one field, the transaction amount addon,
  still shows `₫` — an open item, see the checklist).

---

## 4. Architecture (layers + the one rule)

Authority: [docs/architecture.md](docs/architecture.md). Summary — dependencies flow
**one way**, enforced by `scripts/check-layers.mjs` inside `pnpm build`:

```
ui  ──▶  usecases  ──▶  domain
                   └─▶  data          lib is a leaf: importable anywhere
```

| Layer | Contains | Rule |
|---|---|---|
| `domain/` | business rules, calculations, predicates | **pure** — no React, no I/O; injects `now` as a param |
| `usecases/` | one function per user action | read state → ask `domain` → `commit`; the only layer UI writes through |
| `data/` | store, `localStorage`, migrations, seed, sample, draft | no business rules |
| `ui/kit/` | the `wb-*` design system (typed React wrappers) | **knows nothing about Cashy** |
| `ui/common/`, `ui/features/`, `ui/app/` | Cashy-aware components + screens | read via `useCashy()`, write via usecases |
| `lib/` | leaf utilities (router, theme, toast, confirm, modals, id, palette, cn) | may be imported anywhere; may import only `@/domain/types` |

`ui/**` may import from `@/data/store` **only** `useCashy` (never `commit`/`getState`).
The build **fails** on a violation.

---

## 5. Data model (entities + how they link)

Full data dictionary: [docs/data-model.md](docs/data-model.md). Types live in
[src/domain/types.ts](src/domain/types.ts). The persisted root is `CashyState`
(`localStorage["cashy_state_v1"]`):

```
CashyState { version, theme, subIconStyle, workspace, categories[], tags[], transactions[], subscriptions[], wallets[] }
```

Entities & links:

```
Workspace            — profile (displayName, currency "VND"); its presence = "onboarded"
Category  ──parentId──▶ Category      self-referencing tree, unlimited depth; one hue per root
Tag                   flat label; rendered grey by USAGE RANK, not its stored colorHex
Transaction           the ledger row — the source of truth for money
   ├─ categoryId  ──▶ Category   (nullable; deleting a category orphans rows to null, never deletes them)
   ├─ tagIds[]    ──▶ Tag        (many-to-many; deleting a tag strips the id)
   ├─ walletId    ──▶ Wallet     (nullable; the wallet the money moved through / a transfer's source)
   ├─ toWalletId  ──▶ Wallet     (set ⇒ the row is a TRANSFER; excluded from income/expense totals)
   └─ subscriptionId + subMonth  ──▶ Subscription   (set only when the row is a subscription charge)
Subscription          a recurring service; books NO money itself
   ├─ walletId    ──▶ Wallet     (nullable; inherited onto each cycle charge)
   ├─ paymentTxIds[] / lastPaidAt   CACHE, re-derived from the ledger (never authoritative)
   └─ each due cycle materialises a `pending` Transaction the user confirms/skips
Wallet                a place money sits (cash/bank/e-wallet/card); balance DERIVED from the ledger
   └─ SCHEMA LIVE, no UI yet — see docs/wallets-plan.md (added v6)
```

Enums: `TxType` = income|expense · `TxStatus` = recorded|pending|awaiting|skipped|failed
(**only `recorded` counts toward totals**; missing = recorded) · `SubInterval` =
monthly|yearly · `ThemeMode` = system|light|dark · `SubIconStyle` = neutral|brand ·
`WalletKind` = cash|bank|ewallet|card|other (open union — future net-worth kinds).

Derived (pure, never stored): totals, category breakdown/donut, cash-flow series,
insights, forecast, subscription due/lapsed/owed state, catch-up plan. Each is one
function in `domain/` — see the data-model doc for the function→value map.

---

## 6. Screens, layout & navigation

Hash router ([src/lib/router.ts](src/lib/router.ts)); the shell is
[src/ui/app/Layout.tsx](src/ui/app/Layout.tsx) (sidebar nav + top bar + theme
toggle; collapses to a ☰ drawer on mobile). Routes:

| Hash | Screen | What it does |
|---|---|---|
| `#/dashboard` (default) | **Dashboard** | KPIs, projected-balance chart, subscriptions strip, cash-flow + spending-donut, insights, recent-transactions table |
| `#/transactions` | **Transactions** | period + filter bar + full ledger table (50/page) |
| `#/subscriptions` | **Subscriptions** | commitment/due/total stats, "to confirm" dues, services table |
| `#/categories` | **Categories** | drag-to-reorder / drop-to-nest tree; per-side (expense/income) |
| `#/tags` | **Tags** | tag list with usage counts; add/edit/delete |
| `#/settings` | **Settings** | appearance, workspace, data export/import, reset |
| *(no workspace)* | **Onboarding** | name the workspace, optionally load sample data |
| `#/cashy`, `#/wb` | **Dev galleries** | component catalogues (DEV only) |

Three **singleton modals** are always mounted and opened imperatively via
`lib/modals`: `TransactionEditor`, `TransactionDetail`, `SubscriptionEditor`.
Cross-cutting singletons: `toast` (`lib/toast` + `<Toaster/>`), `confirm`
(`lib/confirm` + `<ConfirmHost/>`).

---

## 7. Component system

Two class prefixes, two React layers, one design language.

- **`wb-*`** — the generic design system in
  [src/styles/web-builder.css](src/styles/web-builder.css), wrapped by typed React
  components in [src/ui/kit/](src/ui/kit/) (import via `@/ui/kit`). Knows nothing
  about Cashy. Seen at **`#/wb`**.
- **`cashy-*`** — app chrome in [src/index.css](src/index.css), built **only from
  `--wb-*` tokens** (no raw hexes). Components in `ui/common/` (Cashy-aware shared
  pieces: `AmountDisplay`, `TagChip`, `CategorySelect`, `StatusPicker`, `PeriodPicker`,
  …) and `ui/features/` (screens + their leaf components). Seen at **`#/cashy`**.

Component tiers (full catalogue + props + screen map: [docs/components.md](docs/components.md)):

| Tier | Examples | Contract |
|---|---|---|
| **Atom / molecule (kit)** | `Button`, `Capsule`, `Input`, `Modal`, `Table`, `Donut` | generic, no Cashy concepts |
| **Common (Cashy-aware)** | `AmountDisplay`, `TagChip`, `CategorySelect`, `StatusPicker`, `DatePicker`, `PeriodPicker` | props + callbacks, no store |
| **Feature-leaf** | `SubscriptionCard`, `TransactionTable`, `SpendChart`, `CashflowChart`, `BalanceCard`, `SubscriptionDues` | presentational; fed data + callbacks; render in the gallery with no store |
| **Container / screen** | `Dashboard`, `Transactions`, `Subscriptions`, `Categories`, `Tags`, `Settings` | call `useCashy()` + usecases; pass callbacks down |
| **Singleton modal** | `TransactionEditor`, `SubscriptionEditor`, `TransactionDetail` | register an open-handler; call usecases |

Styling conventions: money cells use `.wb-num` (tabular, right-aligned). Design
tokens (colours, radii, typography, chart palette) are CSS custom properties on
`:root`, flipped for dark by a single `.dark` block. **CSS load order is
load-bearing**: `index.css` loads *before* `web-builder.css`, so app-level `wb-*`
overrides need raised specificity and dark `:hover` needs an explicit `.dark`
branch (architecture.md §8).

---

## 8. Invariants — break these and the app is *wrong*, not just messy

1. **Money is an integer count of VND.** No floats, no cents. Format/parse only via
   `domain/money`.
2. **Only `status: "recorded"` counts toward money totals** (`domain/txStatus.isCounted`).
   A missing `status` means `"recorded"` (legacy rows) — always read via `statusOf`.
3. **Subscriptions never book money on their own.** Each due cycle materialises a
   `pending` transaction; only the user confirming it makes it `recorded`.
4. **`paymentTxIds` / `lastPaidAt` are a cache** re-derived from the ledger by
   `domain/subscription.paymentsOf`. Any usecase that changes a charge's status
   MUST call `syncPayments`.
5. **Cycle key is `"YYYY-MM"` for both monthly and yearly plans** (a yearly plan has
   one key per year). Don't introduce a second key shape.
6. **Migrations are append-only.** Bump `CURRENT_VERSION`, add an `if (fromVersion < N)`
   branch in `data/migrations.ts`; never edit an existing branch — real data went
   through it.
7. **`domain/**` is pure** (no React, no I/O; `now` is a parameter) and **`ui/kit/**`
   knows nothing about Cashy.** Both are checked by `pnpm build`.
8. **A transaction with `toWalletId` is a transfer** — it counts toward NO income/
   expense total (only the two wallet balances it moves). A wallet's balance is
   `openingBalance` + the net of its `recorded` rows (`domain/wallet`); deleting a
   wallet orphans its rows to `null`, never deletes them.

---

## 9. Common tasks (procedures)

Detailed steps in [architecture.md §6](docs/architecture.md). In short:

- **Add a business rule** → pure function in `domain/<aggregate>.ts` + a test; call
  it from a usecase (don't inline it at the call site).
- **Add a user action** → `usecases/<aggregate>.ts`, export via `usecases/index.ts`;
  if it changes a charge's status, call `syncPayments`.
- **Change persisted shape** → bump `CURRENT_VERSION`, add a migration branch, update
  `domain/types.ts`.
- **Add a UI primitive** → generic → `ui/kit/` (+ `index.ts`); Cashy-aware → `ui/common/`.
- **Add a component to the gallery** → drop it into `src/ui/dev/CashyGallery.tsx`
  with fake data (fixtures live at the top of that file).
- Grep a `wb-*` class in `web-builder.css` before using it; check the import path —
  `ui/kit` and `ui/common` both export `EmptyState` / `Select` / `ColorPicker`, and
  two `Pagination`s exist.

---

## 10. Docs index

| File | What |
|---|---|
| [README.md](README.md) | quickstart, commands, open questions |
| **CLAUDE.md** (this) | the AI map |
| [docs/architecture.md](docs/architecture.md) | **normative** for `src/` — layers, import matrix, procedures, traps |
| [docs/data-model.md](docs/data-model.md) | full data dictionary — entities, enums, relationships, derived values |
| [docs/components.md](docs/components.md) | component catalogue — tiers, props, screen→component map |
| [docs/features/](docs/features/) | **per-feature deep dives** — one doc per screen (overview, transactions, subscriptions, categories, tags, settings, onboarding); see [features/README.md](docs/features/README.md) |
| [docs/cashy-vision.md](docs/cashy-vision.md) | product philosophy (timeless; native-iOS-flavoured) |
| [docs/cashy-v1-spec.md](docs/cashy-v1-spec.md) | v1 use-case spec (native-iOS-flavoured) |
| [docs/wallets-plan.md](docs/wallets-plan.md) | **PLAN** — multi-wallet / asset feature (not built yet) |
| [REBUILD-NOTES.md](REBUILD-NOTES.md) | the web-rebuild handoff notes |
| [docs/handoff-checklist.md](docs/handoff-checklist.md) | **← what was done in this pass + open questions for the owner** |

> **Owner:** before your next session, skim
> [docs/handoff-checklist.md](docs/handoff-checklist.md) — it lists what this
> documentation pass produced and the decisions I need from you.
