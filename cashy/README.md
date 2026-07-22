# Cashy

Personal spending ledger. Vite + React + TypeScript. No Tailwind — the design
system is `src/styles/web-builder.css` (`wb-*`), the app layer is
`src/index.css` (`cashy-*`).

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
| `pnpm test` | vitest, single run (61 tests over `src/domain/`) |
| `pnpm test:watch` | vitest watch |
| `pnpm check:layers` | enforce the dependency rule |
| `pnpm build` | `tsc -b` → `check:layers` → build to `dist/` (base `/cashy/`) |
| `pnpm build:wb` | component gallery only → `dist-wb/` (base `/cashy-wb/`) |
| `pnpm lint` | oxlint |

The component gallery is also reachable in dev at `#/wb` (DEV-only, code-split,
never in the production bundle).

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
| [docs/architecture.md](docs/architecture.md) | layers, import matrix, file map, procedures, traps |
| [docs/cashy-vision.md](docs/cashy-vision.md) | product direction |
| [docs/cashy-v1-spec.md](docs/cashy-v1-spec.md) | v1 spec |
| [REBUILD-NOTES.md](REBUILD-NOTES.md) | rebuild notes |

---

## Open questions

Blocked on a decision from the owner. **Do not silently resolve these** — they
are recorded choices, not oversights.

| # | Question | Status / options |
|---|---|---|
| 8 | **How far to take the English translation?** The **Overview page** is now English (KPIs, forecast caption, `6/12/24 mo`, `Day/Week/Month`, both chart tooltips) and the single-cycle subscription button reads **"Mark as paid"**. Still Vietnamese: the subscription **card foot** (`Huỷ đăng ký`, `Đã thanh toán đủ`, `Tiếp tục`, multi-cycle `Xử lý N kỳ`), the **catch-up / cancel / history dialogs**, the **Subscriptions page**, and — everywhere — **chart date labels** (`Tháng 3 năm 2026`, axis `T7/2026`) which come from the shared `domain/date` formatter used app-wide. | **Decide:** (a) translate the whole app to English incl. app-wide dates, or (b) stop at the Overview. Nothing is blocked either way — pick when you're back. |
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

</details>
