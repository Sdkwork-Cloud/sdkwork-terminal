import { customApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { RuntimeNodeHealthResponse } from '../types';


export class TerminalLocalRuntimeHealthApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

/** Runtime-node health check */
  async check(): Promise<RuntimeNodeHealthResponse> {
    return this.client.get<RuntimeNodeHealthResponse>(customApiPath(`/healthz`));
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
