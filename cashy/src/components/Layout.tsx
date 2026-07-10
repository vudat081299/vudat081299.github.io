import { useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  FolderTree,
  LayoutDashboard,
  Menu,
  Monitor,
  Moon,
  Plus,
  Settings as SettingsIcon,
  Sun,
  Tags as TagsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCashy, setTheme } from "@/lib/store";
import { navigate, useRoute, type Route } from "@/lib/router";
import type { ThemeMode } from "@/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { openTxEditor } from "@/components/TransactionEditor";

const NAV: { id: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "transactions", label: "Giao dịch", icon: ArrowLeftRight },
  { id: "categories", label: "Danh mục", icon: FolderTree },
  { id: "tags", label: "Nhãn", icon: TagsIcon },
  { id: "settings", label: "Cài đặt", icon: SettingsIcon },
];

const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};
const THEME_META: Record<ThemeMode, { icon: typeof Sun; label: string }> = {
  system: { icon: Monitor, label: "Theo hệ thống" },
  light: { icon: Sun, label: "Nền sáng" },
  dark: { icon: Moon, label: "Nền tối" },
};

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { workspace, transactions, categories, tags, theme } = useCashy();
  const route = useRoute();
  const counts: Partial<Record<Route, number>> = {
    transactions: transactions.length,
    categories: categories.length,
    tags: tags.length,
  };
  const ThemeIcon = THEME_META[theme].icon;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 p-3">
        <div
          className="grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold text-white"
          style={{ background: workspace?.avatarColor ?? "#2383e2" }}
        >
          {(workspace?.displayName ?? "C").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">
            {workspace?.displayName ?? "Cashy"}
          </div>
          <div className="text-xs text-muted-foreground">
            {workspace?.currency ?? "VND"}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map((item) => {
          const active = route === item.id;
          const count = counts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                navigate(item.id);
                onNavigate?.();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <item.icon size={16} className="shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {count ? (
                <span className="font-mono text-[11px] text-muted-foreground tnum">
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="p-2">
        <button
          type="button"
          onClick={() => setTheme(THEME_NEXT[theme])}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ThemeIcon size={16} />
          <span>{THEME_META[theme].label}</span>
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const route = useRoute();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = NAV.find((n) => n.id === route)?.label ?? "Cashy";

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-60 shrink-0 border-r bg-muted/30 md:block">
        <SidebarBody />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarBody onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={18} />
          </Button>
          <h1 className="text-sm font-medium tracking-tight">{title}</h1>
          <div className="flex-1" />
          <Button size="sm" className="gap-1.5" onClick={() => openTxEditor(null)}>
            <Plus size={15} />
            <span className="hidden sm:inline">Thêm giao dịch</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
