import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Alert — wraps the web-builder `wb-alert` inline message block (CSS §9). Neutral
 * by default; a `tone` adds the soft tint + tone-mixed outline (the house style —
 * no left-accent bar), and `plain` drops the outline for a flat banner (rides on
 * any tone). Title-only alerts vertically centre their icon automatically (the CSS
 * `:not(:has(.wb-alert__msg))` rule), so leave `children` empty for the one-liner.
 *
 * WHY a wrapper: it types the tone axis and hand-rolls the one interactive bit the
 * raw markup only hints at — the `wb-close` × (shown when `dismissible`). The close
 * is wired to a small self-contained hook: the alert hides itself when uncontrolled,
 * and `onDismiss` lets a caller sync its own state. No external libs, no app.js.
 */
export function Alert({
  tone = "neutral",
  icon,
  title,
  plain = false,
  dismissible = false,
  onDismiss,
  className,
  children,
  ...rest
}: {
  /** Semantic tone. `neutral` is the borderless-default look; use colour by meaning. */
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  /** Material Symbols ligature rendered in `wb-alert__icon` (e.g. "warning"). */
  icon?: string;
  /** Bold lead line (`wb-alert__title`). */
  title?: ReactNode;
  /** Drop the outline, keep only the soft fill (`wb-alert--plain`). */
  plain?: boolean;
  /** Render the × close button. */
  dismissible?: boolean;
  /** Called after the × is clicked (the alert also hides itself). */
  onDismiss?: () => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "title">) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div
      className={cn(
        "wb-alert",
        tone !== "neutral" && `wb-alert--${tone}`,
        plain && "wb-alert--plain",
        className,
      )}
      {...rest}
    >
      {icon && (
        <span className="wb-alert__icon">
          <span className="wb-ico wb-ico--xs">{icon}</span>
        </span>
      )}
      <div className="wb-alert__body">
        {title !== undefined && <p className="wb-alert__title">{title}</p>}
        {children != null && children !== false && (
          <p className="wb-alert__msg">{children}</p>
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          className="wb-close"
          aria-label="Close"
          onClick={() => {
            setOpen(false);
            onDismiss?.();
          }}
        />
      )}
    </div>
  );
}
