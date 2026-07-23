import type { Loan, LoanSource } from "@/domain/types";

// ============================================================================
// Loan rules — pure. A loan is money BORROWED (I owe) or LENT (owed to me),
// kept as its own record with manual repayment entries. Outstanding is DERIVED —
// principal minus what has been paid, floored at 0 — and interest is stored for
// reference / reminders only, never auto-accrued into the balance. Money is an
// integer count of VND. See docs/loans-plan.md.
// ============================================================================

/** Total paid (a `borrowed` loan) / collected (a `lent` loan): Σ of its manual
 *  payment entries. */
export function loanPaid(loan: Loan): number {
  return loan.payments.reduce((s, p) => s + p.amount, 0);
}

/** What is still owed: principal minus paid, floored at 0 — an overpayment is
 *  "paid in full", not a negative debt. */
export function loanOutstanding(loan: Loan): number {
  return Math.max(0, loan.principal - loanPaid(loan));
}

/** Fraction repaid in [0,1]; a zero-principal loan reads as fully paid. */
export function loanProgress(loan: Loan): number {
  if (loan.principal <= 0) return 1;
  return Math.min(1, loanPaid(loan) / loan.principal);
}

/** A loan is settled once nothing is outstanding. */
export function isPaidOff(loan: Loan): boolean {
  return loanOutstanding(loan) === 0;
}

/**
 * Whole days from `now` to the due date — negative means overdue, 0 is today.
 * `null` when the loan is open-ended (no `dueAt`). Both ends are pinned to local
 * midnight so the answer is a clean calendar-day count, free of clock time.
 */
export function daysUntilDue(loan: Loan, now: Date = new Date()): number | null {
  if (!loan.dueAt) return null;
  const [y, m, d] = loan.dueAt.split("-").map(Number);
  const due = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / 86_400_000);
}

export interface TimeLeft {
  /** the count, already rounded DOWN (e.g. 2, 1.5, 20) */
  value: number;
  unit: "day" | "month" | "year";
  /** the value landed on a half (…,5), so the label reads "about …" */
  approx: boolean;
}

/** Round DOWN to the nearest half — never up. floorHalf(1.81)=1.5, floorHalf(2.14)=2. */
function floorHalf(x: number): number {
  return Math.floor(x * 2) / 2;
}

/**
 * Coarse "time remaining" for the safe-loan badge, from a POSITIVE day count.
 * A short span stays in days; up to a year it becomes months, beyond that years —
 * and the month/year figure is always rounded DOWN to the nearest half (65d → 2
 * months, 55d → 1,5 months), NEVER up, so the badge can't over-promise how long
 * is left. Returns null for a non-positive count — overdue / due-today are the
 * status badge's job, not this one's.
 */
export function loanTimeLeft(days: number): TimeLeft | null {
  if (days <= 0) return null;
  if (days <= 31) return { value: days, unit: "day", approx: false };
  if (days < 365) {
    const v = floorHalf(days / 30.4);
    return { value: v, unit: "month", approx: v % 1 !== 0 };
  }
  const v = floorHalf(days / 365);
  return { value: v, unit: "year", approx: v % 1 !== 0 };
}

export type LoanStatus = "paid" | "overdue" | "due-soon" | "active";

/**
 * Derived lifecycle for badges + sorting:
 *  - `paid`     : nothing outstanding
 *  - `overdue`  : a due date in the past with money still owed
 *  - `due-soon` : due within `soonDays` (default 7) and still owed
 *  - `active`   : owed, not yet near/over its due date (or open-ended)
 */
export function loanStatus(loan: Loan, now: Date = new Date(), soonDays = 7): LoanStatus {
  if (isPaidOff(loan)) return "paid";
  const d = daysUntilDue(loan, now);
  if (d == null) return "active";
  if (d < 0) return "overdue";
  if (d <= soonDays) return "due-soon";
  return "active";
}

/**
 * This loan's contribution to net worth: an outstanding debt I OWE subtracts,
 * money still owed TO me adds. A paid-off loan contributes 0 either way. The
 * caller filters out archived loans (see the aggregates below).
 */
export function loanNetWorthDelta(loan: Loan): number {
  const out = loanOutstanding(loan);
  return loan.direction === "borrowed" ? -out : out;
}

function visible(loans: Loan[], includeArchived: boolean): Loan[] {
  return includeArchived ? loans : loans.filter((l) => !l.archived);
}

/** Σ outstanding of the debts I owe (non-archived by default). */
export function totalPayable(loans: Loan[], opts: { includeArchived?: boolean } = {}): number {
  return visible(loans, !!opts.includeArchived)
    .filter((l) => l.direction === "borrowed")
    .reduce((s, l) => s + loanOutstanding(l), 0);
}

/** Σ outstanding owed TO me (non-archived by default). */
export function totalReceivable(loans: Loan[], opts: { includeArchived?: boolean } = {}): number {
  return visible(loans, !!opts.includeArchived)
    .filter((l) => l.direction === "lent")
    .reduce((s, l) => s + loanOutstanding(l), 0);
}

/** Loans' net contribution to net worth = receivable − payable. Compose with
 *  `domain/wallet.netWorth` at the UI edge for a full assets − debts figure. */
export function loansNetWorth(loans: Loan[], opts: { includeArchived?: boolean } = {}): number {
  return totalReceivable(loans, opts) - totalPayable(loans, opts);
}

/**
 * How much I OWE, bucketed by WHEN it falls due — the fuel for the loans-overview
 * schedule. Each debt is counted once, at its full outstanding, in exactly one
 * bucket:
 *  - `overdue`  : the due date is already past
 *  - `within30` : due in the next 0–30 days (today counts)
 *  - `within60` : due in 31–60 days
 *  - `later`    : due beyond 60 days, OR open-ended (no due date)
 *
 * `total` is their sum (equals `totalPayable`). Only non-archived borrowed loans
 * with something still outstanding count — money owed TO me is not a bill I pay,
 * so lent loans are excluded. See docs/features/loans.md.
 */
export interface PayableSchedule {
  overdue: number;
  within30: number;
  within60: number;
  later: number;
  total: number;
}
export function payableSchedule(loans: Loan[], now: Date = new Date()): PayableSchedule {
  const s: PayableSchedule = { overdue: 0, within30: 0, within60: 0, later: 0, total: 0 };
  for (const l of loans) {
    if (l.archived || l.direction !== "borrowed") continue;
    const out = loanOutstanding(l);
    if (out <= 0) continue;
    s.total += out;
    const d = daysUntilDue(l, now);
    if (d == null || d > 60) s.later += out;
    else if (d < 0) s.overdue += out;
    else if (d <= 30) s.within30 += out;
    else s.within60 += out;
  }
  return s;
}

/**
 * The next debt payment coming up: the non-archived borrowed loan with the
 * soonest FUTURE due date (today = 0 days) that still owes money. Overdue debts
 * belong to `payableSchedule.overdue`, not here, so a book with only overdue /
 * open-ended debts returns null. Ties break on the larger outstanding.
 */
export function nextPayment(
  loans: Loan[],
  now: Date = new Date(),
): { loan: Loan; days: number; amount: number } | null {
  let best: { loan: Loan; days: number; amount: number } | null = null;
  for (const l of loans) {
    if (l.archived || l.direction !== "borrowed") continue;
    const out = loanOutstanding(l);
    if (out <= 0) continue;
    const d = daysUntilDue(l, now);
    if (d == null || d < 0) continue; // open-ended or overdue → not "upcoming"
    if (!best || d < best.days || (d === best.days && out > best.amount)) {
      best = { loan: l, days: d, amount: out };
    }
  }
  return best;
}

/** Sort for the loans list: unsettled before paid; within unsettled, overdue
 *  first, then soonest due (open-ended last), then the largest outstanding. */
export function sortLoans(loans: Loan[], now: Date = new Date()): Loan[] {
  const rank: Record<LoanStatus, number> = { overdue: 0, "due-soon": 1, active: 2, paid: 3 };
  return [...loans].sort((a, b) => {
    const ra = rank[loanStatus(a, now)];
    const rb = rank[loanStatus(b, now)];
    if (ra !== rb) return ra - rb;
    const da = daysUntilDue(a, now);
    const db = daysUntilDue(b, now);
    const va = da == null ? Infinity : da;
    const vb = db == null ? Infinity : db;
    if (va !== vb) return va - vb;
    return loanOutstanding(b) - loanOutstanding(a);
  });
}

/** The curated lucide icon key for a loan's source (used by the editor + seed). */
export function loanSourceIcon(source: LoanSource): string {
  switch (source) {
    case "personal":
      return "users";
    case "card":
      return "credit-card";
    case "bank":
      return "landmark";
    default:
      return "hand-coins";
  }
}
