import type { Transaction, TxStatus } from "@/types";

/**
 * Status vocabulary for the table's Trạng thái column — label + web-builder cap
 * classes + whether the row counts toward the money totals. Tones follow the
 * docs' hero table: recorded=success, pending=warning, awaiting=info,
 * skipped=neutral, failed=solid danger. `counted` gates the aggregates.
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
  recorded: { label: "Ghi nhận", cap: "wb-cap--success", dot: true, counted: true },
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
