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
| `version` | `number` | Schema version of this snapshot | Drives migrations. Current = **5**. On load it is forced to `CURRENT_VERSION` and the old value passed to `migrate()`. |
| `theme` | `ThemeMode` | UI colour scheme | `"system" \| "light" \| "dark"`; default `"system"`. |
| `subIconStyle` | `SubIconStyle` | How subscription icon tiles are coloured | `"neutral"` (default, grey) \| `"brand"` (service hue). |
| `workspace` | `Workspace \| null` | The profile; `null` = not yet onboarded | Non-null but empty ledger ⇒ `load()` re-seeds the demo data. |
| `categories` | `Category[]` | Category tree (self-referencing) | |
| `tags` | `Tag[]` | Flat tag list | |
| `transactions` | `Transaction[]` | **The ledger — the single source of truth for money** | |
| `subscriptions` | `Subscription[]` | Recurring services | Carry cache fields re-derived from `transactions`. |

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
| `account?` | `string` | **Optional.** "Paid with" card/account/wallet — free text | Deliberate stepping stone to a future `accountId` multi-wallet model. |
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

---

## 2. Enums & unions

| Type | Values | Meaning |
|---|---|---|
| `TxType` | `income` / `expense` | Flow direction; `expense` subtracts, `income` adds |
| `ThemeMode` | `system` / `light` / `dark` | UI theme; `system` follows OS |
| `SubIconStyle` | `neutral` / `brand` | Sub icon tile colour: `neutral` grey (default), `brand` = service hue |
| `SubInterval` | `monthly` / `yearly` | Billing frequency |
| `TxStatus` | `recorded` / `pending` / `awaiting` / `skipped` / `failed` | Lifecycle (below) |

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
```

- `Transaction.categoryId` → `Category.id` (nullable). Category delete re-points rows
  to `null`, never deletes them.
- `Transaction.tagIds[]` → `Tag.id` (many-to-many). Tag delete strips the id from every row.
- `Transaction.subscriptionId` → `Subscription.id` + `subMonth` (`"YYYY-MM"`). The pair
  `(subscriptionId, subMonth)` is the **uniqueness/dedup key** that makes `dueCharges` idempotent.
- `Subscription.categoryId` / `tagIds` / `account` are **inherited** (copied) onto each
  generated charge.

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

---

## 5. Persistence

- **State key:** `localStorage["cashy_state_v1"]` — JSON of the whole `CashyState`.
- **Draft key:** `localStorage["cashy_tx_draft_v1"]` — JSON of `TxDraft`, separate lifecycle.
- **Save:** `commit(next)` in `data/store.ts` replaces the in-memory cell, persists, notifies.
- **Load** (`data/persistence.ts`): missing/corrupt → empty state; else parse, merge over an
  empty state, force `version = CURRENT_VERSION`, run `migrate(next, fromVersion)`, re-save.
  A workspace that opens with an **empty ledger** is re-seeded with the demo dataset (only an
  empty ledger — real data is never overwritten).

**Migrations** (`data/migrations.ts`, `CURRENT_VERSION = 5`), **append-only** ascending
`if (fromVersion < N)` blocks: v2 recolor onto the chart palette · v3 `startMonth` → real
`startedAt` + back-fill `lastPaidAt` · v4 back-fill `paymentTxIds` · v5 back-fill
`interval = "monthly"`.

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
