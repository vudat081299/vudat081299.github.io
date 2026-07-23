import { describe, expect, it } from "vitest";
import type { CashyState, Subscription, Transaction } from "@/domain/types";
import { migrate } from "@/data/migrations";

// Only the v6 (wallets) branch is exercised here — calling migrate with
// fromVersion 5 skips the earlier recolor/subscription branches.

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t",
    amount: 100,
    type: "expense",
    categoryId: null,
    tagIds: [],
    note: "",
    status: "recorded",
    occurredAt: "2026-03-15",
    createdAt: "2026-03-15T00:00:00.000Z",
    ...over,
  };
}

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: "s",
    name: "Netflix",
    amount: 100,
    interval: "monthly",
    dayOfMonth: 1,
    categoryId: null,
    tagIds: [],
    colorHex: "#000000",
    icon: "film",
    note: "",
    active: true,
    startedAt: "2026-01-01",
    lastPaidAt: null,
    paymentTxIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function stateV5(over: Partial<CashyState> = {}): CashyState {
  return {
    version: 5,
    theme: "system",
    subIconStyle: "neutral",
    workspace: { displayName: "T", currency: "VND", createdAt: "2026-01-01T00:00:00.000Z" },
    categories: [],
    tags: [],
    transactions: [],
    subscriptions: [],
    wallets: [],
    ...over,
  };
}

describe("migration v6 — free-text account → wallets", () => {
  const base = stateV5({
    transactions: [
      tx({ id: "a", account: "Techcombank Visa" }),
      tx({ id: "b", account: "MoMo" }),
      tx({ id: "c", account: "Techcombank Visa" }), // duplicate → same wallet
      tx({ id: "d" }), // no account → stays unlinked
    ],
    subscriptions: [sub({ id: "s1", account: "Vietcombank" })],
  });
  const out = migrate(base, 5);
  const byName = (name: string) => out.wallets.find((w) => w.name === name);

  it("creates one wallet per distinct account string", () => {
    expect(out.wallets).toHaveLength(3);
    expect(new Set(out.wallets.map((w) => w.name))).toEqual(
      new Set(["Techcombank Visa", "MoMo", "Vietcombank"]),
    );
  });

  it("guesses a sensible kind from the name", () => {
    expect(byName("Techcombank Visa")?.kind).toBe("card"); // card wins over bank
    expect(byName("MoMo")?.kind).toBe("ewallet");
    expect(byName("Vietcombank")?.kind).toBe("bank");
  });

  it("links every row (and dedupes) by walletId, leaving account intact", () => {
    const t = (id: string) => out.transactions.find((x) => x.id === id);
    expect(t("a")?.walletId).toBe(byName("Techcombank Visa")?.id);
    expect(t("c")?.walletId).toBe(byName("Techcombank Visa")?.id); // same wallet as "a"
    expect(t("b")?.walletId).toBe(byName("MoMo")?.id);
    expect(t("d")?.walletId).toBeUndefined(); // no account → not linked
    expect(t("a")?.account).toBe("Techcombank Visa"); // additive — account preserved
    expect(out.subscriptions[0].walletId).toBe(byName("Vietcombank")?.id);
  });

  it("gives wallets a zero opening balance and orders them", () => {
    for (const w of out.wallets) expect(w.openingBalance).toBe(0);
    expect(out.wallets.map((w) => w.order).sort()).toEqual([0, 1, 2]);
  });

  it("is a no-op when wallets already exist (idempotent guard)", () => {
    expect(migrate(out, 5).wallets).toHaveLength(3);
  });

  it("handles a workspace with no account strings at all", () => {
    const clean = migrate(stateV5({ transactions: [tx({ id: "x" })] }), 5);
    expect(clean.wallets).toEqual([]);
    expect(clean.transactions[0].walletId).toBeUndefined();
  });
});
