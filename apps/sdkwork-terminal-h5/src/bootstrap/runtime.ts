import { getCurrentEnvironment, type EnvironmentType } from './environment';

export interface RuntimeConfig {
  baseUrl: string;
  apiVersion: string;
  environment: EnvironmentType;
  headers: Record<string, string>;
}

function resolvePlatformApiGatewayHttpUrl(): string {
  const topologyUrl = import.meta.env.VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL?.trim();
  if (topologyUrl) {
    return topologyUrl;
  }

  const env = getCurrentEnvironment();
  const fallbackUrls: Partial<Record<EnvironmentType, string>> = {
    development: 'https://api-dev.sdkwork.com',
    test: 'https://api-test.sdkwork.com',
    staging: 'https://api-staging.sdkwork.com',
    production: 'https://api.sdkwork.com',
  };

  return fallbackUrls[env] ?? fallbackUrls.development ?? 'https://api-dev.sdkwork.com';
}

let cachedRuntimeConfig: RuntimeConfig | null = null;

export function createRuntimeConfig(): RuntimeConfig {
  return {
    baseUrl: resolvePlatformApiGatewayHttpUrl(),
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
