import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Gap between the trigger and the panel, and the margin kept off the viewport. */
const GAP = 8;
const EDGE = 8;

/**
 * Popover — click-toggled wb-popover panel with the behaviour Radix used to
 * provide: outside-click + Esc to dismiss.
 *
 * The panel is PORTALLED to `document.body` and positioned `fixed` against the
 * trigger's rect, rather than absolutely inside the trigger's own box. Why: an
 * absolutely-positioned panel is clipped by any ancestor that scrolls or hides
 * overflow, and this app puts popovers inside exactly those — the modal body
 * scrolls, and `.wb-card` hides overflow — so a date or time picker near the
 * bottom of a dialog lost its last rows to the clip. Portalling also means the
 * panel can flip above the trigger when there isn't room below, and shift back
 * inside the viewport instead of running off the right edge.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const anchor = ref.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;

    // Below by default; flip above when the panel would run off the bottom and
    // there is more room up there. Then clamp so it never leaves the viewport.
    const below = a.bottom + GAP;
    const above = a.top - GAP - h;
    const fitsBelow = below + h <= window.innerHeight - EDGE;
    let top = fitsBelow || above < EDGE ? below : above;
    top = Math.max(EDGE, Math.min(top, window.innerHeight - EDGE - h));

    let left = align === "right" ? a.right - w : a.left;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - EDGE - w));

    setPos({ top, left });
  }, [align]);

  // Measure after the panel is in the DOM but before paint, so it never renders
  // at a stale position for a frame.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // The panel is no longer a DOM descendant of the trigger, so an outside
      // click has to be tested against BOTH boxes.
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase + stop so Escape closes only the popover, not a modal
        // hosting it (both listen on document; the modal registered first).
        e.stopPropagation();
        setOpen(false);
      }
    };
    // A fixed panel does not travel with its anchor, so follow scroll/resize.
    // Capture so it also fires for scrolls inside the modal body, not just the page.
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <span
      ref={ref}
      className={open ? "wb-popover is-open" : "wb-popover"}
      style={{ display: inline ? "inline-block" : "block" }}
    >
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="wb-popover__panel"
            style={{
              position: "fixed",
              // Off-screen until measured, so the first frame can't flash at 0,0.
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              right: "auto",
              bottom: "auto",
              transform: "none",
              display: "block",
              width: panelWidth,
              // The stylesheet caps `.wb-popover__panel` at max-width: 280px —
              // sized for the tooltip-ish popovers the docs ship. Without lifting
              // it here, any panelWidth above 280 is silently ignored and the
              // caller gets a cramped panel it never asked for (which is exactly
              // what squashed the period picker's preset labels into two lines).
              maxWidth: panelWidth,
              padding: 6,
              // Above the modal overlay it may be opened from.
              zIndex: 1000,
            }}
          >
            {typeof children === "function"
              ? children({ close: () => setOpen(false) })
              : children}
          </div>,
          document.body,
        )}
    </span>
  );
}
