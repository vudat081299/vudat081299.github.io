import {
  type CSSProperties,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type ControlSize = "sm" | "md" | "lg";

/**
 * Inline size for the select. WHY inline: web-builder ships no `wb-select--sm/lg`
 * classes, so a `size` prop maps to element styles instead of dead CSS. Keeps the
 * 34px right padding the chevron overlay needs at every size.
 */
function selectSizeStyle(size: ControlSize): CSSProperties | undefined {
  if (size === "sm") return { fontSize: 13, padding: "6px 34px 6px 10px" };
  if (size === "lg") return { fontSize: 15, padding: "11px 34px 11px 14px" };
  return undefined;
}

/**
 * Select — a styled native `<select>` (`.wb-select`) wrapped in `.wb-select-wrap`
 * so a real Material chevron overlays it (a `<select>` can't hold child markup).
 * Behaves like the native element (all SelectHTMLAttributes pass through,
 * controlled or uncontrolled). Provide options as either an `options` array
 * (`[{value,label}]`) or plain `<option>` children. `invalid` sets the
 * `.is-invalid` red state and `aria-invalid` together; `size` scales the control.
 * `className`/`style` apply to the wrapper so callers can size the field.
 */
export function Select({
  options,
  invalid,
  size = "md",
  className,
  style,
  children,
  "aria-invalid": ariaInvalid,
  ...rest
}: {
  /** Options as data; omit to pass `<option>` children instead. */
  options?: { value: string | number; label: ReactNode; disabled?: boolean }[];
  invalid?: boolean;
  size?: ControlSize;
  // Omit native `size` (visible-rows number) so our sizing prop can own it.
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">) {
  return (
    <span className={cn("wb-select-wrap", className)} style={style}>
      <select
        {...rest}
        aria-invalid={invalid ? true : ariaInvalid}
        style={selectSizeStyle(size)}
        className={cn("wb-select", invalid && "is-invalid")}
      >
        {options
          ? options.map((o) => (
              <option key={String(o.value)} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <span className="wb-ico">expand_more</span>
    </span>
  );
}
