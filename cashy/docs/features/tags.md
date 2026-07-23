# Cashy — Tags (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Tags feature —
> the flat label vocabulary, its usage-rank grey ink, and the tag manager screen —
> as it exists in the code today. See also: [CLAUDE.md](../../CLAUDE.md),
> [architecture.md](../architecture.md), [data-model.md](../data-model.md),
> [components.md](../components.md).

## 1. What it does

Tags are a **flat list of free-text labels** you attach to transactions — "Travel",
"Work", "Reimbursable". They are **many-to-many**: a transaction carries zero or
more tags (`Transaction.tagIds`), and a tag rides on any number of transactions.
There is no hierarchy, no parent/child, no per-side split — one shared pool. The
`#/tags` screen is where you create, rename, recolour, and delete them; everywhere
they *appear* (the ledger table, the editor picker, the dashboard) they render as
grey `#`-chips whose darkness signals **how much the ledger actually uses that
tag**, not the colour you gave it.

## 2. Screen & route

- Route `#/tags` (hash router, `lib/router.ts`); mounted by `src/ui/app/Layout.tsx`
  in the main content slot.
- Layout shape (`src/ui/features/tags/Tags.tsx`): a `wb-stack wb-stack--loose` of
  `PageHeader` (title + count subtitle + a `Name` / `Most used` sort toggle in its
  actions) → a `cashy-taggrid` capsule grid. The grid's first cell is a dashed
  `cashy-tag-add` "New tag" button (house convention: dashed = add); the rest are
  the tags themselves as large notched capsules. An empty-state line shows when
  there are no tags.
- The **tag editor** is a `Modal` (`src/ui/kit/Modal`), not a route — the in-file
  `TagEditor` component (`Tags.tsx:11`), opened by clicking a tag (edit) or the add
  cell (create). It is *not* one of the app's singleton modals; it is local state
  on this screen.

## 3. Data it touches

| Entity | Fields | R/W |
|---|---|---|
| `Tag` | `id`, `name`, `colorHex`, `createdAt` | read (grid); write via `TagEditor` (add/update) and delete |
| `Transaction` | `tagIds` | read only for usage counts; **written on delete** — the deleted tag's id is stripped from every row |

The tag's stored `colorHex` is written and editable, but **largely unused for
display** — see §7. Only `Tag.name` and (rarely) `colorHex` reach the screen; the
grey ink comes from a derived usage rank, never from the row.

## 4. Domain rules used

| Function | What it does |
|---|---|
| `rankTags(tags, txs)` (`src/domain/tag.ts:24`) | Counts each tag's transactions, then returns `TagRank[]` sorted **most-used first** (ties broken by `byName`). Also assigns each a `shade` (100–900 grey step) **by rank position, not raw count** — see §7. |
| `tagRankMap(tags, txs)` (`src/domain/tag.ts:40`) | Same ranking keyed `Map<tagId, TagRank>`, for surfaces that render one transaction's tags and need to look up a shade by id. |
| `detachTag(txs, tagId)` (`src/domain/transaction.ts:89`) | Pure: returns the transaction list with `tagId` filtered out of every `tagIds`. Backs the delete invariant (§7). |
| `byName(a, b)` (`src/domain/sort.ts:4`) | `localeCompare(..., "vi")` name order — the tie-break inside `rankTags` and the alphabetical branch on this screen. |

`TagRank` shape (`src/domain/tag.ts:4`): `{ tag: Tag; count: number; shade: number }`.

## 5. Usecases

| Usecase (`src/usecases/tags.ts`) | Effect |
|---|---|
| `addTag({ name, colorHex })` | Appends a new `Tag` (`uid()` id, trimmed name, `createdAt = now`); returns its id. |
| `updateTag(id, patch)` | Shallow-merges `patch` (name and/or `colorHex`) into the matching tag. |
| `deleteTag(id)` | Removes the tag **and** calls `detachTag` so the id is peeled off every transaction in the same `commit`. |

All three read state → build the next state → `commit` (the one write path; see
[architecture.md](../architecture.md)). Tags carry no money, so none of these touch
totals or subscription payment caches.

## 6. Components

| Component | Tier | File | Role |
|---|---|---|---|
| `Tags` | container / screen | `src/ui/features/tags/Tags.tsx:81` | Reads `useCashy()`; computes a local usage `Map`; renders the sort toggle + capsule grid; wires add/edit/delete. |
| `TagEditor` | modal (in-file) | `src/ui/features/tags/Tags.tsx:11` | Name input + `ColorPicker`; `addTag` when new, `updateTag` when editing; save disabled on empty name; Enter saves. |
| `TagChip` | common / leaf | `src/ui/common/TagChip.tsx:43` | The `#`-chip used everywhere tags are *shown*. Grey by `shade` (usage rank), or its own hue when `tinted`; optional `onRemove` × button. |
| `TagsMorePopover` | feature-leaf | `src/ui/features/transactions/TagsMorePopover.tsx:20` | The `+n` overflow chip in a table's tags column; portals a fixed-positioned panel to `<body>` (escapes the table's `overflow`) listing only the tags that didn't fit, still most-used-first. |
| `ColorPicker` | common | `src/ui/common/ColorPicker` | Swatch grid (`SWATCHES`) the editor uses to set `colorHex`. |

Consumers of the ranked chips (read-only, all grey-by-rank): `TransactionTable`
(top 2 + `TagsMorePopover`, `TransactionTable.tsx:233`), `TransactionEditor` picker
+ selected chips, `TxFilterBar` tag facet, and the Dashboard recent-transactions
table — each feeds `rankTags` / `tagRankMap` down as a `tagRanks` prop.

## 7. Behaviours & edge cases

- **Flat, not a tree.** Unlike categories, tags have no `parentId` and no
  expense/income side. One global list, seeded and stored in `CashyState.tags`.
- **Grey by usage rank, not hue (the core rule).** A chip's darkness is chosen by
  its **rank position**, not its raw count: `rankTags` sorts used tags most-first,
  the top tag inks to `w900` (near-black), and the ramp steps evenly down toward
  `w100`. The number of used tags `m` is **capped at 9** (`Math.min(used, 9)`), so
  the 9th-most-used tag already lands on `w100`, and everything past rank 9 **and
  every unused tag stays `w100`** — the plain capsule grey. Positional stepping
  keeps a busy ledger a clean dark→light gradient instead of bunching middling tags
  into one muddy grey. `TagChip` renders the shade by mixing `--wb-fg` over
  `--wb-surface` at a hand-measured percentage (`SHADE_PCT`, interpolated between
  steps), so the whole ramp **inverts on dark** — there "more used" reads lighter.
- **`colorHex` is largely decorative.** Every tag stores a `colorHex` you can edit,
  but it only reaches the screen on **tag-*about* surfaces**: the manager grid
  itself (each capsule sets `--wb-tag-color: t.colorHex` via
  `wb-tag--notch cashy-tag-mgmt`, `Tags.tsx:165`) and the editor's `ColorPicker`
  preview. Everywhere a tag classifies a transaction it is grey-by-rank (or plain
  grey). `TagChip`'s `tinted` prop opts a chip back into its own hue, but in the
  shipped surfaces it is used only in the dev gallery — production tag pickers pass
  `shade`, not `tinted`. This is deliberate: colour means status, not decoration
  (see [CLAUDE.md](../../CLAUDE.md) §3), so a table of rows each wearing rainbow
  chips is exactly what the neutral-first ladder avoids.
- **Sort toggle on the manager.** `Name` = `localeCompare(..., "vi")` alphabetical;
  `Most used` = usage count desc, name-tiebroken (`Tags.tsx:96`). The raw count is
  **hidden** — it surfaces only in each capsule's hover `title` (`"<name> · n
  transactions"`), so `Most used` is how you read the ranking on-screen.
- **Delete strips the id from every transaction (invariant).** `deleteTag` removes
  the tag *and* calls `detachTag(state.transactions, id)` in the same `commit`, so
  no transaction is ever left pointing at a dead tag id. The delete confirm names
  the blast radius up front — `"The tag will be removed from n transactions."` when
  `n > 0` (`Tags.tsx:118`). Money is untouched: detaching a tag never changes an
  amount or status. (Contrast categories, which *orphan* rows to `null` rather than
  scrubbing the field.)
- **Add / edit.** Empty (whitespace-only) name can't be saved — the button is
  disabled and `save()` returns early. New tags default to `SWATCHES[5]`. Names are
  **not** de-duplicated: two tags may share a name (they stay distinct by `id`).
- **Overflow popover.** A table row shows only its two most-used tags; the rest
  collapse behind `+n`. The panel is portalled and fixed-positioned so the table's
  own `overflow: auto` can't clip it, flips above the chip when the row sits low,
  and closes on outside-click / Esc / scroll / resize.

## 8. Files

- `src/ui/features/tags/Tags.tsx` — the `#/tags` screen container **and** the
  in-file `TagEditor` modal.
- `src/domain/tag.ts` — `rankTags`, `tagRankMap`, `TagRank` (usage ranking + grey
  shade).
- `src/domain/transaction.ts` — `detachTag` (the delete invariant's engine).
- `src/usecases/tags.ts` — `addTag`, `updateTag`, `deleteTag`.
- `src/ui/common/TagChip.tsx` — the shared `#`-chip (grey-by-shade or `tinted`).
- `src/ui/features/transactions/TagsMorePopover.tsx` — the `+n` overflow chip +
  portalled panel.
- `src/domain/types.ts:39` — the `Tag` interface.
- Consuming surfaces (read only): `src/ui/features/transactions/TransactionTable.tsx`,
  `TransactionEditor.tsx`, `TxFilterBar.tsx`, `TransactionDetail.tsx`, and
  `src/ui/features/dashboard/Dashboard.tsx`.
