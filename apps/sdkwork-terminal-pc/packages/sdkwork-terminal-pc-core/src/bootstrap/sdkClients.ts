import type { SdkworkAppClient } from '@sdkwork/iam-app-sdk';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { getIamComposition, getIamRuntime } from './iamRuntime';
import { getRuntimeConfig } from './runtime';

export interface SdkClients {
  baseUrl: string;
  apiVersion: string;
  appbaseApp: SdkworkAppClient;
  tokenManager: AuthTokenManager;
}

let cachedSdkClients: SdkClients | null = null;

export function createSdkClients(): SdkClients {
  const config = getRuntimeConfig();
  const iam = getIamRuntime();

  return {
    baseUrl: config.baseUrl,
    apiVersion: config.apiVersion,
    appbaseApp: iam.appbaseApp,
    tokenManager: iam.tokenManager,
  };
}

export function getSdkClients(): SdkClients {
  if (!cachedSdkClients) {
    cachedSdkClients = createSdkClients();
  }
  return cachedSdkClients;
}

export function getAppbaseAppClient(): SdkworkAppClient {
  return getIamComposition().appbaseApp;
}
