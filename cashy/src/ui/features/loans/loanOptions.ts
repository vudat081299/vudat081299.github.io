import type { InterestPeriod, LoanSource } from "@/domain/types";
import type { LoanStatus } from "@/domain/loan";

/** Loan-source options — shared by the editor's Source select and the list's
 *  source-filter facet (value → label). */
export const SOURCES: { value: LoanSource; label: string }[] = [
  { value: "personal", label: "Personal" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Credit card" },
  { value: "other", label: "Other" },
];

/** Interest-rate period options for the editor's Rate-period select. */
export const PERIODS: { value: InterestPeriod; label: string }[] = [
  { value: "year", label: "per year" },
  { value: "month", label: "per month" },
];

/** Status-filter options for the loans-list facet. */
export const STATUS_FILTERS: { value: LoanStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "overdue", label: "Overdue" },
  { value: "due-soon", label: "Due soon" },
  { value: "active", label: "Active" },
  { value: "paid", label: "Settled" },
];
