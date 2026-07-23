# Cashy — Transactions (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Transactions
> feature — the ledger screen, its filter bar and table, plus the transaction
> editor and detail modals — as it exists in the code today. See also:
> [CLAUDE.md](../../CLAUDE.md), [architecture.md](../architecture.md),
> [data-model.md](../data-model.md), [components.md](../components.md).

## 1. What it does

The full ledger view: a period selector + a running **Net** figure in the header,
a filter bar (search, type, status, category, amount, tags), and one paged table
of every transaction in the current window. Rows open a receipt-style **detail**;
a per-row pencil and the header **Add** button open the **editor** (a Modal that
pre-fills *now*, remembers a half-typed draft, and holds the delete action). A
checkbox column drives multi-select **bulk delete**. The same `TransactionTable`
and `useTxQuery` shape are reused on the Dashboard (at 20/page), so the two
screens stay identical without sharing state.

## 2. Screen & route

- Route `#/transactions` (hash router, `lib/router.ts`); mounted by
  `src/ui/app/Layout.tsx` in the main content slot.
- Layout shape (`src/ui/features/transactions/Transactions.tsx`): a
  `wb-stack wb-stack--loose` of `PageHeader` (title + count subtitle + a
  `PeriodPicker` and a `Net` `AmountDisplay` in its actions) → `TxFilterBar` →
  `TransactionTable`.
- The editor and detail are **singleton modals**, mounted once at the app root and
  opened imperatively via `lib/modals` (`openTxEditor`, `openTxDetail`) — not
  children of this screen. The navbar **Add** button (`src/ui/app/Layout.tsx:82`)
  also opens the editor and, while a draft is parked, switches to a dashed
  "Finish draft" affordance (`cashy-btn--draft`, driven by `useTxDraft`).

## 3. Data it touches

| Entity | Fields | R/W |
|---|---|---|
| `Transaction` | `amount`, `type`, `categoryId`, `tagIds`, `note`, `payee`, `account`, `status`, `occurredAt`, `occurredTime`, `createdAt`; reads `subscriptionId` on delete | read (table/detail); write via editor + delete flows |
| `Category` | `id`, `name`, `type`, `parentId`, `order` | read only — capsule label, tree picker, filter facet, descendant expansion |
| `Tag` | `id`, `name` | read only — chips + tag facet; order/ink from `rankTags`, not stored `colorHex` |
| `TxDraft` | all editor fields (`amountStr` is text) | read/write — the parked new transaction, separate store `localStorage["cashy_tx_draft_v1"]` |

Money is an integer count of VND; `amount ≥ 0`, sign implied by `type`. Only
`status: "recorded"` rows count toward the header **Net** (see §4). Full shapes in
[data-model.md](../data-model.md) §1.5 / §1.7.

## 4. Domain rules used

Pure functions from `domain/*` (`src/domain/…`):

| Function | Module | What |
|---|---|---|
| `totals(txs)` | `transaction.ts` | income/expense/**net** over the filtered rows; skips non-`recorded` via `isCounted`. Feeds the header Net. |
| `filterTx(txs, f)` | `transaction.ts` | the whole filter: range, type, multi-category (each expanded to descendants, OR'd), tags (OR), multi-status, inclusive amount bounds, and a `note`-only case-insensitive search. |
| `byRecency(a, b)` | `transaction.ts` | newest `occurredAt` first, `createdAt` tie-break. (The screen inlines the same comparator in `useTxQuery.sorted`.) |
| `orphanCategory` / `detachTag` | `transaction.ts` | not called here directly — the guarantees behind "delete never cascades": a category delete nulls `categoryId`, a tag delete strips the id. |
| `statusOf(tx)` | `txStatus.ts` | `tx.status ?? "recorded"` — always read status through this (legacy rows have none). |
| `isCounted(tx)` | `txStatus.ts` | `true` only for `recorded`; gates every total. |
| `TX_STATUS_META` / `TX_STATUS_ORDER` | `txStatus.ts` | label + `wb-cap` tone classes + `counted` flag + the fixed option order for the status facet, picker, and cells. |
| `periodRange(key, now, custom)` | `period.ts` | resolves a `PeriodKey` to concrete `{start,end}` dates for the range filter. |
| `rankTags(tags, txs)` | `tag.ts` | tag order **and** grey ink shade by usage rank (not raw count). |
| `flattenTree(categories)` | `category.ts` | depth-indented category list for the Category facet. |
| `formatMoney` / `signedMoney` / `formatMoneyShort` / `formatMoneyAxis` / `formatDigits` / `parseMoney` | `money.ts` | render / parse amounts (detail total, signed cells, the amount-facet range summary via `formatMoneyAxis`, grouped editor input, digits→integer đồng). Currency glyph is `₫`. |
| `todayYMD` / `yesterdayYMD` / `nowHM` / `fmtDate` | `date.ts` | editor "Now / Today / Yesterday" chips, default time, detail date. |

## 5. Usecases

Writes go through `src/usecases/transactions.ts` (never `commit`/`getState` from UI):

| Usecase | Effect |
|---|---|
| `addTransaction(input)` | prepend a new row (`id` + `createdAt` assigned); editor then `clearDraft()`s. Returns the new id. |
| `updateTransaction(id, patch)` | shallow-merge a patch onto the matching row. |
| `deleteTransaction(id)` | drop the row; if it was a subscription charge (`subscriptionId`), call `syncPayments(subId)` to re-derive that sub's payment cache. |

`Transactions.tsx` calls `deleteTransaction` (per selected id, from the table's
bulk-delete). `TransactionEditor` calls `addTransaction` / `updateTransaction` /
`deleteTransaction`; `TransactionDetail` calls `deleteTransaction`. The table and
filter bar themselves are pure (no store/usecase imports).

## 6. Components

Container → leaf/common/modal, each with its file and one-line role:

| Component | Tier | File | Role |
|---|---|---|---|
| `Transactions` | container/screen | `ui/features/transactions/Transactions.tsx` | reads `useCashy()`, builds `useTxQuery`, wires the header/filter/table |
| `useTxQuery` | hook | `ui/features/transactions/useTxQuery.ts` | all filter+period state → `filtered` and date-`sorted` lists (see §7) |
| `TxFilterBar` | feature-leaf | `ui/features/transactions/TxFilterBar.tsx` | search pill + one dropdown **`FacetChip`** per facet + "Clear all" |
| `TransactionTable` | feature-leaf | `ui/features/transactions/TransactionTable.tsx` | the shared table: internal pagination, select column, bulk-delete bar, row→detail, per-row edit |
| `usePagination` | hook | `ui/features/transactions/usePagination.ts` | slice rows into pages; clamps page when the list shrinks; exposes `from`/`to`/`total` |
| `Pagination` | feature-leaf | `ui/features/transactions/Pagination.tsx` | `wb-pagination` control; renders nothing for ≤1 page (distinct from the kit's `Pagination`) |
| `TagsMorePopover` | feature-leaf | `ui/features/transactions/TagsMorePopover.tsx` | the "+n" overflow chip; portalled, viewport-clamped panel of the hidden tags |
| `TransactionEditor` | singleton modal | `ui/features/transactions/TransactionEditor.tsx` | add/edit form; draft caching; delete; ⌘I/⌘O type flip |
| `TransactionDetail` | singleton modal | `ui/features/transactions/TransactionDetail.tsx` | receipt overlay (`wb-receipt`); Close / Edit / Delete toolbar |
| `PageHeader` | common | `ui/common/PageHeader.tsx` | title + subtitle + right actions |
| `PeriodPicker` | common | `ui/common/PeriodPicker.tsx` | period window chooser (feeds `q.setPeriod`) |
| `AmountDisplay` | common | `ui/common/AmountDisplay.tsx` | the one money renderer; green income, neutral-bold spend, red only for a real problem (the header Net earns red on a loss) |
| `CategoryCap` | common | `ui/common/CategoryCap.tsx` | category as a grey capsule (null → "Uncategorised") |
| `CategorySelect` | common | `ui/common/CategorySelect.tsx` | tree category picker in the editor |
| `StatusCap` / `StatusPicker` | common | `ui/common/StatusCap.tsx`, `StatusPicker.tsx` | status tone capsule (cells/detail) / capsule radio group (editor) |
| `TagChip` | common | `ui/common/TagChip.tsx` | a tag as a `#`-chip, grey by usage shade |
| `DatePicker` | common | `ui/common/DatePicker.tsx` | single-date field (editor "When") |
| `PayeeInput` | common | `ui/common/PayeeInput.tsx` | free-text + portalled ranked autocomplete; the Payee field |
| `WalletPicker` | common | `ui/common/WalletPicker.tsx` | the wallet dropdown — "Paid from" / "Received into", and both legs of a transfer |
| `EmptyState` | common | `ui/common/EmptyState.tsx` | the no-transactions block (with an Add action) |
| `TimePicker`, `Textarea`, `Input`/`Field`, `Kbd`, `Modal`, `Popover` | kit | `ui/kit/…` | editor building blocks |

## 7. Behaviours & edge cases

**Filter facets** (`useTxQuery` state, `TxFilterBar` UI, `filterTx` logic):
- **Search** matches `note` **only** (case-insensitive, trimmed) — not payee,
  category, or account.
- **Type** — single choice `all | expense | income`; the only facet chip drawn
  with a black outline (`accent`), everything else stays neutral grey.
- **Status** — multi-select over `TX_STATUS_ORDER`; a row matches if its
  `statusOf` is any selected value.
- **Category** — multi-select; each pick is expanded to its descendants
  (`descendantIds`) so a parent selects its whole subtree; the facet hides when
  there are no categories.
- **Amount** — inclusive `min`/`max` bounds in đồng; the two inputs live-drive the
  query and empty out when the chip's × or "Clear all" resets the bounds; digits
  are stripped to an integer (`parseAmt`).
- **Tags** — multi-select, OR'd; ordered most-used first with a usage count; the
  facet hides when there are no tags.
- **Wallet** — single choice; matches a row on **either** its `walletId` or its
  `toWalletId`, so filtering by a wallet includes transfers that touch it. Hidden
  when there are no wallets.
- Each facet is its own dropdown **chip** that shows the applied value inline
  (`"Recorded +1"`, `"≥ 200k đ"`) and grows an × to clear just that facet; **Clear
  all** (`clearTokens`) appears once any removable filter is set and leaves the
  **period scope** untouched (period is not a "token").
- Default period is **`30d`**, not "this month" — the seeded ~10-day dataset
  straddles a month boundary, which a this-month default would clip.

**Sorting & pagination:**
- Sort is fixed: `occurredAt` descending, `createdAt` as the tie-break
  (`useTxQuery.sorted`). There is no user-facing sort control.
- Page size is a prop: **50** on this screen, **20** on the Dashboard.
  `usePagination` clamps the current page down when the row count shrinks; the
  card foot shows `from–to of total` plus the compact `Pagination` (first + last +
  current±1, gaps elsewhere; hidden at ≤1 page).

**Quick-entry & draft caching** (`TransactionEditor` + `data/draft.ts`):
- A **new** transaction opens pre-filled: `type=expense`, `occurredAt=today`,
  `occurredTime=now`, `status=recorded` — so the fast path touches nothing but
  amount. **⌘O / ⌘I / ⌘T** (Ctrl elsewhere) switch Expense / Income / Transfer from
  the keyboard; switching to income/expense drops a category that doesn't exist on
  the new side.
- Amount groups digits with dots as typed (`formatDigits`); **Add is disabled
  until `amount > 0`** (a transfer also needs two distinct wallets). Payee
  autocompletes from distinct past values; the wallet is a `WalletPicker`.
- Closing without confirming (`dismiss` / "Later" / Esc / backdrop) **parks the
  form as a draft** rather than discarding it; a blank draft is dropped
  (`isBlankDraft`). Re-opening **Add** resumes the draft; the navbar button then
  reads "Finish draft" with a dashed outline. **Editing an existing row never
  touches the draft.** Committing (`addTransaction`) or "Discard draft" clears it.

**Optional time-of-day:**
- `occurredTime` (`"HH:mm"`) is genuinely optional: an empty value is stored as
  `undefined`, never `"00:00"`. A "Clear time" chip appears once a time is set;
  the table only renders the time sub-line when present; date maths never use it.

**Status lifecycle & what counts:** `recorded` (green, **the only counted
status**), `pending` ("Awaiting you", amber), `awaiting` ("In flight", blue),
`skipped` (grey), `failed` (red). Only `recorded` moves the header Net and every
total (`isCounted`); a missing status reads as `recorded` (legacy rows). Detail is
in [data-model.md](../data-model.md) §2.

**Delete flows** — deliberately no per-row delete (one stray click must not
destroy a row):
- **Editor** holds the primary delete — you open the row, look at it, then may
  delete it (with a `confirmDelete`).
- **Detail** has a Delete button in its docked toolbar (confirm names the merchant
  + amount).
- **Table** offers **bulk delete** only after an explicit checkbox selection
  (select-all is per-page; stale ids are pruned when `rows` changes); confirm
  states the count. All three route to `deleteTransaction`.

**Empty state:** when the filtered list is empty the table renders the passed
`EmptyState` (icon, "No transactions", and an "Add transaction" button) inside the
card instead of the table body.

**Wallet & transfers:** each row moves through a **wallet** — chosen with a
`WalletPicker` ("Paid from" for an expense, "Received into" for income), stored as
`Transaction.walletId`. The editor's third mode, **Transfer**, moves money between
two of your own wallets: it saves a row with a `toWalletId` that counts toward **no**
income/expense total (only wallet balances). The table and detail render a transfer
as **From → To** with a neutral amount, no category. The legacy free-text
`Transaction.account` is kept on old rows but no longer written. See
[wallets.md](wallets.md).

## 8. Files

- `src/ui/features/transactions/Transactions.tsx` — the screen container
- `src/ui/features/transactions/useTxQuery.ts` — filter + period query hook (also used by Dashboard)
- `src/ui/features/transactions/TxFilterBar.tsx` — filter bar + `FacetChip`
- `src/ui/features/transactions/TransactionTable.tsx` — the shared paged table
- `src/ui/features/transactions/usePagination.ts` — pagination hook
- `src/ui/features/transactions/Pagination.tsx` — the pager control (Cashy-specific)
- `src/ui/features/transactions/TagsMorePopover.tsx` — tags "+n" overflow popover
- `src/ui/features/transactions/TransactionEditor.tsx` — add/edit modal
- `src/ui/features/transactions/TransactionDetail.tsx` — receipt detail modal
- `src/domain/transaction.ts` — `totals`, `filterTx`, `byRecency`, `orphanCategory`, `detachTag`, `TxFilter`
- `src/domain/txStatus.ts` — `statusOf`, `isCounted`, `TX_STATUS_META`, `TX_STATUS_ORDER`
- `src/domain/period.ts` — `PeriodKey`, `Range`, `periodRange` (period resolution)
- `src/usecases/transactions.ts` — `addTransaction`, `updateTransaction`, `deleteTransaction`
- `src/data/draft.ts` — `TxDraft`, `getDraft`/`saveDraft`/`clearDraft`/`isBlankDraft`/`useTxDraft`
- Common building blocks: `src/ui/common/` — `AmountDisplay`, `CategoryCap`, `CategorySelect`, `StatusCap`, `StatusPicker`, `TagChip`, `DatePicker`, `PayeeInput`, `PageHeader`, `PeriodPicker`, `EmptyState`
