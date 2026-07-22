import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Standalone build of the web-builder component gallery. Published as its own
// static page at /cashy-wb/ on GitHub Pages, entirely separate from the Cashy
// app (/cashy/) — its own base, its own entry (wb.html → src/wb-main.tsx), its
// own output dir. The main vite.config.ts is untouched.
export default defineConfig({
  base: "/cashy-wb/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-wb",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "wb.html"),
    },
  },
});
