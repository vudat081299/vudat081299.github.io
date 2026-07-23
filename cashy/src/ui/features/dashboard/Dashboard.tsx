import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useCashy } from "@/data/store";
import { deleteTransaction } from "@/usecases";
import { daysBetween, todayYMD } from "@/domain/date";
import {
  breakdown,
  filterTx,
  foldTailSlices,
  forecastSeries,
  monthlyNetRate,
  needsPaymentNow,
  OTHER_SLICE_ID,
  pctChange,
  periodInsights,
  rankTags,
  totals,
  walletSeries,
  type ChartBucket,
  type Steadiness,
} from "@/domain";
import { periodLabel, prevRange } from "@/domain/period";
import { useStableSubOrder } from "@/ui/features/subscriptions/useStableSubOrder";
import { useAtScrollEnd } from "@/ui/features/dashboard/useAtScrollEnd";
import { useTxQuery } from "@/ui/features/transactions/useTxQuery";
import { navigate } from "@/lib/router";
import { formatMoney, formatMoneyShort } from "@/domain/money";
import { openTxEditor } from "@/lib/modals";
import { PageHeader } from "@/ui/common/PageHeader";
import { ScrollArea } from "@/ui/kit/ScrollArea";
import { BalanceCard } from "@/ui/features/dashboard/BalanceCard";
import { BalanceForecastChart } from "@/ui/features/dashboard/BalanceForecastChart";
import { CashflowChart } from "@/ui/features/dashboard/CashflowChart";
import { SpendChart } from "@/ui/features/dashboard/SpendChart";
import { PeriodPicker } from "@/ui/common/PeriodPicker";
import { ConnectedSubscriptionCard } from "@/ui/features/subscriptions/ConnectedSubscriptionCard";
import { TxFilterBar } from "@/ui/features/transactions/TxFilterBar";
import { TransactionTable } from "@/ui/features/transactions/TransactionTable";
import { EmptyState } from "@/ui/common/EmptyState";

/** Plain-language wording for the daily-spend steadiness band (see periodInsights).
 *  The band already hides the "coefficient of variation" — this hides the jargon. */
const STEADINESS: Record<Steadiness, { label: string; hint: string }> = {
  "very-steady": { label: "Very steady", hint: "barely changes day to day" },
  steady: { label: "Steady", hint: "fairly consistent day to day" },
  uneven: { label: "Uneven", hint: "some days spike above the rest" },
  erratic: { label: "Erratic", hint: "a few days dominate the total" },
};

export function Dashboard() {
  // The query owns the period so the header picker, the charts AND the table all
  // move together; type/search/tag filters narrow the table only (not the charts).
  const { transactions, categories, tags, subscriptions, subIconStyle } = useCashy();
  const q = useTxQuery(transactions, categories);

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

  // Services that want attention first, then the rest; cancelled ones sink.
  // Sorted once, then held stable so editing a card never reorders it.
  const subCards = useStableSubOrder(subscriptions, transactions);
  const dueCount = subscriptions.filter((s) => needsPaymentNow(s, transactions)).length;
  // When the strip is a peek-scroll (> 6), drop its foot fade once scrolled to
  // the end so the last row reads clearly instead of dissolving.
  const subPeek = useAtScrollEnd<HTMLDivElement>();
  const subScroll = subCards.length > 6;

  // Insights — a strip of plain-language facts a KPI grid alone doesn't state.
  // Each is one derived truth about the period, written for someone who has never
  // heard the word "median". Spending less than last period is the GOOD direction,
  // so that delta greens when it falls and reds when it climbs.
  const spendDelta = pctChange(t.expense, tp.expense);
  const steady = insights.steadiness ? STEADINESS[insights.steadiness] : null;
  const insightTiles: {
    icon: string;
    label: string;
    value: string;
    hint: string;
    color?: string;
  }[] = [
    {
      icon: "savings",
      label: "Savings rate",
      value: insights.savingsRate == null ? "—" : `${Math.round(insights.savingsRate * 100)}%`,
      hint: "of income kept",
      color:
        insights.savingsRate == null
          ? undefined
          : insights.savingsRate >= 0
            ? "var(--wb-success-text)"
            : "var(--wb-danger-text)",
    },
    {
      icon: spendDelta != null && spendDelta > 0 ? "trending_up" : "trending_down",
      label: "Spending vs last period",
      value:
        spendDelta == null
          ? "—"
          : `${spendDelta > 0 ? "+" : spendDelta < 0 ? "−" : ""}${Math.abs(Math.round(spendDelta * 100))}%`,
      hint:
        spendDelta == null
          ? "no earlier period yet"
          : spendDelta > 0
            ? "you spent more"
            : spendDelta < 0
              ? "you spent less"
              : "about the same",
      color:
        spendDelta == null || spendDelta === 0
          ? undefined
          : spendDelta < 0
            ? "var(--wb-success-text)"
            : "var(--wb-danger-text)",
    },
    {
      icon: "today",
      label: "Average per day",
      value: formatMoneyShort(insights.avgPerDay),
      hint: `over ${insights.daysElapsed} ${insights.daysElapsed === 1 ? "day" : "days"}`,
    },
    {
      icon: "speed",
      label: "Typical day",
      value: formatMoneyShort(insights.medianPerDay),
      hint:
        insights.medianPerDay > 0 && insights.avgPerDay > insights.medianPerDay * 1.3
          ? "a few big days lift the average"
          : "close to your average",
    },
    {
      icon: "show_chart",
      label: "How steady",
      value: steady?.label ?? "—",
      hint: steady?.hint ?? "not enough spending yet",
    },
    {
      icon: "donut_small",
      label: "Top category",
      value: insights.topCategory ? `${Math.round(insights.topCategory.pct * 100)}%` : "—",
      hint: insights.topCategory ? `on ${insights.topCategory.name}` : "no spending yet",
    },
    {
      icon: "insights",
      label: "This month's forecast",
      value: insights.projected == null ? "—" : formatMoneyShort(insights.projected),
      hint: insights.projected == null ? "this month only" : "at the current pace",
    },
    {
      icon: "local_fire_department",
      label: "Largest expense",
      value: insights.topExpense ? formatMoneyShort(insights.topExpense.amount) : "—",
      hint: insights.topExpense ? insights.topExpense.note : "nothing spent yet",
    },
  ];

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

      {/* Where the balance is headed: today's number carried forward at the
          period's monthly net. Arithmetic, not a trend model — see the chart. */}
      <div className="wb-card">
        <div className="wb-card__body">
          <div
            className="wb-cluster wb-cluster--between"
            style={{ marginBottom: 16, gap: 10 }}
          >
            <div>
              <span className="cashy-card-eyebrow">Forecast</span>
              <h3 className="cashy-card-title">Projected balance</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--wb-fg-muted)" }}>
                Today's balance, compounding{" "}
                <strong style={{ color: "var(--wb-fg)", fontWeight: 650 }}>
                  {monthlyNet >= 0 ? "+" : ""}
                  {formatMoneyShort(monthlyNet)}
                </strong>{" "}
                net per month
              </p>
            </div>
            <div className="wb-tabs wb-tabs--pill" role="group" aria-label="Forecast horizon">
              {[6, 12, 24].map((mo) => (
                <button
                  key={mo}
                  type="button"
                  className={horizon === mo ? "wb-tab is-active" : "wb-tab"}
                  onClick={() => setHorizon(mo)}
                >
                  {mo} mo
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 260 }}>
            <BalanceForecastChart data={forecast} />
          </div>
        </div>
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
          {/* Past 6 services the strip stops growing the page: it caps at ~2.5
              rows and scrolls, with the foot half-row fading out to signal more.
              (`Manage` opens the full, unclipped list.) */}
          <div
            ref={subPeek.ref}
            className={
              subScroll
                ? `cashy-subgrid cashy-subgrid--scroll${subPeek.atEnd ? " is-at-bottom" : ""}`
                : "cashy-subgrid"
            }
          >
            {subCards.map((sub) => (
              <ConnectedSubscriptionCard
                key={sub.id}
                sub={sub}
                txs={transactions}
                iconStyle={subIconStyle}
              />
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
              style={{ marginBottom: 16, gap: 10, alignItems: "flex-start" }}
            >
              {/* LEFT: title + the colour key. The legend is only ever read, so it
                  belongs beside the heading it explains, not out at the edge. */}
              <div>
                <span className="cashy-card-eyebrow">Cash flow</span>
                <h3 className="cashy-card-title">Wallet balance &amp; spending</h3>
                <div className="wb-legend" style={{ marginTop: 8 }}>
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
              {/* RIGHT: the Day / Week / Month roll-up — the one control the user
                  operates. Built from the kit's segmented primitive (wb-tabs--pill),
                  not a bespoke one. Only offered past a 30-day window (see spanDays). */}
              {showBucketToggle && (
                <div className="wb-tabs wb-tabs--pill" role="group" aria-label="Chart granularity">
                  {(
                    [
                      ["day", "Day"],
                      ["week", "Week"],
                      ["month", "Month"],
                    ] as [ChartBucket, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={chartBucket === key ? "wb-tab is-active" : "wb-tab"}
                      onClick={() => setBucketOverride(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
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
            <SpendChart
              slices={slices}
              total={t.expense}
              size={168}
              selectedId={selectedCat}
              onSelect={setSelectedCat}
            />
            {/* EVERY category in the period is listed (not just the top few); each
                row toggles its slice on the donut. Themed scroll container so a
                long list scrolls under the kit's thin scrollbar, not the OS one. */}
            <ScrollArea className="cashy-rank" style={{ marginTop: 18 }}>
              {slices.map((s) => {
                const on = s.id === selectedCat;
                const dim = selectedCat !== null && !on;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={
                      "cashy-rank__row" +
                      (on ? " cashy-rank__row--active" : "") +
                      (dim ? " cashy-rank__row--dim" : "")
                    }
                    onClick={() => setSelectedCat(on ? null : s.id)}
                  >
                    <div className="cashy-rank__head">
                      <span className="cashy-dot cashy-dot--sm" style={{ background: s.colorHex }} />
                      <span className="cashy-rank__name">
                        {s.name}
                        {s.id === OTHER_SLICE_ID && s.count
                          ? ` · ${s.count} categories`
                          : ""}
                      </span>
                      <span className="wb-num cashy-rank__amt">{formatMoney(s.total)}</span>
                      <span className="wb-num cashy-rank__val">{Math.round(s.pct * 100)}%</span>
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
                  </button>
                );
              })}
              {slices.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: 0 }}>
                  No spending in this period.
                </p>
              )}
            </ScrollArea>
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
              {insightTiles.map((tile) => (
                <div className="cashy-insight" key={tile.label}>
                  <span className="cashy-insight__ico">
                    <span className="wb-ico wb-ico--sm">{tile.icon}</span>
                  </span>
                  <div>
                    <div className="cashy-insight__label">{tile.label}</div>
                    <div
                      className="cashy-insight__value"
                      style={tile.color ? { color: tile.color } : undefined}
                    >
                      {tile.value}
                    </div>
                    <div className="cashy-insight__hint">{tile.hint}</div>
                  </div>
                </div>
              ))}
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
          onDelete={(ids) => ids.forEach(deleteTransaction)}
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
