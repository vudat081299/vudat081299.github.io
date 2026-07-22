import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One navigation link. `active`/`disabled` drive the flat highlight + no-op states. */
export type NavItem = {
  label: ReactNode;
  /** Anchor target; omit for a button-like link driven purely by `onClick`. */
  href?: string;
  /** Material Symbols glyph name, rendered as a leading `.wb-ico`. */
  icon?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

/**
 * Nav — the wb-nav navigation-links primitive: a set of links with a flat
 * "highlight, no leading bar" active state. It is the middle of a Navbar and can
 * also live in a Popover or sidebar.
 *
 * WHY a data-driven `items` list rather than children: the wb-nav collapse in
 * Navbar toggles classes on THIS element and styles `.wb-nav__link` as its direct
 * children, so links must sit directly under `.wb-nav` — a fixed shape the array
 * guarantees. `variant` maps to the two real CSS modifiers only (`--underline`
 * for page-tabs, `--vertical` for stacked); default is the horizontal fill.
 */
export function Nav({
  items,
  variant = "default",
  className,
  ...rest
}: {
  items: NavItem[];
  variant?: "default" | "underline" | "vertical";
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  return (
    <nav
      className={cn(
        "wb-nav",
        variant === "underline" && "wb-nav--underline",
        variant === "vertical" && "wb-nav--vertical",
        className,
      )}
      {...rest}
    >
      {items.map((item, i) => (
        <a
          key={i}
          className={cn(
            "wb-nav__link",
            item.active && "is-active",
            item.disabled && "is-disabled",
          )}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          aria-disabled={item.disabled || undefined}
          onClick={item.onClick}
        >
          {item.icon && <span className="wb-ico">{item.icon}</span>}
          {item.label}
        </a>
      ))}
    </nav>
  );
}
