import { type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Capsule — wraps the web-builder `wb-cap` badge / status pill (CSS §2). It's the
 * core neutral-first pill: two independent axes — FILL (soft · solid · outline ·
 * elevated · dashed) and TONE (neutral · success · warning · danger · info) —
 * plus a custom category hue (`--tinted`), sizes, and an optional leading status
 * dot or icon-font glyph.
 *
 * WHY a wrapper: it turns the compose-by-hand class soup (`wb-cap wb-cap--success
 * wb-cap--solid wb-cap--lg`) into typed props so a caller can't misspell a
 * modifier, and it centralises the "colour is EITHER a semantic tone OR a custom
 * hue" rule the house style cares about (status = tone, classification = tint).
 * A plain count/number badge is just `<Capsule tone="danger" fill="solid">3</Capsule>`.
 */
export function Capsule({
  children,
  tone = "neutral",
  fill = "soft",
  size = "md",
  color,
  dot = false,
  icon,
  className,
  style,
  ...rest
}: {
  children: ReactNode;
  /** Semantic status colour. Ignored when `color` (a custom hue) is set. */
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
  /** Fill treatment along the independent FILL axis. */
  fill?: "soft" | "solid" | "outline" | "elevated" | "dashed";
  size?: "sm" | "md" | "lg";
  /** Custom category hue (e.g. `#4f46e5`) → `--tinted`; use for classification, not status. */
  color?: string;
  /** Leading `wb-cap__dot` status dot (inherits the capsule's colour). */
  dot?: boolean;
  /** Leading icon-font glyph name (Material Symbols ligature), e.g. `"schedule"`. */
  icon?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  const tinted = color != null;
  const cls = cn(
    "wb-cap",
    fill === "solid" && "wb-cap--solid",
    fill === "outline" && "wb-cap--outline",
    fill === "elevated" && "wb-cap--elevated",
    fill === "dashed" && "wb-cap--dashed",
    tinted && "wb-cap--tinted",
    // A semantic tone only applies when no custom hue is in play.
    !tinted && tone !== "neutral" && `wb-cap--${tone}`,
    size === "sm" && "wb-cap--sm",
    size === "lg" && "wb-cap--lg",
    className,
  );

  const mergedStyle: CSSProperties = tinted
    ? { ["--wb-cap-color" as string]: color, ...style }
    : (style ?? {});

  return (
    <span className={cls} style={mergedStyle} {...rest}>
      {icon != null && (
        <span className="wb-ico wb-ico--sm" aria-hidden="true">
          {icon}
        </span>
      )}
      {dot && <span className="wb-cap__dot" />}
      {children}
    </span>
  );
}
