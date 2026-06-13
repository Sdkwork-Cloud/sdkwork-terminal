import { getCurrentEnvironment, type EnvironmentType } from './environment';

export interface RuntimeConfig {
  baseUrl: string;
  apiVersion: string;
  headers: Record<string, string>;
}

const configs: Record<EnvironmentType, RuntimeConfig> = {
  development: {
    baseUrl: 'https://api-dev.sdkwork.com',
    apiVersion: 'v1',
    headers: {},
  },
  test: {
    baseUrl: 'https://api-test.sdkwork.com',
    apiVersion: 'v1',
    headers: {},
  },
  staging: {
    baseUrl: 'https://api-staging.sdkwork.com',
    apiVersion: 'v1',
    headers: {},
  },
  production: {
    baseUrl: 'https://api.sdkwork.com',
    apiVersion: 'v1',
    headers: {},
  },
};

export function getRuntimeConfig(): RuntimeConfig {
  const env = getCurrentEnvironment();
  return configs[env];
}
