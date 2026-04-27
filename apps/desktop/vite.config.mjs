import { defineConfig, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";

import { createSdkworkViteCompatibilityConfig } from "../../tools/vite/sdkwork-vite-compat.mjs";
import { workspaceAlias } from "../../vite.workspace-alias.mjs";

export default defineConfig((configEnv) =>
  mergeConfig(
    createSdkworkViteCompatibilityConfig(configEnv),
    {
      plugins: [react()],
      resolve: {
        alias: workspaceAlias,
      },
      // Packaged desktop builds should resolve assets relative to index.html so
      // the bundled WebView does not depend on root-relative asset semantics.
      base: configEnv.command === "build" ? "./" : "/",
    },
  ),
);
