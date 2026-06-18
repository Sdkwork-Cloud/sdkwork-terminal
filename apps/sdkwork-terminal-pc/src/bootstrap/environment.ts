export const Environment = {
  development: 'development',
  test: 'test',
  staging: 'staging',
  production: 'production',
} as const;

export type EnvironmentType = typeof Environment[keyof typeof Environment];

const TOPOLOGY_ENVIRONMENTS = new Set(['development', 'production']);

const PLATFORM_API_GATEWAY_URLS: Record<'development' | 'production', string> = {
  development: 'https://api-dev.sdkwork.com',
  production: 'https://api.sdkwork.com',
};

function resolveTopologyEnvironment(): 'development' | 'production' {
  const env = import.meta.env.VITE_SDKWORK_TERMINAL_ENVIRONMENT?.trim();
  if (env && TOPOLOGY_ENVIRONMENTS.has(env)) {
    return env as 'development' | 'production';
  }
  return import.meta.env.PROD ? 'production' : 'development';
}

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

  return PLATFORM_API_GATEWAY_URLS[resolveTopologyEnvironment()];
}

export function getApplicationPublicHttpUrl(): string | undefined {
  const topologyUrl = import.meta.env.VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL?.trim();
  return topologyUrl || undefined;
}

/** Platform SDK / IAM base URL (platform.api-gateway surface). */
export function getApiBaseUrl(): string {
  return getPlatformApiGatewayHttpUrl();
}
