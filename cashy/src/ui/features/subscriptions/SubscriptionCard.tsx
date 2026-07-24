import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Subscription, Transaction } from "@/domain/types";
import {
  billingLabel,
  inTrial,
  isLapsed,
  needsPaymentNow,
  nextPaymentDate,
  subCycle,
  subscriptionStatus,
  trialCycle,
  type SubCycle,
} from "@/domain";
import type { SubIconStyle } from "@/domain/types";
import { statusOf } from "@/domain/txStatus";
import { fmtDateNum } from "@/domain/date";
import { formatMoney } from "@/domain/money";
import { SubTile } from "@/ui/features/subscriptions/SubTile";
import { Icon } from "@/ui/kit/icons";
import { Progress } from "@/ui/kit/Progress";
import { Button } from "@/ui/kit/Button";
import { Card } from "@/ui/kit/Card";
import { Capsule } from "@/ui/kit/Capsule";

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
/**
 * The "Day X of Y" caption + bar, shared by the active billing period and the
 * free-trial window — both are a `SubCycle`, so one block draws either. The bar
 * earns full ink only in the home stretch (< ~10% of the span left); a tone
 * (danger/warning) overrides that when the service is behind. `rightNote` writes
 * the trailing figure ("N days left" vs "N days of trial left") for the caller.
 */
function CycleProgress({
  cyc,
  tone,
  rightNote,
}: {
  cyc: SubCycle;
  tone?: "danger" | "warning";
  rightNote: (c: SubCycle) => string;
}) {
  const nearEnd = cyc.remainingDays < cyc.totalDays * 0.1;
  let barTone: "neutral" | "danger" | "warning" = "neutral";
  if (tone === "danger") barTone = "danger";
  else if (tone === "warning") barTone = "warning";
  const barQuiet = !tone && !nearEnd;
  return (
    <>
      <div className="wb-cluster wb-cluster--between" style={{ marginBottom: 7, gap: 8 }}>
        {/* The "Day X of Y" reference recedes (faint caption); the trailing note
            advances with heavier weight since it's the number the user reads. */}
        <span style={{ fontSize: 12, color: "var(--cashy-ink-6)" }}>
          Day {cyc.elapsedDays} of {cyc.totalDays}
        </span>
        <span className="wb-cell-muted" style={{ fontSize: 12, fontWeight: 600 }}>
          {rightNote(cyc)}
        </span>
      </div>
      <Progress
        className="cashy-sub-progress"
        value={cyc.pct}
        max={1}
        tone={barTone}
        barClassName={barQuiet ? "cashy-progress__bar--quiet" : undefined}
      />
    </>
  );
}

export function SubscriptionCard({
  sub,
  txs,
  iconStyle = "neutral",
  onOpenCatchUp,
  onOpenHistory,
  onOpenCancel,
  onOpenEditor,
  onSetActive,
}: {
  sub: Subscription;
  txs: Transaction[];
  /** how the icon tile is coloured; a display preference the screen passes down */
  iconStyle?: SubIconStyle;
  /** edit the plan itself (name, amount, cadence…) — opens the editor modal */
  onOpenEditor: () => void;
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
  // Inside the free window: nothing is owed yet and the first charge is still
  // ahead, so the card says "Free trial" rather than the plain "Active".
  const trial = sub.active && inTrial(sub);
  // The free-trial window as its own cycle, so the card can chart the run-up to
  // the first charge with the same bar the billing period uses.
  const tc = trial ? trialCycle(sub) : null;
  // Which progress block, if any, to draw: the billing period for a running plan,
  // or the trial run-up for one still inside its free window (never both).
  const showActiveBar = sub.active && cycle.started && !trial;
  const showTrialBar = trial && !!tc?.started;
  // Several cycles owed = the user paid in real life and never told the app.
  const behind = st.pending.length;
  const settledCount = sub.paymentTxIds.length;

  // Tone ladder (§1): suspended = danger, a bill due = warning, else no tone.
  let tone: "danger" | "warning" | undefined;
  if (!sub.active) {
    tone = undefined;
  } else if (lapsed) {
    tone = "danger";
  } else if (due) {
    tone = "warning";
  } else {
    tone = undefined;
  }

  // The status capsule, one branch per state — spelled out as an if-ladder rather
  // than a stack of ternaries so each state's markup reads on its own.
  let statusCap: ReactNode;
  if (!sub.active) {
    statusCap = <Capsule>Cancelled</Capsule>;
  } else if (lapsed) {
    statusCap = (
      <Capsule tone="danger" dot>
        Suspended
      </Capsule>
    );
  } else if (due) {
    statusCap = (
      <Capsule tone="warning" dot>
        Payment due
      </Capsule>
    );
  } else if (trial) {
    statusCap = (
      <Capsule tone="info" dot>
        Free trial
      </Capsule>
    );
  } else {
    statusCap = (
      <Capsule tone="success" dot>
        Active
      </Capsule>
    );
  }

  const cardClass = !sub.active
    ? `cashy-sub--cancelled${suppressReveal ? " cashy-sub--force-quiet" : ""}`
    : undefined;

  // Nothing settled yet = an empty history; offering it would only lead to an
  // empty dialog. Skipped cycles count too, so this is not `paymentTxIds`. Read
  // status via `statusOf` (I6): a legacy charge with no `status` means "recorded",
  // and comparing the raw field would wrongly hide its history.
  const hasHistory = txs.some(
    (t) => t.subscriptionId === sub.id && (statusOf(t) === "recorded" || statusOf(t) === "skipped"),
  );

  // The standing line next to the history button. A service that owes money says
  // so through the action button instead, so it gets no note — two statements of
  // the same fact would only compete for the same row.
  let footNote: string | null;
  if (!sub.active) {
    footNote = "No longer billed";
  } else if (trial) {
    footNote = "In free trial";
  } else if (due) {
    footNote = null;
  } else {
    footNote = "Paid up";
  }

  // The right-hand meta cell: what to call the next money date, and the date/value
  // itself. An if-ladder rather than a 4-way ternary so each state is legible.
  let paymentLabel: string;
  if (!sub.active) {
    paymentLabel = "Payments";
  } else if (due) {
    paymentLabel = "Payment owed";
  } else if (trial) {
    paymentLabel = "First charge";
  } else {
    paymentLabel = "Next payment";
  }

  let paymentValue: string;
  if (!sub.active) {
    paymentValue = `${settledCount} on record`;
  } else {
    paymentValue = fmtDateNum(nextPaymentDate(sub, txs));
  }


  return (
    <>
      <Card className={cardClass} onMouseLeave={() => suppressReveal && setSuppressReveal(false)}>
        {/* Two columns, not three: the tile, then everything the tile is about.
            Name and status share a line because the status is a fact about the
            NAME; the money line reads as detail underneath both. */}
        <div className="wb-card__head cashy-subhead">
          {/* The tile IS the edit affordance now (the foot pencil is gone): tap it
              — or the name — to open the editor. Kept a real <button> so it stays
              keyboard-reachable and screen-reader-labelled. Neutral by default
              (house taste); only "brand" mode lets the service's hue onto the
              tile — otherwise it stays grey. */}
          <button
            type="button"
            className="cashy-subedit-tile"
            aria-label={`Edit ${sub.name}`}
            title="Edit subscription"
            onClick={onOpenEditor}
          >
            <SubTile
              icon={sub.icon}
              colorHex={sub.colorHex}
              brand={iconStyle === "brand"}
              size={34}
              iconSize={17}
            />
          </button>
          <div className="cashy-subhead__main">
            <div className="cashy-subhead__row">
              {/* The name is the second edit target (a big, obvious one for touch);
                  it stays a heading for structure, so the tile's <button> carries
                  the keyboard/AT affordance and this is a pointer convenience. */}
              <h4
                ref={nameRef}
                className="wb-card__title cashy-subedit-name"
                onMouseEnter={showNameTip}
                onMouseLeave={hideNameTip}
                onClick={onOpenEditor}
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
                <span className="wb-cell-muted"> · 1/{sub.members} shared</span>
              )}
            </p>
            {/* The wallet it's paid from is a different KIND of fact from the price
                and cadence, so it drops to its own line with a wallet glyph rather
                than trailing the money line as one more "· …" clause. */}
            {sub.account && (
              <p className="cashy-subhead__wallet">
                <Icon name="wallet" size={12} />
                {sub.account}
              </p>
            )}
          </div>
        </div>

        <div className="wb-card__body">
          <div
            className="cashy-submeta"
            style={{ marginBottom: showActiveBar || showTrialBar ? 14 : 0 }}
          >
            <div>
              <div className="cashy-submeta__label">Last paid</div>
              <div className="cashy-submeta__val">
                {sub.lastPaidAt ? fmtDateNum(sub.lastPaidAt) : "Never"}
              </div>
            </div>
            <div>
              <div className="cashy-submeta__label">{paymentLabel}</div>
              <div className="cashy-submeta__val">{paymentValue}</div>
            </div>
          </div>

          {/* A cancelled service has no running period, so it gets no progress
              bar — an empty track would only invite "progress to what?". The
              billing period (days used out of the days paid for — the divisor is
              the REAL length of this period, so a 28-day February is 28). */}
          {showActiveBar && (
            <CycleProgress
              cyc={cycle}
              tone={tone}
              rightNote={(c) =>
                c.remainingDays === 0
                  ? "Renews today"
                  : `${c.remainingDays} ${c.remainingDays === 1 ? "day" : "days"} left`
              }
            />
          )}

          {/* The free trial gets the SAME bar, charting the run-up to the first
              charge (`[startedAt → trialEndDate]`) — so a trialing card shows how
              close billing is instead of a blank body. It darkens near the end
              exactly like the active card. */}
          {showTrialBar && tc && (
            <CycleProgress
              cyc={tc}
              rightNote={(c) =>
                c.remainingDays === 0
                  ? "Charges today"
                  : `${c.remainingDays} ${c.remainingDays === 1 ? "day" : "days"} of trial left`
              }
            />
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
          {/* No history to show = no button. A trialing (or brand-new) service has
              nothing paid or skipped yet, so it earns no history control — a
              permanently-disabled icon would only be dead weight on the row. The
              editor is now opened from the tile/name in the header, not a foot
              pencil. */}
          {hasHistory && (
            <Button
              variant="ghost"
              iconOnly
              size="sm"
              round
              type="button"
              aria-label={`Payment history for ${sub.name}`}
              title="Payment history"
              onClick={onOpenHistory}
            >
              <span className="wb-ico wb-ico--sm">history</span>
            </Button>
          )}
          {footNote && <span className="wb-cell-muted cashy-cardfoot__note">{footNote}</span>}

          <div className="cashy-cardfoot__end">
            {sub.active && (
              // Spelled out rather than an icon: a "block" glyph reads as a road
              // sign and says nothing about WHAT is being blocked. Quiet grey at
              // rest so the destructive option never shouts, red only on hover.
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="cashy-btn--danger-hover"
                onClick={onOpenCancel}
              >
                Cancel
              </Button>
            )}
            {sub.active
              ? due && (
                  <Button
                    size="sm"
                    type="button"
                    style={{ gap: 4 }}
                    onClick={onOpenCatchUp}
                  >
                    <span className="wb-ico wb-ico--xs">check</span>
                    {behind > 1 ? `Settle ${behind} cycles` : "Mark as paid"}
                  </Button>
                )
              : // Resuming is cheap and reversible, so it happens on one click and
                // offers the way back in a toast — a confirm dialog here would tax
                // the harmless direction while cancelling stays the guarded one.
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onSetActive(true)}
                >
                  Resume
                </Button>}
          </div>
        </div>
      </Card>

      {/* Full name on hover — only mounted for names the card actually clipped. */}
      {tip && (
        <div className="cashy-nametip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          {sub.name}
        </div>
      )}
    </>
  );
}
