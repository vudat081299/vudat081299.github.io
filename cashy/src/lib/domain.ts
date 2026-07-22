import type { Category, Subscription, Tag, Transaction, TxStatus, TxType } from "@/types";
import type { Range } from "@/lib/period";
import {
  addMonthKey,
  billingDate,
  daysBetween,
  mondayOf,
  monthKey,
  monthLabelShort,
  monthNameShort,
  parseYMD,
  ymd,
} from "@/lib/date";
import { isCounted, statusOf } from "@/lib/txStatus";

// ---- sorting ---------------------------------------------------------------
export function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "vi");
}
export function byOrder(a: Category, b: Category): number {
  return a.order - b.order || byName(a, b);
}

// ---- category tree ---------------------------------------------------------
export function childrenOf(cats: Category[], parentId: string | null): Category[] {
  return cats
    .filter((c) => (c.parentId ?? null) === (parentId ?? null))
    .sort(byOrder);
}

export function descendantIds(cats: Category[], id: string): Set<string> {
  const ids = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of cats) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function rootOf(cats: Category[], id: string | null): Category | null {
  if (!id) return null;
  const map = new Map(cats.map((c) => [c.id, c] as const));
  let cur = map.get(id) ?? null;
  while (cur && cur.parentId) {
    const parent = map.get(cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

export interface FlatNode {
  cat: Category;
  depth: number;
  hasChildren: boolean;
}
export function flattenTree(cats: Category[], type?: TxType): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of childrenOf(cats, parentId)) {
      if (type && c.type !== type) continue;
      const kids = childrenOf(cats, c.id).filter((k) => !type || k.type === type);
      out.push({ cat: c, depth, hasChildren: kids.length > 0 });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

// ---- tag usage -------------------------------------------------------------
export interface TagRank {
  tag: Tag;
  /** how many transactions carry this tag */
  count: number;
  /** 100..900 — the gray-token step this tag's rank inks to (900 = most-used). */
  shade: number;
}
/**
 * Rank the tags by how much the ledger actually uses them. The result drives
 * BOTH the order tags are listed in and how strongly each one is inked (§1:
 * emphasis = contrast, not hue).
 *
 * Ink is a step on the gray scale, chosen by RANK, not raw count: the most-used
 * tag is w900, and the ramp steps evenly down to w100. With `m` used tags the
 * step is (900-100)/(m-1), but `m` is capped at 9 — so the 9th-most-used tag
 * already lands on w100 and everything past it (and every unused tag) stays
 * w100. Positional stepping keeps a busy ledger a clean dark→light gradient
 * instead of bunching every middling tag into one muddy grey.
 */
export function rankTags(tags: Tag[], txs: Transaction[]): TagRank[] {
  const count = new Map<string, number>();
  for (const t of txs) for (const id of t.tagIds) count.set(id, (count.get(id) ?? 0) + 1);
  const ranked = tags
    .map((tag) => ({ tag, count: count.get(tag.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || byName(a.tag, b.tag));
  const used = ranked.filter((r) => r.count > 0).length;
  const m = Math.min(used, 9);
  const step = m > 1 ? 800 / (m - 1) : 0;
  return ranked.map((r, i) => ({
    ...r,
    shade: r.count > 0 && i < 9 ? Math.round(900 - i * step) : 100,
  }));
}

/** The ranks by tag id, for the tables that render one transaction's tags. */
export function tagRankMap(tags: Tag[], txs: Transaction[]): Map<string, TagRank> {
  return new Map(rankTags(tags, txs).map((r) => [r.tag.id, r] as const));
}

// ---- aggregates ------------------------------------------------------------
export interface Totals {
  income: number;
  expense: number;
  net: number;
}
export function totals(txs: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (!isCounted(t)) continue; // pending / skipped / failed don't move money
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export function inRange(dateYMD: string, range: Range): boolean {
  return dateYMD >= range.start && dateYMD <= range.end;
}

export interface TxFilter {
  range?: Range;
  type?: TxType | "all";
  categoryId?: string | null;
  /** multi-select categories (each expanded to its descendants) — OR'd together */
  categoryIds?: string[];
  tagIds?: string[];
  /** multi-select statuses — a row matches if its status is any of these */
  statuses?: TxStatus[];
  /** inclusive amount bounds in đồng (either side optional) */
  amountMin?: number | null;
  amountMax?: number | null;
  search?: string;
  cats?: Category[];
}
export function filterTx(txs: Transaction[], f: TxFilter): Transaction[] {
  // Single-category (`categoryId`) and multi-category (`categoryIds`) both expand
  // to descendants; a row passes if it sits under ANY selected category.
  let catSet: Set<string> | null = null;
  if (f.cats) {
    const ids = [
      ...(f.categoryId ? [f.categoryId] : []),
      ...(f.categoryIds ?? []),
    ];
    if (ids.length) {
      catSet = new Set<string>();
      for (const id of ids) for (const d of descendantIds(f.cats, id)) catSet.add(d);
    }
  }
  const q = f.search?.trim().toLowerCase();
  const min = f.amountMin ?? null;
  const max = f.amountMax ?? null;
  return txs.filter((t) => {
    if (f.range && !inRange(t.occurredAt, f.range)) return false;
    if (f.type && f.type !== "all" && t.type !== f.type) return false;
    if (catSet && (!t.categoryId || !catSet.has(t.categoryId))) return false;
    if (f.tagIds && f.tagIds.length && !f.tagIds.some((id) => t.tagIds.includes(id)))
      return false;
    if (f.statuses && f.statuses.length && !f.statuses.includes(statusOf(t))) return false;
    if (min != null && t.amount < min) return false;
    if (max != null && t.amount > max) return false;
    if (q && !t.note.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---- charts ----------------------------------------------------------------
export interface BreakdownSlice {
  id: string;
  name: string;
  colorHex: string;
  total: number;
  pct: number;
}
/** Spend/earn grouped by ROOT category, for the donut. */
export function breakdown(
  txs: Transaction[],
  type: TxType,
  cats: Category[],
): BreakdownSlice[] {
  const byRoot = new Map<string, number>();
  let grand = 0;
  for (const t of txs) {
    if (t.type !== type || !isCounted(t)) continue;
    const root = rootOf(cats, t.categoryId);
    const key = root ? root.id : "__none__";
    byRoot.set(key, (byRoot.get(key) ?? 0) + t.amount);
    grand += t.amount;
  }
  const slices: BreakdownSlice[] = [];
  for (const [key, total] of byRoot) {
    const cat = cats.find((c) => c.id === key);
    slices.push({
      id: key,
      name: cat ? cat.name : "Uncategorised",
      colorHex: cat ? cat.colorHex : "#9b9a97",
      total,
      pct: grand ? total / grand : 0,
    });
  }
  return slices.sort((a, b) => b.total - a.total);
}

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return (cur - prev) / Math.abs(prev);
}

export interface WalletPoint {
  key: string;
  label: string;
  /** total income booked in this bucket (within the visible range) */
  income: number;
  /** total spending in this bucket (within the visible range) */
  expense: number;
  /** running wallet balance = cumulative net of ALL tx up to this bucket's end.
   *  The bucket's OPENING balance is `balance - income + expense`. */
  balance: number;
}
/**
 * The dashboard cash-flow combo for a *personal* budget: bars show spending per
 * bucket, the line shows the running money-in-wallet balance (income lands once,
 * the wallet then draws down as you spend). Expense is scoped to the range; the
 * balance is cumulative across ALL transactions so the line reads as a real
 * account balance, not just the in-period delta. Day/month granularity auto.
 *
 * Empty buckets at BOTH ENDS are trimmed away: a 30-day window over a ledger
 * that only starts 10 days ago should draw 10 days, not 20 days of flat nothing
 * followed by the actual data. Gaps in the MIDDLE stay — a quiet week is a fact
 * about the data, whereas dead margins are just an artefact of the window.
 */
export function walletSeries(all: Transaction[], range: Range, weekly = false): WalletPoint[] {
  let start = range.start;
  let end = range.end;
  if (start === "0000-01-01" || end === "9999-12-31") {
    const dates = all.map((t) => t.occurredAt).sort();
    start = dates[0] ?? ymd(new Date());
    end = dates[dates.length - 1] ?? ymd(new Date());
  }
  const startD = parseYMD(start);
  const endD = parseYMD(end);
  const spanDays = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;
  // Three granularities so the columns never get too dense: days for a short
  // window, months for up to a couple of years, whole years beyond that.
  const yearly = spanDays > 800;
  const monthly = !yearly && spanDays > 62;
  // Weekly is an opt-in the caller sets for a day-range window (30–62d) where a
  // daily bar per day gets busy; it never overrides the month/year auto-tiers.
  const weeklyMode = weekly && !yearly && !monthly;

  interface B extends WalletPoint {
    endYMD: string;
    /** any transaction at all landed here — what the end-trim reads */
    hasTx: boolean;
  }
  const buckets: B[] = [];
  if (weeklyMode) {
    const c = mondayOf(startD);
    while (c <= endD) {
      const wEnd = new Date(c);
      wEnd.setDate(wEnd.getDate() + 6);
      buckets.push({
        key: `W:${ymd(c)}`,
        label: `${c.getDate()}/${c.getMonth() + 1}`,
        endYMD: ymd(wEnd),
        income: 0,
        expense: 0,
        balance: 0,
        hasTx: false,
      });
      c.setDate(c.getDate() + 7);
    }
  } else if (yearly) {
    const c = new Date(startD.getFullYear(), 0, 1);
    while (c <= endD) {
      buckets.push({
        key: String(c.getFullYear()),
        label: String(c.getFullYear()),
        endYMD: ymd(new Date(c.getFullYear(), 11, 31)),
        income: 0,
        expense: 0,
        balance: 0,
        hasTx: false,
      });
      c.setFullYear(c.getFullYear() + 1);
    }
  } else if (monthly) {
    const c = new Date(startD.getFullYear(), startD.getMonth(), 1);
    while (c <= endD) {
      const last = new Date(c.getFullYear(), c.getMonth() + 1, 0);
      buckets.push({
        key: ymd(c).slice(0, 7),
        label: `${c.getMonth() + 1}/${String(c.getFullYear()).slice(2)}`,
        endYMD: ymd(last),
        income: 0,
        expense: 0,
        balance: 0,
        hasTx: false,
      });
      c.setMonth(c.getMonth() + 1);
    }
  } else {
    const c = new Date(startD);
    while (c <= endD) {
      const k = ymd(c);
      buckets.push({
        key: k,
        label: String(c.getDate()),
        endYMD: k,
        income: 0,
        expense: 0,
        balance: 0,
        hasTx: false,
      });
      c.setDate(c.getDate() + 1);
    }
  }

  // income + spending per bucket — only transactions inside the visible range
  const groupKey = (occ: string) =>
    yearly
      ? occ.slice(0, 4)
      : monthly
        ? occ.slice(0, 7)
        : weeklyMode
          ? `W:${ymd(mondayOf(parseYMD(occ)))}`
          : occ;
  const byKey = new Map(buckets.map((b) => [b.key, b] as const));
  for (const t of all) {
    if (t.occurredAt < start || t.occurredAt > end) continue;
    const b = byKey.get(groupKey(t.occurredAt));
    if (!b) continue;
    b.hasTx = true;
    if (!isCounted(t)) continue;
    if (t.type === "expense") b.expense += t.amount;
    else b.income += t.amount;
  }

  // running wallet balance — cumulative net of the COUNTED tx up to each bucket's end
  const sorted = [...all].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  let i = 0;
  let running = 0;
  for (const b of buckets) {
    while (i < sorted.length && sorted[i].occurredAt <= b.endYMD) {
      const s = sorted[i];
      if (isCounted(s)) running += s.type === "income" ? s.amount : -s.amount;
      i++;
    }
    b.balance = running;
  }

  // Drop the dead margins. Balance was computed on the FULL span first, so the
  // first surviving bucket still opens on the correct running balance.
  let lo = 0;
  let hi = buckets.length - 1;
  while (lo < hi && !buckets[lo].hasTx) lo++;
  while (hi > lo && !buckets[hi].hasTx) hi--;

  return buckets
    .slice(lo, hi + 1)
    .map(({ key, label, income, expense, balance }) => ({ key, label, income, expense, balance }));
}

// ---- subscriptions ---------------------------------------------------------
// A subscription's per-month state IS a transaction (subscriptionId + subMonth):
//   status "pending" = awaiting confirm · "recorded" = paid · "skipped" = skipped.
// `store.syncSubscriptions()` materialises a pending charge for each due month.
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

/** The first cycle still owed: the cycle after the last payment, or the starting
 *  cycle if it has never been paid. Charges are never raised before this, which
 *  is what stops an old subscription backfilling years of dues. */
export function firstUnpaidCycle(sub: Subscription): string {
  const start = startCycle(sub);
  if (!sub.lastPaidAt) return start;
  const after = addCycle(sub, sub.lastPaidAt.slice(0, 7), 1);
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

// ---- dashboard insights ----------------------------------------------------
export interface Insight {
  icon: string; // material symbols glyph
  label: string;
  value: string;
  hint?: string;
}
/**
 * A few derived, plain-language facts about the current period — the kind of
 * "so what" a KPI grid alone doesn't say (savings rate, daily burn, a run-rate
 * projection, the single biggest hit). Pure read model; the screen formats.
 */
export interface InsightData {
  savingsRate: number | null; // net / income, null if no income
  avgPerDay: number; // expense / elapsed days in range
  projected: number | null; // run-rate expense for the whole month (this-month only)
  topExpense: { note: string; amount: number; categoryName: string } | null;
  daysElapsed: number;
  daysInPeriod: number;
}
export function periodInsights(
  txs: Transaction[],
  range: Range,
  cats: Category[],
  now: Date = new Date(),
): InsightData {
  const t = totals(txs);
  // Elapsed days: from range.start to min(today, range.end), inclusive.
  const startD = parseYMD(range.start === "0000-01-01" ? ymd(now) : range.start);
  const endBound = range.end === "9999-12-31" ? ymd(now) : range.end;
  const capEnd = endBound < ymd(now) ? endBound : ymd(now);
  const endD = parseYMD(capEnd);
  const daysElapsed = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1);
  const fullEnd = parseYMD(range.end === "9999-12-31" ? ymd(now) : range.end);
  const daysInPeriod = Math.max(
    daysElapsed,
    Math.round((fullEnd.getTime() - startD.getTime()) / 86400000) + 1,
  );

  const avgPerDay = t.expense / daysElapsed;
  const isThisMonth = range.start.slice(0, 7) === monthKey(now) && range.end !== "9999-12-31";
  const projected = isThisMonth && daysElapsed < daysInPeriod ? Math.round(avgPerDay * daysInPeriod) : null;

  let top: InsightData["topExpense"] = null;
  for (const tx of txs) {
    if (tx.type !== "expense" || !isCounted(tx)) continue;
    if (!top || tx.amount > top.amount) {
      const cat = tx.categoryId ? cats.find((c) => c.id === tx.categoryId) : null;
      top = {
        note: tx.note || cat?.name || "Giao dịch",
        amount: tx.amount,
        categoryName: cat?.name ?? "Uncategorised",
      };
    }
  }

  return {
    savingsRate: t.income > 0 ? t.net / t.income : null,
    avgPerDay,
    projected,
    topExpense: top,
    daysElapsed,
    daysInPeriod,
  };
}

// ---- balance forecast ------------------------------------------------------
const DAYS_PER_MONTH = 365.25 / 12; // 30.4375 — real average, not a flat 30

/** Turn a period's net into a per-month figure, so a slope computed over "last
 *  3 months" or "last 30 days" both mean the same thing: money gained (or lost)
 *  in an average month. `spanDays` is the length of the window the net came from. */
export function monthlyNetRate(net: number, spanDays: number): number {
  const months = spanDays / DAYS_PER_MONTH;
  return months > 0 ? net / months : 0;
}

export interface ForecastPoint {
  /** "YYYY-MM" — feeds chartBucketTitle for the tooltip */
  key: string;
  /** compact axis label, e.g. "T8/2026" */
  label: string;
  /** months ahead of now; 0 is the current month (today's balance) */
  offset: number;
  /** projected wallet balance at the end of this month */
  balance: number;
}

/**
 * A straight-line balance projection: start from today's balance and add the
 * monthly net once per future month. It is called a "forecast", but it is really
 * just arithmetic — balance(k) = current + monthlyNet · k — not a trend model, so
 * it moves by whole months and never pretends to a day-level precision it lacks.
 * Point 0 is now (the current balance); points 1…months carry the projection.
 */
export function forecastSeries(
  currentBalance: number,
  monthlyNet: number,
  months: number,
  now: Date = new Date(),
): ForecastPoint[] {
  const startKey = monthKey(now);
  const out: ForecastPoint[] = [];
  for (let i = 0; i <= months; i++) {
    const key = addMonthKey(startKey, i);
    out.push({
      key,
      label: monthLabelShort(key),
      offset: i,
      balance: Math.round(currentBalance + monthlyNet * i),
    });
  }
  return out;
}
