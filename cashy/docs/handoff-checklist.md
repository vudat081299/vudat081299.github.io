# Handoff checklist & open questions

> For the owner (Đạt). This records what the **documentation + component-catalogue
> pass** produced, what I verified, and the decisions I need from you. Per your
> instruction I did **not** ask in chat — tick the boxes and answer §3 when you're
> back. Resolve an item, then delete it (same convention as REBUILD-NOTES.md).
>
> Date of pass: **2026-07-23**.

---

## 1. What this pass did

- [x] **`tr → m` money fix.** Compact money is now English `k / m / b` with a dot
      decimal (`3.4m đ`), not `k / tr / tỷ` with a comma. `domain/money.ts`
      (`formatMoneyShort` + `trim`). Committed separately (`fix(cashy): English
      magnitude letters…`). Verified live in the chart axes (`80m`, `320m`, …).
- [x] **`CLAUDE.md`** — the new AI/onboarding map at the repo root: philosophy,
      run commands, mental model, architecture, data model, screens, component
      system, invariants, common tasks, docs index.
- [x] **`docs/data-model.md`** — full data dictionary: every entity + field, all
      enums, relationships (ER-style), derived-value → function map, persistence,
      invariants.
- [x] **`docs/components.md`** — the component catalogue: kit atoms/molecules,
      common, feature-leaf (with the data shapes for fake data), containers,
      singleton modals, and a screen → component map.
- [x] **`src/ui/dev/CashyGallery.tsx`** + route `#/cashy` — a live showcase of the
      Cashy-specific layer, low → high, fed by self-contained fixtures. Wired the
      same DEV-only, code-split way as `#/wb` (`App.tsx`, generalised the guard hook
      to `useIsDevRoute(slug)`).
- [x] **`README.md`** — points to `CLAUDE.md` first; lists both galleries and the
      new docs.
- [x] **`docs/architecture.md`** — light reconciliation: added the doc pointers,
      listed `CashyGallery`, corrected "leaf renders in WbGallery" → CashyGallery,
      fixed the test count.

## 2. Verification (all green at time of writing)

- [x] `pnpm build` passes (`tsc -b` + `check:layers` + vite build). Layering holds.
- [x] `pnpm lint` clean (only the pre-existing `wb-main.tsx` fast-refresh warning).
- [x] `pnpm test` — **186 pass (12 files)**.
- [x] `#/cashy` renders all 6 sections in **light and dark**; no console errors;
      charts, table (paginated), subscription cards, dues and the three dialogs all
      work; the money format shows `m`/`b`.
- [x] Galleries are DEV-only and code-split (own chunks; the `import.meta.env.DEV`
      guard means they are never *loaded* in production).

## 3. Open questions — all resolved

Everything below was decided and shipped; kept here as a short record.

> **Resolved 2026-07-23:** the `tr → m` question — kept `k / m / b`, number stays
> `vi-VN` (comma decimal), settled in `domain/money.ts`; and the English-translation
> scope — the whole app is English **incl. app-wide chart dates** (`domain/date.ts`);
> only the DEV galleries and the intentionally-Vietnamese seed data remain.

1. **Currency glyph — RESOLVED (2026-07-24).** Unified to the đồng sign **`₫`**
   (U+20AB) app-wide through `domain/money` (`formatMoney`/`formatMoneyShort`), plus
   the labels that showed a bare `đ` (loans/wallets/subscriptions editors, the amount
   facet). (Decided the opposite way from the earlier "unify to `đ`" suggestion.)

2. **Product docs vs. the web app — RESOLVED (2026-07-24).** Split
   [`docs/cashy-web-spec.md`](cashy-web-spec.md) describing what actually ships (with
   an explicit "not in the web build" list), and added a one-line pointer at the top
   of `cashy-vision.md` and `cashy-v1-spec.md`; `CLAUDE.md` cross-links it.

3. **Dev galleries in `dist/` — RESOLVED.** Kept as-is (code-split, DEV-guarded, never
   loaded in production).

## 4. Observations (not blocking — for when you want them)

- **In-file sub-components.** `Categories.tsx` (`CategoryEditor`, `Tree`),
  `Tags.tsx` (`TagEditor`), `Settings.tsx` (`Section`) keep small components inline.
  That's fine (feature-local, single-use); extract only if one gets reused elsewhere.
- **Gallery coverage.** `#/cashy` shows the common + feature-leaf + controlled
  dialogs. It deliberately omits the containers/screens and the three store-backed
  singleton modals (they read the live store) — see the note at the foot of the
  gallery and `components.md §4–5`.
- **`SubscriptionEditor.tsx` is large** (~450 lines: proration, trial, shared-plan
  hints). It's coherent but the densest UI file — a candidate for a future split if
  it grows.
- **Docs count drift** is a recurring trap — the test count has been wrong more than
  once (`61` → `98` → `186`). The canonical figure now lives in the README command
  table; other docs describe the tests without repeating a hard number. Re-check when
  tests are added.
