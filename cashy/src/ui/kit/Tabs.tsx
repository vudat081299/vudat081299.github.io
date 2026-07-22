import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One tab: its `value` keys the matching panel; `label` is the button text. */
export type TabItem = {
  value: string;
  label: ReactNode;
  /** Optional Material Symbols ligature shown before the label. */
  icon?: string;
};

/**
 * Tabs — the `.wb-tabs` tablist + `.wb-tab-panel` panels from the web-builder
 * TABS section (§12). The docs flip `.is-active` / the `hidden` attribute with
 * app.js; here that is hand-rolled so the component works standalone.
 *
 * Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). Roving
 * arrow-key navigation (Left/Right/Up/Down + Home/End) is added on top of the
 * source — panels stay mounted and are hidden with the `hidden` attribute exactly
 * like the markup, so panel state survives a switch. `variant` picks the three
 * looks the page shows: underline (default), pill/segmented, and boxed.
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  panels,
  variant = "underline",
  className,
  ...rest
}: {
  items: TabItem[];
  /** Controlled active value. Omit to run uncontrolled. */
  value?: string;
  /** Initial active value when uncontrolled (defaults to the first item). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Panel content keyed by tab value. Omit to render only the tab strip. */
  panels?: Record<string, ReactNode>;
  /** Underline (default), pill/segmented, or high-contrast boxed strip. */
  variant?: "underline" | "pill" | "boxed";
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value ?? "");
  const isControlled = value !== undefined;
  const active = isControlled ? value : internal;
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (next: string) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = items.findIndex((it) => it.value === active);
    if (idx === -1) return;
    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIdx = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIdx = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = items.length - 1;
    else return;
    e.preventDefault();
    const nextValue = items[nextIdx].value;
    select(nextValue);
    // Move focus with selection so keyboard users track the active tab.
    tabRefs.current[nextValue]?.focus();
  };

  return (
    <div className={className} {...rest}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className={cn(
          "wb-tabs",
          variant === "pill" && "wb-tabs--pill",
          variant === "boxed" && "wb-tabs--boxed",
        )}
      >
        {items.map((it) => {
          const selected = it.value === active;
          return (
            <button
              key={it.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${it.value}`}
              aria-selected={selected}
              aria-controls={panels ? `${baseId}-panel-${it.value}` : undefined}
              tabIndex={selected ? 0 : -1}
              ref={(el) => {
                tabRefs.current[it.value] = el;
              }}
              className={cn("wb-tab", selected && "is-active")}
              style={it.icon ? { display: "inline-flex", alignItems: "center", gap: 6 } : undefined}
              onClick={() => select(it.value)}
            >
              {it.icon && <span className="wb-ico wb-ico--sm">{it.icon}</span>}
              {it.label}
            </button>
          );
        })}
      </div>
      {panels &&
        items.map((it) => (
          <div
            key={it.value}
            role="tabpanel"
            id={`${baseId}-panel-${it.value}`}
            aria-labelledby={`${baseId}-tab-${it.value}`}
            className="wb-tab-panel"
            hidden={it.value !== active}
          >
            {panels[it.value]}
          </div>
        ))}
    </div>
  );
}
