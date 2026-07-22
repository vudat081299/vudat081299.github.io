import { useState, type CSSProperties, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Value → percentage along the track, guarding a zero-width range. */
function pct(value: number, min: number, max: number) {
  return max === min ? 0 : ((value - min) / (max - min)) * 100;
}

/**
 * Slider — the web-builder `.wb-range` native `<input type="range">` in a typed
 * wrapper. Native accent-colour can't differ per theme, so the CSS hand-styles the
 * track + thumb; the "filled" portion left of the thumb is an inline gradient the
 * page computes from the current value — reproduced here via `fill` (on by default)
 * so the tinted track tracks the value without any app.js. Keyboard support (arrow
 * keys, Home/End, Page keys) is free from the underlying native input.
 *
 * Controlled (`value`) or uncontrolled (`defaultValue`); `onChange` reports the
 * numeric value. Native attrs (`id`, `name`, `aria-label`, `style`, …) pass through.
 */
export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  fill = true,
  size,
  disabled,
  className,
  style,
  ...rest
}: {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Tint the portion left of the thumb (the page's "filled track"). */
  fill?: boolean;
  size?: "sm";
  disabled?: boolean;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "min" | "max" | "step" | "type" | "size"
>) {
  const [internal, setInternal] = useState(defaultValue ?? min);
  const current = value ?? internal;
  const filled = pct(current, min, max);

  return (
    <input
      {...rest}
      type="range"
      className={cn("wb-range", size === "sm" && "wb-range--sm", className)}
      min={min}
      max={max}
      step={step}
      value={current}
      disabled={disabled}
      style={
        fill
          ? {
              background: `linear-gradient(to right, var(--wb-fg) ${filled}%, var(--wb-border-strong) ${filled}%)`,
              ...style,
            }
          : style
      }
      onChange={(e) => {
        const next = e.currentTarget.valueAsNumber;
        if (value === undefined) setInternal(next);
        onChange?.(next);
      }}
    />
  );
}

/**
 * RangeSlider — the web-builder `.wb-range-dual`: two native range inputs stacked
 * on one track (each keeps native keyboard support) with the coloured band between
 * them drawn by a `--a`/`--b` percentage pair, exactly as app.js's `initRangeFilter`
 * drives it. The thumbs are clamped so they can't cross (min ≤ max), matching the
 * source. The value is a `[min, max]` tuple.
 *
 * Controlled (`value`) or uncontrolled (`defaultValue`); `onChange` reports the tuple.
 */
export function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  disabled,
  className,
  minLabel = "Tối thiểu",
  maxLabel = "Tối đa",
}: {
  min?: number;
  max?: number;
  step?: number;
  value?: [number, number];
  defaultValue?: [number, number];
  onChange?: (value: [number, number]) => void;
  disabled?: boolean;
  className?: string;
  /** aria-label for the lower thumb + its (optional) paired field. */
  minLabel?: string;
  /** aria-label for the upper thumb. */
  maxLabel?: string;
}) {
  const [internal, setInternal] = useState<[number, number]>(defaultValue ?? [min, max]);
  const [lo, hi] = value ?? internal;

  const commit = (next: [number, number]) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  // --a / --b are the fill edges as bare percentages; the CSS multiplies by 1%.
  const style = { "--a": pct(lo, min, max), "--b": pct(hi, min, max) } as CSSProperties;

  return (
    <div className={cn("wb-range-dual", className)} style={style}>
      <div className="wb-range-dual__track" />
      <div className="wb-range-dual__fill" />
      <input
        className="wb-range-dual__input"
        data-h="min"
        type="range"
        min={min}
        max={max}
        step={step}
        value={lo}
        disabled={disabled}
        aria-label={minLabel}
        onChange={(e) => commit([Math.min(e.currentTarget.valueAsNumber, hi), hi])}
      />
      <input
        className="wb-range-dual__input"
        data-h="max"
        type="range"
        min={min}
        max={max}
        step={step}
        value={hi}
        disabled={disabled}
        aria-label={maxLabel}
        onChange={(e) => commit([lo, Math.max(e.currentTarget.valueAsNumber, lo)])}
      />
    </div>
  );
}
