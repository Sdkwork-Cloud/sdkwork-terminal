import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createTerminalAppViteConfig } from "./tools/vite/create-terminal-app-vite-config.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function publishIndexHtml(outDir, sourceName) {
  return {
    name: "sdkwork-publish-index-html",
    closeBundle() {
      const sourcePath = path.join(outDir, sourceName);
      const targetPath = path.join(outDir, "index.html");
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    },
  };
}

export default createTerminalAppViteConfig({
  root: rootDir,
  server: {
    host: "127.0.0.1",
    port: 1420,
  },
  build: {
    outDir: path.join(rootDir, "dist/desktop"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(rootDir, "index.desktop.html"),
    },
  },
  plugins: [publishIndexHtml(path.join(rootDir, "dist/desktop"), "index.desktop.html")],
});
