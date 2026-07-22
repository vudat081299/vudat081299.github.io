import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — wraps the web-builder `wb-empty` block (CSS §21): a faint icon,
 * a short title, a one-line message, and an optional action. Drop it inside a
 * `wb-card` or straight into a content area when there's no data / no results.
 *
 * WHY a wrapper: the raw markup is four hand-typed elements with easy-to-forget
 * class names; this makes the shape (icon → title → message → action) a typed
 * contract and keeps the action slot flexible for one or several buttons.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...rest
}: {
  /** Faint leading glyph — an emoji string, or an icon-font `<span className="wb-ico">`. */
  icon?: ReactNode;
  title: ReactNode;
  /** The `wb-empty__msg` supporting line. */
  description?: ReactNode;
  /** Optional action slot — one or more `wb-btn` buttons. */
  action?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-empty", className)} {...rest}>
      {icon != null && <div className="wb-empty__icon">{icon}</div>}
      <p className="wb-empty__title">{title}</p>
      {description != null && <p className="wb-empty__msg">{description}</p>}
      {action}
    </div>
  );
}
