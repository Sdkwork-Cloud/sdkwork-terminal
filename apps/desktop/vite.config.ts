import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { workspaceAlias } from "../../vite.workspace-alias";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: workspaceAlias,
  },
  // Packaged desktop builds should resolve assets relative to index.html so
  // the bundled WebView does not depend on root-relative asset semantics.
  base: command === "build" ? "./" : "/",
}));
