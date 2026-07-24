import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useCashy } from "@/data/store";
import { deleteTransaction } from "@/usecases";
import { daysBetween, todayYMD } from "@/domain/date";
import {
  breakdown,
  filterTx,
  foldTailSlices,
  forecastSeries,
  loansNetWorth,
  monthlyNetRate,
  needsPaymentNow,
  netWorth,
  pctChange,
  periodInsights,
  rankTags,
  totalPayable,
  totalReceivable,
  totals,
  walletBalances,
  walletSeries,
  type ChartBucket,
} from "@/domain";
import { periodLabel, prevRange } from "@/domain/period";
import { useSubFilter } from "@/ui/features/subscriptions/useSubFilter";
import { useAtScrollEnd } from "@/ui/features/dashboard/useAtScrollEnd";
import { useTxQuery } from "@/ui/features/transactions/useTxQuery";
import { navigate } from "@/lib/router";
import { openTxEditor } from "@/lib/modals";
import { PageHeader } from "@/ui/common/PageHeader";
import { BalanceCard } from "@/ui/features/dashboard/BalanceCard";
import { PeriodPicker } from "@/ui/common/PeriodPicker";
import { TxFilterBar } from "@/ui/features/transactions/TxFilterBar";
import { TransactionTable } from "@/ui/features/transactions/TransactionTable";
import { EmptyState } from "@/ui/kit/EmptyState";
import { Button } from "@/ui/kit/Button";
import { BalancesCard } from "./BalancesCard";
import { ForecastCard } from "./ForecastCard";
import { DashboardSubscriptions } from "./DashboardSubscriptions";
import { CashflowCard } from "./CashflowCard";
import { CategoryBreakdownCard } from "./CategoryBreakdownCard";
import { InsightsCard } from "./InsightsCard";

export function Dashboard() {
  // The query owns the period so the header picker, the charts AND the table all
  // move together; type/search/tag filters narrow the table only (not the charts).
  const { transactions, categories, tags, subscriptions, subIconStyle, wallets, loans } = useCashy();
  const q = useTxQuery(transactions, categories);

  // Balances strip under the KPIs: wallet balances + a true net worth of
  // assets − debts (wallets net, minus what you owe, plus what's owed to you).
  // Derived from the whole ledger (not the period): a balance is a running total.
  const walletBals = useMemo(() => walletBalances(wallets, transactions), [wallets, transactions]);
  const walletNet = useMemo(() => netWorth(wallets, transactions), [wallets, transactions]);
  const shownWallets = useMemo(
    () => wallets.filter((w) => !w.archived).sort((a, b) => a.order - b.order),
    [wallets],
  );
  const hasLoans = useMemo(() => loans.some((l) => !l.archived), [loans]);
  const loansNet = useMemo(() => loansNetWorth(loans), [loans]); // receivable − payable
  const payable = useMemo(() => totalPayable(loans), [loans]);
  const receivable = useMemo(() => totalReceivable(loans), [loans]);
  const netWorthAll = walletNet + loansNet;

  const view = useMemo(() => {
    const cur = filterTx(transactions, { range: q.range });
    const t = totals(cur);
    const tp = totals(filterTx(transactions, { range: prevRange(q.period, new Date(), q.custom) }));
    // Fold the long tail of tiny categories (≤5% combined) into one grey "Other"
    // slice so the donut and its list read as a handful of real categories.
    const slices = foldTailSlices(breakdown(cur, "expense", categories));
    const insights = periodInsights(cur, q.range, categories);
    return { balance: totals(transactions).net, t, tp, slices, insights, count: cur.length };
  }, [transactions, categories, q.range, q.period, q.custom]);

  const { t, tp, slices, insights } = view;

  // Cash-flow bars run per day for a short window. The moment the range is longer
  // than 30 days (60/90 days, 2–3 months…) a daily bar per day gets dense, so the
  // user gets a Ngày / Tuần / Tháng roll-up toggle to pick the granularity. A
  // window of a month or less stays daily with no toggle; multi-year "All time"
  // (>800 days) auto-buckets by year, also with no toggle — daily/weekly there
  // would be thousands of bars.
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
  const showBucketToggle = spanDays > 30 && spanDays <= 800;
  // User's explicit pick (null = follow the sensible default for this span). Reset
  // whenever the range changes so each window opens at its natural granularity.
  const [bucketOverride, setBucketOverride] = useState<ChartBucket | null>(null);
  useEffect(() => {
    setBucketOverride(null);
  }, [q.range.start, q.range.end]);
  const defaultBucket: ChartBucket = spanDays > 62 ? "month" : "day";
  const chartBucket: ChartBucket | "auto" = showBucketToggle
    ? (bucketOverride ?? defaultBucket)
    : "auto";
  // Selected category on the spend-by-category donut (shared with the legend list
  // so the two stay in lock-step). Cleared when the period changes.
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  useEffect(() => {
    setSelectedCat(null);
  }, [q.range.start, q.range.end]);
  const wallet = useMemo(
    () => walletSeries(transactions, q.range, chartBucket),
    [transactions, q.range, chartBucket],
  );
  const maxSlice = slices[0]?.pct || 1;
  const hasFlow = Boolean(t.income || t.expense);

  // Forecast: extend today's balance forward at the selected period's net,
  // normalised to a per-month rate so any window (30 days, 3 months…) projects
  // the same "money per average month". The horizon is how far ahead to walk it.
  const [horizon, setHorizon] = useState(12);
  const monthlyNet = useMemo(() => monthlyNetRate(t.net, spanDays), [t.net, spanDays]);
  const forecast = useMemo(
    () => forecastSeries(view.balance, monthlyNet, horizon),
    [view.balance, monthlyNet, horizon],
  );

  // Balance grows/shrinks by this period's net; compare to where it started.
  const balanceStart = view.balance - t.net;
  const balanceDelta = balanceStart !== 0 ? t.net / Math.abs(balanceStart) : null;

  // Tags inked & ordered by how much the whole ledger uses them, not by age.
  const tagRanks = useMemo(() => rankTags(tags, transactions), [tags, transactions]);
  const tagRankMap = useMemo(
    () => new Map(tagRanks.map((r) => [r.tag.id, r] as const)),
    [tagRanks],
  );

  // Services that want attention first (the pure "by status" default), plus the
  // shared filter/sort — the same one the Subscriptions screen uses, so the strip
  // and the full screen order identically. Ordering is live: marking a service
  // paid moves it out of the "due" cluster, which is coherent feedback here.
  const subFilter = useSubFilter(subscriptions, transactions, wallets);
  const subCards = subFilter.result;
  const dueCount = subscriptions.filter((s) => needsPaymentNow(s, transactions)).length;
  // Past six services the strip becomes a peek-scroll AND grows a filter bar.
  const showSubFilter = subscriptions.length > 6;
  // When the strip is a peek-scroll (> 6 shown), drop its foot fade once scrolled
  // to the end so the last row reads clearly instead of dissolving.
  const subPeek = useAtScrollEnd<HTMLDivElement>();
  const subScroll = subCards.length > 6;

  // Insights — a strip of plain-language facts a KPI grid alone doesn't state.
  // Each is one derived truth about the period, written for someone who has never
  // heard the word "median". Spending less than last period is the GOOD direction,
  // so that delta greens when it falls and reds when it climbs.
  const spendDelta = pctChange(t.expense, tp.expense);

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
          muted
        />
        <BalanceCard
          label="Spending"
          amount={t.expense}
          icon="trending_down"
          delta={pctChange(t.expense, tp.expense)}
          muted
        />
        <BalanceCard
          label="Net"
          amount={t.net}
          icon="swap_vert"
          delta={pctChange(t.net, tp.net)}
          muted
        />
      </div>

      {/* Balances — wallet balances + loans net into a true net worth (assets −
          debts). Full editors live at #/wallets and #/loans. */}
      {(shownWallets.length > 0 || hasLoans) && <BalancesCard shownWallets={shownWallets} hasLoans={hasLoans} walletBals={walletBals} walletNet={walletNet} netWorthAll={netWorthAll} payable={payable} receivable={receivable} loansNet={loansNet} />}

      {/* Where the balance is headed: today's number carried forward at the
          period's monthly net. Arithmetic, not a trend model — see the chart. */}
      <ForecastCard monthlyNet={monthlyNet} forecast={forecast} horizon={horizon} setHorizon={setHorizon} />

      {/* One card per service: what was paid, what is owed, how far through the
          period we are, and the way out. */}
      {subscriptions.length > 0 && <DashboardSubscriptions dueCount={dueCount} showSubFilter={showSubFilter} subFilter={subFilter} subCards={subCards} subPeek={subPeek} subScroll={subScroll} transactions={transactions} subIconStyle={subIconStyle} />}

      <div className="wb-grid wb-grid--3">
        <CashflowCard showBucketToggle={showBucketToggle} chartBucket={chartBucket} setBucketOverride={setBucketOverride} hasFlow={hasFlow} wallet={wallet} />

        <CategoryBreakdownCard slices={slices} total={t.expense} selectedCat={selectedCat} setSelectedCat={setSelectedCat} maxSlice={maxSlice} />
      </div>

      {/* Insights — derived facts a KPI grid alone doesn't state */}
      {hasFlow && <InsightsCard insights={insights} spendDelta={spendDelta} />}

      <div className="wb-stack" style={{ "--wb-stack-gap": "16px" } as CSSProperties}>
        <TxFilterBar q={q} tagRanks={tagRanks} categories={categories} wallets={wallets} />
        <TransactionTable
          rows={q.sorted}
          categories={categories}
          tagRanks={tagRankMap}
          wallets={wallets}
          pageSize={20}
          onDelete={(ids) => ids.forEach(deleteTransaction)}
          title="Recent transactions"
          headerActions={
            <Button
              variant="ghost"
              size="sm"
              round
              type="button"
              style={{ gap: 4 }}
              onClick={() => navigate("transactions")}
            >
              View all
              <span className="wb-ico wb-ico--xs">arrow_forward</span>
            </Button>
          }
          emptyState={
            <EmptyState
              icon="👛"
              title="No transactions yet"
              description="Add your first transaction to see the overview come to life."
              action={
                <Button type="button" onClick={() => openTxEditor(null)}>
                  Add transaction
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
