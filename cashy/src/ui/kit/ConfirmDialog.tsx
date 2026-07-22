import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { getConfirm, settleConfirm, subscribeConfirm } from "@/lib/confirm";

/**
 * Host for the imperative `confirm()` dialog — mount once near the app root. It
 * renders the wb-modal look on demand and resolves the pending promise.
 *
 * Portalled to <body> at a z-index above the editor modals (100) and toaster
 * (120), so a delete-confirm opened FROM an editor sits on top of it. Esc is
 * caught in the CAPTURE phase and stopped, so it dismisses only the confirm and
 * never the modal hosting it — the same trick the Popover uses when nested.
 */
export function ConfirmHost() {
  const req = useSyncExternalStore(subscribeConfirm, getConfirm, getConfirm);
  const okRef = useRef<HTMLButtonElement>(null);
  const id = req?.id;

  useEffect(() => {
    if (id == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        settleConfirm(id, false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the confirm action so Enter accepts — matching the native dialog.
    const focusTimer = window.setTimeout(() => okRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [id]);

  if (!req) return null;

  return createPortal(
    <div
      className="wb-overlay is-open"
      style={{ zIndex: 150 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) settleConfirm(req.id, false);
      }}
    >
      <div className="wb-modal" role="alertdialog" aria-modal="true" style={{ maxWidth: 400 }}>
        <div className="wb-modal__body">
          <h2 className="wb-modal__title" style={{ marginBottom: req.message ? 8 : 0 }}>
            {req.title}
          </h2>
          {req.message && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--wb-fg-muted)" }}>
              {req.message}
            </p>
          )}
        </div>
        <div className="wb-modal__foot">
          <button
            type="button"
            className="wb-btn wb-btn--secondary"
            onClick={() => settleConfirm(req.id, false)}
          >
            {req.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={okRef}
            type="button"
            className={req.danger ? "wb-btn wb-btn--danger" : "wb-btn"}
            onClick={() => settleConfirm(req.id, true)}
          >
            {req.confirmLabel ?? "OK"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
