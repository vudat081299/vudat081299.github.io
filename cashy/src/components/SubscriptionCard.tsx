import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Subscription, Transaction } from "@/types";
import {
  billingLabel,
  isLapsed,
  needsPaymentNow,
  nextPaymentDate,
  subCycle,
  subscriptionStatus,
} from "@/lib/domain";
import {
  confirmSubscriptionCharge,
  confirmSubscriptionCharges,
  setSubscriptionActive,
  useCashy,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/wb/Modal";
import { billingDate, fmtDateNum, fmtDateShort, monthLabelShort } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { SubTile } from "@/components/SubTile";

/**
 * One service, one card. It answers the four questions a subscription actually
 * raises — when did I last pay, when does it want money again, how much of the
 * period I paid for is already gone, and is the service still running — and then
 * lets you cancel it.
 *
 * Colour follows the ladder (§1): a service the provider would have cut off is
 * danger, a bill on the doormat is warning, everything settled stays neutral.
 * The progress bar is neutral too — time passing is not a status.
 */
export function SubscriptionCard({
  sub,
  txs,
}: {
  sub: Subscription;
  txs: Transaction[];
}) {
  // Cancelling is two clicks, never one: the card swaps its foot for a
  // confirmation rather than throwing a browser dialog at the user.
  const [confirming, setConfirming] = useState(false);
  // Marking a single cycle paid gets the same two-step confirm as cancelling.
  const [payConfirming, setPayConfirming] = useState(false);
  // Catching up several cycles opens a picker — you tick the ones you actually
  // paid, since "behind" does not mean you paid every missed month.
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paySel, setPaySel] = useState<Set<string>>(new Set());
  // After cancelling, the pointer is still over the card, so CSS :hover would
  // keep it bright until you move away. This forces the greyed-out look at once
  // and lifts only when the pointer actually leaves.
  const [suppressReveal, setSuppressReveal] = useState(false);
  const { subIconStyle } = useCashy();

  // A long name is clipped with an ellipsis by CSS; only then is a tooltip
  // worth having. Measure the rendered heading and expose the full name via
  // `title` ONLY when it actually overflows — names that fit get no tooltip.
  const nameRef = useRef<HTMLHeadingElement>(null);
  const [nameClipped, setNameClipped] = useState(false);
  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const measure = () => setNameClipped(el.scrollWidth > el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sub.name]);

  // Styled hover tooltip for clipped names. The browser's own `title` bubble is
  // slow to appear and unstyled, and an absolutely-positioned one would be cut
  // off by the card's `overflow: hidden`. A `position: fixed` bubble anchored to
  // the name's rect escapes that clip; clamp X so a long name in the right-hand
  // column can't push the bubble past the viewport edge.
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const showNameTip = () => {
    const el = nameRef.current;
    if (!el || !nameClipped) return;
    const r = el.getBoundingClientRect();
    setTip({ x: Math.max(8, Math.min(r.left, window.innerWidth - 300)), y: r.bottom + 6 });
  };
  const hideNameTip = () => setTip(null);

  const st = subscriptionStatus(sub, txs);
  const cycle = subCycle(sub);
  const due = needsPaymentNow(sub);
  const lapsed = isLapsed(sub);
  const dueTxId = st.pending[0]?.txId;
  // The bar only earns full ink in the home stretch — under ~10% of the period
  // left — so a black bar means "renews soon" rather than merely "time passes".
  const nearEnd = cycle.remainingDays < cycle.totalDays * 0.1;
  // Several cycles owed = the user paid in real life and never told the app.
  // Clearing that must be one action, not one click per month.
  const behind = st.pending.length;

  // Open the catch-up picker with every owed cycle pre-ticked — the common case
  // is "I paid them all", and unticking the odd one is cheaper than ticking all.
  const openPayModal = () => {
    setPaySel(new Set(st.pending.map((p) => p.txId)));
    setPayModalOpen(true);
  };
  const togglePay = (txId: string) =>
    setPaySel((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  const confirmPaySelected = () => {
    confirmSubscriptionCharges([...paySel]);
    setPayModalOpen(false);
  };

  const tone = !sub.active ? undefined : lapsed ? "danger" : due ? "warning" : undefined;

  const statusCap = !sub.active ? (
    <span className="wb-cap">Cancelled</span>
  ) : lapsed ? (
    <span className="wb-cap wb-cap--danger">
      <span className="wb-cap__dot" />
      Suspended
    </span>
  ) : due ? (
    <span className="wb-cap wb-cap--warning">
      <span className="wb-cap__dot" />
      Payment due
    </span>
  ) : (
    <span className="wb-cap wb-cap--success">
      <span className="wb-cap__dot" />
      Active
    </span>
  );

  const cardClass = !sub.active
    ? `wb-card cashy-sub--cancelled${suppressReveal ? " cashy-sub--force-quiet" : ""}`
    : "wb-card";

  return (
    <>
    <div
      className={cardClass}
      onMouseLeave={() => suppressReveal && setSuppressReveal(false)}
    >
      {/* Two columns, not three: the tile, then everything the tile is about.
          Name and status share a line because the status is a fact about the
          NAME; the money line reads as detail underneath both. */}
      <div className="wb-card__head cashy-subhead">
        {/* Neutral by default (house taste); only "brand" mode lets the
            service's hue onto the tile — otherwise it stays grey. */}
        <SubTile
          icon={sub.icon}
          colorHex={sub.colorHex}
          brand={subIconStyle === "brand"}
          size={34}
          iconSize={17}
        />
        <div className="cashy-subhead__main">
          <div className="cashy-subhead__row">
            <h4
              ref={nameRef}
              className="wb-card__title"
              onMouseEnter={showNameTip}
              onMouseLeave={hideNameTip}
            >
              {sub.name}
            </h4>
            {statusCap}
          </div>
          <p className="wb-card__sub">
            {formatMoney(sub.amount)} · {billingLabel(sub)}
          </p>
        </div>
      </div>

      <div className="wb-card__body">
        <div
          className="cashy-submeta"
          style={{ marginBottom: sub.active && cycle.started ? 14 : 0 }}
        >
          <div>
            <div className="cashy-submeta__label">Last paid</div>
            <div className="cashy-submeta__val">
              {sub.lastPaidAt ? fmtDateNum(sub.lastPaidAt) : "Never"}
            </div>
          </div>
          <div>
            <div className="cashy-submeta__label">
              {!sub.active ? "Payments" : due ? "Payment owed" : "Next payment"}
            </div>
            <div className="cashy-submeta__val">
              {!sub.active
                ? `${sub.paymentTxIds.length} on record`
                : fmtDateNum(nextPaymentDate(sub))}
            </div>
          </div>
        </div>

        {/* A cancelled service has no running period, so it gets no progress bar
            — an empty track would only invite the question "progress to what?". */}
        {sub.active && cycle.started && (
          <>
            {/* Days used out of the days actually paid for — the divisor is the
                real length of THIS billing period: a 28-day February is 28. */}
            <div className="wb-cluster wb-cluster--between" style={{ marginBottom: 7, gap: 8 }}>
              {/* The "Day X of Y" reference recedes (faint caption); "days left"
                  advances with heavier weight since it's the number the user
                  actually reads. */}
              <span style={{ fontSize: 12, color: "var(--cashy-ink-6)" }}>
                Day {cycle.elapsedDays} of {cycle.totalDays}
              </span>
              <span className="wb-cell-muted" style={{ fontSize: 12, fontWeight: 600 }}>
                {cycle.remainingDays === 0
                  ? "Renews today"
                  : `${cycle.remainingDays} ${cycle.remainingDays === 1 ? "day" : "days"} left`}
              </span>
            </div>
            <div className="wb-progress cashy-sub-progress">
              <div
                className={
                  tone === "danger"
                    ? "wb-progress__bar wb-progress__bar--danger"
                    : tone === "warning"
                      ? "wb-progress__bar wb-progress__bar--warning"
                      : nearEnd
                        ? "wb-progress__bar"
                        : "wb-progress__bar cashy-progress__bar--quiet"
                }
                style={{ width: `${Math.round(cycle.pct * 100)}%` }}
              />
            </div>
          </>
        )}

        {lapsed && (
          <p style={{ fontSize: 12, margin: "10px 0 0", color: "var(--cashy-ink-4)" }}>
            {behind > 1
              ? `${behind} billing periods are unrecorded. If you did pay them, catch the record up below.`
              : "A whole billing period went unpaid — the provider would have stopped the service."}
          </p>
        )}
      </div>

      <div className="wb-card__foot">
        {confirming ? (
          <>
            <span className="wb-cell-muted" style={{ fontSize: 13, marginRight: "auto" }}>
              Cancel {sub.name}?
            </span>
            {/* Weight follows consequence, not grammar: the destructive choice
                is a quiet ghost and the safe one carries the fill, so a
                reflexive click on the loud button costs nothing. */}
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm cashy-btn--quiet-danger"
              onClick={() => {
                setSubscriptionActive(sub.id, false);
                setConfirming(false);
                setSuppressReveal(true); // grey the card at once, don't wait for a re-hover
              }}
            >
              Yes, cancel
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--sm"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </button>
          </>
        ) : payConfirming ? (
          <>
            <span className="wb-cell-muted" style={{ fontSize: 13, marginRight: "auto" }}>
              Đã thanh toán kỳ {monthLabelShort(st.pending[0]?.month ?? "")}?
            </span>
            {/* The confirming action is a quiet green (paid = success, §1); the
                do-nothing carries the fill, so a reflexive click records nothing. */}
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm cashy-btn--quiet-success"
              onClick={() => {
                if (dueTxId) confirmSubscriptionCharge(dueTxId);
                setPayConfirming(false);
              }}
            >
              Đã trả
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--sm"
              onClick={() => setPayConfirming(false)}
            >
              Để sau
            </button>
          </>
        ) : sub.active ? (
          <>
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm"
              style={{ marginRight: "auto" }}
              onClick={() => setConfirming(true)}
            >
              Cancel subscription
            </button>
            {dueTxId && (
              <button
                type="button"
                className="wb-btn wb-btn--sm"
                style={{ gap: 4 }}
                // One owed cycle → a quick inline confirm; several → the picker,
                // since being "behind" doesn't mean every missed month was paid.
                onClick={() => (behind > 1 ? openPayModal() : setPayConfirming(true))}
              >
                <span className="wb-ico wb-ico--xs">check</span>
                {behind > 1 ? `Mark ${behind} paid` : "Mark paid"}
              </button>
            )}
          </>
        ) : (
          <>
            <span className="wb-cell-muted" style={{ fontSize: 13, marginRight: "auto" }}>
              No longer billing
            </span>
            {/* Resuming is cheap and reversible, so it happens on one click and
                offers the way back in a toast — a confirm dialog here would tax
                the harmless direction while cancelling stays the guarded one. */}
            <button
              type="button"
              className="wb-btn wb-btn--secondary wb-btn--sm"
              onClick={() => {
                setSubscriptionActive(sub.id, true);
                toast.undo(`${sub.name} resumed`, () => setSubscriptionActive(sub.id, false));
              }}
            >
              Resume
            </button>
          </>
        )}
      </div>
    </div>

    {/* Catch-up picker — tick the cycles actually paid, then record them in one
        step. Opened only when several cycles are owed. */}
    <Modal
      open={payModalOpen}
      onClose={() => setPayModalOpen(false)}
      title={sub.name}
      maxWidth={420}
      footer={
        <>
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--sm"
            style={{ marginRight: "auto" }}
            onClick={() => setPayModalOpen(false)}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="wb-btn wb-btn--sm"
            style={{ gap: 4 }}
            disabled={paySel.size === 0}
            onClick={confirmPaySelected}
          >
            <span className="wb-ico wb-ico--xs">check</span>
            Đã trả {paySel.size} kỳ · {formatMoney(sub.amount * paySel.size)}
          </button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--wb-fg-muted)" }}>
        Chọn những kỳ bạn đã thanh toán:
      </p>
      <div className="wb-stack" style={{ "--wb-stack-gap": "6px" } as CSSProperties}>
        {st.pending.map((p) => (
          <label key={p.txId} className="wb-check cashy-pay-row">
            <input
              type="checkbox"
              checked={paySel.has(p.txId)}
              onChange={() => togglePay(p.txId)}
            />
            <span className="cashy-pay-row__month">{monthLabelShort(p.month)}</span>
            <span className="cashy-pay-row__date">
              {fmtDateShort(billingDate(p.month, sub.dayOfMonth))}
            </span>
            <span className="wb-num cashy-pay-row__amt">{formatMoney(sub.amount)}</span>
          </label>
        ))}
      </div>
    </Modal>

    {/* Full name on hover — only mounted for names the card actually clipped. */}
    {tip && (
      <div className="cashy-nametip" style={{ left: tip.x, top: tip.y }} role="tooltip">
        {sub.name}
      </div>
    )}
    </>
  );
}
