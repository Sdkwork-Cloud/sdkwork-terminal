import type { RuntimeNodeSessionTerminateSnapshot } from './runtime-node-session-terminate-snapshot';

export interface DeviceTerminalSessionsTerminateResponse {
  code: 0;
  data: unknown & { item: RuntimeNodeSessionTerminateSnapshot; };
  /** Server-owned request correlation id. */
  traceId: string;
}
