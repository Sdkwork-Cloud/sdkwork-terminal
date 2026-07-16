import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkAppConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { DeviceTerminalApi, createDeviceTerminalApi } from './api/device-terminal';

export class SdkworkTerminalAppClient {
  private httpClient: HttpClient;

  public readonly deviceTerminal: DeviceTerminalApi;

  constructor(config: SdkworkAppConfig) {
    this.httpClient = createHttpClient(config);
    this.deviceTerminal = createDeviceTerminalApi(this.httpClient);
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

export function createClient(config: SdkworkAppConfig): SdkworkTerminalAppClient {
  return new SdkworkTerminalAppClient(config);
}

export default SdkworkTerminalAppClient;
