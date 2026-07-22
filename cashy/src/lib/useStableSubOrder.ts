import { useMemo, useRef } from "react";
import type { Subscription, Transaction } from "@/types";
import { needsPaymentNow } from "@/lib/domain";

/** Active first, then the ones asking for money, then by name. "Asking for money"
 *  now reads the ledger (see `needsPaymentNow`), so it needs the transactions. */
function sortSubs(a: Subscription, b: Subscription, txs: Transaction[]): number {
  return (
    Number(b.active) - Number(a.active) ||
    Number(needsPaymentNow(b, txs)) - Number(needsPaymentNow(a, txs)) ||
    a.name.localeCompare(b.name, "en")
  );
}

/**
 * Subscriptions in a display order that is decided ONCE — the first time the list
 * is non-empty — and then held STABLE for the life of the mount. Editing a card
 * (rename, change amount, mark paid, even pause) never makes it jump position;
 * new subscriptions append at the end and deleted ones drop out. A fresh mount
 * (reload / navigating back to the screen) re-sorts from scratch.
 *
 * Why freeze: the sort key includes mutable status (active / due), so re-sorting
 * on every edit would yank a card out from under the user the instant they
 * changed it. Sorting once and holding keeps the list calm while they work.
 */
export function useStableSubOrder(
  subscriptions: Subscription[],
  txs: Transaction[],
): Subscription[] {
  const orderRef = useRef<string[]>([]);
  return useMemo(() => {
    const byId = new Map(subscriptions.map((s) => [s.id, s] as const));
    if (orderRef.current.length === 0) {
      // First non-empty render: take the sorted order and freeze its ids.
      orderRef.current = [...subscriptions].sort((a, b) => sortSubs(a, b, txs)).map((s) => s.id);
    } else {
      // Later renders: keep the frozen order, drop removed ids, append new ones.
      const known = orderRef.current.filter((id) => byId.has(id));
      const knownSet = new Set(known);
      const added = subscriptions.filter((s) => !knownSet.has(s.id)).map((s) => s.id);
      orderRef.current = [...known, ...added];
    }
    return orderRef.current
      .map((id) => byId.get(id))
      .filter((s): s is Subscription => Boolean(s));
    // `txs` only steers the very first sort (order is frozen after); listed so the
    // memo stays honest about what it reads.
  }, [subscriptions, txs]);
}
