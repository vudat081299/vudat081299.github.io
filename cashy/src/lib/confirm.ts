/**
 * A tiny imperative `confirm()` that resolves a Promise, replacing the browser's
 * `window.confirm` with an in-app dialog that follows the design system. Call
 * `confirm({...})` from anywhere and `await` the boolean; mount one `<ConfirmHost/>`
 * (see components/wb/ConfirmDialog) near the app root to render it.
 *
 * Kept as a plain module (store + `confirm`) so the host file stays a
 * component-only export and Fast Refresh keeps working.
 */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** style the confirm button as destructive */
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

let current: ConfirmRequest | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeConfirm(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getConfirm(): ConfirmRequest | null {
  return current;
}

/** Ask the user to confirm. Resolves `true` on confirm, `false` on cancel/dismiss. */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  // Only one at a time — settle any in-flight request as cancelled first.
  if (current) current.resolve(false);
  return new Promise<boolean>((resolve) => {
    current = { ...opts, id: nextId++, resolve };
    emit();
  });
}

export function settleConfirm(id: number, ok: boolean): void {
  if (!current || current.id !== id) return;
  const { resolve } = current;
  current = null;
  emit();
  resolve(ok);
}
