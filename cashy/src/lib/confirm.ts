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
  /** a Material Symbols glyph shown in a badge beside the title (e.g. "delete") */
  icon?: string;
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

/**
 * The shared "delete X?" prompt — the one component every destructive action in
 * the app funnels through, so deletes look and read the same everywhere: a trash
 * badge, a red **Delete** action, and dismiss-to-cancel. Pass a `title` (and an
 * optional `message`); override `confirmLabel` only for the odd wording ("Delete
 * & start over"). Resolves `true` when confirmed.
 */
export function confirmDelete(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<boolean> {
  return confirm({ danger: true, icon: "delete", confirmLabel: "Delete", ...opts });
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
