// Cashy domain types. Money is ALWAYS an integer count of Vietnamese đồng.
export type TxType = "income" | "expense";
export type ThemeMode = "system" | "light" | "dark";
/** How a subscription's icon tile is coloured. `neutral` (default) keeps every
 *  tile grey — the house neutral-first taste; `brand` tints it with the
 *  service's own hue (the old look). A display preference, like `theme`. */
export type SubIconStyle = "neutral" | "brand";

/**
 * What kind of account a wallet is. v1 covers spending wallets; the union is
 * deliberately OPEN — `savings | investment | asset | liability` slot in later
 * for full net-worth WITHOUT a second migration. See `docs/wallets-plan.md`.
 */
export type WalletKind = "cash" | "bank" | "ewallet" | "card" | "other";

/** The payment network printed on a card — a classification label for `card`
 *  wallets only. The union is OPEN like `WalletKind`; `other` covers the rest
 *  (Napas, UnionPay, Discover…). */
export type CardNetwork = "visa" | "mastercard" | "amex" | "jcb" | "other";

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

/**
 * A place money sits — cash, a bank account, an e-wallet, a card. A transaction
 * moves through one wallet (`Transaction.walletId`); a transfer moves between two
 * (`walletId` → `toWalletId`). Current balance = `openingBalance` + net of the
 * wallet's recorded rows — see `domain/wallet.walletBalance`. Rendered neutral/grey
 * like categories & tags; `colorHex` is a classification accent, never decoration.
 */
export interface Wallet {
  id: string;
  name: string;
  kind: WalletKind;
  /** integer VND balance BEFORE the ledger begins; may be negative (a card in debt) */
  openingBalance: number;
  /** For a card (`kind: "card"`): the payment network — a classification label
   *  only. Absent for non-cards. */
  cardNetwork?: CardNetwork;
  /** For a card: its credit limit (hạn mức) in integer VND. Drives the
   *  utilisation bar (debt ÷ limit) + available-credit readout. Absent = none/unknown. */
  creditLimit?: number;
  colorHex: string; // classification hue
  icon: string; // curated lucide key, see lib/icons
  order: number; // sort position among wallets
  archived: boolean; // true = hidden from pickers, history kept
  createdAt: string; // ISO
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
  /** FK → Wallet.id — the wallet the money sits in / moves FROM. `null`/absent =
   *  unassigned (legacy rows, or one left blank). Supersedes the free-text
   *  `account` above; see `domain/wallet` + `docs/wallets-plan.md`. */
  walletId?: string | null;
  /** Present ⇒ this row is a TRANSFER: `amount` moves from `walletId` to this
   *  wallet, counting toward NEITHER income nor expense — only wallet balances
   *  (`domain/wallet.isTransfer`). A transfer carries no category. */
  toWalletId?: string;
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
  /** FK → Wallet.id — the wallet that pays this sub, inherited onto each cycle
   *  charge (like `account`). See `docs/wallets-plan.md`. */
  walletId?: string | null;
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

/** Which side of a loan you're on. `borrowed` = money you took and must repay
 *  (a liability); `lent` = money you gave out and expect back (a receivable). */
export type LoanDirection = "borrowed" | "lent";

/** Where a loan came from / went to. Drives the icon + a classification chip; the
 *  union is OPEN like `WalletKind` so more sources can slot in without a migration. */
export type LoanSource = "personal" | "card" | "bank" | "other";

/** The period an interest rate is quoted over. Reference/display ONLY — Cashy
 *  never auto-accrues interest into the balance (see docs/loans-plan.md). */
export type InterestPeriod = "year" | "month";

/** One manual repayment (a `borrowed` loan) or collection (a `lent` loan). The
 *  loan's outstanding is `principal` minus the sum of these — Cashy tracks the
 *  money by hand rather than generating a schedule. */
export interface LoanPayment {
  id: string;
  amount: number; // integer VND, > 0
  date: string; // YYYY-MM-DD
  note: string;
}

/**
 * A debt you owe or a loan you've made. Kept as its OWN record — not a wallet and
 * not a transaction — so it can carry the lender/borrower, source, interest rate
 * and a due date (`hạn trả`). The outstanding balance is DERIVED (`principal`
 * minus its payments, floored at 0) and interest is stored for reminders /
 * reference only, never accrued automatically. Rendered neutral/grey like every
 * other entity; `colorHex` is a classification accent, never decoration. See
 * `domain/loan` + `docs/loans-plan.md`.
 */
export interface Loan {
  id: string;
  direction: LoanDirection;
  /** the other party — the lender (`borrowed`) or the borrower (`lent`) */
  counterparty: string;
  source: LoanSource;
  /** integer VND, > 0 — the original amount borrowed / lent */
  principal: number;
  /** annual or monthly %, for display + reminders only; 0 = interest-free */
  interestRatePct: number;
  interestPeriod: InterestPeriod;
  openedAt: string; // YYYY-MM-DD — when the loan was taken out / given
  /** YYYY-MM-DD due date (`hạn trả`); null = open-ended, no fixed date */
  dueAt: string | null;
  /** manual repayment / collection entries; outstanding = principal − Σ amounts */
  payments: LoanPayment[];
  colorHex: string; // classification hue
  icon: string; // curated lucide key, see lib/icons
  note: string;
  archived: boolean; // true = closed/hidden, history kept
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
  wallets: Wallet[];
  loans: Loan[];
}
