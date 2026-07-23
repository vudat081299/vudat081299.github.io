# Cashy — Contacts (feature doc)

> One of the per-feature docs in `docs/features/`. Describes the Contacts feature —
> the people you lend to / borrow from — as it exists in the code today. See also:
> [CLAUDE.md](../../CLAUDE.md), [architecture.md](../architecture.md),
> [data-model.md](../data-model.md), [components.md](../components.md).

## 1. What it does

Keeps a small directory of **people** you lend money to or borrow money from — a
first-class entity that **holds no money itself** (it is not a wallet and books no
transactions). Today it is a standalone address book; the intent is for a loan to
reference a `Contact` (see the `walletId`→`accountId` direction in
[wallets.md](wallets.md) and the loan editor's free-text counterparty), which is
why `Contact` already carries a disambiguating `username` and the delete path warns
about linked loans.

## 2. Screen & route

- Route `#/contacts` (hash router, `src/lib/router.ts`); nav item in
  `src/ui/app/Layout.tsx`.
- Screen (`src/ui/features/contacts/Contacts.tsx`): a `PageHeader` (+ "Add contact")
  over a `.cashy-loangrid` of `ContactCard`s, split into **Active** and (when any)
  an **Archived** group. Empty state is a one-line muted note. The **editor** is an
  in-file `ContactEditor` `Modal` (not a global singleton — it belongs to this
  screen), opened by the header button (add) or clicking a card (edit).

## 3. Data it touches

| Entity | Fields | R/W |
|---|---|---|
| `Contact` | `id`, `name` (required, trimmed, 1–80), `username?` (optional handle, ≤30), `colorHex` (classification hue), `icon` (curated lucide key), `archived`, `createdAt` | read (grid + editor); write via the four usecases |

No money, no foreign keys yet. `colorHex`/`icon` are identity, shown on the card's
tile (this is a contact-*about* surface, so the contact's own hue is used — the same
rule tags follow). Full shape in [data-model.md](../data-model.md).

## 4. Domain rules used

All pure, in `src/domain/contact.ts`.

| Function | What |
|---|---|
| `normalizeContactInput({name, username?})` | trims + validates → ok (`{name, username?}`) or an error (empty name / over length). The one gate both add and update pass through. |
| `applyContactEdit(contact, patch)` | the next contact after an edit (normalised). |
| `sortedContacts(contacts)` | display order (by name). |
| `activeContacts(contacts)` | the non-archived, sorted. |
| `contactLabel(c)` | `name` (+ ` @username` when set) — the disambiguated label. |
| `isContactReferenced(state, id)` | whether anything links to this contact — a stub returning `false` until the loan↔contact link lands; gates hard-delete vs archive. |
| `CONTACT_NAME_MAX` / `CONTACT_USERNAME_MAX` / `CONTACT_DEFAULT_ICON` | the field limits + default tile icon. |

## 5. Usecases

All in `src/usecases/contacts.ts` (UI writes only through these).

| Usecase | Effect |
|---|---|
| `addContact({name, username?, colorHex, icon})` | validate via `normalizeContactInput`; create + commit; returns the id (or `null` if invalid). |
| `updateContact(id, patch)` | normalise + shallow-merge a patch. |
| `setContactArchived(id, archived)` | archive (hide from active) / unarchive; history kept. |
| `deleteContact(id)` | hard-delete; returns whether it happened (guarded by `isContactReferenced` once loans link). |

## 6. Components

| Component | Tier | File | Role |
|---|---|---|---|
| `Contacts` | container/screen | `ui/features/contacts/Contacts.tsx` | reads `useCashy()`; active/archived grids + in-file `ContactEditor` |
| `ContactCard` | feature-leaf | `ui/features/contacts/ContactCard.tsx` | one contact as a card — composes `CardIdentity` (tinted tile + name + `@username` subtitle); click → edit; dimmed when archived |
| `ContactEditor` | modal (in-file) | *(in `Contacts.tsx`)* | add/edit form (name, optional username, colour, icon) + archive / delete |
| `ContactPicker` | feature-leaf | `ui/features/contacts/ContactPicker.tsx` | a select-or-create contact control — **staged for the loan↔contact link, not yet wired to any screen** |
| `PageHeader`, `CardIdentity`, `ColorPicker`, `IconPicker` | common | `ui/common/…` | header + card identity + editor pickers |

## 7. Behaviours & edge cases

- **Name is the only required field**; save is disabled until it is non-empty, and
  `normalizeContactInput` trims and length-checks both fields.
- **Archive vs delete.** Archive hides a contact from active use but keeps it;
  delete is hard and confirmed, and the dialog steers you to archive if the contact
  is linked to a loan (the `isContactReferenced` guard becomes real once that link
  ships).
- **New-contact hue** rotates through `lib/palette.SWATCHES` by how many contacts
  already exist, so a fresh contact gets a distinct colour without a manual pick.
- **Identity colour on-surface.** The card shows the contact's own `colorHex`/`icon`
  because this is the contact's *about* surface — consistent with the tag rule.

## 8. Files

- `src/ui/features/contacts/Contacts.tsx` — screen + in-file `ContactEditor`
- `src/ui/features/contacts/ContactCard.tsx` — the contact card (composes `CardIdentity`)
- `src/ui/features/contacts/ContactPicker.tsx` — staged select-or-create control (unwired)
- `src/domain/contact.ts` — the pure rules (§4)
- `src/usecases/contacts.ts` — the writes (§5)
- `src/domain/types.ts` — the `Contact` shape
