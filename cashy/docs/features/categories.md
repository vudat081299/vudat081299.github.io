# Cashy — Categories (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Categories
> feature — the drag-to-reorder / drop-to-nest category tree and its editor — as
> it exists in the code today. See also: [CLAUDE.md](../../CLAUDE.md),
> [architecture.md](../architecture.md), [data-model.md](../data-model.md),
> [components.md](../components.md).

## 1. What it does

Manages the category tree a transaction is filed under. Categories form a
**self-referencing tree of unlimited depth** (`parentId` → parent), split into
two independent forests by ledger side — an **Expense** tab and an **Income** tab.
Rows carry a coloured icon tile, an **Add subcategory** / **Edit** / **Delete**
action group, and a drag handle: dragging a row and dropping it **onto** another
nests it as a child, dropping **before/after** re-slots it among its siblings. The
header **Add category** button and the editor Modal create or edit a node (name,
parent, colour swatch, icon). Deleting a category deletes its whole subtree but
**never deletes the transactions** filed there — those rows are orphaned to
`categoryId: null` ("Uncategorised").

## 2. Screen & route

- Route `#/categories` (hash router, `src/lib/router.ts`); rendered by
  `src/App.tsx:96` in the `<Layout>` content slot. Nav entry in
  `src/ui/app/Layout.tsx:13` (icon `account_tree`).
- Layout shape (`src/ui/features/categories/Categories.tsx:301`): a
  `wb-stack wb-stack--loose` of `PageHeader` (title + "Drag to reorder · drop onto
  an item to nest" subtitle + **Add category** action) → a `wb-tabs--pill`
  **Expense / Income** switch → the `Tree` for the active side → the singleton
  `CategoryEditor` Modal.
- Both the editor and the tree are **in-file components** of `Categories.tsx`
  (`CategoryEditor`, `Tree`) — not shared modals. Local state: `type` (active
  side) and `editor` (`EditorState | null`, drives the Modal).

## 3. Data it touches

| Entity | Fields | R/W |
|---|---|---|
| `Category` | `id`, `parentId`, `order`, `name`, `colorHex`, `icon`, `type`, `isSystem` | read (tree, editor); write via add / edit / delete / reorder |
| `Transaction` | `categoryId` | **write on delete only** — orphaned to `null`; no other transaction field is touched |

`isSystem` is always `false` (set by seed + `addCategory`) and is not read by this
screen. `order` is a per-sibling integer the drag renumbers (§4). Full shapes in
[data-model.md](../data-model.md).

## 4. Domain rules used

Pure functions from `src/domain/category.ts` (re-exported via `domain/index.ts`):

| Function | What |
|---|---|
| `flattenTree(cats, type)` | Depth-first walk filtered to one `TxType`, returning `{ cat, depth, hasChildren }[]` in sibling `order`. Drives the tree rows (indent = `depth * 22`) and the editor's parent `<Select>` (indent via `"  ".repeat(depth)`). |
| `childrenOf(cats, parentId)` | Direct children of a parent, sorted by `byOrder` (`order`, then Vietnamese name). The building block of `flattenTree` / `nextOrder`. |
| `descendantIds(cats, id)` | The id **plus** every id under it (fixpoint walk). Used three ways: the editor's banned-parent set, the "…and N subcategories?" count in the delete confirm (`size - 1`), and the set `deleteCategory` removes. |
| `rootOf(cats, id)` | Climbs `parentId` to the top of the tree. Not called by this screen; it backs the "one hue per root" derivations (donut, ranked bars) elsewhere. |
| `canReparent(cats, dragId, newParentId)` | The **cycle guard**: `true` for a top-level drop; `false` if the target is the node itself or any of its descendants (which would detach the subtree). |
| `reorderCategories(cats, dragId, newParentId, refId, after)` | Pure re-slot: rejects the move (`null`) when `canReparent` fails, else splices the dragged node among its new siblings and returns the **full category list with `order` renumbered**. Caller decides whether to persist. |
| `nextOrder(cats, parentId)` | `max(sibling order) + 1` (or `0`) — the `order` a freshly added child takes among its siblings. |
| `orphanCategory(txs, removedIds)` | Cited by `deleteCategory`: maps every transaction whose `categoryId` is in the removed set to `categoryId: null`, leaving the row otherwise intact. **This is the invariant** — deleting a category never deletes a ledger row. |

## 5. Usecases

Writes go through `src/usecases/categories.ts` (never mutate the store directly):

| Usecase | Effect |
|---|---|
| `addCategory({name, type, colorHex, icon, parentId})` | Appends a new `Category` with a fresh `uid()`, `order = nextOrder(...)`, `isSystem: false`. Returns the new id. |
| `updateCategory(id, patch)` | Shallow-merges `patch` (name / colour / icon / parentId) into the matching category. Reparenting is done here when the editor's parent `<Select>` changes. |
| `deleteCategory(id)` | Removes `id` **and its whole subtree** (`descendantIds`) from `categories`, and runs `orphanCategory` over `transactions` in the same commit. |
| `reorderCategory(dragId, newParentId, refId, after)` | Calls `reorderCategories`; **commits only if it returns non-null** — an illegal move (a parent dropped into its own child) is silently ignored (`categories.ts:61`). |

## 6. Components

| Component | File | Role |
|---|---|---|
| `Categories` (container) | `src/ui/features/categories/Categories.tsx:297` | Screen: side tabs, header, mounts `Tree` + `CategoryEditor`; owns `type` / `editor` state and the callbacks. |
| `Tree` (in-file) | `Categories.tsx:137` | Renders `flattenTree` as a flat `wb-tree` list (always fully expanded — no collapse), owns the pointer-drag, and calls `reorderCategory` / `deleteCategory`. |
| `CategoryEditor` (in-file) | `Categories.tsx:29` | Add/edit `Modal`: name field (with live icon tile), parent `<Select>`, `ColorPicker`, `IconPicker`; calls `addCategory` / `updateCategory`. |
| `ColorPicker` (common) | `src/ui/common/ColorPicker.tsx` | The 10 `SWATCHES` (`src/lib/palette.ts`) as `wb-swatch` buttons. |
| `IconPicker` (common) | `src/ui/common/IconPicker.tsx` | 8-column grid of `ICON_CHOICES` (`src/ui/kit/icon-map.ts`). |
| `Select` (kit) | `src/ui/common/Select.tsx` | Native `<select>` for the parent choice. |
| `Modal`, `PageHeader`, `EmptyState`, `Icon` | `ui/kit` / `ui/common` | Shell, header, empty card, icon-font glyph. |
| `confirmDelete` | `src/lib/confirm.ts` | Danger confirm before a delete resolves. |

Related category components used by **other** screens (not composed here):
`CategorySelect` (`src/ui/common/CategorySelect.tsx`) — the searchable tree picker
in the transaction editor/filter; `CategoryCap` (`src/ui/common/CategoryCap.tsx`) —
the **neutral grey** capsule a category shows as in dense tables; and the generic
kit `Tree` (`src/ui/kit/Tree.tsx`), an HTML5-drag nested tree used in the
galleries. The Categories screen deliberately hand-rolls its own tree instead of
reusing the kit `Tree` (see §7).

## 7. Behaviours & edge cases

- **Per-side split.** Each tab renders only its `TxType`; `flattenTree` filters by
  `type`, so expense and income are separate forests. The editor's parent
  `<Select>` is likewise `flattenTree(categories, type)`, so a category can only be
  reparented **within its own side** — drag never crosses sides either, since only
  same-side rows are on screen.
- **Drag mechanics.** Pressing the `wb-tree__handle` sets `dragId` and disables
  text selection; a `pointermove` listener reads the row under the cursor via
  `elementFromPoint(...).closest("[data-cat-id]")` and classifies the drop zone by
  vertical position — top 30 % = **before**, bottom 30 % = **after**, middle =
  **into** (`Categories.tsx:169`). Live feedback via `is-drop-before/after/inside`.
  The handlers are bound once per drag, so a `catsRef` keeps them reading the
  current tree on `pointerup` (avoids a stale-closure bug).
- **Drop → usecase mapping** (`Categories.tsx:179`): `into` →
  `reorderCategory(dragId, target.id, null, false)` (append as last child);
  `before`/`after` → `reorderCategory(dragId, target.parentId ?? null, target.id,
  pos === "after")` (re-slot among the target's siblings).
- **Cycle guard (two layers).** The editor pre-excludes self + descendants from the
  parent list (`banned = descendantIds(editing.id)`), and the write path rejects an
  illegal move anyway: `reorderCategories` returns `null` when `canReparent` fails
  and `reorderCategory` then commits nothing. A node can never become its own
  ancestor.
- **Delete never cascades to the ledger.** `remove()` confirms with
  `confirmDelete` (title notes the subcategory count when `descendantIds - 1 > 0`;
  message: *Related transactions will become "Uncategorised"*), then
  `deleteCategory` drops the subtree and **orphans** every affected transaction's
  `categoryId` to `null` via `orphanCategory` — money that was spent stays on the
  ledger. This is the load-bearing invariant of the feature.
- **Hue & "grey children".** Seed gives **one bright hue per root**, and children
  copy the parent's `colorHex` (inherited) so the by-root donut and ranked bars
  stay coherent — see `src/data/seed.ts`. This inheritance is **seed-only**: the
  editor lets the user pick any swatch freely; it does not auto-inherit on nesting.
  A category's hue only surfaces on category-*about* surfaces — the manager tiles
  here, the donut, the ranked bars; in dense transaction tables a category renders
  as a **neutral grey** `wb-cap` (`CategoryCap`), per the colour ladder in
  [CLAUDE.md](../../CLAUDE.md) §3.
- **Add flows.** Header **Add category** opens the editor with `parentId: null` on
  the current side; a row's **+** opens it pre-parented to that row. Save is blocked
  while the trimmed name is empty; **Enter** in the name field saves.
- **Empty state.** A side with no categories shows an `EmptyState` (🗂️, "No
  categories yet") instead of the tree.
- **No collapse.** Unlike the kit `Tree`, this screen has no expand/collapse — the
  whole active-side forest is always visible, indented by depth.
- **Seed.** A fresh workspace starts from `seedCategories()` (`src/data/seed.ts`):
  8 expense roots (some with children — Ăn uống, Hóa đơn) + 4 income roots, names
  in Vietnamese, one palette hue per root.

## 8. Files

- `src/ui/features/categories/Categories.tsx` — the screen + in-file `Tree` and
  `CategoryEditor`.
- `src/domain/category.ts` — `childrenOf`, `descendantIds`, `rootOf`, `flattenTree`,
  `canReparent`, `reorderCategories`, `nextOrder` (pure; re-exported via
  `src/domain/index.ts`).
- `src/domain/transaction.ts` — `orphanCategory` (the delete-never-cascades rule).
- `src/domain/sort.ts` — `byOrder` / `byName` sibling ordering.
- `src/usecases/categories.ts` — `addCategory`, `updateCategory`, `deleteCategory`,
  `reorderCategory`.
- `src/data/seed.ts` — `seedCategories`, the default tree.
- `src/ui/common/ColorPicker.tsx`, `src/ui/common/IconPicker.tsx`,
  `src/ui/common/Select.tsx` — editor controls.
- `src/lib/palette.ts` (`SWATCHES`), `src/ui/kit/icon-map.ts` (`ICON_CHOICES`),
  `src/lib/confirm.ts` (`confirmDelete`).
- Related, used elsewhere: `src/ui/common/CategorySelect.tsx`,
  `src/ui/common/CategoryCap.tsx`, `src/ui/kit/Tree.tsx`.
