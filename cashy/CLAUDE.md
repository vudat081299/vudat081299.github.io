# Cashy — map for agents

A personal spending ledger: React 19 + TypeScript + Vite, 100% client-side (`localStorage`), no server, no account,
no network. The only project in this repo that needs a build; deploy serves it at `/cashy/`, the gallery at `/cashy-wb/`.

## Read first

- When docs disagree: code + tests → `docs/cashy-web-spec.md` and the normative `docs/architecture.md`,
  `docs/data-model.md` → `docs/features/<feature>.md` → shipped plans (design records) → the native-iOS vision and spec.
- `docs/cashy-vision.md` and `docs/cashy-v1-spec.md` target native iOS (CASHY-020). Their principles bind: offline-first,
  minimalism, neutral-first, money as an integer, layered and component-first. Their stack, auth and native features do
  not exist here; `docs/cashy-web-spec.md` says what ships.
- Safe change path: this file → `docs/features/<feature>.md` → entity fields in `docs/data-model.md` → layer and procedure
  in `docs/architecture.md`. UI composition: `docs/components.md`. A taste decision: the vision.
- Owner decisions: `DECISIONS.md` (`CASHY-NNN`). For one file, from the repo root:
  `python3 tools/decisions.py find cashy/<path>`.

## 1. Run and gate

- pnpm, lockfile committed: `pnpm install`, `pnpm dev` (http://localhost:5173), `pnpm test`, `pnpm lint`, `pnpm build`
  (`tsc -b` → check-layers → vite build → `dist/`). All commands: `docs/architecture.md` §7.
- Node ≥ 20.12 (`engines`, `.nvmrc`); oxlint needs ≥ 22. This machine's default `node` may be an old fnm/nvm pin: put
  `/opt/homebrew/bin` first on `PATH`.
- Gate: `sh cashy/tools/check.sh`. It always runs check-layers; with `node_modules` it also runs `tsc -b`, `vitest run`
  and oxlint (Node ≥ 22). Each skip prints a line; a skipped check is not a clean check. No Node ≥ 20 fails the gate.
- Commit and CI run the gate (REPO-017). CI installs deps, so CI runs every check.
- A fresh workspace has the default categories and wallets and an empty ledger. The Vietnamese demo data is opt-in
  (Settings → Data). Reset: Settings → Danger zone, or clear `localStorage`.
- Dev galleries, code-split and DEV-guarded, shipped in `dist/` (CASHY-021): `#/cashy` for Cashy components on fake data,
  `#/wb` for `wb-*` primitives. Source: `src/ui/dev/`; add a component to `CashyGallery.tsx` with fake data.

## 2. Mental model

Cashy is a ledger. `transactions` is the single source of truth for money; categories, tags, subscriptions, charts and
KPIs are metadata on those rows or pure functions of them. The UI reads through `useCashy()` and writes by calling a
usecase, which asks a pure `domain/` function for the next state and `commit`s it. State is one object in
`localStorage["cashy_state_v1"]`, migrated forward on load.

## 3. Taste — `docs/cashy-vision.md`

- Offline-first and private: nothing leaves the browser, no telemetry.
- Neutral-first (CASHY-001, CASHY-004): a white–black–grey ground; colour means status (income green, expense and danger
  red, warning amber, info blue), never decoration. Categories and tags are grey; a tag's own hue shows only on
  tag-about surfaces. No gratuitous gradients, shadows or animation; hierarchy comes from scale and weight.
- Low friction: adding a transaction costs almost no clicks (pre-filled date, remembered draft, keyboard shortcuts).
- UI chrome is English; seeded ledger data stays Vietnamese (CASHY-011). Compact money uses `k / m / b` with a Vietnamese
  decimal (`3,4m`), not `k / tr / tỷ`. The currency glyph is `₫` (U+20AB), only through `domain/money` (CASHY-018).
- Engineering doctrine (layers, functional core, SRP, DRY of knowledge, pragmatic SOLID): `docs/architecture.md` §1.3.
- One home per semantic rule: money `domain/money`, percent `domain/format`, status pills `Capsule`, entity-card identity
  `CardIdentity`, filter facets `FacetChip`. Extract a concept when it has a stable name, a business rule or real reuse.
- Make invalid states hard to represent: typed unions, typed kit props, integer-money coercion, append-only migrations.

## 4. Architecture — `docs/architecture.md` is normative for `src/`

- `ui → usecases → domain`, `data` below usecases, `lib` a leaf. `scripts/check-layers.mjs` enforces it in `pnpm build`
  and in the gate; the import matrix is §1.1.
- `ui/**` imports only `useCashy` from `@/data/store`, never `commit` or `getState`.
- Keep the UI/logic split and a backend-ready data seam, with no backend: Cashy stays 100% `localStorage` (CASHY-016).

## 5. Data model — `docs/data-model.md`

Entities, fields, enums, relationships and derived values live there; types in `src/domain/types.ts`. The persisted root
is `CashyState`. Derived values (totals, breakdowns, forecast, subscription state, net worth) are never stored; each is
one pure function in `domain/`.

## 6. Screens — `docs/features/README.md`

One doc per route. Shell: `src/ui/app/Layout.tsx`; hash router: `src/lib/router.ts`. Always-mounted singletons:
`TransactionEditor`, `TransactionDetail`, `SubscriptionEditor` (opened via `lib/modals`), `toast`, `confirm`.

## 7. Components — `docs/components.md`

- `wb-*` is the design system (`src/styles/web-builder.css`, typed wrappers in `src/ui/kit/`). `cashy-*` is the app layer
  (`src/index.css`), built only from `--wb-*` tokens, no raw hex. Import kit components by deep path `@/ui/kit/<Name>`.
- Three tiers, one job each (CASHY-022, CASHY-023). Kit primitives are the vocabulary: use `<Button variant=…>`, never
  hand-written `wb-btn` markup; the same for `Card`, `Capsule`, `Input`, `Progress`.
- Feature components (`ui/common/`, `ui/features/<x>/`) compose primitives and own the business rendering;
  `TransactionTable` and `BalanceCard` stay out of `kit/Table` and `kit/Stat`.
- Feature entry files only assemble tier-two components, layout and wiring. An organism growing inside an entry moves to
  its own file. `Transactions.tsx` is the model. Shared option lists get their own module (`loanOptions.ts`) so an entry
  and its child never import each other.
- Leaves take props and callbacks and never touch the store; containers read `useCashy`, call usecases, pass data down.
- A pass that moves markup into the kit or a tier-two file changes no DOM and no class. Never mix a visual change into it.
- Hand-written on purpose until the kit matches byte for byte: `Settings`' `<section className="wb-card">`,
  `CategorySelect`'s search input (needs `forwardRef` on `kit/Input`), `SearchField`'s clear button. `wb-tab`, `wb-tag`,
  `wb-tree`, `wb-table`, `wb-stat` are their own components.
- A card composes the `Card` regions (`wb-card__head`, `__body`, `__foot`) and puts bespoke rules in named `cashy-*`
  classes, not inline `style`; a lone dynamic value such as archived opacity is the exception.
- Shared card parts are `ui/common/` molecules: `CardIdentity`, `.cashy-cardfig`, `.cashy-cardmeter`, `.cashy-subtile`
  (hue via `--cashy-sub-c`). A domain's card lives in `ui/features/<domain>/` and is reused by every screen.
- Money cells use `.wb-num`. Grep a `wb-*` class in `web-builder.css` before using it. `EmptyState`, `Select` and
  `Pagination` live only in `ui/kit`; `ColorPicker` exists in both `ui/common` and `ui/kit`, so check the import.

### 7.1 Styling traps

- CSS order is load-bearing: `main.tsx` imports `index.css` → `web-builder.css` → `wb-theme.css`. Token overrides go in
  `wb-theme.css`. Overrides in `index.css` load before the kit, so double the selector (`.wb-btn.cashy-btn--quiet-danger`)
  and write the dark hover out (`.dark .wb-btn.cashy-btn--quiet-danger:hover`).
- Never edit `src/styles/web-builder.css`, and never re-sync it from the root `web-builder/` (CASHY-024).
- Theme is two switches: `lib/theme.ts` and the pre-paint script in `index.html` set both `data-theme` and the `.dark`
  class; web-builder reads only `.dark`.
- Fonts must cover Vietnamese. `--wb-font` leads with the system UI stack; Plus Jakarta Sans from Google Fonts is only a
  fallback. A new web font needs a Google Fonts `vietnamese` subset (DM Sans has none). Money uses the UI font with
  `tabular-nums`; `--wb-font-mono` is for key caps and templated inputs.
- Prefer `ui/kit/Popover`. A hand-portalled `.wb-popover__panel` must copy its inline overrides or it breaks silently:
  `display: block`, `right/bottom: auto`, `transform: none`, `maxWidth` equal to the width you set, `position: fixed` from
  the anchor's `getBoundingClientRect()` re-placed on capture-phase `scroll` and on `resize`, a `zIndex` above the modal.

## 8. Invariants — break these and the app is wrong

Full list: `docs/data-model.md` §6 and `docs/architecture.md` §1.2.
1. Money is an integer count of VND. Format and parse only via `domain/money`; every write coerces through
   `money.toVnd` / `toVndNonNeg`. Percent formatting lives in `domain/format`.
2. Only `status: "recorded"` counts toward totals (`isCounted`). A missing status means recorded; read it via `statusOf`.
3. Subscriptions never book money: each due cycle materialises a `pending` transaction that the user confirms.
4. `paymentTxIds` / `lastPaidAt` are a cache re-derived by `paymentsOf`. A usecase that changes a charge's status calls
   `syncPayments`.
5. The cycle key is `"YYYY-MM"` for monthly and yearly plans. Do not add a second key shape.
6. Migrations are append-only: bump `CURRENT_VERSION`, add an `if (fromVersion < N)` branch, never edit an old branch.
7. `domain/**` is pure (no React, no I/O, `now` as a parameter) and `ui/kit/**` knows nothing about Cashy; the build
   checks both.
8. A row with `toWalletId` is a transfer: it counts toward no income or expense total, only the two wallet balances.
   Balance = `openingBalance` + net of recorded rows. A wallet used by a transfer cannot be deleted (archive it);
   deleting any other wallet orphans its rows to `null`.
9. A loan is a first-class record, not a transaction. `outstanding = max(0, principal − Σ payments)` is derived, interest
   is reference-only, borrowed subtracts and lent adds in net worth, and loans touch no transactions. The agreed
   redesign (CASHY-014) replaces this in its own slice with migration v10; until it ships, this is the law.
10. Contacts hold identity only: no `Loan.contactId` yet, `ContactPicker` is staged, `isContactReferenced` returns false.
    Add the link only as one full slice: foreign key, migration, delete guard, editor, tests and docs together.

## 9. Common tasks — `docs/architecture.md` §6

- Business rule: a pure function in `domain/<aggregate>.ts` plus a test, called from a usecase, never inlined.
- User action: `usecases/<aggregate>.ts`, exported via `usecases/index.ts`.
- Persisted shape: bump `CURRENT_VERSION`, add a migration branch, update `domain/types.ts`.
- UI primitive: generic in `ui/kit/` (+ `index.ts`), Cashy-aware in `ui/common/`.

### 9.1 Handoffs

- The open handoff is `docs/agentic-workflow/README.md`: loan-redesign slices B and C. kv-pipeline artifacts belong under
  `cashy/docs/agentic-workflow/` and `cashy/features/`; if the pipeline recreates them at the repo root, move them back.
- A handoff is a temporary work queue. Each open item says `OPEN`, its owner or current state, its acceptance criteria
  and the next safe action.
- Before deleting a finished item, move what lasts to its home: behaviour → `docs/features/`, data contract →
  `data-model.md`, architecture or reuse rule → `architecture.md` or `components.md`, agent procedure → this file, owner
  choice → `DECISIONS.md`. Delete the file, and every link to it, when nothing is open. Lasting reasoning becomes a
  design record, not a kept checklist.

## 10. Docs

- `README.md`: quickstart. `DECISIONS.md`: owner decisions.
- `docs/architecture.md` (normative for `src/`), `docs/data-model.md`, `docs/components.md`, `docs/features/` (one doc
  per screen), `docs/cashy-web-spec.md` (what ships). `ARCHITECTURE-WALKTHROUGH.md` is a narrative tour, not normative.
- `docs/cashy-vision.md`, `docs/cashy-v1-spec.md`: native-iOS vision and v1 spec, left as they are (CASHY-020).
- `docs/wallets-plan.md`, `docs/loans-plan.md`, `docs/PLAN.md`: design records of shipped work.
- `docs/agentic-workflow/`: kv-pipeline artifacts for the loan redesign; BDD scenarios in `features/`.
