# Cashy — Loans (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Loans feature as
> it exists in the code today. See also: [CLAUDE.md](../../CLAUDE.md),
> [architecture.md](../architecture.md), [data-model.md](../data-model.md),
> [components.md](../components.md), and the roadmap in [loans-plan.md](../loans-plan.md).
>
> **Status:** fully shipped (plan phases 1–3). Schema + migration v7, the `#/loans`
> screen with editor + repayment log, and the dashboard net-worth integration are
> all live.

## 1. What it does

Tracks **money you owe and money owed to you** — `hạn trả` (due date), lãi suất
(interest rate), and the source (cá nhân · thẻ tín dụng · ngân hàng). A loan is a
first-class record (not a wallet, not a transaction): it carries the counterparty,
principal, rate, due date, and a **manual repayment log**. Outstanding is derived —
`principal − Σ payments`, floored at 0 — and interest is stored for display /
reminders only (no auto-accrual, no amortization schedule). Loans fold into the
Dashboard's net worth as **assets − debts**. This is the feature described in
[loans-plan.md](../loans-plan.md).

## 2. Screen & route

- Route `#/loans` (`src/lib/router.ts`), rendered by `src/App.tsx`; nav item
  ("Loans", `handshake`) in `src/ui/app/Layout.tsx` with a live count of non-archived loans.
- Screen shape (`src/ui/features/loans/Loans.tsx`): `PageHeader` (+ "Add loan") → a
  summary card (**You owe · Owed to you · Net**) → grouped grids **"Money I owe"** /
  **"Owed to me"** (+ **Archived** when any), each of `LoanCard` sorted by
  `sortLoans` → an empty-state line when there are none → the in-file `LoanEditor` modal.

## 3. Data it touches

| Entity | Fields | R/W |
|---|---|---|
| `Loan` | `id`, `direction`, `counterparty`, `source`, `principal`, `interestRatePct`, `interestPeriod`, `openedAt`, `dueAt`, `payments`, `colorHex`, `icon`, `note`, `archived`, `createdAt` | read (cards + summary + net worth); write via the editor usecases |
| `LoanPayment` | `id`, `amount`, `date`, `note` | read (outstanding + progress); written by the editor / `addLoanPayment` |

Loans touch **no other entity** — no transactions, no categories, no analytics. The
only cross-cutting number they feed is the Dashboard net worth. Money is an integer
count of VND (`principal` and every `LoanPayment.amount`). Full shapes in
[data-model.md](../data-model.md) §1.9.

## 4. Domain rules used

All pure, in `src/domain/loan.ts`.

| Function | What |
|---|---|
| `loanPaid(loan)` | `Σ payments.amount` |
| `loanOutstanding(loan)` | `max(0, principal − loanPaid)` — never negative on overpayment |
| `loanProgress(loan)` | fraction repaid in `[0,1]` (zero-principal ⇒ 1) |
| `isPaidOff(loan)` | `loanOutstanding === 0` |
| `daysUntilDue(loan, now)` | whole days to `dueAt` (negative = overdue); `null` if open-ended |
| `loanStatus(loan, now, soonDays=7)` | `paid \| overdue \| due-soon \| active` |
| `isOverdue(loan, now)` | `loanStatus === "overdue"` |
| `loanNetWorthDelta(loan)` | `borrowed ⇒ −outstanding`, `lent ⇒ +outstanding` |
| `totalPayable(loans)` / `totalReceivable(loans)` | Σ outstanding per direction (non-archived by default) |
| `loansNetWorth(loans)` | `receivable − payable` |
| `sortLoans(loans, now)` | overdue → due-soon → active → paid; then soonest due; then largest outstanding |
| `loanSourceIcon(source)` | default lucide key per source (`bank`→`landmark`, `card`→`credit-card`, `personal`→`users`, …) |

## 5. Usecases

`src/usecases/loans.ts` — reads state, commits the next one. No decision of their own.

| Usecase | Effect |
|---|---|
| `addLoan(input)` | append a loan (amounts coerced to positive int VND; optional initial `payments`); returns the id |
| `updateLoan(id, patch)` | shallow-merge a patch (payments + principal re-normalised) |
| `setLoanArchived(id, archived)` | hide from the active groups, keep the record |
| `deleteLoan(id)` | remove the loan outright — **self-contained**, no ledger rows to orphan |
| `addLoanPayment(id, {amount,date,note?})` | append one repayment / collection (a non-positive amount is ignored) |
| `removeLoanPayment(id, paymentId)` | drop one payment entry |

## 6. Components

| Tier | Component | File | Role |
|---|---|---|---|
| Container/screen | `Loans` | `ui/features/loans/Loans.tsx` | reads `useCashy()`; summary + grouped card grids; holds the in-file `LoanEditor` |
| Singleton-ish modal | `LoanEditor` | *(in `Loans.tsx`)* | add/edit form (Borrowed/Lent toggle, counterparty, source `Select`, principal, rate + period, opened/due dates, `ColorPicker`, `IconPicker`, note) + a live **payments sub-editor** (outstanding updates as rows are added) + archive/delete |
| Feature-leaf | `LoanCard` | `ui/features/loans/LoanCard.tsx` | neutral tile + counterparty + source, outstanding (`AmountDisplay`), a repayment progress bar, a due-date line + rate, and a status pill (overdue/due-soon/paid); renders in the `#/cashy` gallery |
| Common/kit | `PageHeader`, `Select`, `ColorPicker`, `IconPicker`, `AmountDisplay`, `Modal` | `ui/common/…`, `ui/kit/…` | building blocks |

## 7. Behaviours & edge cases

- **Outstanding = principal − Σ payments, floored at 0.** An overpayment reads as
  "paid in full", never a negative debt. Progress = paid / principal.
- **Interest is reference-only.** `interestRatePct` + `interestPeriod` are shown
  ("9%/yr", "2%/mo") and stored; they never accrue into the balance and there is no
  schedule. Rate 0 renders "No interest".
- **Status drives the pill + bar tone.** `paid` (green, "Settled"), `overdue` (red,
  "Overdue by N days"), `due-soon` (amber, within 7 days), `active` (quiet). A paid
  loan is never overdue even past its due date.
- **Direction flips the wording.** `borrowed` → "You owe" / "…repaid"; `lent` →
  "Owed to you" / "…collected". The screen groups them ("Money I owe" / "Owed to me").
- **Due date is optional.** `dueAt: null` = open-ended ("No due date"), sorted after
  the dated ones.
- **Source resets the icon** to that source's default (`loanSourceIcon`); the user can
  still pick any icon afterwards.
- **Payments sub-editor.** The editor holds a local payment list; the live
  "Outstanding" readout updates as rows are added/removed, and the whole list is
  committed on save. `addLoanPayment`/`removeLoanPayment` exist for future quick actions.
- **Delete vs archive.** `deleteLoan` removes the loan and its payment history (no
  ledger rows reference it); archive is the non-destructive alternative, and archived
  loans drop out of the summary + net worth.
- **A fresh workspace** seeds **no loans**; the demo (`buildSampleLoans`) seeds one
  loan per status — a bank car-loan (part-paid), a 0% family loan (open-ended), a card
  installment (due soon), an overdue personal loan, a receivable lent to a friend, and
  one paid-off loan.
- **Dashboard net worth.** The balances strip's "Net worth" = wallet net + loans net
  (`loansNetWorth`), with an assets / you-owe / owed-to-you caption and a reconciling
  "Loans · net" row (→ `#/loans`). Wallet rows + the loans row sum to the headline.

## 8. Files

- `src/ui/features/loans/Loans.tsx` — the screen container (+ in-file `LoanEditor`)
- `src/ui/features/loans/LoanCard.tsx` — the presentational loan card
- `src/domain/loan.ts` — all the pure rules (§4) + `src/domain/loan.test.ts`
- `src/usecases/loans.ts` — the writes (§5)
- `src/data/migrations.ts` — the v7 branch (+ `src/data/migrations.test.ts`)
- `src/data/sample.ts` — `buildSampleLoans` (demo loans)
- `src/ui/features/dashboard/Dashboard.tsx` — the net-worth integration
- Wiring: `src/lib/router.ts`, `src/App.tsx`, `src/ui/app/Layout.tsx`, `src/domain/types.ts`, `src/data/persistence.ts`, `src/usecases/workspace.ts` (export/import + default)
