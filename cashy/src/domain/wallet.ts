import type { Transaction, Wallet, WalletKind } from "@/domain/types";
import { isCounted } from "@/domain/txStatus";

// ============================================================================
// Wallet rules — pure. A wallet is a place money sits; a transaction moves
// through one (`walletId`), a transfer moves between two (`walletId` →
// `toWalletId`). Balances are DERIVED from the ledger, never stored. Money is an
// integer count of VND. See docs/wallets-plan.md.
// ============================================================================

/** A row is a TRANSFER when it names a destination wallet. A transfer counts
 *  toward NEITHER income nor expense — only the two wallet balances it touches. */
export function isTransfer(tx: Transaction): boolean {
  return tx.toWalletId != null;
}

/**
 * Current balance of one wallet: its opening balance plus the net of every
 * RECORDED row that touches it. A normal row adds income / subtracts expense on
 * its `walletId`; a transfer subtracts from its source (`walletId`) and adds to
 * its destination (`toWalletId`).
 */
export function walletBalance(wallet: Wallet, txs: Transaction[]): number {
  let bal = wallet.openingBalance;
  for (const t of txs) {
    if (!isCounted(t)) continue;
    if (isTransfer(t)) {
      if (t.walletId === wallet.id) bal -= t.amount;
      if (t.toWalletId === wallet.id) bal += t.amount;
    } else if (t.walletId === wallet.id) {
      bal += t.type === "income" ? t.amount : -t.amount;
    }
  }
  return bal;
}

/** Every wallet's balance in one pass over the ledger (`id → balance`). */
export function walletBalances(wallets: Wallet[], txs: Transaction[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of wallets) m.set(w.id, w.openingBalance);
  const add = (id: string | null | undefined, delta: number) => {
    if (id != null && m.has(id)) m.set(id, (m.get(id) as number) + delta);
  };
  for (const t of txs) {
    if (!isCounted(t)) continue;
    if (isTransfer(t)) {
      add(t.walletId, -t.amount);
      add(t.toWalletId, t.amount);
    } else {
      add(t.walletId, t.type === "income" ? t.amount : -t.amount);
    }
  }
  return m;
}

/**
 * Net worth (v1 scope) = the sum of wallet balances. Archived wallets keep their
 * balance but drop out of the total by default (see open question #1 in the plan).
 */
export function netWorth(
  wallets: Wallet[],
  txs: Transaction[],
  opts: { includeArchived?: boolean } = {},
): number {
  const bals = walletBalances(wallets, txs);
  let sum = 0;
  for (const w of wallets) {
    if (!opts.includeArchived && w.archived) continue;
    sum += bals.get(w.id) ?? 0;
  }
  return sum;
}

/**
 * Detach a deleted wallet from the ledger: rows lose the reference rather than
 * being deleted (the money still moved). A normal row's `walletId` → `null`; a
 * transfer that loses a leg is degraded — dropping `toWalletId` turns it back
 * into a plain row, so the real delete policy for transfers is decided when the
 * `deleteWallet` usecase lands (Phase 2). For now this keeps balances honest by
 * removing every reference to the id.
 */
export function orphanWallet(txs: Transaction[], walletId: string): Transaction[] {
  return txs.map((t) => {
    if (t.walletId !== walletId && t.toWalletId !== walletId) return t;
    const next: Transaction = { ...t };
    if (next.walletId === walletId) next.walletId = null;
    if (next.toWalletId === walletId) delete next.toWalletId;
    return next;
  });
}

/** The next `order` value for a new wallet (max + 1; 0 for the first). */
export function nextWalletOrder(wallets: Wallet[]): number {
  return wallets.reduce((m, w) => Math.max(m, w.order + 1), 0);
}

/** Best-guess kind from a name — used to migrate free-text "Paid with" strings
 *  into wallets and as the default kind when adding one. Card is checked BEFORE
 *  bank so "Techcombank Visa" reads as a card, not a bank. */
export function guessWalletKind(name: string): WalletKind {
  const n = name.toLowerCase();
  const has = (...ks: string[]) => ks.some((k) => n.includes(k));
  if (has("visa", "mastercard", "master card", "amex", "jcb", "credit", "tín dụng", "tin dung")) return "card";
  if (has("momo", "zalopay", "zalo pay", "vnpay", "vn pay", "shopeepay", "shopee pay", "grabpay", "viettelpay", "viettel pay", "moca", "ewallet", "e-wallet", "ví điện tử", "vi dien tu")) return "ewallet";
  if (has("cash", "tiền mặt", "tien mat")) return "cash";
  if (has("bank", "techcombank", "vietcombank", "vpbank", "bidv", "acb", "mbbank", "mb bank", "tpbank", "sacombank", "agribank", "vietinbank", "ngân hàng", "ngan hang", "account", "checking", "savings")) return "bank";
  return "other";
}

/** The curated lucide icon key for a wallet kind (used by seed + migration). */
export function walletIcon(kind: WalletKind): string {
  switch (kind) {
    case "cash":
      return "banknote";
    case "bank":
      return "landmark";
    case "ewallet":
      return "smartphone";
    case "card":
      return "credit-card";
    default:
      return "wallet";
  }
}
