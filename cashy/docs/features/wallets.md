# Cashy — Wallets (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Wallets feature
> as it exists in the code today. See also: [CLAUDE.md](../../CLAUDE.md),
> [architecture.md](../architecture.md), [data-model.md](../data-model.md),
> [components.md](../components.md), and the roadmap in [wallets-plan.md](../wallets-plan.md).
>
> **Status:** fully shipped (plan phases 1–5). Schema + migration, the screen +
> balances, wallet assignment in the transaction/subscription editors, a wallet
> filter, transfers between wallets, and the dashboard balances strip are all live.

## 1. What it does

Tracks the places money sits — cash, bank accounts, e-wallets, cards. Each wallet
has an **opening balance** and a **current balance** derived from the ledger; the
screen (and a Dashboard strip) sum the non-archived ones into a **net worth**. Every
transaction and subscription is assigned a wallet, and money can be **transferred**
between two wallets (income/expense-neutral). Wallets are the real model behind the
old free-text "Paid with" field; migration v6 turned existing account strings into
wallets. This is the feature described in [wallets-plan.md](../wallets-plan.md).

## 2. Screen & route

- Route `#/wallets` (`src/lib/router.ts`), rendered by `src/App.tsx`; nav item
  ("Wallets", `account_balance_wallet`) in `src/ui/app/Layout.tsx` with a live count.
- Screen shape (`src/ui/features/wallets/Wallets.tsx`): `PageHeader` (+ "Add wallet")
  → a **net-worth** card → a responsive grid of `WalletCard` (active first, archived
  dimmed at the end) → an empty-state line when there are none → the in-file
  `WalletEditor` modal.

## 3. Data it touches

| Entity | Fields | R/W |
|---|---|---|
| `Wallet` | `id`, `name`, `kind`, `openingBalance`, `colorHex`, `icon`, `order`, `archived`, `createdAt` | read (cards + net worth); write via the editor usecases |
| `Transaction` | `walletId`, `toWalletId`, `amount`, `type`, `status` | **read** (to compute balances); a `deleteWallet` re-points `walletId`/`toWalletId` to null |
| `Subscription` | `walletId` | write only on `deleteWallet` (drops the link) |

Money is an integer count of VND; `openingBalance` may be **negative** (a card in
debt). Only `status: "recorded"` rows move a balance. Full shapes in
[data-model.md](../data-model.md) §1.8.

## 4. Domain rules used

All pure, in `src/domain/wallet.ts`.

| Function | What |
|---|---|
| `walletBalances(wallets, txs)` | every wallet's balance in one pass: `openingBalance` + `+income` / `−expense` on `walletId`, `−transfer-out` / `+transfer-in` |
| `walletBalance(wallet, txs)` | the same for one wallet |
| `netWorth(wallets, txs, {includeArchived?})` | Σ balances; **excludes archived by default** |
| `isTransfer(tx)` | `tx.toWalletId != null` — a transfer counts toward no income/expense total |
| `orphanWallet(txs, id)` | strip a deleted wallet's references from the ledger (rows kept) |
| `nextWalletOrder(wallets)` | next `order` for a new wallet |
| `walletIcon(kind)` | default lucide key per kind (`bank`→`landmark`, `card`→`credit-card`, …) |

## 5. Usecases

`src/usecases/wallets.ts` — reads state, commits the next one. No decision of their own.

| Usecase | Effect |
|---|---|
| `addWallet({name,kind,openingBalance,colorHex,icon})` | append a wallet (`order` via `nextWalletOrder`); returns the id |
| `updateWallet(id, patch)` | shallow-merge a patch |
| `setWalletArchived(id, archived)` | hide from (future) pickers, keep history |
| `deleteWallet(id)` | `orphanWallet` the ledger + drop any subscription link, then remove the wallet — **rows are never deleted** |

## 6. Components

| Tier | Component | File | Role |
|---|---|---|---|
| Container/screen | `Wallets` | `ui/features/wallets/Wallets.tsx` | reads `useCashy()`; net worth + card grid; holds the in-file `WalletEditor` |
| Singleton-ish modal | `WalletEditor` | *(in `Wallets.tsx`)* | add/edit form (name, kind `Select`, signed opening-balance input, `ColorPicker`, `IconPicker`) + archive/delete |
| Feature-leaf | `WalletCard` | `ui/features/wallets/WalletCard.tsx` | neutral tile + name + kind + `AmountDisplay` balance (negative → red, archived → dimmed); renders in the `#/cashy` gallery |
| Common | `WalletPicker` | `ui/common/WalletPicker.tsx` | the flat wallet dropdown used by the transaction + subscription editors (and both transfer legs); `excludeId` hides a transfer's other side |
| Common/kit | `PageHeader`, `Select`, `ColorPicker`, `IconPicker`, `AmountDisplay`, `Modal` | `ui/common/…`, `ui/kit/…` | building blocks |

## 7. Behaviours & edge cases

- **Balance = opening + recorded net.** Pending/skipped/failed rows never move a
  wallet (they don't move totals either). A negative balance renders red.
- **Net worth excludes archived wallets** by default; archived wallets still show on
  the screen, dimmed, at the end of the grid.
- **Opening balance can be negative.** The editor input keeps a leading `−`
  (`parseOpening`/`fmtOpening`), because `domain/money.parseMoney` strips the sign —
  a card can open in debt.
- **Kind change resets the icon** to that kind's default (`walletIcon`); the user can
  still pick any icon afterwards.
- **Delete keeps the ledger.** `deleteWallet` orphans a wallet's rows (`walletId`/
  `toWalletId` → null) and drops the link from any subscription, then removes the
  wallet — mirroring the category-delete rule. Archive is offered as the
  non-destructive alternative in the editor.
- **A fresh workspace** seeds one cash wallet ("Tiền mặt", `seedWallets`); the demo
  builds one wallet per sample "Paid with" account, links every row, and seeds
  monthly bank→cash **transfers**.
- **Assignment.** The transaction editor picks a wallet via `WalletPicker` (label
  "Paid from" / "Received into"); the subscription editor picks the wallet that pays
  it, inherited onto every generated cycle charge (`dueCharges`).
- **Transfers.** The editor's 3-way toggle (Expense / Income / **Transfer**, ⌘O/⌘I/⌘T)
  switches to a From → To pair; the row is saved with `toWalletId` and counts toward
  no income/expense total. `TransactionTable` and `TransactionDetail` render it as
  From → To with a neutral amount; the wallet filter matches a transfer on either leg.
- **Wallet filter.** `TxFilterBar` has a single-select Wallet facet (matches the
  row's `walletId` or `toWalletId`), on both the Transactions screen and the Dashboard.
- **Dashboard strip.** A compact "Wallets" card under the KPIs: net worth + each
  wallet's balance + a Manage link to `#/wallets`.

## 8. Files

- `src/ui/features/wallets/Wallets.tsx` — the screen container (+ in-file `WalletEditor`)
- `src/ui/features/wallets/WalletCard.tsx` — the presentational wallet card
- `src/domain/wallet.ts` — all the pure rules (§4) + `src/domain/wallet.test.ts`
- `src/usecases/wallets.ts` — the writes (§5)
- `src/data/migrations.ts` — the v6 back-fill (+ `src/data/migrations.test.ts`)
- `src/data/seed.ts` — `seedWallets` (default cash wallet)
- `src/data/sample.ts` — demo wallets + row links
- Wiring: `src/lib/router.ts`, `src/App.tsx`, `src/ui/app/Layout.tsx`, `src/domain/types.ts`
