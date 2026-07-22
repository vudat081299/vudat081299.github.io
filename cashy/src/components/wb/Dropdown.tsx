import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DropdownVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";

/** One row of a Dropdown menu. Set `divider` for a separator; otherwise `label` is shown. */
export type DropdownItem = {
  label?: ReactNode;
  /** Material Symbols ligature shown in the leading slot. */
  icon?: string;
  /** Shortcut hint shown right-aligned (e.g. "E", "⌘K"). */
  kbd?: string;
  /** Red "destructive" styling (delete, remove). */
  danger?: boolean;
  disabled?: boolean;
  /** Render a hairline separator instead of a clickable item. */
  divider?: boolean;
  onSelect?: () => void;
};

/**
 * Dropdown — a click-toggled `.wb-dropdown` + `.wb-menu` floating menu attached
 * to a `.wb-btn` trigger with the rotating `expand_more` caret. The docs rely on
 * app.js to toggle `.is-open`; here the open state + outside-click + Esc are
 * hand-rolled with the same behaviour as Popover.tsx (mousedown-outside closes,
 * Escape closes on the capture phase so it dismisses only this menu, not a modal
 * hosting it). Items are declarative (label/icon/kbd/danger/disabled/divider);
 * selecting one fires `onSelect` and closes the menu.
 */
export function Dropdown({
  label,
  items,
  variant = "secondary",
  size,
  align = "left",
  className,
  buttonClassName,
}: {
  /** Trigger button content. */
  label: ReactNode;
  items: DropdownItem[];
  /** Trigger button fill variant. */
  variant?: DropdownVariant;
  size?: "sm" | "md" | "lg";
  /** Which edge the menu lines up with — `right` for triggers near the page edge. */
  align?: "left" | "right";
  className?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture + stop so Escape closes only this menu, not a modal hosting it.
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("wb-dropdown", open && "is-open", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "wb-btn",
          variant !== "primary" && `wb-btn--${variant}`,
          size === "sm" && "wb-btn--sm",
          size === "lg" && "wb-btn--lg",
          buttonClassName,
        )}
      >
        {label}
        <span className="wb-ico wb-ico--sm wb-dropdown__caret">expand_more</span>
      </button>
      <div className={cn("wb-dropdown__menu", align === "right" && "wb-dropdown__menu--right")}>
        <div className="wb-menu" role="menu">
          {items.map((it, i) =>
            it.divider ? (
              <div key={i} className="wb-menu__sep" />
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                className={cn("wb-menu__item", it.danger && "wb-menu__item--danger")}
                onClick={() => {
                  it.onSelect?.();
                  setOpen(false);
                }}
              >
                {it.icon && (
                  <span className="wb-menu__ico">
                    <span className="wb-ico wb-ico--xs">{it.icon}</span>
                  </span>
                )}
                {it.label}
                {it.kbd && <span className="wb-menu__kbd">{it.kbd}</span>}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
