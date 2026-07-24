# Cashy — Overview / Dashboard (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Overview
> (Dashboard) screen as it exists in the code today. See also:
> [CLAUDE.md](../../CLAUDE.md), [architecture.md](../architecture.md),
> [data-model.md](../data-model.md), [components.md](../components.md).

## 1. What it does

The default landing screen and the app's read-only summary of the ledger. For a
chosen period it shows four KPI tiles (all-time balance, income, spending, net), a
straight-line balance forecast, a subscriptions strip, a cash-flow chart paired
with a spending-by-category donut, a plain-language "spending indicators" strip,
and a recent-transactions table. Everything on the page is derived from the
`transactions` array by pure `domain/` functions — the Dashboard writes nothing
except deleting rows from its own recent-transactions table.

## 2. Screen & route

| | |
|---|---|
| Hash route | `#/dashboard` — also the fallback for any unknown hash (`src/App.tsx`, `router.ts`) |
| Nav label | **Overview** (`src/ui/app/Layout.tsx`) |
| Mounted by | `src/App.tsx` — the `else` branch of the route switch renders `<Dashboard/>` inside `<Layout>` |
| Container | `src/ui/features/dashboard/Dashboard.tsx` |

Layout, top to bottom: `PageHeader` (title + `<PeriodPicker>` action) → 4-up
`wb-stat-grid` KPIs → **Balances card** (net worth + wallet rows + loans; shown
when there's ≥1 wallet or loan) → Forecast card → Subscriptions strip
(conditional) → `wb-grid--3` row (cash-flow card spanning 2 cols + spending-donut
card) → Insights card (conditional) → filter bar + recent-transactions table.

## 3. Data it touches

Reads via `useCashy()`; the only write is `deleteTransaction`.

| Entity | Fields | Read / write |
|---|---|---|
| `Transaction` | `type`, `amount`, `occurredAt`, `status`, `categoryId`, `tagIds`, `note`, `createdAt` | read (all analytics); **delete** via recent-tx table |
| `Category` | `id`, `name`, `parentId`, `colorHex` | read (breakdown roll-up, donut hue) |
| `Tag` | via `rankTags` for the filter bar + table chips | read |
| `Subscription` | via the strip + `needsPaymentNow` | read (cross-ref [subscriptions.md](./subscriptions.md)) |
| `Wallet` | balances, archived state | read (wallet strip + wallet facet; cross-ref [wallets.md](wallets.md)) |
| `Loan` | direction, outstanding, archived state | read (assets − debts net-worth reconciliation; cross-ref [loans.md](loans.md)) |
| `subIconStyle` | `neutral \| brand` | read (passed to subscription cards) |

Money is an integer count of VND; **only `status: "recorded"` counts** — every
total/series here filters through `isCounted` (`domain/txStatus`). Wallet balances
use `walletId`/`toWalletId`; the legacy free-text `account` is display-compatible
history only.

## 4. Domain rules used

Pure functions the screen composes (`@/domain`, re-exported from `domain/index`):

| Function | Source | What it yields |
|---|---|---|
| `totals(txs)` | `domain/transaction.ts` | `{income, expense, net}` over counted rows |
| `filterTx(txs, {range})` | `domain/transaction.ts` | period-scoped rows feeding the KPIs/charts (range only — table filters are separate) |
| `periodRange` / `prevRange` | `domain/period.ts` | the concrete window + its immediately-preceding comparable window (for deltas) |
| `periodLabel` / `periodNote` / `rangeLabel` | `domain/period.ts` | header + picker display strings |
| `breakdown(txs,"expense",cats)` | `domain/analytics.ts` | spend grouped by **root** category → donut slices (`Uncategorised` = grey `#9b9a97`) |
| `foldTailSlices(slices)` | `domain/analytics.ts` | merges the tail of tiny categories (≤5% combined, ≥2 of them) into one grey `Other` slice (`OTHER_SLICE_ID`) |
| `pctChange(cur, prev)` | `domain/analytics.ts` | fractional change vs previous period; `null` when `prev` is 0 |
| `walletSeries(txs, range, bucket)` | `domain/analytics.ts` | per-bucket `{income, expense, balance}`; balance is cumulative net of ALL counted tx to the bucket end; dead end-margins trimmed |
| `periodInsights(txs, range, cats)` | `domain/analytics.ts` | savings rate, avg/median per day, CV→`steadiness`, top category, run-rate `projected`, largest expense, days elapsed/in-period |
| `monthlyNetRate(net, spanDays)` | `domain/analytics.ts` | normalises the period net to money-per-average-month (30.4375-day month) |
| `forecastSeries(balance, monthlyNet, months)` | `domain/analytics.ts` | `ForecastPoint[]` — `balance(k) = current + monthlyNet·k`, point 0 = now |
| `rankTags(tags, txs)` | `domain/tag.ts` | usage-ranked tags for the filter bar + table chips |
| `needsPaymentNow(sub, txs)` | `domain/subscription.ts` | drives the "N due now" count |
| `daysBetween` / `todayYMD` | `domain/date.ts` | span length for the chart-bucket + forecast rate |

## 5. Usecases

Read-only except for one write, invoked from the embedded recent-tx table.

| Usecase | Effect |
|---|---|
| `deleteTransaction(id)` | removes a row (table's bulk-delete calls it per id, `Dashboard.tsx`) |

`navigate("subscriptions" \| "transactions")` (`lib/router`) and `openTxEditor(null)`
(`lib/modals`, opens the singleton editor from the empty state) are lib helpers,
not usecases — the editor itself performs the add-transaction write.

## 6. Components

| Tier | Component | File | Role |
|---|---|---|---|
| Container | `Dashboard` | `ui/features/dashboard/Dashboard.tsx` | thin entry: owns queries/derivations and composes the six organisms below |
| Common | `PageHeader` | `ui/common/PageHeader.tsx` | title + subtitle + actions slot |
| Common | `PeriodPicker` | `ui/common/PeriodPicker.tsx` | period trigger button + popover (the header action) |
| Common | `PeriodPanel` | `ui/common/PeriodPanel.tsx` | panel body: day/month preset radios + custom range |
| Common | `DateRangeInput` | `ui/common/DateRangeInput.tsx` | segmented `dd/mm/yyyy – dd/mm/yyyy` field, live-applies |
| Common | `RangeCalendar` | `ui/common/RangeCalendar.tsx` | click-two-ends range calendar with live preview band |
| Kit | `ScrollArea` | `ui/kit/ScrollArea.tsx` | themed scroll container for the category rank list |
| Kit | `EmptyState` | `ui/kit/EmptyState.tsx` | recent-tx empty state |
| Feature-leaf | `BalanceCard` | `ui/features/dashboard/BalanceCard.tsx` | one KPI tile: icon, value, delta chip vs previous period |
| Feature organism | `BalancesCard` | `ui/features/dashboard/BalancesCard.tsx` | net worth, wallet rows, and loan reconciliation |
| Feature organism | `ForecastCard` | `ui/features/dashboard/ForecastCard.tsx` | horizon controls + `BalanceForecastChart` |
| Feature organism | `DashboardSubscriptions` | `ui/features/dashboard/DashboardSubscriptions.tsx` | recurring header/filter/scrolling subscription grid |
| Feature organism | `CashflowCard` | `ui/features/dashboard/CashflowCard.tsx` | bucket controls + `CashflowChart` |
| Feature organism | `CategoryBreakdownCard` | `ui/features/dashboard/CategoryBreakdownCard.tsx` | `SpendChart` + ranked category list |
| Feature organism | `InsightsCard` | `ui/features/dashboard/InsightsCard.tsx` | presentation mapping for the period insight tiles |
| Feature-leaf | `BalanceForecastChart` | `ui/features/dashboard/BalanceForecastChart.tsx` | filled-area balance projection (recharts `AreaChart`) |
| Feature-leaf | `CashflowChart` | `ui/features/dashboard/CashflowChart.tsx` | spending bars (right axis) + running-balance area (left axis), `ComposedChart` |
| Feature-leaf | `SpendChart` | `ui/features/dashboard/SpendChart.tsx` | interactive hand-drawn SVG donut, selection controlled by parent |
| Feature-leaf | `ConnectedSubscriptionCard` | `ui/features/subscriptions/…` | one subscription card in the strip (cross-ref [subscriptions.md](./subscriptions.md)) |
| Feature-leaf | `TxFilterBar` + `TransactionTable` | `ui/features/transactions/…` | recent-tx filter + table (cross-ref [transactions.md](./transactions.md)) |

## 7. Behaviours & edge cases

**Period vs. table filters.** `useTxQuery` owns the period; the header picker,
charts AND table all move with it. But the charts/KPIs are fed
`filterTx(transactions, { range: q.range })` — **range only**. The type / search /
tag / status / amount tokens in the filter bar narrow the **table only** (via
`q.sorted`), never the charts. Default period is **`30d`**, not "this month"
(`useTxQuery.ts` — the seeded dataset spans ~10 days across a month boundary).

**KPI deltas.** `t` = totals over the period; `tp` = totals over `prevRange`.
Income/Spending/Net show `pctChange(t.x, tp.x)`; the all-time **Balance** tile
shows `netWorth(wallets, transactions)` — including wallet opening balances and
ignoring the selected period — with a delta of
`t.net / |balanceStart|` where `balanceStart = balance − t.net`. Balance renders in
full ink, the other three `muted` (they're supporting figures). **Gotcha:** the KPI
delta greens on any rise and reds on any fall — a raw sign, so a *rising spending*
tile shows green. Only the Insights "Spending vs last period" tile inverts this
(green when you spent less). Delta is formatted vi-VN (`"12,4%"`, one decimal only
when it carries signal), hidden when `prev` is 0 (`pctChange` → `null`).

**Balances card.** A true net worth of **assets − debts** = `netWorth(wallets,
txs)` (wallet net) + `loansNetWorth(loans)`. The headline is the net-worth figure
(`.cashy-networth__val`, not squeezed onto an `h3` baseline) with a "Net worth ·
assets − debts" caption and a "Manage" → `#/wallets` button. When there are loans,
a `.cashy-figrow` of three shared `StatFigure`s breaks it down — **Assets** (wallet
net), **You owe** (payable), **Owed to you** (receivable, green) — instead of a
crammed dotted strip. Below: one row per non-archived wallet (balance from
`walletBalances`), then a single reconciling "Loans · net" row (→ `#/loans`); the
wallet rows + the loans row sum to the headline. Colour = status throughout
(owed-to-you green, a negative net red), left to `StatFigure`/`AmountDisplay`.

**Forecast card.** Horizon toggle 6 / 12 / 24 months (default 12). Projects
`view.balance` (all-time wallet balance) forward at `monthlyNet = monthlyNetRate(t.net,
spanDays)`. Point 0 is labelled "now" (a fact); the rest are arithmetic, not a
trend model. If the line would cross zero, a dashed zero `ReferenceLine` is drawn
and the Y-axis is allowed negative so the month the money runs out is visible.

**Cash-flow chart granularity.** `spanDays` is the window length (open ranges
resolve to first/last tx date). A **Day / Week / Month** toggle (`wb-tabs--pill`)
appears only when `spanDays > 30 && ≤ 800`; the default within that is `month` past
62 days else `day`, and the user's override resets whenever the range changes. A
window of ≤30 days stays daily and multi-year (>800 days) auto-buckets by year,
both with no toggle. `walletSeries`' own `"auto"` mode tiers `>800→year`,
`>62→month`, else `day`. Bars = per-bucket spending (own right axis); the area line
= running wallet balance, starting from the sum of wallet opening balances and
then applying the **cumulative net of all counted tx** (a stock, not the in-period
flow), on a separate left axis. Empty end-margins are trimmed; middle gaps kept.
`hasFlow = t.income || t.expense` → otherwise "Nothing recorded in this period".

**Spending donut + rank list.** Slices come from `foldTailSlices(breakdown(...))`.
The donut and the legend list share one controlled `selectedCat` (reset on range
change): selecting a slice pops it out, dims the rest, and swaps the donut hole from
the running total to that category's name/amount/share. **Every** category in the
period is listed (not just the top few); the `Other` row shows `· N categories`.
Progress-bar width is `pct / maxSlice` (min 4%) in the category's own hue. Empty →
"No spending in this period."

**Subscriptions strip.** Rendered whenever there are subscriptions. Ordered by
status via the pure `sortSubscriptions` (urgent → calm) through the shared
`useSubFilter` hook — the same one the `#/subscriptions` screen uses, so both
surfaces agree. `needsPaymentNow` count surfaces as a "N due now" warning capsule;
"Manage" → `#/subscriptions`. Past 6 cards the grid caps at ~2.5 rows and scrolls
(`cashy-subgrid--scroll`) **and** a `SubFilterBar` appears below the header (search ·
status · wallet · sort); a filter that empties the strip shows a "no matches" note.

**Insights strip.** Rendered only when `hasFlow`. Eight tiles from `periodInsights`
+ `pctChange`: Savings rate (green ≥0 / red <0, `—` when no income), Spending vs
last period (inverted colour), Average per day, Typical day (median; flags when a
few big days lift the mean, `avg > median·1.3`), How steady (CV band via the
`STEADINESS` map, hiding the "coefficient of variation" jargon), Top category,
This month's forecast (run-rate, only when the range is the current month and not
yet elapsed — else `—`), Largest expense.

**Recent transactions.** `TransactionTable` fed `q.sorted`, `pageSize={20}`, title
"Recent transactions", "View all" → `#/transactions`; empty state offers "Add
transaction" (`openTxEditor(null)`). Table internals documented in
[transactions.md](./transactions.md).

**Period picker.** Presets in two groups — rolling-day (`30d/60d/90d`) and
whole-month (`this-month/last-month/2m/3m/this-year/all`) — plus a custom range
typed in the segmented field or clicked on `RangeCalendar`; the two stay in sync.
Picking a preset also fills the field + highlights the calendar span (live
preview keeps the panel open); Enter or a second calendar click commits and closes.
Each preset shows a muted note of the concrete window it resolves to (`periodNote`).

## 8. Files

- `src/ui/features/dashboard/Dashboard.tsx` — container / composition
- `src/ui/features/dashboard/BalanceCard.tsx` — KPI tile
- `src/ui/features/dashboard/{BalancesCard,ForecastCard,DashboardSubscriptions,CashflowCard,CategoryBreakdownCard,InsightsCard}.tsx` — feature-local organisms composed by the entry
- `src/ui/features/dashboard/BalanceForecastChart.tsx` — projected-balance area chart
- `src/ui/features/dashboard/CashflowChart.tsx` — spending-bars + balance-line combo
- `src/ui/features/dashboard/SpendChart.tsx` — spend-by-category donut

Shared pieces it hosts (documented once, here or in their own docs):
- `src/ui/common/PeriodPicker.tsx`, `PeriodPanel.tsx`, `DateRangeInput.tsx`, `RangeCalendar.tsx` — the period chooser
- `src/ui/features/transactions/useTxQuery.ts` — the shared query hook (period + filters)
- `src/domain/analytics.ts`, `domain/period.ts`, `domain/transaction.ts` — the derivations
- `src/ui/features/transactions/{TxFilterBar,TransactionTable}.tsx` → [transactions.md](./transactions.md)
- `src/ui/features/subscriptions/ConnectedSubscriptionCard.tsx`, `useSubFilter.ts`, `SubFilterBar.tsx` → [subscriptions.md](./subscriptions.md)
