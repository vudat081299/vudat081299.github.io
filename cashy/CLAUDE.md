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
>
> **The bridge between the two:** [docs/cashy-web-spec.md](docs/cashy-web-spec.md)
> states what the *web build* actually is (stack, shipped features, and an explicit
> "not in the web build" list) and links out to the deep docs — read it when the
> product docs mention a feature and you need to know whether it exists here.

**Source-of-truth order when documents disagree:** code + tests → this web spec /
the normative architecture and data-model docs → current feature docs → shipped
plans (historical design records) → native vision/spec. Plans record why a
decision was made; they do not override current feature docs or code.

**Minimum reading path for a safe change:** this file → the relevant
`docs/features/<feature>.md` → the entity fields in `docs/data-model.md` → the
layer/procedure in `docs/architecture.md`. Read `docs/components.md` when touching
UI composition and the vision when making a product/taste decision.

---

## 1. Run it

Package manager is **pnpm** (a `pnpm-lock.yaml` is committed; npm also works).

```bash
pnpm install
pnpm dev            # http://localhost:5173
pnpm test           # vitest — pure tests over src/domain/ + src/data/ (no DOM)
pnpm lint           # oxlint
pnpm build          # tsc -b → check:layers → vite build → dist/  (base /cashy/)
```

A fresh workspace starts with the default categories, wallets, and an **empty
ledger**. The Vietnamese demo dataset (~200 transactions + ~20 subscriptions) is
opt-in from Settings → Data. To wipe: Settings → Danger zone → reset, or clear
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
  magnitude letters **k / m / b** (`3,4m`), not `k / tr / tỷ`. The currency glyph
  is the đồng sign **`₫`** (U+20AB), applied app-wide through `domain/money`
  (`formatMoney` / `formatMoneyShort`); `formatMoneyAxis` is the same compact form
  with the unit stripped, for chart axes and range labels.

### 3.1 Engineering doctrine (the names behind the style)

The project applies these ideas pragmatically, without pretending to implement
every textbook pattern:

- **Clean/layered architecture + Dependency Rule:** source dependencies point
  inward (`ui → usecases → domain`; persistence stays below usecases). Business
  rules do not know React or localStorage.
- **Functional core, imperative shell:** `domain/` is pure and deterministic;
  usecases perform the small state-transition/commit shell; React orchestrates
  and renders.
- **Single Responsibility + Separation of Concerns:** parsing/formatting, a
  business decision, persistence, and rendering live in different homes.
- **Single Source of Truth:** transactions own money; subscription payment fields
  are caches; wallet balances, loan outstanding, charts, totals, and statuses are
  derived.
- **Component-first composition / Atomic Design:** kit primitives → Cashy-aware
  common molecules → presentational feature leaves → connected containers/screens.
- **Composition over duplication:** reuse an existing component or pure helper
  before adding markup/math at a call site. A semantic rule has **one home**:
  money through `domain/money`, percent through `domain/format`, status pills
  through `Capsule`, entity-card identity through `CardIdentity`, filter facets
  through `FacetChip`.
- **Container/presentational split:** reusable leaves accept props + callbacks and
  do not touch the store. Containers read `useCashy`, call usecases, and pass data
  down.
- **Pragmatic SOLID:** SRP and dependency inversion are strong; interface
  segregation appears as narrow component props and small usecases. Do not add
  abstractions merely to claim SOLID—extract when a concept has a stable name, a
  business rule, or real reuse.
- **Make invalid states hard to represent:** typed unions, typed kit props,
  oldest-first catch-up planning, integer-money coercion, and append-only
  migrations encode constraints before runtime.
- **DRY means knowledge, not text:** duplicate harmless layout locally if it has
  no shared meaning; centralise duplicated business knowledge immediately. Small
  feature-local subcomponents may remain inline until another consumer exists.

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
CashyState { version, theme, subIconStyle, workspace, categories[], tags[], transactions[], subscriptions[], wallets[], loans[], contacts[] }
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
   ├─ cardNetwork + creditLimit  (card only; drive the utilisation bar — added v8)
   └─ assigned per tx/sub, filterable, transfers between wallets — #/wallets screen (added v6)
Loan                  money you owe / are owed — a FIRST-CLASS record (not a wallet, not a transaction)
   ├─ direction borrowed|lent · source personal|card|bank|other · principal (int VND)
   ├─ interestRatePct + interestPeriod year|month  (reference-only; never accrued)
   ├─ openedAt · dueAt (YMD|null) · archived
   └─ payments[] (LoanPayment, manual log); outstanding DERIVED — #/loans screen (added v7)
Contact               a person you lend to / borrow from — a FIRST-CLASS entity, holds no money
   └─ name, username? (disambiguating handle), colorHex, icon, archived — #/contacts screen (added v9)
```

Enums: `TxType` = income|expense · `TxStatus` = recorded|pending|awaiting|skipped|failed
(**only `recorded` counts toward totals**; missing = recorded) · `SubInterval` =
monthly|yearly · `ThemeMode` = system|light|dark · `SubIconStyle` = neutral|brand ·
`WalletKind` = cash|bank|ewallet|card|other (open union — future net-worth kinds) ·
`CardNetwork` = visa|mastercard|amex|jcb|other (card only) ·
`LoanDirection` = borrowed|lent · `LoanSource` = personal|card|bank|other ·
`InterestPeriod` = year|month.

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
| `#/subscriptions` | **Subscriptions** | commitment/due/total stats, "to confirm" dues, then a card grid (one `ConnectedSubscriptionCard` per service, sorted by status; a filter bar past 6) |
| `#/wallets` | **Wallets** | wallet balances + net worth; add/edit/archive/delete. Assigned in the tx/sub editors, filterable, and money moves between wallets via **transfers** |
| `#/loans` | **Loans** (handshake icon) | money you owe + owed to you; borrowed/lent, per-loan payment log, receivable − payable net worth; add/edit/archive/delete. Touches no transactions |
| `#/contacts` | **Contacts** | standalone people directory; add/edit/archive/delete. `ContactPicker` and loan linkage are intentionally staged, not wired yet |
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
| **Common (Cashy-aware)** | `AmountDisplay`, `CardIdentity`, `FacetChip`, `TagChip`, `CategorySelect`, `StatusPicker`, `PeriodPicker` | props + callbacks, no store |
| **Feature-leaf** | `SubscriptionCard`, `LoanCard`, `ContactCard`, `TransactionTable`, `SpendChart`, `BalanceCard` | presentational; fed data + callbacks; render in the gallery with no store |
| **Container / screen** | `Dashboard`, `Transactions`, `Subscriptions`, `Wallets`, `Loans`, `Contacts`, `Categories`, `Tags`, `Settings` | call `useCashy()` + usecases; pass callbacks down |
| **Singleton modal** | `TransactionEditor`, `SubscriptionEditor`, `TransactionDetail` | register an open-handler; call usecases |

**Composition rule — three tiers, one job each (kit-adoption pass, 2026-07-24).**
The app is built by *composing* the kit, not by hand-writing `wb-*` markup:
1. **kit primitives** (`Button`, `Card`, `Capsule`, `Input`, `Progress`, `Modal`, …) are
   the shared vocabulary — never re-hand-write `<button className="wb-btn">`, use
   `<Button variant=…>`; same for `Card` / `Capsule` / `Input` / `Progress`.
2. **feature-custom components** (`ui/common/*` + `ui/features/<x>/*` — `TransactionTable`,
   `SubscriptionCard`, `BalanceCard`, `StatusCap`, the pickers…) encapsulate one
   feature's business rendering by **composing kit primitives** inside. These stay
   product-specific (e.g. `TransactionTable` is deliberately NOT the generic `kit/Table`).
3. **feature entry files** do **one job**: assemble tier-2 components + layout + wiring
   (`useCashy` / usecases). Every entry is now thin — the inline organisms have all been
   extracted into their own tier-2 files (pure moves, verified zero UI impact):
   - **Editors** → `LoanEditor` / `WalletEditor` / `ContactEditor` / `CategoryEditor`
     (shared option lists in `loanOptions.ts`): `Loans` 686→295, `Wallets` 359→124,
     `Contacts` 150→59.
   - **Dashboard** 681→258 → six presentational organisms: `BalancesCard`, `ForecastCard`,
     `DashboardSubscriptions`, `CashflowCard`, `CategoryBreakdownCard`, `InsightsCard`
     (guards + the `wb-grid` layout stay in the entry, which passes derived props;
     `InsightsCard` also owns the `insightTiles`/`STEADINESS` presentation logic).
   - **Categories** 349→~50 → `CategoryEditor` + `Tree` (drag-reorder organism, clean
     `{type,onAddChild,onEdit}` interface, reads the store itself).
   `Transactions.tsx` was already the thin model. Entry files now hold state/derivation
   wiring + a composition of tier-2 components — no inline organism markup.

Known residuals the kit can't yet cover byte-identically (left hand-written on purpose):
`Settings`' `Section` uses `<section className="wb-card">` (kit `Card` renders a `<div>` —
would need an `as` prop); `CategorySelect`'s search `<input>` needs a `ref`, so it waits on
`kit/Input` gaining `forwardRef`; `SearchField`'s clear-`×` is a direct group child the kit
wraps differently. `wb-tab` / `wb-tag` / `wb-tree` / `wb-table` / `wb-stat` are their own
components, not Button/Card/Capsule.

Styling conventions: money cells use `.wb-num` (tabular, right-aligned). Design
tokens (colours, radii, typography, chart palette) are CSS custom properties on
`:root`, flipped for dark by a single `.dark` block. **CSS load order is
load-bearing**: `index.css` loads *before* `web-builder.css`, so app-level `wb-*`
overrides need raised specificity and dark `:hover` needs an explicit `.dark`
branch (architecture.md §8).

**Card composition (feature-leaf cards).** A card is a *composition of the `Card`
primitive*, not a bespoke `<div>`. Compose the primitive's semantic regions
(`wb-card__head` / `__body` / `__foot`) and express every bespoke rule through a
**named `cashy-*` class in `index.css`** — never a wall of inline `style`
(a lone dynamic value like `opacity` for an archived state is the only exception).
Sub-structures shared by two or more cards are extracted into **Cashy-aware
molecules in `ui/common/`** rather than duplicated: the icon-tile + name + subtitle
+ status header is `CardIdentity`; the caption + headline figure is `.cashy-cardfig`;
a meter + its note is `.cashy-cardmeter`; the reusable icon tile is `.cashy-subtile`
(hue via the `--cashy-sub-c` custom property). A card bound to a domain lives in
that domain's `ui/features/<domain>/` folder and is *reused* by any screen — the
Dashboard/Overview imports `SubscriptionCard` from `features/subscriptions/`, it is
not re-implemented per screen; only a card with no domain of its own belongs in a
screen's folder. `WalletCard`, `LoanCard`, and `ContactCard` compose
`CardIdentity`; `SubscriptionCard` keeps its specialised measured-name/trial
header but follows the same card-region conventions. A card's shared filter bar
is likewise composed, not re-implemented: `FacetChip`
(`ui/common/FacetChip.tsx`) is the one dropdown-chip the transaction, loan, and
subscription filters use — unselected chips wear a dashed outline, a chosen one
goes solid.

---

## 8. Invariants — break these and the app is *wrong*, not just messy

1. **Money is an integer count of VND.** No floats, no cents. Format/parse only via
   `domain/money`; every write coerces through `money.toVnd` / `toVndNonNeg` (one
   home for the rounding rule). Non-money display formatting (percent) lives in
   `domain/format`.
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
   `openingBalance` + the net of its `recorded` rows (`domain/wallet`). A wallet
   used by a transfer cannot be deleted (archive it); deleting any other wallet
   orphans ordinary rows to `null`, never deletes them.
9. **A loan is a first-class record, not a transaction.** Its `outstanding` is
   DERIVED — `max(0, principal − Σ payments)` (`domain/loan`), never stored — and
   interest (`interestRatePct`/`interestPeriod`) is REFERENCE-ONLY, never accrued.
   In net worth a `borrowed` loan subtracts and a `lent` loan adds (`loansNetWorth =
   receivable − payable`; the Dashboard shows assets − debts = `walletNet +
   loansNetWorth`). Loans touch NO transactions, categories, or analytics; amounts
   are integer VND like all money.
10. **Contacts currently hold identity only.** There is no `Loan.contactId` yet;
    `ContactPicker` is deliberate scaffolding and `isContactReferenced` deliberately
    returns false. Do not invent a partial link—adding it requires a persisted
    foreign key, migration, delete guard, editor wiring, tests, and doc updates in
    one slice.

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
- Grep a `wb-*` class in `web-builder.css` before using it. `EmptyState`, `Select`,
  and `Pagination` each have one canonical home in `ui/kit`; `ColorPicker` is the
  remaining intentional name collision with `ui/common`, so check that import.

### Handoff lifecycle (mandatory)

A handoff is a **temporary work queue**, not project documentation.

1. Create or retain a handoff only while work is genuinely unfinished. Every open
   item must say `OPEN`, name the owner/current state, define acceptance criteria,
   and give the next safe action.
2. When an item is completed, first move any durable knowledge into its canonical
   home: business behaviour → `docs/features/`, data contract → `data-model.md`,
   architecture/reuse rule → `architecture.md` or `components.md`, agent procedure
   → this file.
3. Then **delete the completed item**. If no open item remains, delete the handoff
   file itself and remove every link to it. Do not keep closed checklists or session
   notes “for history”; Git history already provides that archive.
4. If the reasoning remains valuable after the task closes, promote it to an
   explicit design record/ADR. A design record explains a durable decision; it is
   not a disguised completed handoff.

---

## 10. Docs index

| File | What |
|---|---|
| [README.md](README.md) | quickstart, commands, invariants, optional visual tuning |
| **CLAUDE.md** (this) | the AI map |
| [docs/architecture.md](docs/architecture.md) | **normative** for `src/` — layers, import matrix, procedures, traps |
| [docs/data-model.md](docs/data-model.md) | full data dictionary — entities, enums, relationships, derived values |
| [docs/components.md](docs/components.md) | component catalogue — tiers, props, screen→component map |
| [docs/features/](docs/features/) | **per-feature deep dives** — one doc per screen (overview, transactions, subscriptions, wallets, loans, contacts, categories, tags, settings, onboarding); see [features/README.md](docs/features/README.md) |
| [docs/cashy-web-spec.md](docs/cashy-web-spec.md) | **what actually ships** — the React web build: stack, features, and what's deliberately *not* here |
| [docs/cashy-vision.md](docs/cashy-vision.md) | product philosophy (timeless; native-iOS-flavoured) |
| [docs/cashy-v1-spec.md](docs/cashy-v1-spec.md) | v1 use-case spec (native-iOS-flavoured) |
| [docs/wallets-plan.md](docs/wallets-plan.md) | wallets **design record** (all five phases shipped; see [features/wallets.md](docs/features/wallets.md)) |
| [docs/loans-plan.md](docs/loans-plan.md) | loans (owe / owed) **design record** (all phases shipped; see [features/loans.md](docs/features/loans.md)) |
