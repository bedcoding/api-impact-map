import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Self-contained app: all data lives under app/src. `base: "./"` keeps asset
// paths relative so the production build can be opened straight from the
// filesystem.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
