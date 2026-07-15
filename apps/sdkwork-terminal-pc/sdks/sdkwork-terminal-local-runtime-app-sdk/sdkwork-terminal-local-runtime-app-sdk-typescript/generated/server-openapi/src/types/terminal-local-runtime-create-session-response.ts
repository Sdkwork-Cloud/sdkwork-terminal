import type { RuntimeNodeInteractiveSessionCreateSnapshot } from './runtime-node-interactive-session-create-snapshot';

export interface TerminalLocalRuntimeCreateSessionResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
