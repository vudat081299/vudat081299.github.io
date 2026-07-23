import type { CashyState, Contact } from "@/domain/types";
import { byName } from "@/domain/sort";

export const CONTACT_NAME_MAX = 80;
export const CONTACT_USERNAME_MAX = 30;
export const CONTACT_DEFAULT_ICON = "user";

type NormOk = { ok: true; name: string; username?: string };
type NormErr = { ok: false; error: string };

/**
 * Trim + validate a contact's editable fields. The single source of truth for
 * BR-contact-001/011/012; usecases + editor delegate here. `username` blank →
 * undefined (a local-only person). @BR-contact-001 @BR-contact-011 @BR-contact-012
 * @ADR-contact-002
 */
export function normalizeContactInput(input: { name: string; username?: string }): NormOk | NormErr {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Tên là bắt buộc" };
  if (name.length > CONTACT_NAME_MAX) return { ok: false, error: `Tên tối đa ${CONTACT_NAME_MAX} ký tự` };
  const username = input.username?.trim() || undefined;
  if (username && username.length > CONTACT_USERNAME_MAX)
    return { ok: false, error: `Username tối đa ${CONTACT_USERNAME_MAX} ký tự` };
  return { ok: true, name, username };
}

/**
 * Apply an edit to a contact, preserving its identity (`id` + `createdAt` never
 * change). Returns the updated contact, or null when the edit is invalid.
 * @BR-contact-005
 */
export function applyContactEdit(
  existing: Contact,
  patch: { name?: string; username?: string; colorHex?: string; icon?: string },
): Contact | null {
  const norm = normalizeContactInput({
    name: patch.name ?? existing.name,
    username: patch.username ?? existing.username,
  });
  if (!norm.ok) return null;
  return {
    ...existing,
    name: norm.name,
    username: norm.username,
    colorHex: patch.colorHex ?? existing.colorHex,
    icon: patch.icon ?? existing.icon,
  };
}

/** All contacts sorted A→Z by name (Vietnamese-aware). */
export function sortedContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort(byName);
}

/** Non-archived contacts, sorted A→Z — the ones offered for selection. @BR-contact-006 */
export function activeContacts(contacts: Contact[]): Contact[] {
  return sortedContacts(contacts.filter((c) => !c.archived));
}

/** Display label: name, plus `(@username)` when a handle is present. */
export function contactLabel(c: Contact): string {
  return c.username ? `${c.name} (@${c.username})` : c.name;
}

/**
 * Whether any record references this contact. Slice A: nothing links to a
 * contact yet (loans still carry a free-text counterparty), so always false.
 * Slice B extends this to scan loan/transaction `contactId`. The one seam the
 * delete-guard reads. @BR-contact-007 @BR-contact-008
 */
export function isContactReferenced(_state: CashyState, _contactId: string): boolean {
  return false;
}
