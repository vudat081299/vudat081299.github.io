import { beforeEach, describe, expect, it } from "vitest";
import type { CashyState } from "@/domain/types";
import { emptyState, load } from "@/data/persistence";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});

beforeEach(() => storage.clear());

describe("persistence load", () => {
  it("preserves an onboarded empty ledger so sample data remains opt-in", () => {
    const state: CashyState = {
      ...emptyState(),
      workspace: {
        displayName: "Mine",
        currency: "VND",
        createdAt: "2026-07-24T00:00:00.000Z",
      },
    };
    localStorage.setItem("cashy_state_v1", JSON.stringify(state));

    const loaded = load();

    expect(loaded.workspace?.displayName).toBe("Mine");
    expect(loaded.transactions).toEqual([]);
    expect(loaded.subscriptions).toEqual([]);
    expect(loaded.contacts).toEqual([]);
  });
});
