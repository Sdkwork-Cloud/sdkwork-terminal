import type { RuntimeNodeSessionResizeSnapshot } from './runtime-node-session-resize-snapshot';

export interface TerminalLocalRuntimeResizeSessionResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
