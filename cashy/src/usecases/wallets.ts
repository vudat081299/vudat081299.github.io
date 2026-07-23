import type { Wallet, WalletKind } from "@/domain/types";
import { commit, getState } from "@/data/store";
import { nextWalletOrder, orphanWallet } from "@/domain/wallet";
import { uid } from "@/lib/id";

/** Create a wallet, appended after the existing ones. Returns the new id. */
export function addWallet(input: {
  name: string;
  kind: WalletKind;
  openingBalance: number;
  colorHex: string;
  icon: string;
}): string {
  const state = getState();
  const wallet: Wallet = {
    id: uid(),
    name: input.name.trim() || "Wallet",
    kind: input.kind,
    openingBalance: Math.round(input.openingBalance || 0),
    colorHex: input.colorHex,
    icon: input.icon,
    order: nextWalletOrder(state.wallets),
    archived: false,
    createdAt: new Date().toISOString(),
  };
  commit({ ...state, wallets: [...state.wallets, wallet] });
  return wallet.id;
}

/** Patch a wallet's fields. */
export function updateWallet(id: string, patch: Partial<Wallet>): void {
  const state = getState();
  commit({
    ...state,
    wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  });
}

/** Archive / un-archive a wallet — hides it from pickers, keeps its history. */
export function setWalletArchived(id: string, archived: boolean): void {
  updateWallet(id, { archived });
}

/**
 * Delete a wallet. Its ledger rows are NOT deleted — they lose the reference
 * (`orphanWallet`), the same way deleting a category orphans rows to `null`. Any
 * subscription paid from it drops the link too.
 */
export function deleteWallet(id: string): void {
  const state = getState();
  const transactions = orphanWallet(state.transactions, id);
  const subscriptions = state.subscriptions.map((s) =>
    s.walletId === id ? { ...s, walletId: null } : s,
  );
  commit({
    ...state,
    wallets: state.wallets.filter((w) => w.id !== id),
    transactions,
    subscriptions,
  });
}
