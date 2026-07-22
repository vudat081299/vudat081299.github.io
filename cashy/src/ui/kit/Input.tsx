import {
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Material Symbols ligature sized to sit inside an input addon. */
function Ico({ name }: { name: string }) {
  return <span className="wb-ico wb-ico--sm">{name}</span>;
}

type ControlSize = "sm" | "md" | "lg";

/**
 * Inline size override for a control. WHY inline: web-builder ships no
 * `wb-input--sm/--lg` classes (only one input scale), so a `size` prop can't map
 * to a class without inventing dead CSS. We scale padding + font-size on the
 * element instead — the same escape hatch Modal/Popover use for their geometry.
 */
function controlSizeStyle(size: ControlSize): CSSProperties | undefined {
  if (size === "sm") return { fontSize: 13, padding: "6px 10px" };
  if (size === "lg") return { fontSize: 15, padding: "11px 14px" };
  return undefined;
}

/**
 * Field — the web-builder `.wb-field` wrapper: an optional label (with a muted
 * "(optional)" suffix via `wb-label__opt`), the control (children), and one
 * message line below it. WHY a single message slot: `error` and `help` are
 * mutually exclusive in the design system — an `error` (red `wb-error`) takes
 * over from `help` (`wb-help`) so a field never shows both at once. Pass
 * `htmlFor` matching the control's `id` so clicking the label focuses it.
 */
export function Field({
  label,
  labelOptional,
  htmlFor,
  help,
  error,
  className,
  children,
  ...rest
}: {
  label?: ReactNode;
  /** Muted trailing note in the label, e.g. "(optional)" — rendered in wb-label__opt. */
  labelOptional?: ReactNode;
  /** id of the control this label points at (click-to-focus + screen readers). */
  htmlFor?: string;
  help?: ReactNode;
  /** When set, replaces `help` and renders red (wb-error) — the field's error state. */
  error?: ReactNode;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div className={cn("wb-field", className)} {...rest}>
      {label !== undefined && (
        <label className="wb-label" htmlFor={htmlFor}>
          {label}
          {labelOptional !== undefined && (
            <span className="wb-label__opt"> {labelOptional}</span>
          )}
        </label>
      )}
      {children}
      {error !== undefined ? (
        <span className="wb-error">{error}</span>
      ) : help !== undefined ? (
        <span className="wb-help">{help}</span>
      ) : null}
    </div>
  );
}

/**
 * Input — the web-builder `.wb-input` as a typed, drop-in `<input>`. Behaves like
 * a native input (all InputHTMLAttributes pass through, controlled or uncontrolled
 * via value/defaultValue + onChange). Extras:
 * - `invalid` sets the `.is-invalid` red state and `aria-invalid` together, so the
 *   visual and the a11y flag can never drift apart.
 * - `leadingIcon`/`trailingIcon` (icon names) or `leadingAddon`/`trailingAddon`
 *   (any node: ₫, %, https://, a button…) wrap the input in `.wb-input-group`.
 * - `seamless` melts the field into its container (`--seamless`, or the group's
 *   `--seamless` when addons are present).
 * - `size` scales the control (see controlSizeStyle).
 */
export function Input({
  size = "md",
  invalid,
  seamless,
  leadingIcon,
  trailingIcon,
  leadingAddon,
  trailingAddon,
  className,
  style,
  "aria-invalid": ariaInvalid,
  ...rest
}: {
  size?: ControlSize;
  invalid?: boolean;
  /** Drop borders/fill so the field blends into its container (focus ring stays). */
  seamless?: boolean;
  /** Material Symbols ligature shown before the input. */
  leadingIcon?: string;
  /** Material Symbols ligature shown after the input. */
  trailingIcon?: string;
  /** Any node before the input — text (₫, https://) or a control. */
  leadingAddon?: ReactNode;
  /** Any node after the input — text (%, .00) or a `wb-input-group__btn`. */
  trailingAddon?: ReactNode;
  // Omit native `size` (a character-width number) so our sizing prop can own it.
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">) {
  const lead =
    leadingAddon !== undefined ? leadingAddon : leadingIcon ? <Ico name={leadingIcon} /> : null;
  const trail =
    trailingAddon !== undefined ? trailingAddon : trailingIcon ? <Ico name={trailingIcon} /> : null;
  const grouped = lead !== null || trail !== null;

  // Seamless groups carry `.is-invalid` on the wrapper; everywhere else it rides
  // the input element (matches the two CSS selectors for the invalid state).
  const invalidOnGroup = grouped && !!seamless && !!invalid;
  const invalidOnInput = !!invalid && !invalidOnGroup;

  const control = (
    <input
      {...rest}
      aria-invalid={invalid ? true : ariaInvalid}
      style={{ ...controlSizeStyle(size), ...style }}
      className={cn(
        "wb-input",
        !grouped && seamless && "wb-input--seamless",
        invalidOnInput && "is-invalid",
        !grouped && className,
      )}
    />
  );

  if (!grouped) return control;

  return (
    <div
      className={cn(
        "wb-input-group",
        seamless && "wb-input-group--seamless",
        invalidOnGroup && "is-invalid",
        className,
      )}
    >
      {lead !== null && <span className="wb-input-group__addon">{lead}</span>}
      {control}
      {trail !== null && <span className="wb-input-group__addon">{trail}</span>}
    </div>
  );
}
