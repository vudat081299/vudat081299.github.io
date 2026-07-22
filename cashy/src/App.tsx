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
import { Categories } from "@/ui/features/categories/Categories";
import { Tags } from "@/ui/features/tags/Tags";
import { Settings } from "@/ui/features/settings/Settings";

// Dev-only component catalogue, code-split so it never ships in the production
// bundle (the DEV guard means the dynamic import is unreachable when built).
const WbGallery = lazy(() =>
  import("@/ui/dev/WbGallery").then((m) => ({ default: m.WbGallery })),
);

function useIsWbGallery() {
  const [on, setOn] = useState(
    () => import.meta.env.DEV && location.hash.replace(/^#\/?/, "") === "wb",
  );
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const check = () => setOn(location.hash.replace(/^#\/?/, "") === "wb");
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  return on;
}

export default function App() {
  const { workspace, theme } = useCashy();
  const route = useRoute();
  const isWbGallery = useIsWbGallery();

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
