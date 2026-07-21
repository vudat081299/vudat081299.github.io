import { useMemo, type CSSProperties } from "react";
import { useCashy } from "@/lib/store";
import {
  breakdown,
  collectDues,
  filterTx,
  pctChange,
  periodInsights,
  subscriptionStatus,
  totals,
  walletSeries,
} from "@/lib/domain";
import { periodLabel, periodRange, prevRange } from "@/lib/period";
import { useTxQuery } from "@/lib/useTxQuery";
import { navigate } from "@/lib/router";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import { fmtDateShort } from "@/lib/date";
import { openTxEditor } from "@/components/TransactionEditor";
import { PageHeader } from "@/components/PageHeader";
import { BalanceCard } from "@/components/BalanceCard";
import { CashflowChart } from "@/components/CashflowChart";
import { SpendChart } from "@/components/SpendChart";
import { PeriodPicker } from "@/components/PeriodPicker";
import { TxFilterBar } from "@/components/tx/TxFilterBar";
import { TransactionTable } from "@/components/tx/TransactionTable";
import { SubscriptionDues } from "@/components/SubscriptionDues";
import { EmptyState } from "@/components/EmptyState";

export function Dashboard() {
  // The query owns the period so the header picker, the charts AND the table all
  // move together; type/search/tag filters narrow the table only (not the charts).
  const { workspace, transactions, categories, tags, subscriptions } = useCashy();
  const q = useTxQuery(transactions, categories);

  const view = useMemo(() => {
    const range = periodRange(q.period);
    const cur = filterTx(transactions, { range });
    const t = totals(cur);
    const tp = totals(filterTx(transactions, { range: prevRange(q.period) }));
    const wallet = walletSeries(transactions, range);
    const slices = breakdown(cur, "expense", categories);
    const insights = periodInsights(cur, range, categories);
    return { balance: totals(transactions).net, t, tp, wallet, slices, insights, count: cur.length };
  }, [transactions, categories, q.period]);

  const { t, tp, wallet, slices, insights } = view;
  const maxSlice = slices[0]?.pct || 1;
  const hasFlow = Boolean(t.income || t.expense);

  // Balance grows/shrinks by this period's net; compare to where it started.
  const balanceStart = view.balance - t.net;
  const balanceDelta = balanceStart !== 0 ? t.net / Math.abs(balanceStart) : null;

  // Subscriptions surfaced on the overview: months to confirm + soonest upcoming.
  const dues = useMemo(
    () => collectDues(subscriptions, transactions),
    [subscriptions, transactions],
  );
  const upcoming = useMemo(
    () =>
      subscriptions
        .filter((s) => s.active)
        .map((s) => ({ sub: s, st: subscriptionStatus(s, transactions) }))
        .filter((x) => x.st.pending.length === 0 && x.st.nextDate)
        .sort((a, b) => (a.st.nextDate! < b.st.nextDate! ? -1 : 1))
        .slice(0, 3),
    [subscriptions, transactions],
  );

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        eyebrow={workspace?.displayName ?? "Cashy"}
        title="Tổng quan"
        subtitle={`${view.count} giao dịch · ${periodLabel(q.period)}`}
        actions={<PeriodPicker value={q.period} onChange={q.setPeriod} />}
      />

      <div className="wb-stat-grid">
        <BalanceCard
          label="Số dư (tất cả)"
          amount={view.balance}
          icon="account_balance_wallet"
          delta={balanceDelta}
          note="so với đầu kỳ"
        />
        <BalanceCard
          label="Thu nhập"
          amount={t.income}
          icon="trending_up"
          delta={pctChange(t.income, tp.income)}
        />
        <BalanceCard
          label="Chi tiêu"
          amount={t.expense}
          icon="trending_down"
          delta={pctChange(t.expense, tp.expense)}
        />
        <BalanceCard
          label="Chênh lệch"
          amount={t.net}
          icon="swap_vert"
          delta={pctChange(t.net, tp.net)}
        />
      </div>

      {/* Subscriptions reminder — the overview surfaces what needs confirming */}
      {(dues.length > 0 || upcoming.length > 0) && (
        <div className="wb-card">
          <div className="wb-table-head">
            <div>
              <h3 className="wb-table-head__title">Đăng ký định kỳ</h3>
              <p className="wb-table-head__sub">
                {dues.length > 0
                  ? "Xác nhận đã trả để ghi thành giao dịch, hoặc bỏ qua tháng này."
                  : "Các kỳ thanh toán sắp tới."}
              </p>
            </div>
            <div className="wb-table-head__actions">
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm wb-btn--round"
                style={{ gap: 4 }}
                onClick={() => navigate("subscriptions")}
              >
                Quản lý
                <span className="wb-ico wb-ico--xs">arrow_forward</span>
              </button>
            </div>
          </div>
          <div className="wb-card__body">
            {dues.length > 0 ? (
              <SubscriptionDues dues={dues} max={3} />
            ) : (
              <div className="wb-stack" style={{ "--wb-stack-gap": "8px" } as CSSProperties}>
                {upcoming.map(({ sub, st }) => (
                  <div
                    key={sub.id}
                    className="wb-cluster wb-cluster--between"
                    style={{ gap: 10, fontSize: 13 }}
                  >
                    <span className="wb-cluster" style={{ gap: 8 }}>
                      <span className="cashy-dot" style={{ background: sub.colorHex }} />
                      <span className="wb-cell-strong">{sub.name}</span>
                    </span>
                    <span className="wb-cell-muted">
                      {fmtDateShort(st.nextDate!)} · {formatMoney(sub.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="wb-grid wb-grid--3">
        <div
          className="wb-card"
          style={{ gridColumn: "span 2", display: "flex", flexDirection: "column" }}
        >
          <div
            className="wb-card__body"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <div className="wb-cluster wb-cluster--between" style={{ marginBottom: 16 }}>
              <div>
                <span className="cashy-card-eyebrow">Dòng tiền</span>
                <h3 className="cashy-card-title">Số dư ví &amp; chi tiêu</h3>
              </div>
              <div className="wb-legend">
                <span className="wb-legend__item">
                  <span className="wb-legend__dot" style={{ background: "var(--wb-chart-5)" }} /> Số dư ví
                </span>
                <span className="wb-legend__item">
                  <span
                    className="wb-legend__dot"
                    style={{ background: "var(--wb-chart-expense)" }}
                  />{" "}
                  Chi tiêu
                </span>
              </div>
            </div>
            {hasFlow ? (
              <div style={{ flex: 1, minHeight: 240 }}>
                <CashflowChart data={wallet} />
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  minHeight: 240,
                  fontSize: 13,
                  color: "var(--wb-fg-muted)",
                }}
              >
                Chưa có dữ liệu trong kỳ này
              </div>
            )}
          </div>
        </div>

        <div className="wb-card">
          <div className="wb-card__body">
            <span className="cashy-card-eyebrow">Cơ cấu chi</span>
            <h3 className="cashy-card-title" style={{ marginBottom: 14 }}>
              Chi theo danh mục
            </h3>
            <SpendChart slices={slices} total={t.expense} size={168} />
            <div className="cashy-rank" style={{ marginTop: 18 }}>
              {slices.slice(0, 5).map((s) => (
                <div key={s.id} className="cashy-rank__row">
                  <div className="cashy-rank__head">
                    <span className="cashy-dot cashy-dot--sm" style={{ background: s.colorHex }} />
                    <span className="cashy-rank__name">{s.name}</span>
                    <span className="cashy-rank__val">{Math.round(s.pct * 100)}%</span>
                  </div>
                  <div className="wb-progress">
                    <div
                      className="wb-progress__bar"
                      style={{
                        width: `${Math.max(4, (s.pct / maxSlice) * 100)}%`,
                        // full category hue, matching its donut slice (web-builder
                        // ranked bars use the bright chart colour, not a soft tint)
                        background: s.colorHex,
                      }}
                    />
                  </div>
                </div>
              ))}
              {slices.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>
                  Chưa có chi tiêu trong kỳ.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Insights — derived facts a KPI grid alone doesn't state */}
      {hasFlow && (
        <div className="wb-card">
          <div className="wb-card__body">
            <span className="cashy-card-eyebrow">Nhận định</span>
            <h3 className="cashy-card-title" style={{ marginBottom: 16 }}>
              Chỉ số chi tiêu
            </h3>
            <div className="cashy-insights">
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">savings</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Tỷ lệ tiết kiệm</div>
                  <div
                    className="cashy-insight__value"
                    style={{
                      color:
                        insights.savingsRate == null
                          ? undefined
                          : insights.savingsRate >= 0
                            ? "var(--wb-success-text)"
                            : "var(--wb-danger-text)",
                    }}
                  >
                    {insights.savingsRate == null
                      ? "—"
                      : `${Math.round(insights.savingsRate * 100)}%`}
                  </div>
                  <div className="cashy-insight__hint">phần thu nhập giữ lại</div>
                </div>
              </div>
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">today</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Chi trung bình</div>
                  <div className="cashy-insight__value">
                    {formatMoneyShort(insights.avgPerDay)}
                  </div>
                  <div className="cashy-insight__hint">mỗi ngày ({insights.daysElapsed} ngày)</div>
                </div>
              </div>
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">insights</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Dự kiến cả tháng</div>
                  <div className="cashy-insight__value">
                    {insights.projected == null ? "—" : formatMoneyShort(insights.projected)}
                  </div>
                  <div className="cashy-insight__hint">
                    {insights.projected == null ? "chỉ tính cho tháng này" : "nếu giữ nhịp hiện tại"}
                  </div>
                </div>
              </div>
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">local_fire_department</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Chi lớn nhất</div>
                  <div className="cashy-insight__value">
                    {insights.topExpense ? formatMoneyShort(insights.topExpense.amount) : "—"}
                  </div>
                  <div className="cashy-insight__hint">
                    {insights.topExpense ? insights.topExpense.note : "chưa có chi tiêu"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="wb-stack" style={{ "--wb-stack-gap": "16px" } as CSSProperties}>
        <TxFilterBar q={q} tags={tags} count={q.filtered.length} showPeriod={false} />
        <TransactionTable
          rows={q.sorted}
          categories={categories}
          tags={tags}
          pageSize={20}
          title="Giao dịch gần đây"
          headerActions={
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm wb-btn--round"
              style={{ gap: 4 }}
              onClick={() => navigate("transactions")}
            >
              Xem tất cả
              <span className="wb-ico wb-ico--xs">arrow_forward</span>
            </button>
          }
          emptyState={
            <EmptyState
              icon="👛"
              title="Chưa có giao dịch"
              description="Thêm giao dịch đầu tiên để thấy tổng quan chi tiêu."
              action={
                <button type="button" className="wb-btn" onClick={() => openTxEditor(null)}>
                  Thêm giao dịch
                </button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
