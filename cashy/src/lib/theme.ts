import type { ThemeMode } from "@/types";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute("data-theme", resolved);
  // web-builder themes off a `.dark` class on the root — keep it in sync so its
  // wb-* components follow Cashy's existing [data-theme] toggle.
  document.documentElement.classList.toggle("dark", resolved === "dark");
}
