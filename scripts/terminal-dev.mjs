#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  createPlatformGatewaySpawnPlan,
  DEFAULT_DEV_PROFILE_ID,
  listHealthSurfaces,
  listOrchestrationProcesses,
  loadProfile,
  mergeRuntimeEnv,
  PC_WORKSPACE_ROOT,
  REPO_ROOT,
  resolveDevProfileId,
  resolveDesktopRendererPort,
  resolveSurfaceHttpUrl,
  resolveWebRendererHost,
  resolveWebRendererPort,
  shouldAutostartGateway,
  waitForHttpHealthy,
  waitForSurfaceHealthy,
} from './lib/terminal-topology.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEALTH_PATH = '/healthz';
const HEALTH_TIMEOUT_MS = 2000;
const STARTUP_WAIT_MS = 500;
const MAX_STARTUP_ATTEMPTS = 60;
const MAX_GATEWAY_STARTUP_ATTEMPTS = 180;
const GATEWAY_STARTUP_WAIT_MS = 1000;

const ORCHESTRATION_SCRIPT_HANDLERS = {
  'tauri:dev': {
    processId: 'desktop-renderer',
    spawn(runtimeEnv, plan) {
      return spawnNodeScript(
        'apps/sdkwork-terminal-pc/tools/scripts/run-tauri-dev.mjs',
        [],
        {
          cwd: PC_WORKSPACE_ROOT,
          env: {
            ...runtimeEnv,
            SDKWORK_TERMINAL_DEV_PROFILE_ID: plan.profileId,
          },
        },
      );
    },
  },
  'dev:web': {
    processId: 'web-renderer',
    spawn(runtimeEnv, plan) {
      return spawnNodeScript(
        'apps/sdkwork-terminal-pc/tools/scripts/run-web-vite.mjs',
        [
          'serve',
          '--host',
          plan.webRendererHost,
          '--port',
          String(plan.webRendererPort),
        ],
        {
          cwd: PC_WORKSPACE_ROOT,
          env: runtimeEnv,
        },
      );
    },
  },
  'runtime-node:dev': {
    processId: 'runtime-node',
    spawn(runtimeEnv) {
      return spawn('cargo', [
        'run',
        '--manifest-path',
        path.join(PC_WORKSPACE_ROOT, 'crates/sdkwork-terminal-runtime-node/Cargo.toml'),
        '--bin',
        'sdkwork-terminal-runtime-node',
      ], {
        cwd: PC_WORKSPACE_ROOT,
        env: runtimeEnv,
        stdio: 'inherit',
        shell: false,
        windowsHide: true,
      });
    },
  },
};

function parseArgs(argv) {
  const settings = {
    hosting: 'self-hosted',
    serviceLayout: 'split-services',
    target: 'desktop',
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      settings.help = true;
      continue;
    }
    if (arg === '--hosting') {
      settings.hosting = argv[index + 1] ?? settings.hosting;
      index += 1;
      continue;
    }
    if (arg === '--service-layout') {
      settings.serviceLayout = argv[index + 1] ?? settings.serviceLayout;
      index += 1;
      continue;
    }
    if (arg === '--target') {
      settings.target = argv[index + 1] ?? settings.target;
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      settings.dryRun = true;
    }
  }

  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/terminal-dev.mjs [options]

Topology-aware Terminal dev entry. Loads configs/topology profile env via @sdkwork/app-topology.

Options:
  --hosting <self-hosted|cloud-hosted>              Default: self-hosted
  --service-layout <split-services>                 Default: split-services
  --target <desktop|web>                            Default: desktop
  --dry-run                                         Print plan without executing
  --help, -h
`);
}

function spawnNodeScript(scriptRelativePath, args = [], options = {}) {
  const scriptPath = path.join(REPO_ROOT, scriptRelativePath);
  return spawn(process.execPath, [scriptPath, ...args], {
    cwd: options.cwd ?? REPO_ROOT,
    env: options.env ?? process.env,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
}

function resolveTargetProcessId(target) {
  return target === 'web' ? 'web-renderer' : 'desktop-renderer';
}

function resolveOrchestrationEntry(profileId, processId) {
  const processes = listOrchestrationProcesses(profileId);
  const entry = processes.find((processEntry) => processEntry.id === processId);
  if (!entry) {
    throw new Error(`No orchestration process ${processId} in profile ${profileId}`);
  }
  return entry;
}

async function waitForHealthSurfaces(profileId, runtimeEnv) {
  const surfaces = listHealthSurfaces(profileId);
  for (const surfaceId of surfaces) {
    const baseUrl = resolveSurfaceHttpUrl(runtimeEnv, surfaceId);
    if (!baseUrl) {
      continue;
    }
    const healthy = await waitForSurfaceHealthy(baseUrl, {
      path: HEALTH_PATH,
      timeoutMs: HEALTH_TIMEOUT_MS,
      attempts: MAX_STARTUP_ATTEMPTS,
      intervalMs: STARTUP_WAIT_MS,
    });
    if (!healthy) {
      throw new Error(
        `Health check failed for ${surfaceId} at ${baseUrl}${HEALTH_PATH}`,
      );
    }
  }
}

function spawnBackgroundProcess(child, label) {
  child.on('error', (error) => {
    console.error(`[sdkwork-terminal] ${label} failed`, error);
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[sdkwork-terminal] ${label} exited with code ${code}`);
    }
  });
}

async function maybeStartPlatformGateway(profileEnv, runtimeEnv) {
  if (!shouldAutostartGateway(profileEnv)) {
    return null;
  }

  const baseUrl = resolveSurfaceHttpUrl(runtimeEnv, 'platform.api-gateway');
  if (!baseUrl) {
    return null;
  }

  const alreadyHealthy = await waitForSurfaceHealthy(baseUrl, {
    path: HEALTH_PATH,
    timeoutMs: HEALTH_TIMEOUT_MS,
    attempts: 3,
    intervalMs: STARTUP_WAIT_MS,
  });
  if (alreadyHealthy) {
    console.log(`[sdkwork-terminal] platform gateway already healthy at ${baseUrl}`);
    return null;
  }

  const spawnPlan = createPlatformGatewaySpawnPlan(profileEnv);
  console.log('[sdkwork-terminal] starting platform api-gateway');
  const child = spawn(spawnPlan.command, spawnPlan.args, {
    cwd: spawnPlan.cwd,
    env: runtimeEnv,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
  spawnBackgroundProcess(child, 'platform-api-gateway');

  const healthy = await waitForSurfaceHealthy(baseUrl, {
    path: HEALTH_PATH,
    timeoutMs: HEALTH_TIMEOUT_MS,
    attempts: MAX_GATEWAY_STARTUP_ATTEMPTS,
    intervalMs: GATEWAY_STARTUP_WAIT_MS,
  });
  if (!healthy) {
    throw new Error(
      `Health check failed for platform.api-gateway at ${baseUrl}${HEALTH_PATH}`,
    );
  }

  return child;
}

async function maybeStartRuntimeNode(profileId, runtimeEnv, settings) {
  if (settings.target !== 'web') {
    return null;
  }

  const runtimeNodeEntry = listOrchestrationProcesses(profileId)
    .find((processEntry) => processEntry.id === 'runtime-node');
  if (!runtimeNodeEntry) {
    return null;
  }

  const handler = ORCHESTRATION_SCRIPT_HANDLERS[runtimeNodeEntry.script];
  if (!handler) {
    throw new Error(`Unsupported orchestration script ${runtimeNodeEntry.script}`);
  }

  console.log('[sdkwork-terminal] starting runtime-node for web runtime bridge');
  const child = handler.spawn(runtimeEnv, { profileId });
  spawnBackgroundProcess(child, 'runtime-node');
  return child;
}

async function run() {
  const settings = parseArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }

  const profileId = resolveDevProfileId(settings.hosting, settings.serviceLayout);
  const profileEnv = loadProfile(profileId);
  const runtimeEnv = mergeRuntimeEnv(process.env, profileEnv);

  const plan = {
    profileId,
    target: settings.target,
    desktopRendererPort: resolveDesktopRendererPort(profileEnv),
    webRendererHost: resolveWebRendererHost(profileEnv),
    webRendererPort: resolveWebRendererPort(profileEnv),
    autostartGateway: shouldAutostartGateway(profileEnv),
    healthSurfaces: listHealthSurfaces(profileId),
    targetProcessId: resolveTargetProcessId(settings.target),
  };

  console.log(`[sdkwork-terminal] profile ${profileId}`);
  console.log(`[sdkwork-terminal] target ${settings.target}`);
  console.log(JSON.stringify(plan, null, 2));

  if (settings.dryRun) {
    return;
  }

  await maybeStartPlatformGateway(profileEnv, runtimeEnv);

  await maybeStartRuntimeNode(profileId, runtimeEnv, settings);
  if (settings.target === 'web') {
    const runtimeBaseUrl = resolveSurfaceHttpUrl(runtimeEnv, 'application.public-ingress');
    if (runtimeBaseUrl) {
      const healthy = await waitForHttpHealthy(runtimeBaseUrl, {
        path: HEALTH_PATH,
        timeoutMs: HEALTH_TIMEOUT_MS,
        attempts: MAX_STARTUP_ATTEMPTS,
        intervalMs: STARTUP_WAIT_MS,
      });
      if (!healthy) {
        throw new Error(`Health check failed for runtime-node at ${runtimeBaseUrl}${HEALTH_PATH}`);
      }
    }
  }
  await waitForHealthSurfaces(profileId, runtimeEnv);

  const orchestrationEntry = resolveOrchestrationEntry(profileId, plan.targetProcessId);
  const handler = ORCHESTRATION_SCRIPT_HANDLERS[orchestrationEntry.script];
  if (!handler) {
    throw new Error(`Unsupported orchestration script ${orchestrationEntry.script}`);
  }

  const child = handler.spawn(runtimeEnv, plan);

  await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${plan.targetProcessId} exited with code ${code ?? 1}`));
    });
  });
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { DEFAULT_DEV_PROFILE_ID, ORCHESTRATION_SCRIPT_HANDLERS, maybeStartPlatformGateway, parseArgs, printHelp };
