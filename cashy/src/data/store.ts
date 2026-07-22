import { useSyncExternalStore } from "react";
import type {
  CashyState,
  Category,
  SubIconStyle,
  SubInterval,
  Subscription,
  Tag,
  ThemeMode,
  Transaction,
  TxType,
  Workspace,
} from "@/domain/types";
import { uid } from "@/lib/id";
import { addCycle, cycleDate, descendantIds, firstUnpaidCycle, rootOf } from "@/domain";
import { billingDate, monthKey, monthLabelShort, todayYMD, ymd } from "@/domain/date";
import { statusOf } from "@/domain/txStatus";
import { SWATCHES } from "@/lib/palette";
import { buildSampleData } from "@/data/sample";

const KEY = "cashy_state_v1";
// v2 re-colours legacy data onto the bright web-builder chart palette.
// v3 gives subscriptions a real `startedAt` date + a `lastPaidAt` marker.
// v4 gives subscriptions their payment history (`paymentTxIds`).
// v5 gives subscriptions a billing `interval` — everything before it was monthly.
const CURRENT_VERSION = 5;

function emptyState(): CashyState {
  return {
    version: CURRENT_VERSION,
    theme: "system",
    subIconStyle: "neutral",
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

/**
 * v2 → v3: a subscription used to carry only `startMonth` ("YYYY-MM"). Give it a
 * real `startedAt` date — its first billing day in that month — and back-fill
 * `lastPaidAt` from whatever it has actually recorded, so the new reminder is
 * correct for existing data instead of demanding a payment already made.
 */
function migrateSubV3(s: Subscription, txs: Transaction[]): Subscription {
  const legacyMonth = (s as unknown as { startMonth?: string }).startMonth;
  const startedAt = s.startedAt ?? billingDate(legacyMonth ?? monthKey(), s.dayOfMonth);
  const { startMonth: _drop, ...rest } = s as Subscription & { startMonth?: string };
  return { ...rest, startedAt, ...paymentsOf(s.id, txs) };
}

/**
 * A subscription's payment history, read straight off the ledger: the charges it
 * booked that were actually confirmed, oldest first, plus the date of the last
 * of them. Both stored fields are only ever a cache of this — deriving them in
 * one place is what stops confirm / skip / undo / delete-a-charge drifting the
 * service's history away from the money it claims to have spent.
 */
function paymentsOf(
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
    if ((p.version ?? 1) < 3) {
      next = { ...next, subscriptions: next.subscriptions.map((s) => migrateSubV3(s, next.transactions)) };
    }
    if ((p.version ?? 1) < 4) {
      next = {
        ...next,
        subscriptions: next.subscriptions.map((s) => ({ ...s, ...paymentsOf(s.id, next.transactions) })),
      };
    }
    // Every subscription that existed before v5 billed monthly, by construction
    // — the model had no other option — so the back-fill is unambiguous.
    if ((p.version ?? 1) < 5) {
      next = {
        ...next,
        subscriptions: next.subscriptions.map((s) => ({ ...s, interval: s.interval ?? "monthly" })),
      };
    }
    // A workspace must never open on an empty ledger: any account that got this
    // far with no transactions is re-seeded with the 200-row demo dataset. Only
    // an EMPTY ledger is filled, so nothing a user actually entered is touched.
    if (next.workspace && next.transactions.length === 0) {
      const categories = next.categories.length ? next.categories : seedCategories();
      const { tags, transactions, subscriptions } = buildSampleData(categories);
      next = { ...next, categories, tags, transactions, subscriptions };
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

/** Toggle whether subscription icon tiles carry the service's hue or stay grey. */
export function setSubIconStyle(subIconStyle: SubIconStyle) {
  commit({ ...state, subIconStyle });
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
  const { tags, transactions, subscriptions } = buildSampleData(categories);
  commit({ ...state, workspace, categories, tags, transactions, subscriptions });
}

/** Replace categories/tags/transactions with a fresh demo dataset (200 txns). */
export function loadSampleData() {
  const categories = seedCategories();
  const { tags, transactions, subscriptions } = buildSampleData(categories);
  const workspace: Workspace = state.workspace ?? {
    displayName: "Của tôi",
    currency: "VND",
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, workspace, categories, tags, transactions, subscriptions });
}

export function updateWorkspace(patch: Partial<Workspace>) {
  if (!state.workspace) return;
  commit({ ...state, workspace: { ...state.workspace, ...patch } });
}

export function resetAll() {
  commit({ ...emptyState(), theme: state.theme, subIconStyle: state.subIconStyle });
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
  // Read the owner first — once the row is gone there is nothing left to ask.
  const subId = state.transactions.find((t) => t.id === id)?.subscriptionId;
  commit({
    ...state,
    transactions: state.transactions.filter((t) => t.id !== id),
  });
  if (subId) syncPayments(subId);
}

// ---- subscriptions ---------------------------------------------------------
export function addSubscription(input: {
  name: string;
  amount: number;
  interval?: SubInterval;
  dayOfMonth: number;
  monthOfYear?: number;
  categoryId: string | null;
  tagIds: string[];
  colorHex: string;
  icon: string;
  note?: string;
  startedAt?: string;
}): string {
  const interval = input.interval ?? "monthly";
  const sub: Subscription = {
    id: uid(),
    name: input.name.trim(),
    amount: input.amount,
    interval,
    dayOfMonth: input.dayOfMonth,
    monthOfYear: interval === "yearly" ? (input.monthOfYear ?? 1) : undefined,
    categoryId: input.categoryId,
    tagIds: input.tagIds,
    colorHex: input.colorHex,
    icon: input.icon,
    note: input.note?.trim() ?? "",
    active: true,
    startedAt: input.startedAt ?? todayYMD(),
    lastPaidAt: null,
    paymentTxIds: [],
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
  // Resuming has to raise the cycles that came due while it was off, right now:
  // otherwise the card reports "suspended, unpaid" while offering no charge to
  // settle, and the way out only appears after a page reload.
  if (active) syncSubscriptions();
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
    // Start from the first month still owed, NOT from the subscription's start:
    // `lastPaidAt` says everything up to it is settled, so a service subscribed
    // a year ago doesn't materialise a year of dues the first time it syncs.
    let m = firstUnpaidCycle(sub);
    for (let guard = 0; m <= cur && guard < 600; guard++, m = addCycle(sub, m, 1)) {
      if (cycleDate(sub, m) > today) continue; // not due yet
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
        occurredAt: cycleDate(sub, m),
        createdAt: now.toISOString(),
        subscriptionId: sub.id,
        subMonth: m,
      });
    }
  }
  if (fresh.length) commit({ ...state, transactions: [...fresh, ...state.transactions] });
}

/** Re-read a subscription's payment history off the ledger (see `paymentsOf`). */
function syncPayments(subId: string) {
  const sub = state.subscriptions.find((s) => s.id === subId);
  if (!sub) return;
  const next = paymentsOf(subId, state.transactions);
  const same =
    sub.lastPaidAt === next.lastPaidAt &&
    sub.paymentTxIds.length === next.paymentTxIds.length &&
    sub.paymentTxIds.every((id, i) => id === next.paymentTxIds[i]);
  if (!same) updateSubscription(subId, next);
}

/** The subscription a charge belongs to, read before the status is changed. */
function subIdOfCharge(txId: string): string | undefined {
  return state.transactions.find((t) => t.id === txId)?.subscriptionId ?? undefined;
}

/** Confirm a pending subscription charge → it becomes a recorded expense. */
export function confirmSubscriptionCharge(txId: string) {
  const subId = subIdOfCharge(txId);
  updateTransaction(txId, { status: "recorded" });
  if (subId) syncPayments(subId);
}

/**
 * Confirm several pending charges at once — the "I did pay, I just never told
 * the app" case. A subscription's status is user-maintained, not read from a
 * bank feed, so falling months behind is normal and clearing it must not cost
 * one click per month. Committed as ONE state change so the whole catch-up is a
 * single undo-able step rather than N separate ones.
 */
export function confirmSubscriptionCharges(txIds: string[]) {
  if (!txIds.length) return;
  const ids = new Set(txIds);
  const subIds = new Set(
    state.transactions.filter((t) => ids.has(t.id) && t.subscriptionId).map((t) => t.subscriptionId!),
  );
  commit({
    ...state,
    transactions: state.transactions.map((t) =>
      ids.has(t.id) ? { ...t, status: "recorded" as const } : t,
    ),
  });
  for (const id of subIds) syncPayments(id);
}

/** Skip a subscription charge this cycle (grey; the next cycle still reminds). */
export function skipSubscriptionCharge(txId: string) {
  const subId = subIdOfCharge(txId);
  updateTransaction(txId, { status: "skipped" });
  if (subId) syncPayments(subId);
}

/** Undo a decision — back to awaiting confirmation. */
export function revertSubscriptionCharge(txId: string) {
  const subId = subIdOfCharge(txId);
  updateTransaction(txId, { status: "pending" });
  if (subId) syncPayments(subId);
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
      subIconStyle: p.subIconStyle ?? state.subIconStyle,
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
