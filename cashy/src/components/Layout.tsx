import { useState, type CSSProperties, type ReactNode } from "react";
import { useCashy, setTheme } from "@/lib/store";
import { navigate, useRoute, type Route } from "@/lib/router";
import type { ThemeMode } from "@/types";
import { openTxEditor } from "@/components/TransactionEditor";

const NAV: { id: Route; label: string; icon: string }[] = [
  { id: "dashboard", label: "Tổng quan", icon: "dashboard" },
  { id: "transactions", label: "Giao dịch", icon: "swap_horiz" },
  { id: "subscriptions", label: "Đăng ký", icon: "autorenew" },
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

  return (
    <header className="wb-navbar" style={{ flex: "none" }}>
      <button
        type="button"
        onClick={onMenu}
        className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--round wb-btn--sm"
        aria-label="Ẩn/hiện menu"
        title="Ẩn/hiện menu"
      >
        <span className="wb-ico wb-ico--sm">menu</span>
      </button>

      <a
        className="cashy-logo"
        href="#/dashboard"
        aria-label="Cashy"
        onClick={(e) => {
          e.preventDefault();
          navigate("dashboard");
        }}
      >
        <span className="wb-ico">account_balance_wallet</span>
        Cashy
      </a>
      {workspace && (
        <span className="wb-cap wb-cap--sm cashy-hide-sm" style={{ marginLeft: 2 }}>
          {workspace.currency}
        </span>
      )}

      <span className="wb-navbar__spacer" />

      <div className="wb-navbar__actions">
        <button
          type="button"
          onClick={() => setTheme(THEME_NEXT[theme])}
          className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--round wb-btn--sm"
          aria-label={`Giao diện: ${THEME_META[theme].label}`}
          title={THEME_META[theme].label}
        >
          <span className="wb-ico wb-ico--sm">{THEME_META[theme].icon}</span>
        </button>
        <button
          type="button"
          className="wb-btn wb-btn--round wb-btn--sm"
          style={{ gap: 5 }}
          onClick={() => openTxEditor(null)}
        >
          <span className="wb-ico wb-ico--xs">add</span>
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
      <span className="cashy-navlabel">Điều hướng</span>
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
  const [railOpen, setRailOpen] = useState(true);

  // One ☰ button, two behaviours: collapse the fixed rail on desktop,
  // open the slide-over drawer on mobile.
  const toggleNav = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setRailOpen((open) => !open);
    } else {
      setMobileOpen(true);
    }
  };

  return (
    <div
      className="wb-stack"
      style={{ "--wb-stack-gap": "0px", height: "100dvh", overflow: "hidden" } as CSSProperties}
    >
      <Navbar onMenu={toggleNav} />

      <div
        className="wb-cluster wb-cluster--nowrap"
        style={{ gap: 0, alignItems: "stretch", flex: 1, minHeight: 0, overflow: "hidden" }}
      >
        {railOpen && (
          <aside className="cashy-show-md wb-scroll-y" style={{ flex: "none", width: 248 }}>
            <SidebarBody />
          </aside>
        )}

        {mobileOpen && (
          <div
            className="wb-overlay is-open"
            style={{ justifyContent: "flex-start", padding: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setMobileOpen(false);
            }}
          >
            <div style={{ height: "100%", width: 264, maxWidth: "80vw" }}>
              <SidebarBody onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <main className="wb-grow wb-scrollbars" style={{ minWidth: 0, overflowY: "auto" }}>
          <div className="wb-container" style={{ paddingBlock: 28 }}>
            {children}
          </div>
          <footer className="wb-footer wb-footer--slim">
            <div className="wb-footer__inner">
              <div className="wb-footer__bottom">
                <span className="wb-footer__copy">
                  © 2026 Cashy · Sổ chi tiêu cá nhân — dữ liệu chỉ lưu trên trình duyệt này
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
