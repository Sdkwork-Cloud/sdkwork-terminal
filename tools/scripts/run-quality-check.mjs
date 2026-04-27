#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runCommandStepsSync } from './run-script-steps.mjs';
import { createWorkspaceNodeTestStep } from './run-workspace-tests.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

export function createQualityCheckSteps() {
  return [
    createWorkspaceNodeTestStep({ label: 'workspace-tests' }),
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
  const status = runCommandStepsSync(createQualityCheckSteps(), {
    cwd: rootDir,
    env: process.env,
    failurePrefix: 'run-quality-check',
  });

  if (status !== 0) {
    process.exit(status);
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
