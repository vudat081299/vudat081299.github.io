import {
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type SwitchSize = "sm" | "md" | "lg";

/**
 * Inline size for the toggle. WHY transform: the track/thumb geometry is fixed
 * pixels + a pseudo-element in the CSS (no `wb-switch--sm/lg`), so scaling the
 * whole track is the only faithful way to resize it without touching CSS.
 */
function trackScaleStyle(size: SwitchSize): CSSProperties | undefined {
  if (size === "sm") return { transform: "scale(0.85)", transformOrigin: "left center" };
  if (size === "lg") return { transform: "scale(1.15)", transformOrigin: "left center" };
  return undefined;
}

/**
 * Switch — the web-builder `.wb-switch` toggle backed by a real checkbox, so it
 * stays keyboard- and form-correct (all InputHTMLAttributes pass through,
 * controlled via `checked`+`onChange` or uncontrolled via `defaultChecked`).
 * `label` (or children) is the text beside the track; `io` draws the power-rocker
 * I/O marks in the track (`--io`); `size` scales the control. Use for instant
 * settings — for a value submitted with a form, prefer a Checkbox.
 */
export function Switch({
  label,
  io,
  size = "md",
  className,
  style,
  children,
  ...rest
}: {
  label?: ReactNode;
  /** Draw the "I" (on) / "O" (off) power marks in the track background (--io). */
  io?: boolean;
  size?: SwitchSize;
  // Omit native `size` (a character-width number) so our sizing prop can own it.
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">) {
  return (
    <label className={cn("wb-switch", io && "wb-switch--io", className)} style={style}>
      {/* type is forced last so a stray `type` in rest can't break the toggle. */}
      <input {...rest} type="checkbox" />
      <span className="wb-switch__track" style={trackScaleStyle(size)} />
      {label ?? children}
    </label>
  );
}
