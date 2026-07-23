import type { TxType } from "@/domain/types";

// ============================================================================
// The ONLY place money is formatted. Money is an integer number of đồng.
// Never store or compute money as a float.
// ============================================================================
const nf = new Intl.NumberFormat("vi-VN");

/** Full amount with unit: 18785000 -> "18.785.000 đ" */
export function formatMoney(n: number): string {
  return nf.format(Math.round(n || 0)) + " đ";
}

/** Grouped digits, no unit: 18785000 -> "18.785.000" */
export function formatDigits(n: number): string {
  return nf.format(Math.round(n || 0));
}

/**
 * Compact: 3400000 -> "3,4m đ", 890000 -> "890k đ", 1200000000 -> "1,2b đ".
 * English magnitude letters (k / m / b), because the UI chrome is English even
 * though the amounts are đồng — the Vietnamese "k / tr / tỷ" belongs to the
 * seeded data, not the app's own labels. The NUMBER itself, though, is formatted
 * `vi-VN` like every other amount in the app, so its decimal mark is a comma
 * ("7,3m") — matching the dot-means-thousands grouping of the full "7.300.000 đ"
 * form instead of clashing with it (a bare `toFixed` would emit an English ".").
 */
const shortNf = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export function formatMoneyShort(n: number): string {
  const v = Math.round(Math.abs(n || 0));
  const sign = n < 0 ? "-" : "";
  let out: string;
  // `shortNf` rounds to the one decimal we show and drops a trailing ",0", so a
  // whole magnitude prints clean ("5m", not "5,0m") with no special-casing.
  if (v >= 1_000_000_000) out = shortNf.format(v / 1_000_000_000) + "b";
  else if (v >= 1_000_000) out = shortNf.format(v / 1_000_000) + "m";
  else if (v >= 1_000) out = shortNf.format(v / 1_000) + "k";
  else out = shortNf.format(v);
  return sign + out + " đ";
}

/** Parse free text to integer VND: "1.500.000 đ" -> 1500000 */
export function parseMoney(s: string): number {
  const d = String(s).replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : 0;
}

/** Signed display by type: income "+…", expense "−…" (true minus sign). */
export function signedMoney(n: number, type: TxType): string {
  return (type === "income" ? "+" : "−") + formatMoney(Math.abs(n));
}
