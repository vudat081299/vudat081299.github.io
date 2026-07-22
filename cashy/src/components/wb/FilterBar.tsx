import {
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * FilterBar — the web-builder `wb-filterbar` toolbar for narrowing a table or
 * list (pages/filterbar.html, CSS §40). It owns only the chrome: an optional
 * seamless search field on the left, a `children` slot for the applied tokens
 * plus any custom controls (an {@link FilterAdd} trigger, a {@link SegmentedToggle},
 * a popover…), and an optional result `count` pinned right. It is the GENERIC
 * form of cashy's `tx/TxFilterBar`, which hard-wires a transaction query — here
 * every piece emits through callbacks so any list can compose its own bar.
 */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  count,
  children,
  className,
}: {
  /** Current search text; omit `onSearch` to drop the search field entirely. */
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  /** Right-aligned result summary (e.g. "24 transactions"). */
  count?: ReactNode;
  /** Tokens + custom controls, laid out in source order after the search. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("wb-filterbar", className)}>
      {onSearch && (
        <div className="wb-input-group wb-filterbar__search">
          <span className="wb-input-group__addon">
            <span className="wb-ico wb-ico--sm">search</span>
          </span>
          <input
            className="wb-input"
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      )}
      {children}
      {count != null && <span className="wb-filterbar__count">{count}</span>}
    </div>
  );
}

/**
 * FilterToken — one applied filter as a removable `[ key : value × ]` chip
 * (`wb-filter-token`). Neutral by default; pass `tone` ONLY when the token
 * stands for a status filter (the one place §40 lets colour in). The × glyph is
 * drawn by CSS (`::before`), so the close button is intentionally empty.
 */
export function FilterToken({
  label,
  value,
  tone,
  onRemove,
  removeLabel = "Remove filter",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Soft status tint — status filters only, per the colour ladder. */
  tone?: "success" | "danger" | "warning" | "info";
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}) {
  return (
    <span className={cn("wb-filter-token", tone && `wb-filter-token--${tone}`, className)}>
      <span className="wb-filter-token__key">{label}</span>
      <span className="wb-filter-token__val">{value}</span>
      {onRemove && (
        <button
          type="button"
          className="wb-filter-token__x"
          aria-label={removeLabel}
          onClick={onRemove}
        />
      )}
    </span>
  );
}

/**
 * FilterAdd — the dashed "＋ Add filter" trigger (`wb-filter-add`). It is just a
 * styled button (open a {@link Popover} from its `onClick`); kept separate so the
 * bar can place it wherever the composition needs.
 */
export function FilterAdd({
  label = "Add filter",
  className,
  ...rest
}: {
  label?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn("wb-filter-add", className)} {...rest}>
      <span className="wb-ico wb-ico--sm">add</span> {label}
    </button>
  );
}

/**
 * SegmentedToggle — the pill segmented control (`wb-tabs wb-tabs--pill`) for a
 * single-select toggle such as a finance type switch (All / Income / Expense).
 * Generic over the option value so `onChange` hands back the exact typed key,
 * never a stringly-typed guess.
 */
export function SegmentedToggle<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: V; label: ReactNode }[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("wb-tabs wb-tabs--pill", className)} role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn("wb-tab", active && "is-active")}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** digits → int, or `null` for an empty/garbage field. */
function parseNum(s: string): number | null {
  const digits = s.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : null;
}

/** Percentage of `v` along `[min,max]`, clamped to 0–100 (guards min === max). */
function pct(v: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
}

/**
 * RangeFilter — the amount/number range editor from §40: a plain-language
 * summary, a dual-handle slider (`wb-range-dual`, §28), and min/max number
 * inputs, all kept in sync. This is the `initRangeFilter` behaviour from
 * app.js rebuilt as controlled React (no app.js, no slider lib):
 *   • the two range handles cannot cross (each clamps against the other);
 *   • `--a`/`--b` drive the coloured fill between the handles;
 *   • the number boxes edit a local draft while focused, so an incoming
 *     `value` update never rewrites digits mid-type (matches the app.js note),
 *     and commit clamps into `[min,max]`.
 * Fully controlled: it renders `value` and reports every change via `onChange`.
 */
export function RangeFilter({
  min,
  max,
  step = 1,
  value,
  onChange,
  title,
  currency,
  format = (n) => n.toLocaleString(),
  renderSummary,
  fromLabel = "From",
  toLabel = "To",
  className,
}: {
  min: number;
  max: number;
  step?: number;
  value: { from: number; to: number };
  onChange: (value: { from: number; to: number }) => void;
  /** Optional `wb-filter-pop__title` heading above the control. */
  title?: ReactNode;
  /** Addon symbol shown before each number input (e.g. "₫", "$"). */
  currency?: ReactNode;
  /** Formats a bound for the summary line. */
  format?: (n: number) => string;
  /** Replace the default summary text with your own. */
  renderSummary?: (state: {
    from: number;
    to: number;
    atMin: boolean;
    atMax: boolean;
  }) => ReactNode;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}) {
  // Drafts hold in-progress typing so an external `value` change doesn't clobber
  // the caret; `null` means "mirror the prop".
  const [fromDraft, setFromDraft] = useState<string | null>(null);
  const [toDraft, setToDraft] = useState<string | null>(null);

  const commitFrom = (raw: string) => {
    const n = parseNum(raw);
    const next = n == null ? min : Math.min(Math.max(n, min), value.to);
    onChange({ from: next, to: value.to });
  };
  const commitTo = (raw: string) => {
    const n = parseNum(raw);
    const next = n == null ? max : Math.max(Math.min(n, max), value.from);
    onChange({ from: value.from, to: next });
  };

  const atMin = value.from <= min;
  const atMax = value.to >= max;
  const summary = renderSummary
    ? renderSummary({ from: value.from, to: value.to, atMin, atMax })
    : atMin && atMax
      ? "Any"
      : atMin
        ? `≤ ${format(value.to)}`
        : atMax
          ? `≥ ${format(value.from)}`
          : `${format(value.from)} – ${format(value.to)}`;

  return (
    <div className={className}>
      {title != null && <p className="wb-filter-pop__title">{title}</p>}
      <div className="wb-range-filter">
        <div className="wb-range-filter__summary">{summary}</div>

        <div
          className="wb-range-dual"
          style={{ "--a": pct(value.from, min, max), "--b": pct(value.to, min, max) } as CSSProperties}
        >
          <div className="wb-range-dual__track" />
          <div className="wb-range-dual__fill" />
          <input
            className="wb-range-dual__input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value.from}
            aria-label={fromLabel}
            // Cannot pass the max handle.
            onChange={(e) => onChange({ from: Math.min(+e.target.value, value.to), to: value.to })}
          />
          <input
            className="wb-range-dual__input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value.to}
            aria-label={toLabel}
            onChange={(e) => onChange({ from: value.from, to: Math.max(+e.target.value, value.from) })}
          />
        </div>

        <div className="wb-cluster wb-cluster--nowrap wb-cluster--stretch wb-cluster--tight">
          <div className="wb-input-group">
            {currency != null && <span className="wb-input-group__addon">{currency}</span>}
            <input
              className="wb-input"
              inputMode="numeric"
              aria-label={fromLabel}
              value={fromDraft ?? String(value.from)}
              onFocus={() => setFromDraft(String(value.from))}
              onChange={(e) => {
                setFromDraft(e.target.value);
                commitFrom(e.target.value);
              }}
              onBlur={() => setFromDraft(null)}
            />
          </div>
          <div className="wb-input-group">
            {currency != null && <span className="wb-input-group__addon">{currency}</span>}
            <input
              className="wb-input"
              inputMode="numeric"
              aria-label={toLabel}
              value={toDraft ?? String(value.to)}
              onFocus={() => setToDraft(String(value.to))}
              onChange={(e) => {
                setToDraft(e.target.value);
                commitTo(e.target.value);
              }}
              onBlur={() => setToDraft(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
