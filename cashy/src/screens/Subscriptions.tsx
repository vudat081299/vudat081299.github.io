import { useMemo, type CSSProperties } from "react";
import type { Category, Subscription, Tag, Transaction } from "@/types";
import { useCashy, setSubscriptionActive, revertSubscriptionCharge } from "@/lib/store";
import { collectDues, monthlyCommitment, subscriptionStatus } from "@/lib/domain";
import { formatMoney } from "@/lib/money";
import { fmtDateShort, monthLabelShort } from "@/lib/date";
import { Icon } from "@/lib/icons";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { CategoryCap } from "@/components/CategoryCap";
import { TagChip } from "@/components/TagChip";
import { SubscriptionDues } from "@/components/SubscriptionDues";
import { openSubscriptionEditor } from "@/components/SubscriptionEditor";

function SubscriptionCard({
  sub,
  category,
  tags,
  txs,
}: {
  sub: Subscription;
  category: Category | null;
  tags: Tag[];
  txs: Transaction[];
}) {
  const st = subscriptionStatus(sub, txs);
  const subTags = sub.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));
  // most recent resolved charge (recorded/skipped) → offer to undo it
  const last = txs
    .filter((t) => t.subscriptionId === sub.id && (t.status === "recorded" || t.status === "skipped"))
    .sort((a, b) => (a.subMonth! < b.subMonth! ? 1 : -1))[0];

  return (
    <div className="wb-card">
      <div className="wb-card__body wb-stack" style={{ "--wb-stack-gap": "14px" } as CSSProperties}>
        <div className="wb-cluster wb-cluster--between wb-cluster--nowrap" style={{ gap: 12 }}>
          <div className="wb-cluster wb-cluster--nowrap" style={{ gap: 12, minWidth: 0 }}>
            <span
              className="cashy-subtile"
              style={{ "--cashy-sub-c": sub.colorHex } as CSSProperties}
            >
              <Icon name={sub.icon} size={20} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="wb-cell-strong" style={{ fontSize: 15 }}>
                {sub.name}
                {!sub.active && (
                  <span className="wb-cap wb-cap--sm" style={{ marginLeft: 8 }}>
                    Tạm dừng
                  </span>
                )}
              </div>
              <div className="wb-cell-muted" style={{ fontSize: 13 }}>
                Ngày {sub.dayOfMonth} hàng tháng
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div className="wb-num" style={{ fontSize: 17, fontWeight: 700 }}>
              {formatMoney(sub.amount)}
            </div>
            <div className="wb-cell-muted" style={{ fontSize: 12 }}>
              / tháng
            </div>
          </div>
        </div>

        <div className="wb-cluster" style={{ gap: 8 }}>
          <CategoryCap category={category} />
          {subTags.length > 0 && (
            <span className="wb-tags">
              {subTags.slice(0, 3).map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </span>
          )}
        </div>

        <div className="wb-cluster" style={{ gap: 8, fontSize: 13, color: "var(--wb-fg-muted)" }}>
          {st.pending.length > 0 ? (
            <span className="wb-cap wb-cap--warning wb-cap--sm">
              <span className="wb-cap__dot" />
              {st.pending.length} tháng chờ xác nhận
            </span>
          ) : sub.active && st.nextDate ? (
            <span className="wb-cap wb-cap--sm">
              <span className="wb-ico wb-ico--xs">event_upcoming</span>
              Kỳ tới: {fmtDateShort(st.nextDate)}
            </span>
          ) : null}
          {st.paidCount > 0 && (
            <span>
              Đã trả {st.paidCount} tháng · {formatMoney(st.spent)}
            </span>
          )}
        </div>

        <div className="wb-divider" />

        <div className="wb-cluster wb-cluster--between" style={{ gap: 8 }}>
          <div className="wb-cluster" style={{ gap: 6 }}>
            <button
              type="button"
              className="wb-btn wb-btn--secondary wb-btn--sm"
              style={{ gap: 5 }}
              onClick={() => openSubscriptionEditor(sub.id)}
            >
              <span className="wb-ico wb-ico--xs">edit</span>
              Sửa
            </button>
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm"
              style={{ gap: 5 }}
              onClick={() => setSubscriptionActive(sub.id, !sub.active)}
            >
              <span className="wb-ico wb-ico--xs">{sub.active ? "pause" : "play_arrow"}</span>
              {sub.active ? "Tạm dừng" : "Tiếp tục"}
            </button>
          </div>
          {last && last.subMonth && (
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm"
              style={{ gap: 5 }}
              title={`Hoàn tác ${monthLabelShort(last.subMonth)}`}
              onClick={() => revertSubscriptionCharge(last.id)}
            >
              <span className="wb-ico wb-ico--xs">undo</span>
              Hoàn tác {monthLabelShort(last.subMonth)}
              {last.status === "recorded" ? " (đã trả)" : " (bỏ qua)"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Subscriptions() {
  const { workspace, subscriptions, categories, tags, transactions } = useCashy();
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const dues = useMemo(() => collectDues(subscriptions, transactions), [subscriptions, transactions]);
  const active = subscriptions.filter((s) => s.active);
  const monthly = monthlyCommitment(subscriptions);

  const ordered = useMemo(
    () =>
      [...subscriptions].sort(
        (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "vi"),
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
              <span className="wb-stat__label">Chờ xác nhận</span>
              <span className="wb-stat__icon">
                <span className="wb-ico wb-ico--sm">notifications</span>
              </span>
            </div>
            <div className="wb-stat__value">{dues.length}</div>
            <div className="wb-stat__foot">tháng cần bạn quyết định</div>
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
          </div>
          <div className="wb-card__body">
            <SubscriptionDues dues={dues} />
          </div>
        </div>
      )}

      {subscriptions.length ? (
        <div className="wb-grid wb-grid--2">
          {ordered.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              tags={tags}
              txs={transactions}
              category={sub.categoryId ? (catById.get(sub.categoryId) ?? null) : null}
            />
          ))}
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
