import type { Category, TxType } from "@/domain/types";
import { descendantIds, nextOrder, reorderCategories } from "@/domain/category";
import { orphanCategory } from "@/domain/transaction";
import { commit, getState } from "@/data/store";
import { uid } from "@/lib/id";

export function addCategory(input: {
  name: string;
  type: TxType;
  colorHex: string;
  icon: string;
  parentId?: string | null;
}): string {
  const state = getState();
  const parentId = input.parentId ?? null;
  const cat: Category = {
    id: uid(),
    parentId,
    order: nextOrder(state.categories, parentId),
    name: input.name.trim(),
    colorHex: input.colorHex,
    icon: input.icon,
    type: input.type,
    isSystem: false,
  };
  commit({ ...state, categories: [...state.categories, cat] });
  return cat.id;
}

export function updateCategory(id: string, patch: Partial<Category>): void {
  const state = getState();
  commit({
    ...state,
    categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}

/**
 * Delete a category and everything under it. The transactions filed there are
 * NOT deleted — money that was spent was still spent; they simply lose their
 * category (see `orphanCategory`).
 */
export function deleteCategory(id: string): void {
  const state = getState();
  const ids = descendantIds(state.categories, id);
  commit({
    ...state,
    categories: state.categories.filter((c) => !ids.has(c.id)),
    transactions: orphanCategory(state.transactions, ids),
  });
}

export function reorderCategory(
  dragId: string,
  newParentId: string | null,
  refId: string | null,
  after: boolean,
): void {
  const state = getState();
  const categories = reorderCategories(state.categories, dragId, newParentId, refId, after);
  if (!categories) return; // illegal move (e.g. dropping a parent into its own child)
  commit({ ...state, categories });
}
