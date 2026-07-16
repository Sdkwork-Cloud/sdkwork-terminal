import {
  createClient as createGeneratedTerminalAppClient,
  SdkworkTerminalAppClient,
} from '../generated/server-openapi/dist/index.js';
import type { SdkworkAppConfig } from '../generated/server-openapi/dist/index.js';

export { SdkworkTerminalAppClient, createGeneratedTerminalAppClient };
export * from '../generated/server-openapi/dist/index.js';
export type { SdkworkAppConfig } from '../generated/server-openapi/dist/index.js';

export type TerminalAppClient = SdkworkTerminalAppClient;
export type TerminalAppClientConfig = SdkworkAppConfig;

export function createTerminalAppClient(
  config: SdkworkAppConfig,
): TerminalAppClient {
  return createGeneratedTerminalAppClient(config);
}

export function createClient(config: SdkworkAppConfig): TerminalAppClient {
  return createTerminalAppClient(config);
}
