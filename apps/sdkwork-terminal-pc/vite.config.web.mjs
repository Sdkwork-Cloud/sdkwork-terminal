import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBrowserDistOutDir } from '../../../sdkwork-specs/tools/browser-dist-layout.mjs';

import { createTerminalAppViteConfig } from './tools/vite/create-terminal-app-vite-config.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function resolveViteEnvironment(mode, processEnv = process.env) {
  const profileMatch = /^(standalone|cloud)\.(development|test|staging|production)$/u.exec(mode ?? '');
  return profileMatch?.[2]
    ?? (['development', 'test', 'staging', 'production'].includes(processEnv.SDKWORK_ENVIRONMENT ?? '')
      ? processEnv.SDKWORK_ENVIRONMENT
      : 'production');
}

function publishIndexHtml(outDir, sourceName) {
  return {
    name: 'sdkwork-publish-index-html',
    closeBundle() {
      const sourcePath = path.join(outDir, sourceName);
      const targetPath = path.join(outDir, 'index.html');
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    },
  };
}

export default createTerminalAppViteConfig(({ mode }) => {
  const environment = resolveViteEnvironment(mode, process.env);
  const outDir = path.join(rootDir, resolveBrowserDistOutDir(environment));
  return {
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: path.join(rootDir, 'index.web.html'),
      },
    },
    plugins: [publishIndexHtml(outDir, 'index.web.html')],
  };
});
