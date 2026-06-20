import { defineConfig, loadEnv, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";

import { createSdkworkViteCompatibilityConfig } from "./sdkwork-vite-compat.mjs";
import { workspaceAlias } from "../../vite.workspace-alias.mjs";

export function createTerminalAppViteConfig(extraConfig = {}) {
  return defineConfig((configEnv) => {
    const env = loadEnv(configEnv.mode, process.cwd(), "");
    return mergeConfig(
      createSdkworkViteCompatibilityConfig(configEnv),
      mergeConfig(
        {
          define: {
            "process.env.SDKWORK_ACCESS_TOKEN": JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ""),
          },
          plugins: [react()],
          resolve: {
            alias: workspaceAlias,
          },
        },
        extraConfig,
      ),
    );
  });
}
