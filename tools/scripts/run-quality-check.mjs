#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

export function createQualityCheckSteps() {
  return [
    {
      label: 'workspace-tests',
      command: process.execPath,
      args: [
        '--test',
        'tests/workspace-structure.test.mjs',
        'tests/run-workspace-package-script.test.mjs',
      ],
    },
    {
      label: 'web-typecheck',
      command: process.execPath,
      args: [
        'tools/scripts/run-local-typescript.mjs',
        '-p',
        'apps/web/tsconfig.json',
        '--noEmit',
      ],
    },
    {
      label: 'desktop-typecheck',
      command: process.execPath,
      args: [
        'tools/scripts/run-local-typescript.mjs',
        '-p',
        'apps/desktop/tsconfig.json',
        '--noEmit',
      ],
    },
    {
      label: 'web-build',
      command: process.execPath,
      args: ['tools/scripts/run-workspace-package-script.mjs', 'apps/web', 'build'],
    },
    {
      label: 'desktop-build',
      command: process.execPath,
      args: ['tools/scripts/run-workspace-package-script.mjs', 'apps/desktop', 'build'],
    },
  ];
}

export function runQualityCheckCli() {
  for (const step of createQualityCheckSteps()) {
    const result = spawnSync(step.command, step.args, {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.signal) {
      console.error(`[run-quality-check] ${step.label} exited with signal ${result.signal}`);
      process.exit(1);
    }

    if ((result.status ?? 0) !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  try {
    runQualityCheckCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
