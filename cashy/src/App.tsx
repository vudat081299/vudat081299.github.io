import { useEffect, useState, lazy, Suspense } from "react";
import { useCashy, syncSubscriptions } from "@/lib/store";
import { applyTheme } from "@/lib/theme";
import { useRoute } from "@/lib/router";
import { Layout } from "@/components/Layout";
import { TransactionEditor } from "@/components/TransactionEditor";
import { TransactionDetail } from "@/components/TransactionDetail";
import { Toaster } from "@/components/wb/Toast";
import { ConfirmHost } from "@/components/wb/ConfirmDialog";
import { Onboarding } from "@/screens/Onboarding";
import { Dashboard } from "@/screens/Dashboard";
import { Transactions } from "@/screens/Transactions";
import { Subscriptions } from "@/screens/Subscriptions";
import { SubscriptionEditor } from "@/components/SubscriptionEditor";
import { Categories } from "@/screens/Categories";
import { Tags } from "@/screens/Tags";
import { Settings } from "@/screens/Settings";

// Dev-only component catalogue, code-split so it never ships in the production
// bundle (the DEV guard means the dynamic import is unreachable when built).
const WbGallery = lazy(() =>
  import("@/screens/WbGallery").then((m) => ({ default: m.WbGallery })),
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
