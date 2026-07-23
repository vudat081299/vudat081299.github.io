# Cashy — Architecture walkthrough

A tour of how the code is organised — the layers, the file tree, the dependency
rule, and (most importantly) how it is built for **strong reuse**: every small
rule (rounding, money/percent formatting, dates) lives in exactly one place.
For the normative spec see [`docs/architecture.md`](docs/architecture.md).

---

## 1. Four layers, one-way dependency

```
        ui/  ─────▶  usecases/  ─────▶  domain/         (pure — no React / no I/O)
         │                                  ▲
         └────────────  data/  ─────────────┘           (store · localStorage)

        lib/  = leaf; importable anywhere (may import only @/domain/types)
```

This is **enforced**, not a convention: `scripts/check-layers.mjs` runs inside
`pnpm build`, so a violation fails the build.

| Layer | May NOT import | Meaning |
|---|---|---|
| `domain/` | `data`, `usecases`, `ui`, `react`, `react-dom` | pure rules — readable & testable without booting the app |
| `data/` | `usecases`, `ui` | sits below usecases |
| `usecases/` | `ui` | only: read state → ask domain for the next state → `commit` |
| `ui/kit/` | `domain`, `data`, `usecases` | a generic design system that knows nothing about Cashy |
| `ui/*` | `@/data/*` (except `store`, `draft`) | UI touches the store only through `useCashy` |
| `lib/` | everything except `@/domain/types` | a true leaf |

---

## 2. File tree (real counts, tests excluded)

```
src/
├─ domain/     16 files (+9 tests)   ── pure rules: types, transaction, subscription,
│                                       wallet, loan, category, tag, analytics, contact
│                                       + SHARED helpers: money, format, date, period, sort
├─ data/        6 files (+1 test)    ── store · persistence · migrations · seed · sample · draft
├─ usecases/   10 files (+2 tests)   ── categories tags transactions subscriptions wallets
│                                       loans contacts settings workspace
├─ ui/kit/     63 files              ── wb-* generic design system (Button, Modal, Popover, charts…)
├─ ui/common/  21 files              ── Cashy-aware building blocks: AmountDisplay, StatFigure,
│                                       FacetChip, CardIdentity, CategoryCap, pickers…
├─ ui/features/37 files              ── 10 screens: dashboard transactions subscriptions wallets
│                                       loans categories tags contacts settings onboarding
├─ ui/app/      2 files              ── Layout · ErrorBoundary
├─ ui/dev/      2 files              ── WbGallery (#/wb) · CashyGallery (#/cashy) — DEV only, code-split
└─ lib/         8 files              ── id palette utils(cn) router theme toast confirm modals
```

Import a specific domain module (`@/domain/subscription`) when you need one area;
import the barrel `@/domain` only when a file genuinely spans several.

---

## 3. ⭐ The reuse map — one rule, one home

The principle: **a rule is written once**. No `Math.round(x*100)+"%"` scattered
across screens, no home-rolled money formatting per feature.

| Concern | The one file | Functions |
|---|---|---|
| **Format money** | `domain/money.ts` | `formatMoney` (`18.785.000 đ`), `formatMoneyShort` (`3,4m` — a k/m/b letter carries the unit, so **no "đ"**), `formatDigits`, `signedMoney` |
| **Parse money** | `domain/money.ts` | `parseMoney` (text → integer đồng) |
| **Round / coerce money** | `domain/money.ts` | `toVnd` (round to whole đồng), `toVndNonNeg` (clamp ≥ 0) — **every** usecase that writes a money field routes through these |
| **Format percent** | `domain/format.ts` | `formatPercent(ratio, decimals?)` → `"13%"` / `"12,8%"`, vi-VN comma |
| **Dates / periods** | `domain/date.ts`, `domain/period.ts` | YMD parsing, `daysBetween`, `todayYMD`, `fmtDateShort`, period ranges + `prevRange` — no date maths inline in components |
| **Sorting** | `domain/sort.ts` | stable comparators reused across aggregates |
| **className merge / id / colour** | `lib/utils.ts` (`cn`), `lib/id.ts` (`uid`), `lib/palette.ts` | cross-cutting plumbing |

**Reuse at the UI layer** — two baskets, generic vs Cashy-aware:

- `ui/kit/` (63) — generic `wb-*` primitives; know nothing about Cashy, reusable by any app.
- `ui/common/` (21) — Cashy-aware but purely presentational (no store). Examples:
  - **`AmountDisplay`** — the *one* way money is drawn (colour = status, not sign).
  - **`StatFigure` + `.cashy-figrow`** — one "labelled figure"; shared by the Loans overview and the Dashboard Balances breakdown.
  - **`FacetChip`** — the filter capsule shared by Transactions and Loans (dashed when unselected, solid when selected).
  - **`CardIdentity`** — the "tile + name + subtitle" every entity card (Wallet / Subscription / Loan) composes from.

One money value's round-trip, e.g. creating a loan:

```
LoanEditor (ui) → addLoan (usecase) → toVndNonNeg(principal) [domain/money] → commit (data)
display:          loanOutstanding [domain/loan] → <AmountDisplay short/> → formatMoneyShort [domain/money]
```

No step does its own `Math.round` or appends `" đ"` by hand.

---

## 4. Tooling

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `tsc -b` → **`check-layers.mjs`** → `vite build` (a layer violation fails the build) |
| `pnpm test` / `test:watch` | Vitest — pure tests over `domain/` + `data/` (no DOM) |
| `pnpm lint` | oxlint |
| `pnpm check:layers` | run the layer-rule enforcer on its own |

Deliberately minimal: a **single** custom script (`scripts/check-layers.mjs`) — the
"constitution" of the architecture.

---

## 5. The docs roster (what each doc is for)

| Group | File | Job |
|---|---|---|
| **Normative spec** | `docs/architecture.md` | The spec for anyone (human or agent) editing `src/`: layer rules, domain rules, usecases, §3.3 shared helpers |
| | `docs/data-model.md` | The data dictionary — every entity shape + the invariants (money = integer VND, only `recorded` counts, …) |
| | `docs/components.md` | Every UI component, low → high, with its props + a screen→component map |
| **Business / vision** | `docs/cashy-vision.md` | Product vision (Vietnamese) |
| | `docs/cashy-v1-spec.md` | Detailed v1 spec — use cases, screens, tech stack |
| | `docs/features/*.md` (11) | One doc per feature, describing it **exactly as the code is today**: overview, transactions, subscriptions, wallets, loans, categories, tags, contacts, settings, onboarding (+ a README index) |
| **Plans (design record)** | `docs/loans-plan.md` | ✅ SHIPPED — kept as the design record |
| | `docs/wallets-plan.md` | 📋 PLAN, not built — awaiting go-ahead per phase |
| **Handoff / ops** | `docs/handoff-checklist.md` | For the owner: documentation + component-catalogue status |
| | `REBUILD-NOTES.md` | Log of rebuilding every screen onto web-builder + open questions |
| | `README.md` / `CLAUDE.md` | Repo README · `CLAUDE.md` = the guide + conventions an agent must follow |

> **On "skill" docs:** this repo has no custom skills yet (`.claude/skills/` is empty).
> The `code-review` skill is a machine/system skill marked `disable-model-invocation`,
> so it only runs when invoked explicitly as `/code-review`.
