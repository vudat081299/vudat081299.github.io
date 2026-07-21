import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Popover — click-toggled wb-popover panel with the behaviour Radix used to
 * provide: outside-click + Esc to dismiss. Panel drops below the trigger and
 * left-aligns (overriding wb-popover's default above/centre placement).
 */
export function Popover({
  trigger,
  children,
  panelWidth,
  align = "left",
  inline = false,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  /** Static content, or a render fn that receives `close` (e.g. close after a pick). */
  children: ReactNode | ((props: { close: () => void }) => ReactNode);
  panelWidth?: number;
  /** Which edge the panel lines up with — `right` for triggers near the page edge. */
  align?: "left" | "right";
  /** Sit inline (a chip/capsule trigger) instead of the default full-width block. */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase + stop so Escape closes only the popover, not a modal
        // hosting it (both listen on document; the modal registered first).
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={open ? "wb-popover is-open" : "wb-popover"}
      style={{ display: inline ? "inline-block" : "block" }}
    >
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <div
        className="wb-popover__panel"
        style={{
          top: "calc(100% + 8px)",
          bottom: "auto",
          left: align === "left" ? 0 : "auto",
          right: align === "right" ? 0 : "auto",
          transform: "none",
          width: panelWidth,
          padding: 6,
        }}
      >
        {typeof children === "function"
          ? children({ close: () => setOpen(false) })
          : children}
      </div>
    </span>
  );
}
