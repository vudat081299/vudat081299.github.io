import { beforeEach, describe, expect, it } from "vitest";
import { getState, commit } from "@/data/store";
import { emptyState } from "@/data/persistence";
import { addContact, deleteContact, setContactArchived, updateContact } from "@/usecases/contacts";
import { CONTACT_DEFAULT_ICON } from "@/domain/contact";

beforeEach(() => commit(emptyState()));

describe("addContact", () => {
  it("adds a valid contact and returns its id", () => {
    const id = addContact({ name: "Anh Minh", colorHex: "#111", icon: "user" });
    expect(id).toBeTruthy();
    expect(getState().contacts).toHaveLength(1);
    expect(getState().contacts[0].name).toBe("Anh Minh");
  });
  it("refuses an empty name and adds nothing (@BR-contact-001)", () => {
    expect(addContact({ name: "  ", colorHex: "#111", icon: "user" })).toBeNull();
    expect(getState().contacts).toHaveLength(0);
  });
  it("allows two contacts with the same name (@BR-contact-002)", () => {
    addContact({ name: "Anh", colorHex: "#111", icon: "user" });
    addContact({ name: "Anh", colorHex: "#222", icon: "user" });
    expect(getState().contacts).toHaveLength(2);
  });
  it("falls back to the default icon when given an empty icon", () => {
    const id = addContact({ name: "Anh", colorHex: "#111", icon: "" })!;
    expect(getState().contacts.find((c) => c.id === id)!.icon).toBe(CONTACT_DEFAULT_ICON);
  });
  it("stores no username when none is given (@BR-contact-003)", () => {
    const id = addContact({ name: "Anh", colorHex: "#111", icon: "user" })!;
    expect(getState().contacts.find((c) => c.id === id)!.username).toBeUndefined();
  });
});

describe("updateContact keeps identity (@BR-contact-005)", () => {
  it("changes name without changing id/createdAt", () => {
    const id = addContact({ name: "Anh Minh", colorHex: "#111", icon: "user" })!;
    const before = getState().contacts[0];
    updateContact(id, { name: "Minh" });
    const after = getState().contacts[0];
    expect(after.id).toBe(before.id);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.name).toBe("Minh");
    expect(getState().contacts).toHaveLength(1);
  });
  it("returns false for a nonexistent id", () => {
    expect(updateContact("nonexistent", { name: "Minh" })).toBe(false);
  });
  it("returns false and leaves the contact unchanged on an invalid patch (empty name)", () => {
    const id = addContact({ name: "Anh Minh", colorHex: "#111", icon: "user" })!;
    const before = getState().contacts[0];
    expect(updateContact(id, { name: "" })).toBe(false);
    expect(getState().contacts[0]).toEqual(before);
  });
  it("clears an existing username end-to-end (@BR-contact-003)", () => {
    const id = addContact({ name: "Anh Minh", username: "minh_vcb", colorHex: "#111", icon: "user" })!;
    expect(getState().contacts[0].username).toBe("minh_vcb");
    expect(updateContact(id, { username: "" })).toBe(true);
    expect(getState().contacts[0].username).toBeUndefined();
  });
});

describe("deleteContact (@BR-contact-007, @BR-contact-008)", () => {
  it("deletes an unreferenced contact permanently (@BR-contact-007)", () => {
    const id = addContact({ name: "X", colorHex: "#111", icon: "user" })!;
    expect(deleteContact(id)).toBe(true);
    expect(getState().contacts).toHaveLength(0);
  });
  it("returns false for a nonexistent id", () => {
    expect(deleteContact("nonexistent")).toBe(false);
  });
  // @BR-contact-008: a referenced contact is blocked from hard-delete. In slice A
  // nothing references a contact, so this guard cannot yet be exercised true —
  // slice B (loan link) feeds `isContactReferenced` and adds the blocked case.
});

describe("setContactArchived (@BR-contact-006)", () => {
  it("archives and unarchives", () => {
    const id = addContact({ name: "X", colorHex: "#111", icon: "user" })!;
    setContactArchived(id, true);
    expect(getState().contacts[0].archived).toBe(true);
    setContactArchived(id, false);
    expect(getState().contacts[0].archived).toBe(false);
  });
});
