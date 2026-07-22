import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";

/** Material Symbols ligature icon, sized to sit inside a button. */
function Ico({ name }: { name: string }) {
  return <span className="wb-ico wb-ico--sm">{name}</span>;
}

/**
 * Button — the web-builder `.wb-btn` in a typed wrapper. Default is the neutral
 * "primary" (near-black in light, near-white in dark) per the white-black-grey
 * house style; colour is reserved for meaningful actions (danger/success). Adds
 * ergonomic props for the CSS's modifier classes — `variant`, `size`, `round`,
 * `iconOnly`, `block` — plus a `loading` state that swaps the leading icon for a
 * `.wb-spinner` and marks the button busy/non-interactive. All native <button>
 * props pass through, so `onClick`, `aria-label` (required for icon-only), `form`
 * etc. work as usual.
 */
export function Button({
  variant = "primary",
  size = "md",
  round,
  iconOnly,
  block,
  loading,
  leadingIcon,
  trailingIcon,
  type = "button",
  disabled,
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  /** Pill for a text button, a circle when combined with `iconOnly`. */
  round?: boolean;
  /** Square/circular icon-only button — remember to pass `aria-label`. */
  iconOnly?: boolean;
  /** Full-width block button. */
  block?: boolean;
  /** Show a spinner in the leading slot and block interaction while true. */
  loading?: boolean;
  /** Material Symbols ligature shown before the label. */
  leadingIcon?: string;
  /** Material Symbols ligature shown after the label. */
  trailingIcon?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "wb-btn",
        variant !== "primary" && `wb-btn--${variant}`,
        size === "sm" && "wb-btn--sm",
        size === "lg" && "wb-btn--lg",
        round && "wb-btn--round",
        iconOnly && "wb-btn--icon",
        block && "wb-btn--block",
        loading && "is-loading",
        className,
      )}
    >
      {loading ? <span className="wb-spinner" /> : leadingIcon && <Ico name={leadingIcon} />}
      {children}
      {trailingIcon && <Ico name={trailingIcon} />}
    </button>
  );
}

/**
 * ButtonGroup — joins `.wb-btn` children into one segmented control (shared
 * seams, rounded outer ends) via `.wb-btn-group`. Reads best with `--outline` /
 * `--secondary` Buttons; mark the chosen one active with `className="is-active"`.
 */
export function ButtonGroup({
  className,
  children,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="group" {...rest} className={cn("wb-btn-group", className)}>
      {children}
    </div>
  );
}
