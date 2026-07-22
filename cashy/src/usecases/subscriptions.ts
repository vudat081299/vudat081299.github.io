import type { SubInterval, Subscription, Transaction, TxStatus } from "@/domain/types";
import {
  chargesSurvivingCancel,
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
  fullAmount?: number;
  members?: number;
  firstCycleAmount?: number;
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
    // Shared-plan bookkeeping + a prorated first charge — all optional, only set
    // when the editor collected them (see the Subscription type).
    fullAmount: input.fullAmount,
    members: input.members,
    firstCycleAmount: input.firstCycleAmount,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, subscriptions: [...state.subscriptions, sub] });
  syncSubscriptions();
  return sub.id;
}

/** The fields that define WHEN a plan bills. Editing any of them moves the whole
 *  cycle grid, so the dues have to be recomputed. */
const BILLING_FIELDS = ["interval", "dayOfMonth", "monthOfYear", "startedAt"] as const;

export function updateSubscription(id: string, patch: Partial<Subscription>): void {
  const state = getState();
  commit({
    ...state,
    subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
  // Re-shaping the schedule can put a cycle in the past that was never billed
  // (see domain/subscription.firstUnpaidCycle). Raise it NOW — otherwise the
  // card claims the plan is settled until something else triggers a sync.
  // Safe from recursion: syncPayments patches only lastPaidAt / paymentTxIds.
  if (BILLING_FIELDS.some((f) => f in patch)) syncSubscriptions();
}

export function setSubscriptionActive(id: string, active: boolean): void {
  // Resuming clears the stop date as well as switching the service back on: the
  // two must never disagree, because `dueCharges` trusts `active` alone when it
  // decides whether to raise a cycle.
  updateSubscription(id, active ? { active, cancelledAt: undefined } : { active });
  // Resuming has to raise the cycles that came due while it was off, right now:
  // otherwise the card reports "suspended, unpaid" while offering no charge to
  // settle, and the way out only appears after a page reload.
  if (active) syncSubscriptions();
}

/**
 * Cancel a subscription effective a specific day, and retire the cycles that
 * would have billed on or after it.
 *
 * The stop date matters because Cashy raises a charge for every cycle that comes
 * due, so a service the user stopped in May keeps accruing "unpaid" June and July
 * cycles until they say otherwise. Recording WHEN it stopped lets those charges
 * be dropped at the source instead of leaving the user to tick them away one by
 * one in the catch-up dialog. Cycles that billed before the stop date survive —
 * they were really used, and may really still be owed.
 */
export function cancelSubscription(id: string, cancelledAt: string): void {
  const state = getState();
  const sub = state.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  commit({
    ...state,
    subscriptions: state.subscriptions.map((s) =>
      s.id === id ? { ...s, active: false, cancelledAt } : s,
    ),
    transactions: chargesSurvivingCancel(state.transactions, sub, cancelledAt),
  });
  // Dropping pending charges can change what the ledger says was paid.
  syncPayments(id);
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
  resolveSubscriptionCharges({ pay: txIds, skip: [] });
}

/**
 * Settle a catch-up in ONE step: the cycles the user paid become recorded, the
 * ones they didn't use become skipped, and anything left out of both lists stays
 * pending — still owed, still nagging.
 *
 * A single commit rather than a loop of `setChargeStatus`, because a catch-up is
 * one decision in the user's head: it has to undo as one, and `syncPayments`
 * must see the FINISHED picture. Run per charge instead, `lastPaidAt` would be
 * recomputed against a half-applied ledger at every step.
 */
export function resolveSubscriptionCharges(sel: { pay: string[]; skip: string[] }): void {
  const pay = new Set(sel.pay);
  const skip = new Set(sel.skip);
  if (pay.size === 0 && skip.size === 0) return;
  const state = getState();
  const subIds = new Set(
    state.transactions
      .filter((t) => (pay.has(t.id) || skip.has(t.id)) && t.subscriptionId)
      .map((t) => t.subscriptionId!),
  );
  commit({
    ...state,
    transactions: state.transactions.map((t) =>
      pay.has(t.id)
        ? { ...t, status: "recorded" as const }
        : skip.has(t.id)
          ? { ...t, status: "skipped" as const }
          : t,
    ),
  });
  for (const id of subIds) syncPayments(id);
}

/** Put a batch of charges back to "awaiting confirmation" — the reversal for a
 *  whole catch-up, so its Undo toast costs one commit rather than N. */
export function revertSubscriptionCharges(txIds: string[]): void {
  if (!txIds.length) return;
  const state = getState();
  const ids = new Set(txIds);
  const subIds = new Set(
    state.transactions
      .filter((t) => ids.has(t.id) && t.subscriptionId)
      .map((t) => t.subscriptionId!),
  );
  commit({
    ...state,
    transactions: state.transactions.map((t) =>
      ids.has(t.id) ? { ...t, status: "pending" as const } : t,
    ),
  });
  for (const id of subIds) syncPayments(id);
}
