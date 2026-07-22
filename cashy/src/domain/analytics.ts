import type { Category, Transaction, TxType } from "@/domain/types";
import type { Range } from "@/domain/period";
import { addMonthKey, mondayOf, monthKey, monthLabelShort, parseYMD, ymd } from "@/domain/date";
import { rootOf } from "@/domain/category";
import { totals } from "@/domain/transaction";
import { isCounted } from "@/domain/txStatus";

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
