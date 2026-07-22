import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/web-builder.css";
import "./styles/wb-theme.css";
import { WbGallery } from "./screens/WbGallery";
import { ErrorBoundary } from "./components/ErrorBoundary";

/**
 * Standalone entry for the web-builder component gallery, published as its own
 * static page at /cashy-wb/ — separate from the Cashy app. No store, no router:
 * just the catalogue, plus a light/dark toggle so the kit can be eyeballed in
 * both themes (web-builder reads a `.dark` class + [data-theme] on the root).
 */
function applyTheme(dark: boolean) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", dark);
}

function Root() {
  const [dark, setDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => applyTheme(dark), [dark]);

  return (
    <>
      <button
        type="button"
        className="wb-btn wb-btn--secondary wb-btn--sm wb-btn--round"
        style={{ position: "fixed", top: 16, right: 16, zIndex: 50, gap: 6 }}
        onClick={() => setDark((d) => !d)}
      >
        <span className="wb-ico wb-ico--sm">{dark ? "light_mode" : "dark_mode"}</span>
        {dark ? "Sáng" : "Tối"}
      </button>
      <WbGallery />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
