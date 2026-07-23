import { useSyncExternalStore } from "react";

export type Route =
  | "dashboard"
  | "transactions"
  | "subscriptions"
  | "wallets"
  | "loans"
  | "contacts"
  | "categories"
  | "tags"
  | "settings";

const ROUTES: Route[] = [
  "dashboard",
  "transactions",
  "subscriptions",
  "wallets",
  "loans",
  "contacts",
  "categories",
  "tags",
  "settings",
];

function current(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  return (ROUTES.includes(h as Route) ? h : "dashboard") as Route;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, current, current);
}

export function navigate(r: Route): void {
  location.hash = "/" + r;
}
