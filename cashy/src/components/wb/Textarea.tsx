import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Textarea — the web-builder `.wb-textarea` as a typed, drop-in `<textarea>`.
 * Behaves like the native element (all TextareaHTMLAttributes pass through,
 * controlled or uncontrolled). Extras:
 * - By default it's wrapped in `.wb-textarea-wrap` so the OS resize grip is
 *   swapped for the themed diagonal handle and manual vertical resize still works.
 * - `autoSize` grows the field to fit its content on every change; WHY it drops
 *   the wrap: an auto-growing field has no manual resize, so showing the resize
 *   handle would be a lie — we render a bare textarea with `resize:none` instead.
 * - `code` keeps long lines on one row and scrolls horizontally (`--code`).
 * - `seamless` blends the field into its container (`--seamless`).
 * - `invalid` sets the `.is-invalid` red state and `aria-invalid` together.
 */
export function Textarea({
  autoSize,
  code,
  seamless,
  invalid,
  rows = 3,
  className,
  style,
  onChange,
  "aria-invalid": ariaInvalid,
  ...rest
}: {
  /** Grow height to fit content on each change (disables manual resize). */
  autoSize?: boolean;
  /** Keep long lines on one row, scroll horizontally (wb-textarea--code). */
  code?: boolean;
  /** Blend into the container: no border/fill, focus ring only (--seamless). */
  seamless?: boolean;
  invalid?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el || !autoSize) return;
    // Reset first so the field can also SHRINK, not just grow.
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoSize]);

  // Re-fit when the value changes externally (controlled) or on mount.
  useLayoutEffect(() => {
    fit();
  }, [fit, rest.value, rest.defaultValue]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    fit();
    onChange?.(e);
  };

  const textarea = (
    <textarea
      {...rest}
      ref={ref}
      rows={rows}
      aria-invalid={invalid ? true : ariaInvalid}
      onChange={handleChange}
      style={autoSize ? { resize: "none", overflow: "hidden", ...style } : style}
      className={cn(
        "wb-textarea",
        code && "wb-textarea--code",
        seamless && "wb-textarea--seamless",
        invalid && "is-invalid",
        className,
      )}
    />
  );

  // Bare (no handle) when auto-sizing; wrapped for the themed resize handle otherwise.
  if (autoSize) return textarea;
  return <div className="wb-textarea-wrap">{textarea}</div>;
}
