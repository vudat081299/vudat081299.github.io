import { describe, expect, it } from "vitest";
import type { CashyState, Contact } from "@/domain/types";
import {
  activeContacts,
  applyContactEdit,
  contactLabel,
  isContactReferenced,
  normalizeContactInput,
} from "@/domain/contact";

// A minimal full CashyState fixture, built inline rather than via
// data/persistence.emptyState() — domain/** must stay pure (no @/data import,
// even in a test file; see scripts/check-layers.mjs).
function state(over: Partial<CashyState> = {}): CashyState {
  return {
    version: 1,
    theme: "system",
    subIconStyle: "neutral",
    workspace: null,
    categories: [],
    tags: [],
    transactions: [],
    subscriptions: [],
    wallets: [],
    loans: [],
    contacts: [],
    ...over,
  };
}

function con(over: Partial<Contact> = {}): Contact {
  return {
    id: "c1",
    name: "Anh Minh",
    colorHex: "#000000",
    icon: "user",
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("normalizeContactInput", () => {
  it("trims and accepts a valid name (@BR-contact-001)", () => {
    const r = normalizeContactInput({ name: "  Anh Minh  " });
    expect(r).toEqual({ ok: true, name: "Anh Minh", username: undefined });
  });
  it("rejects an empty / whitespace-only name (@BR-contact-001)", () => {
    expect(normalizeContactInput({ name: "   " }).ok).toBe(false);
  });
  it("keeps an optional username, dropping blank to undefined (@BR-contact-003)", () => {
    expect(normalizeContactInput({ name: "A", username: " minh " })).toMatchObject({ username: "minh" });
    expect(normalizeContactInput({ name: "A", username: "  " })).toMatchObject({ username: undefined });
  });
  it("rejects a name longer than 80 chars (@BR-contact-011)", () => {
    expect(normalizeContactInput({ name: "x".repeat(81) }).ok).toBe(false);
    expect(normalizeContactInput({ name: "x".repeat(80) }).ok).toBe(true);
  });
  it("rejects a username longer than 30 chars (@BR-contact-012)", () => {
    expect(normalizeContactInput({ name: "A", username: "u".repeat(31) }).ok).toBe(false);
    expect(normalizeContactInput({ name: "A", username: "u".repeat(30) }).ok).toBe(true);
  });
});

describe("names are not unique (@BR-contact-002)", () => {
  it("normalizes two identical names independently — no dedup here", () => {
    expect(normalizeContactInput({ name: "Anh" }).ok).toBe(true);
    expect(normalizeContactInput({ name: "Anh" }).ok).toBe(true);
  });
});

describe("applyContactEdit — identity is immutable (@BR-contact-005)", () => {
  it("keeps id + createdAt, updates name/username/color/icon", () => {
    const before = con({ id: "keep", createdAt: "2026-01-01T00:00:00.000Z", name: "Anh Minh" });
    const after = applyContactEdit(before, { name: "Minh", colorHex: "#fff" });
    expect(after).not.toBeNull();
    expect(after!.id).toBe("keep");
    expect(after!.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(after!.name).toBe("Minh");
    expect(after!.colorHex).toBe("#fff");
  });
  it("returns null on an invalid edit (empty name)", () => {
    expect(applyContactEdit(con(), { name: "" })).toBeNull();
  });
});

describe("activeContacts (@BR-contact-006)", () => {
  it("excludes archived and sorts by name (vi)", () => {
    const list = [con({ id: "b", name: "Bình" }), con({ id: "a", name: "An" }), con({ id: "z", name: "Zed", archived: true })];
    expect(activeContacts(list).map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("contactLabel", () => {
  it("appends @username when present", () => {
    expect(contactLabel(con({ name: "Minh", username: "minh_vcb" }))).toBe("Minh (@minh_vcb)");
    expect(contactLabel(con({ name: "Minh", username: undefined }))).toBe("Minh");
  });
});

describe("isContactReferenced (@BR-contact-007, @BR-contact-008)", () => {
  it("is false in slice A — nothing references a contact yet", () => {
    const st: CashyState = { ...state(), contacts: [con()] };
    expect(isContactReferenced(st, "c1")).toBe(false);
  });
});
