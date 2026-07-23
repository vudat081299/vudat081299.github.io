import { useSyncExternalStore } from "react";
import type { TxStatus, TxType } from "@/domain/types";

/**
 * The half-typed NEW transaction — what the user had entered when they closed
 * the editor without confirming. It is deliberately NOT a Transaction: nothing
 * is committed to the ledger until "Thêm" is pressed, so the draft holds the raw
 * form fields (`amountStr` is still text) and lives in its own storage key.
 *
 * The shell reads it to mark the "add transaction" button as unfinished — the
 * dashed idiom the docs use for "chưa chốt" (§capsules, `--dashed`).
 */
export interface TxDraft {
  type: TxType;
  amountStr: string;
  categoryId: string | null;
  tagIds: string[];
  occurredAt: string;
  /** "HH:mm" or "" — optional, see Transaction.occurredTime */
  occurredTime: string;
  note: string;
  payee: string;
  /** legacy free-text "Paid with" — retired in favour of `walletId`, kept optional
   *  so any older parked draft still deserialises. */
  account?: string;
  /** FK → Wallet.id chosen in the editor, or null — see Transaction.walletId. */
  walletId?: string | null;
  /** transfer destination wallet — present ⇒ the draft is a transfer. */
  toWalletId?: string | null;
  status: TxStatus;
}

const KEY = "cashy_tx_draft_v1";

let draft: TxDraft | null = read();
const listeners = new Set<() => void>();

function read(): TxDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TxDraft) : null;
  } catch {
    return null;
  }
}

function emit() {
  for (const l of listeners) l();
}

/** True when the form still holds nothing worth coming back to. */
export function isBlankDraft(d: TxDraft): boolean {
  return (
    d.amountStr.trim() === "" &&
    d.note.trim() === "" &&
    d.payee.trim() === "" &&
    (d.account ?? "").trim() === "" &&
    d.walletId == null &&
    d.toWalletId == null &&
    d.categoryId === null &&
    d.tagIds.length === 0 &&
    !d.occurredTime
  );
}

/** Keep what the user typed. A draft with nothing in it is dropped instead. */
export function saveDraft(d: TxDraft) {
  if (isBlankDraft(d)) return clearDraft();
  draft = d;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore quota errors */
  }
  emit();
}

export function clearDraft() {
  if (draft === null) return;
  draft = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function getDraft(): TxDraft | null {
  return draft;
}

/** React binding — re-renders the shell the moment a draft appears or clears. */
export function useTxDraft(): TxDraft | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getDraft,
    getDraft,
  );
}
