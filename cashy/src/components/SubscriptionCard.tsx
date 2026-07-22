import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Subscription, Transaction } from "@/types";
import {
  billingLabel,
  isLapsed,
  needsPaymentNow,
  subCycle,
  subscriptionStatus,
} from "@/lib/domain";
import {
  confirmSubscriptionCharge,
  resolveSubscriptionCharges,
  revertSubscriptionCharge,
  revertSubscriptionCharges,
  setSubscriptionActive,
  useCashy,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/wb/Modal";
import { billingDate, fmtDateNum, fmtDateShort, monthLabelShort } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { SubTile } from "@/components/SubTile";
import { SubscriptionHistory } from "@/components/SubscriptionHistory";

/** What to do with one owed cycle in the catch-up picker. `leave` keeps it
 *  pending — still owed, still nagging — for a cycle you mean to pay later. */
type CatchUpChoice = "pay" | "skip" | "leave";

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
  // Catching up several cycles opens a picker — each owed cycle gets an explicit
  // Trả / Bỏ qua / Để sau choice, since "behind" does not mean you paid every
  // missed month, nor that you want to write off the ones you didn't.
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [choices, setChoices] = useState<Record<string, CatchUpChoice>>({});
  // The persistent "undo a payment" surface — the settled-cycles list.
  const [historyOpen, setHistoryOpen] = useState(false);
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
  const due = needsPaymentNow(sub, txs);
  const lapsed = isLapsed(sub, txs);
  const dueTxId = st.pending[0]?.txId;
  const dueMonth = st.pending[0]?.month;
  // The date the meta line shows: the earliest owed cycle's date when money is
  // owed (a date in the past — the point of the reminder), else the next upcoming
  // billing date. Both come from the ledger so they never contradict the status.
  const owedDate = dueMonth ? billingDate(dueMonth, sub.dayOfMonth) : st.nextDate;
  const hasHistory = sub.paymentTxIds.length > 0 || txs.some((t) => t.subscriptionId === sub.id && t.status === "skipped");
  // The bar only earns full ink in the home stretch — under ~10% of the period
  // left — so a black bar means "renews soon" rather than merely "time passes".
  const nearEnd = cycle.remainingDays < cycle.totalDays * 0.1;
  // Several cycles owed = the user paid in real life and never told the app.
  // Clearing that must be one action, not one click per month.
  const behind = st.pending.length;

  // Open the catch-up picker with every owed cycle pre-set to "Trả" — the common
  // case is "I paid them all", and flipping the odd one is cheaper than ticking
  // all. The other two choices (Bỏ qua / Để sau) are one tap away per cycle.
  const openPayModal = () => {
    const init: Record<string, CatchUpChoice> = {};
    for (const p of st.pending) init[p.txId] = "pay";
    setChoices(init);
    setPayModalOpen(true);
  };
  const setChoice = (txId: string, choice: CatchUpChoice) =>
    setChoices((prev) => ({ ...prev, [txId]: choice }));

  const payIds = st.pending.filter((p) => choices[p.txId] === "pay").map((p) => p.txId);
  const skipIds = st.pending.filter((p) => choices[p.txId] === "skip").map((p) => p.txId);
  const leaveCount = st.pending.length - payIds.length - skipIds.length;

  const confirmCatchUp = () => {
    resolveSubscriptionCharges({ pay: payIds, skip: skipIds });
    setPayModalOpen(false);
    const touched = [...payIds, ...skipIds];
    if (!touched.length) return;
    const parts = [
      payIds.length ? `${payIds.length} đã trả` : "",
      skipIds.length ? `${skipIds.length} bỏ qua` : "",
    ].filter(Boolean);
    toast.undo(`${sub.name}: ${parts.join(", ")}`, () => revertSubscriptionCharges(touched));
  };

  // Single owed cycle: the inline confirm books it and offers an immediate undo.
  const confirmSingle = () => {
    if (!dueTxId) return;
    confirmSubscriptionCharge(dueTxId);
    toast.undo(`Đã trả kỳ ${monthLabelShort(dueMonth ?? "")}`, () =>
      revertSubscriptionCharge(dueTxId),
    );
    setPayConfirming(false);
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
            {sub.members ? ` · phần bạn trong gói ${sub.members} người` : ""}
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
                : owedDate
                  ? fmtDateNum(owedDate)
                  : "—"}
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
              Đã thanh toán kỳ {monthLabelShort(dueMonth ?? "")}?
            </span>
            {/* The confirming action is a quiet green (paid = success, §1); the
                do-nothing carries the fill, so a reflexive click records nothing. */}
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm cashy-btn--quiet-success"
              onClick={confirmSingle}
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
            {hasHistory && (
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm"
                onClick={() => setHistoryOpen(true)}
              >
                Lịch sử
              </button>
            )}
            {dueTxId && (
              <button
                type="button"
                className="wb-btn wb-btn--sm"
                style={{ gap: 4 }}
                // One owed cycle → a quick inline confirm that names the month;
                // several → the picker, since being "behind" doesn't mean every
                // missed month was paid.
                onClick={() => (behind > 1 ? openPayModal() : setPayConfirming(true))}
              >
                <span className="wb-ico wb-ico--xs">check</span>
                {behind > 1 ? `Trả ${behind} kỳ…` : `Trả kỳ ${monthLabelShort(dueMonth ?? "")}`}
              </button>
            )}
          </>
        ) : (
          <>
            <span className="wb-cell-muted" style={{ fontSize: 13, marginRight: "auto" }}>
              No longer billing
            </span>
            {hasHistory && (
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm"
                onClick={() => setHistoryOpen(true)}
              >
                Lịch sử
              </button>
            )}
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

    {/* Catch-up picker — for each owed cycle, say what really happened: Trả (paid,
        books it), Bỏ qua (skip, greys it, no more nag), or Để sau (leave it owed).
        The footer spells out exactly what the confirm will do. Opened only when
        several cycles are owed. */}
    <Modal
      open={payModalOpen}
      onClose={() => setPayModalOpen(false)}
      title={`${sub.name} · ${behind} kỳ chưa xử lý`}
      maxWidth={460}
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
            disabled={payIds.length === 0 && skipIds.length === 0}
            onClick={confirmCatchUp}
          >
            <span className="wb-ico wb-ico--xs">check</span>
            {payIds.length > 0
              ? `Trả ${payIds.length} kỳ · ${formatMoney(sub.amount * payIds.length)}`
              : "Xác nhận"}
            {skipIds.length > 0 ? ` · bỏ qua ${skipIds.length}` : ""}
          </button>
        </>
      }
    >
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--wb-fg-muted)" }}>
        Mỗi kỳ chọn: <strong>Trả</strong> nếu đã thanh toán, <strong>Bỏ qua</strong> nếu không trả
        kỳ đó, hoặc <strong>Để sau</strong> để vẫn nợ và nhắc lại sau.
      </p>
      <div className="wb-stack" style={{ "--wb-stack-gap": "8px" } as CSSProperties}>
        {st.pending.map((p) => {
          const choice = choices[p.txId] ?? "leave";
          return (
            <div key={p.txId} className="cashy-catchup-row">
              <div className="cashy-catchup-row__info">
                <span className="cashy-pay-row__month">{monthLabelShort(p.month)}</span>
                <span className="cashy-pay-row__date">
                  {fmtDateShort(billingDate(p.month, sub.dayOfMonth))} · {formatMoney(sub.amount)}
                </span>
              </div>
              <div className="cashy-seg" role="group" aria-label={`Kỳ ${monthLabelShort(p.month)}`}>
                {(
                  [
                    ["pay", "Trả"],
                    ["skip", "Bỏ qua"],
                    ["leave", "Để sau"],
                  ] as [CatchUpChoice, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={choice === key ? "cashy-seg__btn is-active" : "cashy-seg__btn"}
                    onClick={() => setChoice(p.txId, key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {leaveCount > 0 && (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--wb-fg-muted)" }}>
          {leaveCount} kỳ để sau — vẫn còn nợ và sẽ nhắc lại.
        </p>
      )}
    </Modal>

    {/* Payment history — the persistent place to undo a confirmed (or skipped)
        cycle, long after the toast is gone. */}
    <SubscriptionHistory
      sub={sub}
      txs={txs}
      open={historyOpen}
      onClose={() => setHistoryOpen(false)}
    />

    {/* Full name on hover — only mounted for names the card actually clipped. */}
    {tip && (
      <div className="cashy-nametip" style={{ left: tip.x, top: tip.y }} role="tooltip">
        {sub.name}
      </div>
    )}
    </>
  );
}
