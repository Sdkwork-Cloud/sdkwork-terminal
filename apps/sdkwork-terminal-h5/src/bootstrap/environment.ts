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
