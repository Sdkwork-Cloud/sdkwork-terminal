import { getApiBaseUrl, getCurrentEnvironment, type EnvironmentType } from './environment';

export interface RuntimeConfig {
  baseUrl: string;
  apiVersion: string;
  environment: EnvironmentType;
  headers: Record<string, string>;
}

let cachedRuntimeConfig: RuntimeConfig | null = null;

export function createRuntimeConfig(): RuntimeConfig {
  return {
    baseUrl: getApiBaseUrl(),
    apiVersion: 'v1',
    environment: getCurrentEnvironment(),
    headers: {},
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  if (!cachedRuntimeConfig) {
    cachedRuntimeConfig = createRuntimeConfig();
  }
  return cachedRuntimeConfig;
}
