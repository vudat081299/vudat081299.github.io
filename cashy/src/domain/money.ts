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

/** Compact: 3400000 -> "3,4 tr đ", 890000 -> "890k đ", 1200000000 -> "1,2 tỷ đ" */
export function formatMoneyShort(n: number): string {
  const v = Math.round(Math.abs(n || 0));
  const sign = n < 0 ? "-" : "";
  let out: string;
  if (v >= 1_000_000_000) out = trim(v / 1_000_000_000) + " tỷ";
  else if (v >= 1_000_000) out = trim(v / 1_000_000) + " tr";
  else if (v >= 1_000) out = trim(v / 1_000) + "k";
  else out = String(v);
  return sign + out + " đ";
}

function trim(x: number): string {
  return x.toFixed(x % 1 === 0 ? 0 : 1).replace(".", ",");
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
