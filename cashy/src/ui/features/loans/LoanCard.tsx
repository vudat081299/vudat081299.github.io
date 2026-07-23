import type { CSSProperties } from "react";
import type { Loan, LoanSource } from "@/domain/types";
import {
  daysUntilDue,
  loanOutstanding,
  loanPaid,
  loanProgress,
  loanStatus,
  type LoanStatus,
} from "@/domain/loan";
import { formatMoneyShort } from "@/domain/money";
import { Icon } from "@/ui/kit/icons";
import { AmountDisplay } from "@/ui/common/AmountDisplay";

const SOURCE_LABEL: Record<LoanSource, string> = {
  personal: "Personal",
  card: "Credit card",
  bank: "Bank",
  other: "Other",
};

const truncate: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** Semantic token per status — drives both the pill and the progress-bar tone. */
const STATUS_TOKEN: Record<LoanStatus, string | null> = {
  overdue: "--wb-danger",
  "due-soon": "--wb-warning",
  paid: "--wb-success",
  active: null,
};
const STATUS_LABEL: Record<LoanStatus, string> = {
  overdue: "Overdue",
  "due-soon": "Due soon",
  paid: "Paid off",
  active: "Active",
};

function rateLabel(loan: Loan): string {
  if (loan.interestRatePct <= 0) return "No interest";
  return `${loan.interestRatePct}%/${loan.interestPeriod === "year" ? "yr" : "mo"}`;
}

function dueLabel(loan: Loan, status: LoanStatus, now: Date): string {
  if (status === "paid") return "Settled";
  const d = daysUntilDue(loan, now);
  if (d == null) return "No due date";
  if (d === 0) return "Due today";
  if (d < 0) return `Overdue by ${-d} ${-d === 1 ? "day" : "days"}`;
  return `Due in ${d} ${d === 1 ? "day" : "days"}`;
}

/**
 * One loan as a card: neutral icon tile, counterparty + source, the outstanding
 * amount, a repayment progress bar, and a due-date line + interest rate. A status
 * pill (overdue / due-soon / paid) carries the urgency; everything else stays
 * neutral. Self-contained — derives its numbers from `domain/loan`.
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
  const token = STATUS_TOKEN[status];
  const clickable = Boolean(onEdit);
  const owed = loan.direction === "borrowed";

  const barClass =
    status === "overdue"
      ? "wb-progress__bar wb-progress__bar--danger"
      : status === "due-soon"
        ? "wb-progress__bar wb-progress__bar--warning"
        : status === "paid"
          ? "wb-progress__bar wb-progress__bar--success"
          : "wb-progress__bar cashy-progress__bar--quiet";

  return (
    <div
      className={clickable ? "wb-card wb-card--hover" : "wb-card"}
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
      style={{ opacity: loan.archived ? 0.55 : 1 }}
    >
      <div className="wb-card__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 12, alignItems: "center" }}>
          <span className="cashy-subtile" aria-hidden="true">
            <Icon name={loan.icon} size={18} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...truncate, fontWeight: 600 }}>
              {loan.counterparty}
              {loan.archived && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: "var(--wb-fg-muted)" }}>
                  · archived
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>{SOURCE_LABEL[loan.source]}</span>
          </div>
          {token && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "var(--wb-radius-pill)",
                whiteSpace: "nowrap",
                color: `var(${token})`,
                background: `color-mix(in srgb, var(${token}) 14%, transparent)`,
              }}
            >
              {STATUS_LABEL[status]}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>{owed ? "You owe" : "Owed to you"}</span>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>
            <AmountDisplay amount={outstanding} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="wb-progress">
            <div className={barClass} style={{ width: `${pct}%` }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--wb-fg-muted)" }}>
            {formatMoneyShort(paid)} of {formatMoneyShort(loan.principal)} {owed ? "repaid" : "collected"}
          </span>
        </div>

        <div className="wb-cluster" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: status === "overdue" ? 600 : 400,
              color: status === "overdue" ? "var(--wb-danger)" : "var(--wb-fg-muted)",
            }}
          >
            {dueLabel(loan, status, now)}
          </span>
          <span style={{ fontSize: 12, color: "var(--wb-fg-muted)" }}>{rateLabel(loan)}</span>
        </div>
      </div>
    </div>
  );
}
