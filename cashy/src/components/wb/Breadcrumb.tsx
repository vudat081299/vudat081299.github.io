import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One hop in the trail. The last item renders as the (bold, non-link) current page. */
export type BreadcrumbItem = {
  label: ReactNode;
  /** Link target for every hop except the last; a hop without one renders as plain text. */
  href?: string;
  /** Optional leading icon-font glyph name (Material Symbols ligature). */
  icon?: string;
};

/**
 * Breadcrumb — wraps the web-builder `wb-breadcrumb` nav (CSS §14). Renders the
 * hierarchy from an `items` array, drawing a `wb-breadcrumb__sep` between hops;
 * the final item becomes `wb-breadcrumb__current` (bold, unlinked). Long trails
 * wrap on their own, per the CSS.
 *
 * WHY a wrapper: the raw markup interleaves `<a>` and `__sep` spans by hand,
 * which is fiddly and error-prone to keep balanced. Passing structured items
 * makes the "last = current" rule automatic and the separators consistent.
 */
export function Breadcrumb({
  items,
  separator = "/",
  className,
  ...rest
}: {
  items: BreadcrumbItem[];
  /** The glyph between hops (defaults to "/"). */
  separator?: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <nav aria-label="Breadcrumb" {...rest} className={cn("wb-breadcrumb", className)}>
      {items.map((item, i) => {
        const isCurrent = i === items.length - 1;
        const glyph = item.icon != null && (
          <span className="wb-ico wb-ico--sm" aria-hidden="true">
            {item.icon}
          </span>
        );
        return (
          <Fragment key={i}>
            {i > 0 && <span className="wb-breadcrumb__sep">{separator}</span>}
            {isCurrent ? (
              <span className="wb-breadcrumb__current" aria-current="page">
                {glyph}
                {item.label}
              </span>
            ) : item.href != null ? (
              <a href={item.href}>
                {glyph}
                {item.label}
              </a>
            ) : (
              <span>
                {glyph}
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
