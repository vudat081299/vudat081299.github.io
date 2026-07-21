import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal — web-builder wb-overlay + wb-modal look with the behaviour Radix used
 * to provide, hand-rolled (no shadcn): Esc to close, click-outside (backdrop)
 * to close, body scroll-lock, and focus moved to the first field on open.
 * Rendered at the app root, so fixed positioning needs no portal.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 460,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the first field — but ONLY when the modal opens. This deliberately
  // depends on `open` alone: callers pass a fresh `onClose` (and children re-render
  // on every keystroke), so folding this into the Esc/scroll effect below would
  // re-run it on each render and yank focus back to the first field mid-typing.
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

  // Esc to close + body scroll-lock. Safe to re-bind on an `onClose` change: it
  // only re-attaches a listener and re-sets overflow — it never moves focus.
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

  if (!open) return null;

  return (
    <div
      className="wb-overlay is-open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="wb-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth, maxHeight: "92vh", overflowY: "auto" }}
      >
        {title !== undefined && (
          <div className="wb-modal__head">
            <div>
              <h2 className="wb-modal__title">{title}</h2>
            </div>
            <button className="wb-close" aria-label="Đóng" onClick={onClose} />
          </div>
        )}
        <div className="wb-modal__body">{children}</div>
        {footer && <div className="wb-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
