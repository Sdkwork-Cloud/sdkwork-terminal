import { defineConfig, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";

import { createSdkworkViteCompatibilityConfig } from "./sdkwork-vite-compat.mjs";
import { workspaceAlias } from "../../vite.workspace-alias.mjs";

export function createTerminalAppViteConfig(extraConfig = {}) {
  return defineConfig((configEnv) =>
    mergeConfig(
      createSdkworkViteCompatibilityConfig(configEnv),
      mergeConfig(
        {
          plugins: [react()],
          resolve: {
            alias: workspaceAlias,
          },
        },
        extraConfig,
      ),
    ),
  );
}
