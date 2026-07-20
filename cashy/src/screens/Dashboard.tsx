import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useCashy } from "@/lib/store";
import { breakdown, filterTx, pctChange, timeSeries, totals } from "@/lib/domain";
import { periodRange, prevRange, type PeriodKey } from "@/lib/period";
import { formatMoney } from "@/lib/money";
import { navigate } from "@/lib/router";
import { openTxEditor } from "@/components/TransactionEditor";
import { BalanceCard } from "@/components/BalanceCard";
import { SpendChart } from "@/components/SpendChart";
import { TransactionRow } from "@/components/TransactionRow";
import { PeriodPicker } from "@/components/PeriodPicker";
import { EmptyState } from "@/components/EmptyState";

function TrendChart({
  data,
}: {
  data: { label: string; income: number; expense: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="var(--wb-border)" strokeDasharray="2 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "var(--wb-fg-muted)" }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <Tooltip
          cursor={{ fill: "var(--wb-surface-2)" }}
          formatter={(v, name) => [formatMoney(Number(v)), name === "income" ? "Thu" : "Chi"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--wb-border)",
            background: "var(--wb-surface)",
            fontSize: 12,
            color: "var(--wb-fg)",
          }}
          labelStyle={{ color: "var(--wb-fg-muted)" }}
        />
        <Bar dataKey="income" fill="var(--wb-chart-income)" radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        <Bar dataKey="expense" fill="var(--wb-chart-expense)" radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dashboard() {
  const { transactions, categories } = useCashy();
  const [period, setPeriod] = useState<PeriodKey>("this-month");

  const view = useMemo(() => {
    const range = periodRange(period);
    const prev = prevRange(period);
    const cur = filterTx(transactions, { range });
    const prevTx = filterTx(transactions, { range: prev });
    const t = totals(cur);
    const tp = totals(prevTx);
    const series = timeSeries(cur, range);
    const slices = breakdown(cur, "expense", categories);
    const recent = [...cur]
      .sort(
        (a, b) =>
          b.occurredAt.localeCompare(a.occurredAt) ||
          b.createdAt.localeCompare(a.createdAt),
      )
      .slice(0, 6);
    return { balance: totals(transactions).net, t, tp, series, slices, recent, count: cur.length };
  }, [transactions, categories, period]);

  const { t, tp, series, slices, recent } = view;
  const incomeSpark = series.map((s) => s.income);
  const expenseSpark = series.map((s) => s.expense);
  const netSpark = series.map((s) => s.income - s.expense);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Tổng quan</h2>
          <p style={{ marginTop: 2, fontSize: 13, color: "var(--wb-fg-muted)" }}>
            {view.count} giao dịch trong kỳ
          </p>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="cashy-stat-grid">
        <BalanceCard label="Số dư (tất cả)" amount={view.balance} spark={netSpark} />
        <BalanceCard
          label="Thu nhập"
          amount={t.income}
          tone="income"
          delta={pctChange(t.income, tp.income)}
          spark={incomeSpark}
        />
        <BalanceCard
          label="Chi tiêu"
          amount={t.expense}
          tone="expense"
          delta={pctChange(t.expense, tp.expense)}
          spark={expenseSpark}
        />
        <BalanceCard
          label="Chênh lệch"
          amount={t.net}
          tone={t.net >= 0 ? "income" : "expense"}
          delta={pctChange(t.net, tp.net)}
        />
      </div>

      <div className="cashy-panel-grid">
        <div className="wb-card cashy-panel-grid__wide">
          <div className="wb-card__body">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 650, margin: 0 }}>Thu / Chi theo thời gian</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--wb-fg-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--wb-chart-income)" }} /> Thu
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--wb-chart-expense)" }} /> Chi
                </span>
              </div>
            </div>
            {t.income || t.expense ? (
              <TrendChart data={series} />
            ) : (
              <div style={{ display: "grid", placeItems: "center", height: 210, fontSize: 13, color: "var(--wb-fg-muted)" }}>
                Chưa có dữ liệu trong kỳ này
              </div>
            )}
          </div>
        </div>

        <div className="wb-card">
          <div className="wb-card__body">
            <h3 style={{ fontSize: 14, fontWeight: 650, margin: "0 0 12px" }}>Chi tiêu theo danh mục</h3>
            <SpendChart slices={slices} total={t.expense} size={180} />
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {slices.slice(0, 5).map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, flex: "none", borderRadius: 3, background: s.colorHex }} />
                  <span style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </span>
                  <span className="wb-num" style={{ color: "var(--wb-fg-muted)" }}>
                    {Math.round(s.pct * 100)}%
                  </span>
                </div>
              ))}
              {slices.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>Chưa có chi tiêu.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="wb-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "var(--wb-bw) solid var(--wb-border)",
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 650, margin: 0 }}>Giao dịch gần đây</h3>
          <button
            type="button"
            className="wb-btn wb-btn--ghost wb-btn--sm"
            style={{ gap: 4 }}
            onClick={() => navigate("transactions")}
          >
            Xem tất cả
            <span className="wb-ico wb-ico--xs">arrow_forward</span>
          </button>
        </div>
        {recent.length ? (
          <div className="wb-list wb-list--flush">
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                category={categories.find((c) => c.id === tx.categoryId) ?? null}
                onClick={() => openTxEditor(tx.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: 16 }}>
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
          </div>
        )}
      </div>
    </div>
  );
}
