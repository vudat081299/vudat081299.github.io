# Cashy — Loan Redesign Programme · Review & Handoff

> Written 2026-07-23. This is the durable record for the **loan-redesign programme** (3 vertical slices) and the review checklist for **Slice A (Contact)**, which is done. Read this to pick the work back up. Full agreed design lives in the assistant memory `cashy-loan-redesign`; per-slice artifacts live under `docs/agentic-workflow/{specs,tech-designs,plans}/` + `features/cashy/…`.

## Programme status

| Slice | Feature | State | Migration |
|-------|---------|-------|-----------|
| **A** | **Contact** (danh bạ đối tác vay/mượn) | ✅ **DONE** — implemented, reviewed, verified, on `main` | v9 |
| B | **Loan redesign** (transaction-linked) | ⏳ not started — **next** | v10 |
| C | **Stats aggregation toggle** (Dashboard) | ⏳ not started | — |

Build convention this programme used: **build-on-`main` directly** (no feature worktree), per the user's choice. kv pipeline artifacts are at **repo-root** `docs/agentic-workflow/…` + `features/…` (the tracing hooks are `$repo`-anchored); app code is under `cashy/src/`.

---

## SLICE A — Contact · Review checklist (for you to check later)

Artifacts: [spec](specs/2026-07-23-contact.md) (Ready) · [tech-design](tech-designs/2026-07-23-contact.md) (Ready) · [plan](plans/2026-07-23-contact.md) (Ready) · BDD [`features/cashy/contacts/danh-ba-doi-tac.feature`](../../features/cashy/contacts/danh-ba-doi-tac.feature) (28 scenarios).

### What to spot-check in the app (`#/contacts`)
- [ ] Add a contact (name + optional username) → appears in the grid with a person icon + `@username` subtitle
- [ ] Edit a contact → rename works; **clearing the username removes it** (this was the bug the final review caught — verify it stays fixed)
- [ ] Archive / Unarchive → moves between the active grid and the "Archived" section
- [ ] Delete an unreferenced contact → removed
- [ ] Names are **not** unique (two "Anh" allowed)
- [ ] Name > 80 chars / username > 30 chars rejected (Save disabled on empty name)
- [ ] Settings → Load sample data → demo contacts (Bố mẹ, Anh Hùng, Minh, Chị Hoà, Nhóm bạn thân) appear
- [ ] Export → Import → contacts return with Vietnamese diacritics intact (NFR-contact-001)
- [ ] UI chrome is English; only data (names) is Vietnamese
- [ ] Contacts nav item shows a count badge; grid is 3-up on desktop; dark mode OK

### Automated verification (already run, all green)
```bash
cd cashy && export PATH="/opt/homebrew/opt/node/bin:$PATH"
pnpm test        # 162 tests pass (domain + usecases + migration + export/import round-trip)
pnpm tsc -b      # clean
node scripts/check-layers.mjs   # clean (ui→usecases→domain(+data) holds)
pnpm build       # clean
```

### Review outcomes (all reviews passed; doer≠judge, fresh context each)
| Gate | Verdict | Notes |
|------|---------|-------|
| Task 1 — domain | Spec ✅ · Approved | fixed a brief bug: domain test must not import `@/data` (layer rule) → inline fixture |
| Task 2 — usecases | Spec ✅ · Approved | — |
| Task 3 — data (v9/seed/import-export) | Spec ✅ · Approved | append-only migration verified; backward-compat double-covered |
| Task 4 — [UI] Contacts screen | Spec ✅ · Approved · 0 issues | English chrome + layering machine-verified |
| Task 5 — [UI] ContactPicker | Spec ✅ · Approved · 0 issues | 2 deviations verified sound (dropped self-wrapping `wb-field`; `wb-chip`→`cashy-tile`) |
| **Final whole-branch (opus)** | **Ready-with-fixes · no Critical** | found the username-clear bug (below) |

### Findings & their resolution
- **[FIXED · was Important] Username could not be cleared once set.** Editor sent `username.trim() || undefined`; `applyContactEdit` did `patch.username ?? existing.username` → restored the old handle. Fixed editor to send `username.trim()` (`""` when cleared → normalizes to `undefined`). Now covered by tests. Commit `e647fa7`.
- **[FIXED · Minor] Vietnamese domain error strings** → English (`"Name is required"`, etc.). Were unsurfaced in slice A but would leak in slice B's loan editor. `e647fa7`.
- **[FIXED · Minor] Missing negative-path tests** (`updateContact`/`deleteContact` on missing id → false; invalid edit → false; icon fallback; username clear/preserve) → +8 tests (150→162). `e647fa7`.
- **[FIXED · Minor] `CONTACT_DEFAULT_ICON="user"` had no glyph** in the icon kit → contacts rendered a fallback circle. Added lucide `User`/`Users` to `icon-map.ts`. `edd9616`.
- **[FIXED · Minor] Docs drift** — `cashy/CLAUDE.md §5` + `cashy/docs/data-model.md` now include the `Contact` entity + `CURRENT_VERSION = 9`. `e647fa7` + `ed4fa09`.
- **[FIXED · cosmetic] Contacts nav count badge** added for consistency. `e647fa7`.

### Deferred (your call — low priority, non-blocking)
- [ ] `deleteContact` traverses `contacts` twice (`.some` then `.filter`) — style nit, no perf impact at slice-A scale.
- [ ] Migration v8→v9 test asserts `contacts` is added but not that a sibling array is untouched — could tighten to match its "without touching other data" name.
- [ ] Optionally mark the spec `status: completed` via `verify-done` once you've eyeballed the checklist above.

### Key design decisions (ADRs, in the tech-design)
- Contact is a top-level `CashyState.contacts` entity mirroring Wallet/Loan (ADR-001).
- Business rules live in pure `domain/contact.ts`; `isContactReferenced(state,id)` is the single seam the delete-guard reads — **returns `false` in slice A** and **slice B extends it** to scan loan references (ADR-002/003).
- Persistence seam (`data/store` + `data/persistence`) kept **BE-ready, no repository** — a future backend swaps `persistence.load/save` to async without touching usecases/domain/ui (ADR-005).
- `username` doubles as the account handle for a counterparty who is themselves a system user; live account-linking is out of scope (no backend today).

---

## HANDOFF — how to continue at home

### Environment
- Node ≥ 22 is at Homebrew: `export PATH="/opt/homebrew/opt/node/bin:$PATH"` before `pnpm`.
- Preview via `.claude/launch.json` config `cashy-dev-s3` (Vite, port **5199**). Other chats have used 5173/5176/5188.
- App code: `cashy/src/` (`domain/` pure → `usecases/` → `ui/`; `data/` = persistence seam). Layer rule enforced by `cashy/scripts/check-layers.mjs` (runs in `pnpm build`).

### Slice B — Loan redesign (next). Decisions already agreed (see memory `cashy-loan-redesign`):
- Each disbursement (cho vay / vay thêm) and repayment (trả) is a **real `Transaction`** carrying a new `loanId`, **transfer-like** (excluded from income/expense). Multiple of each per loan.
- `outstanding` / `paid` / progress **derived from the ledger** — drop `loan.payments[]` and hard `principal`. No negative amounts.
- **Interest**: monthly reducing-balance compound at a single rate; `owed` is a **pure derived function** (no interest transaction, no stored `owed`). Auto-settle is a **sticky derived status**.
- Loan links to a **Contact by id** (consume slice A's entity + `ContactPicker`).
- **Migration v10**: existing loans are demo → drop + reseed in the new model.
- **Resolve these ❓ at the START of slice B's `/spec`** (worked example implies subtract-repayments-then-apply-interest, e.g. 100 → repay 20 → 80 → ×1.10 = 88): VND rounding rule + order; multi-tranche compounding anchor; overpayment-excess handling; progress-% denominator once interest applies; whether interest freezes on archive.
- Carry the architecture directive (UI/logic split; BE-ready query layer; per-feature sub-modules) into slice B's `to-tech-design`.

**To kick off slice B:** run the kv pipeline again — `discovery` is effectively done (decisions above), so write the slice-B handoff and run `/spec`, then `/bdd` → `/design` → `/plan` → exec-plan. Same build-on-`main` convention (or switch to a worktree if you prefer isolation).

### Slice C — Stats aggregation toggle
Dashboard multi-select filter: pure spending / + subscription / + loans. Default = spending + subscription (loans off).

### Reusable pieces slice A already shipped for B
- `Contact` entity + `usecases/contacts.ts` + `domain/contact.ts` (`isContactReferenced` seam ready to extend).
- `ui/features/contacts/ContactPicker.tsx` — search + inline-create contact picker; **wire it into the loan editor in slice B**.
