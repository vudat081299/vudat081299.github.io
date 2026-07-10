import { useSyncExternalStore } from "react";
import type {
  CashyState,
  Category,
  Tag,
  ThemeMode,
  Transaction,
  TxType,
  Workspace,
} from "@/types";
import { uid } from "@/lib/id";
import { descendantIds } from "@/lib/domain";

const KEY = "cashy_state_v1";

function emptyState(): CashyState {
  return {
    version: 1,
    theme: "system",
    workspace: null,
    categories: [],
    tags: [],
    transactions: [],
  };
}

function load(): CashyState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const p = JSON.parse(raw) as Partial<CashyState>;
    return {
      ...emptyState(),
      ...p,
      categories: p.categories ?? [],
      tags: p.tags ?? [],
      transactions: p.transactions ?? [],
    };
  } catch {
    return emptyState();
  }
}

let state: CashyState = load();
const listeners = new Set<() => void>();

function commit(next: CashyState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getState(): CashyState {
  return state;
}

/** React binding — whole state; components select what they need. */
export function useCashy(): CashyState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ---- theme -----------------------------------------------------------------
export function setTheme(theme: ThemeMode) {
  commit({ ...state, theme });
}

// ---- workspace -------------------------------------------------------------
export function createWorkspace(input: {
  displayName: string;
  avatarColor: string;
  currency?: string;
}) {
  const workspace: Workspace = {
    displayName: input.displayName.trim() || "Của tôi",
    avatarColor: input.avatarColor,
    currency: input.currency ?? "VND",
    createdAt: new Date().toISOString(),
  };
  commit({
    ...state,
    workspace,
    categories: seedCategories(),
    tags: [],
    transactions: [],
  });
}

export function updateWorkspace(patch: Partial<Workspace>) {
  if (!state.workspace) return;
  commit({ ...state, workspace: { ...state.workspace, ...patch } });
}

export function resetAll() {
  commit({ ...emptyState(), theme: state.theme });
}

// ---- categories ------------------------------------------------------------
export function addCategory(input: {
  name: string;
  type: TxType;
  colorHex: string;
  icon: string;
  parentId?: string | null;
}): string {
  const parentId = input.parentId ?? null;
  const sibs = state.categories.filter((c) => (c.parentId ?? null) === parentId);
  const order = sibs.length ? Math.max(...sibs.map((s) => s.order)) + 1 : 0;
  const cat: Category = {
    id: uid(),
    parentId,
    order,
    name: input.name.trim(),
    colorHex: input.colorHex,
    icon: input.icon,
    type: input.type,
    isSystem: false,
  };
  commit({ ...state, categories: [...state.categories, cat] });
  return cat.id;
}

export function updateCategory(id: string, patch: Partial<Category>) {
  commit({
    ...state,
    categories: state.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  });
}

export function deleteCategory(id: string) {
  const ids = descendantIds(state.categories, id);
  commit({
    ...state,
    categories: state.categories.filter((c) => !ids.has(c.id)),
    transactions: state.transactions.map((t) =>
      t.categoryId && ids.has(t.categoryId) ? { ...t, categoryId: null } : t,
    ),
  });
}

export function reorderCategory(
  dragId: string,
  newParentId: string | null,
  refId: string | null,
  after: boolean,
) {
  newParentId = newParentId ?? null;
  const drag = state.categories.find((c) => c.id === dragId);
  if (!drag) return;
  if (newParentId && descendantIds(state.categories, dragId).has(newParentId)) return;

  const sibs = state.categories
    .filter((c) => c.id !== dragId && (c.parentId ?? null) === newParentId)
    .sort((a, b) => a.order - b.order);
  const moved: Category = { ...drag, parentId: newParentId };

  let idx = !refId ? sibs.length : sibs.findIndex((c) => c.id === refId);
  if (idx < 0) idx = sibs.length;
  else if (refId && after) idx += 1;
  sibs.splice(idx, 0, moved);

  const orderMap = new Map(sibs.map((c, i) => [c.id, i] as const));
  const categories = state.categories.map((c) => {
    if (c.id === dragId) return { ...moved, order: orderMap.get(dragId) ?? 0 };
    const o = orderMap.get(c.id);
    return o === undefined ? c : { ...c, order: o };
  });
  commit({ ...state, categories });
}

// ---- tags ------------------------------------------------------------------
export function addTag(input: { name: string; colorHex: string }): string {
  const tag: Tag = {
    id: uid(),
    name: input.name.trim(),
    colorHex: input.colorHex,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, tags: [...state.tags, tag] });
  return tag.id;
}

export function updateTag(id: string, patch: Partial<Tag>) {
  commit({
    ...state,
    tags: state.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  });
}

export function deleteTag(id: string) {
  commit({
    ...state,
    tags: state.tags.filter((t) => t.id !== id),
    transactions: state.transactions.map((t) =>
      t.tagIds.includes(id) ? { ...t, tagIds: t.tagIds.filter((x) => x !== id) } : t,
    ),
  });
}

// ---- transactions ----------------------------------------------------------
export function addTransaction(input: Omit<Transaction, "id" | "createdAt">): string {
  const tx: Transaction = { ...input, id: uid(), createdAt: new Date().toISOString() };
  commit({ ...state, transactions: [tx, ...state.transactions] });
  return tx.id;
}

export function updateTransaction(id: string, patch: Partial<Transaction>) {
  commit({
    ...state,
    transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  });
}

export function deleteTransaction(id: string) {
  commit({
    ...state,
    transactions: state.transactions.filter((t) => t.id !== id),
  });
}

// ---- import / export -------------------------------------------------------
export function exportData(): string {
  return JSON.stringify(
    {
      app: "cashy",
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: state.workspace,
      categories: state.categories,
      tags: state.tags,
      transactions: state.transactions,
    },
    null,
    2,
  );
}

export function importData(json: string): { ok: boolean; error?: string } {
  try {
    const p = JSON.parse(json) as Partial<CashyState>;
    if (!Array.isArray(p.categories) || !Array.isArray(p.transactions)) {
      return { ok: false, error: "File không đúng định dạng Cashy." };
    }
    commit({
      version: 1,
      theme: state.theme,
      workspace: p.workspace ?? state.workspace,
      categories: p.categories,
      tags: Array.isArray(p.tags) ? p.tags : [],
      transactions: p.transactions,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Không đọc được nội dung JSON." };
  }
}

// ---- seed ------------------------------------------------------------------
export function seedCategories(): Category[] {
  const out: Category[] = [];
  const add = (
    name: string,
    type: TxType,
    colorHex: string,
    icon: string,
    parentId: string | null = null,
  ): string => {
    const sibs = out.filter((c) => (c.parentId ?? null) === parentId);
    const cat: Category = {
      id: uid(),
      parentId,
      order: sibs.length,
      name,
      colorHex,
      icon,
      type,
      isSystem: false,
    };
    out.push(cat);
    return cat.id;
  };

  const food = add("Ăn uống", "expense", "#e0483d", "utensils");
  add("Đi chợ", "expense", "#e0483d", "shopping-cart", food);
  add("Nhà hàng", "expense", "#e0483d", "utensils-crossed", food);
  add("Cà phê", "expense", "#e0483d", "coffee", food);
  add("Di chuyển", "expense", "#d9730d", "car");
  const bills = add("Hóa đơn", "expense", "#0b6e99", "receipt");
  add("Điện", "expense", "#0b6e99", "zap", bills);
  add("Nước", "expense", "#0b6e99", "droplet", bills);
  add("Internet", "expense", "#0b6e99", "wifi", bills);
  add("Mua sắm", "expense", "#6940a5", "shopping-bag");
  add("Sức khỏe", "expense", "#1a8f6b", "heart-pulse");
  add("Giải trí", "expense", "#ad1a72", "gamepad-2");
  add("Nhà ở", "expense", "#64473a", "house");
  add("Lương", "income", "#1a8f6b", "wallet");
  add("Thưởng", "income", "#cb8a14", "gift");
  add("Đầu tư", "income", "#2383e2", "trending-up");
  add("Khác", "income", "#787774", "circle-dollar-sign");
  return out;
}
