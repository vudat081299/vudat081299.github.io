import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Loan, LoanSource } from "@/domain/types";
import {
  daysUntilDue,
  loanOutstanding,
  loanPaid,
  loanProgress,
  loanStatus,
  loanTimeLeft,
  type LoanStatus,
} from "@/domain/loan";
import { formatMoneyShort } from "@/domain/money";
import { AmountDisplay } from "@/ui/common/AmountDisplay";
import { CardIdentity } from "@/ui/common/CardIdentity";

const SOURCE_LABEL: Record<LoanSource, string> = {
  personal: "Personal",
  card: "Credit card",
  bank: "Bank",
  other: "Other",
};

/** Interest rate spelled out in full — "20% per year", not "20%/yr". */
function rateLabel(loan: Loan): string {
  if (loan.interestRatePct <= 0) return "No interest";
  return `${loan.interestRatePct}% per ${loan.interestPeriod === "year" ? "year" : "month"}`;
}

/** The status capsule text + tone. Every state earns one: overdue/due-soon carry
 *  urgency colour, a settled loan says it's cleared, and a calm active loan wears
 *  a neutral "how long is left" badge (rounded DOWN — see `loanTimeLeft`). */
function statusCap(
  loan: Loan,
  status: LoanStatus,
  now: Date,
): { label: string; tone?: "danger" | "warning" | "success" } {
  if (status === "paid") return { label: "Paid off", tone: "success" };
  if (status === "overdue") return { label: "Overdue", tone: "danger" };
  if (status === "due-soon") return { label: "Due soon", tone: "warning" };
  const d = daysUntilDue(loan, now);
  const tl = d == null ? null : loanTimeLeft(d);
  if (!tl) return { label: "Ongoing" };
  const unit = tl.value === 1 ? tl.unit : `${tl.unit}s`;
  const num = tl.value.toString().replace(".", ",");
  return { label: `${tl.approx ? "about " : ""}${num} ${unit} left` };
}

/** The due line, with the day count bolded so the number reads at a glance. */
function DueText({ loan, status, now }: { loan: Loan; status: LoanStatus; now: Date }): ReactNode {
  if (status === "paid") return "Settled";
  const d = daysUntilDue(loan, now);
  if (d == null) return "No due date";
  if (d === 0) {
    return (
      <>
        Due <strong>today</strong>
      </>
    );
  }
  if (d < 0) {
    const late = -d;
    return (
      <>
        Overdue by <strong>{late}</strong> {late === 1 ? "day" : "days"}
      </>
    );
  }
  return (
    <>
      Due in <strong>{d}</strong> {d === 1 ? "day" : "days"}
    </>
  );
}

/**
 * One loan as a card, composed from the shared entity-card parts (`CardIdentity`
 * + `.cashy-card*`) exactly like `WalletCard` — so its icon tile, spacing,
 * progress track and typography match the subscription/wallet cards instead of
 * drifting on hand-rolled inline styles.
 *
 * Direction is the thing you should read WITHOUT reading: a lent loan (money owed
 * to you) is a future inflow, so its arrow and amount go green like income; a
 * borrowed loan (money you owe) stays neutral and only turns red when it's
 * actually overdue — the house rule is colour-means-status, not colour-means-debt.
 * A settled loan fades back the way a cancelled subscription does. Self-contained
 * — every figure comes from `domain/loan`.
 */
export function LoanCard({
  loan,
  onEdit,
  now = new Date(),
}: {
  loan: Loan;
  onEdit?: (id: string) => void;
  now?: Date;
}) {
  const outstanding = loanOutstanding(loan);
  const paid = loanPaid(loan);
  const pct = Math.round(loanProgress(loan) * 100);
  const status = loanStatus(loan, now);
  const clickable = Boolean(onEdit);
  const owed = loan.direction === "borrowed"; // borrowed ⇒ I owe someone
  const overdue = status === "overdue";
  const settled = status === "paid";

  // The direction arrow is green ONLY on a lent card (money owed to you — an
  // inflow). A borrowed card's arrow is never tinted: a coloured "you owe" arrow
  // reads as an alarm on an ordinary debt. (The amount below still turns red when
  // it's genuinely overdue — that's a status, carried by the amount, not here.)
  const dirColor = owed ? "var(--wb-fg-muted)" : "var(--wb-success-text)";

  let barClass: string;
  if (overdue) {
    barClass = "wb-progress__bar wb-progress__bar--danger";
  } else if (status === "due-soon") {
    barClass = "wb-progress__bar wb-progress__bar--warning";
  } else if (settled) {
    barClass = "wb-progress__bar wb-progress__bar--success";
  } else {
    barClass = "wb-progress__bar cashy-progress__bar--quiet";
  }

  const cap = statusCap(loan, status, now);
  const trailing = (
    <span className={cap.tone ? `wb-cap wb-cap--${cap.tone}` : "wb-cap"}>
      {cap.tone && <span className="wb-cap__dot" />}
      {cap.label}
    </span>
  );

  let cls = "wb-card";
  if (clickable) cls += " wb-card--hover";
  if (settled && !loan.archived) cls += " cashy-loan--settled";

  return (
    <div
      className={cls}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onEdit?.(loan.id) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit?.(loan.id);
              }
            }
          : undefined
      }
      style={{ opacity: loan.archived ? 0.55 : undefined }}
    >
      <div className="wb-card__body cashy-cardstack">
        <CardIdentity
          icon={loan.icon}
          title={loan.counterparty}
          subtitle={SOURCE_LABEL[loan.source]}
          archived={loan.archived}
          trailing={trailing}
        />

        <div className="cashy-cardfig">
          <span className="cashy-cardfig__label cashy-loandir">
            {owed ? (
              <ArrowUpRight size={13} style={{ color: dirColor }} />
            ) : (
              <ArrowDownLeft size={13} style={{ color: dirColor }} />
            )}
            {owed ? "I owe" : "Owed to me"}
          </span>
          <div className="cashy-cardfig__val">
            <AmountDisplay amount={outstanding} positive={!owed} negative={owed && overdue} />
          </div>
        </div>

        <div className="cashy-cardmeter">
          <div className="wb-progress">
            <div className={barClass} style={{ width: `${pct}%` }} />
          </div>
          <span className="cashy-cardmeter__note">
            {formatMoneyShort(paid)} of {formatMoneyShort(loan.principal)}{" "}
            {owed ? "repaid" : "collected"}
          </span>
        </div>

        <div className="cashy-loanfoot">
          <span
            className="cashy-loanfoot__due"
            data-overdue={overdue}
            data-quiet={settled || daysUntilDue(loan, now) == null}
          >
            <DueText loan={loan} status={status} now={now} />
          </span>
          <span className="cashy-loanfoot__rate" data-none={loan.interestRatePct <= 0}>
            {rateLabel(loan)}
          </span>
        </div>
      </div>
    </div>
  );
}
