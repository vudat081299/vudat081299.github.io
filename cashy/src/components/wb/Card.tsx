import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card — the web-builder `wb-card` surface (hairline border + radius + soft
 * shadow) and its head/body/foot parts, exposed as small compound pieces so a
 * screen composes them exactly like the markup on pages/card.html
 * (`wb-card` › `wb-card__head` / `__body` / `__foot`). Split into subcomponents
 * (rather than one mega-prop component) because a card's sections are optional
 * and freely ordered — some cards are body-only, some skip the foot.
 */
export function Card({
  variant = "default",
  className,
  children,
  ...rest
}: {
  /** `dashed` (add-new / drop target) · `flat` (no shadow) · `hover` (lifts — clickable cards). */
  variant?: "default" | "dashed" | "flat" | "hover";
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("wb-card", variant !== "default" && `wb-card--${variant}`, className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * CardHead — `wb-card__head`: a title/sub block on the left and optional
 * actions (a capsule, buttons…) pinned right. Pass `children` instead of
 * title/sub for a fully custom left column.
 */
export function CardHead({
  title,
  sub,
  actions,
  className,
  children,
  ...rest
}: {
  title?: ReactNode;
  sub?: ReactNode;
  /** Right-aligned controls (`wb-card__head-actions`) — capsule, buttons, menu. */
  actions?: ReactNode;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-card__head", className)} {...rest}>
      <div>
        {title !== undefined && <h4 className="wb-card__title">{title}</h4>}
        {sub !== undefined && <p className="wb-card__sub">{sub}</p>}
        {children}
      </div>
      {actions !== undefined && <div className="wb-card__head-actions">{actions}</div>}
    </div>
  );
}

/** CardBody — `wb-card__body`, the padded content region. */
export function CardBody({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-card__body", className)} {...rest}>
      {children}
    </div>
  );
}

/** CardFoot — `wb-card__foot`, a tinted action bar under a divider. */
export function CardFoot({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("wb-card__foot", className)} {...rest}>
      {children}
    </div>
  );
}
