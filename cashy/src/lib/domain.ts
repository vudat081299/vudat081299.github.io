import type { Category, Transaction, TxType } from "@/types";
import type { Range } from "@/lib/period";
import { parseYMD, ymd } from "@/lib/date";

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
    if (t.type !== type) continue;
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

export interface SeriesPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}
/** Income vs expense over time; auto day/month granularity. Empty buckets kept. */
export function timeSeries(txs: Transaction[], range: Range): SeriesPoint[] {
  let start = range.start;
  let end = range.end;
  if (start === "0000-01-01" || end === "9999-12-31") {
    const dates = txs.map((t) => t.occurredAt).sort();
    start = dates[0] ?? ymd(new Date());
    end = dates[dates.length - 1] ?? ymd(new Date());
  }
  const startD = parseYMD(start);
  const endD = parseYMD(end);
  const spanDays = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;
  const monthly = spanDays > 62;
  const buckets = new Map<string, SeriesPoint>();

  if (monthly) {
    const c = new Date(startD.getFullYear(), startD.getMonth(), 1);
    while (c <= endD) {
      const k = ymd(c).slice(0, 7);
      buckets.set(k, {
        key: k,
        label: `${c.getMonth() + 1}/${String(c.getFullYear()).slice(2)}`,
        income: 0,
        expense: 0,
      });
      c.setMonth(c.getMonth() + 1);
    }
  } else {
    const c = new Date(startD);
    while (c <= endD) {
      const k = ymd(c);
      buckets.set(k, { key: k, label: String(c.getDate()), income: 0, expense: 0 });
      c.setDate(c.getDate() + 1);
    }
  }

  for (const t of txs) {
    if (t.occurredAt < start || t.occurredAt > end) continue;
    const k = monthly ? t.occurredAt.slice(0, 7) : t.occurredAt;
    const b = buckets.get(k);
    if (!b) continue;
    if (t.type === "income") b.income += t.amount;
    else b.expense += t.amount;
  }
  return Array.from(buckets.values());
}

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return (cur - prev) / Math.abs(prev);
}
