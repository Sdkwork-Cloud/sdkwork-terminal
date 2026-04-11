import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { workspaceAlias } from "../../vite.workspace-alias";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: workspaceAlias,
  },
});
