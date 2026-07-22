import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Subscription, Transaction } from "@/domain/types";
import {
  billingLabel,
  isLapsed,
  needsPaymentNow,
  nextPaymentDate,
  subCycle,
  subscriptionStatus,
} from "@/domain";
import type { SubIconStyle } from "@/domain/types";
import { fmtDateNum } from "@/domain/date";
import { formatMoney } from "@/domain/money";
import { SubTile } from "@/ui/features/subscriptions/SubTile";

/**
 * One service, one card. It answers the four questions a subscription actually
 * raises — when did I last pay, when does it want money again, how much of the
 * period I paid for is already gone, and is the service still running.
 *
 * Colour follows the ladder (§1): a service the provider would have cut off is
 * danger, a bill on the doormat is warning, everything settled stays neutral.
 * The progress bar is neutral too — time passing is not a status.
 *
 * The foot deliberately holds only TWO controls: an overflow menu and at most
 * one action. It used to swap itself for inline confirmations — "Thanh toán T6?"
 * beside three buttons, "Cancel this subscription?" beside two — and in a
 * three-column grid that question was the first thing to be clipped, so the card
 * ended up asking half a question. Every per-cycle decision now happens in the
 * catch-up dialog, which has the room to state the whole thing, and cancelling
 * goes through its own dialog (it has to ask WHEN the service stopped). What is
 * left cannot overflow.
 *
 * Presentational: every decision it offers leaves as a callback, so the card can
 * be rendered against any subscription — including in the component gallery,
 * with no store behind it.
 */
export function SubscriptionCard({
  sub,
  txs,
  iconStyle = "neutral",
  onOpenCatchUp,
  onOpenHistory,
  onOpenCancel,
  onSetActive,
}: {
  sub: Subscription;
  txs: Transaction[];
  /** how the icon tile is coloured; a display preference the screen passes down */
  iconStyle?: SubIconStyle;
  /** settle the owed cycles — opens the catch-up dialog */
  onOpenCatchUp: () => void;
  /** review and reverse cycles already paid or skipped */
  onOpenHistory: () => void;
  /** cancel the service — opens the dialog that asks WHEN it stopped */
  onOpenCancel: () => void;
  /** resume (true); cancelling goes through `onOpenCancel` so it can be dated */
  onSetActive: (active: boolean) => void;
}) {
  // After cancelling, the pointer is still over the card, so CSS :hover would
  // keep it bright until you move away. This forces the greyed-out look the
  // moment the service switches off, and lifts only when the pointer leaves.
  const [suppressReveal, setSuppressReveal] = useState(false);
  const wasActive = useRef(sub.active);
  useEffect(() => {
    if (wasActive.current && !sub.active) setSuppressReveal(true);
    wasActive.current = sub.active;
  }, [sub.active]);

  // A long name is clipped with an ellipsis by CSS; only then is a tooltip
  // worth having. Measure the rendered heading and expose the full name via
  // a bubble ONLY when it actually overflows — names that fit get no tooltip.
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
  const due = needsPaymentNow(sub, txs);
  const lapsed = isLapsed(sub, txs);
  // The bar only earns full ink in the home stretch — under ~10% of the period
  // left — so a black bar means "renews soon" rather than merely "time passes".
  const nearEnd = cycle.remainingDays < cycle.totalDays * 0.1;
  // Several cycles owed = the user paid in real life and never told the app.
  const behind = st.pending.length;
  const settledCount = sub.paymentTxIds.length;

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

  // Nothing settled yet = an empty history; offering it would only lead to an
  // empty dialog. Skipped cycles count too, so this is not `paymentTxIds`.
  const hasHistory = txs.some(
    (t) => t.subscriptionId === sub.id && (t.status === "recorded" || t.status === "skipped"),
  );

  // The standing line next to the history button. A service that owes money says
  // so through the action button instead, so it gets no note — two statements of
  // the same fact would only compete for the same row.
  const footNote = !sub.active ? "Không còn thu phí" : due ? null : "Đã thanh toán đủ";


  return (
    <>
      <div className={cardClass} onMouseLeave={() => suppressReveal && setSuppressReveal(false)}>
        {/* Two columns, not three: the tile, then everything the tile is about.
            Name and status share a line because the status is a fact about the
            NAME; the money line reads as detail underneath both. */}
        <div className="wb-card__head cashy-subhead">
          {/* Neutral by default (house taste); only "brand" mode lets the
              service's hue onto the tile — otherwise it stays grey. */}
          <SubTile
            icon={sub.icon}
            colorHex={sub.colorHex}
            brand={iconStyle === "brand"}
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
              {/* On a shared plan the amount above is only YOUR share, which on
                  its own reads as the whole price — say what it is a share of. */}
              {(sub.members ?? 0) > 1 && (
                <span className="wb-cell-muted"> · 1/{sub.members} gói chung</span>
              )}
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
                  ? `${settledCount} on record`
                  : fmtDateNum(nextPaymentDate(sub, txs))}
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

        {/* Two groups, and the reading order is the reason for the split. LEFT is
            the payment record — the standing status line and the button that
            opens the history behind it, which are about the same thing and so sit
            together. RIGHT is what you can DO about the service. Cancelling used
            to sit between the two and cut the status away from its own button.
            No dropdown menu here: the card sets `overflow: hidden` (rounded
            corners + the progress track) and would clip an open one. */}
        <div className="wb-card__foot">
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm wb-btn--round"
            aria-label={`Lịch sử thanh toán ${sub.name}`}
            title="Lịch sử thanh toán"
            disabled={!hasHistory}
            onClick={onOpenHistory}
          >
            <span className="wb-ico wb-ico--sm">history</span>
          </button>
          {footNote && <span className="wb-cell-muted cashy-cardfoot__note">{footNote}</span>}

          <div className="cashy-cardfoot__end">
            {sub.active && (
              // Spelled out rather than an icon: a "block" glyph reads as a road
              // sign and says nothing about WHAT is being blocked. Quiet grey at
              // rest so the destructive option never shouts, red only on hover.
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm cashy-btn--danger-hover"
                onClick={onOpenCancel}
              >
                Huỷ đăng ký
              </button>
            )}
            {sub.active
              ? due && (
                  <button
                    type="button"
                    className="wb-btn wb-btn--sm"
                    style={{ gap: 4 }}
                    onClick={onOpenCatchUp}
                  >
                    <span className="wb-ico wb-ico--xs">check</span>
                    {behind > 1 ? `Xử lý ${behind} kỳ` : "Xác nhận"}
                  </button>
                )
              : // Resuming is cheap and reversible, so it happens on one click and
                // offers the way back in a toast — a confirm dialog here would tax
                // the harmless direction while cancelling stays the guarded one.
                <button
                  type="button"
                  className="wb-btn wb-btn--secondary wb-btn--sm"
                  onClick={() => onSetActive(true)}
                >
                  Tiếp tục
                </button>}
          </div>
        </div>
      </div>

      {/* Full name on hover — only mounted for names the card actually clipped. */}
      {tip && (
        <div className="cashy-nametip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          {sub.name}
        </div>
      )}
    </>
  );
}
