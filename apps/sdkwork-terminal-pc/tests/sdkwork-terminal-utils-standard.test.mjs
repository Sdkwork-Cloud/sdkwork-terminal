#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const rootCargo = read('Cargo.toml');
assert.match(
  rootCargo,
  /sdkwork-utils-rust\s*=\s*\{[^}]*sdkwork-utils/u,
  'Cargo.toml must declare sdkwork-utils-rust workspace dependency',
);

const pnpmWorkspace = read('pnpm-workspace.yaml');
assert.match(
  pnpmWorkspace,
  /sdkwork-utils\/packages\/sdkwork-utils-typescript/u,
  'pnpm-workspace.yaml must include sdkwork-utils-typescript sibling package',
);

const commonsPackage = JSON.parse(
  read('packages/sdkwork-terminal-pc-commons/package.json'),
);
assert(
  commonsPackage.dependencies?.['@sdkwork/utils'],
  '@sdkwork/terminal-pc-commons must depend on @sdkwork/utils',
);

const commonsSource = read('packages/sdkwork-terminal-pc-commons/src/index.ts');
assert.match(
  commonsSource,
  /@sdkwork\/utils/u,
  'terminal-pc-commons must consume sdkwork-utils string helpers',
);

const pcCoreBootstrap = read('packages/sdkwork-terminal-pc-core/src/bootstrap/index.ts');
assert.match(
  pcCoreBootstrap,
  /renderTerminalApp/u,
  'pc-core bootstrap must export renderTerminalApp',
);

const runtimeNodeHost = read('crates/sdkwork-terminal-runtime-node/src/host.rs');
assert.match(
  runtimeNodeHost,
  /sdkwork_utils_rust::is_blank/u,
  'runtime-node host must consume sdkwork-utils-rust is_blank',
);

const aiCliHost = read('crates/sdkwork-terminal-ai-cli-host/src/lib.rs');
assert.match(
  aiCliHost,
  /sdkwork_utils_rust::is_blank/u,
  'ai-cli-host must consume sdkwork-utils-rust is_blank',
);

const resourceConnectors = read('crates/sdkwork-terminal-resource-connectors/src/lib.rs');
assert.match(
  resourceConnectors,
  /sdkwork_utils_rust::is_blank/u,
  'resource-connectors must consume sdkwork-utils-rust is_blank',
);

const aiCliHostCargo = read('crates/sdkwork-terminal-ai-cli-host/Cargo.toml');
assert.match(
  aiCliHostCargo,
  /sdkwork-utils-rust\.workspace/u,
  'ai-cli-host Cargo.toml must declare sdkwork-utils-rust workspace dependency',
);

const resourceConnectorsCargo = read('crates/sdkwork-terminal-resource-connectors/Cargo.toml');
assert.match(
  resourceConnectorsCargo,
  /sdkwork-utils-rust\.workspace/u,
  'resource-connectors Cargo.toml must declare sdkwork-utils-rust workspace dependency',
);

const asyncBoundary = read('packages/sdkwork-terminal-pc-shell/src/terminal-async-boundary.ts');
assert.doesNotMatch(
  asyncBoundary,
  /function extractErrorMessage/u,
  'terminal-async-boundary must not duplicate extractErrorMessage',
);
assert.match(
  asyncBoundary,
  /extractErrorMessage/u,
  'terminal-async-boundary must import extractErrorMessage from commons',
);

const releaseFinalize = read('tools/release/finalize-release-assets.mjs');
assert.match(
  releaseFinalize,
  /@sdkwork\/utils\/crypto/u,
  'release finalize script must consume sdkwork-utils sha256Hash',
);

process.stdout.write('sdkwork-terminal utils standard passed\n');
