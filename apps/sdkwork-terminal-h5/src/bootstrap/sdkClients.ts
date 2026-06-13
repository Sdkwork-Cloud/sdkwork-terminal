export interface SdkClients {
  baseUrl: string;
  apiVersion: string;
}

export function createSdkClients(baseUrl: string, apiVersion: string = 'v1'): SdkClients {
  // TODO: Initialize generated SDK clients
  // This should create typed SDK clients for each API surface
  return { baseUrl, apiVersion };
}
