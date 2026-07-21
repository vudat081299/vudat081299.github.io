import type { Category } from "@/types";

/**
 * A category shown as a plain **neutral** capsule — exactly what the web-builder
 * tables page prints (`<span class="wb-cap">Ăn uống</span>`).
 *
 * A category is a *classification, not a status*, so under the colour ladder
 * (§1) it does not get to spend colour: "Ăn uống" / "Nhà ở" stay tier-1 grey.
 * The category's own hue still identifies it in the places that are ABOUT
 * categories — the donut, the ranked bars, the category manager — where the hue
 * carries real meaning instead of just tinting every row of a dense table.
 */
export function CategoryCap({ category }: { category?: Category | null }) {
  return <span className="wb-cap">{category ? category.name : "Uncategorised"}</span>;
}
