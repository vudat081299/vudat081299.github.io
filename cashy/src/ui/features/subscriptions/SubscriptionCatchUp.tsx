import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Subscription } from "@/domain/types";
import { planCatchUp, type CycleChoice } from "@/domain";
import { billingDate, fmtDateParts, monthLabelShort } from "@/domain/date";
import { formatDigits, formatMoney, parseMoney } from "@/domain/money";
import { Modal } from "@/ui/kit/Modal";
import { Button } from "@/ui/kit/Button";
import { Input } from "@/ui/kit/Input";
import { Switch } from "@/ui/kit/Switch";
import { Popover } from "@/ui/kit/Popover";
import { Calendar } from "@/ui/kit/Calendar";
import { Tooltip } from "@/ui/kit/Tooltip";

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
  defaultAmount,
}: {
  sub: Subscription;
  /** the owed cycles, oldest first */
  pending: { month: string; txId: string }[];
  open: boolean;
  onClose: () => void;
  /** settle the charges; `cancelling` also switches the service off. `amounts`
   *  carries the price the user actually paid per cycle (variable pricing);
   *  `dates` carries any per-cycle billing-date override (only when changed). */
  onResolve: (plan: {
    pay: string[];
    skip: string[];
    cancelling: boolean;
    amounts: Record<string, number>;
    dates: Record<string, string>;
  }) => void;
  /** the price to prefill each cycle with — the most recent charge's amount, so
   *  a plan whose price drifts month to month opens on last month's figure. */
  defaultAmount: number;
}) {
  // Whether the service was running that cycle — a free per-row answer.
  const [used, setUsed] = useState<Record<string, boolean>>({});
  // Payment, on the other hand, is NOT N independent answers. Debts settle
  // oldest-first, so "what have I paid" is a single waterline: everything up to
  // some cycle is settled and everything after it is still owed. Storing the
  // index of the last paid cycle (-1 = nothing paid) makes the out-of-order
  // state unrepresentable rather than merely rejected.
  const [paidThrough, setPaidThrough] = useState(-1);
  // The price paid per cycle, as grouped digit strings. Prefilled with the most
  // recent charge's amount so a variable-price plan opens on last month's figure;
  // the user edits only the cycles whose price actually changed.
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  // Per-cycle billing date. Defaults to the subscription's billing day for that
  // month; the user can override it (rare) via the date-picker on the date label.
  const [dates, setDates] = useState<Record<string, string>>({});

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
    setAmounts(Object.fromEntries(pending.map((p) => [p.txId, formatDigits(defaultAmount)])));
    setDates(Object.fromEntries(pending.map((p) => [p.txId, billingDate(p.month, sub.dayOfMonth)])));
    // defaultAmount is derived from the same ledger as `pending`; the id list is
    // the real signal that the owed set changed, so it stays the dependency.
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

  // The price for one cycle: what was typed, or the prefilled default if blank.
  const amountOf = (txId: string) => {
    const parsed = parseMoney(amounts[txId] ?? "");
    if (parsed > 0) return parsed;
    return defaultAmount;
  };
  const setAmount = (txId: string, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const next = digits ? formatDigits(parseInt(digits, 10)) : "";
    setAmounts((a) => ({ ...a, [txId]: next }));
  };

  // The billing date for one cycle: the override if the user picked one, else the
  // subscription's billing day for that month.
  const dateOf = (txId: string, month: string) => dates[txId] ?? billingDate(month, sub.dayOfMonth);
  const setDate = (txId: string, v: string) => setDates((d) => ({ ...d, [txId]: v }));

  const plan = planCatchUp(rows);
  const payTotal = plan.pay.reduce((sum, txId) => sum + amountOf(txId), 0);

  // A cycle switched off is not a debt, so it drops out of the paid set without
  // disturbing the waterline around it — `planCatchUp` treats skipped cycles as
  // transparent to the ordering for exactly the same reason.
  const toggleUsed = (txId: string, on: boolean) => setUsed((u) => ({ ...u, [txId]: on }));

  const submit = () => {
    if (plan.problem) return;
    const paidAmounts: Record<string, number> = {};
    const paidDates: Record<string, string> = {};
    for (const txId of plan.pay) {
      paidAmounts[txId] = amountOf(txId);
      // Only send a date when the user actually moved it off the billing day —
      // otherwise the charge keeps its original occurredAt untouched.
      const row = rows.find((r) => r.txId === txId);
      if (row) {
        const def = billingDate(row.month, sub.dayOfMonth);
        const chosen = dates[txId] ?? def;
        if (chosen !== def) paidDates[txId] = chosen;
      }
    }
    onResolve({
      pay: plan.pay,
      skip: plan.skip,
      cancelling: plan.cancelling,
      amounts: paidAmounts,
      dates: paidDates,
    });
    onClose();
  };

  // "No changes to save" is the one problem that means "nothing to do" rather
  // than "you did something invalid" — it belongs in the disabled button label,
  // not in a red refusal banner.
  const noChanges = plan.problem === "No changes to save.";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${sub.name} · ${pending.length} cycles to settle`}
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
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Later
          </Button>
          <Button
            // Cancelling is a real destructive outcome, so the confirm goes solid
            // red (tier 2) rather than the black primary fill with red text, which
            // read as a broken button.
            variant={plan.cancelling ? "danger" : "primary"}
            size="sm"
            type="button"
            style={{ gap: 4 }}
            disabled={Boolean(plan.problem)}
            onClick={submit}
          >
            {plan.cancelling ? (
              "Cancel subscription"
            ) : noChanges ? (
              "No changes to save"
            ) : (
              <>
                <span className="wb-ico wb-ico--xs">check</span>
                {plan.pay.length > 0
                  ? `Paid ${plan.pay.length} cycles · ${formatMoney(payTotal)}`
                  : "Save"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <p className="cashy-catchup__lead">
        Tick up to the cycle you <strong>have paid</strong> — debts always clear oldest-first, so
        picking one cycle counts every earlier cycle as paid too. Turn off the switch for any cycle
        you{" "}
        <strong>didn't use</strong> the service.
      </p>

      {/* Column headers: the switch and the tick carry no labels of their own, so
          the two questions each answers ("was it paid" / "was it running") are
          spelled out once, always visible — clearer than a hover-only tooltip,
          and it works on touch. Each header also carries a one-line tooltip with
          the rule behind it. */}
      <div className="cashy-catchup-head">
        <Tooltip label="Last cycle you've paid">
          <span className="cashy-catchup-head__label">Paid</span>
        </Tooltip>
        <Tooltip label="Off if you weren't subscribed">
          <span className="cashy-catchup-head__label">Used</span>
        </Tooltip>
      </div>

      <div className="wb-stack" style={{ "--wb-stack-gap": "6px" } as CSSProperties}>
        {rows.map((r, i) => (
          <div
            key={r.txId}
            className={r.used ? "cashy-catchup-row" : "cashy-catchup-row is-off"}
          >
            {/* The tick is the payment answer; it is meaningless — and disabled —
                for a cycle the user says they weren't a customer for. Clicking it
                sets the waterline rather than toggling this row alone.

                `checked` is gated on `used`, not on `r.paid` alone: an off cycle
                below the waterline is still "paid" in the waterline sense (so the
                oldest-first plan stays intact around it), but showing its box
                ticked while its switch is off reads as a contradiction. Switch it
                back on and it sits below the waterline again, so it re-ticks on
                its own — which is exactly the "turning it on marks it paid too"
                behaviour the ordering rule needs. */}
            <label className="wb-check cashy-catchup-row__pay">
              <input
                type="checkbox"
                checked={r.paid && r.used}
                disabled={!r.used}
                onChange={() => setWaterline(i)}
              />
            </label>
            {/* The cycle's billing date, split into parts: the day + year repeat
                down every row, so they recede to tier-2 grey while the MONTH (the
                part that changes) stays prominent. Clicking it opens a date picker
                to override this cycle's date — rare, but possible. */}
            <Popover
              inline
              trigger={({ toggle }) => {
                const p = fmtDateParts(dateOf(r.txId, r.month));
                return (
                  <button
                    type="button"
                    className="cashy-catchup-row__month cashy-catchup-row__date"
                    onClick={toggle}
                    aria-label={`Change the date for ${monthLabelShort(r.month)}`}
                  >
                    <span style={{ color: "var(--wb-fg-muted)" }}>{p.day}</span> {p.month}{" "}
                    <span style={{ color: "var(--wb-fg-muted)" }}>{p.year}</span>
                  </button>
                );
              }}
            >
              {({ close }) => (
                <Calendar
                  value={dateOf(r.txId, r.month)}
                  onChange={(v) => {
                    setDate(r.txId, v);
                    close();
                  }}
                />
              )}
            </Popover>
            {/* Editable price per cycle (variable monthly pricing). The input is
                ALWAYS rendered — just disabled for a cycle not being paid — so
                toggling a row never changes its height (a text↔input swap did). */}
            <Input
              className="wb-input-group--underline cashy-catchup-row__amt-input"
              inputMode="numeric"
              value={amounts[r.txId] ?? ""}
              onChange={(e) => setAmount(r.txId, e.target.value)}
              disabled={!(r.paid && r.used)}
              trailingAddon="₫"
              aria-label={`Amount paid for ${monthLabelShort(r.month)}`}
            />
            <Switch
              size="sm"
              checked={r.used}
              onChange={(e) => toggleUsed(r.txId, e.target.checked)}
              aria-label={`Used the service in ${monthLabelShort(r.month)}`}
              className="cashy-catchup-row__used"
            />
          </div>
        ))}
      </div>

      {/* Why the confirm is refusing, in words. A disabled button with no reason
          is the thing that makes a form feel broken rather than strict. The
          "nothing to do" case is shown in the button itself, not here. */}
      {plan.problem && !noChanges && <p className="cashy-catchup__problem">{plan.problem}</p>}

      {plan.cancelling && (
        <p className="cashy-catchup__note">
          You've turned off every cycle — Cashy reads this as the service no longer being used, so
          it will cancel the subscription and skip {plan.skip.length} unsettled cycles.
        </p>
      )}
      {!plan.cancelling && plan.skip.length > 0 && !plan.problem && (
        <p className="cashy-catchup__note">
          {plan.skip.length} cycles will be marked as not used and left out of your spending.
        </p>
      )}
    </Modal>
  );
}
