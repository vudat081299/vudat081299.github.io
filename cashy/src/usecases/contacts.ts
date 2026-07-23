import type { Contact } from "@/domain/types";
import { commit, getState } from "@/data/store";
import { CONTACT_DEFAULT_ICON, applyContactEdit, isContactReferenced, normalizeContactInput } from "@/domain/contact";
import { uid } from "@/lib/id";

/** Create a contact appended to the list. Returns the new id, or null when the
 *  input is invalid (empty / too-long name or username). */
export function addContact(input: { name: string; username?: string; colorHex: string; icon: string }): string | null {
  const norm = normalizeContactInput(input);
  if (!norm.ok) return null;
  const state = getState();
  const contact: Contact = {
    id: uid(),
    name: norm.name,
    username: norm.username,
    colorHex: input.colorHex,
    icon: input.icon || CONTACT_DEFAULT_ICON,
    archived: false,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, contacts: [...state.contacts, contact] });
  return contact.id;
}

/** Patch a contact's editable fields, preserving its identity. Returns false
 *  when the contact is missing or the edit is invalid. */
export function updateContact(
  id: string,
  patch: { name?: string; username?: string; colorHex?: string; icon?: string },
): boolean {
  const state = getState();
  const existing = state.contacts.find((c) => c.id === id);
  if (!existing) return false;
  const next = applyContactEdit(existing, patch);
  if (!next) return false;
  commit({ ...state, contacts: state.contacts.map((c) => (c.id === id ? next : c)) });
  return true;
}

/** Archive / un-archive — hides from active selection, keeps the record. @BR-contact-006 */
export function setContactArchived(id: string, archived: boolean): void {
  const state = getState();
  commit({ ...state, contacts: state.contacts.map((c) => (c.id === id ? { ...c, archived } : c)) });
}

/**
 * Delete a contact permanently — ONLY when nothing references it (@BR-contact-007).
 * A referenced contact cannot be hard-deleted (@BR-contact-008): the caller
 * should archive instead. Returns true when deleted, false when blocked/missing.
 * @ADR-contact-003
 */
export function deleteContact(id: string): boolean {
  const state = getState();
  if (isContactReferenced(state, id)) return false;
  if (!state.contacts.some((c) => c.id === id)) return false;
  commit({ ...state, contacts: state.contacts.filter((c) => c.id !== id) });
  return true;
}
