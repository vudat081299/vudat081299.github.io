import { beforeEach, describe, expect, it } from "vitest";
import { getState, commit } from "@/data/store";
import { emptyState } from "@/data/persistence";
import { addContact, deleteContact, setContactArchived, updateContact } from "@/usecases/contacts";

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
});

describe("deleteContact (@BR-contact-007, @BR-contact-008)", () => {
  it("deletes an unreferenced contact permanently (@BR-contact-007)", () => {
    const id = addContact({ name: "X", colorHex: "#111", icon: "user" })!;
    expect(deleteContact(id)).toBe(true);
    expect(getState().contacts).toHaveLength(0);
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
