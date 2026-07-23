import type { TxType } from "@/domain/types";

// ============================================================================
// The ONLY place money is formatted. Money is an integer number of đồng.
// Never store or compute money as a float.
// ============================================================================
const nf = new Intl.NumberFormat("vi-VN");

/** Full amount with unit: 18785000 -> "18.785.000 ₫" */
export function formatMoney(n: number): string {
  return nf.format(Math.round(n || 0)) + " ₫";
}

/** Grouped digits, no unit: 18785000 -> "18.785.000" */
export function formatDigits(n: number): string {
  return nf.format(Math.round(n || 0));
}

/**
 * Compact: 3400000 -> "3,4m", 890000 -> "890k", 1200000000 -> "1,2b", 500 -> "500 ₫".
 * English magnitude letters (k / m / b), because the UI chrome is English even
 * though the amounts are đồng — the Vietnamese "k / tr / tỷ" belongs to the
 * seeded data, not the app's own labels. The NUMBER itself, though, is formatted
 * `vi-VN` like every other amount in the app, so its decimal mark is a comma
 * ("7,3m") — matching the dot-means-thousands grouping of the full "7.300.000 đ"
 * form instead of clashing with it (a bare `toFixed` would emit an English ".").
 *
 * A magnitude letter already reads as "this is money", so it carries NO "₫" —
 * "3,4m ₫" states the unit twice. Only the sub-1.000 form, which has no letter to
 * lean on, keeps the currency mark ("500 ₫").
 */
const shortNf = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export function formatMoneyShort(n: number): string {
  const v = Math.round(Math.abs(n || 0));
  const sign = n < 0 ? "-" : "";
  // `shortNf` rounds to the one decimal we show and drops a trailing ",0", so a
  // whole magnitude prints clean ("5m", not "5,0m") with no special-casing.
  if (v >= 1_000_000_000) return sign + shortNf.format(v / 1_000_000_000) + "b";
  if (v >= 1_000_000) return sign + shortNf.format(v / 1_000_000) + "m";
  if (v >= 1_000) return sign + shortNf.format(v / 1_000) + "k";
  return sign + shortNf.format(v) + " ₫";
}

/**
 * Compact form for chart axes and range labels — the same as `formatMoneyShort`
 * but NEVER carrying a currency unit (a tick reads "3,4m", not "500 ₫"). One home
 * for "compact, unit-stripped" so screens don't each re-do `.replace(" ₫", "")`.
 */
export function formatMoneyAxis(n: number): string {
  return formatMoneyShort(n).replace(" ₫", "");
}

/** Parse free text to integer VND: "1.500.000 đ" -> 1500000 */
export function parseMoney(s: string): number {
  const d = String(s).replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : 0;
}

/**
 * Coerce any input to an integer number of đồng. Money is NEVER stored or
 * computed as a float (see the header), so every usecase that writes a money
 * field routes through here — the "integer VND" invariant then lives in exactly
 * one place instead of an ad-hoc `Math.round(x || 0)` at each write site. Rounds
 * to the nearest đồng and treats a missing / NaN input as 0.
 */
export function toVnd(n: number): number {
  return Math.round(n || 0);
}

/** `toVnd` for a field that cannot be negative — a principal, a repayment, a
 *  credit limit, a subscription price. Clamps up to 0. */
export function toVndNonNeg(n: number): number {
  return Math.max(0, toVnd(n));
}

/** Signed display by type: income "+…", expense "−…" (true minus sign). */
export function signedMoney(n: number, type: TxType): string {
  return (type === "income" ? "+" : "−") + formatMoney(Math.abs(n));
}
