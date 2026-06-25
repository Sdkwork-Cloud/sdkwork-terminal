import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, rootDir, '');
  return {
    define: {
      'process.env.SDKWORK_ACCESS_TOKEN': JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ''),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@sdkwork/iam-app-sdk': path.join(
          rootDir,
          '../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript/generated/server-openapi/src/index.ts',
        ),
        '@sdkwork/terminal-h5-shell': path.join(
          rootDir,
          'packages/sdkwork-terminal-h5-shell/src/index.ts',
        ),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
  };
});
