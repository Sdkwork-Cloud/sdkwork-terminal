import { defineConfig, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";

import { createSdkworkViteCompatibilityConfig } from "./sdkwork-vite-compat.mjs";
import { workspaceAlias } from "../../vite.workspace-alias.mjs";

export function createTerminalAppViteConfig(extraConfig = {}) {
  const resolveExtra = typeof extraConfig === 'function' ? extraConfig : () => extraConfig;
  return defineConfig((configEnv) => {
    return mergeConfig(
      createSdkworkViteCompatibilityConfig(configEnv),
      mergeConfig(
        {
          plugins: [react()],
          resolve: {
            alias: workspaceAlias,
          },
        },
        resolveExtra(configEnv),
      ),
    );
  });
}
