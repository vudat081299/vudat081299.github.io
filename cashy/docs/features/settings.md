# Cashy — Settings (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Settings screen —
> appearance, workspace, data backup/restore, and the danger-zone reset — as it
> exists in the code today. See also: [CLAUDE.md](../../CLAUDE.md),
> [architecture.md](../architecture.md), [data-model.md](../data-model.md),
> [components.md](../components.md).

## 1. What it does

The app's preferences-and-maintenance screen. Four cards: **Appearance** (theme
system/light/dark + subscription-icon colour neutral/brand), **Workspace** (rename
the workspace; currency is a read-only VND row), **Data** (export the ledger to
JSON or CSV, import a JSON backup, or load ~200 sample transactions), and a
**Danger zone** that wipes everything and returns to onboarding. Everything lives
only in this browser — Settings is the app's whole backup/restore surface, and
export→import of the JSON file is the **only data-portability path** in or out of
Cashy.

## 2. Screen & route

- Route `#/settings` (hash router, `src/lib/router.ts`); mounted by
  `src/ui/app/Layout.tsx` in the main content slot.
- Layout shape (`src/ui/features/settings/Settings.tsx`): a `wb-stack wb-stack--loose`
  of `PageHeader` (title "Settings" + subtitle) → a responsive `wb-grid wb-grid--auto`
  (`--wb-grid-min: 340px`, `align-items: start`) holding four `Section` cards.
- `Section` (`Settings.tsx`) is an **in-file** leaf: a `wb-card` whose body is a
  `wb-stack` under a `wb-card__title`. The screen composes from raw `wb-*` classes
  (plain `<button>`/`<input>` + `cn`), not the typed `ui/kit` wrappers.

## 3. Data it touches

| Entity / field | R/W | Where |
|---|---|---|
| `CashyState.theme` (`ThemeMode` system/light/dark) | read + write | Appearance theme buttons → `setTheme` |
| `CashyState.subIconStyle` (`SubIconStyle` neutral/brand) | read + write | Appearance colour buttons → `setSubIconStyle` |
| `Workspace.displayName` | read + write | Workspace name input → `updateWorkspace` |
| `Workspace.currency` | read only | shown as a static `VND (₫)` list row — not editable in the UI |
| `Category`, `Tag`, `Transaction`, `Subscription`, `Wallet`, `Loan`, `Contact` (whole arrays) | bulk read (JSON export; CSV reads ledger/category/tag only); bulk **replace** (import / load-sample / reset) | Data + Danger-zone actions |
| `CashyState.version` | write | stamped `CURRENT_VERSION` on export envelope and on import |

Money is an integer count of VND; CSV export writes `String(t.amount)` verbatim (no
formatting, no sign — sign is implied by the `Type` column). Full entity shapes:
[data-model.md](../data-model.md).

## 4. Domain rules used

Settings is a configuration screen, not a computation one — it uses almost no
`domain/`.

| Function | Module | What |
|---|---|---|
| `todayYMD()` | `domain/date.ts` | date stamp in the export filenames (`cashy-YYYY-MM-DD.json` / `.csv`) |

Theme **resolution** is not in `domain/` — it lives in the `lib/` leaf
`src/lib/theme.ts`: `resolveTheme(mode)` maps `system` through
`matchMedia("(prefers-color-scheme: dark)")`, and `applyTheme(mode)` writes
`data-theme` on `<html>` **and** toggles the `.dark` class the `wb-*` components
theme off. Settings only stores the choice (`setTheme`); the effect that calls
`applyTheme` on every `theme` change (and subscribes to the OS media query while in
`system` mode) lives in `src/App.tsx`.

## 5. Usecases

Writes go through `src/usecases/settings.ts` and `src/usecases/workspace.ts` (the UI
never touches `commit`/`getState`):

| Usecase | Module | Effect |
|---|---|---|
| `setTheme(mode)` | `settings.ts` | commit `{ ...state, theme }` — persists the choice; `App` applies it |
| `setSubIconStyle(style)` | `settings.ts` | commit `{ ...state, subIconStyle }` — grey vs. per-service tinted subscription icons |
| `updateWorkspace(patch)` | `workspace.ts` | shallow-merge into the current workspace; **no-op if no workspace exists** |
| `loadSampleData()` | `workspace.ts` | replace the business dataset with a fresh demo (`seedCategories` + `buildSampleData`, ~200 txns, subscriptions, wallets, loans, contacts); creates a `"Mine"` workspace if none |
| `resetAll()` | `workspace.ts` | commit `emptyState()` but **keep `theme` + `subIconStyle`** — display prefs are about this browser, not the data being discarded |
| `exportData()` | `workspace.ts` | returns a pretty-printed JSON **string** (below); no state change |
| `importData(json)` | `workspace.ts` | parse + validate + commit; returns `{ ok, error? }` |

The `saveName` handler trims the input and falls back to `"Mine"` on empty; its
Save button is disabled while the field equals the stored `displayName`.

## 6. Components

| Component | Tier | File | Role |
|---|---|---|---|
| `Settings` | container / screen | `src/ui/features/settings/Settings.tsx` | reads `useCashy()`, wires every button to a usecase, owns the local name draft + file-input ref |
| `Section` | in-file leaf | `Settings.tsx` | `wb-card` wrapper for each titled block |
| `PageHeader` | common | `src/ui/common/PageHeader.tsx` | screen title + subtitle |
| `confirm` / `confirmDelete` | lib singleton | `src/lib/confirm.ts` | the in-app confirm dialog; rendered by `<ConfirmHost/>` (mounted at `src/App.tsx`) |
| `toast` | lib singleton | `src/lib/toast.ts` | success/error toasts after each action |

The screen calls `download(filename, text, mime)` (a local helper, `Settings.tsx`)
that builds a `Blob`, clicks a synthetic `<a download>`, and revokes the object URL —
the browser-only mechanism behind both exports. Import uses a hidden
`<input type="file" accept="application/json,.json">` triggered by the "Import JSON"
button and read via `FileReader`.

## 7. Behaviours & edge cases

**Appearance**
- Theme is a 3-up button group; the active mode renders `wb-btn--secondary`, the rest
  `wb-btn--outline`. Selecting is instant (no Save) — `setTheme` commits and `App`'s
  effect re-applies. `system` keeps following the OS after the choice via a live
  `matchMedia` listener.
- `subIconStyle`: **neutral** keeps every subscription service icon grey; **brand**
  ("By service") tints each icon with its own service colour. Affects only the
  Subscriptions surfaces — see [subscriptions.md](subscriptions.md).

**Workspace**
- Currency is fixed to VND across the app; the row is display-only, there is no
  currency picker.
- `updateWorkspace` guards on `state.workspace` — renaming before onboarding is a
  no-op (unreachable here, since Settings only shows with a workspace).

**Data — export (the round-trip)**
- `exportData()` emits an **envelope**, not the raw `CashyState`:
  `{ app: "cashy", version: CURRENT_VERSION, exportedAt, workspace, categories,
  tags, transactions, subscriptions, wallets, loans, contacts }`. It deliberately
  **omits display prefs** (`theme`, `subIconStyle`) — those describe the browser,
  not the ledger.
- Import is the mirror: it validates the file is an object whose `categories` **and**
  `transactions` are arrays (else `"File is not a valid Cashy file."`; a JSON parse
  failure gives `"Could not read the JSON content."`). On success it commits
  **keeps the current `theme`**, uses a file's `subIconStyle` only when one exists,
  takes the workspace and every business array from the file, and defaults missing
  optional arrays to `[]`. It then calls `migrate(merged, p.version ?? 1)`, so an
  older export follows the same append-only forward migrations as localStorage
  load. JSON export→import therefore round-trips the entire current dataset while
  leaving this browser's display preferences alone.

**Data — CSV**
- CSV export (`doExportCSV`) is a separate, **non-restorable** view: header
  `Date, Type, Amount, Category, Tag, Note`, one row per transaction (all of them,
  no status filter), category/tag ids resolved to names (tags joined by `|`), every
  cell double-quote-escaped, prefixed with a UTF-8 BOM so Excel reads Vietnamese
  correctly. There is no CSV import.

**Data — sample**
- "Load sample data" always uses a destructive confirmation whose copy names the
  entire dataset it replaces. This matters even when the ledger is empty because
  wallets, loans, contacts, or other records may still exist. Confirming replaces
  every business array with the demo dataset.

**Danger zone**
- Reset funnels through the shared `confirmDelete` (trash-badge dialog, red action),
  overriding only the wording (`title: "Delete all data and start over?"`, message
  "This action cannot be undone.", `confirmLabel: "Delete & start over"`). On confirm,
  `resetAll()` empties the state to `emptyState()` (`workspace: null`) — which drops
  the app back to **Onboarding** — while preserving theme + icon style.

**Persistence**
- State lives at `localStorage["cashy_state_v1"]`; `save()` swallows quota errors, and
  `load()` returns `emptyState()` on a missing/corrupt payload.
- `load()` merges the payload over `emptyState()`, migrates it forward, and re-saves
  it. An onboarded workspace with `transactions: []` stays empty across reloads;
  demo data is loaded only through the explicit button above.

## 8. Files

- `src/ui/features/settings/Settings.tsx` — the screen, the in-file `Section` and
  `download` helper, and all four cards.
- `src/usecases/settings.ts` — `setTheme`, `setSubIconStyle`.
- `src/usecases/workspace.ts` — `updateWorkspace`, `loadSampleData`, `resetAll`,
  `exportData`, `importData` (also `createWorkspace`, used by onboarding).
- `src/usecases/index.ts` — barrel re-export the screen imports from.
- `src/lib/theme.ts` — `resolveTheme` / `applyTheme` (the `.dark` class + `data-theme`).
- `src/data/persistence.ts` — `cashy_state_v1` key, `emptyState`, `save`/`load`.
- `src/data/migrations.ts` — `CURRENT_VERSION` (9) + the append-only `migrate()`
  used by both localStorage load and JSON import.
- `src/lib/confirm.ts` — `confirm` / `confirmDelete` behind the reset + replace prompts.
- `src/domain/date.ts` — `todayYMD` for export filenames.
- `src/App.tsx` — applies the stored theme.
