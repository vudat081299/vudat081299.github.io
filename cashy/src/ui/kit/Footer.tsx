import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One footer link (href optional so it can be a router-driven anchor). */
export type FooterLink = { label: ReactNode; href?: string };

/** A titled column of footer links. */
export type FooterColumn = { title: ReactNode; links: FooterLink[] };

/**
 * Footer — the wb-footer site footer: a brand block (square `mark` + name +
 * tagline) beside `columns` of links, over a bottom bar carrying the copyright
 * and a `bottom` slot (social icon buttons, etc). House greyscale, no brand
 * colour.
 *
 * WHY `slim`: it maps to the real `--slim` modifier, which drops the top row for
 * a one-line footer — so the top block is skipped entirely when slim to avoid
 * rendering a group the CSS would only hide. `bottom` is a slot rather than a
 * social-links array because that region legitimately holds arbitrary content
 * (inline SVG brand logos, `.wb-btn--icon` links…).
 */
export function Footer({
  brand,
  columns,
  copyright,
  bottom,
  slim = false,
  columnsLabel = "Links",
  className,
  ...rest
}: {
  /** Brand block; `mark` is the square badge glyph (e.g. "C"). */
  brand?: { mark?: ReactNode; name: ReactNode; tagline?: ReactNode };
  columns?: FooterColumn[];
  copyright?: ReactNode;
  /** Right side of the bottom bar — typically social `.wb-btn--icon` links. */
  bottom?: ReactNode;
  slim?: boolean;
  /** Accessible label for the link-columns nav. */
  columnsLabel?: string;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  const hasTop = !slim && (brand != null || (columns != null && columns.length > 0));

  return (
    <footer className={cn("wb-footer", slim && "wb-footer--slim", className)} {...rest}>
      <div className="wb-footer__inner">
        {hasTop && (
          <div className="wb-footer__top">
            {brand && (
              <div className="wb-footer__brand">
                {brand.mark != null && <span className="wb-footer__mark">{brand.mark}</span>}
                <div>
                  <div className="wb-footer__name">{brand.name}</div>
                  {brand.tagline != null && (
                    <p className="wb-footer__tagline">{brand.tagline}</p>
                  )}
                </div>
              </div>
            )}
            {columns != null && columns.length > 0 && (
              <nav className="wb-footer__cols" aria-label={columnsLabel}>
                {columns.map((col, ci) => (
                  <div className="wb-footer__col" key={ci}>
                    <h4 className="wb-footer__title">{col.title}</h4>
                    {col.links.map((link, li) => (
                      <a className="wb-footer__link" href={link.href} key={li}>
                        {link.label}
                      </a>
                    ))}
                  </div>
                ))}
              </nav>
            )}
          </div>
        )}
        <div className="wb-footer__bottom">
          <span className="wb-footer__copy">{copyright}</span>
          {bottom && <div className="wb-footer__social">{bottom}</div>}
        </div>
      </div>
    </footer>
  );
}
