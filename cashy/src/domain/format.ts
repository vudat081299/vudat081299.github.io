// ============================================================================
// Shared display formatting that isn't money (money lives in domain/money.ts).
// One home so a "percent" reads the same everywhere instead of an ad-hoc
// `Math.round(x * 100) + "%"` — or worse, a hand-rolled comma swap — at each
// call site. See docs/architecture.md (§ shared helpers).
// ============================================================================

// vi-VN so the decimal mark is a comma, matching every amount in the app
// ("12,4%") rather than clashing with an English dot. `maximumFractionDigits`
// also drops a trailing ",0", so a whole number reads "12%", never "12,0%".
const pctInt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const pctOne = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/**
 * A fraction rendered as a human percent string. Pass the RATIO, not the scaled
 * value: `formatPercent(0.128)` → "13%", `formatPercent(0.128, 1)` → "12,8%".
 * `decimals` defaults to 0 (a plain integer percent, as most stats show); pass 1
 * for a precise figure such as a period-over-period delta. Sign is the caller's
 * to add — pass an absolute ratio when the arrow/colour already carries it.
 */
export function formatPercent(fraction: number, decimals: 0 | 1 = 0): string {
  const nf = decimals === 1 ? pctOne : pctInt;
  return nf.format((fraction || 0) * 100) + "%";
}
