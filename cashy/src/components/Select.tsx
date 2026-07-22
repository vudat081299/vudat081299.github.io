import type { ChangeEvent, ReactNode } from "react";

/**
 * The web-builder select: a native `<select>` wrapped so the chevron sits inside
 * the field — `wb-select-wrap > wb-select + expand_more`, exactly the markup the
 * docs print. Extracted so every form stops re-hand-rolling the wrapper + icon.
 */
export function Select({
  id,
  value,
  onChange,
  children,
}: {
  id?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) {
  return (
    <span className="wb-select-wrap">
      <select id={id} className="wb-select" value={value} onChange={onChange}>
        {children}
      </select>
      <span className="wb-ico">expand_more</span>
    </span>
  );
}
