# Cashy — architecture

Spec for anyone (human or agent) modifying `cashy/src`. Rules are normative:
MUST / MUST NOT are enforced by `pnpm check:layers`, which runs inside
`pnpm build`. Everything here is verifiable against the code.

---

## 1. Layers

Dependencies flow one way. There are no exceptions.

```
ui  ──▶  usecases  ──▶  domain
                   └─▶  data          lib is a leaf: every layer may import it
```

### 1.1 Import matrix

Rows = importer. `✓` allowed, `✗` rejected by the checker.

| from ↓ / to → | `domain` | `data` | `usecases` | `ui/kit` | `ui/**` | `lib` | `react` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `domain/`   | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `data/`     | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| `usecases/` | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| `ui/kit/`   | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ |
| `ui/**`     | ✓ | partial¹ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `lib/`      | `types` only² | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

1. `ui/**` may import **only** `@/data/store` and `@/data/draft`. From
   `@/data/store` the **only** permitted binding is `useCashy`. Importing
   `commit` or `getState` into `ui/**` is rejected.
2. `lib/` may import `@/domain/types` (type-only). `@/domain` and every other
   `@/domain/*` module is rejected.

### 1.2 Hard invariants

- **I1** — `domain/**` imports no React and no I/O. It is pure.
- **I2** — Every `domain` function taking "now" accepts it as a parameter with a
  default (`now: Date = new Date()`). Never read the clock inline.
- **I3** — `data/store.ts` holds no business rule. If a change requires a
  decision, that decision goes in `domain/`.
- **I4** — `ui/kit/**` knows nothing about Cashy. It is a generic design system.
- **I5** — Money is an integer count of VND everywhere. No floats, no cents.
- **I6** — Only `status: "recorded"` transactions count toward money totals
  (`domain/txStatus.isCounted`). A missing `status` means `"recorded"` (legacy rows).

Adding a rule to `check-layers.mjs`? Plant a violation, confirm it fails, remove
it. A guard that has never failed is not known to work.

---

## 2. File map

Where a given kind of code MUST live.

| Kind of code | Location | Test? |
|---|---|---|
| Business rule, calculation, predicate | `domain/<aggregate>.ts` | **required** |
| Shared type / entity shape | `domain/types.ts` | — |
| A thing the user can do (mutates state) | `usecases/<aggregate>.ts` | optional |
| localStorage, migration, seed, sample | `data/` | — |
| Generic UI primitive (no Cashy concepts) | `ui/kit/` | — |
| Cashy-aware shared component | `ui/common/` | — |
| Screen + its own components | `ui/features/<area>/` | — |
| App shell (Layout, ErrorBoundary) | `ui/app/` | — |
| Leaf utility with no layer allegiance | `lib/` | — |

```
src/
  domain/     types sort category tag transaction subscription analytics
              date period money txStatus · index.ts (barrel) · *.test.ts
  data/       store persistence migrations seed sample draft
  usecases/   workspace settings categories tags transactions subscriptions
  ui/kit/     wb-* design system (63 files)
  ui/common/  AmountDisplay CategoryCap StatusCap TagChip PeriodPicker …
  ui/app/     Layout ErrorBoundary
  ui/features/ dashboard transactions subscriptions categories tags
               settings onboarding
  ui/dev/     WbGallery — DEV only, code-split, reachable at #/wb
  lib/        id palette utils(cn) router theme toast confirm modals
```

Import a specific domain module (`@/domain/subscription`) when you need one
area; import the barrel `@/domain` only when a file genuinely spans several.

---

## 3. `domain/` — the rules

Pure. No React, no I/O. This is why the tests need no jsdom and no localStorage.

### 3.1 Subscription rules (the densest area)

A subscription **never books money on its own**. Each due cycle materialises a
`pending` transaction; only the user confirming it makes it `recorded`.

- **Cycle key is `"YYYY-MM"` for both intervals.** A yearly plan simply has one
  key per year. This is what lets `subMonth`, the dedup key and every existing
  ledger row carry yearly plans with no second code path. Do not introduce a
  different key shape.
- `dueCharges(subs, txs, now)` — the charges the ledger is missing. Walks from
  `firstUnpaidCycle`, **not** from `startedAt`, so a service subscribed a year
  ago does not backfill twelve months. Idempotent: a cycle that already carries
  a charge is never raised again. Safe to call on every mount.
- `paymentsOf(subId, txs)` — payment history read from the ledger. **This is the
  source of truth.** `Subscription.paymentTxIds` and `Subscription.lastPaidAt`
  are only a cache of it; `paymentsDrifted()` detects staleness. Any usecase that
  changes a charge's status MUST call `syncPayments`.
- `startCycle(sub)` — a yearly plan subscribed *after* its billing month starts
  next year, not in a month that already passed.
- `chargesSurvivingDeletion(txs, subId)` — deleting a subscription keeps its
  `recorded` charges (money spent was still spent) and drops pending/skipped.
- `needsPaymentNow` = a bill on the doormat. `isLapsed` = a whole cycle went by
  unpaid. They are different questions; do not conflate them.

### 3.2 Other aggregates

| Module | Owns |
|---|---|
| `category.ts` | tree walking, `canReparent` (no cycles), `reorderCategories` (returns full renumbered list or `null` for an illegal move), `nextOrder` |
| `transaction.ts` | `totals`, `filterTx`, `byRecency`, `orphanCategory` (deleting a category empties its transactions, never deletes them), `detachTag` |
| `tag.ts` | `rankTags` — order **and** ink shade by usage rank, not raw count |
| `analytics.ts` | `breakdown` (rolls children into root category), `walletSeries` (trims dead margins at both ends, keeps middle gaps), `periodInsights`, `monthlyNetRate`, `forecastSeries` |

---

## 4. `usecases/` — the sequencing

A usecase: read state → ask `domain` for the next state → `commit`. Nothing else.

```ts
export function syncSubscriptions(): void {
  const state = getState();
  const now = new Date();
  const fresh = dueCharges(state.subscriptions, state.transactions, now)
    .map((c) => ({ ...c, id: uid(), createdAt: now.toISOString() }));
  if (fresh.length) commit({ ...state, transactions: [...fresh, ...state.transactions] });
}
```

**Boundary test:** if a usecase grows because it is *deciding* rather than
*sequencing*, the decision belongs in `domain/`.

Inventory:

| Module | Exports |
|---|---|
| `workspace.ts` | `createWorkspace` `loadSampleData` `updateWorkspace` `resetAll` `exportData` `importData` |
| `settings.ts` | `setTheme` `setSubIconStyle` |
| `categories.ts` | `addCategory` `updateCategory` `deleteCategory` `reorderCategory` |
| `tags.ts` | `addTag` `updateTag` `deleteTag` |
| `transactions.ts` | `addTransaction` `updateTransaction` `deleteTransaction` |
| `subscriptions.ts` | `addSubscription` `updateSubscription` `setSubscriptionActive` `deleteSubscription` `syncSubscriptions` `syncPayments` `confirmSubscriptionCharge` `confirmSubscriptionCharges` `skipSubscriptionCharge` `revertSubscriptionCharge` |

**Cross-usecase direction:** `transactions.ts` → `subscriptions.ts` only
(deleting a charge invalidates its owner's history). The reverse is forbidden;
`subscriptions.ts` commits directly to avoid an import cycle.

Batch semantics: `confirmSubscriptionCharges` commits **once** for N charges, so
a multi-month catch-up is a single undoable step, not N steps.

---

## 5. `ui/` — reading and writing

- **Read:** `useCashy()` from `@/data/store`.
- **Write:** call a usecase. Never `commit()` / `getState()`.

### 5.1 Component contract

| Tier | Examples | Contract |
|---|---|---|
| **Leaf** | `SubscriptionCard` `TransactionTable` `SubscriptionDues` | Receives data + callbacks via props. MUST NOT import `usecases` or `data`. Renders in `ui/dev/WbGallery` and in tests with no app behind it. |
| **Container / screen** | `Dashboard` `Subscriptions` `Transactions` `Categories` | Calls `useCashy()` and usecases; passes callbacks down. |
| **Singleton modal** | `TransactionEditor` `SubscriptionEditor` `TransactionDetail` | A container. Calls usecases; registers its open handler via `lib/modals`. |

Do **not** prop-drill beyond the leaf tier — containers calling usecases directly
is intended, not a violation.

### 5.2 Control flow of one action

```
click "Đã trả"
└─ SubscriptionCard            → props.onConfirmCharges([txId])      (leaf: no store)
   └─ Subscriptions.tsx        → confirmSubscriptionCharges([txId])  (container)
      └─ usecases/subscriptions
         ├─ getState()
         ├─ commit({…})        → data/store → data/persistence → localStorage
         └─ syncPayments(subId)
            └─ domain/subscription.paymentsOf()      ← the rule
               └─ paymentsDrifted() → update only when actually stale
└─ useSyncExternalStore wakes every component reading state
```

---

## 6. Procedures

### 6.1 Add a business rule
1. Write it in `domain/<aggregate>.ts` as a pure function; inject `now` if needed.
2. Add cases to `domain/<aggregate>.test.ts` — including the boundary and the
   "does nothing" case.
3. Call it from a usecase. Do not inline the rule at the call site.

### 6.2 Add a user action
1. `usecases/<aggregate>.ts`, exported from `usecases/index.ts` via the barrel.
2. If it changes a charge's status → call `syncPayments`.
3. Screens import from `@/usecases`.

### 6.3 Change persisted data shape
1. Bump `CURRENT_VERSION` in `data/migrations.ts`.
2. Add a new `if (fromVersion < N)` branch. **Never edit an existing branch** —
   real data has already passed through it.
3. Update `domain/types.ts`.
4. Migrations are pure functions of `(state, fromVersion)`; they may call
   `domain` but not a usecase.

### 6.4 Add a UI primitive
Generic → `ui/kit/` + export from `ui/kit/index.ts`. Cashy-aware → `ui/common/`.

---

## 7. Commands

| Command | Effect |
|---|---|
| `pnpm dev` | dev server, `http://localhost:5173` |
| `pnpm test` / `pnpm test:watch` | vitest (61 tests over `domain/`) |
| `pnpm check:layers` | enforce §1 |
| `pnpm build` | `tsc -b` → `check:layers` → vite build → `dist/` (base `/cashy/`) |
| `pnpm build:wb` | gallery only → `dist-wb/` (base `/cashy-wb/`) |
| `pnpm lint` | oxlint |

`pnpm build` fails on a layering violation. That is deliberate.

---

## 8. Known traps

- **CSS order.** `main.tsx` loads `index.css` **before** `web-builder.css`. Any
  app-level `wb-*` override needs raised specificity
  (`.wb-btn.cashy-btn--quiet-danger`), and `:hover` in dark needs an explicit
  `.dark` branch — `.dark .wb-btn--ghost:hover` is also 0-3-0 and loads later.
- **`data/store.ts` runs `load()` at import time.** Importing it touches
  localStorage immediately. Never import it from a test; test `domain/` instead.
- **Two `Pagination` components exist**: `ui/kit/Pagination.tsx` (generic) and
  `ui/features/transactions/Pagination.tsx`. Check the path before editing.
- **`ui/common/` and `ui/kit/` both export `EmptyState` / `ColorPicker` /
  `Select`.** They are different components. Check the import path.
