# Cashy — Loans & debts (feature plan)

> **Status:** SHIPPED (all three phases, 2026-07-23). Kept as the design record.
> The feature itself is documented in [features/loans.md](features/loans.md).
> **Owner:** Đạt · **Drafted:** 2026-07-23 · **Target:** the feature after wallets.
>
> Adds **quản lý khoản vay** — money you owe and money owed to you: lender/borrower,
> source (cá nhân · thẻ tín dụng · ngân hàng), interest rate, and a due date
> (`hạn trả`). Read [CLAUDE.md](../CLAUDE.md) and [architecture.md](architecture.md)
> first; every rule here obeys the layer + invariant contract already in force, and
> reuses the wallet feature's aggregate style ([wallets-plan.md](wallets-plan.md)).

---

## 1. Scope (decided with the owner, 2026-07-23)

| Decision | Choice | Why it matters |
|---|---|---|
| **Architecture** | A **separate first-class `Loan` entity** with its own screen — *not* a "liability wallet". | A loan carries data a wallet doesn't (lender, rate, due date). Chosen over the lighter liability-wallet option. |
| **Direction** | **Both.** `borrowed` = money I owe (a liability); `lent` = money owed to me (a receivable). | The screen shows two groups; net worth nets them opposite ways. |
| **Interest & schedule** | **Reference + manual.** Store the rate + due date for display/reminders; the user records each repayment by hand. **No auto-accrual, no amortization schedule.** | Outstanding = `principal − Σ payments`, floored at 0. Keeps the money math trivial and honest. |

Out of scope (kept in mind for the schema): auto-computed interest accrual, installment
schedules with per-instalment due dates, multi-currency, and auto-mirroring a
repayment into a wallet transfer (a possible later phase — see §9).

House taste holds: **loans render neutral/grey**; `colorHex` is a classification
accent only, never decoration (same rule as categories, tags, wallets).

---

## 2. Data model additions

### 2.1 New entity — `Loan` (+ `LoanPayment`)

Added to `CashyState` as `loans: Loan[]`.

| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | Primary key | `lib/id.uid()` |
| `direction` | `LoanDirection` | `borrowed` (I owe) \| `lent` (owed to me) | Drives net-worth sign + which screen group. |
| `counterparty` | `string` | The other party — lender (`borrowed`) or borrower (`lent`) | "Techcombank", "Bố mẹ", "Minh". |
| `source` | `LoanSource` | `personal \| card \| bank \| other` | **Open union** (like `WalletKind`); drives the icon + a chip. |
| `principal` | `number` | Integer VND borrowed / lent (> 0) | Money is always an integer count of VND. |
| `interestRatePct` | `number` | Annual/monthly %, **display + reminders only** | `0` = interest-free. Never accrued into `outstanding`. |
| `interestPeriod` | `InterestPeriod` | `year \| month` — what the rate is quoted over | |
| `openedAt` | `string` | `YYYY-MM-DD` — when taken out / given | |
| `dueAt` | `string \| null` | `YYYY-MM-DD` due date (`hạn trả`); `null` = open-ended | Powers overdue / due-soon badges + reminders. |
| `payments` | `LoanPayment[]` | Manual repayment (`borrowed`) / collection (`lent`) entries | `outstanding = principal − Σ amounts`. |
| `colorHex` | `string` | Classification hue | Rendered grey; hue only on the tile accent. |
| `icon` | `string` | Curated lucide key | `ui/kit/icon-map.ts`, like every entity. |
| `note` | `string` | Free note | |
| `archived` | `boolean` | `true` = closed/hidden, history kept | Mirrors `Wallet.archived` / `Subscription.active`. |
| `createdAt` | `string` | ISO timestamp | |

```ts
interface LoanPayment { id: string; amount: number; /* int VND >0 */ date: string; /* YMD */ note: string; }
```

### 2.2 What does NOT change

- **No `Transaction` change.** In this scope a repayment is an entry ON the loan,
  not a ledger row — loans are their own mini-ledger. (Optionally mirroring a
  repayment to a wallet transfer is a later phase; see §9.) This keeps the
  transfer/income/expense trichotomy untouched.
- **No `TxType` widening.** Loans never touch categories or the income/expense
  totals.

---

## 3. New / changed invariants

Add to the invariant list (CLAUDE.md §8 / data-model.md §6):

1. **A loan's `outstanding` is DERIVED:** `max(0, principal − Σ payments.amount)`.
   Never stored, never negative (an overpayment is not a negative debt).
2. **Interest is reference-only.** `interestRatePct` never changes `outstanding`;
   Cashy does not accrue interest or generate a schedule.
3. **A `borrowed` loan's outstanding SUBTRACTS from net worth; a `lent` loan's
   outstanding ADDS.** Archived loans drop out of the net-worth total by default.
4. **Loans never touch the income/expense totals or any category donut.** They are
   their own module; the only cross-cutting number they feed is net worth.
5. Money stays an **integer count of VND** — `principal` and every `LoanPayment.amount`.

---

## 4. Domain layer (`domain/loan.ts`, pure + tested)

New pure module, `now` injected, no I/O:

| Function | Returns |
|---|---|
| `loanPaid(loan)` | `Σ payments.amount` |
| `loanOutstanding(loan)` | `max(0, principal − loanPaid)` |
| `loanProgress(loan)` | fraction repaid in `[0,1]` (zero-principal ⇒ 1) |
| `isPaidOff(loan)` | `loanOutstanding === 0` |
| `daysUntilDue(loan, now)` | whole days to `dueAt` (negative = overdue); `null` if open-ended |
| `loanStatus(loan, now)` | `paid \| overdue \| due-soon \| active` |
| `isOverdue(loan, now)` | `loanStatus === "overdue"` |
| `loanNetWorthDelta(loan)` | `borrowed ⇒ −outstanding`, `lent ⇒ +outstanding` |
| `totalPayable(loans)` / `totalReceivable(loans)` | Σ outstanding per direction (non-archived) |
| `loansNetWorth(loans)` | `receivable − payable` |
| `sortLoans(loans, now)` | overdue → due-soon → active → paid; then soonest due; then largest outstanding |
| `loanSourceIcon(source)` | curated lucide key per source |

No existing domain module changes — loans don't intersect transactions/analytics.
Net worth stays composed at the UI edge: `walletNetWorth + loansNetWorth`.

Tests (`domain/loan.test.ts`): outstanding floored at 0; progress; paid/overdue/
due-soon/active status; net-worth delta sign per direction; payable/receivable/
loansNetWorth aggregates (archived excluded); `sortLoans` ordering.

---

## 5. Data layer

### 5.1 Migration v7 (append-only)

`CURRENT_VERSION: 6 → 7`; add `if (fromVersion < 7)` — **never edit an earlier branch.**
Loans are brand new (no data to transform), so the branch only guarantees the
field exists on older snapshots: `next = { ...next, loans: next.loans ?? [] }`.
`persistence.emptyState()` + the `load` spread + `importData` all gain `loans`.

### 5.2 Export / import gap (fix in this pass)

`workspace.exportData` currently exports categories/tags/transactions/subscriptions
only — it **omits `wallets`** (and would omit `loans`). Add both, so an
export→import round-trip is lossless (today wallet opening balances survive only by
being re-guessed from `account` strings). `importData` already tolerates missing
arrays; it gains `loans`.

### 5.3 Seed & sample

- **Fresh workspace** seeds **no loans** (`loans: []`) — a new user has none.
- **`data/sample.ts`** — `buildSampleData` gains a `loans` field built by
  `buildSampleLoans(now)`: a deterministic spread that exercises every status —
  a bank car-loan (active, part-paid), a 0% family loan (open-ended), a card
  installment (due-soon), an overdue personal loan, a receivable lent to a friend,
  and one paid-off loan. Dates are relative to `now`.

---

## 6. Usecases (`usecases/loans.ts`, add to the barrel) — Phase 2

| Export | Job |
|---|---|
| `addLoan(input)` | append a loan (icon from source, hue from palette) |
| `updateLoan(id, patch)` | edit any field |
| `setLoanArchived(id, archived)` | close/reopen without losing history |
| `deleteLoan(id)` | drop the loan (self-contained — no ledger rows to orphan) |
| `addLoanPayment(id, {amount, date, note})` | append a repayment/collection |
| `removeLoanPayment(id, paymentId)` | undo one |

No usecase gains a *decision*; the arithmetic lives in `domain/loan`.

---

## 7. UI — Phases 2–3

| Piece | Where | What |
|---|---|---|
| **`#/loans` screen** | `ui/features/loans/Loans.tsx` (container) | summary header (total payable · total receivable · net); two groups **"Money I owe"** / **"Owed to me"**; `LoanCard` per loan; add/edit/archive/delete; empty state. Mirrors the Wallets screen shape. |
| **Nav item** | `ui/app/Layout.tsx` | a "Loans" entry (handshake / hand-coins icon) in the sidebar + mobile drawer, with a count. |
| **`LoanCard`** | `ui/features/loans/LoanCard.tsx` | feature-leaf: counterparty, source chip, **outstanding** (`AmountDisplay`), a progress bar, a due-date countdown / overdue badge, the rate. Renders in the `#/cashy` gallery with fake data. |
| **`LoanEditor`** | in `Loans.tsx` (in-file, like `WalletEditor`) | direction toggle (Borrowed / Lent), counterparty, source select, principal (money field), rate + period, `openedAt`, optional `dueAt`, colour, icon, note; a **payments** editor (add/remove repayments) with a live outstanding readout; archive/delete. |
| **Dashboard** | `ui/features/dashboard/Dashboard.tsx` | net worth becomes **assets − debts**: extend the balances strip with a payable/receivable line, or a compact "Debts" stat, Manage → `#/loans`. |

Loans render neutral/grey; the source hue is a classification accent only.

---

## 8. Phased delivery (each phase ships green: `pnpm test` + `pnpm build` + `pnpm lint`)

1. **✅ DONE (2026-07-23) — Schema + migration v7 + domain + data wiring (no UI).**
   Types (`Loan`, `LoanPayment`, enums, `CashyState.loans`), `domain/loan.ts` + 11
   tests, migration v7 (+ 2 tests), `emptyState`/`load`/`importData` wired and
   `exportData` now carries wallets **and** loans (closed a latent export gap),
   `buildSampleLoans` demo. 129 tests; build + lint green. App runs unchanged.
2. **✅ DONE (2026-07-23) — Loans screen + usecases.** `usecases/loans.ts`
   (add/update/archive/delete + add/removeLoanPayment), `#/loans` + nav item
   (`handshake`) + count, `LoanCard` (status pill + progress + due line), in-file
   `LoanEditor` with the live payments sub-editor, You-owe / Owed-to-you / Net
   summary, "Money I owe" / "Owed to me" groups, gallery section "8 · Loans".
   Verified live (6 demo loans, add round-trip).
3. **✅ DONE (2026-07-23) — Dashboard net-worth integration + docs.** The balances
   strip's net worth became **assets − debts** (`walletNet + loansNetWorth`) with an
   assets/owe/owed caption and a reconciling "Loans · net" row → `#/loans`.
   [features/loans.md](features/loans.md) authored + cross-cutting refs synced
   (data-model, components, architecture, CLAUDE, README, features/README). Verified
   live end-to-end.

**Feature complete.** (Optional later polish: mirror a repayment into a wallet
transfer so wallet balances move too — see §9.1.)

---

## 9. Open questions (defaults chosen; change any and say so)

1. **Repayment ↔ wallet link.** v1 records a repayment as an entry on the loan only
   — it does **not** move a wallet balance. Default: keep them separate (simplest,
   matches "manual"). A later phase could offer "also deduct from wallet X" (creating
   a linked transfer) so wallet balances stay honest without double entry.
2. **Net worth & archived loans.** Archived loans drop out of net worth (mirrors
   archived wallets). Confirm.
3. **Overpayment.** `outstanding` floors at 0; the extra is shown as "paid in full"
   rather than a negative/credit. OK for personal use?
4. **Due-soon window.** Default 7 days for the "due soon" badge.

## 10. DO / DON'T (specific to this feature)

**DO**
- Keep `domain/loan.ts` pure; put every outstanding/status/net-worth rule there.
- Derive `outstanding` from `principal − Σ payments`; never store it.
- Treat interest as display-only; never accrue it.
- Bump `CURRENT_VERSION` + add a v7 branch; add `loans` to export/import.
- Render loans neutral/grey; source hue as a classification accent only.

**DON'T**
- Don't turn a repayment into an income/expense/transfer row in this scope.
- Don't auto-generate an amortization schedule or accrue interest.
- Don't let `outstanding` go negative on overpayment.
- Don't couple loans to categories, analytics, or the donut.
