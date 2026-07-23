# Cashy — Subscriptions (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Subscriptions
> feature — the recurring-services screen, its dues/table, the payment cards and
> their catch-up / cancel / history dialogs, and the editor — as it exists in the
> code today. See also: [CLAUDE.md](../../CLAUDE.md),
> [architecture.md](../architecture.md), [data-model.md](../data-model.md),
> [components.md](../components.md).

## 1. What it does

Tracks recurring services (Netflix, Spotify, iCloud…) billed **monthly or
yearly**. The core rule: **a subscription never books money itself** — each due
billing cycle *materialises* a `pending` `Transaction` (one per cycle), and only
the user confirming it makes it a `recorded` expense that counts toward totals
(`skipped` = "didn't use it", greyed, still reminds next cycle). Because Cashy has
no bank feed, a service's paid/owed state is *user-maintained*: the feature is
built around catching a ledger up when several cycles have gone by unconfirmed.
Both the `#/subscriptions` screen and the Dashboard strip show the same rich
`SubscriptionCard`s (with the catch-up / cancel / history dialogs); the screen adds
the stats and the "to confirm" list above them. Cards are ordered **by status**
(urgent first) and, past six services, a filter bar (search · status · wallet ·
sort) appears on both surfaces.

## 2. Screen & route

- Route `#/subscriptions` (hash router, `src/lib/router.ts`); rendered by
  `src/App.tsx:94` (`route === "subscriptions" ? <Subscriptions/>`), nav item in
  `src/ui/app/Layout.tsx:12`.
- Screen shape (`src/ui/features/subscriptions/Subscriptions.tsx`): a
  `wb-stack wb-stack--loose` of `PageHeader` (+ "Add subscription") → a 3-tile
  `wb-stat-grid` (**Monthly commitment**, **Due this month**, **Total services**)
  → a **"To confirm"** card (`SubscriptionDues`, shown only when dues exist) → the
  **"Subscribed services"** section: a section header, a `SubFilterBar` (only when
  there are **> 6** subs), then a **`.cashy-subgrid`** of `ConnectedSubscriptionCard`
  (the same card the Dashboard strip uses), a "no matches" note when a filter empties
  it, and a monthly-commitment caption; an `EmptyState` replaces the whole section
  when there are no subs.
- The Dashboard strip is the second surface: `src/ui/features/dashboard/Dashboard.tsx`
  renders a `ConnectedSubscriptionCard` per service in the "Subscriptions" strip
  (peek-scrolls past 6, and grows the same `SubFilterBar`). Both surfaces order with
  the pure `sortSubscriptions` (via the shared `useSubFilter` hook) — no frozen order.
- The **editor** is a **singleton modal** (`SubscriptionEditor`), mounted once at
  the app root and opened imperatively via `lib/modals` (`openSubscriptionEditor(id | null)`),
  from the screen header, the empty state, and each table row's pencil.
- On app load `src/App.tsx:63` calls `syncSubscriptions()` once a workspace
  exists — this is what materialises any newly-due charges as `pending` rows.

## 3. Data it touches

| Entity | Fields | R/W |
|---|---|---|
| `Subscription` | `id`, `name`, `amount` (VND per **cycle**), `interval`, `dayOfMonth`, `monthOfYear`, `categoryId`, `tagIds`, `colorHex`, `icon`, `note`, `account`, `active`, `startedAt`, `lastPaidAt`, `paymentTxIds`, `fullAmount`, `members`, `firstCycleAmount`, `trialMonths`, `cancelledAt`, `createdAt` | read (cards/table/dialogs); write via editor + lifecycle usecases |
| `Transaction` | the per-cycle charge: `subscriptionId`, `subMonth` (`"YYYY-MM"` cycle key), `status` (`pending`→`recorded`/`skipped`), `amount`, `type:"expense"`, `categoryId`, `tagIds`, `note` (= sub name), `payee` (`"Subscription · <month>"`), `account`, `occurredAt` (= cycle billing date) | written by `dueCharges` (raise), flipped by the confirm/skip/revert usecases |
| `Category` | `id`, `name` | read only — the row's `CategoryCap` + the editor's category picker |
| `Tag` | `id`, `name`, `colorHex` | read only — chips in the editor tag popover |

Money is an integer count of VND. `amount` is the fee **per billing cycle**, not
normalised to a month (`monthlyCommitment` does the /12 for yearly). Only
`status:"recorded"` cycle charges count toward spend. `paymentTxIds` / `lastPaidAt`
are a **cache** of the ledger, never authoritative (§7). Full shapes in
[data-model.md](../data-model.md).

## 4. Domain rules used

All pure, in `src/domain/subscription.ts` (dates via `src/domain/date.ts`,
`statusOf` via `src/domain/txStatus.ts`). `now` is always an injected parameter.

**Cycle grid (the "YYYY-MM" key for both intervals):**

| Function | What |
|---|---|
| `cycleMonths(sub)` | months per cycle — `12` yearly, `1` monthly. The one place the interval matters. |
| `addCycle(sub, key, n)` | shift a cycle key `n` whole cycles (yearly steps 12 months). |
| `cycleDate(sub, key)` | the billing date for a cycle — `billingDate(key, dayOfMonth)`, clamped to the month length. |
| `startCycle(sub)` | first cycle a plan can ever bill. Monthly = the start month; yearly = its fixed billing month **this** year if that date hadn't passed at sign-up, else **next** year (so joining in June for a March plan doesn't owe a backdated March). |
| `cycleContaining(sub, month)` | snaps an arbitrary month onto the plan's grid (the latest cycle ≤ it), `null` if before the plan. |
| `currentCycle(sub, now)` | the cycle today falls in — walked forward from `startCycle` (a yearly grid can't be recovered by arithmetic on "this month"). |
| `firstUnpaidCycle(sub)` | first cycle still owed: cycle after `lastPaidAt` (snapped onto the grid first), else `firstBillableCycle`. Stops an old plan backfilling years of dues. |
| `subCycle(sub, now)` | where today sits in the current period — real billing dates at both ends (28/29/30/31/366 days as they fall), `pct`, `started`. Drives the card's billing-period progress bar. |

**Trials & proration:**

| Function | What |
|---|---|
| `trialEndDate(sub)` | `addMonths(startedAt, trialMonths)` or `null`. Free **strictly before** this date. |
| `firstBillableCycle(sub)` | first cycle whose billing date is ≥ the trial end (walked on the plan's own grid); = `startCycle` when no trial. |
| `inTrial(sub, now)` | has a trial **and** `ymd(now)` < trial-end. Card shows "Free trial". |
| `trialCycle(sub, now)` | the free window `[startedAt → trialEndDate]` as a `SubCycle` (same shape as `subCycle`), or `null` with no trial. Lets the card draw a progress bar to the first-charge date with the *same* markup as the billing bar. |
| `firstCycleProration({amount,startedAt,dayOfMonth,interval,monthOfYear})` | reduced first charge when joined after the billing anchor: `round(amount × usedDays / cycleDays)` + a `{days,total}` caption. `null` when nothing to prorate. In practice fires for **monthly** only (a yearly plan's first cycle is pushed to the future by `startCycle`, so it bills in full). |

**Status derived from the ledger (never from `lastPaidAt`):**

| Function | What |
|---|---|
| `subscriptionStatus(sub, txs, now)` | the workhorse: `pending` charges (oldest first), the next future reminder `nextMonth`/`nextDate`, `paidCount`, `spent`. Everything below reads it. |
| `needsPaymentNow(sub, txs, now)` | active **and** has ≥1 pending charge. Read from charges so the card, dues list, and table always agree. |
| `isLapsed(sub, txs, now)` | active and the **oldest** pending cycle is before `currentCycle` — a whole period went by unpaid (provider would have cut it off). Card → danger "Suspended". |
| `cyclesOwed(sub, txs, now)` | count of pending charges (0 if paused). |
| `nextPaymentDate(sub, txs, now)` | earliest pending cycle's date (a **past** date while a bill is outstanding), else `firstUnpaidCycle`'s date. |
| `monthlyCommitment(subs)` | total per-month spend across **active** subs, yearly spread as `amount / 12`. |
| `billingLabel(sub)` | "day 15 each month" / "15 Mar each year". |
| `subState(sub, txs, now)` | the **one** bucket a service is in — `suspended`/`due`/`trial`/`active`/`cancelled` (the card's tone ladder). Single source of truth shared by the card, the sort, and the status filter, so they never disagree. |
| `sortSubscriptions(subs, txs, now)` | the default display order — urgent → calm (`suspended → due → trial → active → cancelled`), then by name. Pure; used by both surfaces via `useSubFilter`. |

**Payment-history cache (§7):** `paymentsOf(subId, txs)` derives `{paymentTxIds, lastPaidAt}` from recorded charges; `paymentsDrifted(sub, next)` says whether the cache is stale.

**Raising charges:** `dueCharges(subs, txs, now)` — every charge the ledger is still missing (§7).

**Catch-up:** `planCatchUp(rows: CycleChoice[])` → `{pay, skip, cancelling, problem}` (§7).

**Cancel / delete:** `chargesSurvivingCancel(txs, sub, cancelledAt)` drops pending charges dated on/after the stop date; `chargesSurvivingDeletion(txs, subId)` keeps only recorded charges (§7).

## 5. Usecases

All writes go through `src/usecases/subscriptions.ts` (never `commit`/`getState`
from UI). Any usecase that changes a charge's status calls `syncPayments` to keep
the cache honest.

| Usecase | Effect |
|---|---|
| `addSubscription(input)` | create a sub (`active:true`, empty history), then `syncSubscriptions()` to raise any already-due cycles. Returns the id. |
| `updateSubscription(id, patch)` | shallow-merge a patch. If the patch touches a **billing field** (`interval`, `dayOfMonth`, `monthOfYear`, `startedAt`, `trialMonths`) it re-runs `syncSubscriptions()` — the grid moved, so dues must be recomputed. |
| `setSubscriptionActive(id, active)` | pause (`active:false`) or resume. Resuming also **clears `cancelledAt`** and re-syncs, so cycles that came due while off are raised immediately. |
| `cancelSubscription(id, cancelledAt)` | set `active:false` + `cancelledAt`, prune pending cycles via `chargesSurvivingCancel`, then `syncPayments`. |
| `deleteSubscription(id)` | remove the sub; keep only its `recorded` charges (`chargesSurvivingDeletion`). No `syncPayments` (the sub is gone). |
| `syncSubscriptions()` | materialise a `pending` `Transaction` for every cycle `dueCharges` reports missing. **Idempotent** — safe on every mount. |
| `syncPayments(subId)` | re-derive `paymentTxIds`/`lastPaidAt` from the ledger and patch **only if drifted**. Also called by `deleteTransaction` in `usecases/transactions.ts`. |
| `confirmSubscriptionCharge(txId)` | one pending charge → `recorded`. |
| `confirmSubscriptionCharges(txIds)` | confirm a batch as **one** commit (via `resolveSubscriptionCharges`) so a catch-up undoes as one step. |
| `skipSubscriptionCharge(txId)` | one charge → `skipped`. |
| `revertSubscriptionCharge(txId)` | one charge back to `pending`. |
| `resolveSubscriptionCharges({pay, skip, amounts?})` | the catch-up write: `pay`→`recorded` (optionally at an edited `amount` for variable pricing), `skip`→`skipped`, the rest stay pending — one commit, then `syncPayments` per touched sub. |
| `revertSubscriptionCharges(txIds)` | batch reversal to `pending` (the Undo for a whole catch-up), one commit. |

Screen wiring: `Subscriptions.tsx` calls `confirmSubscriptionCharges([txId])`,
`skipSubscriptionCharge`, `setSubscriptionActive`. `ConnectedSubscriptionCard` (on
the Dashboard) calls `resolveSubscriptionCharges`, `revertSubscriptionCharge(s)`,
`cancelSubscription`, `setSubscriptionActive` — each wrapped in an Undo `toast`.
The editor calls `addSubscription` / `updateSubscription` / `deleteSubscription`.

## 6. Components

| Component | Tier | File | Role |
|---|---|---|---|
| `Subscriptions` | container/screen | `ui/features/subscriptions/Subscriptions.tsx` | reads `useCashy()`; stats, dues card, then a `SubFilterBar` (when >6) over a `.cashy-subgrid` of `ConnectedSubscriptionCard` |
| `SubFilterBar` | feature-leaf | `ui/features/subscriptions/SubFilterBar.tsx` | the subscriptions filter bar (search · Status · Wallet facets + far-right Price / Days-left sort capsules); reuses `FacetChip`. The transaction bar's twin |
| `useSubFilter` | hook | `ui/features/subscriptions/useSubFilter.ts` | the shared query — `{query, status, walletId, sort}` → filtered + ordered list; default order is `sortSubscriptions`, sort keys `price`/`days` re-sort live. Each surface owns an instance (mirrors `useTxQuery`) |
| `SubscriptionDues` | feature-leaf | `ui/features/subscriptions/SubscriptionDues.tsx` | "To confirm" list — one row per owed cycle with **Paid** / **Skip**; optional `max` + "+n more" |
| `ConnectedSubscriptionCard` | container | `ui/features/subscriptions/ConnectedSubscriptionCard.tsx` | wires a `SubscriptionCard` + its 3 dialogs to the usecases; every write is Undo-able. Used by **both** surfaces (screen grid + Dashboard strip) |
| `SubscriptionCard` | feature-leaf | `ui/features/subscriptions/SubscriptionCard.tsx` | presentational card: status capsule, last-paid / next-payment, a progress bar (billing period, **or the trial run-up via `trialCycle`**), catch-up/cancel/resume/history actions. Shares one `CycleProgress` block for both bars |
| `SubscriptionCatchUp` | modal | `ui/features/subscriptions/SubscriptionCatchUp.tsx` | settle owed cycles — per-cycle **used** switch + **paid** waterline + editable amount; enforces oldest-first |
| `SubscriptionCancel` | modal | `ui/features/subscriptions/SubscriptionCancel.tsx` | asks **when** the service stopped (`DatePicker` + Today / "From <month>"), shows what will be dropped vs kept |
| `SubscriptionHistory` | modal | `ui/features/subscriptions/SubscriptionHistory.tsx` | settled (recorded/skipped) cycles, newest first, each with an **Undo** back to pending |
| `SubscriptionEditor` | singleton modal | `ui/features/subscriptions/SubscriptionEditor.tsx` | add/edit form (interval, amount, day/month, trial, shared plan, proration, category/tags/icon/color, "Paid from" wallet via `WalletPicker`, note); delete |
| `SubTile` | feature-leaf | `ui/features/subscriptions/SubTile.tsx` | the rounded icon square; `brand` lets the service hue in, else neutral grey |
| `PageHeader`, `EmptyState`, `FacetChip` | common | `ui/common/…` | header + no-subs block + the shared filter capsule |
| `Modal`, `Input`, `Switch`, `Popover`, `Select`, `Textarea`, `IconPicker`, `ColorPicker`, `TagChip`, `DatePicker` | kit/common | `ui/kit/…`, `ui/common/…` | dialog + editor building blocks |

## 7. Behaviours & edge cases

**A subscription books no money on its own.** The only way a cycle becomes spend
is `dueCharges` raising a `pending` transaction and the user confirming it. This is
invariant #3 (CLAUDE.md §8).

**One cycle key shape — `"YYYY-MM"` — for both intervals.** A yearly plan simply
has one key per year (its billing month); `cycleMonths`/`addCycle` step 12 at a
time. The dedup key that stops a cycle being raised twice is
`` `${subscriptionId}|${subMonth}` `` (`dueCharges`). Do not introduce a second key
shape (invariant #5).

**`dueCharges` — what gets raised, and idempotence.** For each **active** sub it
walks cycles from `firstUnpaidCycle` (not `startCycle`, so `lastPaidAt` prevents
backfilling) up to the current month, **skipping** cycles whose billing date is
still in the future and cycles that already carry a charge. The very first cycle
(`m === startCycle`) bills `firstCycleAmount` when set (proration); every later
cycle bills `amount`. Each raised row inherits the sub's `categoryId`, `tagIds`,
`walletId` (+ the legacy `account`), and `note`, with `payee = "Subscription · <month label>"`
and `occurredAt` = the cycle billing date.

**Status is read from the ledger, not from `lastPaidAt`.** `needsPaymentNow`,
`isLapsed`, `cyclesOwed`, and `nextPaymentDate` all go through
`subscriptionStatus().pending`. This is deliberate: paying a *newer* cycle while an
older one is still owed used to advance `lastPaidAt` past the old cycle, so the
card fell quiet while the orphaned pending charge kept nagging the dues list and
the table. Deriving "due" from the charges makes all three surfaces agree.

**`paymentTxIds` / `lastPaidAt` are a cache.** `paymentsOf` re-derives them from
the recorded charges on the ledger; `paymentsDrifted` compares; `syncPayments`
patches only on drift. Invariant #4: **any status change must call
`syncPayments`** — the confirm/skip/revert usecases and `resolveSubscriptionCharges`
do, and `deleteTransaction` does when it removes a subscription charge.

**Catch-up — oldest-first debt settlement (`planCatchUp`).** Each owed cycle is two
separate facts: was the service **used** (the `Switch`) and was it **paid** (the
tick). Debts settle oldest-first, so paid cycles form a single **waterline** — the
dialog stores `paidThrough` (the index of the last paid cycle) rather than N
independent ticks, making the out-of-order state *unrepresentable*; `planCatchUp`
still rejects it in words (`problem`) as a safety net when rows come from elsewhere.
Cycles switched **off** are not debts, so they are transparent to the ordering
(skipped, leaving the waterline around them intact). Turning **every** cycle off is
read as cancelling the service (`cancelling: true`), and the confirm button says
so. Open defaults: **≤ 3** owed cycles open ticked + used (the "I already paid, just
never told the app" case costs no clicks); **≥ 4** open all-off (far likelier a
forgotten service being cancelled). Per-cycle **amount** is editable and prefilled
with the most recent recorded charge (variable monthly pricing); `resolveSubscriptionCharges`
applies it only to `pay` cycles whose value actually changed.

**Cancel — an effective date prunes future cycles (`chargesSurvivingCancel`).** The
dialog asks *when* the service stopped (default today). Every **pending** charge
whose billing date is **on or after** `cancelledAt` is dropped (those cycles never
happened); pending charges that billed **before** it stay owed (you had the service
then); `recorded`/`skipped` history is never touched. The dialog live-counts
"dropped" vs "kept". Resuming (`setSubscriptionActive(id,true)`) clears `cancelledAt`
and re-syncs, which re-raises the dropped cycles — so the cancel Undo needs no
record of what it removed.

**Delete (`chargesSurvivingDeletion`).** Removing a sub keeps its `recorded`
charges (real spending) and drops the `pending`/`skipped` ones. The editor confirms
with "Recorded transactions are kept."

**Trials.** `trialMonths` free months from `startedAt`; nothing is charged during
the window (`firstBillableCycle` skips whole cycles inside it). Free **strictly
before** the trial-end date — "3 months free from 10 Jan" is free through 9 Apr,
first charge 10 Apr. The card shows a "Free trial" capsule and "First charge" date,
and — once the trial has actually begun — a **progress bar over `trialCycle`**
(`[startedAt → trialEndDate]`, "Day X of Y" + "N days of trial left") that darkens
near the end exactly like the active card. A trial dated to start in the future
shows no bar yet (nothing to chart). The editor previews the first-charge date live.

**Shared / family plans.** `fullAmount` = the whole plan price per cycle, `members`
= how many split it (≥ 2), `amount` = **your own share** (the number that hits
totals). The editor's "Split evenly across N" button sets `amount =
round(fullAmount / members)`; the card annotates "· 1/N shared". Solo plans omit
both (then `amount` *is* the full price).

**Proration.** Offered in the editor only when `firstCycleProration` returns
non-null (joined mid-period). Stored as `firstCycleAmount`; `dueCharges` bills it on
the first cycle only.

**Ordering & filtering (`sortSubscriptions` + `useSubFilter`).** The default order
is the pure `sortSubscriptions` — urgent → calm by `subState`
(`suspended → due → trial → active → cancelled`), then by name — applied **live**
on both surfaces (marking a service paid moves it out of the "due" cluster, which is
coherent feedback). Past **6** subscriptions a `SubFilterBar` appears (below the
section header, above the grid): a search field, a **Status** facet (the five
`subState` buckets), a **Wallet** facet listing only wallets that actually pay for a
sub, and two far-right **sort capsules** — Price and Days-left — each a three-state
toggle (natural direction → reversed → back to the status default). All of it is
driven by `useSubFilter`, one instance per surface. When a filter empties the grid,
a "No subscriptions match these filters" note shows in place of the cards.

**"Paid from" (`walletId`).** The editor picks the paying **wallet** with a
`WalletPicker`; it is inherited onto every generated cycle charge's
`Transaction.walletId`, so the ledger shows which wallet funded each payment. The
legacy free-text `account` is retired (kept on old rows, no longer written). See
[wallets.md](wallets.md).

**Empty / quiet states.** No subs → an `EmptyState` in place of the table (stats and
dues cards are hidden too). The "To confirm" card only renders when `collectDues`
is non-empty. On the card, a just-cancelled service forces its greyed look until the
pointer leaves (CSS `:hover` would otherwise keep it bright); the history button is
disabled until at least one cycle is recorded or skipped; a long service name gets a
measured, portalled hover tooltip only when it actually clips.

## 8. Files

- `src/ui/features/subscriptions/Subscriptions.tsx` — the screen container (card grid + filter)
- `src/ui/features/subscriptions/SubFilterBar.tsx` — the shared filter bar (search · status · wallet · sort)
- `src/ui/features/subscriptions/useSubFilter.ts` — the shared filter/sort query hook
- `src/ui/features/subscriptions/SubscriptionDues.tsx` — the "To confirm" owed-cycle list
- `src/ui/features/subscriptions/ConnectedSubscriptionCard.tsx` — card + dialogs wired to usecases (both surfaces)
- `src/ui/features/subscriptions/SubscriptionCard.tsx` — the presentational service card
- `src/ui/features/subscriptions/SubscriptionCatchUp.tsx` — settle owed cycles (used-switch + paid-waterline)
- `src/ui/features/subscriptions/SubscriptionCancel.tsx` — cancel dialog (effective date)
- `src/ui/features/subscriptions/SubscriptionHistory.tsx` — settled-cycle history with per-row Undo
- `src/ui/features/subscriptions/SubscriptionEditor.tsx` — the add/edit singleton modal
- `src/ui/features/subscriptions/SubTile.tsx` — the icon tile
- `src/domain/subscription.ts` — all the pure rules (§4)
- `src/usecases/subscriptions.ts` — all the writes (§5)
- `src/domain/date.ts` — `cycleDate` support: `billingDate`, `addMonthKey`, `monthsBetweenKeys`, `daysBetween`, `monthLabelShort`, `monthNameShort`
- `src/domain/types.ts` — the `Subscription` / `SubInterval` / `SubIconStyle` shapes
- Mount points: `src/App.tsx` (`syncSubscriptions` on load; route → `<Subscriptions/>`), `src/ui/features/dashboard/Dashboard.tsx` (the card strip), `src/lib/modals` (`openSubscriptionEditor`)
