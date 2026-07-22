import type { SubInterval, Subscription, Transaction, TxStatus } from "@/domain/types";
import {
  chargesSurvivingDeletion,
  dueCharges,
  paymentsDrifted,
  paymentsOf,
} from "@/domain/subscription";
import { todayYMD } from "@/domain/date";
import { commit, getState } from "@/data/store";
import { uid } from "@/lib/id";

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
  const state = getState();
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

export function updateSubscription(id: string, patch: Partial<Subscription>): void {
  const state = getState();
  commit({
    ...state,
    subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
}

export function setSubscriptionActive(id: string, active: boolean): void {
  updateSubscription(id, { active });
  // Resuming has to raise the cycles that came due while it was off, right now:
  // otherwise the card reports "suspended, unpaid" while offering no charge to
  // settle, and the way out only appears after a page reload.
  if (active) syncSubscriptions();
}

/** Remove a subscription. Recorded charges are real spending and stay; the
 *  unconfirmed (pending/skipped) charges are dropped with it. */
export function deleteSubscription(id: string): void {
  const state = getState();
  commit({
    ...state,
    subscriptions: state.subscriptions.filter((s) => s.id !== id),
    transactions: chargesSurvivingDeletion(state.transactions, id),
  });
}

/**
 * Materialise a `pending` expense for every cycle that has come due without a
 * charge on record. Idempotent — safe to call on every app mount; the rule that
 * decides WHICH cycles are owed lives in `domain/subscription.dueCharges`.
 */
export function syncSubscriptions(): void {
  const state = getState();
  const now = new Date();
  const fresh: Transaction[] = dueCharges(state.subscriptions, state.transactions, now).map(
    (c) => ({ ...c, id: uid(), createdAt: now.toISOString() }),
  );
  if (fresh.length) commit({ ...state, transactions: [...fresh, ...state.transactions] });
}

/**
 * Re-read a subscription's payment history off the ledger. Exported because
 * deleting a transaction elsewhere can invalidate it (see `usecases/transactions`).
 */
export function syncPayments(subId: string): void {
  const state = getState();
  const sub = state.subscriptions.find((s) => s.id === subId);
  if (!sub) return;
  const next = paymentsOf(subId, state.transactions);
  if (paymentsDrifted(sub, next)) updateSubscription(subId, next);
}

/** Move one charge to a new status, then bring the owner's history back in line. */
function setChargeStatus(txId: string, status: TxStatus): void {
  const state = getState();
  const subId = state.transactions.find((t) => t.id === txId)?.subscriptionId;
  commit({
    ...state,
    transactions: state.transactions.map((t) => (t.id === txId ? { ...t, status } : t)),
  });
  if (subId) syncPayments(subId);
}

/** Confirm a pending subscription charge → it becomes a recorded expense. */
export function confirmSubscriptionCharge(txId: string): void {
  setChargeStatus(txId, "recorded");
}

/** Skip a subscription charge this cycle (grey; the next cycle still reminds). */
export function skipSubscriptionCharge(txId: string): void {
  setChargeStatus(txId, "skipped");
}

/** Undo a decision — back to awaiting confirmation. */
export function revertSubscriptionCharge(txId: string): void {
  setChargeStatus(txId, "pending");
}

/**
 * Confirm several pending charges at once — the "I did pay, I just never told
 * the app" case. A subscription's status is user-maintained, not read from a
 * bank feed, so falling months behind is normal and clearing it must not cost
 * one click per month. Committed as ONE state change so the whole catch-up is a
 * single undo-able step rather than N separate ones.
 */
export function confirmSubscriptionCharges(txIds: string[]): void {
  if (!txIds.length) return;
  const state = getState();
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
