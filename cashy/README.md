# Cashy

A personal spending ledger that runs entirely in the browser. Vite + React + TypeScript; no Tailwind — the design
system is `src/styles/web-builder.css` (`wb-*`) and the app layer is `src/index.css` (`cashy-*`).

All data lives in `localStorage` under `cashy_state_v1` and is migrated forward by `version`. No server, no account,
nothing leaves the browser. A new workspace starts empty; Vietnamese demo data can be loaded from Settings.

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

| Command | Effect |
|---|---|
| `pnpm test` | unit tests (vitest) over the pure domain, data and usecase code |
| `pnpm lint` | oxlint |
| `pnpm check:layers` | enforce the one-way dependency rule |
| `pnpm build` | `tsc -b` → `check:layers` → `dist/` (served at `/cashy/`) |
| `pnpm build:wb` | component gallery only → `dist-wb/` (served at `/cashy-wb/`) |

In dev, `#/cashy` shows the Cashy components on fake data and `#/wb` shows the generic `wb-*` primitives.

## Docs

| File | Contents |
|---|---|
| [CLAUDE.md](CLAUDE.md) | the map: philosophy, architecture, invariants, conventions |
| [DECISIONS.md](DECISIONS.md) | decisions the owner made or confirmed |
| [docs/architecture.md](docs/architecture.md) | layers, import rules, procedures (normative for `src/`) |
| [docs/data-model.md](docs/data-model.md) | entities, enums, relationships, derived values |
| [docs/components.md](docs/components.md) | component catalogue and screen → component map |
| [docs/features/](docs/features/) | one doc per screen |
| [docs/cashy-web-spec.md](docs/cashy-web-spec.md) | what the web build ships, and what it does not |
| [docs/cashy-vision.md](docs/cashy-vision.md) | product direction, written for a native iOS app |

## Tuning

Two visual weights are easy to change: the outline of unselected status capsules (`color-mix` percentages on
`.cashy-statuspick` in `src/index.css`) and how far the selected donut slice pops out (`POP` in
`src/ui/features/dashboard/SpendChart.tsx`).
