import { useMemo, type CSSProperties } from "react";
import type { Subscription, Transaction } from "@/domain/types";
import { statusOf } from "@/domain/txStatus";
import { billingDate, fmtDate } from "@/domain/date";
import { formatMoney } from "@/domain/money";
import { Modal } from "@/ui/kit/Modal";

/**
 * A subscription's settled cycles — every charge that was paid or skipped — with
 * a one-click reversal on each. This is the persistent home for "I confirmed the
 * wrong month": a paid cycle reverts to owed (so it nags again until re-decided)
 * and a skipped one comes back the same way. The Undo toast covers the seconds
 * right after a click; this covers everything after that toast is gone.
 *
 * Reads straight off the ledger in `txs`, so it always matches the money — and
 * re-renders live as each reversal flips a charge back to pending.
 *
 * Presentational: the reversal leaves as a callback, like everything else on the
 * card, so the component never reaches for the store itself.
 */
export function SubscriptionHistory({
  sub,
  txs,
  open,
  onClose,
  onRevert,
}: {
  sub: Subscription;
  txs: Transaction[];
  open: boolean;
  onClose: () => void;
  /** put one settled charge back to "awaiting confirmation" */
  onRevert: (txId: string, month: string, wasPaid: boolean) => void;
}) {
  // Settled charges only (paid or skipped), newest cycle first — the owed ones
  // live in the catch-up dialog, not here.
  const rows = useMemo(
    () =>
      txs
        .filter((t) => t.subscriptionId === sub.id && t.subMonth)
        .filter((t) => statusOf(t) === "recorded" || statusOf(t) === "skipped")
        .map((t) => ({
          txId: t.id,
          month: t.subMonth as string,
          amount: t.amount,
          paid: statusOf(t) === "recorded",
        }))
        .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0)),
    [txs, sub.id],
  );

  const paidCount = rows.filter((r) => r.paid).length;

  return (
    <Modal open={open} onClose={onClose} title={`${sub.name} · History`} maxWidth={460}>
      {rows.length === 0 ? (
        <p className="cashy-catchup__lead" style={{ marginBottom: 0 }}>
          No cycles have been recorded or skipped yet.
        </p>
      ) : (
        <>
          <p className="cashy-catchup__lead">
            {paidCount} cycles paid · {formatMoney(sub.amount * paidCount)}. Undo a cycle to put it
            back to “payment due”.
          </p>
          <div
            className="wb-stack cashy-history-scroll"
            style={{ "--wb-stack-gap": "6px" } as CSSProperties}
          >
            {rows.map((r) => (
              <div key={r.txId} className="cashy-catchup-row">
                <span className={r.paid ? "wb-cap wb-cap--success" : "wb-cap"}>
                  {r.paid && <span className="wb-cap__dot" />}
                  {r.paid ? "Paid" : "Not used"}
                </span>
                <span className="cashy-catchup-row__month">
                  {fmtDate(billingDate(r.month, sub.dayOfMonth))}
                </span>
                <span className="wb-num cashy-catchup-row__amt">
                  {r.paid ? formatMoney(r.amount) : "—"}
                </span>
                <button
                  type="button"
                  className="wb-btn wb-btn--ghost wb-btn--sm"
                  onClick={() => onRevert(r.txId, r.month, r.paid)}
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
