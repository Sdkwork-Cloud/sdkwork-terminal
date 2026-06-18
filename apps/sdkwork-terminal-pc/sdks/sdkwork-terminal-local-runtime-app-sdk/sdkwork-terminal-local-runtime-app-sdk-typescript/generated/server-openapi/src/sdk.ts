import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkCustomConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { TerminalLocalRuntimeHealthApi, createTerminalLocalRuntimeHealthApi } from './api/terminal-local-runtime-health';
import { TerminalLocalRuntimeApi, createTerminalLocalRuntimeApi } from './api/terminal-local-runtime';

export class SdkworkTerminalLocalRuntimeClient {
  private httpClient: HttpClient;

  public readonly terminalLocalRuntimeHealth: TerminalLocalRuntimeHealthApi;
  public readonly terminalLocalRuntime: TerminalLocalRuntimeApi;

  constructor(config: SdkworkCustomConfig) {
    this.httpClient = createHttpClient(config);
    this.terminalLocalRuntimeHealth = createTerminalLocalRuntimeHealthApi(this.httpClient);

    this.terminalLocalRuntime = createTerminalLocalRuntimeApi(this.httpClient);
  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
  }

  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkCustomConfig): SdkworkTerminalLocalRuntimeClient {
  return new SdkworkTerminalLocalRuntimeClient(config);
}

export default SdkworkTerminalLocalRuntimeClient;
