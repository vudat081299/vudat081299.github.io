import { beforeEach, describe, expect, it } from "vitest";
import { getState, commit } from "@/data/store";
import { emptyState } from "@/data/persistence";
import { createWorkspace, exportData, importData, loadSampleData } from "@/usecases/workspace";

beforeEach(() => commit(emptyState()));

describe("contacts round-trip through export/import (@BR-contact-009, NFR-contact-001)", () => {
  it("restores contacts with identity + Vietnamese diacritics intact", () => {
    commit({
      ...getState(),
      workspace: { displayName: "T", currency: "VND", createdAt: "2026-01-01T00:00:00.000Z" },
      contacts: [{ id: "keep", name: "Nguyễn Thị Hoà", username: "hoa_vcb", colorHex: "#111", icon: "user", archived: false, createdAt: "2026-01-01T00:00:00.000Z" }],
    });
    const json = exportData();
    commit(emptyState());
    expect(importData(json).ok).toBe(true);
    const c = getState().contacts;
    expect(c).toHaveLength(1);
    expect(c[0].id).toBe("keep");
    expect(c[0].name).toBe("Nguyễn Thị Hoà");
    expect(c[0].username).toBe("hoa_vcb");
  });
});

describe("demo seed contacts (@BR-contact-010)", () => {
  it("createWorkspace starts empty; loadSampleData seeds demo contacts", () => {
    createWorkspace({ displayName: "T" });
    expect(getState().contacts).toEqual([]);
    loadSampleData();
    expect(getState().contacts.length).toBeGreaterThan(0);
  });
});
