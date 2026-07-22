/**
 * A tiny imperative bus for the app's singleton modals. The `open*` functions are
 * safe to import and call from anywhere; each editor registers its handler on
 * mount (and clears it on unmount). Kept in a plain module — not the component
 * files — so those export only their component and Fast Refresh keeps working.
 */
type Handler<T> = (arg: T) => void;

let txEditorFn: Handler<string | null> | null = null;
let txDetailFn: Handler<string> | null = null;
let subEditorFn: Handler<string | null> | null = null;

export function registerTxEditor(fn: Handler<string | null> | null) {
  txEditorFn = fn;
}
export function registerTxDetail(fn: Handler<string> | null) {
  txDetailFn = fn;
}
export function registerSubscriptionEditor(fn: Handler<string | null> | null) {
  subEditorFn = fn;
}

/** Open the transaction editor from anywhere. Pass an id to edit, or null to add. */
export function openTxEditor(id: string | null = null) {
  txEditorFn?.(id);
}
/** Open the receipt-style detail view for a transaction, from anywhere. */
export function openTxDetail(id: string) {
  txDetailFn?.(id);
}
/** Open the subscription editor from anywhere. Pass an id to edit, or null to add. */
export function openSubscriptionEditor(id: string | null = null) {
  subEditorFn?.(id);
}
