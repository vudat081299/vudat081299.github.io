import type { CSSProperties } from "react";
import type { Due } from "@/lib/domain";
import {
  confirmSubscriptionCharge,
  revertSubscriptionCharge,
  skipSubscriptionCharge,
} from "@/lib/store";
import { toast } from "@/lib/toast";
import { formatMoney } from "@/lib/money";
import { billingDate, fmtDateShort, monthLabelShort } from "@/lib/date";
import { SubTile } from "@/components/SubTile";

/** "Cần xác nhận" rows — confirm paid (→ books the charge) or skip the month.
 *  Every decision is reversible on the spot via an Undo toast, so a mis-click on
 *  either button costs nothing. */
export function SubscriptionDues({ dues, max }: { dues: Due[]; max?: number }) {
  const shown = max ? dues.slice(0, max) : dues;
  const pay = (sub: Due["sub"], month: string, txId: string) => {
    confirmSubscriptionCharge(txId);
    toast.undo(`Đã trả ${sub.name} · ${monthLabelShort(month)}`, () =>
      revertSubscriptionCharge(txId),
    );
  };
  const skip = (sub: Due["sub"], month: string, txId: string) => {
    skipSubscriptionCharge(txId);
    toast.undo(`Bỏ qua ${sub.name} · ${monthLabelShort(month)}`, () =>
      revertSubscriptionCharge(txId),
    );
  };
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
              onClick={() => skip(sub, month, txId)}
            >
              Bỏ qua
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--sm"
              style={{ gap: 4 }}
              onClick={() => pay(sub, month, txId)}
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
