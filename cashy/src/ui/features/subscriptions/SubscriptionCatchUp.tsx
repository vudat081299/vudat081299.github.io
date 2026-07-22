import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Subscription } from "@/domain/types";
import { planCatchUp, type CycleChoice } from "@/domain";
import { billingDate, fmtDateShort, monthLabelShort } from "@/domain/date";
import { formatMoney } from "@/domain/money";
import { Modal } from "@/ui/kit/Modal";
import { Switch } from "@/ui/kit/Switch";

/**
 * The one place a subscription's owed cycles are settled.
 *
 * Every cycle the service is behind on gets a row, and each row asks the two
 * questions that actually decide what happened to it: **was the service running
 * that cycle** (the switch) and **was it paid for** (the checkbox). Switching a
 * cycle off says "I wasn't a customer then", which greys the row out and clears
 * its tick — there is nothing to pay for a month you didn't have.
 *
 * The card used to carry a one-click "Mark paid" for the single-cycle case, but
 * two entry points meant two mental models of the same act; everything comes
 * through here now, however many cycles are owed.
 *
 * Ordering is enforced, not merely suggested: debts settle oldest-first, so a
 * used-but-unpaid cycle can only sit at the tail of the list. `domain.planCatchUp`
 * owns that rule and the footer explains any refusal in words rather than just
 * disabling the button. Switching every cycle off is read as cancelling the
 * service, and the confirm button says so.
 */
export function SubscriptionCatchUp({
  sub,
  pending,
  open,
  onClose,
  onResolve,
}: {
  sub: Subscription;
  /** the owed cycles, oldest first */
  pending: { month: string; txId: string }[];
  open: boolean;
  onClose: () => void;
  /** settle the charges; `cancelling` also switches the service off */
  onResolve: (plan: { pay: string[]; skip: string[]; cancelling: boolean }) => void;
}) {
  // Whether the service was running that cycle — a free per-row answer.
  const [used, setUsed] = useState<Record<string, boolean>>({});
  // Payment, on the other hand, is NOT N independent answers. Debts settle
  // oldest-first, so "what have I paid" is a single waterline: everything up to
  // some cycle is settled and everything after it is still owed. Storing the
  // index of the last paid cycle (-1 = nothing paid) makes the out-of-order
  // state unrepresentable rather than merely rejected.
  const [paidThrough, setPaidThrough] = useState(-1);

  // Re-arm on each open, and whenever the owed set changes underneath (a charge
  // settled in the transactions table while this was closed).
  //
  // Up to three owed cycles opens TICKED: people come here because they already
  // paid and never told the app, so the common case should cost no clicks. But
  // once FOUR or more cycles are behind, the far likelier story is that the
  // service was abandoned months ago and this visit is to cancel it, not to
  // confirm four separate payments — so past that threshold every switch opens
  // OFF, which the dialog already reads as "cancel the service".
  const cycleKey = pending.map((p) => p.txId).join("|");
  useEffect(() => {
    if (!open) return;
    const likelyCancelling = pending.length > 3;
    setUsed(Object.fromEntries(pending.map((p) => [p.txId, !likelyCancelling])));
    setPaidThrough(likelyCancelling ? -1 : pending.length - 1);
    // `pending` is a fresh array each render; its ids are the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cycleKey]);

  const rows: CycleChoice[] = useMemo(
    () =>
      pending.map((p, i) => ({
        txId: p.txId,
        month: p.month,
        used: used[p.txId] ?? true,
        paid: i <= paidThrough,
      })),
    [pending, used, paidThrough],
  );

  // Clicking a cycle moves the waterline TO it; clicking one already paid moves
  // the line back to just before it. (The same gesture as a star rating, and the
  // reason the ordering rule needs no error message here.)
  const setWaterline = (i: number) => setPaidThrough((cur) => (i <= cur ? i - 1 : i));

  const plan = planCatchUp(rows);
  const payTotal = plan.pay.length * sub.amount;

  // A cycle switched off is not a debt, so it drops out of the paid set without
  // disturbing the waterline around it — `planCatchUp` treats skipped cycles as
  // transparent to the ordering for exactly the same reason.
  const toggleUsed = (txId: string, on: boolean) => setUsed((u) => ({ ...u, [txId]: on }));

  const submit = () => {
    if (plan.problem) return;
    onResolve({ pay: plan.pay, skip: plan.skip, cancelling: plan.cancelling });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${sub.name} · ${pending.length} kỳ chưa xử lý`}
      maxWidth={520}
      footer={
        // A full-width row with the two ends pinned (space-between) and vertically
        // centred — the `marginRight:auto` trick left the buttons riding the foot's
        // default `stretch`, so a text-only "Huỷ dịch vụ" and an icon+text confirm
        // read as two different heights. This matches the transaction editor's foot.
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button type="button" className="wb-btn wb-btn--ghost wb-btn--sm" onClick={onClose}>
            Để sau
          </button>
          <button
            type="button"
            // Cancelling is a real destructive outcome, so the confirm goes solid
            // red (tier 2) rather than the black primary fill with red text, which
            // read as a broken button.
            className={plan.cancelling ? "wb-btn wb-btn--danger wb-btn--sm" : "wb-btn wb-btn--sm"}
            style={{ gap: 4 }}
            disabled={Boolean(plan.problem)}
            onClick={submit}
          >
            {plan.cancelling ? (
              "Huỷ dịch vụ"
            ) : (
              <>
                <span className="wb-ico wb-ico--xs">check</span>
                {plan.pay.length > 0
                  ? `Đã trả ${plan.pay.length} kỳ · ${formatMoney(payTotal)}`
                  : "Lưu"}
              </>
            )}
          </button>
        </div>
      }
    >
      <p className="cashy-catchup__lead">
        Tick đến kỳ bạn <strong>đã thanh toán</strong> — nợ luôn trả từ kỳ cũ nhất, nên chọn một
        kỳ là mọi kỳ trước đó cũng được tính là đã trả. Tắt công tắc ở kỳ bạn{" "}
        <strong>không dùng</strong> dịch vụ.
      </p>

      <div className="wb-stack" style={{ "--wb-stack-gap": "6px" } as CSSProperties}>
        {rows.map((r, i) => (
          <div
            key={r.txId}
            className={r.used ? "cashy-catchup-row" : "cashy-catchup-row is-off"}
          >
            {/* The tick is the payment answer; it is meaningless — and disabled —
                for a cycle the user says they weren't a customer for. Clicking it
                sets the waterline rather than toggling this row alone. */}
            <label className="wb-check cashy-catchup-row__pay">
              <input
                type="checkbox"
                checked={r.paid}
                disabled={!r.used}
                onChange={() => setWaterline(i)}
              />
              <span className="cashy-catchup-row__month">{monthLabelShort(r.month)}</span>
            </label>
            <span className="cashy-catchup-row__date">
              {fmtDateShort(billingDate(r.month, sub.dayOfMonth))}
            </span>
            <span className="wb-num cashy-catchup-row__amt">{formatMoney(sub.amount)}</span>
            <Switch
              size="sm"
              checked={r.used}
              onChange={(e) => toggleUsed(r.txId, e.target.checked)}
              aria-label={`Có dùng dịch vụ kỳ ${monthLabelShort(r.month)}`}
              className="cashy-catchup-row__used"
            />
          </div>
        ))}
      </div>

      {/* Why the confirm is refusing, in words. A disabled button with no reason
          is the thing that makes a form feel broken rather than strict. */}
      {plan.problem && <p className="cashy-catchup__problem">{plan.problem}</p>}

      {plan.cancelling && (
        <p className="cashy-catchup__note">
          Bạn đã tắt tất cả các kỳ — Cashy hiểu là dịch vụ này không còn dùng nữa và sẽ huỷ đăng
          ký, đồng thời bỏ qua {plan.skip.length} kỳ chưa xử lý.
        </p>
      )}
      {!plan.cancelling && plan.skip.length > 0 && !plan.problem && (
        <p className="cashy-catchup__note">
          {plan.skip.length} kỳ sẽ được đánh dấu không dùng và không tính vào chi tiêu.
        </p>
      )}
    </Modal>
  );
}
