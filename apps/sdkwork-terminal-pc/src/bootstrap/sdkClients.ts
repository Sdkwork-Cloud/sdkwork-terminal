import { getRuntimeConfig } from './runtime';

export interface SdkClients {
  baseUrl: string;
  apiVersion: string;
  getHeaders(): Record<string, string>;
}

let cachedSdkClients: SdkClients | null = null;

export function createSdkClients(): SdkClients {
  const config = getRuntimeConfig();

  return {
    baseUrl: config.baseUrl,
    apiVersion: config.apiVersion,
    getHeaders() {
      return {
        'Content-Type': 'application/json',
        ...config.headers,
      };
    },
  };
}

export function getSdkClients(): SdkClients {
  if (!cachedSdkClients) {
    cachedSdkClients = createSdkClients();
  }
  return cachedSdkClients;
}
