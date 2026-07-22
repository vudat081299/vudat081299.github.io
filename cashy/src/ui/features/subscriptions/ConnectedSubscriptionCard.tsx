import { useState } from "react";
import type { SubIconStyle, Subscription, Transaction } from "@/domain/types";
import { subscriptionStatus } from "@/domain";
import { monthLabelShort } from "@/domain/date";
import {
  cancelSubscription,
  confirmSubscriptionCharge,
  resolveSubscriptionCharges,
  revertSubscriptionCharge,
  revertSubscriptionCharges,
  setSubscriptionActive,
  skipSubscriptionCharge,
} from "@/usecases";
import { toast } from "@/lib/toast";
import { SubscriptionCard } from "@/ui/features/subscriptions/SubscriptionCard";
import { SubscriptionCatchUp } from "@/ui/features/subscriptions/SubscriptionCatchUp";
import { SubscriptionHistory } from "@/ui/features/subscriptions/SubscriptionHistory";
import { SubscriptionCancel } from "@/ui/features/subscriptions/SubscriptionCancel";

/**
 * A `SubscriptionCard` wired to the store, plus the two dialogs it opens.
 *
 * The card itself stays presentational — every decision leaves as a callback —
 * so this is where those callbacks meet the usecases, and where the dialogs
 * live. They belong to a single card (each has one subscription's cycles in it),
 * which is why the screen doesn't host them: it would have to track which card
 * opened which dialog.
 *
 * Every write here is reversible from a toast, because all of them are claims
 * about the past ("I paid June") that are easy to get wrong by one row.
 */
export function ConnectedSubscriptionCard({
  sub,
  txs,
  iconStyle,
}: {
  sub: Subscription;
  txs: Transaction[];
  iconStyle: SubIconStyle;
}) {
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const pending = subscriptionStatus(sub, txs).pending;

  // Prefill the catch-up prices with the most recent charge actually recorded —
  // last month's figure — falling back to the plan price when nothing is on
  // record yet. Computed as a block rather than a chained ternary for clarity.
  const lastPaidAmount = (() => {
    const recorded = txs.filter(
      (t) => t.subscriptionId === sub.id && (t.status ?? "recorded") === "recorded",
    );
    if (recorded.length === 0) return sub.amount;
    const latest = recorded.reduce((a, b) => (a.occurredAt >= b.occurredAt ? a : b));
    return latest.amount;
  })();

  const resolve = (plan: {
    pay: string[];
    skip: string[];
    cancelling: boolean;
    amounts: Record<string, number>;
  }) => {
    resolveSubscriptionCharges({ pay: plan.pay, skip: plan.skip, amounts: plan.amounts });
    if (plan.cancelling) setSubscriptionActive(sub.id, false);

    // One toast for the whole catch-up, undoing it as one: the charges go back to
    // pending and a cancelled service comes back on. Anything else would leave
    // the user to unpick a five-row decision by hand.
    const touched = [...plan.pay, ...plan.skip];
    const what = plan.cancelling
      ? `Cancelled ${sub.name}`
      : plan.pay.length > 0
        ? `Recorded ${plan.pay.length} cycles of ${sub.name}`
        : `Skipped ${plan.skip.length} cycles of ${sub.name}`;
    toast.undo(what, () => {
      revertSubscriptionCharges(touched);
      if (plan.cancelling) setSubscriptionActive(sub.id, true);
    });
  };

  const revert = (txId: string, month: string, wasPaid: boolean) => {
    revertSubscriptionCharge(txId);
    toast.undo(`Reverted the ${monthLabelShort(month)} cycle`, () =>
      wasPaid ? confirmSubscriptionCharge(txId) : skipSubscriptionCharge(txId),
    );
  };

  const setActive = (active: boolean) => {
    setSubscriptionActive(sub.id, active);
    toast.undo(active ? `${sub.name} resumed` : `${sub.name} cancelled`, () =>
      setSubscriptionActive(sub.id, !active),
    );
  };

  // Undo re-activates, which re-raises every cycle the cancellation retired —
  // `setSubscriptionActive(true)` clears the stop date and re-syncs — so the
  // reversal needs no record of what was dropped.
  const cancel = (cancelledAt: string) => {
    cancelSubscription(sub.id, cancelledAt);
    toast.undo(`${sub.name} cancelled`, () => setSubscriptionActive(sub.id, true));
  };

  return (
    <>
      <SubscriptionCard
        sub={sub}
        txs={txs}
        iconStyle={iconStyle}
        onOpenCatchUp={() => setCatchUpOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenCancel={() => setCancelOpen(true)}
        onSetActive={setActive}
      />
      <SubscriptionCatchUp
        sub={sub}
        pending={pending}
        open={catchUpOpen}
        onClose={() => setCatchUpOpen(false)}
        onResolve={resolve}
        defaultAmount={lastPaidAmount}
      />
      <SubscriptionHistory
        sub={sub}
        txs={txs}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRevert={revert}
      />
      <SubscriptionCancel
        sub={sub}
        pending={pending}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancel={cancel}
      />
    </>
  );
}
