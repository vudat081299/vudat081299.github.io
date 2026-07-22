// Cashy domain types. Money is ALWAYS an integer count of Vietnamese đồng.
export type TxType = "income" | "expense";
export type ThemeMode = "system" | "light" | "dark";
/** How a subscription's icon tile is coloured. `neutral` (default) keeps every
 *  tile grey — the house neutral-first taste; `brand` tints it with the
 *  service's own hue (the old look). A display preference, like `theme`. */
export type SubIconStyle = "neutral" | "brand";

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
  /** Which card / account / wallet the money moved through — free text for now
   *  (e.g. "Techcombank Visa", "MoMo", "Cash"). A deliberate stepping stone to a
   *  real multi-wallet model later, where this becomes an `accountId`. */
  account?: string;
  /** lifecycle; undefined = "recorded" (legacy rows) */
  status?: TxStatus;
  occurredAt: string; // YYYY-MM-DD
  /** "HH:mm" — OPTIONAL clock time. Most spending is remembered by day, not by
   *  minute, so this is never required and every date comparison in the app
   *  still works off `occurredAt` alone. Absent = "some time that day". */
  occurredTime?: string;
  createdAt: string; // ISO
  /** set when this row is a subscription cycle charge (link + dedup) */
  subscriptionId?: string;
  subMonth?: string; // "YYYY-MM" the cycle this charge belongs to
}

/** How often a subscription bills. Monthly is the default; yearly plans bill on
 *  one fixed day of one fixed month (`dayOfMonth` + `monthOfYear`). */
export type SubInterval = "monthly" | "yearly";

/**
 * A recurring service (Netflix, YouTube…), billing monthly or yearly. It never
 * books money on its own: each due cycle it materialises a `pending` transaction, which the user
 * confirms as "đã trả" (→ `recorded`, counts) or "bỏ qua" (→ `skipped`, grey,
 * still reminds next month). A paused subscription (`active: false`) stops
 * generating new charges but keeps its history.
 */
export interface Subscription {
  id: string;
  name: string;
  amount: number; // integer VND per BILLING CYCLE (not normalised to a month)
  interval: SubInterval;
  dayOfMonth: number; // 1..31 billing day (clamped to the month length)
  /** 1..12 — only meaningful when `interval` is "yearly": the month it bills in.
   *  Together with `dayOfMonth` this is the "ngày a tháng b hàng năm" date. */
  monthOfYear?: number;
  categoryId: string | null;
  tagIds: string[];
  colorHex: string;
  icon: string; // curated lucide key
  note: string;
  /** Which card / account / wallet pays this subscription — free text for now,
   *  inherited onto each cycle charge. Future: an `accountId` into a wallet model. */
  account?: string;
  active: boolean; // false = paused (no new charges), history kept
  /** "YYYY-MM-DD" — the day the user actually subscribed. Billing can start in
   *  this month; nothing before it is ever charged. */
  startedAt: string;
  /** "YYYY-MM-DD" of the most recent confirmed payment, `null` if never paid.
   *  This is the marker the monthly reminder reads: a subscription whose last
   *  payment falls in an earlier month than today's is what "cần trả tháng này"
   *  means. Kept in step with the ledger by the store. */
  lastPaidAt: string | null;
  /** Every transaction that has actually PAID this subscription, oldest first —
   *  the service's payment history. A cache of the ledger (the transactions
   *  carrying `subscriptionId` with status `recorded`), re-derived by the store
   *  on every confirm / skip / undo, so it can never drift from the money. */
  paymentTxIds: string[];
  /**
   * Shared / family plan. `fullAmount` is the WHOLE plan's price per cycle and
   * `members` how many people split it (including you, ≥ 2 when shared); `amount`
   * stays YOUR own share — the number that hits your budget. Both omitted for a
   * solo plan (then amount IS the full price). Stored so the record mirrors
   * reality rather than a bare 1/N figure.
   */
  fullAmount?: number;
  members?: number;
  /**
   * Prorated first charge: when you join part-way through a billing period, the
   * FIRST cycle costs less than a full one (e.g. join on the 15th when billing
   * anchors on the 1st → pay ~half). This is that one-off amount; every later
   * cycle bills `amount`. Omitted = the first cycle bills in full like the rest.
   */
  firstCycleAmount?: number;
  /**
   * Free-trial length in whole MONTHS from `startedAt`. While the trial runs the
   * service costs nothing and no charge is raised at all — the first charge lands
   * on the first billing date ON OR AFTER the trial end (`startedAt` + this many
   * months). Omitted / 0 = billed from the first cycle like any other plan.
   *
   * The boundary is exclusive of the end day the way a person reads it: "3 months
   * free from 10 Jan" means free through 9 Apr and the first charge on 10 Apr —
   * so `domain/subscription.inTrial` is true strictly BEFORE the trial-end date.
   */
  trialMonths?: number;
  /**
   * The day the service actually stopped (YYYY-MM-DD), set when it is cancelled.
   * Cycles that would bill on or after it are never raised, and any already
   * raised are retired — so cancelling in May doesn't leave June and July
   * standing there as "unpaid" for the user to tidy up by hand. Cleared on
   * resume. Absent while the subscription is running.
   */
  cancelledAt?: string;
  createdAt: string; // ISO
}

export interface CashyState {
  version: number;
  theme: ThemeMode;
  /** subscription icon tile colouring; defaults to "neutral" */
  subIconStyle: SubIconStyle;
  workspace: Workspace | null;
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
  subscriptions: Subscription[];
}
