import type { RuntimeNodeSessionReplaySnapshot } from './runtime-node-session-replay-snapshot';

export interface TerminalLocalRuntimeReadReplayResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
