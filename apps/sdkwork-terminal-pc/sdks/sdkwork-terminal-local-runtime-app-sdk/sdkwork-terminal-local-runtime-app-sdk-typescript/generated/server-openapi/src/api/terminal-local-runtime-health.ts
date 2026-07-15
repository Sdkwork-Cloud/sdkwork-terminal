import { customApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { RuntimeNodeHealthResponse, RuntimeNodeReadinessResponse } from '../types';


export class TerminalLocalRuntimeHealthApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

/** Runtime-node health check */
  async check(): Promise<RuntimeNodeHealthResponse> {
    return this.client.get<RuntimeNodeHealthResponse>(customApiPath(`/healthz`));
  }

/** Runtime-node liveness check */
  async terminalLocalRuntimeLivenessCheck(): Promise<RuntimeNodeHealthResponse> {
    return this.client.get<RuntimeNodeHealthResponse>(customApiPath(`/livez`));
  }

/** Runtime-node readiness check */
  async terminalLocalRuntimeReadinessCheck(): Promise<RuntimeNodeReadinessResponse> {
    return this.client.get<RuntimeNodeReadinessResponse>(customApiPath(`/readyz`));
  }

/** Runtime-node Prometheus metrics */
  async terminalLocalRuntimeMetrics(): Promise<string> {
    return this.client.get<string>(customApiPath(`/metrics`));
  }
}

export function createTerminalLocalRuntimeHealthApi(client: HttpClient): TerminalLocalRuntimeHealthApi {
  return new TerminalLocalRuntimeHealthApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}
