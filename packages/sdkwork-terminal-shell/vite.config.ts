import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { workspaceAlias } from "../../vite.workspace-alias.ts";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
});
