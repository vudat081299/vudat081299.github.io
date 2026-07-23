import { useState, type CSSProperties, type ReactNode } from "react";
import { useCashy } from "@/data/store";
import { setTheme } from "@/usecases";
import { useTxDraft } from "@/data/draft";
import { navigate, useRoute, type Route } from "@/lib/router";
import type { ThemeMode } from "@/domain/types";
import { openTxEditor } from "@/lib/modals";

const NAV: { id: Route; label: string; icon: string }[] = [
  { id: "dashboard", label: "Overview", icon: "dashboard" },
  { id: "transactions", label: "Transactions", icon: "swap_horiz" },
  { id: "subscriptions", label: "Subscriptions", icon: "autorenew" },
  { id: "wallets", label: "Wallets", icon: "account_balance_wallet" },
  { id: "loans", label: "Loans", icon: "handshake" },
  { id: "categories", label: "Categories", icon: "account_tree" },
  { id: "tags", label: "Tags", icon: "sell" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const THEME_NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};
// Glyphs + labels mirror the web-builder docs theme switch exactly: a moon/sun/
// half-disc pill that cycles Tự động → Sáng → Tối, not an icon-only button.
const THEME_META: Record<ThemeMode, { icon: string; label: string }> = {
  system: { icon: "◐", label: "Auto" },
  // Emoji sun (VS16) for the light state, per the docs — a colour glyph, not the
  // monochrome ☀ outline the plain codepoint renders as.
  light: { icon: "☀️", label: "Light" },
  dark: { icon: "☾", label: "Dark" },
};

/** "Dat Vu" → "DV", "Dat" → "D". Two letters at most; the avatar is 28px wide. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function Navbar({ onMenu }: { onMenu: () => void }) {
  const { workspace, theme } = useCashy();
  // An unconfirmed transaction is parked → the add button says so (dashed = §9
  // "chưa chốt") instead of pretending nothing is outstanding.
  const draft = useTxDraft();

  return (
    <header className="wb-navbar" style={{ flex: "none" }}>
      <button
        type="button"
        onClick={onMenu}
        className="wb-btn wb-btn--ghost wb-btn--icon wb-btn--round wb-btn--sm"
        aria-label="Toggle menu"
        title="Toggle menu"
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
        <span className="cashy-logo__mark" aria-hidden="true">$</span>
        Cashy
      </a>

      {/* Which account am I in? Initials + name + currency, one neutral chip. */}
      {workspace && (
        <span className="cashy-account cashy-hide-sm">
          <span className="wb-avatar wb-avatar--sm">{initialsOf(workspace.displayName)}</span>
          <span className="cashy-account__name">{workspace.displayName}</span>
          <span className="cashy-account__cur">{workspace.currency}</span>
        </span>
      )}

      <span className="wb-navbar__spacer" />

      <div className="wb-navbar__actions">
        <button
          type="button"
          className={
            draft
              ? "wb-btn wb-btn--round wb-btn--sm cashy-btn--draft"
              : "wb-btn wb-btn--round wb-btn--sm"
          }
          style={{ gap: 5 }}
          title={draft ? "You have an unfinished transaction — pick it up" : undefined}
          onClick={() => openTxEditor(null)}
        >
          <span className="wb-ico wb-ico--xs">{draft ? "edit_note" : "add"}</span>
          <span className="cashy-show-sm">{draft ? "Finish draft" : "Add transaction"}</span>
          <span className="cashy-hide-sm">{draft ? "Draft" : "Add"}</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme(THEME_NEXT[theme])}
          className="theme-btn"
          title="Theme: Auto → Light → Dark"
          aria-label="Change theme"
        >
          <span aria-hidden="true">{THEME_META[theme].icon}</span>
          <span className="cashy-show-sm">{THEME_META[theme].label}</span>
        </button>
      </div>
    </header>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { transactions, categories, tags, wallets, loans } = useCashy();
  const route = useRoute();
  const counts: Partial<Record<Route, number>> = {
    transactions: transactions.length,
    wallets: wallets.length,
    loans: loans.filter((l) => !l.archived).length,
    categories: categories.length,
    tags: tags.length,
  };

  return (
    <nav className="wb-sidenav" style={{ width: "100%", height: "100%" }}>
      <span className="cashy-navlabel">Navigation</span>
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
                  © 2026 Cashy · Personal spending ledger — data never leaves this browser
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
