import type { CSSProperties } from "react";
import type { Category } from "@/types";

/**
 * A category shown as a **tinted** capsule in its own bright hue (`wb-cap--tinted`
 * + `--wb-cap-color`), matching the web-builder tables page — categories carry
 * colour here so they're scannable in a dense list. "Chưa phân loại" stays neutral.
 */
export function CategoryCap({ category }: { category?: Category | null }) {
  if (!category) {
    return <span className="wb-cap">Chưa phân loại</span>;
  }
  return (
    <span
      className="wb-cap wb-cap--tinted"
      style={{ "--wb-cap-color": category.colorHex } as CSSProperties}
    >
      {category.name}
    </span>
  );
}
