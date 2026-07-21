import { useSyncExternalStore } from "react";
import type {
  CashyState,
  Category,
  Subscription,
  Tag,
  ThemeMode,
  Transaction,
  TxType,
  Workspace,
} from "@/types";
import { uid } from "@/lib/id";
import { descendantIds, rootOf } from "@/lib/domain";
import { addMonthKey, billingDate, monthKey, monthLabelShort, ymd } from "@/lib/date";
import { statusOf } from "@/lib/txStatus";
import { SWATCHES } from "@/lib/palette";
import { buildSampleData } from "@/lib/sample";

const KEY = "cashy_state_v1";
// v2 re-colours legacy data onto the bright web-builder chart palette.
const CURRENT_VERSION = 2;

function emptyState(): CashyState {
  return {
    version: CURRENT_VERSION,
    theme: "system",
    workspace: null,
    categories: [],
    tags: [],
    transactions: [],
    subscriptions: [],
  };
}

/**
 * v1 → v2: repaint every category & tag onto the bright chart palette (each
 * ROOT category gets a distinct hue, children inherit it; tags cycle the
 * swatches). Legacy workspaces were seeded with muted earth tones that read
 * "murky" in the donut — this discards that old colour thinking wholesale, as
 * the user asked, without touching any other data.
 */
function recolor(cats: Category[], tags: Tag[]): { categories: Category[]; tags: Tag[] } {
  const roots = cats.filter((c) => !c.parentId).sort((a, b) => a.order - b.order);
  const hueByRoot = new Map<string, string>();
  roots.forEach((r, i) => hueByRoot.set(r.id, SWATCHES[i % SWATCHES.length]));
  const categories = cats.map((c) => {
    const root = rootOf(cats, c.id);
    const hex = root ? hueByRoot.get(root.id) : undefined;
    return hex ? { ...c, colorHex: hex } : c;
  });
  const recoloredTags = tags.map((t, i) => ({ ...t, colorHex: SWATCHES[i % SWATCHES.length] }));
  return { categories, tags: recoloredTags };
}

function load(): CashyState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const p = JSON.parse(raw) as Partial<CashyState>;
    let next: CashyState = {
      ...emptyState(),
      ...p,
      version: CURRENT_VERSION,
      categories: p.categories ?? [],
      tags: p.tags ?? [],
      transactions: p.transactions ?? [],
      subscriptions: p.subscriptions ?? [],
    };
    if ((p.version ?? 1) < 2) {
      const { categories, tags } = recolor(next.categories, next.tags);
      next = { ...next, categories, tags };
    }
    // A workspace must never open on an empty ledger: any account that got this
    // far with no transactions is re-seeded with the 200-row demo dataset. Only
    // an EMPTY ledger is filled, so nothing a user actually entered is touched.
    if (next.workspace && next.transactions.length === 0) {
      const categories = next.categories.length ? next.categories : seedCategories();
      const { tags, transactions } = buildSampleData(categories);
      next = { ...next, categories, tags, transactions };
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
    return next;
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
/**
 * Create a workspace. It is ALWAYS seeded with the 200-transaction demo dataset
 * — every account, from every entry point, opens on a populated ledger.
 */
export function createWorkspace(input: { displayName: string; currency?: string }) {
  const workspace: Workspace = {
    displayName: input.displayName.trim() || "Của tôi",
    currency: input.currency ?? "VND",
    createdAt: new Date().toISOString(),
  };
  const categories = seedCategories();
  const { tags, transactions } = buildSampleData(categories);
  commit({ ...state, workspace, categories, tags, transactions, subscriptions: [] });
}

/** Replace categories/tags/transactions with a fresh demo dataset (200 txns). */
export function loadSampleData() {
  const categories = seedCategories();
  const { tags, transactions } = buildSampleData(categories);
  const workspace: Workspace = state.workspace ?? {
    displayName: "Của tôi",
    currency: "VND",
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, workspace, categories, tags, transactions });
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

// ---- subscriptions ---------------------------------------------------------
export function addSubscription(input: {
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId: string | null;
  tagIds: string[];
  colorHex: string;
  icon: string;
  note?: string;
  startMonth?: string;
}): string {
  const sub: Subscription = {
    id: uid(),
    name: input.name.trim(),
    amount: input.amount,
    dayOfMonth: input.dayOfMonth,
    categoryId: input.categoryId,
    tagIds: input.tagIds,
    colorHex: input.colorHex,
    icon: input.icon,
    note: input.note?.trim() ?? "",
    active: true,
    startMonth: input.startMonth ?? monthKey(),
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, subscriptions: [...state.subscriptions, sub] });
  syncSubscriptions();
  return sub.id;
}

export function updateSubscription(id: string, patch: Partial<Subscription>) {
  commit({
    ...state,
    subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
}

export function setSubscriptionActive(id: string, active: boolean) {
  updateSubscription(id, { active });
}

/** Remove a subscription. Recorded charges are real spending and stay; the
 *  unconfirmed (pending/skipped) charges are dropped with it. */
export function deleteSubscription(id: string) {
  commit({
    ...state,
    subscriptions: state.subscriptions.filter((s) => s.id !== id),
    transactions: state.transactions.filter(
      (t) => t.subscriptionId !== id || statusOf(t) === "recorded",
    ),
  });
}

/**
 * Materialise a `pending` expense for every due month of each active
 * subscription that doesn't have a charge yet. Idempotent — safe to call on
 * every app mount; only creates a row when a new month has come due.
 */
export function syncSubscriptions() {
  const now = new Date();
  const cur = monthKey(now);
  const today = ymd(now);
  const have = new Set(
    state.transactions.filter((t) => t.subscriptionId).map((t) => `${t.subscriptionId}|${t.subMonth}`),
  );
  const fresh: Transaction[] = [];
  for (const sub of state.subscriptions) {
    if (!sub.active) continue;
    let m = sub.startMonth;
    for (let guard = 0; m <= cur && guard < 600; guard++, m = addMonthKey(m, 1)) {
      if (billingDate(m, sub.dayOfMonth) > today) continue; // not due yet
      if (have.has(`${sub.id}|${m}`)) continue; // already charged
      fresh.push({
        id: uid(),
        amount: sub.amount,
        type: "expense",
        categoryId: sub.categoryId,
        tagIds: sub.tagIds,
        note: sub.name,
        payee: `Đăng ký · ${monthLabelShort(m)}`,
        status: "pending",
        occurredAt: billingDate(m, sub.dayOfMonth),
        createdAt: now.toISOString(),
        subscriptionId: sub.id,
        subMonth: m,
      });
    }
  }
  if (fresh.length) commit({ ...state, transactions: [...fresh, ...state.transactions] });
}

/** Confirm a pending subscription charge → it becomes a recorded expense. */
export function confirmSubscriptionCharge(txId: string) {
  updateTransaction(txId, { status: "recorded" });
}

/** Skip a subscription charge this cycle (grey; the next cycle still reminds). */
export function skipSubscriptionCharge(txId: string) {
  updateTransaction(txId, { status: "skipped" });
}

/** Undo a decision — back to awaiting confirmation. */
export function revertSubscriptionCharge(txId: string) {
  updateTransaction(txId, { status: "pending" });
}

// ---- import / export -------------------------------------------------------
export function exportData(): string {
  return JSON.stringify(
    {
      app: "cashy",
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      workspace: state.workspace,
      categories: state.categories,
      tags: state.tags,
      transactions: state.transactions,
      subscriptions: state.subscriptions,
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
      version: CURRENT_VERSION,
      theme: state.theme,
      workspace: p.workspace ?? state.workspace,
      categories: p.categories,
      tags: Array.isArray(p.tags) ? p.tags : [],
      transactions: p.transactions,
      subscriptions: Array.isArray(p.subscriptions) ? p.subscriptions : [],
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

  // One bright hue per root (from the web-builder chart palette); children
  // inherit their parent's hue so the by-root donut & ranked bars stay coherent.
  const food = add("Ăn uống", "expense", "#f59e0b", "utensils");
  add("Đi chợ", "expense", "#f59e0b", "shopping-cart", food);
  add("Nhà hàng", "expense", "#f59e0b", "utensils-crossed", food);
  add("Cà phê", "expense", "#f59e0b", "coffee", food);
  add("Di chuyển", "expense", "#3b82f6", "car");
  const bills = add("Hóa đơn", "expense", "#06b6d4", "receipt");
  add("Điện", "expense", "#06b6d4", "zap", bills);
  add("Nước", "expense", "#06b6d4", "droplet", bills);
  add("Internet", "expense", "#06b6d4", "wifi", bills);
  add("Mua sắm", "expense", "#8b5cf6", "shopping-bag");
  add("Sức khỏe", "expense", "#14b8a6", "heart-pulse");
  add("Giải trí", "expense", "#ec4899", "gamepad-2");
  add("Nhà ở", "expense", "#6366f1", "house");
  add("Lương", "income", "#10b981", "wallet");
  add("Thưởng", "income", "#84cc16", "gift");
  add("Đầu tư", "income", "#0ea5e9", "trending-up");
  add("Khác", "income", "#64748b", "circle-dollar-sign");
  return out;
}
