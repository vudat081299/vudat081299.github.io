import { describe, expect, it } from "vitest";
import type { Transaction, Wallet } from "@/domain/types";
import {
  cardUtilization,
  guessCardNetwork,
  guessWalletKind,
  isTransfer,
  netWorth,
  nextWalletOrder,
  orphanWallet,
  walletBalance,
  walletBalances,
  walletIcon,
} from "@/domain/wallet";
import { totals } from "@/domain/transaction";

function wal(over: Partial<Wallet> = {}): Wallet {
  return {
    id: "w1",
    name: "Cash",
    kind: "cash",
    openingBalance: 0,
    colorHex: "#000000",
    icon: "wallet",
    order: 0,
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
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

describe("walletBalance", () => {
  it("is opening balance plus the net of the wallet's own recorded rows", () => {
    const cash = wal({ id: "cash", openingBalance: 1_000_000 });
    const txs = [
      tx({ walletId: "cash", type: "income", amount: 500_000 }),
      tx({ walletId: "cash", type: "expense", amount: 200_000 }),
      tx({ walletId: "bank", type: "expense", amount: 999_999 }), // other wallet
      tx({ walletId: "cash", type: "expense", amount: 50_000, status: "pending" }), // not counted
    ];
    expect(walletBalance(cash, txs)).toBe(1_300_000);
  });

  it("ignores rows with no wallet", () => {
    const cash = wal({ id: "cash", openingBalance: 100 });
    expect(walletBalance(cash, [tx({ type: "expense", amount: 999 })])).toBe(100);
  });
});

describe("transfers", () => {
  const cash = wal({ id: "cash", openingBalance: 0 });
  const bank = wal({ id: "bank", openingBalance: 1_000_000 });
  const transfer = tx({ walletId: "bank", toWalletId: "cash", amount: 300_000, type: "expense" });

  it("is recognised by its destination wallet", () => {
    expect(isTransfer(transfer)).toBe(true);
    expect(isTransfer(tx({ walletId: "cash" }))).toBe(false);
  });

  it("debits the source and credits the destination", () => {
    expect(walletBalance(bank, [transfer])).toBe(700_000);
    expect(walletBalance(cash, [transfer])).toBe(300_000);
  });

  it("counts toward NEITHER income nor expense", () => {
    expect(totals([transfer])).toEqual({ income: 0, expense: 0, net: 0 });
  });
});

describe("walletBalances", () => {
  it("computes every wallet in one pass, matching walletBalance", () => {
    const cash = wal({ id: "cash", openingBalance: 0 });
    const bank = wal({ id: "bank", openingBalance: 1_000_000 });
    const txs = [
      tx({ walletId: "bank", toWalletId: "cash", amount: 300_000 }),
      tx({ walletId: "cash", type: "expense", amount: 50_000 }),
    ];
    const m = walletBalances([cash, bank], txs);
    expect(m.get("cash")).toBe(walletBalance(cash, txs));
    expect(m.get("bank")).toBe(walletBalance(bank, txs));
    expect(m.get("cash")).toBe(250_000);
    expect(m.get("bank")).toBe(700_000);
  });
});

describe("netWorth", () => {
  it("sums wallet balances, excluding archived by default", () => {
    const a = wal({ id: "a", openingBalance: 100 });
    const b = wal({ id: "b", openingBalance: 50, archived: true });
    expect(netWorth([a, b], [])).toBe(100);
    expect(netWorth([a, b], [], { includeArchived: true })).toBe(150);
  });
});

describe("orphanWallet", () => {
  it("strips every reference to the deleted wallet, keeping the rows", () => {
    const txs = [
      tx({ id: "x", walletId: "cash" }),
      tx({ id: "y", walletId: "bank", toWalletId: "cash" }),
      tx({ id: "z", walletId: "bank" }),
    ];
    const out = orphanWallet(txs, "cash");
    expect(out.find((t) => t.id === "x")?.walletId).toBeNull();
    expect(out.find((t) => t.id === "y")?.toWalletId).toBeUndefined();
    expect(out.find((t) => t.id === "z")?.walletId).toBe("bank"); // untouched
    expect(out).toHaveLength(3); // nothing deleted
  });
});

describe("guessWalletKind", () => {
  it("reads a card before a bank (a bank-branded card is still a card)", () => {
    expect(guessWalletKind("Techcombank Visa")).toBe("card");
    expect(guessWalletKind("VPBank Mastercard")).toBe("card");
  });
  it("recognises e-wallets, cash, banks, and falls back to other", () => {
    expect(guessWalletKind("MoMo")).toBe("ewallet");
    expect(guessWalletKind("ZaloPay")).toBe("ewallet");
    expect(guessWalletKind("Cash")).toBe("cash");
    expect(guessWalletKind("Tiền mặt")).toBe("cash");
    expect(guessWalletKind("Vietcombank")).toBe("bank");
    expect(guessWalletKind("Under the mattress")).toBe("other");
  });
});

describe("helpers", () => {
  it("nextWalletOrder is max order + 1 (0 for the first)", () => {
    expect(nextWalletOrder([])).toBe(0);
    expect(nextWalletOrder([wal({ order: 0 }), wal({ id: "w2", order: 3 })])).toBe(4);
  });
  it("walletIcon maps each kind to a curated key", () => {
    expect(walletIcon("card")).toBe("credit-card");
    expect(walletIcon("cash")).toBe("banknote");
    expect(walletIcon("bank")).toBe("landmark");
    expect(walletIcon("ewallet")).toBe("smartphone");
    expect(walletIcon("other")).toBe("wallet");
  });
  it("guessCardNetwork reads the network from a name", () => {
    expect(guessCardNetwork("Techcombank Visa")).toBe("visa");
    expect(guessCardNetwork("VPBank Mastercard")).toBe("mastercard");
    expect(guessCardNetwork("Amex Platinum")).toBe("amex");
    expect(guessCardNetwork("Sacombank JCB")).toBe("jcb");
    expect(guessCardNetwork("Napas napas")).toBe("other");
  });
});

describe("cardUtilization", () => {
  const card = (over: Partial<Wallet> = {}) => wal({ kind: "card", creditLimit: 20_000_000, ...over });

  it("is null for a non-card or a card with no positive limit", () => {
    expect(cardUtilization(wal({ kind: "bank", creditLimit: 20_000_000 }), -5_000_000)).toBeNull();
    expect(cardUtilization(card({ creditLimit: 0 }), -5_000_000)).toBeNull();
    expect(cardUtilization(wal({ kind: "card" }), -5_000_000)).toBeNull(); // no limit set
  });

  it("treats a negative balance as debt: debt = −balance, available = limit − debt", () => {
    const u = cardUtilization(card(), -12_000_000)!;
    expect(u).toEqual({ debt: 12_000_000, limit: 20_000_000, available: 8_000_000, pct: 0.6 });
  });

  it("a zero/positive balance means no debt and full availability", () => {
    const u = cardUtilization(card(), 0)!;
    expect(u.debt).toBe(0);
    expect(u.available).toBe(20_000_000);
    expect(u.pct).toBe(0);
  });

  it("clamps pct at 1 when debt exceeds the limit (over-limit)", () => {
    const u = cardUtilization(card(), -25_000_000)!;
    expect(u.pct).toBe(1);
    expect(u.available).toBe(0);
  });
});
