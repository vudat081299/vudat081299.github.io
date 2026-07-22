import type { Subscription, Transaction } from "@/domain/types";
import {
  addMonthKey,
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
  const start = startCycle(sub);
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
 * Should this subscription be asking for money NOW? True when it is active, its
 * billing day has arrived, and the cycle it opened is still unpaid. This single
 * predicate is what decides whether the "cần trả" reminder shows.
 */
export function needsPaymentNow(sub: Subscription, now: Date = new Date()): boolean {
  if (!sub.active) return false;
  const cur = currentCycle(sub, now);
  if (cycleDate(sub, cur) > ymd(now)) return false; // not due yet
  return firstUnpaidCycle(sub) <= cur;
}

/**
 * A service the provider would have cut off: still switched on, but a WHOLE
 * billing cycle has gone by unpaid (an earlier cycle is still owed). That is a
 * different thing from "due now", which is merely a bill on the doormat.
 */
export function isLapsed(sub: Subscription, now: Date = new Date()): boolean {
  if (!sub.active) return false;
  return firstUnpaidCycle(sub) < currentCycle(sub, now);
}

/** How many whole cycles this subscription currently owes. */
export function cyclesOwed(sub: Subscription, now: Date = new Date()): number {
  if (!sub.active) return 0;
  const cur = currentCycle(sub, now);
  if (cycleDate(sub, cur) > ymd(now)) return 0;
  let k = firstUnpaidCycle(sub);
  let n = 0;
  for (let guard = 0; k <= cur && guard < 4000; guard++, k = addCycle(sub, k, 1)) n++;
  return n;
}

/**
 * The date money is next wanted. For a service that is up to date that is the
 * next billing day; for one that already owes a month it is the day that month
 * fell due — a date in the PAST, which is the whole point: "next payment: in
 * three weeks" would be a lie while a bill is sitting there unpaid.
 */
export function nextPaymentDate(sub: Subscription): string {
  // The first unpaid cycle's billing date IS the answer in every case: already
  // past when a bill is outstanding, the end of the running cycle when it is
  // settled, and the very first billing date for a plan that hasn't begun.
  // (Deriving it from `subCycle().end` instead got the last case a year wrong —
  // that cycle's END is one full period after a start that hasn't happened.)
  return cycleDate(sub, firstUnpaidCycle(sub));
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
    let m = firstUnpaidCycle(sub);
    for (let guard = 0; m <= cur && guard < 600; guard++, m = addCycle(sub, m, 1)) {
      if (cycleDate(sub, m) > today) continue; // not due yet
      if (have.has(`${sub.id}|${m}`)) continue; // already charged
      out.push({
        amount: sub.amount,
        type: "expense",
        categoryId: sub.categoryId,
        tagIds: sub.tagIds,
        note: sub.name,
        payee: `Đăng ký · ${monthLabelShort(m)}`,
        status: "pending",
        occurredAt: cycleDate(sub, m),
        subscriptionId: sub.id,
        subMonth: m,
      });
    }
  }
  return out;
}

/**
 * Removing a subscription from the ledger. Recorded charges are real spending
 * and stay behind; the unconfirmed ones (pending / skipped) go with it.
 */
export function chargesSurvivingDeletion(txs: Transaction[], subId: string): Transaction[] {
  return txs.filter((t) => t.subscriptionId !== subId || statusOf(t) === "recorded");
}
