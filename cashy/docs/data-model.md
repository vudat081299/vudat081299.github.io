# Cashy — data model

The complete data dictionary. Source of truth for the shapes is
[`src/domain/types.ts`](../src/domain/types.ts); the rules that read/write them
live in `src/domain/**` and `src/data/**`. Money is **always an integer count of
Vietnamese đồng (VND)** — never a float.

See also: [architecture.md](architecture.md) (layers), [components.md](components.md)
(who renders these), [../CLAUDE.md](../CLAUDE.md) (the map).

---

## 1. Persisted entities

### 1.1 `CashyState` — the root/workspace object
The single object serialized to `localStorage`. `types.ts` · built empty in
`data/persistence.ts`.

| Field | Type | Meaning | Notes |
|---|---|---|---|
| `version` | `number` | Schema version of this snapshot | Drives migrations. Current = **7**. On load it is forced to `CURRENT_VERSION` and the old value passed to `migrate()`. |
| `theme` | `ThemeMode` | UI colour scheme | `"system" \| "light" \| "dark"`; default `"system"`. |
| `subIconStyle` | `SubIconStyle` | How subscription icon tiles are coloured | `"neutral"` (default, grey) \| `"brand"` (service hue). |
| `workspace` | `Workspace \| null` | The profile; `null` = not yet onboarded | Non-null but empty ledger ⇒ `load()` re-seeds the demo data. |
| `categories` | `Category[]` | Category tree (self-referencing) | |
| `tags` | `Tag[]` | Flat tag list | |
| `transactions` | `Transaction[]` | **The ledger — the single source of truth for money** | |
| `subscriptions` | `Subscription[]` | Recurring services | Carry cache fields re-derived from `transactions`. |
| `wallets` | `Wallet[]` | Spending wallets / accounts (added **v6**) | Balances are DERIVED from the ledger, never stored. Schema live; UI pending — see [wallets-plan.md](wallets-plan.md). |
| `loans` | `Loan[]` | Debts you owe / money owed to you (added **v7**) | First-class records — **not** wallets, **not** transactions. Outstanding is DERIVED (`principal` − payments), never stored. See [features/loans.md](features/loans.md) · [loans-plan.md](loans-plan.md). |

### 1.2 `Workspace`
| Field | Type | Meaning |
|---|---|---|
| `displayName` | `string` | User's display name |
| `currency` | `string` | Currency code — always `"VND"` in practice |
| `createdAt` | `string` | ISO timestamp |

### 1.3 `Category` — self-referencing tree, unlimited depth
| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | |
| `parentId` | `string \| null` | FK → parent `Category.id`; `null` = root | Descendants via `descendantIds`. |
| `order` | `number` | Sort position among siblings | Renumbered by `reorderCategories`; next value from `nextOrder`. |
| `name` | `string` | Display name | |
| `colorHex` | `string` | Category hue | One hue per ROOT; children inherit. Rendered grey in the app; hue drives the donut/ranked bars. |
| `icon` | `string` | Curated lucide icon key | See `ui/kit/icon-map.ts`. |
| `type` | `TxType` | `income` or `expense` | A category is scoped to one flow direction. |
| `isSystem` | `boolean` | Built-in/system category | Seeded categories set this `false`. |

### 1.4 `Tag` — flat label (many-to-many with transactions)
| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | |
| `name` | `string` | Display name | |
| `colorHex` | `string` | Stored hue | Largely **unused for display** — tags render on a grey rank scale (`shade`) via `rankTags`, not this hue. |
| `createdAt` | `string` | ISO timestamp | |

### 1.5 `Transaction` — the ledger row (source of truth for all money)
| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | |
| `amount` | `number` | Magnitude in **integer VND, ≥ 0** | Sign is implied by `type`, never stored negative. |
| `type` | `TxType` | `income` \| `expense` | |
| `categoryId` | `string \| null` | FK → `Category.id`; one or none | Set to `null` (not deleted) when its category is removed (`orphanCategory`). |
| `tagIds` | `string[]` | FK list → `Tag.id`; 0..n | Tag removal strips the id (`detachTag`). |
| `note` | `string` | Free-text note | The only field `TxFilter.search` matches. |
| `payee?` | `string` | **Optional.** Counterparty / merchant / source | Subscription charges set it to `"Subscription · <Mon YYYY>"`. |
| `account?` | `string` | **Optional.** "Paid with" card/account/wallet — free text | The stepping stone `walletId` now supersedes; kept intact (append-only). |
| `walletId?` | `string \| null` | **Optional FK → `Wallet.id`** — the wallet the money sits in / moves FROM | Added **v6**. `null`/absent = unassigned. |
| `toWalletId?` | `string` | **Optional.** Present ⇒ the row is a **transfer** to this wallet | Moves `amount` from `walletId` here; counts toward NO income/expense total — only balances (`domain/wallet.isTransfer`). |
| `status?` | `TxStatus` | **Optional.** Lifecycle | **`undefined` ⇒ `"recorded"`** (legacy rows). Always read via `statusOf`. |
| `occurredAt` | `string` | Event date **`YYYY-MM-DD`** | Sole basis of every date comparison/range filter. |
| `occurredTime?` | `string` | **Optional.** Clock time `"HH:mm"` | Absent = "some time that day". Never used in date maths. |
| `createdAt` | `string` | Entry ISO timestamp | Tie-breaker in recency sort. |
| `subscriptionId?` | `string` | **Optional FK → `Subscription.id`** | Present ⇒ the row is a subscription cycle charge. |
| `subMonth?` | `string` | **Optional** cycle key `"YYYY-MM"` | With `subscriptionId` forms the dedup key `` `${subscriptionId}\|${subMonth}` ``. |

### 1.6 `Subscription` — recurring service (books no money by itself)
| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | |
| `name` | `string` | Service name | Copied to each charge's `note`. |
| `amount` | `number` | **YOUR share**, integer VND **per BILLING CYCLE** | Not normalised to a month. For a shared plan this is your split. |
| `interval` | `SubInterval` | `monthly` \| `yearly` | Added in v5 (back-filled to `monthly`). |
| `dayOfMonth` | `number` | Billing day `1..31` | Clamped to month length by `billingDate`. |
| `monthOfYear?` | `number` | **Optional** billing month `1..12` | Only meaningful for yearly plans. |
| `categoryId` | `string \| null` | FK → `Category.id` | Inherited onto each charge. |
| `tagIds` | `string[]` | FK list → `Tag.id` | Inherited onto each charge. |
| `colorHex` | `string` | Service hue | |
| `icon` | `string` | Curated lucide key | |
| `note` | `string` | Free-text note | |
| `account?` | `string` | **Optional** "Paid with" | Inherited onto each cycle charge. |
| `walletId?` | `string \| null` | **Optional FK → `Wallet.id`** (added **v6**) | Inherited onto each cycle charge, like `account`. |
| `active` | `boolean` | `false` = paused (no new charges, history kept) | Gates dues/commitment/needsPayment. |
| `startedAt` | `string` | Subscribe date `"YYYY-MM-DD"` | Nothing before it is charged. |
| `lastPaidAt` | `string \| null` | **CACHE.** Date of most recent confirmed payment | Re-derived by `paymentsOf`. |
| `paymentTxIds` | `string[]` | **CACHE.** Every `recorded` charge that paid this sub, oldest first | Re-derived by `paymentsOf`; drift detected by `paymentsDrifted`. |
| `fullAmount?` | `number` | **Optional** whole-plan price per cycle (shared plans) | Omitted for solo plans (then `amount` IS the full price). |
| `members?` | `number` | **Optional** people splitting the plan (incl. you, ≥ 2) | Omitted for solo plans. |
| `firstCycleAmount?` | `number` | **Optional** prorated smaller FIRST-cycle charge | Applied only to the first cycle. |
| `trialMonths?` | `number` | **Optional** free-trial length in whole months from `startedAt` | No charge raised during trial; boundary exclusive. `0`/omitted = billed from cycle 1. |
| `cancelledAt?` | `string` | **Optional** effective stop date `"YYYY-MM-DD"` | Set on cancel; prunes pending cycles ≥ this date; cleared on resume. |
| `createdAt` | `string` | Creation ISO timestamp | |

### 1.7 `TxDraft` — the half-typed new transaction (SEPARATE store)
`data/draft.ts`. **Not** part of `CashyState` and **not** a `Transaction` — it holds
raw form fields (`amountStr` is text) under its own key `localStorage["cashy_tx_draft_v1"]`,
persisted only until the user commits or clears it. Fields mirror the editor:
`type, amountStr, categoryId, tagIds, occurredAt, occurredTime, note, payee, account, status`.
A draft with every meaningful field empty is treated as blank and dropped (`isBlankDraft`).
Also carries an optional `walletId` (mirrors the editor).

### 1.8 `Wallet` — a spending account / wallet (added v6)
Where money sits: cash, a bank account, an e-wallet, a card. A transaction moves
through one wallet (`walletId`); a transfer moves between two (`walletId` →
`toWalletId`). Rules in `domain/wallet.ts`. **Schema is live; there is no wallet UI
yet** — see [wallets-plan.md](wallets-plan.md).

| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | |
| `name` | `string` | Display name | "Techcombank Visa", "MoMo", "Tiền mặt" |
| `kind` | `WalletKind` | Classification | Open union — v1 uses the spending kinds. |
| `openingBalance` | `number` | Integer VND **before** the ledger starts | May be **negative** (a card in debt). |
| `colorHex` | `string` | Classification hue | Rendered grey; hue is an accent only. |
| `icon` | `string` | Curated lucide key | `walletIcon(kind)` by default. |
| `order` | `number` | Sort position among wallets | |
| `archived` | `boolean` | `true` = hidden from pickers, history kept | Excluded from `netWorth` by default. |
| `createdAt` | `string` | ISO timestamp | |

**Current balance** = `openingBalance` + net of the wallet's *recorded* rows
(`domain/wallet.walletBalance`). **Net worth** (v1 scope) = Σ non-archived wallet
balances (`netWorth`). Both derived at runtime, never persisted.

### 1.9 `Loan` — a debt you owe / money owed to you (added v7)
A **first-class record — not a wallet and not a transaction.** It carries the
counterparty, the source, an interest rate and a due date (`hạn trả`); the
outstanding balance is DERIVED (`principal` minus its payments, floored at 0) and
interest is stored for display / reminders only, **never accrued**. Loans reference
no other entity and touch no transactions, categories, tags or analytics — their
only cross-cutting figure is the Dashboard net worth. Rules in `domain/loan.ts`.
See [features/loans.md](features/loans.md) · [loans-plan.md](loans-plan.md).

| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | |
| `direction` | `LoanDirection` | Which side you're on | `borrowed` = money I owe (a liability) \| `lent` = money owed to me (a receivable). Sets which way it hits net worth. |
| `counterparty` | `string` | The other party | The lender when `borrowed`, the borrower when `lent`. |
| `source` | `LoanSource` | Classification | `personal \| card \| bank \| other` — **open union** like `WalletKind`. |
| `principal` | `number` | Original amount, **integer VND, > 0** | The amount borrowed / lent. |
| `interestRatePct` | `number` | Annual / monthly interest % | **Display + reminders ONLY, never accrued.** `0` = interest-free. |
| `interestPeriod` | `InterestPeriod` | What the rate is quoted over | `year` \| `month`. |
| `openedAt` | `string` | Opened date **`YYYY-MM-DD`** | When the loan was taken out / given. |
| `dueAt` | `string \| null` | Due date **`YYYY-MM-DD`** (`hạn trả`) | `null` = open-ended, no fixed date. |
| `payments` | `LoanPayment[]` | Manual repayment / collection log | See `LoanPayment` below. |
| `colorHex` | `string` | Classification hue | Rendered grey; hue is an accent only. |
| `icon` | `string` | Curated lucide key | `loanSourceIcon(source)` by default. |
| `note` | `string` | Free-text note | |
| `archived` | `boolean` | `true` = closed/hidden, history kept | Dropped from net worth by default. |
| `createdAt` | `string` | ISO timestamp | |

**`LoanPayment`** — one manual repayment (on a `borrowed` loan) or collection (on a
`lent` loan). Cashy tracks the money by hand rather than generating a schedule.

| Field | Type | Meaning |
|---|---|---|
| `id` | `string` | Primary key |
| `amount` | `number` | Integer VND, **> 0** |
| `date` | `string` | `YYYY-MM-DD` |
| `note` | `string` | Free-text note |

**Outstanding** = `max(0, principal − Σ payments.amount)` (`domain/loan.loanOutstanding`)
— never stored, never negative (overpayment reads as paid-in-full). A `borrowed`
loan's outstanding **subtracts** from net worth, a `lent` loan's **adds**
(`loanNetWorthDelta`, `loansNetWorth`). Interest is reference-only: `interestRatePct`
never moves the balance.

---

## 2. Enums & unions

| Type | Values | Meaning |
|---|---|---|
| `TxType` | `income` / `expense` | Flow direction; `expense` subtracts, `income` adds |
| `ThemeMode` | `system` / `light` / `dark` | UI theme; `system` follows OS |
| `SubIconStyle` | `neutral` / `brand` | Sub icon tile colour: `neutral` grey (default), `brand` = service hue |
| `SubInterval` | `monthly` / `yearly` | Billing frequency |
| `TxStatus` | `recorded` / `pending` / `awaiting` / `skipped` / `failed` | Lifecycle (below) |
| `WalletKind` | `cash` / `bank` / `ewallet` / `card` / `other` | Wallet classification; **open union** (future net-worth: savings/investment/asset/liability) |
| `LoanDirection` | `borrowed` / `lent` | Which side of a loan you're on: `borrowed` = a liability (money you owe), `lent` = a receivable (money owed to you) |
| `LoanSource` | `personal` / `card` / `bank` / `other` | Where a loan came from / went to; **open union** like `WalletKind` |
| `InterestPeriod` | `year` / `month` | The period `interestRatePct` is quoted over; reference / display only, never accrued |

**`TxStatus` meanings & whether counted** (`domain/txStatus.ts`):

| Value | Meaning | Label | Counts toward totals? | Tone |
|---|---|---|:--:|---|
| `recorded` | Done & counted — **the ONLY status that hits totals** | "Recorded" | ✅ | success (green) |
| `pending` | Subscription charge awaiting the user's confirm | "Awaiting you" | ❌ | warning (amber) |
| `awaiting` | Settled by another party — transfer/investment in flight | "In flight" | ❌ | info (blue) |
| `skipped` | Cancelled/skipped this cycle | "Skipped" | ❌ | neutral (grey) |
| `failed` | Payment failed | "Failed" | ❌ | danger (red) |

`isCounted(tx)` gates every aggregate. **`PeriodKey`** (analytics windows, `domain/period.ts`):
`this-month | last-month | 30d | 60d | 90d | 2m | 3m | this-year | all | custom`.

---

## 3. Relationships (ER-style)

```
Workspace (0..1)                          — profile only, no FK links

Category ──parentId──▶ Category           (self-ref tree, unlimited depth; null = root)
Category  1 ──◀ categoryId  N  Transaction   (nullable; orphaned → null on delete)
Category  1 ──◀ categoryId  N  Subscription  (nullable; inherited onto charges)

Tag  M ──◀ tagIds ▶ N  Transaction        (many-to-many; array of ids)
Tag  M ──◀ tagIds ▶ N  Subscription       (many-to-many; inherited onto charges)

Subscription 1 ──◀ subscriptionId N Transaction   (a "charge"; also carries subMonth)
Subscription.paymentTxIds  ──▶ Transaction.id     (CACHE: the recorded charges)

Wallet   1 ──◀ walletId  N  Transaction    (nullable; deleting a wallet orphans rows to null, never deletes)
Wallet   1 ──◀ walletId  N  Subscription   (nullable; inherited onto charges)
Transaction.toWalletId ──▶ Wallet          (set only on a transfer — the destination wallet)

Loan (0..n)                               — first-class record; references NO other entity
```

- `Transaction.categoryId` → `Category.id` (nullable). Category delete re-points rows
  to `null`, never deletes them.
- `Transaction.tagIds[]` → `Tag.id` (many-to-many). Tag delete strips the id from every row.
- `Transaction.subscriptionId` → `Subscription.id` + `subMonth` (`"YYYY-MM"`). The pair
  `(subscriptionId, subMonth)` is the **uniqueness/dedup key** that makes `dueCharges` idempotent.
- `Subscription.categoryId` / `tagIds` / `account` are **inherited** (copied) onto each
  generated charge.
- `Loan` links to **no** other entity — loans touch no transactions, categories, tags or
  analytics. The only cross-cutting figure they feed is the **Dashboard net worth**
  (assets − debts): a `borrowed` loan's outstanding is a debt, a `lent` loan's a receivable.

**Source of truth vs. cache**
- **Source of truth:** `transactions` (the ledger). All money, all payment facts.
- **Cache, re-derived from the ledger:** `Subscription.paymentTxIds` and `lastPaidAt`
  (both from `paymentsOf`). Kept in step on every confirm/skip/undo/delete.
- **Derived at runtime, never persisted:** due/lapsed/owed state, next-payment date,
  dues, totals, breakdowns, cash-flow series, insights, forecasts.

---

## 4. Key derived / computed values

| Value | Produced by | Module |
|---|---|---|
| Income / expense / net totals | `totals(txs)` | `transaction.ts` |
| Filtered ledger | `filterTx(txs, f)` | `transaction.ts` |
| Category donut slices (rolled up to root) | `breakdown`, `foldTailSlices` | `analytics.ts` |
| % change vs prior period | `pctChange` | `analytics.ts` |
| Cash-flow bars + running balance | `walletSeries` | `analytics.ts` |
| Period insights (savings rate, steadiness, top category, projection) | `periodInsights` | `analytics.ts` |
| Monthly net rate / balance forecast | `monthlyNetRate`, `forecastSeries` | `analytics.ts` |
| Tag ranks + grey shades | `rankTags`, `tagRankMap` | `tag.ts` |
| Subscription status (pending list, next date, spent) | `subscriptionStatus` | `subscription.ts` |
| Due charges to raise (idempotent) | `dueCharges` | `subscription.ts` |
| All pending dues across subs | `collectDues` | `subscription.ts` |
| Needs-payment-now / lapsed / cycles owed | `needsPaymentNow`, `isLapsed`, `cyclesOwed` | `subscription.ts` |
| Payment history (the cache values) | `paymentsOf`, `paymentsDrifted` | `subscription.ts` |
| Monthly committed spend (yearly ÷12) | `monthlyCommitment` | `subscription.ts` |
| First-cycle proration | `firstCycleProration` | `subscription.ts` |
| Catch-up plan (pay/skip/cancel, oldest-first) | `planCatchUp` | `subscription.ts` |
| Ledger after cancel / delete | `chargesSurvivingCancel`, `chargesSurvivingDeletion` | `subscription.ts` |
| Wallet balances + net worth | `walletBalance`, `walletBalances`, `netWorth` | `wallet.ts` |
| Is-a-transfer predicate | `isTransfer` | `wallet.ts` |
| Loan outstanding / paid / progress | `loanOutstanding`, `loanPaid`, `loanProgress`, `isPaidOff` | `loan.ts` |
| Loan net-worth delta + totals payable/receivable | `loanNetWorthDelta`, `totalPayable`, `totalReceivable`, `loansNetWorth` | `loan.ts` |
| Loan due / overdue status | `loanStatus`, `daysUntilDue`, `isOverdue` | `loan.ts` |

---

## 5. Persistence

- **State key:** `localStorage["cashy_state_v1"]` — JSON of the whole `CashyState`.
- **Draft key:** `localStorage["cashy_tx_draft_v1"]` — JSON of `TxDraft`, separate lifecycle.
- **Save:** `commit(next)` in `data/store.ts` replaces the in-memory cell, persists, notifies.
- **Load** (`data/persistence.ts`): missing/corrupt → empty state; else parse, merge over an
  empty state, force `version = CURRENT_VERSION`, run `migrate(next, fromVersion)`, re-save.
  A workspace that opens with an **empty ledger** is re-seeded with the demo dataset (only an
  empty ledger — real data is never overwritten).

**Migrations** (`data/migrations.ts`, `CURRENT_VERSION = 7`), **append-only** ascending
`if (fromVersion < N)` blocks: v2 recolor onto the chart palette · v3 `startMonth` → real
`startedAt` + back-fill `lastPaidAt` · v4 back-fill `paymentTxIds` · v5 back-fill
`interval = "monthly"` · v6 distinct free-text `account` strings → `Wallet` entities +
`walletId` links (account kept intact) · v7 ensure `state.loans` exists (defaults to `[]`)
— loans are brand new, so there is nothing to transform. **Import** runs the same
`migrate()` so an older export is brought forward, not stamped current unmigrated.

**Export** (`workspace.exportData`) now serializes `wallets` **and** `loans` too (it
previously omitted wallets); on import both back-fill to `[]` when an older export lacks them.

**Seed vs. sample**
- `data/seed.ts` — `seedCategories()`: the default category tree a new workspace starts with
  (Vietnamese names; one bright hue per root).
- `data/sample.ts` — `buildSampleData()` / `buildSampleSubscriptions()`: a ~200-row demo ledger
  (Jan 2026 → today) + ~20 demo subscriptions covering every payment state. Seeded data is
  deliberately Vietnamese; the UI chrome is English.

---

## 6. Data-touching invariants

1. **Money = integer VND, never a float** (`amount ≥ 0`; sign implied by `type`). Format/parse only via `money.ts`.
2. **Only `recorded` rows count** toward totals (`isCounted`/`statusOf`).
3. **Missing status ⇒ `recorded`** (legacy rows).
4. **Cycle key is `"YYYY-MM"` for both intervals** (a yearly plan = one key per year).
5. **`(subscriptionId, subMonth)` is unique per charge** — makes `dueCharges` idempotent.
6. **`paymentTxIds` / `lastPaidAt` are caches** re-derived from the ledger, never authoritative.
7. **Category delete orphans rows to `null`, never deletes them.**
8. **Recorded subscription charges always survive** cancellation and deletion; only pending/skipped are pruned.
9. **Migrations are append-only.**
10. **Dates are `YYYY-MM-DD` strings** compared lexicographically; range/period logic works off `occurredAt` alone.
11. **A workspace never opens on an empty ledger** — empty ledgers are auto-seeded.
12. **Debts settle oldest-first** (catch-up rejects paying a later cycle while an older used cycle is unpaid).
13. **A row with `toWalletId` is a transfer** — excluded from every income/expense/breakdown total; only the two wallet balances it touches move.
14. **Wallet balance = `openingBalance` + net of its recorded rows**; deleting a wallet orphans rows' `walletId` to `null`, never deletes them.
15. **A loan's outstanding is DERIVED** — `max(0, principal − Σ payments.amount)`; never stored, never negative (overpayment reads as paid-in-full).
16. **Loan interest is reference-only** — `interestRatePct` never changes the outstanding balance; Cashy never accrues interest or generates a schedule.
17. **A `borrowed` loan's outstanding subtracts from net worth; a `lent` loan's adds** — archived loans drop out by default.
18. **Money stays an integer count of VND** for a loan's `principal` and every `LoanPayment.amount`.
