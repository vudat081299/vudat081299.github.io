import { useState, type CSSProperties } from "react";
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
} from "@/lib/store";
import { toast } from "@/components/wb/Toast";
import { fmtDateNum } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { Icon } from "@/lib/icons";

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

  const st = subscriptionStatus(sub, txs);
  const cycle = subCycle(sub);
  const due = needsPaymentNow(sub);
  const lapsed = isLapsed(sub);
  const dueTxId = st.pending[0]?.txId;
  // Several cycles owed = the user paid in real life and never told the app.
  // Clearing that must be one action, not one click per month.
  const behind = st.pending.length;

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

  return (
    <div className="wb-card">
      {/* Two columns, not three: the tile, then everything the tile is about.
          Name and status share a line because the status is a fact about the
          NAME; the money line reads as detail underneath both. */}
      <div className="wb-card__head cashy-subhead">
        <span
          className="cashy-subtile"
          style={{ "--cashy-sub-c": sub.colorHex, width: 34, height: 34 } as CSSProperties}
        >
          <Icon name={sub.icon} size={17} />
        </span>
        <div className="cashy-subhead__main">
          <div className="cashy-subhead__row">
            <h4 className="wb-card__title">{sub.name}</h4>
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
              <span className="wb-cell-muted" style={{ fontSize: 12 }}>
                Day {cycle.elapsedDays} of {cycle.totalDays}
              </span>
              <span className="wb-cell-muted" style={{ fontSize: 12 }}>
                {cycle.remainingDays === 0
                  ? "Renews today"
                  : `${cycle.remainingDays} ${cycle.remainingDays === 1 ? "day" : "days"} left`}
              </span>
            </div>
            <div className="wb-progress">
              <div
                className={
                  tone === "danger"
                    ? "wb-progress__bar wb-progress__bar--danger"
                    : tone === "warning"
                      ? "wb-progress__bar wb-progress__bar--warning"
                      : "wb-progress__bar"
                }
                style={{ width: `${Math.round(cycle.pct * 100)}%` }}
              />
            </div>
          </>
        )}

        {lapsed && (
          <p className="wb-cell-muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
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
                onClick={() =>
                  behind > 1
                    ? confirmSubscriptionCharges(st.pending.map((p) => p.txId))
                    : confirmSubscriptionCharge(dueTxId)
                }
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
  );
}
