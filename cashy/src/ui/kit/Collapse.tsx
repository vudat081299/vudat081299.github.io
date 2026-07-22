import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Collapse — a single show/hide region from the web-builder COLLAPSE section
 * (§42, Bootstrap's `.collapse`). Height animates purely in CSS via the grid
 * `0fr → 1fr` trick on `.wb-collapse__panel`; we only flip `.is-open` on the
 * wrapper, matching the `data-collapse-toggle` handler in app.js.
 *
 * Controlled (`open` + `onOpenChange`) or uncontrolled (`defaultOpen`). The
 * trigger is either a render-prop `trigger={({ open, toggle }) => …}` for full
 * control, or a plain node — in which case it is wrapped in the page's default
 * ghost button with a self-rotating `.wb-collapse__caret`.
 */
export function Collapse({
  trigger,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  ...rest
}: {
  /** A node (wrapped in the default caret button) or a render-prop for full control. */
  trigger: ReactNode | ((props: { open: boolean; toggle: () => void }) => ReactNode);
  children: ReactNode;
  /** Controlled open state. Omit to run uncontrolled. */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  const [internal, setInternal] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internal;

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternal(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cn("wb-collapse", isOpen && "is-open", className)} {...rest}>
      {typeof trigger === "function" ? (
        trigger({ open: isOpen, toggle })
      ) : (
        <button
          type="button"
          className="wb-btn wb-btn--ghost wb-btn--sm"
          aria-expanded={isOpen}
          onClick={toggle}
        >
          <span className="wb-ico wb-ico--sm wb-collapse__caret">expand_more</span>
          {trigger}
        </button>
      )}
      <div className="wb-collapse__panel">
        <div className="wb-collapse__inner">{children}</div>
      </div>
    </div>
  );
}
