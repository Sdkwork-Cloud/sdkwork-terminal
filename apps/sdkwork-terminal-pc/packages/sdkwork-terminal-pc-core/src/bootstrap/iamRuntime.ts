import { createClient, type SdkworkAppClient } from '@sdkwork/iam-app-sdk';
import {
  createSdkworkAppbasePcAuthRuntime,
  type SdkworkAppbasePcAuthRuntimeComposition,
  type SdkworkAppbasePcAuthSessionBridgeSession,
} from '@sdkwork/auth-runtime-pc-react';
import type { IamDeploymentMode, IamEnvironment } from '@sdkwork/iam-contracts';
import type { AuthTokenManager } from '@sdkwork/sdk-common';
import { createTokenManager } from '@sdkwork/sdk-common';

import {
  getCurrentEnvironment,
  getPlatformApiGatewayHttpUrl,
  type EnvironmentType,
} from './environment';
import {
  clearTerminalSession,
  commitTerminalSession,
  hydrateTerminalSessionFromPersistence,
  readTerminalSession,
  type TerminalSessionSnapshot,
} from './session';

const APP_ID = 'sdkwork-terminal';
const APP_API_PREFIX = '/app/v3/api';

export type TerminalIamRuntime = ReturnType<
  SdkworkAppbasePcAuthRuntimeComposition['getRuntime']
>;

export interface IamRuntime {
  baseUrl: string;
  tokenManager: AuthTokenManager;
  appbaseApp: SdkworkAppClient;
  runtime: TerminalIamRuntime;
}

let cachedComposition: SdkworkAppbasePcAuthRuntimeComposition | null = null;

export function invalidateIamRuntime(): void {
  cachedComposition = null;
}

function resolveAppbaseAppApiBaseUrl(): string {
  return getPlatformApiGatewayHttpUrl();
}

function normalizeGeneratedSdkBaseUrl(baseUrl: string, apiPrefix: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const normalizedApiPrefix = apiPrefix.replace(/\/+$/, '');
  if (normalizedBaseUrl.endsWith(normalizedApiPrefix)) {
    return normalizedBaseUrl.slice(0, -normalizedApiPrefix.length) || normalizedBaseUrl;
  }
  return normalizedBaseUrl;
}

function toIamDeploymentMode(): IamDeploymentMode {
  const hosting = import.meta.env.VITE_SDKWORK_TERMINAL_HOSTING?.trim().toLowerCase();
  if (hosting === 'cloud-hosted') {
    return 'saas';
  }
  return 'local';
}

function toIamEnvironment(value: EnvironmentType): IamEnvironment {
  if (value === 'production' || value === 'staging') {
    return 'prod';
  }
  if (value === 'test') {
    return 'test';
  }
  return 'dev';
}

function toBridgeSession(
  snapshot: TerminalSessionSnapshot | null,
): SdkworkAppbasePcAuthSessionBridgeSession | null {
  if (!snapshot?.authToken && !snapshot?.accessToken) {
    return null;
  }

  return {
    ...(snapshot.accessToken ? { accessToken: snapshot.accessToken } : {}),
    ...(snapshot.authToken ? { authToken: snapshot.authToken } : {}),
    ...(snapshot.refreshToken ? { refreshToken: snapshot.refreshToken } : {}),
    ...(snapshot.sessionId ? { sessionId: snapshot.sessionId } : {}),
  };
}

function createAppbaseAppClient(tokenManager: AuthTokenManager): SdkworkAppClient {
  return createClient({
    authMode: 'dual-token',
    baseUrl: normalizeGeneratedSdkBaseUrl(resolveAppbaseAppApiBaseUrl(), APP_API_PREFIX),
    platform: 'pc',
    tokenManager,
  });
}

function createTerminalIamComposition(): SdkworkAppbasePcAuthRuntimeComposition {
  const tokenManager = createTokenManager();
  const appbaseApp = createAppbaseAppClient(tokenManager);

  return createSdkworkAppbasePcAuthRuntime({
    app: {
      appId: APP_ID,
      deploymentMode: toIamDeploymentMode(),
      environment: toIamEnvironment(getCurrentEnvironment()),
      platform: 'pc',
    },
    baseUrls: {
      appbaseAppApiBaseUrl: resolveAppbaseAppApiBaseUrl(),
    },
    createAppbaseAppClient: () => appbaseApp,
    sessionBridge: {
      clearSession: () => {
        clearTerminalSession();
      },
      commitSession: (session) => {
        commitTerminalSession({
          accessToken: session.accessToken,
          authToken: session.authToken,
          refreshToken: session.refreshToken,
          sessionId: session.sessionId,
        });
        return session;
      },
      readSession: () => toBridgeSession(readTerminalSession()),
    },
    tokenManager,
  });
}

export function getIamComposition(): SdkworkAppbasePcAuthRuntimeComposition {
  if (!cachedComposition) {
    cachedComposition = createTerminalIamComposition();
  }
  return cachedComposition;
}

export function getIamRuntime(): IamRuntime {
  const composition = getIamComposition();
  return {
    baseUrl: resolveAppbaseAppApiBaseUrl(),
    tokenManager: composition.tokenManager,
    appbaseApp: composition.appbaseApp,
    runtime: composition.runtime,
  };
}

export async function bootstrapTerminalIamSession(): Promise<boolean> {
  await hydrateTerminalSessionFromPersistence();
  const { runtime, tokenManager } = getIamRuntime();
  await runtime.hydrateTokenManager();

  const tokens = tokenManager.getTokens();
  if (!tokens?.authToken || !tokens.accessToken) {
    clearTerminalSession();
    invalidateIamRuntime();
    return false;
  }

  try {
    await runtime.service.auth.sessions.current.retrieve();
    return true;
  } catch {
    await runtime.service.auth.sessions.current.delete().catch(() => undefined);
    clearTerminalSession();
    invalidateIamRuntime();
    return false;
  }
}

// Backward-compatible TokenManager alias for AuthGate imports.
export type TokenManager = AuthTokenManager;

export function getTokenManager(): AuthTokenManager {
  return getIamComposition().tokenManager;
}

export function createTokenManagerLegacy(): AuthTokenManager {
  return createTokenManager();
}

export function createIamRuntime(): IamRuntime {
  return getIamRuntime();
}
