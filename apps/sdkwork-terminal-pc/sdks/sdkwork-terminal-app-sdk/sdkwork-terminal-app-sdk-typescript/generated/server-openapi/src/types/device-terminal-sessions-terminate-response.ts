import type { RuntimeNodeSessionTerminateSnapshot } from './runtime-node-session-terminate-snapshot';

export interface DeviceTerminalSessionsTerminateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
