import type { RuntimeNodeSessionInputSnapshot } from './runtime-node-session-input-snapshot';

export interface DeviceTerminalSessionsInputResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
