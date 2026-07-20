import { useEffect, useState } from "react";

/**
 * Toast — web-builder `wb-toast` look, driven by a tiny standalone store.
 * Replaces sonner. Keeps the `toast.success()/.error()/...` call shape so call
 * sites don't change. Mount <Toaster/> once near the app root.
 */

export type ToastTone = "neutral" | "success" | "danger" | "warning" | "info";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  msg?: string;
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

function push(tone: ToastTone, title: string, msg?: string) {
  const id = nextId++;
  items = [...items, { id, tone, title, msg }];
  emit();
  window.setTimeout(() => dismiss(id), DURATION);
  return id;
}

export const toast = {
  success: (title: string, msg?: string) => push("success", title, msg),
  error: (title: string, msg?: string) => push("danger", title, msg),
  warning: (title: string, msg?: string) => push("warning", title, msg),
  info: (title: string, msg?: string) => push("info", title, msg),
  message: (title: string, msg?: string) => push("neutral", title, msg),
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
