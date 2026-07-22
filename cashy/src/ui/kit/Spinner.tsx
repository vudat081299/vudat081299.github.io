import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Spinner — wraps the web-builder `wb-spinner` ring (the reusable one the loading
 * button uses, CSS §4). It's drawn in `currentColor` and sized in `em`, so it
 * inherits the surrounding text colour; `size` sets its font-size to scale the ring
 * (numbers become px, as React does for style values).
 *
 * WHY a wrapper: it types the `size` knob and handles accessibility — a bare
 * spinner is hidden from assistive tech, but pass `label` and it becomes a
 * `role="status"` live region so the loading state is announced. No behaviour to
 * hand-roll (the spin is a pure-CSS keyframe).
 */
export function Spinner({
  size,
  label,
  className,
  style,
  ...rest
}: {
  /** Ring diameter via font-size (the ring is 1em). Number → px. */
  size?: number | string;
  /** Screen-reader label; adds `role="status"` so the spinner is announced. */
  label?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span
      className={cn("wb-spinner", className)}
      style={{ fontSize: size, ...style }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
}
