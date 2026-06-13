export const Environment = {
  development: 'development',
  test: 'test',
  staging: 'staging',
  production: 'production',
} as const;

export type EnvironmentType = typeof Environment[keyof typeof Environment];

export function getCurrentEnvironment(): EnvironmentType {
  const env = import.meta.env.VITE_ENVIRONMENT || Environment.development;
  return env as EnvironmentType;
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

export function getApiBaseUrl(): string {
  // First try to get from environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fallback to environment-specific defaults
  const env = getCurrentEnvironment();
  const urls: Record<EnvironmentType, string> = {
    development: 'https://api-dev.sdkwork.com',
    test: 'https://api-test.sdkwork.com',
    staging: 'https://api-staging.sdkwork.com',
    production: 'https://api.sdkwork.com',
  };
  return urls[env];
}
