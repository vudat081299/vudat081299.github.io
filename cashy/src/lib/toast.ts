/**
 * Toast store — a tiny standalone pub/sub. `toast.success()/.error()/…` push a
 * notification; the `<Toaster/>` component (components/wb/Toast) subscribes and
 * renders them. Kept out of the component file so that stays a component-only
 * export (Fast Refresh) while the `toast.*` call shape stays importable anywhere.
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
  /** Optional one-click reversal — what makes a low-risk action safe to perform
   *  immediately instead of gating it behind a confirmation dialog. */
  action?: ToastAction;
}

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

export function subscribeToasts(l: (items: ToastItem[]) => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getToasts(): ToastItem[] {
  return items;
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(tone: ToastTone, title: string, msg?: string, action?: ToastAction) {
  const id = nextId++;
  items = [...items, { id, tone, title, msg, action }];
  emit();
  window.setTimeout(() => dismissToast(id), action ? UNDO_DURATION : DURATION);
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
  dismiss: dismissToast,
};
