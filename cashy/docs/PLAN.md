# Cashy — Implementation plan (next batch) — ✅ SHIPPED 2026-07-24

> **Status: all three items below shipped on 2026-07-24.** Kept as the design record
> for the batch (the `loans-plan.md` / `wallets-plan.md` pattern). What actually
> landed: **item 2** — currency glyph unified to `₫` app-wide (+ new
> `formatMoneyAxis`); **item 1** — subscriptions `sortSubscriptions`/`subState`/
> `trialCycle` in domain, a shared `useSubFilter` + `SubFilterBar`, the
> `#/subscriptions` table replaced by a card grid, a filter bar + status sort on both
> surfaces, and a trial progress bar on the card; **item 3** — `docs/cashy-web-spec.md`
> split out. The feature docs (`features/subscriptions.md`, `overview.md`,
> `components.md`, `data-model.md`, `architecture.md`) are updated to match.
>
> Original turnkey plan follows; each item lists **what · where (files) · how ·
> verify**. Owner confirmed all decisions in §0.
>
> House rules that apply to every item: layered architecture (`ui → usecases →
> domain`, enforced by `scripts/check-layers.mjs`); money is integer VND coerced via
> `domain/money.toVnd`/`toVndNonNeg` and formatted only via `domain/money`; entity
> cards compose shared molecules (`CardIdentity`, `StatFigure`, `FacetChip`), never a
> wall of inline styles; prefer if/else blocks over nested ternaries. Verify EVERY
> item with `pnpm exec tsc --noEmit` + `pnpm exec oxlint src/` + `pnpm build`
> (tsc + check-layers + vite) + `pnpm exec vitest run`, then the browser preview
> (screenshot + DOM query — do not just eyeball).

---

## 0. Confirmed decisions (2026-07-24)

| Topic | Decision |
|---|---|
| Currency glyph | Use **`₫` (U+20AB)** across the whole web app, replacing plain `đ` (item 2). |
| Product docs | **Split a new `docs/cashy-web-spec.md`** for the actual React web build; leave the iOS-native vision docs untouched (item 3). |
| Subscriptions surface | Build the filter/sort/trial-progress on **BOTH** surfaces — the `#/subscriptions` screen AND the Overview strip (item 1). |
| REBUILD-NOTES.md | **Keep as history** — no action. |
| Dev galleries in `dist/` | **Leave as-is** (code-split, DEV-guarded, ~5 KB gzip each) — no action. |

Build order (recommended): **item 2 (currency) → item 1 (subscriptions) → item 3 (web-spec)**, each its own commit. Currency first because it is a tiny, app-wide change that would otherwise churn the subscription snapshots.

---

## 1. Subscriptions slice — sort-by-status + filter (>6) + trial progress line

The headline feature. Source of truth: memory `cashy-subscriptions-next-slice` + the
owner's prompt. Applies to **both** surfaces via **shared** pieces.

### 1a. Domain — a status sort (`src/domain/subscription.ts`)
- Add `sortSubscriptions(subs, txs, now?)`: rank urgent → calm, then by name.
  Rank (0 = top): suspended/lapsed (`isLapsed`) → due (`needsPaymentNow`) → trial
  (`inTrial`) → active (paid-up) → cancelled (`!active`, last). All predicates already
  exist; keep it pure (inject `now`). Add a test suite in `subscription.test.ts`.
- Add `trialCycle(sub, now?)`: the progress of the free window `[startedAt →
  trialEndDate]` — `{ elapsedDays, totalDays, remainingDays, pct, started }`, mirroring
  the shape of `subCycle` so the card can reuse the same markup. Return `null` when
  there is no trial. `trialEndDate(sub)` already gives the end (= first-charge date).

### 1b. Card — trial progress line (`src/ui/features/subscriptions/SubscriptionCard.tsx`)
- Today the progress block is gated `sub.active && cycle.started && !trial` (line ~276)
  — trial is deliberately skipped. **Change:** when `trial`, render the SAME bar over
  `trialCycle(sub)` instead of `subCycle(sub)`, labelled for the trial ("Day X of Y" +
  "N days of trial left" / "First charge <date>"). Darkening = the active card's rule:
  `nearEnd = remaining < total * 0.1` → full-ink bar, else `cashy-progress__bar--quiet`.
- Keep the "First charge" meta (already shown for trial). No migration: `startedAt` +
  `trialMonths` already exist (see memory `cashy-subscription-free-trial`).

### 1c. Shared filter — hook + bar (mirror the transaction filter)
- New `src/ui/features/subscriptions/useSubFilter.ts` (model on `useTxQuery.ts`):
  owns `{ query, status, walletId, sort }` where `sort ∈ {status(default), price, days}`
  each with a direction. Returns the filtered + sorted list + setters + `count`.
  - Default sort = `sortSubscriptions`. `price` = by `sub.amount`. `days` = by days
    until `nextPaymentDate(sub, txs)` (`domain/date.daysBetween`). Direction toggles.
  - Status facet options: all / due / trial / active / suspended / cancelled.
  - Wallet facet: **only wallets that actually have a subscription attached** — derive
    from `subs.map(s => s.walletId).filter(Boolean)` intersected with `wallets`. (Note:
    `Subscription.walletId` exists; the free-text `account` is legacy — filter on
    `walletId`.)
- New `src/ui/features/subscriptions/SubFilterBar.tsx` (model on `TxFilterBar.tsx`,
  reuse the shared `@/ui/common/FacetChip` → dashed unselected / solid selected):
  left→right: seamless **search** (`cashy-search`) · **Status** capsule · **Wallet**
  capsule · then pushed to the **far right**: **Sort by price** capsule (leading icon =
  up/down double arrow, `unfold_more` / lucide `ChevronsUpDown`) + **Sort by days-left**
  capsule. Selecting a sort capsule toggles asc/desc; the arrow icon reflects direction.

### 1d. Surface A — `#/subscriptions` screen (`Subscriptions.tsx`)
- Replace the **"Subscribed services" `wb-table`** with a **grid of cards**
  (`ConnectedSubscriptionCard`, same as the Overview strip) sorted by the hook.
- Put `<SubFilterBar>` **above the grid, below the "Subscribed services" section
  header** — rendered **only when `subscriptions.length > 6`** (owner's rule). Keep the
  KPI tiles and the "To confirm" catch-up section unchanged above it.
- Keep the empty-state and the monthly-commitment footer (move the footer total into a
  small caption under the grid, or drop it — decide during build).

### 1e. Surface B — Overview strip (`src/ui/features/dashboard/Dashboard.tsx` ~406–450)
- Sort the strip by status (`sortSubscriptions`) instead of the frozen
  `useStableSubOrder`. **Tension to resolve:** `useStableSubOrder` exists to stop cards
  jumping while editing; with an explicit filter/sort UI the user controls order, so on
  this surface either (a) drop the freeze, or (b) keep default order stable and let the
  filter re-sort on demand. Prefer (a) for consistency with the screen; note it.
- Add `<SubFilterBar>` above the strip grid, below the "Subscriptions" section header,
  only when `subCards.length > 6` (the strip already peek-scrolls at >6 — the filter
  supersedes/complements that).

### 1f. CSS + docs
- New classes as needed (`cashy-subfilter*` or reuse `wb-filterbar` + `cashy-search`
  from the tx bar). A subscription card grid class (reuse `.cashy-subgrid`).
- Update `docs/features/subscriptions.md` (screen shape, the new filter, trial progress),
  `docs/components.md` (SubFilterBar row + the screen map), and the
  `cashy-subscriptions-next-slice` memory (mark done).

**Verify:** load `#/subscriptions` with >6 subs (sample data has 19) — filter shows,
sort capsules toggle, wallet facet lists only wallets-with-subs; a trial sub shows a
progress bar to its first-charge date that darkens near the end; Overview strip sorts by
status and shows the filter. Screenshot both. `tsc`/`oxlint`/`build`/`vitest` green.

---

## 2. Currency glyph → `₫` (U+20AB) across the whole app

- `src/domain/money.ts`: change the appended unit from `" đ"` to `" ₫"` in
  `formatMoney` and in the sub-1.000 branch of `formatMoneyShort`. (`formatMoneyShort`'s
  k/m/b forms carry no unit — unchanged.) `parseMoney` strips non-digits, so `₫` input
  still parses; no change.
- Update `src/domain/money.test.ts` expectations (`"… đ"` → `"… ₫"`).
- `TransactionEditor.tsx`'s amount input addon already shows `₫` → now consistent; grep
  for any other literal `đ` used as a currency glyph in UI and switch. **Do NOT** touch
  `đ` inside seeded Vietnamese text or copy — only the money glyph.
- Update docs that show a formatted-money example (`data-model.md`, `handoff-checklist.md`,
  `transactions.md`, the money row in `components.md`) from `đ` → `₫`, and the memory
  `cashy-design-conventions` (compact-money rule).

**Verify:** every amount across dashboard / transactions / wallets / loans / subscriptions
reads `… ₫`; the compact forms stay `3,4m` (no unit). `vitest` green.

---

## 3. Split `docs/cashy-web-spec.md`

- New `docs/cashy-web-spec.md`: the spec for the **actual React + Vite web build** —
  stack (React 19, TS, Vite, localStorage, pnpm), the layered architecture (link
  `architecture.md`), the shipped features (link the `features/*.md`), and an explicit
  **"not in the web build"** list (Sign in with Apple, Face ID/PIN, SwiftData/TCA, CSV
  import — those live only in the iOS-native vision).
- Leave `docs/cashy-vision.md` + `docs/cashy-v1-spec.md` untouched; add a one-line
  pointer at the top of each: "iOS-native product vision — for the shipped web app see
  `cashy-web-spec.md`."
- Cross-link from `CLAUDE.md` (which already flags the web-vs-native gap).

---

## 4. Deferred / future (not this batch — reference only)

- **Multi-wallet / asset model** (memory `cashy-multiwallet-direction`): manage multiple
  wallets & asset types (cash, stocks, gold, savings) + receivables/debt; migrate the
  free-text `account` → an `accountId` referencing a real Account entity. A large future
  program, per-phase on the owner's go-ahead.
- **Wallets polish** (`docs/wallets-plan.md`): drag-to-reorder wallets; more realistic
  per-wallet demo opening balances. Optional.

---

## 5. No-action (confirmed)

- `REBUILD-NOTES.md` — keep as history.
- Dev galleries (`#/wb`, `#/cashy`) in `dist/` — leave as-is.
