import type { CSSProperties } from "react";
import type { Due } from "@/lib/domain";
import { confirmSubscriptionCharge, skipSubscriptionCharge } from "@/lib/store";
import { formatMoney } from "@/lib/money";
import { billingDate, fmtDateShort, monthLabelShort } from "@/lib/date";
import { Icon } from "@/lib/icons";

/** "Cần xác nhận" rows — confirm paid (→ books the charge) or skip the month. */
export function SubscriptionDues({ dues, max }: { dues: Due[]; max?: number }) {
  const shown = max ? dues.slice(0, max) : dues;
  return (
    <div className="wb-stack" style={{ "--wb-stack-gap": "8px" } as CSSProperties}>
      {shown.map(({ sub, month, txId }) => (
        <div key={txId} className="cashy-due">
          <span
            className="cashy-subtile"
            style={{ "--cashy-sub-c": sub.colorHex, width: 32, height: 32 } as CSSProperties}
          >
            <Icon name={sub.icon} size={16} />
          </span>
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
              onClick={() => skipSubscriptionCharge(txId)}
            >
              Bỏ qua
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--sm"
              style={{ gap: 4 }}
              onClick={() => confirmSubscriptionCharge(txId)}
            >
              <span className="wb-ico wb-ico--xs">check</span>
              Đã trả
            </button>
          </div>
        </div>
      ))}
      {dues.length > shown.length && (
        <span className="wb-cell-muted" style={{ fontSize: 12 }}>
          +{dues.length - shown.length} tháng khác ở màn Đăng ký…
        </span>
      )}
    </div>
  );
}
