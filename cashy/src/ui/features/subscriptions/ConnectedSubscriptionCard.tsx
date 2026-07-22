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

  const resolve = (plan: { pay: string[]; skip: string[]; cancelling: boolean }) => {
    resolveSubscriptionCharges({ pay: plan.pay, skip: plan.skip });
    if (plan.cancelling) setSubscriptionActive(sub.id, false);

    // One toast for the whole catch-up, undoing it as one: the charges go back to
    // pending and a cancelled service comes back on. Anything else would leave
    // the user to unpick a five-row decision by hand.
    const touched = [...plan.pay, ...plan.skip];
    const what = plan.cancelling
      ? `Đã huỷ ${sub.name}`
      : plan.pay.length > 0
        ? `Đã ghi nhận ${plan.pay.length} kỳ của ${sub.name}`
        : `Đã bỏ qua ${plan.skip.length} kỳ của ${sub.name}`;
    toast.undo(what, () => {
      revertSubscriptionCharges(touched);
      if (plan.cancelling) setSubscriptionActive(sub.id, true);
    });
  };

  const revert = (txId: string, month: string, wasPaid: boolean) => {
    revertSubscriptionCharge(txId);
    toast.undo(`Đã hoàn tác kỳ ${monthLabelShort(month)}`, () =>
      wasPaid ? confirmSubscriptionCharge(txId) : skipSubscriptionCharge(txId),
    );
  };

  const setActive = (active: boolean) => {
    setSubscriptionActive(sub.id, active);
    toast.undo(active ? `${sub.name} đã tiếp tục` : `${sub.name} đã huỷ`, () =>
      setSubscriptionActive(sub.id, !active),
    );
  };

  // Undo re-activates, which re-raises every cycle the cancellation retired —
  // `setSubscriptionActive(true)` clears the stop date and re-syncs — so the
  // reversal needs no record of what was dropped.
  const cancel = (cancelledAt: string) => {
    cancelSubscription(sub.id, cancelledAt);
    toast.undo(`${sub.name} đã huỷ`, () => setSubscriptionActive(sub.id, true));
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
