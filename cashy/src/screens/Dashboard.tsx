import { useMemo, useState, type CSSProperties } from "react";
import { useCashy } from "@/lib/store";
import { daysBetween, todayYMD } from "@/lib/date";
import {
  breakdown,
  filterTx,
  needsPaymentNow,
  pctChange,
  periodInsights,
  rankTags,
  totals,
  walletSeries,
} from "@/lib/domain";
import { periodLabel, prevRange } from "@/lib/period";
import { useStableSubOrder } from "@/lib/useStableSubOrder";
import { useTxQuery } from "@/lib/useTxQuery";
import { navigate } from "@/lib/router";
import { formatMoneyShort } from "@/lib/money";
import { openTxEditor } from "@/components/TransactionEditor";
import { PageHeader } from "@/components/PageHeader";
import { BalanceCard } from "@/components/BalanceCard";
import { CashflowChart } from "@/components/CashflowChart";
import { SpendChart } from "@/components/SpendChart";
import { PeriodPicker } from "@/components/PeriodPicker";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { TxFilterBar } from "@/components/tx/TxFilterBar";
import { TransactionTable } from "@/components/tx/TransactionTable";
import { EmptyState } from "@/components/EmptyState";

export function Dashboard() {
  // The query owns the period so the header picker, the charts AND the table all
  // move together; type/search/tag filters narrow the table only (not the charts).
  const { transactions, categories, tags, subscriptions } = useCashy();
  const q = useTxQuery(transactions, categories);

  const view = useMemo(() => {
    const cur = filterTx(transactions, { range: q.range });
    const t = totals(cur);
    const tp = totals(filterTx(transactions, { range: prevRange(q.period, new Date(), q.custom) }));
    const slices = breakdown(cur, "expense", categories);
    const insights = periodInsights(cur, q.range, categories);
    return { balance: totals(transactions).net, t, tp, slices, insights, count: cur.length };
  }, [transactions, categories, q.range, q.period, q.custom]);

  const { t, tp, slices, insights } = view;

  // Cash-flow bars run per day by default; over a 30–62 day window that gets
  // busy, so offer a weekly roll-up. The toggle only appears in that band — a
  // short window is fine daily, a long one is already auto-bucketed by month.
  const spanDays = useMemo(() => {
    let s = q.range.start;
    let e = q.range.end;
    if (s === "0000-01-01" || e === "9999-12-31") {
      const ds = transactions.map((tx) => tx.occurredAt).sort();
      s = ds[0] ?? todayYMD();
      e = ds[ds.length - 1] ?? todayYMD();
    }
    return daysBetween(s, e) + 1;
  }, [q.range, transactions]);
  const canWeekly = spanDays >= 30 && spanDays <= 62;
  const [chartBucket, setChartBucket] = useState<"day" | "week">("day");
  const weekly = canWeekly && chartBucket === "week";
  const wallet = useMemo(
    () => walletSeries(transactions, q.range, weekly),
    [transactions, q.range, weekly],
  );
  const maxSlice = slices[0]?.pct || 1;
  const hasFlow = Boolean(t.income || t.expense);

  // Balance grows/shrinks by this period's net; compare to where it started.
  const balanceStart = view.balance - t.net;
  const balanceDelta = balanceStart !== 0 ? t.net / Math.abs(balanceStart) : null;

  // Tags inked & ordered by how much the whole ledger uses them, not by age.
  const tagRanks = useMemo(() => rankTags(tags, transactions), [tags, transactions]);
  const tagRankMap = useMemo(
    () => new Map(tagRanks.map((r) => [r.tag.id, r] as const)),
    [tagRanks],
  );

  // Services that want attention first, then the rest; cancelled ones sink.
  // Sorted once, then held stable so editing a card never reorders it.
  const subCards = useStableSubOrder(subscriptions);
  const dueCount = subscriptions.filter((s) => needsPaymentNow(s)).length;

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Overview"
        subtitle={`${view.count} transactions · ${periodLabel(q.period, q.custom)}`}
        actions={<PeriodPicker value={q.period} custom={q.custom} onChange={q.setPeriod} />}
      />

      <div className="wb-stat-grid">
        <BalanceCard
          label="Balance (all time)"
          amount={view.balance}
          icon="account_balance_wallet"
          delta={balanceDelta}
          note="vs. start of period"
        />
        <BalanceCard
          label="Income"
          amount={t.income}
          icon="trending_up"
          delta={pctChange(t.income, tp.income)}
        />
        <BalanceCard
          label="Spending"
          amount={t.expense}
          icon="trending_down"
          delta={pctChange(t.expense, tp.expense)}
        />
        <BalanceCard
          label="Net"
          amount={t.net}
          icon="swap_vert"
          delta={pctChange(t.net, tp.net)}
        />
      </div>

      {/* One card per service: what was paid, what is owed, how far through the
          period we are, and the way out. */}
      {subCards.length > 0 && (
        <div className="wb-stack" style={{ "--wb-stack-gap": "14px" } as CSSProperties}>
          <div className="wb-cluster wb-cluster--between" style={{ gap: 10 }}>
            <div>
              <span className="cashy-card-eyebrow">Recurring</span>
              <h3 className="cashy-card-title">Subscriptions</h3>
            </div>
            <div className="wb-cluster" style={{ gap: 8 }}>
              {dueCount > 0 && (
                <span className="wb-cap wb-cap--warning">{dueCount} due now</span>
              )}
              <button
                type="button"
                className="wb-btn wb-btn--ghost wb-btn--sm wb-btn--round"
                style={{ gap: 4 }}
                onClick={() => navigate("subscriptions")}
              >
                Manage
                <span className="wb-ico wb-ico--xs">arrow_forward</span>
              </button>
            </div>
          </div>
          <div className="cashy-subgrid">
            {subCards.map((sub) => (
              <SubscriptionCard key={sub.id} sub={sub} txs={transactions} />
            ))}
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
            <div
              className="wb-cluster wb-cluster--between"
              style={{ marginBottom: 16, gap: 10 }}
            >
              <div>
                <span className="cashy-card-eyebrow">Cash flow</span>
                <h3 className="cashy-card-title">Wallet balance &amp; spending</h3>
              </div>
              <div className="wb-cluster" style={{ gap: 12 }}>
                {/* Day ⇄ Week roll-up — only in the 30–62 day band (see above). */}
                {canWeekly && (
                  <div className="cashy-seg" role="group" aria-label="Chart granularity">
                    <button
                      type="button"
                      className={chartBucket === "day" ? "cashy-seg__btn is-active" : "cashy-seg__btn"}
                      onClick={() => setChartBucket("day")}
                    >
                      Ngày
                    </button>
                    <button
                      type="button"
                      className={chartBucket === "week" ? "cashy-seg__btn is-active" : "cashy-seg__btn"}
                      onClick={() => setChartBucket("week")}
                    >
                      Tuần
                    </button>
                  </div>
                )}
                <div className="wb-legend">
                  <span className="wb-legend__item">
                    <span className="wb-legend__dot" style={{ background: "var(--wb-chart-5)" }} />{" "}
                    Wallet balance
                  </span>
                  <span className="wb-legend__item">
                    <span
                      className="wb-legend__dot"
                      style={{ background: "var(--wb-chart-expense)" }}
                    />{" "}
                    Spending
                  </span>
                </div>
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
                Nothing recorded in this period
              </div>
            )}
          </div>
        </div>

        <div className="wb-card">
          <div className="wb-card__body">
            <span className="cashy-card-eyebrow">Breakdown</span>
            <h3 className="cashy-card-title" style={{ marginBottom: 14 }}>
              Spending by category
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
                  No spending in this period.
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
            <span className="cashy-card-eyebrow">Insights</span>
            <h3 className="cashy-card-title" style={{ marginBottom: 16 }}>
              Spending indicators
            </h3>
            <div className="cashy-insights">
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">savings</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Savings rate</div>
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
                  <div className="cashy-insight__hint">of income kept</div>
                </div>
              </div>
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">today</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Average spend</div>
                  <div className="cashy-insight__value">
                    {formatMoneyShort(insights.avgPerDay)}
                  </div>
                  <div className="cashy-insight__hint">
                    per day ({insights.daysElapsed} days)
                  </div>
                </div>
              </div>
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">insights</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Full-month forecast</div>
                  <div className="cashy-insight__value">
                    {insights.projected == null ? "—" : formatMoneyShort(insights.projected)}
                  </div>
                  <div className="cashy-insight__hint">
                    {insights.projected == null ? "this month only" : "at the current pace"}
                  </div>
                </div>
              </div>
              <div className="cashy-insight">
                <span className="cashy-insight__ico">
                  <span className="wb-ico wb-ico--sm">local_fire_department</span>
                </span>
                <div>
                  <div className="cashy-insight__label">Largest expense</div>
                  <div className="cashy-insight__value">
                    {insights.topExpense ? formatMoneyShort(insights.topExpense.amount) : "—"}
                  </div>
                  <div className="cashy-insight__hint">
                    {insights.topExpense ? insights.topExpense.note : "nothing spent yet"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="wb-stack" style={{ "--wb-stack-gap": "16px" } as CSSProperties}>
        <TxFilterBar q={q} tagRanks={tagRanks} categories={categories} />
        <TransactionTable
          rows={q.sorted}
          categories={categories}
          tagRanks={tagRankMap}
          pageSize={20}
          title="Recent transactions"
          headerActions={
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm wb-btn--round"
              style={{ gap: 4 }}
              onClick={() => navigate("transactions")}
            >
              View all
              <span className="wb-ico wb-ico--xs">arrow_forward</span>
            </button>
          }
          emptyState={
            <EmptyState
              icon="👛"
              title="No transactions yet"
              description="Add your first transaction to see the overview come to life."
              action={
                <button type="button" className="wb-btn" onClick={() => openTxEditor(null)}>
                  Add transaction
                </button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
