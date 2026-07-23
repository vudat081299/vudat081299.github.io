# Cashy — Onboarding (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the first-run
> Onboarding screen as it exists in the code today. See also:
> [CLAUDE.md](../../CLAUDE.md), [architecture.md](../architecture.md),
> [data-model.md](../data-model.md), [components.md](../components.md).

## 1. What it does

The first-run gate. When there is no workspace, Cashy replaces its entire shell
with a single centred card that welcomes the user, takes one field — the workspace
display name — and creates the workspace on submit. Currency is fixed to VND (₫)
and shown read-only; a second read-only row tells the user the 200-transaction demo
dataset is optional and loadable later from Settings. Creating the workspace seeds
the **default category tree** but leaves the ledger **empty** — no sample
transactions, tags, or subscriptions.

## 2. Screen & route

| | |
|---|---|
| Route | **None** — not a hash route. It is the gate the app falls into when `workspace` is null |
| Shown when | `useCashy().workspace` is falsy (`src/App.tsx:82`) |
| Mounted by | `src/App.tsx:85` — rendered with only a `<Toaster/>`, **outside** `<Layout>` (no navbar, sidebar, or modals) |
| Container | `src/ui/features/onboarding/Onboarding.tsx` |

A workspace's presence is the "onboarded" flag (see [data-model.md](../data-model.md)):
the null check sits ahead of the normal route switch, so no `#/…` screen can render
until a workspace exists. Layout: a `max-width: 400px` `wb-stack` — a `cashy-brand`
header (wallet mark, eyebrow, title, subtitle) above one `wb-card` holding the name
field, the two-row info `wb-list`, and a full-width **Create workspace** button.

## 3. Data it touches

Reads nothing from the store. The only user input is local component state
(`name`, `Onboarding.tsx:5`). On submit it writes, via `createWorkspace`:

| Entity | Fields written | Note |
|---|---|---|
| `Workspace` | `displayName`, `currency` (`"VND"`), `createdAt` (ISO now) | `displayName` = trimmed input, or `"Mine"` if blank (`workspace.ts:18-23`) |
| `Category[]` | full default tree from `seedCategories()` | 17 categories — 11 roots + 6 children, Vietnamese names, one hue per root (`data/seed.ts:9`) |
| `Tag[]` | `[]` | empty |
| `Transaction[]` | `[]` | **empty ledger — the demo is NOT loaded here** |
| `Subscription[]` | `[]` | empty |

Money is an integer count of VND; currency is not user-selectable on this screen.

## 4. Domain rules used

None. Onboarding calls no `domain/*` function directly — it delegates entirely to
the `createWorkspace` usecase, which composes the workspace defaults and pulls the
seed tree from `data/seed.ts` (the seed lives in `data/`, not `domain/`).

## 5. Usecases

| Usecase | Effect |
|---|---|
| `createWorkspace({ displayName })` (`usecases/workspace.ts:18`) | Commits a new `Workspace` + `seedCategories()` + empty `tags`/`transactions`/`subscriptions`. Called from `Onboarding.tsx:8` on button click or `Enter`. |

Not called here, but referenced by the "Sample data" row: `loadSampleData()`
(`usecases/workspace.ts:35`) — the opt-in demo. It replaces
categories/tags/transactions/subscriptions with a fresh dataset (`seedCategories()`
+ `buildSampleData`, ~200 txns) and is wired to Settings → Data ("Load sample
data", `src/ui/features/settings/Settings.tsx:104`), not to onboarding.

## 6. Components

A single container built from generic `wb-*` primitives and `cashy-*` chrome
classes; no `ui/kit` wrappers or feature-leaf components are used.

| Component | Tier | File | Role |
|---|---|---|---|
| `Onboarding` | Container / screen | `src/ui/features/onboarding/Onboarding.tsx` | Collects the name, calls `createWorkspace` |

Markup is raw classes: `cashy-brand` / `cashy-eyebrow` header, `wb-card`,
`wb-field` + `wb-input` for the name, a flush `wb-list` for the two read-only info
rows, and a `wb-btn wb-btn--block` submit.

## 7. Behaviours & edge cases

- **Submit paths.** Clicking **Create workspace** or pressing `Enter` in the name
  field both call `submit()` (`Onboarding.tsx:42,61`).
- **Blank name.** `name.trim() || "Mine"` in the component, and `createWorkspace`
  applies the same `|| "Mine"` fallback again (`workspace.ts:22`) — a whitespace-only
  name always becomes `"Mine"`.
- **Currency is not editable.** The `VND (₫)` list row is display-only; no control
  changes it. `createWorkspace` defaults `currency` to `"VND"`.
- **Transition afterwards.** There is **no explicit navigate**. `commit` inside
  `createWorkspace` wakes every `useCashy` subscriber (`data/store.ts:21-25`); App
  re-renders with a non-null `workspace`, so the `!workspace` gate falls through to
  the route switch. `useRoute()` returns `"dashboard"` for an empty/unknown hash
  (`lib/router.ts:22`), so the user lands on the Overview screen inside `<Layout>`.
- **Post-create effect.** Once `workspace` exists, App's effect runs
  `syncSubscriptions()` (`App.tsx:63`) — a no-op on a fresh workspace since no
  subscriptions were seeded.
- **No back door.** Onboarding cannot be reached again except by wiping the
  workspace (Settings → reset / `resetAll`, or clearing `localStorage`), which
  returns `workspace` to null.

## 8. Files

- `src/ui/features/onboarding/Onboarding.tsx` — the screen (the whole feature UI)
- `src/App.tsx` — the `!workspace` gate that mounts it (`:82-89`)
- `src/usecases/workspace.ts` — `createWorkspace` (the write); `loadSampleData` (the opt-in demo referenced by the screen)
- `src/data/seed.ts` — `seedCategories()`, the default tree a fresh workspace starts with
- `src/data/store.ts` — `commit` → re-render that swaps Onboarding for the shell
- `src/lib/router.ts` — default `"dashboard"` route the user lands on afterwards
