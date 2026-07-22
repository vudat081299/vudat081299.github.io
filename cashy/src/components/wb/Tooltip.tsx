import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tooltip — wraps the web-builder `wb-tooltip` pure-CSS bubble (CSS §13): it wraps a
 * trigger (`children`) and reveals `label` in a small theme-inverted bubble above it
 * on `:hover` / `:focus-within`, complete with the little arrow. Good for stat notes,
 * icon-only buttons, and abbreviations.
 *
 * WHY a wrapper: it types the trigger + label pair and adds `role="tooltip"` so the
 * bubble is announced — no behaviour to hand-roll since the reveal is pure CSS. The
 * CSS ships only the top placement (no positional modifiers), so there are no
 * position props; the page notes that viewport-aware placement or delay should use
 * Radix Tooltip in-app while keeping this bubble style.
 */
export function Tooltip({
  label,
  children,
  className,
  ...rest
}: {
  /** Bubble content shown on hover / focus. */
  label: ReactNode;
  /** The trigger element the tooltip wraps. */
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span className={cn("wb-tooltip", className)} {...rest}>
      {children}
      <span className="wb-tooltip__bubble" role="tooltip">
        {label}
      </span>
    </span>
  );
}
