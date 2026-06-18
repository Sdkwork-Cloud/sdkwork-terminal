#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_BUILD_PROFILE_ID,
  loadProfile,
  mergeRuntimeEnv,
  PC_WORKSPACE_ROOT,
  REPO_ROOT,
  resolveBuildProfileId,
} from './lib/terminal-topology.mjs';

const __filename = fileURLToPath(import.meta.url);

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function parseArgs(argv) {
  const settings = {
    hosting: 'cloud-hosted',
    target: 'all',
    debug: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      settings.help = true;
      continue;
    }
    if (arg === '--debug') {
      settings.debug = true;
      continue;
    }
    if (arg === '--target') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--target requires a value (all, desktop, web)');
      }
      if (value !== 'all' && value !== 'desktop' && value !== 'web') {
        throw new Error('--target must be all, desktop, or web');
      }
      settings.target = value;
      index += 1;
      continue;
    }
    if (arg === '--hosting') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--hosting requires a value (cloud-hosted or self-hosted)');
      }
      if (value !== 'cloud-hosted' && value !== 'self-hosted') {
        throw new Error('--hosting must be cloud-hosted or self-hosted');
      }
      settings.hosting = value;
      index += 1;
    }
  }

  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/terminal-build.mjs [options]

Build Terminal web and/or desktop artifacts with topology profile env.

Defaults:
  hosting cloud-hosted     Release builds target cloud-hosted split-services production.
  target all               Build web renderer and desktop (Tauri).

Profiles load from configs/topology/{hosting}.split-services.production.env

Options:
  --hosting <cloud-hosted|self-hosted>  Terminal hosting model (default: cloud-hosted)
  --target <all|desktop|web>            Build scope (default: all)
  --debug                               Desktop debug check instead of release bundle
  --help, -h                            Show this help
`);
}

function resolveWorkspaceScript(settings) {
  if (settings.target === 'web') {
    return 'build:web';
  }
  if (settings.target === 'desktop') {
    return settings.debug ? 'tauri:check' : 'tauri:build';
  }
  return settings.debug ? 'tauri:check' : 'build';
}

async function run() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const profileId = resolveBuildProfileId(settings.hosting);
  const profileEnv = loadProfile(profileId);
  const buildEnv = mergeRuntimeEnv(process.env, profileEnv, {
    SDKWORK_TERMINAL_HOSTING: settings.hosting,
    VITE_SDKWORK_TERMINAL_HOSTING: settings.hosting,
    SDKWORK_TERMINAL_PROFILE_ID: profileId,
  });
  const workspaceScript = resolveWorkspaceScript(settings);

  console.log(`[sdkwork-terminal] build profile ${profileId}`);
  console.log(`[sdkwork-terminal] workspace ${PC_WORKSPACE_ROOT}`);
  console.log(`[sdkwork-terminal] script ${workspaceScript}`);

  const child = spawn(
    pnpmCommand(),
    ['--dir', path.relative(REPO_ROOT, PC_WORKSPACE_ROOT) || '.', workspaceScript],
    {
      cwd: REPO_ROOT,
      env: buildEnv,
      stdio: 'inherit',
      shell: true,
    },
  );

  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`terminal build exited with code ${code ?? 1}`));
    });
  });
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { DEFAULT_BUILD_PROFILE_ID, parseArgs, printHelp, resolveWorkspaceScript };
