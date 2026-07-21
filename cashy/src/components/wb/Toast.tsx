import { useEffect, useState } from "react";

/**
 * Toast — web-builder `wb-toast` look, driven by a tiny standalone store.
 * Replaces sonner. Keeps the `toast.success()/.error()/...` call shape so call
 * sites don't change. Mount <Toaster/> once near the app root.
 */

export type ToastTone = "neutral" | "success" | "danger" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  msg?: string;
  /** Optional one-click reversal. This is what makes a low-risk action safe to
   *  perform immediately instead of gating it behind a confirmation dialog. */
  action?: ToastAction;
}

// Material Symbols glyph per tone (rendered inside .wb-toast__icon).
const TONE_ICON: Record<ToastTone, string> = {
  neutral: "info",
  success: "check",
  danger: "close",
  warning: "warning",
  info: "info",
};

const DURATION = 4000;
/** An undo needs longer on screen — it is the only window the user gets. */
const UNDO_DURATION = 9000;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  const snapshot = items.slice();
  listeners.forEach((l) => l(snapshot));
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(tone: ToastTone, title: string, msg?: string, action?: ToastAction) {
  const id = nextId++;
  items = [...items, { id, tone, title, msg, action }];
  emit();
  window.setTimeout(() => dismiss(id), action ? UNDO_DURATION : DURATION);
  return id;
}

export const toast = {
  success: (title: string, msg?: string) => push("success", title, msg),
  error: (title: string, msg?: string) => push("danger", title, msg),
  warning: (title: string, msg?: string) => push("warning", title, msg),
  info: (title: string, msg?: string) => push("info", title, msg),
  message: (title: string, msg?: string) => push("neutral", title, msg),
  /** A toast carrying a reversal, e.g. `toast.undo("Resumed", undoFn)`. */
  undo: (title: string, onUndo: () => void, msg?: string) =>
    push("neutral", title, msg, { label: "Undo", onClick: onUndo }),
  dismiss,
};

type Position = "top-center" | "bottom-right";

export function Toaster({ position = "top-center" }: { position?: Position }) {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.add(setList);
    setList(items.slice());
    return () => {
      listeners.delete(setList);
    };
  }, []);

  // .wb-toaster defaults to bottom-right; re-anchor for top-center.
  const posStyle: React.CSSProperties =
    position === "top-center"
      ? {
          top: 20,
          bottom: "auto",
          left: "50%",
          right: "auto",
          transform: "translateX(-50%)",
          alignItems: "center",
        }
      : {};

  return (
    <div className="wb-toaster" style={posStyle}>
      {list.map((t) => (
        <div
          key={t.id}
          className={t.tone === "neutral" ? "wb-toast" : `wb-toast wb-toast--${t.tone}`}
          role="status"
        >
          <span className="wb-toast__icon">
            <span className="wb-ico wb-ico--xs">{TONE_ICON[t.tone]}</span>
          </span>
          <div className="wb-toast__body">
            <p className="wb-toast__title">{t.title}</p>
            {t.msg && <p className="wb-toast__msg">{t.msg}</p>}
          </div>
          {t.action && (
            <button
              type="button"
              className="wb-btn wb-btn--ghost wb-btn--sm"
              style={{ flex: "none" }}
              onClick={() => {
                t.action?.onClick();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            className="wb-close"
            aria-label="Đóng"
            onClick={() => dismiss(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
