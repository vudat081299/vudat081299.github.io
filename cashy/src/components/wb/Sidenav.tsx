import {
  Fragment,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** One rail link. `badge` is a trailing count; `active` gives the flat highlight. */
export type SidenavItem = {
  label: ReactNode;
  href?: string;
  /** Material Symbols glyph name, rendered as a leading `.wb-ico`. */
  icon?: string;
  active?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
};

/** A titled group of rail links (title optional). */
export type SidenavSection = {
  title?: ReactNode;
  items: SidenavItem[];
};

/**
 * SidenavLink — a single wb-sidenav__link (icon · label · optional count badge).
 * Exported so a rail can be composed by hand as `children` when the `sections`
 * data shape is too rigid. When `collapsed`, only the icon shows and the label is
 * moved to `title` for hover/AT — the whole label/badge collapse is plain
 * conditional rendering, no CSS is added.
 */
export function SidenavLink({
  label,
  icon,
  active = false,
  badge,
  collapsed = false,
  className,
  ...rest
}: {
  label: ReactNode;
  icon?: string;
  active?: boolean;
  badge?: ReactNode;
  collapsed?: boolean;
  className?: string;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn("wb-sidenav__link", active && "is-active", className)}
      aria-current={active ? "page" : undefined}
      title={collapsed && typeof label === "string" ? label : rest.title}
      {...rest}
    >
      {icon && <span className="wb-ico">{icon}</span>}
      {!collapsed && label}
      {!collapsed && badge != null && <span className="wb-sidenav__badge">{badge}</span>}
    </a>
  );
}

/**
 * Sidenav — the wb-sidenav vertical app rail: `__section` group labels + icon
 * links + count `__badge`s, active = flat highlight (matches Nav & the folder
 * tree). The generic form of cashy's Layout sidebar.
 *
 * WHY these knobs: `scrollable` opts the rail into the §27 `.wb-scroll-y`
 * treatment for long lists (as the docs advise) rather than baking overflow in;
 * `collapsed` gives the "optional collapse" icon-only rail purely by dropping
 * labels/section titles and narrowing `width` — no invented CSS, since the kit
 * has no collapsed modifier and mobile open/close is the app's job. Pass
 * `children` to hand-build the rail instead of `sections`.
 */
export function Sidenav({
  sections,
  collapsed = false,
  scrollable = false,
  width,
  className,
  style,
  children,
  ...rest
}: {
  sections?: SidenavSection[];
  collapsed?: boolean;
  scrollable?: boolean;
  /** Rail width; defaults to a compact rail when `collapsed`, else the CSS 240px. */
  width?: number | string;
  className?: string;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  const railStyle: CSSProperties = {
    width: width ?? (collapsed ? 64 : undefined),
    ...style,
  };

  return (
    <nav
      className={cn("wb-sidenav", scrollable && "wb-scroll-y", className)}
      style={railStyle}
      {...rest}
    >
      {children ??
        sections?.map((section, si) => (
          <Fragment key={si}>
            {section.title && !collapsed && (
              <div className="wb-sidenav__section">{section.title}</div>
            )}
            {section.items.map((item, ii) => (
              <SidenavLink
                key={ii}
                label={item.label}
                icon={item.icon}
                active={item.active}
                badge={item.badge}
                collapsed={collapsed}
                href={item.href}
                onClick={item.onClick}
              />
            ))}
          </Fragment>
        ))}
    </nav>
  );
}
