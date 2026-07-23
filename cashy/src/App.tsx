import { useEffect, useState, lazy, Suspense } from "react";
import { useCashy } from "@/data/store";
import { syncSubscriptions } from "@/usecases";
import { applyTheme } from "@/lib/theme";
import { useRoute } from "@/lib/router";
import { Layout } from "@/ui/app/Layout";
import { TransactionEditor } from "@/ui/features/transactions/TransactionEditor";
import { TransactionDetail } from "@/ui/features/transactions/TransactionDetail";
import { Toaster } from "@/ui/kit/Toast";
import { ConfirmHost } from "@/ui/kit/ConfirmDialog";
import { Onboarding } from "@/ui/features/onboarding/Onboarding";
import { Dashboard } from "@/ui/features/dashboard/Dashboard";
import { Transactions } from "@/ui/features/transactions/Transactions";
import { Subscriptions } from "@/ui/features/subscriptions/Subscriptions";
import { SubscriptionEditor } from "@/ui/features/subscriptions/SubscriptionEditor";
import { Wallets } from "@/ui/features/wallets/Wallets";
import { Loans } from "@/ui/features/loans/Loans";
import { Contacts } from "@/ui/features/contacts/Contacts";
import { Categories } from "@/ui/features/categories/Categories";
import { Tags } from "@/ui/features/tags/Tags";
import { Settings } from "@/ui/features/settings/Settings";

// Dev-only component catalogues, code-split so they never ship in the production
// bundle (the DEV guard means the dynamic import is unreachable when built).
// `#/wb` = the generic wb-* primitives; `#/cashy` = the Cashy-specific layer.
const WbGallery = lazy(() =>
  import("@/ui/dev/WbGallery").then((m) => ({ default: m.WbGallery })),
);
const CashyGallery = lazy(() =>
  import("@/ui/dev/CashyGallery").then((m) => ({ default: m.CashyGallery })),
);

/** True when the hash is `#/<slug>` and we are in a DEV build. Powers the two
 *  code-split gallery routes; production can never flip these on, so Rollup
 *  tree-shakes both galleries out of `dist/`. */
function useIsDevRoute(slug: string) {
  const [on, setOn] = useState(
    () => import.meta.env.DEV && location.hash.replace(/^#\/?/, "") === slug,
  );
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const check = () => setOn(location.hash.replace(/^#\/?/, "") === slug);
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [slug]);
  return on;
}

export default function App() {
  const { workspace, theme } = useCashy();
  const route = useRoute();
  const isWbGallery = useIsDevRoute("wb");
  const isCashyGallery = useIsDevRoute("cashy");

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Materialise any newly-due subscription charges as "pending" rows on load.
  useEffect(() => {
    if (workspace) syncSubscriptions();
  }, [workspace]);

  if (isWbGallery) {
    return (
      <Suspense fallback={null}>
        <WbGallery />
      </Suspense>
    );
  }

  if (isCashyGallery) {
    return (
      <Suspense fallback={null}>
        <CashyGallery />
      </Suspense>
    );
  }

  if (!workspace) {
    return (
      <>
        <Onboarding />
        <Toaster position="top-center" />
      </>
    );
  }

  const screen =
    route === "transactions" ? (
      <Transactions />
    ) : route === "subscriptions" ? (
      <Subscriptions />
    ) : route === "wallets" ? (
      <Wallets />
    ) : route === "loans" ? (
      <Loans />
    ) : route === "contacts" ? (
      <Contacts />
    ) : route === "categories" ? (
      <Categories />
    ) : route === "tags" ? (
      <Tags />
    ) : route === "settings" ? (
      <Settings />
    ) : (
      <Dashboard />
    );

  return (
    <>
      <Layout>{screen}</Layout>
      <TransactionDetail />
      <TransactionEditor />
      <SubscriptionEditor />
      <Toaster position="top-center" />
      <ConfirmHost />
    </>
  );
}
