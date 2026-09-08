import { createClient, type SdkworkAppClient } from '@sdkwork/iam-app-sdk';
import {
  createTokenManager,
  resolveBaseUrl,
  type AuthTokenManager,
  type AuthTokens,
} from '@sdkwork/sdk-common';

import { getPlatformApiGatewayHttpUrl } from './environment';
import {
  clearTerminalSession,
  commitTerminalSession,
  readTerminalSession,
  type TerminalSessionSnapshot,
} from './session';

export interface IamRuntime {
  baseUrl: string;
  tokenManager: AuthTokenManager;
  appbaseApp: SdkworkAppClient;
}

let cachedIamRuntime: IamRuntime | null = null;

export function invalidateIamRuntime(): void {
  cachedIamRuntime = null;
}

function hydrateTokenManager(
  tokenManager: AuthTokenManager,
  snapshot: TerminalSessionSnapshot | null,
): void {
  if (!snapshot) {
    return;
  }

  tokenManager.setTokens({
    ...(snapshot.accessToken ? { accessToken: snapshot.accessToken } : {}),
    ...(snapshot.authToken ? { authToken: snapshot.authToken } : {}),
    ...(snapshot.refreshToken ? { refreshToken: snapshot.refreshToken } : {}),
  });
}

function bindSessionPersistence(tokenManager: AuthTokenManager): void {
  const originalSetTokens = tokenManager.setTokens.bind(tokenManager);
  const originalClearTokens = tokenManager.clearTokens.bind(tokenManager);

  tokenManager.setTokens = (tokens: AuthTokens) => {
    const result = originalSetTokens(tokens);
    commitTerminalSession({
      accessToken: tokens.accessToken,
      authToken: tokens.authToken,
      refreshToken: tokens.refreshToken,
    });
    return result;
  };

  tokenManager.clearTokens = () => {
    originalClearTokens();
    clearTerminalSession();
  };
}

function createAppbaseAppClient(tokenManager: AuthTokenManager): SdkworkAppClient {
  return createClient({
    authMode: 'dual-token',
    baseUrl: resolveBaseUrl({ baseUrls: [getPlatformApiGatewayHttpUrl()] }).url,
    platform: 'h5',
    tokenManager,
  });
}

export function createIamRuntime(): IamRuntime {
  const tokenManager = createTokenManager();
  bindSessionPersistence(tokenManager);
  hydrateTokenManager(tokenManager, readTerminalSession());

  return {
    baseUrl: getPlatformApiGatewayHttpUrl(),
    tokenManager,
    appbaseApp: createAppbaseAppClient(tokenManager),
  };
}

export function getIamRuntime(): IamRuntime {
  if (!cachedIamRuntime) {
    cachedIamRuntime = createIamRuntime();
  }
  return cachedIamRuntime;
}

export type TokenManager = AuthTokenManager;
