import type { Transaction } from "@/domain/types";
import { commit, getState } from "@/data/store";
import { syncPayments } from "@/usecases/subscriptions";
import { uid } from "@/lib/id";

export function addTransaction(input: Omit<Transaction, "id" | "createdAt">): string {
  const state = getState();
  const tx: Transaction = { ...input, id: uid(), createdAt: new Date().toISOString() };
  commit({ ...state, transactions: [tx, ...state.transactions] });
  return tx.id;
}

export function updateTransaction(id: string, patch: Partial<Transaction>): void {
  const state = getState();
  commit({
    ...state,
    transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  });
}

export function deleteTransaction(id: string): void {
  const state = getState();
  // Read the owner first — once the row is gone there is nothing left to ask.
  const subId = state.transactions.find((t) => t.id === id)?.subscriptionId;
  commit({ ...state, transactions: state.transactions.filter((t) => t.id !== id) });
  // Deleting a charge can change what a subscription has actually paid.
  if (subId) syncPayments(subId);
}
