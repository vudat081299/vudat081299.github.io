import type { CSSProperties } from "react";
import type { Due } from "@/domain";
import { formatMoney } from "@/domain/money";
import { billingDate, fmtDateShort, monthLabelShort } from "@/domain/date";
import { SubTile } from "@/ui/features/subscriptions/SubTile";

/**
 * "Cần xác nhận" rows — confirm paid (→ books the charge) or skip the month.
 *
 * Presentational: it reports which charge the user acted on and lets the screen
 * decide what that means, so it can be rendered against any list of dues.
 */
export function SubscriptionDues({
  dues,
  max,
  onConfirm,
  onSkip,
}: {
  dues: Due[];
  max?: number;
  onConfirm: (txId: string) => void;
  onSkip: (txId: string) => void;
}) {
  const shown = max ? dues.slice(0, max) : dues;
  return (
    <div className="wb-stack" style={{ "--wb-stack-gap": "8px" } as CSSProperties}>
      {shown.map(({ sub, month, txId }) => (
        <div key={txId} className="cashy-due">
          <SubTile icon={sub.icon} colorHex={sub.colorHex} brand size={32} iconSize={16} />
          <div style={{ minWidth: 0 }}>
            <div className="wb-cell-strong">{sub.name}</div>
            <div className="wb-cell-muted" style={{ fontSize: 12 }}>
              {monthLabelShort(month)} · {fmtDateShort(billingDate(month, sub.dayOfMonth))} ·{" "}
              {formatMoney(sub.amount)}
            </div>
          </div>
          <div className="cashy-due__actions">
            <button
              type="button"
              className="wb-btn wb-btn--secondary wb-btn--sm"
              onClick={() => onSkip(txId)}
            >
              Skip
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--sm"
              style={{ gap: 4 }}
              onClick={() => onConfirm(txId)}
            >
              <span className="wb-ico wb-ico--xs">check</span>
              Paid
            </button>
          </div>
        </div>
      ))}
      {dues.length > shown.length && (
        <span className="wb-cell-muted" style={{ fontSize: 12 }}>
          +{dues.length - shown.length} more months on the Subscriptions page…
        </span>
      )}
    </div>
  );
}
