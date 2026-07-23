# Cashy — per-feature docs

One doc per feature, each describing that feature **as it exists in the code
today**: what it does, its route, the data it touches, the domain rules + usecases
behind it, the components it composes, and its behaviours/edge cases.

These are the **feature-first** view. They sit on top of the **cross-cutting**
references, which stay the authority for anything that spans features:

- [../../CLAUDE.md](../../CLAUDE.md) — the map (read first)
- [../architecture.md](../architecture.md) — layers, import rules, invariants (normative for `src/`)
- [../data-model.md](../data-model.md) — entities, fields, enums, relationships
- [../components.md](../components.md) — the component catalogue + screen→component map

## The features

| Doc | Route | Covers |
|---|---|---|
| [overview.md](overview.md) | `#/dashboard` | KPIs, balance forecast, subscriptions strip, cash-flow + spending donut, insights, recent-transactions table |
| [transactions.md](transactions.md) | `#/transactions` | the ledger screen, filter bar, table (bulk-delete + pagination), transaction editor + detail, draft caching |
| [subscriptions.md](subscriptions.md) | `#/subscriptions` | recurring services: dues/confirm, cards + catch-up/cancel/history dialogs, editor, the whole subscription domain |
| [wallets.md](wallets.md) | `#/wallets` | spending wallets: balances + net worth, add/edit/archive/delete (phases 1–2 shipped; transfers + assignment pending) |
| [categories.md](categories.md) | `#/categories` | the drag-to-reorder / drop-to-nest category tree + editor, per-side split |
| [tags.md](tags.md) | `#/tags` | flat labels, usage-rank grey shading, the tag manager + editor |
| [settings.md](settings.md) | `#/settings` | appearance, workspace, data export/import + opt-in sample data, danger-zone reset |
| [onboarding.md](onboarding.md) | *(no workspace)* | the first-run screen: name the workspace, seed categories + empty ledger |

## Planned (not built yet)

| Doc | Covers |
|---|---|
| [../wallets-plan.md](../wallets-plan.md) | **ROADMAP** — multi-wallet / asset management. Phases 1–2 (schema, migration v6, balances, the screen) shipped and documented in [wallets.md](wallets.md); phases 3–5 (assignment in editors, wallet filter, transfers, dashboard strip) still ahead. |

> Keeping these honest: a feature doc describes current behaviour, so when a
> feature changes, update its doc in the same pass (the cross-cutting refs too if
> an entity/invariant moved).
