# Cashy — component catalogue

Every UI component, classified low → high, with the props a caller sets. Two
prefixes: **`wb-*`** = the generic design system (`src/ui/kit`, class defs in
`styles/web-builder.css`, knows nothing about Cashy); **`cashy-*`** = the app layer
(`src/ui/common` + `src/ui/features`, styled only from `--wb-*` tokens).

**See them live** (DEV builds): `#/cashy` = this Cashy layer (fed by fake data),
`#/wb` = the generic `wb-*` primitives. Source of both galleries: `src/ui/dev/`.

Tier is decided by imports: a component that imports `@/data/store` (`useCashy`) or
`@/usecases` is a **container/modal**; everything else is presentational
(**feature-leaf**) or a shared building block (**common**/**kit**).

See also: [architecture.md §5](architecture.md) (component contract), [../CLAUDE.md](../CLAUDE.md).

---

## 1. Kit — generic primitives (`src/ui/kit`, import via `@/ui/kit`)

Typed wrappers over `wb-*` classes. Neutral-first: `tone` means status; a custom
`color` hue is a separate axis (classification, never both). Icons are Material
Symbols **ligature name strings** (`"add"`, `"payments"`), except the standalone
`Icon` (lucide by kebab-case name). Money cells use `wb-num`.

### Atoms
| Component | Purpose | Key props |
|---|---|---|
| `Button` / `ButtonGroup` | neutral-first button | `variant` (primary/secondary/outline/ghost/danger/success), `size`, `round`, `iconOnly`, `block`, `loading`, `leadingIcon`/`trailingIcon` |
| `Kbd` | keycap chip for a shortcut | `children` |
| `Capsule` | the core badge/status pill | `tone` (neutral/success/danger/warning/info), `fill` (soft/solid/outline/elevated/dashed), `size`, `color` (custom hue), `dot`, `icon` |
| `Tag` / `TagList` | hashtag chip (CSS draws the `#`) | `shape`, `tone`, `color`, `solid`, `selected`, `size`, `onRemove` |
| `Alert` | inline message block | `tone`, `icon`, `title`, `plain`, `dismissible` |
| `Progress` | budget-style track+fill | `value`, `max`, `tone`, `size`, `loading`, `label` |
| `Spinner` / `Skeleton` / `SkeletonText` | loading affordances | `size`; `shape`/`lines` |
| `Tooltip` | CSS hover/focus bubble | `label`, `children` |
| `Card` / `CardHead` / `CardBody` / `CardFoot` | surface | `variant` (default/dashed/flat/hover); head `title`/`sub`/`actions` |
| `Stat` | single KPI tile | `label`, `value`, `icon`, `delta {dir,value}`, `note`, `footer` |
| `Avatar` / `AvatarGroup` | image/initials chip | `src`, `size`, `shape`, `solid`, `status` |
| `Divider` | rule | `orientation`, `variant`, `label`, `strong` |
| `MediaObject` | figure-beside-body row | `figure`, `title`, `text`, `center` |
| `ListGroup` / `ListItem` | hairline-divided list | item: `title`, `sub`, `end`, `icon`, `leading`, `active`, `clickable` |
| `Breadcrumb` | trail nav | `items[{label,href,icon}]`, `separator` |
| `EmptyState` ⚠️ | empty/no-results block (kit twin of common) | `icon`, `title`, `description`, `action` |
| `Steps` | numbered/dotted stepper | `steps[]`, `orientation`, `dot` |
| `Nav` / `Sidenav` / `Footer` / `Sticky` / `ScrollArea` | nav & layout chrome | see source |
| `Input` / `Field` | text input + label/message wrapper | Input: `size`, `invalid`, `seamless`, `leadingIcon`/`trailingIcon`, `leadingAddon`/`trailingAddon` (+ **`wb-input--underline`** / **`wb-input-group--underline`** variants) |
| `Textarea` | multi-line input | `autoSize`, `code`, `seamless`, `invalid`, `rows` (+ `wb-textarea--underline`) |
| `Switch` | toggle | `label`, `io`, `size`, native checkbox attrs |
| `Checkbox` / `Radio` / `RadioGroup` | choice controls | `label`, `description`; group `name`/`value`/`onChange`/`orientation` |
| `FileInput` / `Dropzone` | file pickers | `onFiles`; Dropzone `icon`/`title`/`hint` |
| `Slider` / `RangeSlider` | range inputs | `min`/`max`/`step`/`value`/`onChange`, dual `[from,to]` |
| `Sparkline` / `LineChart` / `ComboChart` / `BarChart` / `Donut` / `ProgressRing` / `RankedBars` / `Legend` | CSS/SVG chart primitives | mostly `values`/`points`/`slices`/`items` + colours |
| `Icon` ⚠️ | lucide glyph by kebab-name (NOT exported from `index.ts`) | `name`, `size` |

### Molecules
| Component | Purpose | Key props |
|---|---|---|
| `Dropdown` | click menu on a button | `label`, `items[]`, `variant`, `size`, `align` |
| `Select` ⚠️ | styled native `<select>` (kit twin of common) | `options[]` or `<option>` children, `invalid`, `size` |
| `Toast` (`Toaster`) | toast host (driven by `lib/toast`) | `position` |
| `Modal` | dialog (Esc/backdrop/scroll-lock) | `open`, `onClose`, `title`, `footer`, `maxWidth` |
| `Drawer` | edge offcanvas panel | `open`, `onClose`, `side`, `title`, `width` |
| `Popover` | portalled panel, render-prop trigger | `trigger({open,toggle})`, `children`, `panelWidth`, `align`, `inline` |
| `Accordion` / `Collapse` | disclosure | `items[]`/`type`; `trigger`/`open` |
| `Tabs` | tablist + panels | `items[]`, `value`/`defaultValue`, `panels`, `variant` |
| `ConfirmDialog` (`ConfirmHost`) | host for imperative `confirm()` (`lib/confirm`) | none |
| `Navbar` / `NavbarBrand` | top app bar | `brand`, `items`, `actions`, `sticky` |
| `Pagination` ⚠️ / `Pager` | page nav / prev-next cards | `page`/`pageCount`/`onChange`; `prev*`/`next*` |
| `RichText` | markdown editor (toolbar + textarea) | `value`/`onChange`, `rows`, `attached` |
| `TimePicker` | iOS-style hour:minute scroll (24h) | `value`/`onChange`, `minuteStep` |
| `Calendar` | month grid, single/range (YYYY-MM-DD) | `mode`, `value`/`onChange`, `showToday` |
| `ColorPicker` ⚠️ / `Swatches` | HSV picker / preset grid (kit twin of common) | `value`/`onChange`, `presets` |
| `FilterBar` (+ `FilterToken`, `FilterAdd`, `SegmentedToggle`, `RangeFilter`) | list/table filter toolbar | see source |
| `Table` | generic data table | `columns[]`, `rows`, `rowKey`, `selectable`, `onReorder`, `footer`, `dense`/`striped`/`sticky` |
| `Tree` / `Sortable` / `SlotGrid` | drag-reorder structures | `nodes`/`items`/`slots`, `onChange`/`onReorder`, `renderItem` |

⚠️ **Name collisions** — the kit and `ui/common` both export **`EmptyState`**,
**`Select`**, **`ColorPicker`**. They are different components; check the import
path. Two **`Pagination`** files exist (`ui/kit` generic; `ui/features/transactions`
Cashy-specific). `Icon` and `icon-map.ts` are NOT in the kit barrel.

---

## 2. Common — Cashy-aware shared building blocks (`src/ui/common`)

Pure/presentational; none touch the store.

| Component | Purpose | Key props |
|---|---|---|
| `AmountDisplay` | the single way money is drawn (income green, spend neutral-bold, red only when a real problem) | `amount`, `type?`, `signed?`, `tone?` (default true), `negative?` |
| `CategoryCap` | a category as a neutral grey capsule | `category?: Category \| null` (null → "Uncategorised") |
| `CategorySelect` | tree category picker (icon+colour+indent+search) in a Popover | `categories`, `type: TxType`, `value: string\|null`, `onChange` |
| `ColorPicker` | swatch grid from `lib/palette` | `value`, `onChange` |
| `DatePicker` | single-date field on a `wb-calendar` in a Popover | `value` (`YYYY-MM-DD`), `onChange` |
| `DateRangeInput` | segmented `dd/mm/yyyy – dd/mm/yyyy` with inked separators | `value: Range\|null`, `onChange`, `onCommit?` |
| `EmptyState` | generic empty block | `icon?`, `title`, `description?`, `action?` |
| `IconPicker` | 8-col grid of `ICON_CHOICES` (lucide keys) | `value`, `onChange` |
| `PageHeader` | shared screen header — eyebrow + title + subtitle + right actions | `eyebrow?`, `title`, `subtitle?`, `actions?` |
| `PayeeInput` | free-text field with portalled ranked autocomplete (used for Payee AND "Paid with") | `value`, `onChange`, `suggestions: string[]`, `placeholder?`, `className?` |
| `PeriodPanel` | the period-chooser body (day/month presets + custom range) | `value: PeriodKey`, `custom`, `onChange`, `onPick?` |
| `PeriodPicker` | Popover trigger stating the active window; hosts `PeriodPanel` | `value: PeriodKey`, `custom`, `onChange` |
| `RangeCalendar` | `wb-calendar --range` with a live preview band | `value: Range\|null`, `onChange` |
| `Select` | native `<select>` wrapped with the chevron inside | `value`, `onChange`, `children` |
| `StatusCap` | the tone capsule for a transaction's status | `tx: Transaction` |
| `StatusPicker` | pick a `TxStatus` by clicking a capsule | `value: TxStatus`, `onChange`, `name?` |
| `TagChip` | a tag as a `#`-chip; neutral by `shade` (usage rank), or its own hue when `tinted` | `tag: Tag`, `shade?`, `tinted?`, `onRemove?` |

---

## 3. Feature-leaf — presentational (props + callbacks, no store)

These render in the `#/cashy` gallery with fake data. **The data shape each needs is
the important part** (fixtures at the top of `src/ui/dev/CashyGallery.tsx` show real
examples).

| Component | Purpose | Props / data shape |
|---|---|---|
| `BalanceCard` | one KPI tile with a delta-vs-previous footer | `label`, `amount`, `icon?`, `delta?: number\|null` (0.12 = +12%), `note?`, `muted?` |
| `BalanceForecastChart` | recharts area of projected balance | `data: ForecastPoint[]` where `ForecastPoint = { key, label, offset, balance }`; needs a fixed-height parent |
| `CashflowChart` | bars = spend (right axis) + line = running balance (left axis) | `data: WalletPoint[]` where `WalletPoint = { key, label, income, expense, balance }` |
| `SpendChart` | interactive SVG donut of spend-by-category | `slices: BreakdownSlice[]` (`{ id, name, colorHex, total, pct, count? }`), `total`, `label?`, `size?`, `selectedId?`, `onSelect?` |
| `TransactionTable` | the shared tx table (internal pagination, multi-select bulk-delete, row→detail) | `rows: Transaction[]`, `categories: Category[]`, `tagRanks: Map<string,TagRank>`, `pageSize`, `title?`/`subtitle?`/`headerActions?`/`emptyState?`, `onDelete(ids)` |
| `TxFilterBar` | search pill + one dropdown chip per facet | `q: TxQuery` (from `useTxQuery`), `tagRanks: TagRank[]`, `categories: Category[]` |
| `Pagination` | `wb-pagination` control (nothing for ≤1 page) | `page`, `totalPages`, `onPage` |
| `TagsMorePopover` | the "+n" overflow chip in a table tags cell | `tags: TagRank[]` (the hidden ones), `count` |
| `SubTile` | rounded icon tile; neutral unless `brand` | `icon`, `colorHex?`, `brand?`, `size?`, `iconSize?` |
| `SubscriptionCard` | one service card (last paid, owed, progress, status, foot actions) | `sub: Subscription`, `txs: Transaction[]`, `iconStyle?`, `onOpenCatchUp`, `onOpenHistory`, `onOpenCancel`, `onSetActive` |
| `SubscriptionDues` | "to confirm" rows — Paid/Skip each due cycle | `dues: Due[]` (`{ sub, month, txId }`), `max?`, `onConfirm`, `onSkip` |
| `SubscriptionCatchUp` | settle owed cycles (used-switch + oldest-first waterline + editable price) — controlled modal | `sub`, `pending: {month,txId}[]`, `open`, `onClose`, `onResolve(plan)`, `defaultAmount` |
| `SubscriptionHistory` | settled cycles, newest first, each with Undo — controlled modal | `sub`, `txs`, `open`, `onClose`, `onRevert(txId,month,wasPaid)` |
| `SubscriptionCancel` | cancel dialog asking WHEN the service stopped — controlled modal | `sub`, `pending`, `open`, `onClose`, `onCancel(cancelledAt)` |

`TagRank = { tag: Tag; count: number; shade: number }` (from `rankTags`). `Due`, `TxQuery`,
`Range`, `BreakdownSlice`, `WalletPoint`, `ForecastPoint` are exported from the relevant
`domain/*` module (or `useTxQuery`).

---

## 4. Containers / connected wrappers (call `useCashy` + usecases)

| Component | Purpose |
|---|---|
| `ConnectedSubscriptionCard` | wires a `SubscriptionCard` to usecases + hosts its 3 dialogs; every write is undoable via toast (imports usecases, not `useCashy`) |
| `Dashboard` | Overview: KPIs, projected balance, subscriptions strip, cash-flow + donut, insights, recent-tx table |
| `Transactions` | period + filter bar + full table (50/page) |
| `Subscriptions` | stats + "to confirm" dues + services table (in-file `SubscriptionRow`, not the card) |
| `Categories` | drag-to-reorder / drop-to-nest tree + in-file `CategoryEditor` modal |
| `Tags` | tag list + in-file `TagEditor` modal |
| `Settings` | appearance / workspace / data (export/import/sample) / danger zone |
| `Onboarding` | name the workspace + optionally load sample data (kit primitives only) |

## 5. Singleton modals (register a global open-handler)

Mounted once at the app root, opened imperatively via `lib/modals`.

| Component | Opened via | Composes |
|---|---|---|
| `TransactionEditor` | `openTxEditor(id\|null)` | Modal, Field/Input, Kbd, Textarea, TimePicker · DatePicker, CategorySelect, PayeeInput ×2, StatusPicker, TagChip |
| `SubscriptionEditor` | `openSubscriptionEditor(id\|null)` | Modal, Field, Textarea · IconPicker, ColorPicker, Select, TagChip, SubTile |
| `TransactionDetail` | `openTxDetail(id)` | receipt overlay · AmountDisplay, StatusCap, TagChip |

---

## 6. Screen → components map

```
Dashboard
├─ PageHeader · PeriodPicker → PeriodPanel → DateRangeInput, RangeCalendar
├─ BalanceCard ×4
├─ BalanceForecastChart                (ForecastPoint[])
├─ ConnectedSubscriptionCard ×N  →  SubscriptionCard → SubTile
│                                    + SubscriptionCatchUp / History / Cancel
├─ CashflowChart (WalletPoint[]) · SpendChart (BreakdownSlice[])
├─ TxFilterBar → TagChip   (q: TxQuery)
└─ TransactionTable → AmountDisplay, CategoryCap, StatusCap, TagChip, TagsMorePopover, Pagination → EmptyState

Transactions   PageHeader · PeriodPicker · AmountDisplay(net) · TxFilterBar · TransactionTable · EmptyState
Subscriptions  PageHeader · stat tiles · SubscriptionDues → SubTile · SubscriptionRow → SubTile, CategoryCap · EmptyState  → opens SubscriptionEditor
Categories     PageHeader · Tree (wb-tree DnD) → Icon · CategoryEditor(Modal) → ColorPicker, IconPicker, Select · EmptyState
Tags           PageHeader · wb-list · TagEditor(Modal) → ColorPicker · EmptyState
Settings       PageHeader · Section ×4   (kit primitives only)
Onboarding     kit primitives only

Always-mounted:  TransactionEditor · TransactionDetail · SubscriptionEditor · Toaster · ConfirmHost
```
