import {
  createClient as createGeneratedTerminalLocalRuntimeClient,
  SdkworkTerminalLocalRuntimeClient,
} from '../generated/server-openapi/src/index.js';
import type { SdkworkCustomConfig } from '../generated/server-openapi/src/types/common.js';

export { SdkworkTerminalLocalRuntimeClient, createGeneratedTerminalLocalRuntimeClient };
export * from '../generated/server-openapi/src/types/index.js';
export * from '../generated/server-openapi/src/api/index.js';
export * from '../generated/server-openapi/src/http/index.js';
export type { SdkworkCustomConfig } from '../generated/server-openapi/src/types/common.js';

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
