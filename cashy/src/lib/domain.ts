import type { Category, Subscription, Transaction, TxType } from "@/types";
import type { Range } from "@/lib/period";
import { addMonthKey, billingDate, monthKey, parseYMD, ymd } from "@/lib/date";
import { isCounted } from "@/lib/txStatus";

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
  tagIds?: string[];
  search?: string;
  cats?: Category[];
}
export function filterTx(txs: Transaction[], f: TxFilter): Transaction[] {
  const catSet =
    f.categoryId && f.cats ? descendantIds(f.cats, f.categoryId) : null;
  const q = f.search?.trim().toLowerCase();
  return txs.filter((t) => {
    if (f.range && !inRange(t.occurredAt, f.range)) return false;
    if (f.type && f.type !== "all" && t.type !== f.type) return false;
    if (catSet && (!t.categoryId || !catSet.has(t.categoryId))) return false;
    if (f.tagIds && f.tagIds.length && !f.tagIds.some((id) => t.tagIds.includes(id)))
      return false;
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
      name: cat ? cat.name : "Chưa phân loại",
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
  /** total spending in this bucket (within the visible range) */
  expense: number;
  /** running wallet balance = cumulative net of ALL tx up to this bucket's end */
  balance: number;
}
/**
 * The dashboard cash-flow combo for a *personal* budget: bars show spending per
 * bucket, the line shows the running money-in-wallet balance (income lands once,
 * the wallet then draws down as you spend). Expense is scoped to the range; the
 * balance is cumulative across ALL transactions so the line reads as a real
 * account balance, not just the in-period delta. Day/month granularity auto.
 */
export function walletSeries(all: Transaction[], range: Range): WalletPoint[] {
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
  const monthly = spanDays > 62;

  interface B extends WalletPoint {
    endYMD: string;
  }
  const buckets: B[] = [];
  if (monthly) {
    const c = new Date(startD.getFullYear(), startD.getMonth(), 1);
    while (c <= endD) {
      const last = new Date(c.getFullYear(), c.getMonth() + 1, 0);
      buckets.push({
        key: ymd(c).slice(0, 7),
        label: `${c.getMonth() + 1}/${String(c.getFullYear()).slice(2)}`,
        endYMD: ymd(last),
        expense: 0,
        balance: 0,
      });
      c.setMonth(c.getMonth() + 1);
    }
  } else {
    const c = new Date(startD);
    while (c <= endD) {
      const k = ymd(c);
      buckets.push({ key: k, label: String(c.getDate()), endYMD: k, expense: 0, balance: 0 });
      c.setDate(c.getDate() + 1);
    }
  }

  // spending per bucket — only transactions inside the visible range
  const byKey = new Map(buckets.map((b) => [b.key, b] as const));
  for (const t of all) {
    if (t.type !== "expense" || !isCounted(t)) continue;
    if (t.occurredAt < start || t.occurredAt > end) continue;
    const b = byKey.get(monthly ? t.occurredAt.slice(0, 7) : t.occurredAt);
    if (b) b.expense += t.amount;
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
  return buckets.map(({ key, label, expense, balance }) => ({ key, label, expense, balance }));
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

/** Derive a subscription's state from its linked transactions. */
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

  // Next reminder = earliest FUTURE month (billing not yet reached) with no charge.
  let nextMonth: string | null = null;
  if (sub.active) {
    const cur = monthKey(now);
    const today = ymd(now);
    let mm = sub.startMonth < cur ? cur : sub.startMonth;
    for (let guard = 0; guard < 36; guard++) {
      if (!haveMonth.has(mm) && billingDate(mm, sub.dayOfMonth) > today) {
        nextMonth = mm;
        break;
      }
      mm = addMonthKey(mm, 1);
    }
  }

  return {
    pending,
    nextMonth,
    nextDate: nextMonth ? billingDate(nextMonth, sub.dayOfMonth) : null,
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

/** Total committed monthly spend across the still-active subscriptions. */
export function monthlyCommitment(subs: Subscription[]): number {
  return subs.filter((s) => s.active).reduce((sum, s) => sum + s.amount, 0);
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
        categoryName: cat?.name ?? "Chưa phân loại",
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
