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
  `LoanSummary` header (**position** — you owe / owed to me / net — beside a
  **payments-due** panel: the next payment + a segmented schedule bar) → a shared
  `FacetChip` **filter bar** (search · Status · Source · Archived) → grouped grids
  **"Money I owe"** / **"Owed to me"** (+ **Archived** when the filter shows them),
  each of `LoanCard` sorted by `sortLoans` → a match-aware empty-state line → the
  in-file `LoanEditor` modal.

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
| `loanTimeLeft(days)` | coarse remaining time for the "safe" badge — days → months → years, **rounded DOWN to the nearest half** only (65d→2mo, 55d→1,5mo); `null` for a non-positive count |
| `payableSchedule(loans, now)` | what I OWE bucketed by due-ness — `overdue \| within30 \| within60 \| later \| total` (non-archived borrowed with outstanding; open-ended ⇒ `later`); fuels the overview schedule bar |
| `nextPayment(loans, now)` | the soonest **upcoming** borrowed debt with outstanding (`{loan, days, amount}`), else `null` (overdue/open-ended don't count) |
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
| Feature-leaf | `LoanCard` | `ui/features/loans/LoanCard.tsx` | **composed from `CardIdentity` + `.cashy-card*`** (like `WalletCard`): tile + counterparty + source, a direction line ("I owe"/"Owed to me"), outstanding (`AmountDisplay`), a 6px repayment bar, a foot (tier-3 due line w/ bold count + rate), and a per-state status capsule; renders in the `#/cashy` gallery |
| Feature-leaf | `LoanSummary` | `ui/features/loans/LoanSummary.tsx` | the overview header — position (owe/owed/net) + a payments-due panel (next payment + segmented schedule bar from `payableSchedule`/`nextPayment`) |
| Common/kit | `FacetChip`, `PageHeader`, `Select`, `ColorPicker`, `IconPicker`, `AmountDisplay`, `Modal` | `ui/common/…`, `ui/kit/…` | building blocks — `FacetChip` is the shared filter chip (also used by transactions) |

## 7. Behaviours & edge cases

- **Outstanding = principal − Σ payments, floored at 0.** An overpayment reads as
  "paid in full", never a negative debt. Progress = paid / principal.
- **Interest is reference-only.** `interestRatePct` + `interestPeriod` are shown
  **spelled out** with the rate figure **bolded** ("**20%** per year", "**2%** per
  month") and stored; they never accrue and there is no schedule. Rate 0 renders a
  plain tier-3 "No interest" (out of focus, no bold).
- **Every state carries a status capsule + bar tone.** `overdue` (danger, "Overdue"),
  `due-soon` (warning, "Due soon"), `paid` (success, "Paid off" — the card also dims
  like a cancelled subscription), and a calm `active` gets a **neutral "N months left"**
  badge (via `loanTimeLeft`, rounded down; open-ended ⇒ "Ongoing"). A paid loan is
  never overdue even past its due date. The foot's due line is tier-3 with only the
  **day-count bolded**; overdue turns the whole line red.
- **Direction is read by colour, not just words.** `borrowed` → "I owe" / "…repaid";
  `lent` → "Owed to me" / "…collected". The direction arrow is tinted by side: an
  "I owe" arrow is **red** (a debt), an "Owed to me" arrow is **green** (a future
  inflow). The lent amount also reads green; the borrowed amount stays neutral,
  turning **red only when overdue**. The screen still groups them ("Money I owe" /
  "Owed to me").
- **Filter + overview.** A shared `FacetChip` bar (search · Status · Source ·
  Archived; dashed unselected, solid selected) narrows the lists; the `LoanSummary`
  header shows position + the next payment + a segmented **schedule bar**
  (`payableSchedule`: overdue / ≤30d / 31–60d / later) so "how much, and by when"
  reads at a glance.
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

- `src/ui/features/loans/Loans.tsx` — the screen container (+ in-file `LoanEditor`, filter state)
- `src/ui/features/loans/LoanCard.tsx` — the presentational loan card (composed from `CardIdentity` + `.cashy-card*`)
- `src/ui/features/loans/LoanSummary.tsx` — the overview header (position + payments-due schedule)
- `src/ui/common/FacetChip.tsx` — the shared filter-chip (transaction + loan bars)
- `src/domain/loan.ts` — all the pure rules (§4) + `src/domain/loan.test.ts`
- `src/usecases/loans.ts` — the writes (§5)
- `src/data/migrations.ts` — the v7 branch (+ `src/data/migrations.test.ts`)
- `src/data/sample.ts` — `buildSampleLoans` (demo loans)
- `src/ui/features/dashboard/Dashboard.tsx` — the net-worth integration
- Wiring: `src/lib/router.ts`, `src/App.tsx`, `src/ui/app/Layout.tsx`, `src/domain/types.ts`, `src/data/persistence.ts`, `src/usecases/workspace.ts` (export/import + default)
