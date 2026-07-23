# Cashy

Personal spending ledger. Vite + React + TypeScript. No Tailwind — the design
system is `src/styles/web-builder.css` (`wb-*`), the app layer is
`src/index.css` (`cashy-*`).

> **Working on this (human or AI)? Start with [CLAUDE.md](CLAUDE.md)** — the
> one-page map to the philosophy, data model, screens, components and invariants.

All data lives in `localStorage` under `cashy_state_v1`, migrated forward by
`version`. No server, no account, nothing leaves the browser.

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

| Command | Effect |
|---|---|
| `pnpm dev` | dev server |
| `pnpm test` | vitest, single run (98 tests over `src/domain/`) |
| `pnpm test:watch` | vitest watch |
| `pnpm check:layers` | enforce the dependency rule |
| `pnpm build` | `tsc -b` → `check:layers` → build to `dist/` (base `/cashy/`) |
| `pnpm build:wb` | component gallery only → `dist-wb/` (base `/cashy-wb/`) |
| `pnpm lint` | oxlint |

Two component galleries are reachable in dev (DEV-only, code-split, never loaded
in the production bundle):

- `#/cashy` — the **Cashy-specific** components (`ui/common` + `ui/features`), fed by fake data
- `#/wb` — the generic **`wb-*`** design-system primitives

## Architecture

**[docs/architecture.md](docs/architecture.md) is the authority.** Read it before
changing anything under `src/`. Summary:

Three layers, one rule — dependencies flow one way, enforced by
`scripts/check-layers.mjs` inside `pnpm build`:

```
ui  ──▶  usecases  ──▶  domain
                   └─▶  data          lib is a leaf, importable anywhere
```

| Layer | Contains | Constraint |
|---|---|---|
| `domain/` | business rules, calculations | pure — no React, no I/O |
| `usecases/` | one function per user action | the only layer UI may write through |
| `data/` | store, localStorage, migrations | no business rules |
| `ui/kit/` | `wb-*` design system | knows nothing about Cashy |
| `ui/**` | screens and components | reads via `useCashy()`, writes via usecases |

UI reads with `useCashy()` and writes by calling a usecase — never `commit()`
directly. `pnpm build` fails on a violation.

## Invariants

Break these and the app is wrong, not merely inconsistent.

- **Money is an integer count of VND.** No floats, no cents.
- **Only `status: "recorded"` counts toward totals.** A missing status means
  `"recorded"` (legacy rows). See `domain/txStatus.isCounted`.
- **Subscriptions never book money on their own.** Each due cycle materialises a
  `pending` transaction; only the user confirming it makes it `recorded`.
- **`paymentTxIds` / `lastPaidAt` are a cache**, re-derived from the ledger by
  `domain/subscription.paymentsOf`. The ledger is the source of truth.
- **A cycle key is `"YYYY-MM"` for both monthly and yearly plans** — a yearly
  plan simply has one key per year. This is what lets `subMonth`, the dedup key
  and every existing ledger row carry yearly plans with no second code path.
- **Migrations are append-only.** Bump `CURRENT_VERSION`, add a branch in
  `data/migrations.ts`; never edit an existing one — real data went through it.
- **CSS order:** `index.css` loads *before* `web-builder.css`, so app-level
  `wb-*` overrides need raised specificity, and dark `:hover` needs an explicit
  `.dark` branch. Details in architecture.md §8.

## Docs

| File | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **the AI/onboarding map — start here** |
| [docs/architecture.md](docs/architecture.md) | layers, import matrix, file map, procedures, traps (normative for `src/`) |
| [docs/data-model.md](docs/data-model.md) | data dictionary — entities, enums, relationships, derived values |
| [docs/components.md](docs/components.md) | component catalogue — tiers, props, screen→component map |
| [docs/cashy-vision.md](docs/cashy-vision.md) | product direction (timeless; native-iOS-flavoured) |
| [docs/cashy-v1-spec.md](docs/cashy-v1-spec.md) | v1 spec (native-iOS-flavoured) |
| [docs/wallets-plan.md](docs/wallets-plan.md) | **plan** — multi-wallet / asset feature (not built yet) |
| [REBUILD-NOTES.md](REBUILD-NOTES.md) | web-rebuild notes |
| [docs/handoff-checklist.md](docs/handoff-checklist.md) | this documentation pass + open questions for the owner |

---

## Open questions

Blocked on a decision from the owner. **Do not silently resolve these** — they
are recorded choices, not oversights.

| # | Question | Status / options |
|---|---|---|
| 9 | Status-picker outline strength (tuning, not blocking) | Unselected capsules now show a soft tone outline at ~42–48% opacity (`StatusPicker.tsx` + `.cashy-statuspick` in `index.css`). Bump the `color-mix` percentages if you want them stronger/fainter. |
| 10 | Donut selected-slice emphasis (tuning, not blocking) | Selected slice grows outward by `POP = 3` with **no** outward slide, so it stays flush with the hole and never clips (`SpendChart.tsx`). Change `POP` to dial the zoom. |

<details>
<summary>Resolved — kept for the reasoning, do not reopen without cause</summary>

| # | Question | Decision |
|---|---|---|
| 2 | Yearly plan changes its billing month mid-life | **Fixed, option A: keep the history, re-grid from the new date.** `firstUnpaidCycle` now snaps `lastPaidAt` onto the cycle grid (`cycleContaining`) before stepping forward, so a payment made on the old schedule still resolves to a real cycle. `updateSubscription` re-runs `syncSubscriptions` when a billing field changes, so the newly-owed cycle appears immediately rather than after a reload. **Accepted trade-off:** the catch-up cycle is charged in full even though it is shorter than a normal period — that is the "one odd-length cycle" of option A. |
| 1 | Delete icon on a transaction row | **Confirmed as built.** No per-row delete; Edit always visible; delete lives inside the editor. |
| 3 | Date recorded by "Mark N paid" | **Keep.** Each charge keeps its own due date, so a caught-up month lands in the month it belonged to. Recording all of them as "today" would move historical spend into the current month and distort every by-month figure. |
| 4 | Skip a cycle | **Added to `SubscriptionCard`**, inside the pay-confirm step (`Đã trả` / `Bỏ qua` / `Để sau`) rather than the resting foot. The Dashboard renders cards *without* the dues list, so skipping was unreachable from that screen; putting it in the confirm step fixes that without adding a third button to every card at rest. |
| 5 | Mixed language | **Keep as is** for now; owner will handle the translation later. |
| 6 | `occurredTime` | **Display-only, by design.** It is consumed — `TransactionTable` renders it under the date, `TransactionDetail` as "lúc HH:mm". It drives no sort/filter/chart deliberately: the field is optional and most rows have none, so any time-of-day analytic would be computed over a biased subset and read as fact. |
| 7 | Subscription card padding | **Keep 8px.** Unchanged. |
| 8 | How far to take the English translation? | **Done — full English (2026-07-23).** The whole app is English: the subscription card foot, the catch-up / cancel / history dialogs, the Subscriptions page, and — app-wide — chart date labels (`domain/date` now emits `MMMM yyyy`, `Today`/`Yesterday`). Only the DEV-only galleries and the intentionally-Vietnamese seed data stay Vietnamese. Compact money kept `k / m / b` with a `vi-VN` comma decimal (`3,4m đ`). |

</details>
