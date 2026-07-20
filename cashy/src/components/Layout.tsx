import { useState, type CSSProperties, type ReactNode } from "react";
import { useCashy, setTheme } from "@/lib/store";
import { navigate, useRoute, type Route } from "@/lib/router";
import type { ThemeMode } from "@/types";
import { openTxEditor } from "@/components/TransactionEditor";

const NAV: { id: Route; label: string; icon: string }[] = [
  { id: "dashboard", label: "Tổng quan", icon: "dashboard" },
  { id: "transactions", label: "Giao dịch", icon: "swap_horiz" },
  { id: "categories", label: "Danh mục", icon: "account_tree" },
  { id: "tags", label: "Nhãn", icon: "sell" },
  { id: "settings", label: "Cài đặt", icon: "settings" },
];

const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};
const THEME_META: Record<ThemeMode, { icon: string; label: string }> = {
  system: { icon: "computer", label: "Theo hệ thống" },
  light: { icon: "light_mode", label: "Nền sáng" },
  dark: { icon: "dark_mode", label: "Nền tối" },
};

function Navbar({ onMenu }: { onMenu: () => void }) {
  const { workspace, theme } = useCashy();
  const initial = (workspace?.displayName ?? "C").slice(0, 1).toUpperCase();

  return (
    <header className="wb-navbar" style={{ flex: "none" }}>
      <span className="cashy-hide-md">
        <button
          type="button"
          onClick={onMenu}
          className="wb-btn wb-btn--ghost wb-btn--icon"
          aria-label="Mở menu"
        >
          <span className="wb-ico">menu</span>
        </button>
      </span>

      <a className="wb-navbar__brand" href="/" aria-label="Cashy">
        <span className="wb-navbar__mark">{initial}</span>
        <span>{workspace?.displayName ?? "Cashy"}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--wb-fg-subtle)" }}>
          {workspace?.currency ?? "VND"}
        </span>
      </a>

      <span className="wb-navbar__spacer" />

      <div className="wb-navbar__actions">
        <button
          type="button"
          onClick={() => setTheme(THEME_NEXT[theme])}
          className="wb-btn wb-btn--ghost wb-btn--icon"
          aria-label={`Giao diện: ${THEME_META[theme].label}`}
          title={THEME_META[theme].label}
        >
          <span className="wb-ico">{THEME_META[theme].icon}</span>
        </button>
        <button type="button" className="wb-btn" style={{ gap: 6 }} onClick={() => openTxEditor(null)}>
          <span className="wb-ico wb-ico--sm">add</span>
          <span className="cashy-show-sm">Thêm giao dịch</span>
          <span className="cashy-hide-sm">Thêm</span>
        </button>
      </div>
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
    <nav className="wb-sidenav" style={{ width: "100%", height: "100%" }}>
      {NAV.map((item) => {
        const active = route === item.id;
        const count = counts[item.id];
        return (
          <a
            key={item.id}
            role="button"
            tabIndex={0}
            className={active ? "wb-sidenav__link is-active" : "wb-sidenav__link"}
            onClick={() => {
              navigate(item.id);
              onNavigate?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(item.id);
                onNavigate?.();
              }
            }}
          >
            <span className="wb-ico">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {count ? <span className="wb-sidenav__badge">{count}</span> : null}
          </a>
        );
      })}
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="wb-stack"
      style={{ "--wb-stack-gap": "0px", height: "100dvh", overflow: "hidden" } as CSSProperties}
    >
      <Navbar onMenu={() => setMobileOpen(true)} />

      <div
        className="wb-cluster wb-cluster--nowrap"
        style={{ gap: 0, alignItems: "stretch", flex: 1, minHeight: 0, overflow: "hidden" }}
      >
        <aside className="cashy-show-md" style={{ flex: "none" }}>
          <SidebarBody />
        </aside>

        {mobileOpen && (
          <div
            className="wb-overlay is-open"
            style={{ justifyContent: "flex-start", padding: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setMobileOpen(false);
            }}
          >
            <div style={{ height: "100%", width: 260, maxWidth: "80vw" }}>
              <SidebarBody onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main className="wb-grow" style={{ minWidth: 0, overflowY: "auto" }}>
          <div className="wb-container" style={{ paddingBlock: 24 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
