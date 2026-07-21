// Cashy domain types. Money is ALWAYS an integer count of Vietnamese đồng.
export type TxType = "income" | "expense";
export type ThemeMode = "system" | "light" | "dark";

/**
 * Lifecycle of a transaction — drives the status column + which rows count.
 * Only `recorded` affects the money totals; the rest are shown but not summed.
 *  - recorded : done & counted (green)
 *  - pending  : a subscription charge awaiting the user's confirmation (amber)
 *  - awaiting : settled by another party — transfer/investment in flight (blue)
 *  - skipped  : cancelled / skipped this cycle (grey)
 *  - failed   : the payment failed (red)
 */
export type TxStatus = "recorded" | "pending" | "awaiting" | "skipped" | "failed";

export interface Workspace {
  displayName: string;
  currency: string; // "VND"
  createdAt: string; // ISO
}

// Self-referencing tree, unlimited depth. `order` sorts siblings.
export interface Category {
  id: string;
  parentId: string | null;
  order: number;
  name: string;
  colorHex: string;
  icon: string; // curated lucide key, see lib/icons
  type: TxType;
  isSystem: boolean;
}

// Flat label. A transaction may carry many tags (1-n).
export interface Tag {
  id: string;
  name: string;
  colorHex: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number; // integer VND, >= 0; sign implied by `type`
  type: TxType;
  categoryId: string | null; // exactly one category (or none)
  tagIds: string[]; // zero or more tags
  note: string;
  /** counterparty / source-destination — company, buyer/seller, merchant */
  payee?: string;
  /** lifecycle; undefined = "recorded" (legacy rows) */
  status?: TxStatus;
  occurredAt: string; // YYYY-MM-DD
  createdAt: string; // ISO
  /** set when this row is a subscription cycle charge (link + dedup) */
  subscriptionId?: string;
  subMonth?: string; // "YYYY-MM" the cycle this charge belongs to
}

/**
 * A recurring monthly service (Netflix, YouTube…). It never books money on its
 * own: each due month it materialises a `pending` transaction, which the user
 * confirms as "đã trả" (→ `recorded`, counts) or "bỏ qua" (→ `skipped`, grey,
 * still reminds next month). A paused subscription (`active: false`) stops
 * generating new charges but keeps its history.
 */
export interface Subscription {
  id: string;
  name: string;
  amount: number; // integer VND per month
  dayOfMonth: number; // 1..31 billing day (clamped to the month length)
  categoryId: string | null;
  tagIds: string[];
  colorHex: string;
  icon: string; // curated lucide key
  note: string;
  active: boolean; // false = paused (no new charges), history kept
  /** "YYYY-MM-DD" — the day the user actually subscribed. Billing can start in
   *  this month; nothing before it is ever charged. */
  startedAt: string;
  /** "YYYY-MM-DD" of the most recent confirmed payment, `null` if never paid.
   *  This is the marker the monthly reminder reads: a subscription whose last
   *  payment falls in an earlier month than today's is what "cần trả tháng này"
   *  means. Kept in step with the ledger by the store. */
  lastPaidAt: string | null;
  createdAt: string; // ISO
}

export interface CashyState {
  version: number;
  theme: ThemeMode;
  workspace: Workspace | null;
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
  subscriptions: Subscription[];
}
