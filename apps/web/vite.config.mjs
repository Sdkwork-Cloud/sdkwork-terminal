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
    },
  ),
);
