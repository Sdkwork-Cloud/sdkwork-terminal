import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, mergeConfig } from "vite";

import { createSdkworkViteCompatibilityConfig } from "../../tools/vite/sdkwork-vite-compat.mjs";
import { workspaceAlias } from "../../vite.workspace-alias.mjs";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig((configEnv) => {
  const env = loadEnv(configEnv.mode, packageDir, "");
  return mergeConfig(
    createSdkworkViteCompatibilityConfig(configEnv),
    {
      define: {
        "process.env.SDKWORK_ACCESS_TOKEN": JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ""),
      },
      resolve: {
        alias: workspaceAlias,
      },
      build: {
        outDir: path.join(packageDir, "dist"),
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
        lib: {
          entry: {
            index: path.join(packageDir, "src", "index.tsx"),
            integration: path.join(packageDir, "src", "integration.tsx"),
          },
          formats: ["es"],
        },
        rollupOptions: {
          external: [
            "react",
            "react/jsx-runtime",
          ],
          output: {
            entryFileNames: "[name].js",
            chunkFileNames: "chunks/[name]-[hash].js",
            assetFileNames: "assets/[name]-[hash][extname]",
          },
        },
      },
    },
  );
});
