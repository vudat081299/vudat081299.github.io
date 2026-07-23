import type { SubInterval, Subscription, Transaction } from "@/domain/types";
import {
  addMonthKey,
  addMonths,
  billingDate,
  daysBetween,
  monthKey,
  monthLabelShort,
  monthNameShort,
  monthsBetweenKeys,
  ymd,
} from "@/domain/date";
import { statusOf } from "@/domain/txStatus";

// A subscription's per-cycle state IS a transaction (subscriptionId + subMonth):
//   status "pending" = awaiting confirm · "recorded" = paid · "skipped" = skipped.
// `dueCharges` below decides which of those charges a ledger is still missing.
export interface SubStatus {
  /** charges awaiting the user's decision (oldest first) */
  pending: { month: string; txId: string }[];
  /** the next month that will bill in the future (a reminder), if still active */
  nextMonth: string | null;
  nextDate: string | null; // YYYY-MM-DD billing date of nextMonth
  paidCount: number;
  /** how much this subscription has actually cost so far (recorded charges) */
  spent: number;
}

// A "cycle key" is still "YYYY-MM" for BOTH intervals — a yearly plan simply
// only ever has one key per year (the month it bills in). Keeping one key shape
// is what lets `subMonth`, the dedup key and the whole existing ledger carry
// yearly plans without a second code path.

/** Months spanned by one billing cycle. */
export function cycleMonths(sub: Subscription): number {
  return sub.interval === "yearly" ? 12 : 1;
}

/** Shift a cycle key by n whole cycles (n may be negative). */
export function addCycle(sub: Subscription, key: string, n: number): string {
  return addMonthKey(key, n * cycleMonths(sub));
}

/** The day money is wanted for a given cycle. */
export function cycleDate(sub: Subscription, key: string): string {
  return billingDate(key, sub.dayOfMonth);
}

/**
 * The first cycle a subscription can ever be billed for. Monthly: the month it
 * was subscribed. Yearly: its fixed billing month — in the start year if that
 * date hadn't passed yet when they subscribed, otherwise the following year, so
 * signing up in June for a March plan doesn't instantly owe a backdated March.
 */
export function startCycle(sub: Subscription): string {
  const startMonth = sub.startedAt.slice(0, 7);
  if (sub.interval !== "yearly") return startMonth;
  const year = Number(sub.startedAt.slice(0, 4));
  const mm = String(Math.min(12, Math.max(1, sub.monthOfYear ?? 1))).padStart(2, "0");
  const thisYear = `${year}-${mm}`;
  return cycleDate(sub, thisYear) >= sub.startedAt ? thisYear : `${year + 1}-${mm}`;
}

/**
 * The day the free trial ends, or `null` when there is no trial. The service is
 * free STRICTLY BEFORE this date; the first charge lands on the first billing
 * date on or after it. A person reads "3 months free from 10 Jan" as free through
 * 9 Apr with the first charge on 10 Apr — which is exactly this date.
 */
export function trialEndDate(sub: Subscription): string | null {
  return sub.trialMonths && sub.trialMonths > 0 ? addMonths(sub.startedAt, sub.trialMonths) : null;
}

/**
 * The first cycle a charge is ever raised for. Without a trial that is simply the
 * starting cycle; with one it is the first cycle whose billing date falls on or
 * after the trial end — every earlier cycle is inside the free window and books
 * nothing. Walked forward on the plan's own grid so a yearly trial skips whole
 * years and a monthly one skips whole months, with no interval-specific maths.
 */
export function firstBillableCycle(sub: Subscription): string {
  const start = startCycle(sub);
  const end = trialEndDate(sub);
  if (!end) return start;
  let k = start;
  for (let guard = 0; guard < 600; guard++) {
    if (cycleDate(sub, k) >= end) return k;
    k = addCycle(sub, k, 1);
  }
  return k;
}

/** True while the service is inside its free window: it has a trial and today is
 *  before the trial-end date. Paused plans are never "in trial" — they bill
 *  nothing regardless — so this stays a pure statement about the calendar. */
export function inTrial(sub: Subscription, now: Date = new Date()): boolean {
  const end = trialEndDate(sub);
  return end != null && ymd(now) < end;
}

/**
 * The cycle a given month falls in — the latest grid cycle at or before it, or
 * `null` when the month precedes the plan entirely.
 *
 * The cycles of a plan sit on a grid anchored to `startCycle`, one step every
 * `cycleMonths`. A month is snapped onto that grid rather than used directly,
 * because an arbitrary month need not BE a cycle: a yearly plan only has one
 * cycle a year, so "2026-03" belongs to whichever June cycle precedes it.
 */
export function cycleContaining(sub: Subscription, month: string): string | null {
  const start = startCycle(sub);
  const diff = monthsBetweenKeys(start, month);
  if (diff < 0) return null;
  return addCycle(sub, start, Math.floor(diff / cycleMonths(sub)));
}

/**
 * The first cycle still owed: the cycle after the last payment, or the starting
 * cycle if it has never been paid. Charges are never raised before this, which
 * is what stops an old subscription backfilling years of dues.
 *
 * The last payment is SNAPPED onto the cycle grid before stepping forward. That
 * matters when the grid has moved under the history — editing a yearly plan's
 * `monthOfYear` re-anchors every cycle, and a payment made on the old schedule
 * no longer lands on a cycle key. Advancing from the raw month would produce a
 * key that is not on the grid at all, and the next cycle to fall due would be
 * silently skipped rather than billed.
 */
export function firstUnpaidCycle(sub: Subscription): string {
  // Baseline on the first BILLABLE cycle, not the start cycle: a free trial makes
  // the two differ, and nothing owed can ever precede the first cycle that bills.
  // With no trial they are identical, so this is a no-op for ordinary plans.
  const start = firstBillableCycle(sub);
  if (!sub.lastPaidAt) return start;
  const paidCycle = cycleContaining(sub, sub.lastPaidAt.slice(0, 7));
  if (!paidCycle) return start; // paid before the plan's first cycle
  const after = addCycle(sub, paidCycle, 1);
  return after > start ? after : start;
}

/**
 * The cycle today falls in — the latest one whose billing date has already
 * passed. Walked forward from the start rather than computed from today, because
 * a yearly plan's cycles sit on a grid anchored to ITS billing month, which no
 * amount of arithmetic on "this month" can recover.
 */
export function currentCycle(sub: Subscription, now: Date = new Date()): string {
  const today = ymd(now);
  let k = startCycle(sub);
  if (cycleDate(sub, k) > today) return k; // hasn't billed once yet
  for (let guard = 0; guard < 4000; guard++) {
    const next = addCycle(sub, k, 1);
    if (cycleDate(sub, next) > today) break;
    k = next;
  }
  return k;
}

/**
 * Should this subscription be asking for money NOW? True when it is active and
 * has at least one unresolved (still-pending) charge on the books.
 *
 * Read from the LEDGER, not from `lastPaidAt`. Paying a newer cycle while an
 * older one is still owed used to jump that marker past the old cycle, so the
 * card fell quiet while the orphaned pending charge kept nagging in the dues
 * list and the transactions table — three surfaces, three different answers.
 * Deriving "due" from the charges themselves is what makes them agree.
 * (`dueCharges` only ever raises a pending charge once its billing day has
 * passed, so a pending charge already means "due".)
 */
export function needsPaymentNow(
  sub: Subscription,
  txs: Transaction[],
  now: Date = new Date(),
): boolean {
  if (!sub.active) return false;
  return subscriptionStatus(sub, txs, now).pending.length > 0;
}

/**
 * A service the provider would have cut off: still switched on, but a WHOLE
 * billing cycle has gone by with an earlier cycle still owed. That is a different
 * thing from "due now", which is merely a bill on the doormat. Ledger-based too,
 * so skipping a cycle clears the lapse instead of leaving the card stuck on
 * "Suspended" forever.
 */
export function isLapsed(
  sub: Subscription,
  txs: Transaction[],
  now: Date = new Date(),
): boolean {
  if (!sub.active) return false;
  const { pending } = subscriptionStatus(sub, txs, now);
  return pending.length > 0 && pending[0].month < currentCycle(sub, now);
}

/** How many whole cycles this subscription currently owes — the count of
 *  still-pending charges (read from the ledger, see `needsPaymentNow`). */
export function cyclesOwed(
  sub: Subscription,
  txs: Transaction[],
  now: Date = new Date(),
): number {
  if (!sub.active) return 0;
  return subscriptionStatus(sub, txs, now).pending.length;
}

/**
 * The ONE bucket a subscription is in right now — the single source of truth the
 * card, the sort and the status filter all read, so the three never disagree
 * about whether a service is "due" or "suspended". The ladder mirrors the card's
 * own tone precedence (§1): a cancelled service is set apart, then among the
 * running ones a suspended (lapsed) service outranks a bill that is merely due,
 * which outranks a free trial, and everything settled is plain "active".
 */
export type SubState = "suspended" | "due" | "trial" | "active" | "cancelled";

export function subState(
  sub: Subscription,
  txs: Transaction[],
  now: Date = new Date(),
): SubState {
  if (!sub.active) return "cancelled";
  if (isLapsed(sub, txs, now)) return "suspended";
  if (needsPaymentNow(sub, txs, now)) return "due";
  if (inTrial(sub, now)) return "trial";
  return "active";
}

/** Rank for the default "by status" ordering — urgent first, cancelled last. */
const SUB_STATE_RANK: Record<SubState, number> = {
  suspended: 0,
  due: 1,
  trial: 2,
  active: 3,
  cancelled: 4,
};

/**
 * The default display order: whatever needs attention first (suspended → due →
 * trial → active → cancelled), then alphabetically within a bucket. Pure and
 * `now`-injected, so it is testable and shared by both the Dashboard strip and
 * the Subscriptions screen instead of each re-deriving an order.
 */
export function sortSubscriptions(
  subs: Subscription[],
  txs: Transaction[],
  now: Date = new Date(),
): Subscription[] {
  return [...subs].sort(
    (a, b) =>
      SUB_STATE_RANK[subState(a, txs, now)] - SUB_STATE_RANK[subState(b, txs, now)] ||
      a.name.localeCompare(b.name, "en"),
  );
}

/**
 * The date money is next wanted. For a service that is up to date that is the
 * next billing day; for one that already owes a cycle it is the day that cycle
 * fell due — a date in the PAST, which is the whole point: "next payment: in
 * three weeks" would be a lie while a bill is sitting there unpaid.
 *
 * The EARLIEST still-pending charge wins when there is one, for the same reason
 * `needsPaymentNow` reads the ledger: settling a later cycle out of order must
 * not make the card advertise a future date while an older bill is outstanding.
 * With nothing pending, the first unpaid cycle's billing date is the answer —
 * already correct for a settled plan and for one that hasn't begun billing.
 * (Deriving it from `subCycle().end` instead got that last case a year wrong:
 * that cycle's END is one full period after a start that hasn't happened.)
 */
export function nextPaymentDate(
  sub: Subscription,
  txs: Transaction[] = [],
  now: Date = new Date(),
): string {
  const { pending } = subscriptionStatus(sub, txs, now);
  if (pending.length) return cycleDate(sub, pending[0].month);
  return cycleDate(sub, firstUnpaidCycle(sub));
}

export interface Proration {
  /** the reduced first-cycle charge (whole đồng) */
  amount: number;
  /** days actually covered (join → next billing date) */
  days: number;
  /** the full cycle's length in days, for the "X/Y ngày" caption */
  total: number;
}

/**
 * The prorated FIRST charge when a plan is joined part-way through a period. The
 * first cycle opens on the plan's billing anchor (e.g. the 1st); if the join date
 * falls AFTER that anchor, only the slice from the join to the next billing date
 * is owed — `share × usedDays / cycleDays`. Returns `null` when there is nothing
 * to prorate (joined on/before the anchor → the first cycle is billed in full).
 *
 * In practice this only ever fires for MONTHLY plans, and that is correct rather
 * than an oversight: a yearly plan joined after its billing month has its first
 * cycle pushed to next year by `startCycle` (so that signing up in June for a
 * March plan doesn't instantly owe a backdated March). Its first cycle therefore
 * always opens in the future and is billed in full — there is no part-period to
 * charge for. The maths below is written generally anyway, so it stays correct if
 * that anchoring rule ever changes.
 */
export function firstCycleProration(opts: {
  amount: number;
  startedAt: string;
  dayOfMonth: number;
  interval: SubInterval;
  monthOfYear?: number;
}): Proration | null {
  // Reuse the cycle maths via a minimal sub-shape (only these fields are read).
  const s = {
    interval: opts.interval,
    dayOfMonth: opts.dayOfMonth,
    monthOfYear: opts.monthOfYear,
    startedAt: opts.startedAt,
  } as Subscription;
  const sc = startCycle(s);
  const cycleStart = cycleDate(s, sc);
  const cycleEnd = cycleDate(s, addCycle(s, sc, 1));
  if (opts.startedAt <= cycleStart) return null; // joined on/before the anchor
  const total = daysBetween(cycleStart, cycleEnd);
  const used = daysBetween(opts.startedAt, cycleEnd);
  if (used <= 0 || used >= total) return null;
  return { amount: Math.max(0, Math.round((opts.amount * used) / total)), days: used, total };
}

export interface SubCycle {
  /** the billing date that opened the cycle today falls in */
  start: string;
  /** the next billing date — when money is wanted again */
  end: string;
  /** real calendar days in this cycle: 28, 29, 30 or 31, whatever the month is */
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  /** 0..1 — how far through the paid-for period we are */
  pct: number;
  /** false when the first billing date is still ahead: there is no period in
   *  progress yet, so a progress bar would be reporting on nothing. */
  started: boolean;
}
/**
 * Where today sits inside the current billing period. Both ends are REAL billing
 * dates, so the length is whatever that particular period happens to be — 28 days
 * in February, 31 in July, 366 across a leap year — rather than an assumed 30 or
 * 365. Yearly plans need no special case: the two ends are simply a year apart.
 */
export function subCycle(sub: Subscription, now: Date = new Date()): SubCycle {
  const today = ymd(now);
  const k = currentCycle(sub, now);
  const start = cycleDate(sub, k);
  const end = cycleDate(sub, addCycle(sub, k, 1));

  const totalDays = Math.max(1, daysBetween(start, end));
  const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(start, today)));
  return {
    start,
    end,
    totalDays,
    elapsedDays,
    remainingDays: totalDays - elapsedDays,
    pct: elapsedDays / totalDays,
    started: start <= today,
  };
}

/**
 * The progress of the FREE window `[startedAt → trialEndDate]` for a trialing
 * plan — the mirror of `subCycle` so the card can reuse the very same progress
 * markup, just fed a different span. The end is the first-charge date, so a full
 * bar reads as "billing starts now". Returns `null` when the plan has no trial.
 */
export function trialCycle(sub: Subscription, now: Date = new Date()): SubCycle | null {
  const end = trialEndDate(sub);
  if (!end) return null;
  const start = sub.startedAt;
  const today = ymd(now);
  const totalDays = Math.max(1, daysBetween(start, end));
  const elapsedDays = Math.min(totalDays, Math.max(0, daysBetween(start, today)));
  return {
    start,
    end,
    totalDays,
    elapsedDays,
    remainingDays: totalDays - elapsedDays,
    pct: elapsedDays / totalDays,
    started: start <= today,
  };
}

export function subscriptionStatus(
  sub: Subscription,
  txs: Transaction[],
  now: Date = new Date(),
): SubStatus {
  const mine = txs.filter((t) => t.subscriptionId === sub.id);
  const haveMonth = new Set(mine.map((t) => t.subMonth));
  const pending = mine
    .filter((t) => t.status === "pending" && t.subMonth)
    .map((t) => ({ month: t.subMonth as string, txId: t.id }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  const recorded = mine.filter((t) => (t.status ?? "recorded") === "recorded");

  // Next reminder = earliest FUTURE cycle (billing not yet reached) with no
  // charge. Walked forward one cycle at a time from the first unpaid one, which
  // keeps a yearly plan on its own grid instead of snapping it to this month.
  let nextMonth: string | null = null;
  if (sub.active) {
    const today = ymd(now);
    let mm = firstUnpaidCycle(sub);
    for (let guard = 0; guard < 600; guard++) {
      if (!haveMonth.has(mm) && cycleDate(sub, mm) > today) {
        nextMonth = mm;
        break;
      }
      mm = addCycle(sub, mm, 1);
    }
  }

  return {
    pending,
    nextMonth,
    nextDate: nextMonth ? cycleDate(sub, nextMonth) : null,
    paidCount: recorded.length,
    spent: recorded.reduce((s, t) => s + t.amount, 0),
  };
}

export interface Due {
  sub: Subscription;
  month: string; // YYYY-MM
  txId: string;
}
/** Every pending charge across the active subscriptions, oldest first. */
export function collectDues(
  subs: Subscription[],
  txs: Transaction[],
  now: Date = new Date(),
): Due[] {
  const out: Due[] = [];
  for (const sub of subs) {
    if (!sub.active) continue;
    for (const p of subscriptionStatus(sub, txs, now).pending) {
      out.push({ sub, month: p.month, txId: p.txId });
    }
  }
  return out.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
}

/**
 * Total committed spend per MONTH across the still-active subscriptions. A
 * yearly plan is spread over its twelve months — billing it as if the whole
 * annual fee landed every month would overstate the commitment twelvefold.
 */
export function monthlyCommitment(subs: Subscription[]): number {
  return subs
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.amount / cycleMonths(s), 0);
}

/** "day 15 each month" / "15 Mar each year" — how a plan states its billing. */
export function billingLabel(sub: Subscription): string {
  if (sub.interval !== "yearly") return `day ${sub.dayOfMonth} each month`;
  return `${sub.dayOfMonth} ${monthNameShort(sub.monthOfYear ?? 1)} each year`;
}

// ---- payment history -------------------------------------------------------
/**
 * A subscription's payment history, read straight off the ledger: the charges it
 * booked that were actually confirmed, oldest first, plus the date of the last
 * of them. The two stored fields (`paymentTxIds`, `lastPaidAt`) are only ever a
 * cache of this — deriving them in one place is what stops confirm / skip / undo
 * / delete-a-charge drifting the service's history away from the money it claims
 * to have spent.
 */
export function paymentsOf(
  subId: string,
  txs: Transaction[],
): { paymentTxIds: string[]; lastPaidAt: string | null } {
  const paid = txs
    .filter((t) => t.subscriptionId === subId && statusOf(t) === "recorded")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  return {
    paymentTxIds: paid.map((t) => t.id),
    lastPaidAt: paid.length ? paid[paid.length - 1].occurredAt : null,
  };
}

/** True when the cached history no longer matches what the ledger says. */
export function paymentsDrifted(
  sub: Subscription,
  next: { paymentTxIds: string[]; lastPaidAt: string | null },
): boolean {
  return (
    sub.lastPaidAt !== next.lastPaidAt ||
    sub.paymentTxIds.length !== next.paymentTxIds.length ||
    !sub.paymentTxIds.every((id, i) => id === next.paymentTxIds[i])
  );
}

// ---- raising the charges ---------------------------------------------------
/** A charge that ought to exist but doesn't yet. Identity (`id`, `createdAt`) is
 *  the caller's job — this stays pure so the billing rule can be tested. */
export type DueCharge = Omit<Transaction, "id" | "createdAt">;

/**
 * Every charge the ledger is still missing: one `pending` expense per due cycle
 * of each ACTIVE subscription that has no charge on record yet.
 *
 * Walking starts at `firstUnpaidCycle`, NOT at the subscription's start date —
 * `lastPaidAt` says everything up to it is settled, so a service subscribed a
 * year ago doesn't materialise a year of dues the first time this runs. Cycles
 * whose billing date is still in the future are skipped.
 *
 * Idempotent by construction: a cycle already carrying a charge is never raised
 * again, so calling this on every app mount only ever adds genuinely new dues.
 */
export function dueCharges(
  subs: Subscription[],
  txs: Transaction[],
  now: Date = new Date(),
): DueCharge[] {
  const cur = monthKey(now);
  const today = ymd(now);
  const have = new Set(
    txs.filter((t) => t.subscriptionId).map((t) => `${t.subscriptionId}|${t.subMonth}`),
  );
  const out: DueCharge[] = [];
  for (const sub of subs) {
    if (!sub.active) continue;
    const first = startCycle(sub);
    let m = firstUnpaidCycle(sub);
    for (let guard = 0; m <= cur && guard < 600; guard++, m = addCycle(sub, m, 1)) {
      if (cycleDate(sub, m) > today) continue; // not due yet
      if (have.has(`${sub.id}|${m}`)) continue; // already charged
      // The very first cycle can be a prorated (smaller) charge when the plan was
      // joined mid-period; every later cycle bills the full share.
      const amount = sub.firstCycleAmount != null && m === first ? sub.firstCycleAmount : sub.amount;
      out.push({
        amount,
        type: "expense",
        categoryId: sub.categoryId,
        tagIds: sub.tagIds,
        note: sub.name,
        payee: `Subscription · ${monthLabelShort(m)}`,
        account: sub.account,
        walletId: sub.walletId,
        status: "pending",
        occurredAt: cycleDate(sub, m),
        subscriptionId: sub.id,
        subMonth: m,
      });
    }
  }
  return out;
}

// ---- catching up on owed cycles --------------------------------------------
/**
 * What the user said about ONE owed cycle in the catch-up dialog: did they use
 * the service that cycle, and did they pay for it. The two are separate
 * questions — "I cancelled Netflix in May" and "I paid for May" are different
 * facts, and only the pair of them settles what the cycle's charge should be.
 */
export interface CycleChoice {
  txId: string;
  month: string;
  /** the service was running that cycle (switch on) */
  used: boolean;
  /** the cycle was actually paid for (checkbox ticked) */
  paid: boolean;
}

export interface CatchUpPlan {
  /** charges to record as real spending */
  pay: string[];
  /** charges to grey out — the service wasn't used that cycle */
  skip: string[];
  /** every cycle was switched off, so the user is really cancelling the service */
  cancelling: boolean;
  /** null when the plan may be submitted; otherwise why it may not be */
  problem: string | null;
}

/**
 * Turn the dialog's per-cycle answers into the charges to record and to skip.
 *
 * The rule that makes this more than a partition: **debts are settled oldest
 * first**. A subscription is a queue — a provider paid in June while May is
 * still outstanding has not been paid for June, they have been paid for May.
 * So a cycle that was used but left unpaid may only sit at the TAIL of the
 * timeline: paying cycles 1–3 of five owed is fine, paying only cycle 2 while
 * cycle 1 stands unpaid is not, and this is where that gets rejected.
 *
 * Cycles switched OFF are not debts at all, so they are transparent to that
 * ordering — skipping cycle 1 and paying cycle 2 is perfectly coherent.
 *
 * Switching every cycle off says the service was never running in any of them,
 * which is a cancellation rather than a catch-up; `cancelling` tells the caller
 * to deactivate the subscription once the charges are settled.
 *
 * `rows` must be in chronological order (oldest first) — the order
 * `subscriptionStatus().pending` already returns.
 */
export function planCatchUp(rows: CycleChoice[]): CatchUpPlan {
  const pay: string[] = [];
  const skip: string[] = [];
  // The oldest cycle the user says they used but have NOT paid for. Everything
  // paid must come before it; the first thing that doesn't is the violation.
  let owedFrom: string | null = null;
  let outOfOrder: string | null = null;

  for (const r of rows) {
    if (!r.used) {
      skip.push(r.txId);
      continue; // not a debt, so it neither opens nor breaks the queue
    }
    if (r.paid) {
      pay.push(r.txId);
      if (owedFrom && !outOfOrder) outOfOrder = r.month;
    } else if (!owedFrom) {
      owedFrom = r.month;
    }
  }

  const cancelling = rows.length > 0 && rows.every((r) => !r.used);
  let problem: string | null = null;
  if (outOfOrder && owedFrom) {
    problem =
      `Settle the oldest cycle first. ${monthLabelShort(owedFrom)} is still unpaid, ` +
      `but the later ${monthLabelShort(outOfOrder)} is marked as paid.`;
  } else if (pay.length === 0 && skip.length === 0) {
    problem = "No changes to save.";
  }

  return { pay, skip, cancelling, problem };
}

// ---- cancelling ------------------------------------------------------------
/**
 * The ledger after a subscription is cancelled effective `cancelledAt`.
 *
 * A charge is only real if the service was running when it billed, so every
 * PENDING charge whose billing date falls on or after the stop date is dropped —
 * those cycles never happened. Charges that billed BEFORE it stay owed: you had
 * the service for that period whether or not you have paid for it yet.
 *
 * Recorded and skipped charges are never touched at all; they are history, and
 * history does not change because the service later ended.
 *
 * This is what stops a cancellation from leaving a pile of phantom "unpaid"
 * cycles for the user to clear by hand in the catch-up dialog.
 */
export function chargesSurvivingCancel(
  txs: Transaction[],
  sub: Subscription,
  cancelledAt: string,
): Transaction[] {
  return txs.filter((t) => {
    if (t.subscriptionId !== sub.id) return true;
    if (statusOf(t) !== "pending") return true; // settled history stays
    if (!t.subMonth) return true;
    return cycleDate(sub, t.subMonth) < cancelledAt;
  });
}

/**
 * Removing a subscription from the ledger. Recorded charges are real spending
 * and stay behind; the unconfirmed ones (pending / skipped) go with it.
 */
export function chargesSurvivingDeletion(txs: Transaction[], subId: string): Transaction[] {
  return txs.filter((t) => t.subscriptionId !== subId || statusOf(t) === "recorded");
}
