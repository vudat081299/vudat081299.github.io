import type { Category, Transaction, TxStatus, TxType } from "@/domain/types";
import type { Range } from "@/domain/period";
import { descendantIds } from "@/domain/category";
import { isCounted, statusOf } from "@/domain/txStatus";
import { isTransfer } from "@/domain/wallet";

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
    if (isTransfer(t)) continue; // a transfer moves between wallets — neither in nor out
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
  /** the wallet the row moved through (its source, for a transfer) */
  walletId?: string | null;
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
    if (f.walletId != null && t.walletId !== f.walletId && t.toWalletId !== f.walletId)
      return false;
    if (f.tagIds && f.tagIds.length && !f.tagIds.some((id) => t.tagIds.includes(id)))
      return false;
    if (f.statuses && f.statuses.length && !f.statuses.includes(statusOf(t))) return false;
    if (min != null && t.amount < min) return false;
    if (max != null && t.amount > max) return false;
    if (q && !t.note.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Newest first, ties broken by when the row was entered. */
export function byRecency(a: Transaction, b: Transaction): number {
  return b.occurredAt.localeCompare(a.occurredAt) || b.createdAt.localeCompare(a.createdAt);
}

/**
 * Detaching a deleted category from the ledger: every transaction filed under it
 * (or any of its descendants) loses its category rather than being deleted —
 * money that was spent was still spent.
 */
export function orphanCategory(txs: Transaction[], removedIds: Set<string>): Transaction[] {
  return txs.map((t) =>
    t.categoryId && removedIds.has(t.categoryId) ? { ...t, categoryId: null } : t,
  );
}

/** Drop a tag from every transaction that carries it. */
export function detachTag(txs: Transaction[], tagId: string): Transaction[] {
  return txs.map((t) =>
    t.tagIds.includes(tagId) ? { ...t, tagIds: t.tagIds.filter((x) => x !== tagId) } : t,
  );
}
