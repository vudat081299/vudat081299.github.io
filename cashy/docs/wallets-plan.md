# Cashy — Wallets & assets (feature plan)

> **Status:** PLAN (not built). Awaiting owner go-ahead per phase.
> **Owner:** Đạt · **Drafted:** 2026-07-23 · **Target:** the next feature after the
> docs/i18n pass.
>
> This turns the free-text **"Paid with"** field (`Transaction.account` /
> `Subscription.account`) into a real **wallet model** — the "future `accountId`"
> the data model has been pointing at (`data-model.md §1.5`, `types.ts`,
> `cashy-v1-spec.md §6 "Tại sao bỏ Wallet entity v1?"`). Read
> [CLAUDE.md](../CLAUDE.md) and [architecture.md](architecture.md) first; every
> rule here obeys the layer + invariant contract already in force.

---

## 1. Scope (decided)

| Decision | Choice |
|---|---|
| **What a "wallet" is in v1** | **Spending wallets** — cash / bank / e-wallet / card. Each transaction moves through one wallet; each wallet has a running balance. Schema is **extensible** so savings / investment / asset / liability accounts (full net-worth) can be layered on later **without another migration**. |
| **Transfers between wallets** | **First-class.** A transfer moves money from one wallet to another and counts toward **neither** income nor expense — only balances. |
| **Balance model** | **Opening balance per wallet.** Current balance = `openingBalance` + net of its recorded rows. Net worth (v1 scope) = Σ wallet balances. |
| **Existing data** | **Auto-migrate.** Distinct `account` strings become real `Wallet`s; every tx/sub that carried that string is linked by `walletId`. No data destroyed. |

Out of scope for v1 (kept in mind for the schema): multi-currency, valuations over
time, savings-goal tracking, debt payoff schedules, per-wallet statements/export.

Everything here honours the house taste: **wallets render neutral/grey**; a wallet's
`colorHex` is a classification hue used only on its tile/chart accents, never as
decoration (same rule as categories & tags).

---

## 2. Data model additions

### 2.1 New entity — `Wallet`

Added to `CashyState` as `wallets: Wallet[]`.

| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | `lib/id.uid()` |
| `name` | `string` | Display name | "Techcombank Visa", "MoMo", "Cash" |
| `kind` | `WalletKind` | Classification | v1: `cash \| bank \| ewallet \| card \| other`. **Open union by design** — `savings \| investment \| asset \| liability` slot in later for net-worth. |
| `openingBalance` | `number` | Integer VND balance **before** the ledger starts | May be **negative** (a card that opens in debt). This is the only field that lets balances be real numbers, not relative. |
| `colorHex` | `string` | Classification hue | Rendered grey in the app; hue drives its tile accent / any per-wallet chart. |
| `icon` | `string` | Curated lucide key | `ui/kit/icon-map.ts`, like Category/Subscription. |
| `order` | `number` | Sort among wallets | `nextOrder` / renumbered on reorder, mirroring `Category`. |
| `archived` | `boolean` | `true` = hidden from pickers, history kept | Mirrors `Subscription.active` semantics (never delete history). |
| `createdAt` | `string` | ISO timestamp | |

`WalletKind` extension note lives in the type doc-comment so no one "closes" the
union. v1 UI only offers the five spending kinds.

### 2.2 `Transaction` — two new optional fields

```ts
// added to Transaction (both OPTIONAL — legacy rows have neither):
walletId?: string | null;  // FK → Wallet.id; the wallet the money sits in / moves FROM.
                           // null/absent = unassigned (legacy, or a row the user left blank).
toWalletId?: string;       // present ⇒ this row is a TRANSFER; the destination wallet.
```

- **`type` stays `TxType` (`income | expense`)** and unchanged — `Category.type`
  keeps sharing it. We do **not** widen `TxType` (a "transfer" category would be
  nonsense).
- **A transfer is any row with `toWalletId` set.** It moves `amount` from `walletId`
  to `toWalletId`. Its `type` is a don't-care stored as `"expense"` by convention and
  **never summed** — the transfer predicate is checked first everywhere. A transfer
  has **no category** (`categoryId: null`); tags are still allowed.
- `account?` is **kept** (append-only philosophy — we never delete a field data went
  through). After migration it is frozen: `walletId` is the source of truth and new
  writes stop setting `account`.

### 2.3 `Subscription` — one new field

```ts
walletId?: string | null;  // FK → Wallet.id; the wallet that pays this sub.
                           // Inherited onto each generated cycle charge (like `account` was).
```

`account?` kept and frozen, same as the transaction case.

### 2.4 `TxDraft` — mirror the editor

`data/draft.ts` gains `walletId: string | null` (and, when the editor's Transfer mode
lands, `toWalletId: string | null`), so a half-typed transfer survives a reload like
every other field.

---

## 3. New / changed invariants

Add to the invariant list (CLAUDE.md §8 / data-model.md §6):

1. **A row with `toWalletId` set is a transfer.** It counts toward **no** income or
   expense total — only toward the two wallet balances it touches. Guard:
   `!isTransfer(tx)` on every income/expense aggregate.
2. **Wallet balance = `openingBalance` + net of its *recorded* rows.** Only
   `status: "recorded"` moves a balance (the existing `isCounted` gate still rules).
3. **A transfer's source and destination must differ** and both must exist.
4. **Deleting a wallet orphans its rows' `walletId` to `null`, never deletes them**
   — exactly the `Category` delete rule (`orphanCategory` → `orphanWallet`).
5. Money stays an **integer count of VND**; `openingBalance` included. No floats.

---

## 4. Domain layer (`domain/wallet.ts`, pure + tested)

New pure module, `now` injected where needed, no I/O:

| Function | Returns |
|---|---|
| `isTransfer(tx)` | `tx.toWalletId != null` |
| `walletBalance(wallet, txs)` | `openingBalance + Σ recorded rows`: `+income`, `−expense`, `−transfer-out` (walletId), `+transfer-in` (toWalletId) |
| `walletBalances(wallets, txs)` | `Map<id, number>` — one pass over the ledger |
| `netWorth(wallets, txs)` | Σ of all (non-archived?) wallet balances |
| `orphanWallet(txs, walletId)` | rows with that wallet re-pointed to `null` (both `walletId` and `toWalletId`) |
| `guessWalletKind(name)` | `cash`/`card`/`ewallet`/`bank`/`other` from a name — used by the migration + as an add-wallet default |
| `nextWalletOrder(wallets)` | max order + 1 |

Changes to existing domain modules:

- **`domain/transaction.ts`** — `totals()`, `filterTx()` and any income/expense sum
  gain `&& !isTransfer(tx)`. `TxFilter` gains an optional `walletId` facet.
- **`domain/analytics.ts`** — `breakdown`, `walletSeries` (**note the name clash** —
  this existing "wallet series" is the cash-flow running balance, unrelated to the new
  entity; do not rename it in this pass, just make sure it skips transfers),
  `periodInsights`, `forecastSeries` all exclude transfers.
- **`domain/txStatus.ts`** — no change; balances reuse `isCounted`.

Tests (`domain/wallet.test.ts`): opening balance; a transfer debits source + credits
destination and shows in neither `totals`; delete orphans both ends; `guessWalletKind`
boundaries; net worth = Σ balances.

---

## 5. Data layer

### 5.1 Migration v6 (append-only)

`CURRENT_VERSION: 5 → 6`; add `if (fromVersion < 6)` — **never edit an earlier branch.**

```
for each distinct non-empty account string across transactions + subscriptions:
  create a Wallet { name: string, kind: guessWalletKind(string), openingBalance: 0,
                    colorHex from SWATCHES, icon by kind, order, archived:false }
set tx.walletId  = the wallet id whose name === tx.account   (leave account as-is)
set sub.walletId = the wallet id whose name === sub.account
add state.wallets = [...the created wallets]   (default [] when there were none)
```

`openingBalance: 0` on migrated wallets is honest (we can't know history); the user
sets real opening balances afterwards on the Wallets screen. `data/persistence.ts`
`emptyState()` gains `wallets: []`.

> **Fix a pre-existing gap first.** `usecases/workspace.importData` stamps
> `version: CURRENT_VERSION` on the imported payload but **never calls `migrate()`**
> (`workspace.ts:85`) — so an older export imported into a newer build is labelled
> current without its migrations ever running, and once v6 exists an import would
> silently skip the wallet back-fill. Phase 1 must route `importData` through
> `migrate(next, p.version ?? 1)` (like `data/persistence.load` does) before the
> `commit`. Small, but it's on the critical path for this feature.

### 5.2 Seed & sample

- **`data/seed.ts`** — a fresh workspace seeds **one** wallet: **"Tiền mặt" (cash)**,
  `openingBalance: 0`. (Vietnamese seed data, per the house rule.)
- **`data/sample.ts`** — `buildSampleData` already scatters `account` strings
  ("Techcombank Visa", "MoMo", "VPBank Mastercard", "ZaloPay", …). **Done (phase 1):**
  a `Wallet` per distinct one, every row linked by `walletId` (+ the sub `walletId`).
  Opening balances stay 0 for now — a realistic per-wallet picture needs
  salary→wallet **transfers**, which land with the transfer UI (**phase 4**),
  together with the illustrative bank→cash / card-payoff transfer row.

---

## 6. Usecases (`usecases/wallets.ts`, add to the barrel)

| Export | Job |
|---|---|
| `addWallet(input)` | append a wallet (order via `nextWalletOrder`) |
| `updateWallet(id, patch)` | edit name/kind/openingBalance/colour/icon |
| `deleteWallet(id)` | `orphanWallet` the ledger, then drop the wallet |
| `reorderWallet(...)` | renumber `order` (mirror `reorderCategory`) |
| `setWalletArchived(id, archived)` | pause without losing history |

Changes to existing usecases:

- **`usecases/transactions.ts`** — `addTransaction`/`updateTransaction` carry
  `walletId`. New **`addTransfer({ fromWalletId, toWalletId, amount, occurredAt, note?, tagIds? })`**
  → one `recorded` row with `walletId`+`toWalletId`, `categoryId: null`.
- **`usecases/subscriptions.ts`** — subs carry `walletId`; `syncSubscriptions`
  inherits it onto each generated charge (it already inherits `account`/category/tags —
  add `walletId` alongside).

No usecase gains a *decision*; all the arithmetic lives in `domain/wallet`.

---

## 7. UI

| Piece | Where | What |
|---|---|---|
| **`#/wallets` screen** | `ui/features/wallets/Wallets.tsx` (container) | list of wallet cards (name, kind chip, **balance via `AmountDisplay`**), a **net-worth** header stat, add/edit/reorder/archive; empty state. Mirrors the Categories/Tags screen shape. |
| **Nav item** | `ui/app/Layout.tsx` | a "Wallets" entry (`account_balance_wallet` icon) in the sidebar + mobile drawer. |
| **`WalletPicker`** | `ui/common/WalletPicker.tsx` | pick a wallet in a Popover (icon + name + kind), like `CategorySelect`. Presentational. |
| **`WalletCard`** | `ui/features/wallets/WalletCard.tsx` | feature-leaf; renders in the `#/cashy` gallery with fake data. |
| **TransactionEditor** | `ui/features/transactions/TransactionEditor.tsx` | replace the free-text **"Paid with"** `PayeeInput` with `WalletPicker`. Add a **Transfer** mode to the type toggle (Income / Expense / **Transfer**): in transfer mode show **From wallet → To wallet**, hide category + type sign. |
| **SubscriptionEditor** | `ui/features/subscriptions/SubscriptionEditor.tsx` | "Paid with" → `WalletPicker`. |
| **Dashboard** | `ui/features/dashboard/Dashboard.tsx` | a compact **wallets/balances strip** (or fold into the existing "Balance (all time)" KPI, now = net worth across wallets). |
| **Filters + table** | `ui/features/transactions/` | a **wallet facet** in `TxFilterBar`; the table renders a transfer row specially (**From → To**, no category). |
| **Settings / detail** | `TransactionDetail`, `Settings` | detail shows the wallet (and For a transfer, both); nothing else required. |

Legacy rows whose `walletId` is `null` after migration (there won't be any if they had
an `account`, but blank ones exist) render as **"Unassigned"** — same treatment as an
uncategorised transaction.

---

## 8. Phased delivery (each phase ships green: `pnpm test` + `pnpm build`)

1. **✅ DONE (2026-07-23) — Schema + migration + domain (no UI).** Types
   (`Wallet`, `walletId`/`toWalletId`, `CashyState.wallets`), `domain/wallet.ts`
   + tests, migration v6 (+ its own test), `importData` now runs `migrate()`,
   `emptyState`, seed default cash wallet, sample wallets + links, transfer-
   exclusion in `transaction`/`analytics`. 116 tests; build + lint green. App runs
   unchanged; wallets exist in data, invisible in UI. **Deferred to phase 4:** the
   demo *transfer* row (would read as an uncategorised expense until the table is
   transfer-aware) — transfer logic is covered by unit tests instead.
2. **Wallets screen + usecases.** `usecases/wallets.ts`, `#/wallets`, nav item,
   `WalletCard`, opening-balance editing, balances + net worth. Gallery fixtures.
3. **Assign on entry.** `WalletPicker` in the transaction + subscription editors;
   wallet inherited onto sub charges; wallet facet in filters + table column.
4. **Transfers.** Transfer mode in the editor, `addTransfer`, transfer row rendering,
   a sample transfer.
5. **Dashboard + polish.** Balances strip / net-worth KPI, empty states, dark-mode
   pass, docs sync (data-model.md, CLAUDE.md, components.md, README invariants).

Phases 1–2 are the useful minimum (wallets with real balances). 3–5 layer value on top.

---

## 9. Open questions (pick before the phase that needs them)

1. **Net worth = all wallets, or exclude archived?** Default plan: archived wallets
   keep their balance but drop out of the net-worth stat once archived.
2. **Card balance sign.** A credit card is a liability — its balance is usually
   negative (you owe). Show it as a negative wallet balance (simple), or as "owed"
   framing? v1 default: plain signed balance; revisit with the net-worth `liability`
   kind later.
3. **Delete vs. archive a wallet with history.** Plan offers both (delete orphans
   rows; archive keeps the link). Confirm we want destructive delete at all, or
   archive-only.
4. **Editor 3-way toggle vs. a separate "Transfer" action.** Plan folds Transfer into
   the existing type toggle. Alternative: a distinct "+ Transfer" entry point. Decide
   in Phase 4.

## 10. DO / DON'T (specific to this feature)

**DO**
- Keep `domain/wallet.ts` pure; put every balance/transfer rule there, call from usecases.
- Gate income/expense aggregates with `!isTransfer(tx)`; gate balances with `isCounted`.
- Orphan a deleted wallet's rows to `null` (never delete rows).
- Bump `CURRENT_VERSION` + add a v6 branch; leave `account` data intact.
- Render wallets neutral/grey; hue only as a classification accent.

**DON'T**
- Don't widen `TxType` to add "transfer" (it would leak into `Category.type`).
- Don't let a subscription book money — a wallet doesn't change that; charges still
  materialise as `pending` rows the user confirms.
- Don't compute a balance from the cache/derived layer — the ledger is the source of truth.
- Don't remove the `account` field in this pass (append-only; data went through it).
- Don't introduce a second cycle-key or date shape; transfers use `occurredAt` like any row.
