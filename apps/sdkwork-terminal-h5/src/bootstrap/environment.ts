import { resolveBaseUrl } from '@sdkwork/sdk-common';

export const Environment = {
  development: 'development',
  test: 'test',
  staging: 'staging',
  production: 'production',
} as const;

export type EnvironmentType = typeof Environment[keyof typeof Environment];

export function getCurrentEnvironment(): EnvironmentType {
  const env = import.meta.env.VITE_SDKWORK_TERMINAL_ENVIRONMENT?.trim();
  if (env) {
    return env as EnvironmentType;
  }
  return import.meta.env.PROD ? Environment.production : Environment.development;
}

export function isDevelopment(): boolean {
  return getCurrentEnvironment() === Environment.development;
}

export function isTest(): boolean {
  return getCurrentEnvironment() === Environment.test;
}

export function isStaging(): boolean {
  return getCurrentEnvironment() === Environment.staging;
}

export function isProduction(): boolean {
  return getCurrentEnvironment() === Environment.production;
}

export function getPlatformApiGatewayHttpUrl(): string {
  const topologyUrl = import.meta.env.VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL?.trim();
  if (topologyUrl) {
    return topologyUrl;
  }

  if (import.meta.env.PROD) {
    throw new Error(
      'Missing VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL in production build.',
    );
  }

  // APP_RUNTIME_TOPOLOGY_SPEC section 4.2 / SDK_SPEC section 5.1 step 2:
  // dev:cloud binds the local platform gateway (ip:port); the environment
  // domain families stay build/deploy defaults.
  const localGatewayUrl = import.meta.env.VITE_SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL?.trim();
  if (localGatewayUrl) {
    return localGatewayUrl;
  }

  // Resolve the shared SDKWORK_API_BASE_URL through @sdkwork/sdk-common (env +
  // brand + protocol aware), eliminating the hardcoded api.sdkwork.com default.
  return resolveBaseUrl().url;
}
