import type { InterestPeriod, Loan, LoanDirection, LoanPayment, LoanSource } from "@/domain/types";
import { commit, getState } from "@/data/store";
import { uid } from "@/lib/id";

type LoanInput = {
  direction: LoanDirection;
  counterparty: string;
  source: LoanSource;
  principal: number;
  interestRatePct: number;
  interestPeriod: InterestPeriod;
  openedAt: string;
  dueAt: string | null;
  colorHex: string;
  icon: string;
  note: string;
  /** initial payment entries (the editor manages the list locally, then commits it) */
  payments?: LoanPayment[];
};

/** A payment entry with a fresh id + coerced integer amount. */
function normalisePayment(p: { id?: string; amount: number; date: string; note?: string }): LoanPayment {
  return {
    id: p.id ?? uid(),
    amount: Math.max(0, Math.round(p.amount || 0)),
    date: p.date,
    note: (p.note ?? "").trim(),
  };
}

/** Create a loan, appended to the list. Returns the new id. */
export function addLoan(input: LoanInput): string {
  const state = getState();
  const loan: Loan = {
    id: uid(),
    direction: input.direction,
    counterparty: input.counterparty.trim() || "Unknown",
    source: input.source,
    principal: Math.max(0, Math.round(input.principal || 0)),
    interestRatePct: Math.max(0, input.interestRatePct || 0),
    interestPeriod: input.interestPeriod,
    openedAt: input.openedAt,
    dueAt: input.dueAt || null,
    payments: (input.payments ?? []).map(normalisePayment).filter((p) => p.amount > 0),
    colorHex: input.colorHex,
    icon: input.icon,
    note: input.note.trim(),
    archived: false,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, loans: [...state.loans, loan] });
  return loan.id;
}

/** Patch a loan's fields. Payments passed in a patch are normalised + filtered. */
export function updateLoan(id: string, patch: Partial<Loan>): void {
  const state = getState();
  const clean: Partial<Loan> = { ...patch };
  if (patch.payments) clean.payments = patch.payments.map(normalisePayment).filter((p) => p.amount > 0);
  if (patch.principal != null) clean.principal = Math.max(0, Math.round(patch.principal));
  commit({ ...state, loans: state.loans.map((l) => (l.id === id ? { ...l, ...clean } : l)) });
}

/** Archive / un-archive a loan — hides it, keeps its history + payments. */
export function setLoanArchived(id: string, archived: boolean): void {
  updateLoan(id, { archived });
}

/** Delete a loan outright. Self-contained — no ledger rows reference it. */
export function deleteLoan(id: string): void {
  const state = getState();
  commit({ ...state, loans: state.loans.filter((l) => l.id !== id) });
}

/** Record a repayment (a `borrowed` loan) / collection (a `lent` loan). A
 *  non-positive amount is ignored rather than stored as a zero entry. */
export function addLoanPayment(id: string, input: { amount: number; date: string; note?: string }): void {
  const payment = normalisePayment(input);
  if (payment.amount <= 0) return;
  const state = getState();
  commit({
    ...state,
    loans: state.loans.map((l) => (l.id === id ? { ...l, payments: [...l.payments, payment] } : l)),
  });
}

/** Remove one payment entry from a loan. */
export function removeLoanPayment(id: string, paymentId: string): void {
  const state = getState();
  commit({
    ...state,
    loans: state.loans.map((l) =>
      l.id === id ? { ...l, payments: l.payments.filter((p) => p.id !== paymentId) } : l,
    ),
  });
}
