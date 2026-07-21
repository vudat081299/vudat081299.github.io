import { useState, type CSSProperties } from "react";
import type { Subscription, Transaction } from "@/types";
import {
  isLapsed,
  needsPaymentThisMonth,
  nextPaymentDate,
  subCycle,
  subscriptionStatus,
} from "@/lib/domain";
import { confirmSubscriptionCharge, setSubscriptionActive } from "@/lib/store";
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
  const due = needsPaymentThisMonth(sub);
  const lapsed = isLapsed(sub);
  const dueTxId = st.pending[0]?.txId;

  const tone = !sub.active ? undefined : lapsed ? "danger" : due ? "warning" : undefined;

  return (
    <div className="wb-card">
      <div className="wb-card__head">
        <div className="cashy-subcell">
          <span
            className="cashy-subtile"
            style={{ "--cashy-sub-c": sub.colorHex, width: 34, height: 34 } as CSSProperties}
          >
            <Icon name={sub.icon} size={17} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h4 className="wb-card__title">{sub.name}</h4>
            <p className="wb-card__sub">
              {formatMoney(sub.amount)} · day {sub.dayOfMonth} each month
            </p>
          </div>
        </div>
        <div className="wb-card__head-actions">
          {!sub.active ? (
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
          )}
        </div>
      </div>

      <div className="wb-card__body">
        <div className="cashy-submeta" style={{ marginBottom: sub.active ? 14 : 0 }}>
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
        {sub.active && (
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
            A whole billing period went unpaid — the provider would have stopped the service.
          </p>
        )}
      </div>

      <div className="wb-card__foot">
        {confirming ? (
          <>
            <span className="wb-cell-muted" style={{ fontSize: 13, marginRight: "auto" }}>
              Cancel {sub.name}?
            </span>
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--danger wb-btn--sm"
              onClick={() => {
                setSubscriptionActive(sub.id, false);
                setConfirming(false);
              }}
            >
              Yes, cancel
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
                onClick={() => confirmSubscriptionCharge(dueTxId)}
              >
                <span className="wb-ico wb-ico--xs">check</span>
                Mark paid
              </button>
            )}
          </>
        ) : (
          <>
            <span className="wb-cell-muted" style={{ fontSize: 13, marginRight: "auto" }}>
              No longer billing
            </span>
            <button
              type="button"
              className="wb-btn wb-btn--secondary wb-btn--sm"
              onClick={() => setSubscriptionActive(sub.id, true)}
            >
              Resume
            </button>
          </>
        )}
      </div>
    </div>
  );
}
