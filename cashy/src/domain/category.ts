import type { Category, TxType } from "@/domain/types";
import { byOrder } from "@/domain/sort";

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

/**
 * Where a category may be dropped when the user drags it. A category can never
 * become its own descendant, and moving it under a new parent must not orphan
 * the subtree it carries with it.
 */
export function canReparent(cats: Category[], dragId: string, newParentId: string | null): boolean {
  if (!newParentId) return true;
  if (dragId === newParentId) return false;
  return !descendantIds(cats, dragId).has(newParentId);
}

/**
 * Re-slot a dragged category among its new siblings and hand back the FULL
 * category list with `order` renumbered. Pure: the caller decides whether to
 * persist it. Returns null when the move is illegal (see `canReparent`).
 */
export function reorderCategories(
  cats: Category[],
  dragId: string,
  newParentId: string | null,
  refId: string | null,
  after: boolean,
): Category[] | null {
  const parentId = newParentId ?? null;
  const drag = cats.find((c) => c.id === dragId);
  if (!drag) return null;
  if (!canReparent(cats, dragId, parentId)) return null;

  const sibs = cats
    .filter((c) => c.id !== dragId && (c.parentId ?? null) === parentId)
    .sort((a, b) => a.order - b.order);
  const moved: Category = { ...drag, parentId };

  let idx = !refId ? sibs.length : sibs.findIndex((c) => c.id === refId);
  if (idx < 0) idx = sibs.length;
  else if (refId && after) idx += 1;
  sibs.splice(idx, 0, moved);

  const orderMap = new Map(sibs.map((c, i) => [c.id, i] as const));
  return cats.map((c) => {
    if (c.id === dragId) return { ...moved, order: orderMap.get(dragId) ?? 0 };
    const o = orderMap.get(c.id);
    return o === undefined ? c : { ...c, order: o };
  });
}

/** The `order` a new child of `parentId` should take: last among its siblings. */
export function nextOrder(cats: Category[], parentId: string | null): number {
  const sibs = cats.filter((c) => (c.parentId ?? null) === (parentId ?? null));
  return sibs.length ? Math.max(...sibs.map((s) => s.order)) + 1 : 0;
}
