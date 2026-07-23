import type { Loan } from "@/domain/types";
import type { PayableSchedule } from "@/domain/loan";
import { formatMoney, formatMoneyShort } from "@/domain/money";
import { fmtDateShort } from "@/domain/date";
import { StatFigure } from "@/ui/common/StatFigure";

/**
 * The loans overview header. Two panels, because a loan book raises two different
 * questions and the old three-figure row answered only the first:
 *
 *  1. **Where do I stand** — what I owe, what's owed to me, the net of the two.
 *  2. **What's coming** — the next payment (date · amount · to whom) and how the
 *     total I owe is spread over time, as a segmented bar + legend
 *     (overdue / ≤30d / 31–60d / later).
 *
 * Presentational only: every figure is computed by `domain/loan`
 * (`payableSchedule`, `nextPayment`, the totals) and passed in, so this renders in
 * the gallery with plain fixtures. See docs/features/loans.md.
 */

/** The four due-time buckets, in urgency order; `seg` keys both bar + legend CSS. */
const BUCKETS: { key: keyof PayableSchedule; label: string; seg: string }[] = [
  { key: "overdue", label: "Overdue", seg: "is-overdue" },
  { key: "within30", label: "≤ 30 days", seg: "is-w30" },
  { key: "within60", label: "31–60 days", seg: "is-w60" },
  { key: "later", label: "Later", seg: "is-later" },
];

export function LoanSummary({
  payable,
  receivable,
  net,
  schedule,
  next,
}: {
  payable: number;
  receivable: number;
  net: number;
  schedule: PayableSchedule;
  next: { loan: Loan; days: number; amount: number } | null;
}) {
  const hasDebt = schedule.total > 0;
  const buckets = BUCKETS.filter((b) => schedule[b.key] > 0);

  return (
    <div className="wb-card">
      <div className="wb-card__body cashy-loansum">
        {/* 1 — where I stand */}
        <div className="cashy-figrow">
          <StatFigure label="You owe" amount={payable} />
          <StatFigure label="Owed to me" amount={receivable} positive={receivable > 0} />
          <StatFigure label="Net" amount={net} negativeRed />
        </div>

        {/* 2 — what's coming */}
        <div className="cashy-loansum__sched">
          <span className="cashy-card-eyebrow">Payments due</span>

          {!hasDebt ? (
            <p className="cashy-loansum__note">No debts to pay — you're all square.</p>
          ) : (
            <>
              {next && next.loan.dueAt ? (
                <p className="cashy-loansum__next">
                  Next <strong>{fmtDateShort(next.loan.dueAt)}</strong> ·{" "}
                  {formatMoneyShort(next.amount)} to {next.loan.counterparty}
                  <span className="cashy-loansum__next-in">
                    {" · "}
                    {next.days === 0 ? "today" : `in ${next.days} ${next.days === 1 ? "day" : "days"}`}
                  </span>
                </p>
              ) : (
                <p className="cashy-loansum__note">
                  {schedule.overdue > 0
                    ? "Overdue payments outstanding — nothing else scheduled."
                    : "No dated repayments — everything is open-ended."}
                </p>
              )}

              {/* Segmented bar: each bucket's width is its share of the total owed. */}
              <div className="cashy-schedbar" role="img" aria-label="What I owe, by when it's due">
                {buckets.map((b) => (
                  <span
                    key={b.key}
                    className={`cashy-schedbar__seg ${b.seg}`}
                    style={{ flexGrow: schedule[b.key] }}
                    title={`${b.label}: ${formatMoney(schedule[b.key])}`}
                  />
                ))}
              </div>

              <div className="cashy-schedlegend">
                {buckets.map((b) => (
                  <span key={b.key} className="cashy-schedlegend__item">
                    <span className={`cashy-schedlegend__dot ${b.seg}`} />
                    {b.label} <strong>{formatMoneyShort(schedule[b.key])}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
