import {
  createClient as createGeneratedTerminalLocalRuntimeClient,
  SdkworkTerminalLocalRuntimeClient,
} from '../generated/server-openapi/dist/index.js';
import type { SdkworkCustomConfig } from '../generated/server-openapi/dist/index.js';

export { SdkworkTerminalLocalRuntimeClient, createGeneratedTerminalLocalRuntimeClient };
export * from '../generated/server-openapi/dist/index.js';
export type { SdkworkCustomConfig } from '../generated/server-openapi/dist/index.js';

export type TerminalLocalRuntimeAppClient = SdkworkTerminalLocalRuntimeClient;
export type TerminalLocalRuntimeAppClientConfig = SdkworkCustomConfig;

export function createTerminalLocalRuntimeClient(
  config: SdkworkCustomConfig,
): TerminalLocalRuntimeAppClient {
  return createGeneratedTerminalLocalRuntimeClient(config);
}

export function createClient(config: SdkworkCustomConfig): TerminalLocalRuntimeAppClient {
  return createTerminalLocalRuntimeClient(config);
}
