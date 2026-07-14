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

/* Dark top navbar — mirrors the site launcher (Bootstrap "Dashboard" shell):
   brand on the left, theme toggle + primary action on the right. */
function Navbar({ onMenu }: { onMenu: () => void }) {
  const { workspace, theme } = useCashy();
  const ThemeIcon = THEME_META[theme].icon;
  const initial = (workspace?.displayName ?? "C").slice(0, 1).toUpperCase();

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-white/5 bg-navbar px-3 text-navbar-foreground shadow-sm md:px-4">
      <button
        type="button"
        onClick={onMenu}
        className="grid size-9 place-items-center rounded-md text-navbar-foreground/80 transition-colors hover:bg-white/10 hover:text-navbar-foreground md:hidden"
        aria-label="Mở menu"
      >
        <Menu size={18} />
      </button>

      <a
        href="/"
        className="flex items-center gap-2.5 rounded-md py-1 pr-2 no-underline"
        aria-label="Cashy"
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-md text-[13px] font-semibold text-white"
          style={{ background: workspace?.avatarColor ?? "#2383e2" }}
        >
          {initial}
        </span>
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="text-sm font-semibold text-navbar-foreground">
            {workspace?.displayName ?? "Cashy"}
          </span>
          <span className="hidden text-xs text-navbar-foreground/50 sm:inline">
            {workspace?.currency ?? "VND"}
          </span>
        </span>
      </a>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setTheme(THEME_NEXT[theme])}
        className="grid size-9 place-items-center rounded-md text-navbar-foreground/80 transition-colors hover:bg-white/10 hover:text-navbar-foreground"
        aria-label={`Giao diện: ${THEME_META[theme].label}`}
        title={THEME_META[theme].label}
      >
        <ThemeIcon size={17} />
      </button>

      <Button
        size="sm"
        className="gap-1.5 bg-white text-neutral-900 hover:bg-white/90"
        onClick={() => openTxEditor(null)}
      >
        <Plus size={15} />
        <span className="hidden sm:inline">Thêm giao dịch</span>
        <span className="sm:hidden">Thêm</span>
      </Button>
    </header>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { transactions, categories, tags } = useCashy();
  const route = useRoute();
  const counts: Partial<Record<Route, number>> = {
    transactions: transactions.length,
    categories: categories.length,
    tags: tags.length,
  };

  return (
    <nav className="flex h-full flex-col gap-0.5 p-2 pt-3">
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
              <span className="text-[11px] text-muted-foreground tnum">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Navbar onMenu={() => setMobileOpen(true)} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 border-r bg-muted/30 md:block">
          <SidebarBody />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
