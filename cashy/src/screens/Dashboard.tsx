import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ArrowRight, Wallet } from "lucide-react";
import { useCashy } from "@/lib/store";
import {
  breakdown,
  filterTx,
  pctChange,
  timeSeries,
  totals,
} from "@/lib/domain";
import { periodRange, prevRange, type PeriodKey } from "@/lib/period";
import { formatMoney } from "@/lib/money";
import { navigate } from "@/lib/router";
import { openTxEditor } from "@/components/TransactionEditor";
import { BalanceCard } from "@/components/BalanceCard";
import { SpendChart } from "@/components/SpendChart";
import { TransactionRow } from "@/components/TransactionRow";
import { PeriodPicker } from "@/components/PeriodPicker";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

function TrendChart({
  data,
}: {
  data: { label: string; income: number; expense: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="2 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--accent))" }}
          formatter={(v, name) => [
            formatMoney(Number(v)),
            name === "income" ? "Thu" : "Chi",
          ]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
        />
        <Bar dataKey="income" fill="hsl(var(--income))" radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[2, 2, 0, 0]} maxBarSize={22} isAnimationActive={false} />
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
    return {
      balance: totals(transactions).net,
      t,
      tp,
      series,
      slices,
      recent,
      count: cur.length,
    };
  }, [transactions, categories, period]);

  const { t, tp, series, slices, recent } = view;
  const incomeSpark = series.map((s) => s.income);
  const expenseSpark = series.map((s) => s.expense);
  const netSpark = series.map((s) => s.income - s.expense);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tổng quan</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {view.count} giao dịch trong kỳ
          </p>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BalanceCard label="Số dư (tất cả)" amount={view.balance} spark={netSpark} sparkColor="hsl(var(--brand))" />
        <BalanceCard
          label="Thu nhập"
          amount={t.income}
          tone="income"
          delta={pctChange(t.income, tp.income)}
          spark={incomeSpark}
          sparkColor="hsl(var(--income))"
        />
        <BalanceCard
          label="Chi tiêu"
          amount={t.expense}
          tone="expense"
          delta={pctChange(t.expense, tp.expense)}
          spark={expenseSpark}
          sparkColor="hsl(var(--expense))"
        />
        <BalanceCard
          label="Chênh lệch"
          amount={t.net}
          tone={t.net >= 0 ? "income" : "expense"}
          delta={pctChange(t.net, tp.net)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Thu / Chi theo thời gian</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-[2px] bg-income" /> Thu
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-[2px] bg-expense" /> Chi
              </span>
            </div>
          </div>
          {t.income || t.expense ? (
            <TrendChart data={series} />
          ) : (
            <div className="grid h-[210px] place-items-center text-[13px] text-muted-foreground">
              Chưa có dữ liệu trong kỳ này
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Chi tiêu theo danh mục</h3>
          <SpendChart slices={slices} total={t.expense} size={180} />
          <div className="mt-4 space-y-1.5">
            {slices.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-[13px]">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.colorHex }} />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="text-muted-foreground tnum">
                  {Math.round(s.pct * 100)}%
                </span>
              </div>
            ))}
            {slices.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Chưa có chi tiêu.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Giao dịch gần đây</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-[13px] text-muted-foreground"
            onClick={() => navigate("transactions")}
          >
            Xem tất cả <ArrowRight size={14} />
          </Button>
        </div>
        {recent.length ? (
          <div className="divide-y p-1">
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
          <div className="p-4">
            <EmptyState
              icon={<Wallet size={18} />}
              title="Chưa có giao dịch"
              description="Thêm giao dịch đầu tiên để thấy tổng quan chi tiêu."
              action={
                <Button size="sm" onClick={() => openTxEditor(null)}>
                  Thêm giao dịch
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
