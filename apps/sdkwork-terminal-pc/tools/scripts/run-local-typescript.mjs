#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveWorkspaceRootDir() {
  return path.resolve(__dirname, '..', '..');
}

function compareVersionLike(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function parseTypescriptStoreVersion(storeName) {
  const match = /^typescript@(?<version>[^_]+)(?:_|$)/u.exec(String(storeName ?? ''));
  return String(match?.groups?.version ?? '').trim();
}

export function resolveInstalledTypescriptPackageRoot({
  cwd = process.cwd(),
  workspaceRootDir = resolveWorkspaceRootDir(),
} = {}) {
  const directCandidates = [
    path.join(cwd, 'node_modules', 'typescript'),
    path.join(workspaceRootDir, 'node_modules', 'typescript'),
  ];

  for (const candidate of directCandidates) {
    if (existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  }

  const pnpmStoreDir = path.join(workspaceRootDir, 'node_modules', '.pnpm');
  if (!existsSync(pnpmStoreDir)) {
    return null;
  }

  const storeNames = readdirSync(pnpmStoreDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('typescript@'))
    .map((entry) => entry.name)
    .sort((left, right) =>
      compareVersionLike(parseTypescriptStoreVersion(right), parseTypescriptStoreVersion(left)),
    );

  for (const storeName of storeNames) {
    const candidate = path.join(pnpmStoreDir, storeName, 'node_modules', 'typescript');
    if (existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  }

  return null;
}

export function resolveTypescriptCliEntry({
  cwd = process.cwd(),
  workspaceRootDir = resolveWorkspaceRootDir(),
} = {}) {
  const typescriptPackageRoot = resolveInstalledTypescriptPackageRoot({
    cwd,
    workspaceRootDir,
  });
  if (!typescriptPackageRoot) {
    throw new Error(
      `Unable to resolve an installed typescript package from ${cwd}. Run pnpm install before invoking run-local-typescript.`,
    );
  }

  const packageJson = JSON.parse(
    readFileSync(path.join(typescriptPackageRoot, 'package.json'), 'utf8'),
  );
  const configuredCliPath =
    typeof packageJson?.bin?.tsc === 'string'
      ? path.join(typescriptPackageRoot, packageJson.bin.tsc)
      : null;
  const fallbackCliPath = path.join(typescriptPackageRoot, 'lib', 'tsc.js');

  if (configuredCliPath && existsSync(configuredCliPath)) {
    return configuredCliPath;
  }

  if (existsSync(fallbackCliPath)) {
    return fallbackCliPath;
  }

  throw new Error(
    `Unable to resolve a runnable TypeScript CLI from ${path.join(typescriptPackageRoot, 'package.json')}.`,
  );
}

export function createLocalTypescriptPlan({
  argv = process.argv.slice(2),
  cwd = process.cwd(),
} = {}) {
  const workspaceRootDir = resolveWorkspaceRootDir();
  const resolvedCwd = cwd;

  return {
    command: process.execPath,
    args: [resolveTypescriptCliEntry({ cwd: resolvedCwd, workspaceRootDir }), ...argv],
    cwd: resolvedCwd,
    env: process.env,
  };
}

export async function runLocalTypescriptCli({
  argv = process.argv.slice(2),
} = {}) {
  const plan = createLocalTypescriptPlan({ argv });
  const child = spawn(plan.command, plan.args, {
    cwd: plan.cwd,
    env: plan.env,
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', (error) => {
    console.error(`[run-local-typescript] ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[run-local-typescript] process exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLocalTypescriptCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
