import { useState, type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Nav, type NavItem } from "./Nav";

/**
 * NavbarBrand — the left-hand brand slot: an optional square `mark` badge plus a
 * name/logo. Kept a separate export so a Navbar can take any brand element while
 * this covers the common "glyph + wordmark" case with the exact wb markup.
 */
export function NavbarBrand({
  mark,
  className,
  children,
  ...rest
}: {
  /** Glyph shown in the small square badge (e.g. "C"); omit for wordmark-only. */
  mark?: ReactNode;
  className?: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cn("wb-navbar__brand", className)} {...rest}>
      {mark != null && <span className="wb-navbar__mark">{mark}</span>}
      {children}
    </a>
  );
}

/**
 * Navbar — the wb-navbar top app bar: brand slot · inline `Nav` links · spacer ·
 * actions slot. Renders the Nav from `items` (rather than an opaque children
 * slot) so the responsive collapse works: the CSS container-query turns the same
 * `.wb-navbar__menu` element into a ☰ dropdown when the bar is narrow, and it
 * only styles links that are its direct children — which the Nav primitive
 * guarantees. The ☰ toggle is hand-rolled (open state → `is-open`, no libs);
 * picking a link closes the dropdown. `sticky` pins the bar (`--sticky`).
 */
export function Navbar({
  brand,
  items,
  actions,
  sticky = false,
  menuLabel = "Mở menu",
  className,
  ...rest
}: {
  /** Left slot — typically a <NavbarBrand>. */
  brand?: ReactNode;
  /** Middle nav links; also the set that folds into the ☰ menu when narrow. */
  items?: NavItem[];
  /** Right slot — icon buttons, a theme toggle, an avatar… */
  actions?: ReactNode;
  sticky?: boolean;
  /** Accessible label for the collapsed-menu ☰ toggle. */
  menuLabel?: string;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = items != null && items.length > 0;

  // Close the dropdown after a pick — the ☰ menu is a one-shot on mobile.
  const menuItems = items?.map((item) => ({
    ...item,
    onClick: () => {
      item.onClick?.();
      setMenuOpen(false);
    },
  }));

  return (
    <div className={cn("wb-navbar", sticky && "wb-navbar--sticky", className)} {...rest}>
      {hasMenu && (
        <button
          type="button"
          className="wb-navbar__toggle wb-btn wb-btn--ghost wb-btn--icon"
          aria-label={menuLabel}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="wb-ico">menu</span>
        </button>
      )}
      {brand}
      {menuItems && (
        <Nav items={menuItems} className={cn("wb-navbar__menu", menuOpen && "is-open")} />
      )}
      <span className="wb-navbar__spacer" />
      {actions && <div className="wb-navbar__actions">{actions}</div>}
    </div>
  );
}
