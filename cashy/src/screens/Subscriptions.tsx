import { useMemo, type CSSProperties } from "react";
import type { Category, Subscription, Transaction } from "@/types";
import { useCashy, setSubscriptionActive } from "@/lib/store";
import {
  collectDues,
  monthlyCommitment,
  needsPaymentThisMonth,
  subscriptionStatus,
} from "@/lib/domain";
import { formatMoney } from "@/lib/money";
import { fmtDateNum, fmtDateShort, monthKey, monthLabelShort } from "@/lib/date";
import { Icon } from "@/lib/icons";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CategoryCap } from "@/components/CategoryCap";
import { SubscriptionDues } from "@/components/SubscriptionDues";
import { openSubscriptionEditor } from "@/components/SubscriptionEditor";

/**
 * One service row. Modelled on the docs' "Công nợ" table — the pattern for
 * tracking money owed against a deadline — so a subscription that wants paying
 * gets a soft amber row and an amber status capsule, exactly like an invoice
 * coming due. Everything settled stays quiet.
 */
function SubscriptionRow({
  sub,
  category,
  txs,
}: {
  sub: Subscription;
  category: Category | null;
  txs: Transaction[];
}) {
  const st = subscriptionStatus(sub, txs);
  const due = needsPaymentThisMonth(sub);
  const cur = monthKey();
  // Settled for this month, as opposed to merely not billed yet — the two look
  // the same from "not due" but only one of them means the money has been paid.
  const paidThisMonth = sub.lastPaidAt?.slice(0, 7) === cur;

  const rowTone = !sub.active ? undefined : due ? "wb-row--warning" : undefined;

  return (
    <tr className={rowTone}>
      <td>
        <span className="cashy-subcell">
          <span
            className="cashy-subtile"
            style={{ "--cashy-sub-c": sub.colorHex, width: 32, height: 32 } as CSSProperties}
          >
            <Icon name={sub.icon} size={16} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="wb-cell-strong">{sub.name}</span>
            {sub.note && <span className="wb-cell-sub">{sub.note}</span>}
          </span>
        </span>
      </td>
      <td>
        <CategoryCap category={category} />
      </td>
      <td className="wb-cell-muted">Ngày {sub.dayOfMonth}</td>
      <td className="wb-cell-muted">{fmtDateNum(sub.startedAt)}</td>
      <td className="wb-cell-muted">
        {sub.lastPaidAt ? fmtDateNum(sub.lastPaidAt) : "—"}
      </td>
      <td className="wb-num wb-num--strong">{formatMoney(sub.amount)}</td>
      <td>
        {!sub.active ? (
          <span className="wb-cap">Tạm dừng</span>
        ) : due ? (
          <span className="wb-cap wb-cap--warning">
            <span className="wb-cap__dot" />
            Cần trả {monthLabelShort(cur)}
          </span>
        ) : paidThisMonth ? (
          <span className="wb-cap wb-cap--success">
            <span className="wb-cap__dot" />
            Đã trả {monthLabelShort(cur)}
          </span>
        ) : (
          <span className="wb-cap">Chưa đến hạn</span>
        )}
        {sub.active && !due && st.nextDate && (
          <span className="wb-cell-sub">Kỳ tới {fmtDateShort(st.nextDate)}</span>
        )}
      </td>
      <td className="cashy-actions-cell">
        <span className="cashy-rowactions">
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm wb-btn--round"
            aria-label={`Sửa ${sub.name}`}
            title="Sửa"
            onClick={() => openSubscriptionEditor(sub.id)}
          >
            <span className="wb-ico wb-ico--sm">edit</span>
          </button>
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--sm wb-btn--round"
            aria-label={sub.active ? `Tạm dừng ${sub.name}` : `Tiếp tục ${sub.name}`}
            title={sub.active ? "Tạm dừng" : "Tiếp tục"}
            onClick={() => setSubscriptionActive(sub.id, !sub.active)}
          >
            <span className="wb-ico wb-ico--sm">{sub.active ? "pause" : "play_arrow"}</span>
          </button>
        </span>
      </td>
    </tr>
  );
}

export function Subscriptions() {
  const { workspace, subscriptions, categories, transactions } = useCashy();
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const dues = useMemo(() => collectDues(subscriptions, transactions), [subscriptions, transactions]);
  const active = subscriptions.filter((s) => s.active);
  const monthly = monthlyCommitment(subscriptions);
  const dueCount = subscriptions.filter((s) => needsPaymentThisMonth(s)).length;

  // Whatever needs money first sits at the top; paused services sink.
  const ordered = useMemo(
    () =>
      [...subscriptions].sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          Number(needsPaymentThisMonth(b)) - Number(needsPaymentThisMonth(a)) ||
          a.name.localeCompare(b.name, "vi"),
      ),
    [subscriptions],
  );

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Đăng ký định kỳ"
        subtitle="Dịch vụ trả theo tháng (Netflix, YouTube…). Mỗi tháng bạn xác nhận đã trả thì mới ghi thành giao dịch."
        actions={
          <button
            type="button"
            className="wb-btn wb-btn--round"
            style={{ gap: 6 }}
            onClick={() => openSubscriptionEditor(null)}
          >
            <span className="wb-ico wb-ico--sm">add</span>
            Thêm đăng ký
          </button>
        }
      />

      {subscriptions.length > 0 && (
        <div className="wb-stat-grid">
          <div className="wb-stat">
            <div className="wb-stat__top">
              <span className="wb-stat__label">Cam kết mỗi tháng</span>
              <span className="wb-stat__icon">
                <span className="wb-ico wb-ico--sm">autorenew</span>
              </span>
            </div>
            <div className="wb-stat__value">{formatMoney(monthly)}</div>
            <div className="wb-stat__foot">{active.length} dịch vụ đang chạy</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat__top">
              <span className="wb-stat__label">Cần trả tháng này</span>
              <span className="wb-stat__icon">
                <span className="wb-ico wb-ico--sm">notifications</span>
              </span>
            </div>
            <div className="wb-stat__value">{dueCount}</div>
            <div className="wb-stat__foot">dịch vụ chưa thanh toán</div>
          </div>
          <div className="wb-stat">
            <div className="wb-stat__top">
              <span className="wb-stat__label">Tổng dịch vụ</span>
              <span className="wb-stat__icon">
                <span className="wb-ico wb-ico--sm">list</span>
              </span>
            </div>
            <div className="wb-stat__value">{subscriptions.length}</div>
            <div className="wb-stat__foot">{subscriptions.length - active.length} đang tạm dừng</div>
          </div>
        </div>
      )}

      {dues.length > 0 && (
        <div className="wb-card">
          <div className="wb-table-head">
            <div>
              <h3 className="wb-table-head__title">Cần xác nhận</h3>
              <p className="wb-table-head__sub">
                Xác nhận “Đã trả” để ghi thành giao dịch, hoặc “Bỏ qua” tháng này.
              </p>
            </div>
            <div className="wb-table-head__actions">
              <span className="wb-cap wb-cap--warning">{dues.length} tháng</span>
            </div>
          </div>
          <div className="wb-card__body">
            <SubscriptionDues dues={dues} />
          </div>
        </div>
      )}

      {subscriptions.length ? (
        <div className="wb-card">
          <div className="wb-table-head">
            <div>
              <h3 className="wb-table-head__title">Dịch vụ đăng ký</h3>
              <p className="wb-table-head__sub">Chu kỳ, ngày bắt đầu &amp; lần trả gần nhất</p>
            </div>
            {dueCount > 0 && (
              <div className="wb-table-head__actions">
                <span className="wb-cap wb-cap--warning">{dueCount} cần trả</span>
              </div>
            )}
          </div>
          <div className="wb-table-scroll">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Dịch vụ</th>
                  <th>Danh mục</th>
                  <th>Chu kỳ</th>
                  <th>Bắt đầu</th>
                  <th>Trả gần nhất</th>
                  <th className="wb-num">Số tiền</th>
                  <th>Trạng thái</th>
                  <th aria-label="Hành động" />
                </tr>
              </thead>
              <tbody>
                {ordered.map((sub) => (
                  <SubscriptionRow
                    key={sub.id}
                    sub={sub}
                    txs={transactions}
                    category={sub.categoryId ? (catById.get(sub.categoryId) ?? null) : null}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>Cam kết mỗi tháng · {active.length} dịch vụ</td>
                  <td className="wb-num wb-num--strong">{formatMoney(monthly)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="wb-card">
          <div className="wb-card__body">
            <EmptyState
              icon="🔁"
              title="Chưa có đăng ký nào"
              description="Thêm các dịch vụ trả theo tháng như Netflix, Spotify, YouTube. Cashy sẽ nhắc bạn xác nhận mỗi tháng."
              action={
                <button type="button" className="wb-btn" onClick={() => openSubscriptionEditor(null)}>
                  Thêm đăng ký
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
