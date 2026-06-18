import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pcRoot = path.resolve(__dirname, '..');
const source = path.join(pcRoot, 'apis/local-runtime/openapi.yaml');
const targetDir = path.join(
  pcRoot,
  'sdks/sdkwork-terminal-local-runtime-app-sdk/openapi',
);
const target = path.join(targetDir, 'sdkwork-terminal-local-runtime-app-api.openapi.yaml');

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`synced ${path.relative(pcRoot, source)} -> ${path.relative(pcRoot, target)}`);
