import { useEffect } from "react";
import { useCashy } from "@/lib/store";
import { applyTheme } from "@/lib/theme";
import { useRoute } from "@/lib/router";
import { Layout } from "@/components/Layout";
import { TransactionEditor } from "@/components/TransactionEditor";
import { Toaster } from "@/components/ui/sonner";
import { Onboarding } from "@/screens/Onboarding";
import { Dashboard } from "@/screens/Dashboard";
import { Transactions } from "@/screens/Transactions";
import { Categories } from "@/screens/Categories";
import { Tags } from "@/screens/Tags";
import { Settings } from "@/screens/Settings";

export default function App() {
  const { workspace, theme } = useCashy();
  const route = useRoute();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

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
      <TransactionEditor />
      <Toaster position="top-center" />
    </>
  );
}
