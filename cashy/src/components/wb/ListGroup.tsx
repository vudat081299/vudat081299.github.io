import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * ListGroup — a bordered, hairline-divided list (settings rows, accounts,
 * pickers). Wraps the web-builder `wb-list`. Compose {@link ListItem} children.
 * Pass `flush` to drop the frame so it sits inside a card (`wb-list--flush`).
 */
export function ListGroup({
  flush = false,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLUListElement> & {
  /** Drop the border/background so the list sits flush inside a card. */
  flush?: boolean;
}) {
  return (
    <ul className={cn("wb-list", flush && "wb-list--flush", className)} {...rest}>
      {children}
    </ul>
  );
}

/**
 * ListItem — one row of a {@link ListGroup}: an optional leading icon/avatar, a
 * title with an optional subtitle, and trailing meta/action. Renders as an `<a>`
 * when `href` is set (with the `--link` hover affordance), otherwise an `<li>`;
 * pass `clickable` to get the link affordance on a non-anchor row. `active`
 * marks a selection and `disabled` dims + disables it.
 *
 * `children`, when given, replace the title/subtitle block (an escape hatch);
 * `leading`/`icon` and `end` still render around them.
 */
export function ListItem({
  title,
  sub,
  end,
  icon,
  leading,
  href,
  target,
  rel,
  active = false,
  disabled = false,
  clickable = false,
  className,
  children,
  ...rest
}: Omit<HTMLAttributes<HTMLElement>, "title"> & {
  /** Primary label. */
  title?: ReactNode;
  /** Secondary line under the title. */
  sub?: ReactNode;
  /** Right-aligned meta / action (value, count, switch…). */
  end?: ReactNode;
  /** Leading icon name (web-builder icon font). */
  icon?: string;
  /** Leading element (avatar, custom node) — sits before the title. */
  leading?: ReactNode;
  /** Turn the row into a link. */
  href?: string;
  target?: string;
  rel?: string;
  /** Mark the row as the current selection. */
  active?: boolean;
  /** Dim and disable the row. */
  disabled?: boolean;
  /** Add the link hover affordance without turning the row into an anchor. */
  clickable?: boolean;
}) {
  const cls = cn(
    "wb-list__item",
    (href !== undefined || clickable) && "wb-list__item--link",
    active && "is-active",
    disabled && "is-disabled",
    className,
  );

  const inner = (
    <>
      {leading}
      {icon !== undefined && <span className="wb-ico wb-ico--sm">{icon}</span>}
      {children !== undefined
        ? children
        : title !== undefined && (
            <span className="wb-list__title">
              {title}
              {sub !== undefined && <span className="wb-list__sub">{sub}</span>}
            </span>
          )}
      {end !== undefined && <span className="wb-list__end">{end}</span>}
    </>
  );

  if (href !== undefined) {
    return (
      <a className={cls} href={href} target={target} rel={rel} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <li className={cls} {...rest}>
      {inner}
    </li>
  );
}
