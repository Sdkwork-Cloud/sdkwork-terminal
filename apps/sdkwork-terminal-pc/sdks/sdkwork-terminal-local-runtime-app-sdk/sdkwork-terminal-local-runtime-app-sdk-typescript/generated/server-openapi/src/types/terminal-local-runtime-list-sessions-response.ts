import type { RuntimeNodeSessionIndexSnapshot } from './runtime-node-session-index-snapshot';

export interface TerminalLocalRuntimeListSessionsResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
