import type { Transaction, TxStatus } from "@/types";

/**
 * Status vocabulary for the table's Trạng thái column — label + web-builder cap
 * classes + whether the row counts toward the money totals. `counted` gates the
 * aggregates.
 *
 * Tones follow the colour ladder (§1). "Ghi nhận" is the **default** state of
 * nearly every row, so it stays tier-1 neutral: a green cap repeated 195 times
 * down a column is colour carrying no information, and it drowns out the few
 * rows that DO need attention. Colour is spent only on the exceptions —
 * pending/awaiting need action, failed is a real problem.
 */
export interface StatusMeta {
  label: string;
  /** classes appended to `wb-cap` */
  cap: string;
  /** show the leading status dot (soft tones only; solid/neutral skip it) */
  dot: boolean;
  counted: boolean;
}

export const TX_STATUS_META: Record<TxStatus, StatusMeta> = {
  recorded: { label: "Ghi nhận", cap: "", dot: false, counted: true },
  pending: { label: "Chờ xác nhận", cap: "wb-cap--warning", dot: true, counted: false },
  awaiting: { label: "Chờ đối tác", cap: "wb-cap--info", dot: true, counted: false },
  skipped: { label: "Bỏ qua", cap: "", dot: true, counted: false },
  failed: { label: "Thất bại", cap: "wb-cap--danger wb-cap--solid", dot: false, counted: false },
};

export const TX_STATUS_ORDER: TxStatus[] = [
  "recorded",
  "pending",
  "awaiting",
  "skipped",
  "failed",
];

export function statusOf(tx: Transaction): TxStatus {
  return tx.status ?? "recorded";
}

/** Only recorded rows move the money — everything else is shown, not summed. */
export function isCounted(tx: Transaction): boolean {
  return TX_STATUS_META[statusOf(tx)].counted;
}
