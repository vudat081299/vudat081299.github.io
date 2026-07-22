import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Drawer / Offcanvas — the `.wb-drawer` panel from the web-builder DRAWER section
 * (§33): a panel that slides in from an edge over the shared `.wb-overlay` scrim.
 * The docs open/close it with the modal's `data-modal-open`/`-close` handlers; here
 * the behaviour mirrors Modal.tsx — Esc to close, backdrop click to close, body
 * scroll-lock, and focus moved to the first field on open.
 *
 * The source only ships left/right classes and couples the slide transform to
 * `.wb-overlay.is-open`. To make the panel actually animate (rather than snap in
 * from a `display:none` scrim) and to cover all four `side`s, the transform is
 * driven with an inline style toggled one frame after mount — an entrance slide
 * in, a matching slide out before unmount. Top/bottom get inline positioning
 * since the CSS has no class for them.
 */
export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  subtitle,
  children,
  footer,
  width,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Edge the panel slides in from. */
  side?: "left" | "right" | "top" | "bottom";
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Panel width for left/right drawers (px). */
  width?: number;
  className?: string;
}) {
  // `render` keeps the panel mounted through its slide-out; `entered` is the
  // on-screen state, flipped a frame after mount so the CSS transform transitions.
  const [render, setRender] = useState(open);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    // Unmount after the .24s slide (matches the .wb-drawer transition).
    const timer = window.setTimeout(() => setRender(false), 240);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Focus the first field on open only (see Modal.tsx — deliberately keyed to
  // `open` alone so re-renders never yank focus back mid-interaction).
  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      el?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  // Esc to close + body scroll-lock while open (mirror Modal.tsx).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!render) return null;

  const axis = side === "left" || side === "right" ? "X" : "Y";
  const offSign = side === "right" || side === "bottom" ? "100%" : "-100%";
  // Inline transform overrides the CSS (which would force translate(0) under an
  // open overlay), so we control the slide across all four sides.
  const transform = entered ? `translate${axis}(0)` : `translate${axis}(${offSign})`;

  // Top/bottom have no source class — position them inline (the CSS covers only
  // left/right). Width applies to the vertical (left/right) drawers.
  const sideStyle: CSSProperties =
    side === "top"
      ? {
          top: 0,
          bottom: "auto",
          left: 0,
          right: 0,
          width: "auto",
          height: "auto",
          maxHeight: "92vh",
          borderLeft: 0,
          borderBottom: "var(--wb-bw) solid var(--wb-border)",
        }
      : side === "bottom"
        ? {
            top: "auto",
            bottom: 0,
            left: 0,
            right: 0,
            width: "auto",
            height: "auto",
            maxHeight: "92vh",
            borderLeft: 0,
            borderTop: "var(--wb-bw) solid var(--wb-border)",
          }
        : width !== undefined
          ? { width }
          : {};

  return (
    <div
      className="wb-overlay is-open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={panelRef}
        className={cn("wb-drawer", side === "left" && "wb-drawer--left", className)}
        role="dialog"
        aria-modal="true"
        style={{ ...sideStyle, transform }}
      >
        {(title !== undefined || subtitle !== undefined) && (
          <div className="wb-drawer__head">
            <div>
              {title !== undefined && <h3 className="wb-drawer__title">{title}</h3>}
              {subtitle !== undefined && <p className="wb-drawer__sub">{subtitle}</p>}
            </div>
            <button className="wb-close" aria-label="Đóng" onClick={onClose} />
          </div>
        )}
        <div className="wb-drawer__body">{children}</div>
        {footer && <div className="wb-drawer__foot">{footer}</div>}
      </aside>
    </div>
  );
}
