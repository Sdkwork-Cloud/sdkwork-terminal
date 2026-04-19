#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const unsupportedShellTokens = new Set(['&&', '||', '|', ';', '>', '>>', '<']);

function resolvePathKey(env = process.env, platform = process.platform) {
  return (
    Object.keys(env).find((key) => key.toUpperCase() === 'PATH')
    ?? (platform === 'win32' ? 'Path' : 'PATH')
  );
}

function ensureNodeExecPathOnPath({
  env = process.env,
  platform = process.platform,
  execPath = process.execPath,
} = {}) {
  const pathKey = resolvePathKey(env, platform);
  const nextEnv = {
    ...env,
  };
  const nodeBinDir = path.dirname(execPath);
  const delimiter = platform === 'win32' ? ';' : ':';
  const rawPathValue = String(nextEnv[pathKey] ?? nextEnv.PATH ?? nextEnv.Path ?? '');
  const pathEntries = rawPathValue
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const normalizedNodeBinDir = platform === 'win32'
    ? nodeBinDir.replace(/[\\/]+$/, '').toLowerCase()
    : nodeBinDir.replace(/\/+$/, '');

  if (
    normalizedNodeBinDir
    && !pathEntries.some((entry) => {
      const normalizedEntry = platform === 'win32'
        ? entry.replace(/[\\/]+$/, '').toLowerCase()
        : entry.replace(/\/+$/, '');
      return normalizedEntry === normalizedNodeBinDir;
    })
  ) {
    pathEntries.unshift(nodeBinDir);
  }

  for (const key of Object.keys(nextEnv)) {
    if (key !== pathKey && key.toUpperCase() === 'PATH') {
      delete nextEnv[key];
    }
  }

  nextEnv[pathKey] = pathEntries.join(delimiter);
  nextEnv.NODE = execPath;
  nextEnv.npm_node_execpath = execPath;

  return nextEnv;
}

function ensureWorkspaceRelativePath(targetPath, workspaceRootDir = rootDir) {
  const absoluteTargetPath = path.resolve(workspaceRootDir, targetPath);
  const relativeTargetPath = path.relative(workspaceRootDir, absoluteTargetPath);
  if (relativeTargetPath.startsWith('..') || path.isAbsolute(relativeTargetPath)) {
    throw new Error(`Package path must stay inside the workspace root: ${targetPath}`);
  }

  return absoluteTargetPath;
}

function readWorkspacePackageScript({
  packageDir,
  scriptName,
  workspaceRootDir = rootDir,
}) {
  const absolutePackageDir = ensureWorkspaceRelativePath(packageDir, workspaceRootDir);
  const packageJsonPath = path.join(absolutePackageDir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    throw new Error(`Unable to resolve workspace package.json at ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const script = String(packageJson.scripts?.[scriptName] ?? '').trim();
  if (!script) {
    throw new Error(`Package script ${scriptName} is not defined in ${packageJsonPath}`);
  }

  return {
    absolutePackageDir,
    script,
  };
}

function splitCommandTokens(commandText) {
  const tokens = [];
  let currentToken = '';
  let quoteCharacter = '';

  for (let index = 0; index < commandText.length; index += 1) {
    const character = commandText[index];

    if (quoteCharacter) {
      if (character === quoteCharacter) {
        quoteCharacter = '';
        continue;
      }

      if (
        quoteCharacter === '"'
        && character === '\\'
        && index + 1 < commandText.length
      ) {
        const nextCharacter = commandText[index + 1];
        if (nextCharacter === '"' || nextCharacter === '\\') {
          currentToken += nextCharacter;
          index += 1;
          continue;
        }
      }

      currentToken += character;
      continue;
    }

    if (character === '"' || character === '\'') {
      quoteCharacter = character;
      continue;
    }

    if (/\s/.test(character)) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = '';
      }
      continue;
    }

    currentToken += character;
  }

  if (quoteCharacter) {
    throw new Error(`Unterminated quote in workspace package script: ${commandText}`);
  }

  if (currentToken) {
    tokens.push(currentToken);
  }

  return tokens;
}

function isNodeExecutableToken(token) {
  return /(^|[\\/])node(?:\.exe)?$/i.test(token);
}

function createDirectNodePlan({
  script,
  cwd,
  env = process.env,
  platform = process.platform,
}) {
  const commandTokens = splitCommandTokens(script);
  if (commandTokens.length === 0) {
    throw new Error('Workspace package script must not be empty.');
  }

  if (commandTokens.some((token) => unsupportedShellTokens.has(token))) {
    throw new Error(
      `Only node-based package scripts are supported by run-workspace-package-script: ${script}`,
    );
  }

  const [executableToken, ...args] = commandTokens;
  if (!isNodeExecutableToken(executableToken)) {
    throw new Error(
      `Only node-based package scripts are supported by run-workspace-package-script: ${script}`,
    );
  }

  if (args.length === 0) {
    throw new Error(`Node-based package script must include an entrypoint: ${script}`);
  }

  return {
    command: process.execPath,
    args,
    cwd,
    env: ensureNodeExecPathOnPath({ env, platform }),
    shell: false,
  };
}

export function createWorkspacePackageScriptPlan({
  packageDir,
  scriptName,
  workspaceRootDir = rootDir,
  env = process.env,
  platform = process.platform,
} = {}) {
  const packageScript = readWorkspacePackageScript({
    packageDir,
    scriptName,
    workspaceRootDir,
  });

  return createDirectNodePlan({
    script: packageScript.script,
    cwd: packageScript.absolutePackageDir,
    env,
    platform,
  });
}

function parseArgs(argv = []) {
  if (!Array.isArray(argv) || argv.length !== 2) {
    throw new Error(
      'run-workspace-package-script requires exactly two arguments: <package-dir> <script-name>.',
    );
  }

  return {
    packageDir: String(argv[0] ?? '').trim(),
    scriptName: String(argv[1] ?? '').trim(),
  };
}

export function runWorkspacePackageScriptCli({
  argv = process.argv.slice(2),
} = {}) {
  const options = parseArgs(argv);
  const plan = createWorkspacePackageScriptPlan(options);
  const result = spawnSync(plan.command, plan.args, {
    cwd: plan.cwd,
    env: plan.env,
    stdio: 'inherit',
    shell: plan.shell,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    console.error(`[run-workspace-package-script] process exited with signal ${result.signal}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  try {
    runWorkspacePackageScriptCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
