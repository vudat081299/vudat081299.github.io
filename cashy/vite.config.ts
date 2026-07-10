import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev serves at root; the production build is deployed under /cashy/ on
// GitHub Pages (https://<user>.github.io/cashy/).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/cashy/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
