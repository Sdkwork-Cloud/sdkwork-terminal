import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

import {
  buildProfileId,
  createTopologyRuntime,
  isTcpPortReachable,
  loadTopologySpec,
  normalizeText,
  waitForHttpHealthy,
} from '@sdkwork/app-topology';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const PC_WORKSPACE_ROOT = path.join(REPO_ROOT, 'apps', 'sdkwork-terminal-pc');
export const API_GATEWAY_REPO_ROOT = path.resolve(REPO_ROOT, '..', 'sdkwork-api-cloud-gateway');
export const SPEC_PATH = path.join(REPO_ROOT, 'specs/topology.spec.json');

export const IAM_APPLICATION_BOOTSTRAP_ENV = {
  SDKWORK_APP_ROOT: PC_WORKSPACE_ROOT,
  SDKWORK_IAM_APP_ROOT: path.resolve(REPO_ROOT, '..', 'sdkwork-iam'),
  SDKWORK_TERMINAL_APP_ROOT: PC_WORKSPACE_ROOT,
};

const spec = loadTopologySpec(SPEC_PATH);
const runtime = createTopologyRuntime(spec, REPO_ROOT);

export const DEFAULT_DEV_PROFILE_ID = runtime.defaults.developmentProfileId;
export const DEFAULT_BUILD_PROFILE_ID = runtime.defaults.desktopBuildProfileId;
export const VALID_DEPLOYMENT_PROFILES = runtime.deploymentProfileValues;
export const VALID_SERVICE_LAYOUTS = runtime.serviceLayoutValues;
export const VALID_ENVIRONMENTS = runtime.environmentValues;

export function resolveDevProfileId(deploymentProfile, serviceLayout = 'split-services') {
  runtime.assertDeploymentProfile(deploymentProfile);
  runtime.assertServiceLayout(serviceLayout);
  return buildProfileId(deploymentProfile, serviceLayout, 'development');
}

export function resolveBuildProfileId(deploymentProfile, serviceLayout = 'split-services') {
  runtime.assertDeploymentProfile(deploymentProfile);
  runtime.assertServiceLayout(serviceLayout);
  return buildProfileId(deploymentProfile, serviceLayout, 'production');
}

export function resolveDesktopRendererPort(profileEnv = {}) {
  const bind = normalizeText(profileEnv.SDKWORK_TERMINAL_CLIENT_DESKTOP_RENDERER_BIND);
  if (bind) {
    const [, portText] = bind.split(':');
    const parsed = Number.parseInt(portText ?? '', 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const httpUrl = normalizeText(
    profileEnv.SDKWORK_TERMINAL_CLIENT_DESKTOP_RENDERER_HTTP_URL
      ?? profileEnv.VITE_SDKWORK_TERMINAL_CLIENT_DESKTOP_RENDERER_HTTP_URL,
  );
  if (httpUrl) {
    try {
      const parsed = Number.parseInt(new URL(httpUrl).port, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  return 1420;
}

export function resolveWebRendererHost(profileEnv = {}) {
  const bind = normalizeText(profileEnv.SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_BIND);
  if (bind) {
    const [host] = bind.split(':');
    if (host) {
      return host;
    }
  }
  return '127.0.0.1';
}

export function resolveWebRendererPort(profileEnv = {}) {
  const bind = normalizeText(profileEnv.SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_BIND);
  if (bind) {
    const [, portText] = bind.split(':');
    const parsed = Number.parseInt(portText ?? '', 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const httpUrl = normalizeText(
    profileEnv.SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_HTTP_URL
      ?? profileEnv.VITE_SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_HTTP_URL,
  );
  if (httpUrl) {
    try {
      const parsed = Number.parseInt(new URL(httpUrl).port, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  return 4173;
}

export const loadProfile = runtime.loadProfile;
export const applyProfileEnv = runtime.applyProfileEnv;
export const mergeRuntimeEnv = runtime.mergeRuntimeEnv;
export const loadEnvFile = runtime.loadEnvFile;
export const assertDeploymentProfile = runtime.assertDeploymentProfile;
export const assertProfileId = runtime.assertProfileId;
export const profilePath = runtime.profilePath;
export const resolveSurfaceHttpUrl = runtime.resolveSurfaceHttpUrl.bind(runtime);
export const resolveSurfaceBind = runtime.resolveSurfaceBind.bind(runtime);
export const shouldAutostartGateway = runtime.shouldAutostartGateway;
export const resolveGatewayBind = runtime.resolveGatewayBind;
export const resolveGatewayBaseUrl = runtime.resolveGatewayBaseUrl;
export const resolveIamDevEnv = runtime.resolveIamDevEnv;
export const listOrchestrationProcesses = runtime.listOrchestrationProcesses;
export const listHealthSurfaces = runtime.listHealthSurfaces;

export function resolvePlatformGatewayConfigPath(profileEnv = {}) {
  const explicit = normalizeText(profileEnv.SDKWORK_API_CLOUD_GATEWAY_CONFIG);
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(REPO_ROOT, explicit);
  }

  return path.resolve(
    API_GATEWAY_REPO_ROOT,
    'configs',
    'sdkwork-api-cloud-gateway.development.toml.example',
  );
}

export function resolvePlatformGatewayManifestPath() {
  return path.join(
    API_GATEWAY_REPO_ROOT,
    'crates',
    'sdkwork-api-cloud-gateway',
    'Cargo.toml',
  );
}

export function assertPlatformGatewayCheckout(profileEnv = {}) {
  const manifestPath = resolvePlatformGatewayManifestPath();
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Platform gateway autostart requires sibling checkout at ${API_GATEWAY_REPO_ROOT}`,
    );
  }

  const configPath = resolvePlatformGatewayConfigPath(profileEnv);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Platform gateway config not found: ${configPath}`);
  }

  return { manifestPath, configPath };
}

export function createPlatformGatewaySpawnPlan(profileEnv = {}) {
  const { configPath } = assertPlatformGatewayCheckout(profileEnv);

  return {
    command: 'cargo',
    args: [
      'run',
      '--manifest-path',
      resolvePlatformGatewayManifestPath(),
      '--bin',
      'sdkwork-api-cloud-gateway',
      '--',
      '--config',
      configPath,
    ],
    cwd: API_GATEWAY_REPO_ROOT,
  };
}

function isHttpsHealthy(url, path = '/healthz', timeoutMs = 2000) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(path, url);
    } catch {
      resolve(false);
      return;
    }

    const request = https.get(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        timeout: timeoutMs,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 300);
      },
    );

    request.on('error', () => resolve(false));
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

export async function waitForSurfaceHealthy(baseUrl, options = {}) {
  const {
    path: healthPath = '/healthz',
    timeoutMs = 2000,
    attempts = 90,
    intervalMs = 1000,
  } = options;

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return false;
  }

  const check = parsed.protocol === 'https:'
    ? () => isHttpsHealthy(baseUrl, healthPath, timeoutMs)
    : () => waitForHttpHealthy(baseUrl, { path: healthPath, timeoutMs, attempts: 1, intervalMs: 0 });

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

export { buildProfileId, normalizeText, isTcpPortReachable, waitForHttpHealthy, spec, runtime };
