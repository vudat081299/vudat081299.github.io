import { useEffect, useState } from "react";
import {
  dismissToast,
  getToasts,
  subscribeToasts,
  type ToastItem,
  type ToastTone,
} from "@/lib/toast";

/**
 * Toaster — the web-builder `wb-toast` look, driven by the standalone toast store
 * (see lib/toast). Mount <Toaster/> once near the app root. The `toast.*` call
 * shape lives in lib/toast so call sites import it without pulling in this view.
 */

// Material Symbols glyph per tone (rendered inside .wb-toast__icon).
const TONE_ICON: Record<ToastTone, string> = {
  neutral: "info",
  success: "check",
  danger: "close",
  warning: "warning",
  info: "info",
};

type Position = "top-center" | "bottom-right";

export function Toaster({ position = "top-center" }: { position?: Position }) {
  const [list, setList] = useState<ToastItem[]>(getToasts());

  useEffect(() => {
    const unsubscribe = subscribeToasts(setList);
    setList(getToasts().slice());
    return unsubscribe;
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
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            className="wb-close"
            aria-label="Đóng"
            onClick={() => dismissToast(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
