import { beforeEach, describe, expect, it } from "vitest";
import { commit, getState } from "@/data/store";
import { emptyState } from "@/data/persistence";
import type { Transaction, Wallet } from "@/domain/types";
import { deleteWallet } from "@/usecases/wallets";

function wallet(id: string): Wallet {
  return {
    id,
    name: id,
    kind: "bank",
    openingBalance: 0,
    colorHex: "#000000",
    icon: "wallet",
    order: 0,
    archived: false,
    createdAt: "2026-07-24T00:00:00.000Z",
  };
}

function transaction(over: Partial<Transaction>): Transaction {
  return {
    id: "tx",
    amount: 100,
    type: "expense",
    categoryId: null,
    tagIds: [],
    note: "",
    status: "recorded",
    occurredAt: "2026-07-24",
    createdAt: "2026-07-24T00:00:00.000Z",
    ...over,
  };
}

beforeEach(() => commit(emptyState()));

describe("deleteWallet", () => {
  it("rejects deletion when the wallet is either leg of a transfer", () => {
    const transfer = transaction({ walletId: "bank", toWalletId: "cash" });
    commit({ ...getState(), wallets: [wallet("bank"), wallet("cash")], transactions: [transfer] });

    expect(deleteWallet("cash")).toBe(false);
    expect(getState().wallets.map((w) => w.id)).toEqual(["bank", "cash"]);
    expect(getState().transactions).toEqual([transfer]);
  });

  it("deletes an untransferred wallet and keeps its ordinary rows orphaned", () => {
    commit({
      ...getState(),
      wallets: [wallet("cash")],
      transactions: [transaction({ walletId: "cash" })],
    });

    expect(deleteWallet("cash")).toBe(true);
    expect(getState().wallets).toEqual([]);
    expect(getState().transactions[0].walletId).toBeNull();
  });
});
