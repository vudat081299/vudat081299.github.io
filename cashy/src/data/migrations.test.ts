import { describe, expect, it } from "vitest";
import type { CashyState, Loan, Subscription, Transaction } from "@/domain/types";
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
    loans: [],
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

describe("migration v7 — loans array added", () => {
  const sampleLoan: Loan = {
    id: "L1",
    direction: "borrowed",
    counterparty: "Bank",
    source: "bank",
    principal: 1_000_000,
    interestRatePct: 10,
    interestPeriod: "year",
    openedAt: "2026-01-01",
    dueAt: null,
    payments: [],
    colorHex: "#000000",
    icon: "landmark",
    note: "",
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("defaults loans to [] on a snapshot that predates it", () => {
    const old = stateV5({ loans: undefined as unknown as Loan[] });
    expect(migrate(old, 6).loans).toEqual([]);
  });

  it("preserves existing loans", () => {
    const out = migrate(stateV5({ loans: [sampleLoan] }), 6);
    expect(out.loans).toHaveLength(1);
    expect(out.loans[0].id).toBe("L1");
  });
});
