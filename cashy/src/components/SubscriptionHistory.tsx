import { useMemo, type CSSProperties } from "react";
import type { Subscription, Transaction } from "@/types";
import { statusOf } from "@/lib/txStatus";
import {
  confirmSubscriptionCharge,
  revertSubscriptionCharge,
  skipSubscriptionCharge,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/wb/Modal";
import { billingDate, fmtDateShort, monthLabelShort } from "@/lib/date";
import { formatMoney } from "@/lib/money";

/**
 * A subscription's settled cycles — every charge that was paid or skipped — with
 * a one-click reversal on each. This is the persistent home for "I confirmed the
 * wrong month": paid cycles revert to owed (so they nag again until re-decided),
 * skipped cycles come back too. The transient Undo toast covers the moment right
 * after a click; this covers everything after that toast is gone.
 *
 * Reads straight off the ledger passed in `txs`, so it always matches the money —
 * and re-renders live as each reversal flips a charge back to pending.
 */
export function SubscriptionHistory({
  sub,
  txs,
  open,
  onClose,
}: {
  sub: Subscription;
  txs: Transaction[];
  open: boolean;
  onClose: () => void;
}) {
  // Settled charges only (paid or skipped), newest cycle first — the pending ones
  // live in the catch-up picker, not here.
  const rows = useMemo(() => {
    return txs
      .filter((t) => t.subscriptionId === sub.id && t.subMonth)
      .filter((t) => statusOf(t) === "recorded" || statusOf(t) === "skipped")
      .map((t) => ({ txId: t.id, month: t.subMonth as string, amount: t.amount, status: statusOf(t) }))
      .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  }, [txs, sub.id]);

  const paidCount = rows.filter((r) => r.status === "recorded").length;

  const revertPaid = (txId: string, month: string) => {
    revertSubscriptionCharge(txId);
    toast.undo(`Đã hoàn tác kỳ ${monthLabelShort(month)}`, () => confirmSubscriptionCharge(txId));
  };
  const restoreSkipped = (txId: string, month: string) => {
    revertSubscriptionCharge(txId);
    toast.undo(`Khôi phục kỳ ${monthLabelShort(month)}`, () => skipSubscriptionCharge(txId));
  };

  return (
    <Modal open={open} onClose={onClose} title={`${sub.name} · Lịch sử`} maxWidth={440}>
      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--wb-fg-muted)" }}>
          Chưa có kỳ nào được ghi nhận hay bỏ qua.
        </p>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--wb-fg-muted)" }}>
            {paidCount} kỳ đã trả · {formatMoney(sub.amount * paidCount)}. Bấm để hoàn tác một kỳ —
            kỳ đó sẽ quay lại “cần trả”.
          </p>
          <div
            className="wb-stack cashy-history-scroll"
            style={{ "--wb-stack-gap": "6px" } as CSSProperties}
          >
            {rows.map((r) => {
              const paid = r.status === "recorded";
              return (
                <div key={r.txId} className="cashy-pay-row cashy-history-row">
                  <span
                    className={paid ? "wb-cap wb-cap--success" : "wb-cap"}
                    style={{ flexShrink: 0 }}
                  >
                    {paid && <span className="wb-cap__dot" />}
                    {paid ? "Đã trả" : "Bỏ qua"}
                  </span>
                  <span className="cashy-pay-row__month">{monthLabelShort(r.month)}</span>
                  <span className="cashy-pay-row__date">
                    {fmtDateShort(billingDate(r.month, sub.dayOfMonth))}
                  </span>
                  <span className="wb-num cashy-pay-row__amt">
                    {paid ? formatMoney(r.amount) : "—"}
                  </span>
                  <button
                    type="button"
                    className="wb-btn wb-btn--ghost wb-btn--sm"
                    onClick={() =>
                      paid ? revertPaid(r.txId, r.month) : restoreSkipped(r.txId, r.month)
                    }
                  >
                    {paid ? "Hoàn tác" : "Khôi phục"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
