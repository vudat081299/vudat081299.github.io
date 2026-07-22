import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const LINE_VARIANT = {
  solid: "",
  dotted: "wb-divider--dotted",
  dashed: "wb-divider--dashed",
  "long-dash": "wb-divider--long-dash",
  fade: "wb-divider--fade",
} as const;

/**
 * Divider — the web-builder `wb-divider` family from pages/divider.html: a flat
 * neutral rule (never a status hue). One component covers the three distinct
 * elements the CSS uses, chosen by props:
 *   • horizontal `<hr class="wb-divider …">` with a line `variant`;
 *   • `label` → the centred-label divider (`wb-divider--label`, a `<div>`);
 *   • `orientation="vertical"` → the standalone `wb-divider--vertical` `<span>`
 *     that stretches to row height between inline items.
 * `ray` is the decorative travelling-highlight rule (standalone, no base class).
 * `strong` switches the line to ink emphasis.
 */
export function Divider({
  orientation = "horizontal",
  variant = "solid",
  label,
  strong = false,
  className,
  ...rest
}: {
  orientation?: "horizontal" | "vertical";
  /** Line style for a horizontal rule; `ray` is the animated decorative variant. */
  variant?: "solid" | "dotted" | "dashed" | "long-dash" | "fade" | "ray";
  /** Text shown in the middle of the rule (renders the label divider). */
  label?: ReactNode;
  /** Ink emphasis (`--strong`) instead of the default weak grey. */
  strong?: boolean;
} & HTMLAttributes<HTMLElement>) {
  if (orientation === "vertical") {
    // Standalone: no `.wb-divider` base (see the CSS note — the base's border-top
    // shorthand would blank the vertical line).
    return (
      <span
        className={cn("wb-divider--vertical", strong && "wb-divider--strong", className)}
        {...rest}
      />
    );
  }

  if (label !== undefined) {
    return (
      <div
        className={cn("wb-divider--label", strong && "wb-divider--strong", className)}
        {...rest}
      >
        {label}
      </div>
    );
  }

  if (variant === "ray") {
    return (
      <hr
        className={cn("wb-divider--ray", strong && "wb-divider--strong", className)}
        {...rest}
      />
    );
  }

  return (
    <hr
      className={cn("wb-divider", LINE_VARIANT[variant], strong && "wb-divider--strong", className)}
      {...rest}
    />
  );
}
